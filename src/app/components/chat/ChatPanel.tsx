"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import LoadError from "@/app/components/LoadError";
import ConfirmationModal from "@/app/components/modals/confirmation";
import { useAppearance } from "@/hooks/useAppearance";
import { LIMITS } from "@/app/contracts/common";
import type { ChatMessage } from "@/app/contracts/responses";
import type { ToastController } from "@/hooks/toastController";
import { formatRelativeTime } from "@/lib/relativeTime";
import { useChatRoom } from "@/lib/useChatRoom";
import { useChatMessages, useDeleteChatMessage, useMarkChatReadWhileOpen, useSendChatMessage } from "@/lib/query/chat";
import { isEmptyChat, oldestFirst } from "@/lib/query/chatCache";
import { loadStateOf } from "@/lib/query/loadState";
import { useSessionUserId } from "@/lib/query/queries";
import { settled } from "@/lib/query/unwrap";

interface ChatPanelProps {
  projectId: string;
  projectTitle: string;
  /** The project owner may delete anyone's message. */
  isOwner: boolean;
  onClose: () => void;
  toast: ToastController;
}

/** Scrolled within this many pixels of an edge counts as "at" it. */
const EDGE_PX = 48;

/** A side panel with one project's chat: history, live updates and a composer. */
export default function ChatPanel({ projectId, projectTitle, isOwner, onClose, toast }: ChatPanelProps) {
  const { isDark: dark } = useAppearance();
  const me = useSessionUserId();
  const { removed } = useChatRoom(projectId);

  const query = useChatMessages(projectId);
  const state = loadStateOf(query, isEmptyChat);
  const messages = useMemo(() => oldestFirst(query.data), [query.data]);
  // FEAT-08: this chat's badge reads 0 while open; the read point follows the newest message.
  useMarkChatReadWhileOpen(projectId, removed ? undefined : messages.at(-1)?.id);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const deleteMessage = useDeleteChatMessage(projectId);

  const confirmDelete = async (message: ChatMessage) => {
    setPendingDelete(null);
    const result = await settled(deleteMessage.mutateAsync(message.id));
    if (result.ok) toast.success("Message deleted", "The message was deleted");
    else toast.failure(result.failure);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName="fixed inset-0 z-[60] flex justify-end bg-th-overlay"
        className="flex h-full w-full max-w-[440px] flex-col shadow-xl bg-th-card text-th-ink"
      >
        <header className="flex items-start justify-between gap-3 border-b p-4 border-th-sep">
          <div className="min-w-0">
            <DialogTitle className="truncate font-card text-lg [font-weight:var(--w-card)]">{projectTitle || "Project"} chat</DialogTitle>
            <DialogDescription className="font-ui text-xs text-th-ink-note">
              Messages are visible to the owner and every member.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 4.5L4.5 11.5M11.5 11.5L4.5 4.5" stroke="var(--ico-x)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </DialogClose>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {state.status === "loading" ? (
            <div role="status" className="m-auto font-ui text-sm text-th-ink-note">
              Loading messages…
            </div>
          ) : state.status === "error" ? (
            <div className="p-4">
              <LoadError
                widget="this chat"
                failure={state.failure}
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
                dark={dark}
              />
            </div>
          ) : (
            <MessageLog
              messages={messages}
              me={me}
              isOwner={isOwner}
              empty={state.status === "empty"}
              hasOlder={!!query.hasNextPage}
              loadingOlder={query.isFetchingNextPage}
              onLoadOlder={() => void query.fetchNextPage()}
              onDelete={setPendingDelete}
              refreshError={
                state.status === "ready" && state.refreshFailure ? (
                  <LoadError
                    widget={query.isFetchNextPageError ? "older messages" : "this chat"}
                    failure={state.refreshFailure}
                    onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
                    retrying={query.isFetching}
                    dark={dark}
                    variant="compact"
                  />
                ) : null
              }
            />
          )}
        </div>

        {removed ? (
          <p
            role="status"
            className="border-t p-4 font-ui text-sm border-th-sep text-th-ink-note"
          >
            You no longer have access to this chat.
          </p>
        ) : (
          <Composer projectId={projectId} toast={toast} />
        )}

        {pendingDelete && (
          <ConfirmationModal
            title="Delete message?"
            description="This message will be removed for everyone in the chat."
            onClose={() => setPendingDelete(null)}
            actions={[
              { label: "Cancel", onClick: () => setPendingDelete(null), variant: "secondary" },
              { label: "Delete", onClick: () => void confirmDelete(pendingDelete), variant: "danger" },
            ]}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ the log

interface MessageLogProps {
  messages: ChatMessage[];
  me: string | undefined;
  isOwner: boolean;
  empty: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onDelete: (message: ChatMessage) => void;
  refreshError: React.ReactNode;
}

function MessageLog({ messages, me, isOwner, empty, hasOlder, loadingOlder, onLoadOlder, onDelete, refreshError }: MessageLogProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const snapshot = useRef<{ first: string | undefined; last: string | undefined; height: number }>({
    first: undefined,
    last: undefined,
    height: 0,
  });

  // Keep the reader's place: older messages prepended keep the view still; a new
  // message at the end scrolls down only if the reader was at the bottom (or sent it).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const prev = snapshot.current;
    const first = messages[0]?.id;
    const last = messages.at(-1)?.id;
    if (prev.first === undefined && prev.last === undefined) {
      el.scrollTop = el.scrollHeight;
    } else if (first !== prev.first && last === prev.last) {
      el.scrollTop += el.scrollHeight - prev.height;
    } else if (last !== prev.last && (atBottom.current || messages.at(-1)?.user_id === me)) {
      el.scrollTop = el.scrollHeight;
    }
    snapshot.current = { first, last, height: el.scrollHeight };
  }, [messages, me]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_PX;
    if (el.scrollTop < EDGE_PX && hasOlder && !loadingOlder) onLoadOlder();
  };

  const muted = "text-th-ink-note";

  return (
    <div ref={scroller} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {refreshError}
      {hasOlder && (
        <button
          type="button"
          onClick={onLoadOlder}
          aria-disabled={loadingOlder}
          className={`self-center rounded-btn px-3 py-1 font-ui text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus ${muted}`}
        >
          {loadingOlder ? "Loading older messages…" : "Load older messages"}
        </button>
      )}
      <ol role="log" aria-live="polite" aria-relevant="additions" aria-label="Messages" className="flex flex-col gap-3">
        {messages.map((m) => {
          const mine = m.user_id === me;
          const canDelete = mine || isOwner;
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`flex items-baseline gap-2 font-ui text-[11px] ${muted}`}>
                <span className="font-bold">{mine ? "You" : m.username}</span>
                <time dateTime={m.created_at}>{formatRelativeTime(m.created_at)}</time>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    aria-label={`Delete message from ${mine ? "you" : m.username}`}
                    className="rounded px-1 underline hover:text-error-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p
                className={`mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-card px-3 py-2 font-ui text-sm ${
                  mine ? "bg-th-bubble-me text-th-bubble-me-ink" : "bg-th-bubble-other text-th-bubble-other-ink"
                }`}
              >
                {m.body}
              </p>
            </li>
          );
        })}
      </ol>
      {empty && <p className={`m-auto font-ui text-sm ${muted}`}>No messages yet. Say hello!</p>}
    </div>
  );
}

// ------------------------------------------------------------- the composer

function Composer({ projectId, toast }: { projectId: string; toast: ToastController }) {
  const [draft, setDraft] = useState("");
  const send = useSendChatMessage(projectId);
  const inputId = useId();
  const counterId = `${inputId}-count`;
  const input = useRef<HTMLTextAreaElement>(null);
  const trimmed = draft.trim();
  const over = draft.length > LIMITS.chatMessageMax;
  const canSend = trimmed.length > 0 && !over && !send.isPending;

  useEffect(() => {
    input.current?.focus();
  }, []);

  const submit = async () => {
    if (!canSend) return;
    const result = await settled(send.mutateAsync(trimmed));
    if (result.ok) {
      setDraft("");
      input.current?.focus();
    } else {
      // The draft stays so nothing typed is lost.
      toast.failure(result.failure);
    }
  };

  return (
    <form
      className="flex flex-col gap-2 border-t p-4 border-th-sep"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <textarea
        id={inputId}
        ref={input}
        rows={3}
        value={draft}
        maxLength={LIMITS.chatMessageMax}
        aria-describedby={counterId}
        placeholder="Write a message. Enter sends, Shift+Enter adds a line."
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="w-full resize-none rounded-card border p-2 font-ui text-sm focus:outline-none focus:ring-2 focus:ring-th-focus border-th-row-edge bg-th-field-bg text-th-ink"
      />
      <div className="flex items-center justify-between">
        <span id={counterId} className={`font-ui text-xs ${over ? "text-error-default" : "text-th-ink-note"}`}>
          {draft.length} / {LIMITS.chatMessageMax}
        </span>
        <button
          type="submit"
          aria-disabled={!canSend}
          className="rounded-btn bg-th-acc px-4 py-2 font-ui text-xs text-th-on-acc transition-colors hover:bg-th-acc-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] aria-disabled:opacity-60"
        >
          {send.isPending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

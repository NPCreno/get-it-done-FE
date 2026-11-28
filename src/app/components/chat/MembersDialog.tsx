"use client";
import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import InputBox from "@/app/components/inputBox";
import LoadError from "@/app/components/LoadError";
import { LIMITS } from "@/app/contracts/common";
import { AddChatMemberRequestSchema } from "@/app/contracts/requests";
import type { ChatMember } from "@/app/contracts/responses";
import type { ToastController } from "@/hooks/toastController";
import { useAddChatMember, useChatMembers, useRemoveChatMember } from "@/lib/query/chat";
import { never } from "@/lib/query/emptiness";
import { loadStateOf } from "@/lib/query/loadState";
import { settled } from "@/lib/query/unwrap";
import type { ApiFailure } from "@/lib/apiClient";

interface MembersDialogProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  toast: ToastController;
}

/** Fixed copy for the add-member errors the owner can fix; anything else is a toast. */
function addErrorCopy(f: ApiFailure): string | null {
  if (f.kind !== "http") return null;
  if (f.status === 404) return "No user has that username.";
  if (f.status === 409) return "That user is already a member.";
  return null;
}

/** Owner only: list the members, add one by exact username, remove one. */
export default function MembersDialog({ projectId, projectTitle, onClose, toast }: MembersDialogProps) {
  const query = useChatMembers(projectId);
  // Never "empty": the owner is always listed.
  const state = loadStateOf(query, never);
  const add = useAddChatMember(projectId);
  const remove = useRemoveChatMember(projectId);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | undefined>();

  const owner = state.status === "ready" ? state.data.owner : undefined;
  const members = state.status === "ready" ? state.data.members : [];
  const full = members.length >= LIMITS.chatMembersMax;

  const submit = async () => {
    if (add.isPending) return;
    const parsed = AddChatMemberRequestSchema.safeParse({ username });
    if (!parsed.success) {
      setError("Enter an exact username: letters, numbers and underscores.");
      return;
    }
    setError(undefined);
    const result = await settled(add.mutateAsync(parsed.data.username));
    if (result.ok) {
      setUsername("");
      toast.success("Member added", `${parsed.data.username} can now work on this project's tasks and chat`);
      return;
    }
    const copy = addErrorCopy(result.failure);
    if (copy) setError(copy);
    else toast.failure(result.failure);
  };

  const removeMember = async (member: ChatMember) => {
    const result = await settled(remove.mutateAsync(member.user_id));
    if (result.ok) toast.success("Member removed", `${member.username} no longer has access to this project`);
    else toast.failure(result.failure);
  };

  const muted = "text-th-ink-note";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName="fixed inset-0 z-[60] flex items-center justify-center bg-th-overlay"
        className="modal-popup flex w-[480px] max-w-[calc(100vw-32px)] flex-col gap-4 rounded-card p-5 shadow-lg bg-th-card text-th-ink"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="font-card text-[20px] [font-weight:var(--w-card)]">Members of {projectTitle || "this project"}</DialogTitle>
            <DialogDescription className={`font-ui text-sm ${muted}`}>
              Members can work on this project&apos;s tasks and use its chat. Removing someone gives their tasks back to you.
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
        </div>

        <form
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex-1">
            <InputBox
              label="Username"
              placeholder="Exact username"
              value={{ name: username }}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(undefined);
              }}
              error={error}
              disabled={full}
            />
          </div>
          <button
            type="submit"
            aria-disabled={add.isPending || full}
            disabled={full}
            className="mt-[26px] rounded-btn bg-th-acc px-4 py-[11px] font-ui text-xs text-th-on-acc transition-colors hover:bg-th-acc-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] aria-disabled:opacity-60"
          >
            {add.isPending ? "Adding…" : "Add"}
          </button>
        </form>
        {full && (
          <p className={`font-ui text-xs ${muted}`}>
            This project has the maximum of {LIMITS.chatMembersMax} members.
          </p>
        )}

        <div className="flex max-h-[360px] min-h-[120px] flex-col gap-2 overflow-y-auto">
          {state.status === "loading" ? (
            <p role="status" className={`m-auto font-ui text-sm ${muted}`}>
              Loading members…
            </p>
          ) : state.status === "error" ? (
            <LoadError
              widget="the members"
              failure={state.failure}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : (
            <ul className="flex flex-col gap-2" aria-label={`${members.length} of ${LIMITS.chatMembersMax} members`}>
              {owner && <MemberRow member={owner} label="Owner" />}
              {members.map((m) => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  action={
                    <button
                      type="button"
                      onClick={() => void removeMember(m)}
                      aria-disabled={remove.isPending}
                      aria-label={`Remove ${m.username}`}
                      className="rounded-btn border border-th-danger-t px-3 py-1 font-ui text-xs text-th-danger-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus aria-disabled:opacity-60"
                    >
                      Remove
                    </button>
                  }
                />
              ))}
              {members.length === 0 && (
                <li className={`py-4 text-center font-ui text-sm ${muted}`}>No members yet. Add someone by username.</li>
              )}
            </ul>
          )}
        </div>
        {state.status === "ready" && state.refreshFailure && (
          <LoadError
            widget="the members"
            failure={state.refreshFailure}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
            variant="compact"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ member, label, action }: { member: ChatMember; label?: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-card border px-3 py-2 border-th-sep">
      <div className="min-w-0">
        <p className="truncate font-ui text-sm font-bold">{member.fullname || member.username}</p>
        <p className="truncate font-ui text-xs text-th-ink-note">@{member.username}</p>
      </div>
      {label ? <span className="font-ui text-xs font-bold text-th-acc-ink">{label}</span> : action}
    </li>
  );
}

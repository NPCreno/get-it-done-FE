"use client";
import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import InputBox from "@/app/components/inputBox";
import LoadError from "@/app/components/LoadError";
import { useFormState } from "@/app/context/FormProvider";
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
  const { userData } = useFormState();
  const dark = userData?.theme === "dark";
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

  const muted = dark ? "text-gray-300" : "text-[#676767]";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName={`fixed inset-0 z-[60] flex items-center justify-center ${dark ? "bg-black/60" : "bg-black/40"}`}
        className={`modal-popup flex w-[480px] max-w-[calc(100vw-32px)] flex-col gap-4 rounded-[10px] p-5 shadow-lg ${
          dark ? "bg-foreground-dark text-white" : "bg-white text-text"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="font-lato text-[20px] font-bold">Members of {projectTitle || "this project"}</DialogTitle>
            <DialogDescription className={`font-lato text-sm ${muted}`}>
              Members can work on this project&apos;s tasks and use its chat. Removing someone gives their tasks back to you.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 4.5L4.5 11.5M11.5 11.5L4.5 4.5" stroke={dark ? "#9ca3af" : "#666666"} strokeWidth="1.5" strokeLinecap="round" />
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
            className="mt-[26px] rounded-[5px] bg-primary-default px-4 py-[11px] font-lato text-xs text-white transition-colors hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2 aria-disabled:opacity-60"
          >
            {add.isPending ? "Adding…" : "Add"}
          </button>
        </form>
        {full && (
          <p className={`font-lato text-xs ${muted}`}>
            This project has the maximum of {LIMITS.chatMembersMax} members.
          </p>
        )}

        <div className="flex max-h-[360px] min-h-[120px] flex-col gap-2 overflow-y-auto">
          {state.status === "loading" ? (
            <p role="status" className={`m-auto font-lato text-sm ${muted}`}>
              Loading members…
            </p>
          ) : state.status === "error" ? (
            <LoadError
              widget="the members"
              failure={state.failure}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
              theme={userData?.theme}
            />
          ) : (
            <ul className="flex flex-col gap-2" aria-label={`${members.length} of ${LIMITS.chatMembersMax} members`}>
              {owner && <MemberRow member={owner} label="Owner" dark={dark} />}
              {members.map((m) => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  dark={dark}
                  action={
                    <button
                      type="button"
                      onClick={() => void removeMember(m)}
                      aria-disabled={remove.isPending}
                      aria-label={`Remove ${m.username}`}
                      className="rounded-[5px] border border-error-default px-3 py-1 font-lato text-xs text-error-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default aria-disabled:opacity-60"
                    >
                      Remove
                    </button>
                  }
                />
              ))}
              {members.length === 0 && (
                <li className={`py-4 text-center font-lato text-sm ${muted}`}>No members yet. Add someone by username.</li>
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
            theme={userData?.theme}
            variant="compact"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ member, label, action, dark }: { member: ChatMember; label?: string; action?: React.ReactNode; dark: boolean }) {
  return (
    <li className={`flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2 ${dark ? "border-gray-800" : "border-gray-100"}`}>
      <div className="min-w-0">
        <p className="truncate font-lato text-sm font-bold">{member.fullname || member.username}</p>
        <p className={`truncate font-lato text-xs ${dark ? "text-gray-300" : "text-[#676767]"}`}>@{member.username}</p>
      </div>
      {label ? <span className="font-lato text-xs font-bold text-primary-default">{label}</span> : action}
    </li>
  );
}

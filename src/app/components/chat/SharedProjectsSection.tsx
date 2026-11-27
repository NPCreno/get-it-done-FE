"use client";
import { useId, useRef, useState } from "react";
import LoadError from "@/app/components/LoadError";
import ConfirmationModal from "@/app/components/modals/confirmation";
import type { SharedProject } from "@/app/contracts/responses";
import type { ToastController } from "@/hooks/toastController";
import { useChatUnread, useRemoveChatMember, useSharedProjects } from "@/lib/query/chat";
import { isEmptyList } from "@/lib/query/emptiness";
import { loadStateOf } from "@/lib/query/loadState";
import { useSessionUserId } from "@/lib/query/queries";
import { settled } from "@/lib/query/unwrap";
import { focusFallback } from "@/lib/focusFallback";
import { projectDotColor } from "@/lib/projectColors";
import ChatPanel from "./ChatPanel";
import UnreadBadge from "./UnreadBadge";

/**
 * Projects other people shared with me (FEAT-09): open the project to work on its tasks, chat with
 * its members, or leave. Owner-only actions (edit, delete, members) are not offered.
 */
export default function SharedProjectsSection({
  toast,
  onViewProject,
}: {
  toast: ToastController;
  onViewProject: (project: SharedProject) => void;
}) {
  const query = useSharedProjects();
  const state = loadStateOf(query, isEmptyList);
  const [chat, setChat] = useState<SharedProject | null>(null);
  const headingId = useId();
  // Leaving removes the card that held focus; focus then goes to this heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const muted = "text-th-ink-note";

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 ref={headingRef} tabIndex={-1} id={headingId} className="outline-none font-card text-xl [font-weight:var(--w-card)] text-th-ink">
        Shared with me
      </h2>
      <p className={`-mt-2 font-ui text-sm ${muted}`}>Work on these projects&apos; tasks and chat with their members.</p>
      {state.status === "loading" ? (
        <p role="status" className={`font-ui text-sm ${muted}`}>
          Loading shared projects…
        </p>
      ) : state.status === "error" ? (
        <LoadError
          widget="projects shared with you"
          failure={state.failure}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : state.status === "empty" ? (
        <p className={`font-ui text-sm ${muted}`}>
          Nothing is shared with you yet. When someone adds you to a project, its tasks and chat show up here.
        </p>
      ) : (
        <>
          {state.refreshFailure && (
            <LoadError
              widget="projects shared with you"
              failure={state.refreshFailure}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
              variant="compact"
            />
          )}
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {state.data.map((p) => (
              <SharedProjectCard
                key={p.project_id}
                project={p}
                toast={toast}
                onViewProject={() => onViewProject(p)}
                onOpenChat={() => setChat(p)}
                onLeft={() => focusFallback(headingRef)}
              />
            ))}
          </ul>
        </>
      )}
      {chat && (
        <ChatPanel projectId={chat.project_id} projectTitle={chat.title} isOwner={false} onClose={() => setChat(null)} toast={toast} />
      )}
    </section>
  );
}

function SharedProjectCard({
  project,
  toast,
  onViewProject,
  onOpenChat,
  onLeft,
}: {
  project: SharedProject;
  toast: ToastController;
  onViewProject: () => void;
  onOpenChat: () => void;
  onLeft: () => void;
}) {
  const me = useSessionUserId();
  const leave = useRemoveChatMember(project.project_id);
  const unread = useChatUnread().countFor(project.project_id);
  const [confirming, setConfirming] = useState(false);
  const color = projectDotColor(project.color);

  const confirmLeave = async () => {
    setConfirming(false);
    if (!me) return;
    const result = await settled(leave.mutateAsync(me));
    if (result.ok) {
      onLeft();
      toast.success("Left project", `You left ${project.title || "the project"}`);
    } else toast.failure(result.failure);
  };

  return (
    <li
      className="flex flex-col gap-3 rounded-card border p-4 shadow-sm border-th-sep bg-th-card text-th-ink"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="truncate font-card text-base [font-weight:var(--w-card)]">{project.title || "Untitled project"}</h3>
        <UnreadBadge count={unread} className="ml-auto flex-shrink-0" />
      </div>
      <p className="font-ui text-xs text-th-ink-note">Shared by @{project.owner_username}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onViewProject}
          aria-label={`View project ${project.title || "this project"}`}
          className="rounded-btn bg-th-acc px-3 py-2 font-ui text-xs text-th-on-acc transition-colors hover:bg-th-acc-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
        >
          View project
        </button>
        <button
          type="button"
          onClick={onOpenChat}
          aria-label={`Open chat for ${project.title || "this project"}`}
          className="rounded-btn bg-th-acc px-3 py-2 font-ui text-xs text-th-on-acc transition-colors hover:bg-th-acc-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
        >
          Open chat
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-disabled={leave.isPending}
          aria-label={`Leave ${project.title || "this project"}`}
          className="rounded-btn border px-3 py-2 font-ui text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus aria-disabled:opacity-60 border-th-ghost-b text-th-ghost-t"
        >
          Leave
        </button>
      </div>
      {confirming && (
        <ConfirmationModal
          title="Leave this project?"
          description="You will lose access to its tasks and chat until the owner adds you again. Tasks you were responsible for go back to the owner."
          onClose={() => setConfirming(false)}
          actions={[
            { label: "Cancel", onClick: () => setConfirming(false), variant: "secondary" },
            { label: "Leave", onClick: () => void confirmLeave(), variant: "danger" },
          ]}
        />
      )}
    </li>
  );
}

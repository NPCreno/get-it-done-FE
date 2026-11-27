"use client";
import { useState } from "react";
import type { ToastController } from "@/hooks/toastController";
import { useChatUnread } from "@/lib/query/chat";
import ChatPanel from "./ChatPanel";
import MembersDialog from "./MembersDialog";
import UnreadBadge from "./UnreadBadge";

interface ProjectChatActionsProps {
  project: { project_id: string; title: string };
  toast: ToastController;
}

/** "Members" and "Chat" for the owner's project view. Each opens its own dialog on top. */
export default function ProjectChatActions({ project, toast }: ProjectChatActionsProps) {
  const [open, setOpen] = useState<"members" | "chat" | null>(null);
  const unread = useChatUnread().countFor(project.project_id);
  if (!project.project_id) return null;

  const button =
    "rounded-btn border px-4 p-[10px] font-ui text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus border-th-line-acc text-th-btn2-t hover:bg-th-btn2-hover";

  return (
    <>
      <button type="button" className={button} onClick={() => setOpen("members")}>
        Members
      </button>
      <button type="button" className={`${button} inline-flex items-center gap-2`} onClick={() => setOpen("chat")}>
        Chat
        <UnreadBadge count={unread} />
      </button>
      {open === "members" && (
        <MembersDialog
          projectId={project.project_id}
          projectTitle={project.title}
          onClose={() => setOpen(null)}
          toast={toast}
        />
      )}
      {open === "chat" && (
        <ChatPanel projectId={project.project_id} projectTitle={project.title} isOwner onClose={() => setOpen(null)} toast={toast} />
      )}
    </>
  );
}

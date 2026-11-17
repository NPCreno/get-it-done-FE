"use client";
import { useState } from "react";
import { useFormState } from "@/app/context/FormProvider";
import type { ToastController } from "@/hooks/toastController";
import ChatPanel from "./ChatPanel";
import MembersDialog from "./MembersDialog";

interface ProjectChatActionsProps {
  project: { project_id: string; title: string; user_id: string };
  toast: ToastController;
}

/** "Members" and "Chat" for the owner's project view. Each opens its own dialog on top. */
export default function ProjectChatActions({ project, toast }: ProjectChatActionsProps) {
  const { userData } = useFormState();
  const dark = userData?.theme === "dark";
  const [open, setOpen] = useState<"members" | "chat" | null>(null);
  if (!project.project_id) return null;

  const button = `rounded-[5px] border px-4 p-[10px] font-lato text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default ${
    dark ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-primary-200 text-primary-default hover:bg-gray-50"
  }`;

  return (
    <>
      <button type="button" className={button} onClick={() => setOpen("members")}>
        Members
      </button>
      <button type="button" className={button} onClick={() => setOpen("chat")}>
        Chat
      </button>
      {open === "members" && (
        <MembersDialog
          projectId={project.project_id}
          projectTitle={project.title}
          ownerId={project.user_id}
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

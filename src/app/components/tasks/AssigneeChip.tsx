"use client";
import { useSessionUserId } from "@/lib/query/queries";
import { assigneeChip, sharedProjectLabel } from "./assignee";

interface TaskSharingMetaProps {
  task: {
    assignee_id?: string | null;
    assignee_username?: string | null;
    project_title?: string | null;
    project_owner_username?: string | null;
  };
  dark?: boolean;
}

/**
 * FEAT-09 task-row details: the assignee chip (initials, "You" or "Assigned to <username>";
 * nothing when unassigned) and, for a task from someone else's project, "in <project> · <owner>".
 * Renders nothing for a personal, unassigned task.
 */
export default function AssigneeChip({ task, dark }: TaskSharingMetaProps) {
  const me = useSessionUserId();
  const chip = assigneeChip(task, me);
  const where = sharedProjectLabel(task);
  if (!chip && !where) return null;
  const muted = dark ? "text-gray-400" : "text-[#676767]";
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-2 font-lato text-[11px] ${muted}`}>
      {chip && (
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
              dark ? "bg-gray-700 text-gray-100" : "bg-primary-100 text-primary-default"
            }`}
          >
            {chip.initials}
          </span>
          {chip.text}
        </span>
      )}
      {where && <span className="truncate">{where}</span>}
    </span>
  );
}

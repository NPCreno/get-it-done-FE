"use client";
import { useFormState } from "@/app/context/FormProvider";
import { useSessionUserId } from "@/lib/query/queries";
import { assigneeChip, sharedProjectLabel } from "./assignee";

interface TaskSharingMetaProps {
  task: {
    assignee_id?: string | null;
    assignee_username?: string | null;
    project_title?: string | null;
    project_owner_username?: string | null;
  };
}

/**
 * FEAT-09 task-row details: the assignee chip (initials, "You" or "Assigned to <username>";
 * nothing when unassigned) and, for a task from someone else's project, "in <project> · <owner>".
 * Renders nothing for a personal, unassigned task.
 */
export default function AssigneeChip({ task }: TaskSharingMetaProps) {
  const me = useSessionUserId();
  const { userData } = useFormState();
  const chip = assigneeChip(task, me);
  const where = sharedProjectLabel(task, userData?.username);
  if (!chip && !where) return null;
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-2 font-ui text-[11px] text-th-ink2`}>
      {chip && (
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold bg-th-chip-bg text-th-chip-t"
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

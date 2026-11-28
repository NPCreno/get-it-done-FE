"use client";
import { useId } from "react";
import { useChatMembers } from "@/lib/query/chat";
import { useSessionUserId } from "@/lib/query/queries";
import { useSharingEnabled } from "@/lib/sharing";
import { assigneeOptions, RECURRING_ASSIGNEE_HINT, showAssigneeSelect, showRecurringAssigneeHint } from "./assignee";

interface AssigneeSelectProps {
  /** The task's project; without one there is nothing to assign. */
  projectId: string | undefined;
  /** The form value: a user id, or "" for Unassigned. */
  value: string;
  onChange: (assigneeId: string) => void;
  isRecurring: boolean;
  disabled?: boolean;
}

/**
 * FEAT-09: the task editor's Assignee field. Shown only once a project is chosen; the options are
 * Unassigned, the owner and the members (`useChatMembers`), with "(you)" marked. A recurring task
 * shows a hint instead: each repeat starts unassigned.
 */
export default function AssigneeSelect({ projectId, value, onChange, isRecurring, disabled }: AssigneeSelectProps) {
  const sharingEnabled = useSharingEnabled();
  const visible = showAssigneeSelect({ projectId, isRecurring, sharingEnabled });
  const members = useChatMembers(projectId, { enabled: visible });
  const me = useSessionUserId();
  const id = useId();

  if (showRecurringAssigneeHint({ projectId, isRecurring, sharingEnabled })) {
    return <p className="font-ui text-xs text-th-ink-note">{RECURRING_ASSIGNEE_HINT}</p>;
  }
  if (!visible) return null;

  const options = assigneeOptions(members.data, me);
  // Keep a chosen person selectable while the list loads, so the value never jumps.
  const known = options.some((o) => o.value === value);
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className="font-ui text-sm text-th-ink">
        Assignee
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={members.isError ? `${id}-error` : undefined}
        className="h-[40px] w-full rounded-[10px] border px-3 font-ui text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-th-card border-th-ctl-border bg-th-card text-th-ink"
      >
        {options.map((o) => (
          <option key={o.value || "unassigned"} value={o.value}>
            {o.label}
          </option>
        ))}
        {!known && <option value={value}>{members.isPending ? "Loading…" : "Current assignee"}</option>}
      </select>
      {members.isError && (
        <p id={`${id}-error`} className="font-ui text-xs text-th-danger-t">
          Couldn&apos;t load the project&apos;s members.
        </p>
      )}
    </div>
  );
}

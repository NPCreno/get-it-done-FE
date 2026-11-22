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
  dark?: boolean;
}

/**
 * FEAT-09: the task editor's Assignee field. Shown only once a project is chosen; the options are
 * Unassigned, the owner and the members (`useChatMembers`), with "(you)" marked. A recurring task
 * shows a hint instead: each repeat starts unassigned.
 */
export default function AssigneeSelect({ projectId, value, onChange, isRecurring, disabled, dark }: AssigneeSelectProps) {
  const sharingEnabled = useSharingEnabled();
  const visible = showAssigneeSelect({ projectId, isRecurring, sharingEnabled });
  const members = useChatMembers(projectId, { enabled: visible });
  const me = useSessionUserId();
  const id = useId();
  const muted = dark ? "text-gray-300" : "text-[#676767]";

  if (showRecurringAssigneeHint({ projectId, isRecurring, sharingEnabled })) {
    return <p className={`font-lato text-xs ${muted}`}>{RECURRING_ASSIGNEE_HINT}</p>;
  }
  if (!visible) return null;

  const options = assigneeOptions(members.data, me);
  // Keep a chosen person selectable while the list loads, so the value never jumps.
  const known = options.some((o) => o.value === value);
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className={`font-lato text-sm ${dark ? "text-white" : "text-text"}`}>
        Assignee
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={members.isError ? `${id}-error` : undefined}
        className={`h-[40px] w-full rounded-[10px] border px-3 font-lato text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default ${
          dark ? "border-gray-800 bg-foreground-dark text-white" : "border-gray-800 bg-white text-text"
        }`}
      >
        {options.map((o) => (
          <option key={o.value || "unassigned"} value={o.value}>
            {o.label}
          </option>
        ))}
        {!known && <option value={value}>{members.isPending ? "Loading…" : "Current assignee"}</option>}
      </select>
      {members.isError && (
        <p id={`${id}-error`} className="font-lato text-xs text-error-default">
          Couldn&apos;t load the project&apos;s members.
        </p>
      )}
    </div>
  );
}

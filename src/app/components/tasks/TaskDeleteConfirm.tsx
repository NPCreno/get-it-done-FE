"use client";
import ConfirmationModal from "@/app/components/modals/confirmation";
import type { TaskDeleteFlow } from "./useTaskDelete";

/**
 * BUG-05 "Delete this task?" for `useTaskDelete().requestDelete`. Cancel (secondary, focused first)
 * and Delete (danger). Esc or a click outside cancels; focus returns to the opener (Radix).
 */
export default function TaskDeleteConfirm({ flow }: { flow: Pick<TaskDeleteFlow, "deleteConfirmation"> }) {
  const c = flow.deleteConfirmation;
  if (!c.open) return null;
  return (
    <ConfirmationModal
      onClose={c.cancel}
      title={c.title}
      description={c.description}
      actions={[
        { label: "Cancel", onClick: c.cancel, variant: "secondary" },
        { label: "Delete", onClick: c.confirm, variant: "danger" },
      ]}
    />
  );
}

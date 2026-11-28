"use client";
import { useRef } from "react";
import type { ApiToken } from "@/app/contracts/responses";
import TokenDialogShell from "./TokenDialogShell";

interface RevokeTokenDialogProps {
  token: ApiToken;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirm step for a revoke. Focus starts on Cancel, so Enter can't revoke by accident. */
export default function RevokeTokenDialog({ token, onCancel, onConfirm }: RevokeTokenDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <TokenDialogShell
      title={`Revoke "${token.name}"?`}
      description="Any assistant using it stops working. This can't be undone."
      onClose={onCancel}
      width="w-[440px]"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        cancelRef.current?.focus();
      }}
    >
      <div className="flex justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className={`rounded-[5px] border px-4 py-2 font-lato text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus border-th-row-edge`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-[5px] bg-th-danger px-4 py-2 font-lato text-sm font-bold text-th-on-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2"
        >
          Revoke
        </button>
      </div>
    </TokenDialogShell>
  );
}

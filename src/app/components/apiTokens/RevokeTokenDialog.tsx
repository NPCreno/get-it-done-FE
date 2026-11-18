"use client";
import { useRef } from "react";
import type { ApiToken } from "@/app/contracts/responses";
import TokenDialogShell from "./TokenDialogShell";

interface RevokeTokenDialogProps {
  token: ApiToken;
  onCancel: () => void;
  onConfirm: () => void;
  dark: boolean;
}

/** Confirm step for a revoke. Focus starts on Cancel, so Enter can't revoke by accident. */
export default function RevokeTokenDialog({ token, onCancel, onConfirm, dark }: RevokeTokenDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <TokenDialogShell
      title={`Revoke "${token.name}"?`}
      description="Any assistant using it stops working. This can't be undone."
      onClose={onCancel}
      dark={dark}
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
          className={`rounded-[5px] border px-4 py-2 font-lato text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default ${
            dark ? "border-gray-700" : "border-[#E0E0E0]"
          }`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-[5px] bg-error-default px-4 py-2 font-lato text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2"
        >
          Revoke
        </button>
      </div>
    </TokenDialogShell>
  );
}

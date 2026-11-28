"use client";
import { useRef } from "react";
import type { OAuthGrant } from "@/app/contracts/responses";
import TokenDialogShell from "./TokenDialogShell";
import { disconnectTitle, DISCONNECT_DESCRIPTION } from "./tokenCopy";

interface DisconnectAppDialogProps {
  grant: OAuthGrant;
  onCancel: () => void;
  onConfirm: () => void;
}

/** FEAT-07d confirm step for a disconnect. Focus starts on Cancel, so Enter can't disconnect by accident. */
export default function DisconnectAppDialog({ grant, onCancel, onConfirm }: DisconnectAppDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <TokenDialogShell
      title={disconnectTitle(grant.client_name)}
      description={DISCONNECT_DESCRIPTION}
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
          Disconnect
        </button>
      </div>
    </TokenDialogShell>
  );
}

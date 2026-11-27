"use client";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";

type ContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

interface TokenDialogShellProps {
  title: string;
  description: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  onPointerDownOutside?: ContentProps["onPointerDownOutside"];
  onCloseAutoFocus?: ContentProps["onCloseAutoFocus"];
  onOpenAutoFocus?: ContentProps["onOpenAutoFocus"];
}

/** The shared frame of the token dialogs: shadcn/Radix dialog, title, description, Close button. */
export default function TokenDialogShell({
  title,
  description,
  onClose,
  children,
  width = "w-[520px]",
  onPointerDownOutside,
  onCloseAutoFocus,
  onOpenAutoFocus,
}: TokenDialogShellProps) {
  const muted = "text-th-ink-note";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName={`fixed inset-0 z-[60] flex items-center justify-center bg-th-overlay`}
        className={`modal-popup flex ${width} max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto rounded-[10px] p-5 shadow-lg bg-th-card text-th-ink`}
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="font-lato text-[20px] font-bold break-words">{title}</DialogTitle>
            <DialogDescription className={`font-lato text-sm ${muted}`}>{description}</DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 4.5L4.5 11.5M11.5 11.5L4.5 4.5" className="stroke-th-ico-x" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

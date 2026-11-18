"use client";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";

type ContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

interface TokenDialogShellProps {
  title: string;
  description: ReactNode;
  onClose: () => void;
  dark: boolean;
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
  dark,
  children,
  width = "w-[520px]",
  onPointerDownOutside,
  onCloseAutoFocus,
  onOpenAutoFocus,
}: TokenDialogShellProps) {
  const muted = dark ? "text-gray-300" : "text-[#676767]";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName={`fixed inset-0 z-[60] flex items-center justify-center ${dark ? "bg-black/60" : "bg-black/40"}`}
        className={`modal-popup flex ${width} max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto rounded-[10px] p-5 shadow-lg ${
          dark ? "bg-foreground-dark text-white" : "bg-white text-text"
        }`}
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
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 4.5L4.5 11.5M11.5 11.5L4.5 4.5" stroke={dark ? "#9ca3af" : "#666666"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

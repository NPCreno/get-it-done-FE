"use client";
import { useSyncExternalStore } from "react";
import { Toast } from "@/app/components/toast";
import type { ToastController } from "@/hooks/toastController";

/** Renders the page's toast. The wrapper markup is the one the pages used inline. */
export default function ToastHost({ controller }: { controller: ToastController }) {
  const { toast, exiting, id } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${exiting ? "toast-exit" : "toast-enter"}`}>
      <Toast key={id} {...toast} onClose={controller.close} />
    </div>
  );
}

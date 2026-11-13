"use client";
import { useEffect, useRef } from "react";
import { createToastController } from "./toastController";
import type { ToastController } from "./toastController";

/**
 * One toast controller per page. The instance is stable across renders and is disposed when the
 * page unmounts. Pass it to `<ToastHost controller={toast} />` and to every hook that reports a
 * result; no hook creates its own.
 */
export function useToastController(): ToastController {
  const ref = useRef<ToastController | null>(null);
  if (ref.current === null) ref.current = createToastController();
  const controller = ref.current;
  useEffect(() => () => controller.dispose(), [controller]);
  return controller;
}

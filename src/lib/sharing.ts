"use client";
import { createContext, useContext } from "react";

/**
 * FEAT-09: whether project sharing (shared projects in the task editor, the assignee select) is
 * available. True in the app. `/demo` provides `false`: it has no shared projects and no chat
 * routes, so the task editor and rows must not ask for them.
 */
export const SharingContext = createContext(true);

export function useSharingEnabled(): boolean {
  return useContext(SharingContext);
}

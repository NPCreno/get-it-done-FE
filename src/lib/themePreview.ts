"use client";
import { clearPreview, previewOverride, searchWithoutPreview, type PreviewOverride } from "@/lib/appearance";

/**
 * RD-2 dev theme preview store (plan 52-0 §4): read once per page load from the URL and
 * sessionStorage, shared by `useAppearance()` and the chip through `useSyncExternalStore`.
 * In a production build `ENABLED` is the constant `false`, so it is always null.
 */
const ENABLED = process.env.NODE_ENV !== "production";

let snapshot: PreviewOverride | null | undefined;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getPreview(): PreviewOverride | null {
  if (snapshot === undefined) {
    snapshot = ENABLED ? previewOverride(window.location.search, storage(), process.env.NODE_ENV) : null;
  }
  return snapshot;
}

/** The server and the hydration pass never preview. */
export function getServerPreview(): PreviewOverride | null {
  return null;
}

export function subscribePreview(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The chip's ×: back to the account's own appearance, and drop `?theme`/`?mode` from the URL. */
export function endPreview(): void {
  clearPreview(storage());
  snapshot = null;
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, "", `${pathname}${searchWithoutPreview(search)}${hash}`);
  listeners.forEach((l) => l());
}

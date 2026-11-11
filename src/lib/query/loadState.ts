import type { UseQueryResult } from "@tanstack/react-query";
import type { ApiFailure } from "@/lib/apiClient";
import { isSessionEnding } from "@/lib/clientSession";
import { failureOf, isCancellation } from "./unwrap";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; failure: ApiFailure }
  | { status: "empty"; data: T }
  | { status: "ready"; data: T; refreshFailure?: ApiFailure };

type QueryLike<T> = Pick<UseQueryResult<T>, "status" | "data" | "error" | "isPlaceholderData">;

/**
 * The single place that decides what a widget shows. Never `data ?? EMPTY`.
 * Only a SUCCESSFUL response with empty data is "empty"; a failure is never empty.
 */
export function loadStateOf<T>(
  q: QueryLike<T>,
  isEmpty: (data: T) => boolean,
  sessionEnding: () => boolean = isSessionEnding
): LoadState<T> {
  if (q.status === "error") {
    // Rule 1: silent in exactly two cases; every other failure stays visible.
    if (isCancellation(q.error)) return { status: "loading" };
    const failure = failureOf(q.error);
    if (failure.kind === "unauthorized" && sessionEnding()) return { status: "loading" };
    // Rule 2: this key's own last good data stays on screen.
    if (q.data !== undefined && !q.isPlaceholderData) {
      return { status: "ready", data: q.data, refreshFailure: failure };
    }
    // Rule 3
    return { status: "error", failure };
  }
  // Rule 4: pending with no data. Placeholder data (previous month/window) falls through.
  if (q.data === undefined) return { status: "loading" };
  // Rule 5
  return isEmpty(q.data) ? { status: "empty", data: q.data } : { status: "ready", data: q.data };
}

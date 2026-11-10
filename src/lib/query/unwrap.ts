import { isCancelledError } from "@tanstack/react-query";
import type { ApiFailure, ApiResult, ApiSuccess } from "@/lib/apiClient";

/** The DATA-01 ApiResult contract is unchanged; this only adapts it to throw for TanStack. */
export class ApiError extends Error {
  failure: ApiFailure;
  /** Set by the subtask-status mutation so rollback knows how far it got. */
  stage?: "subtask" | "parent";

  constructor(failure: ApiFailure, stage?: "subtask" | "parent") {
    super(failure.message);
    this.name = "ApiError";
    this.failure = failure;
    this.stage = stage;
  }
}

/** The whole success (data AND message), or throws. */
export function must<T>(result: ApiResult<T>, stage?: "subtask" | "parent"): ApiSuccess<T> {
  if (result.ok) return result;
  throw new ApiError(result, stage);
}

/** Just the data, or throws. */
export function unwrap<T>(result: ApiResult<T>): T {
  return must(result).data;
}

/** Only transient transport failures are retried; never cancellations. */
export function isRetryable(error: unknown): boolean {
  if (isCancellation(error)) return false;
  return error instanceof ApiError && (error.failure.kind === "network" || error.failure.kind === "timeout");
}

/** An aborted request, or TanStack's own cancellation error. */
export function isCancellation(error: unknown): boolean {
  if (isCancelledError(error)) return true;
  return error instanceof ApiError && error.failure.kind === "aborted";
}

export function failureOf(error: unknown): ApiFailure {
  if (error instanceof ApiError) return error.failure;
  return {
    ok: false,
    status: 0,
    kind: "http",
    message: error instanceof Error ? error.message : "An unknown error occurred",
  };
}

export type Settled<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

/** Await a mutation without try/catch at the call site. */
export async function settled<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, failure: failureOf(error) };
  }
}

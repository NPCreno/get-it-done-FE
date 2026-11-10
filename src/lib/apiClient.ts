import type { ZodTypeAny, ZodTypeDef, ZodType } from "zod";
import { getAccessToken } from "@/app/utils/utils";
import { expireSession, refreshSession } from "./clientSession";

export type ApiFailureKind =
  | "network"
  | "timeout"
  | "aborted"
  | "unauthorized" // session could not be restored; app is navigating to /login
  | "forbidden" // 403, or a 401 without a TOKEN_* code (ownership checks)
  | "http" // other non-2xx
  | "api" // 2xx envelope with status !== 'success'
  | "invalid_response" // contract violation
  | "invalid_request"; // our own payload failed its schema; nothing was sent

export type ApiSuccess<T> = { ok: true; status: number; data: T; message?: string };
export type ApiFailure = {
  ok: false;
  status: number;
  kind: ApiFailureKind;
  message: string;
  detail?: string;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface ApiRequestOptions<T = unknown> {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean; // default true
  expect?: "envelope" | "raw" | "none"; // default 'envelope'
  allowEmpty?: boolean; // default false
  timeoutMs?: number; // default 15000
  signal?: AbortSignal;
  fallbackError: string; // endpoint-specific human message
  /** Validates the request body before sending; failure is `invalid_request`. */
  requestSchema?: ZodTypeAny;
  /** Validates the unwrapped response data; failure is `invalid_response`. */
  schema?: ZodType<T, ZodTypeDef, unknown>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const REFRESH_FAILED_MESSAGE = "Could not refresh your session. Check your connection and try again.";
const SESSION_UNVERIFIED_MESSAGE = "Your session could not be verified. Please sign in again.";

/** Tagged template: encodeURIComponent on every interpolated value. */
export function apiPath(strings: TemplateStringsArray, ...values: (string | number)[]): string {
  return strings.reduce(
    (acc, s, i) => acc + s + (i < values.length ? encodeURIComponent(String(values[i])) : ""),
    ""
  );
}

/** False for failures the user should not be told about. */
export function isUserFacing(f: ApiFailure): boolean {
  return f.kind !== "aborted" && f.kind !== "unauthorized";
}

/**
 * Copy for a LOAD error. Fixed, client-authored strings chosen by kind/status:
 * it never reads f.message or f.detail, so server text (SQL fragments, ids) cannot leak.
 */
export function describeLoadFailure(f: ApiFailure): string {
  switch (f.kind) {
    case "network":
      return "You seem to be offline, or the server can't be reached.";
    case "timeout":
      return "The server took too long to respond.";
    case "forbidden":
      return "You don't have access to this data.";
    case "unauthorized":
      return "Your session couldn't be verified. Please sign in again.";
    case "api":
    case "invalid_response":
      return "Something went wrong on our side.";
    case "http":
      return f.status >= 500 ? "Something went wrong on our side." : "The request couldn't be completed.";
    default:
      return "The request couldn't be completed.";
  }
}

export function describeFailure(f: ApiFailure): { title: string; description: string } {
  if (f.kind === "invalid_request") {
    return { title: "Please check the form", description: f.detail ?? f.message };
  }
  if (f.kind === "api") {
    return { title: f.message, description: f.detail ?? "Something Went Wrong" };
  }
  return { title: "Something Went Wrong", description: f.message };
}

const fail = (status: number, kind: ApiFailureKind, message: string, detail?: string): ApiFailure => ({
  ok: false,
  status,
  kind,
  message,
  ...(detail !== undefined ? { detail } : {}),
});

function composeSignals(timeoutMs: number, caller?: AbortSignal) {
  const controller = new AbortController();
  const state = { timedOut: false };
  if (caller?.aborted) {
    controller.abort();
    return { signal: controller.signal, state, preAborted: true, cleanup: () => {} };
  }
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  caller?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    state,
    preAborted: false,
    cleanup: () => {
      clearTimeout(timer);
      caller?.removeEventListener("abort", onAbort);
    },
  };
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function errorMessage(json: unknown, fallback: string): string {
  const m = asRecord(json)?.message;
  if (typeof m === "string" && m) return m;
  if (Array.isArray(m) && m.length) return m.map(String).join("; ");
  return fallback;
}

/** Returns an ApiFailure when the session cannot be restored, otherwise null. */
async function restoreSession(stale: string | null): Promise<ApiFailure | null> {
  let outcome = await refreshSession(stale);
  if (outcome === "invalid") {
    const ended = await expireSession(stale);
    if (ended === "expired") return fail(401, "unauthorized", "Session expired");
    outcome = "refreshed";
  }
  if (outcome === "unavailable") return fail(0, "network", REFRESH_FAILED_MESSAGE);
  return null;
}

function interpretSuccess<T>(
  status: number,
  text: string,
  opts: ApiRequestOptions<T>
): ApiResult<T> {
  const expect = opts.expect ?? "envelope";
  if (expect === "none") return { ok: true, status, data: undefined as T };

  const empty = status === 204 || text.trim() === "";
  if (empty) {
    if (opts.allowEmpty) return { ok: true, status, data: undefined as T };
    return fail(status, "invalid_response", "Unexpected empty response");
  }

  const json = tryParse(text);
  if (json === undefined) return fail(status, "invalid_response", "Unexpected response from server");
  if (expect === "raw") return { ok: true, status, data: json as T };

  const env = asRecord(json);
  if (!env || typeof env.status !== "string") {
    return fail(status, "invalid_response", "Unexpected response from server");
  }
  const message = typeof env.message === "string" ? env.message : undefined;
  if (env.status === "success") {
    return { ok: true, status, data: env.data as T, ...(message !== undefined ? { message } : {}) };
  }
  let detail: string | undefined;
  if (typeof env.error === "string") detail = env.error;
  else if (typeof asRecord(env.error)?.message === "string") detail = asRecord(env.error)!.message as string;
  return fail(status, "api", message ?? opts.fallbackError, detail);
}

async function execute<T>(path: string, opts: ApiRequestOptions<T>, isRetry: boolean): Promise<ApiResult<T>> {
  if (typeof window === "undefined") {
    console.error("[api] apiClient is browser-only");
    return fail(0, "network", "API client is browser-only");
  }
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return fail(0, "network", "API URL is not configured");

  let requestBody = opts.body;
  if (opts.requestSchema && opts.body !== undefined) {
    const parsed = opts.requestSchema.safeParse(opts.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first?.path.length ? `${first.path.join(".")}: ` : "";
      console.warn("[api] invalid_request", path.split("?")[0], parsed.error.issues.map((i) => i.path.join(".")));
      return fail(0, "invalid_request", "Request failed validation", `${where}${first?.message ?? "Invalid value"}`);
    }
    requestBody = parsed.data;
  }

  const method = opts.method ?? "GET";
  const auth = opts.auth !== false;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let token: string | null = null;
  if (auth) {
    token = getAccessToken();
    if (!token) {
      const failure = await restoreSession(null);
      if (failure) return failure;
      token = getAccessToken();
      if (!token) return fail(401, "unauthorized", "Session expired");
    }
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) params.append(k, String(v));
  }
  const qs = params.toString();
  const url = base.replace(/\/+$/, "") + path + (qs ? `?${qs}` : "");
  const pathForLog = path.split("?")[0];

  const headers: Record<string, string> = {};
  const hasBody = requestBody !== undefined;
  if (hasBody) headers["Content-Type"] = "application/json";
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const composed = composeSignals(timeoutMs, opts.signal);
  if (composed.preAborted) return fail(0, "aborted", "Request aborted");

  let status: number;
  let text: string;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(requestBody) : undefined,
      cache: "no-store",
      credentials: "omit",
      signal: composed.signal,
    });
    status = res.status;
    text = await res.text(); // body read inside the try so a stalled body also times out
  } catch {
    if (composed.state.timedOut) {
      console.warn("[api]", method, pathForLog, 0, "timeout");
      return fail(0, "timeout", "Request timed out");
    }
    if (opts.signal?.aborted) return fail(0, "aborted", "Request aborted");
    console.warn("[api]", method, pathForLog, 0, "network");
    return fail(0, "network", "Network error. Check your connection and try again.");
  } finally {
    composed.cleanup();
  }

  if (status >= 200 && status < 300) {
    let result = interpretSuccess<T>(status, text, opts);
    if (result.ok && opts.schema && (opts.expect ?? "envelope") !== "none") {
      const parsed = opts.schema.safeParse(result.data);
      if (!parsed.success) {
        // Paths only: never log response values.
        console.warn("[api]", method, pathForLog, status, "schema", parsed.error.issues.slice(0, 5).map((i) => i.path.join(".")));
        result = fail(status, "invalid_response", "Unexpected response from server");
      } else {
        result = { ...result, data: parsed.data };
      }
    }
    if (!result.ok) console.warn("[api]", method, pathForLog, status, result.kind);
    return result;
  }

  const json = tryParse(text);
  const code = asRecord(json)?.code;
  const isTokenFailure = status === 401 && (code === "TOKEN_INVALID" || code === "TOKEN_MISSING");

  if (isTokenFailure && auth) {
    if (isRetry) {
      // Systemic (e.g. secret mismatch): logging out would not help.
      console.warn("[api]", method, pathForLog, status, "http");
      return fail(401, "http", SESSION_UNVERIFIED_MESSAGE);
    }
    const failure = await restoreSession(token);
    if (failure) return failure;
    // Replaying is safe: a TOKEN_* 401 comes from the guard, before any side effect.
    return execute<T>(path, opts, true);
  }

  const kind: ApiFailureKind = status === 401 || status === 403 ? "forbidden" : "http";
  console.warn("[api]", method, pathForLog, status, kind);
  return fail(status, kind, errorMessage(json, opts.fallbackError));
}

/** Never throws: only programming errors can reject. */
export function apiClient<T = unknown>(path: string, opts: ApiRequestOptions<T>): Promise<ApiResult<T>> {
  return execute<T>(path, opts, false);
}

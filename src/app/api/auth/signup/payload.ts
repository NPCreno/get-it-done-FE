import { CreateUserRequestSchema, type CreateUserRequest } from "@/app/contracts/requests";

/**
 * The only fields forwarded to the backend. Anything else in the browser body
 * (user_id, role, ...) is dropped by the zod object. Null when invalid.
 */
export function buildSignupPayload(raw: unknown): CreateUserRequest | null {
  const parsed = CreateUserRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Keeps only the envelope fields; the password is never part of a response.
 * A non-2xx Nest error body has no `status` field, so it becomes an "error"
 * envelope with its string message (this is how a 429 reaches the form).
 */
export function toSignupResponse(
  result: unknown,
  ok: boolean
): { status: string; message?: string; data?: unknown } | null {
  if (typeof result !== "object" || result === null) return null;
  const r = result as Record<string, unknown>;
  const message = typeof r.message === "string" ? r.message : undefined;
  if (typeof r.status !== "string") {
    if (ok) return null;
    return { status: "error", ...(message !== undefined ? { message } : {}) };
  }
  return {
    status: r.status,
    ...(message !== undefined ? { message } : {}),
    ...(r.data !== undefined ? { data: r.data } : {}),
  };
}

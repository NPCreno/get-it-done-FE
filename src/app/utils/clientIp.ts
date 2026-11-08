/**
 * Client IP for audit records only, never for an auth decision.
 * On Vercel, `x-forwarded-for` holds the real client IP as its leftmost value.
 * Returns an empty string when unknown (e.g. local dev); never throws.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    ""
  ).slice(0, 64);
}

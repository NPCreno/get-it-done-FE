const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-fA-F:.]{2,45}$/;

function plausibleIp(value: string): boolean {
  return IPV4.test(value) || (value.includes(":") && IPV6.test(value));
}

/**
 * Client IP for audit records only, never for an auth decision.
 * Headers are read only when TRUSTED_PROXY === "vercel" (set in Vercel project
 * settings only); elsewhere a client could spoof them, so nothing is sent.
 * Returns an empty string when unknown; never throws.
 */
export function getClientIp(headers: Headers): string {
  if (process.env.TRUSTED_PROXY !== "vercel") return "";
  const candidate =
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return candidate.length <= 64 && plausibleIp(candidate) ? candidate : "";
}

import { API_TOKEN_RULES } from "@/app/contracts/common";
import type { ApiTokenExpiryDays, ApiTokenStatus } from "@/app/contracts/enums";
import type { ApiFailure } from "@/lib/apiClient";

/** FEAT-07 pure display helpers and fixed copy for the API tokens section. */

export const STATUS_LABEL: Record<ApiTokenStatus, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
};

export type ExpiryChoice = ApiTokenExpiryDays | null;

export const EXPIRY_OPTIONS: readonly { value: ExpiryChoice; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "365 days" },
  { value: null, label: "No expiry" },
];

export const DEFAULT_EXPIRY: ExpiryChoice = API_TOKEN_RULES.defaultExpiryDays;

/** A token date for the table; `null` reads "Never" (never used, never expires). */
export function tokenDate(iso: string | null, locale?: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export const LIMIT_REACHED_COPY = `You have the maximum of ${API_TOKEN_RULES.maxActive} active tokens. Revoke one to create another.`;

export type CreateErrorCopy = { field: "name" | "form"; message: string };

/**
 * Fixed copy for the create errors the user can act on in the dialog. Server text is only
 * matched, never shown. Anything else (offline, 5xx) returns null and becomes a toast.
 */
export function createErrorCopy(f: ApiFailure): CreateErrorCopy | null {
  if (f.kind !== "http" && f.kind !== "api" && f.kind !== "invalid_request") return null;
  if (f.kind === "invalid_request") {
    return { field: "name", message: nameRuleCopy() };
  }
  if (f.status === 429) {
    return { field: "form", message: "You've created a lot of tokens in the last hour. Try again later." };
  }
  if (f.status === 400) {
    const text = `${f.message} ${f.detail ?? ""}`;
    if (/at most \d+ active tokens/i.test(text)) return { field: "form", message: LIMIT_REACHED_COPY };
    if (/\bname\b/i.test(text)) return { field: "name", message: nameRuleCopy() };
    return { field: "form", message: "Check the name and expiry, then try again." };
  }
  return null;
}

export function nameRuleCopy(): string {
  return `Enter a name of ${API_TOKEN_RULES.nameMin} to ${API_TOKEN_RULES.nameMax} characters.`;
}

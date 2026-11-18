import { ApiTokenSecret } from "@/app/contracts/responses";

/**
 * FEAT-07 pure builders for the "Connect an AI assistant" setup snippets. No secret is stored
 * or logged here: the caller passes the token in and shows the result.
 */

/** The name the assistant lists the server under. */
export const MCP_SERVER_NAME = "get-it-done";

/** The MCP endpoint sits at the backend's root, beside (not under) its `/api` prefix. */
export const MCP_PATH = "/mcp";

/**
 * `https://host/api` (the value of NEXT_PUBLIC_API_URL) becomes `https://host/mcp`. Trailing
 * slashes and one trailing `/api` segment are dropped first, so there is never a double slash.
 * Returns "" for a missing or non-http(s) base, so the UI shows nothing rather than a bad URL.
 */
export function mcpServerUrl(apiBase: string | undefined): string {
  if (!apiBase) return "";
  let url: URL;
  try {
    url = new URL(apiBase.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${url.origin}${path}${MCP_PATH}`;
}

/**
 * The token goes inside double quotes in a shell command. Only `gid_pat_` tokens made of
 * base62/base64url characters are accepted, so nothing in it can break out of the quotes
 * (no `"`, `$`, backtick, backslash or space) in bash, zsh or PowerShell.
 */
function assertSafeToken(token: string): string {
  if (!ApiTokenSecret.safeParse(token).success) throw new Error("Not a personal access token");
  return token;
}

/** `claude mcp add --transport http get-it-done <url> --header "Authorization: Bearer <token>"` */
export function claudeCodeCommand(url: string, token: string): string {
  return `claude mcp add --transport http ${MCP_SERVER_NAME} ${url} --header "Authorization: Bearer ${assertSafeToken(token)}"`;
}

/** A complete Cursor `mcp.json` with this one server. */
export function cursorConfig(url: string, token: string): string {
  const config = {
    mcpServers: {
      [MCP_SERVER_NAME]: {
        url,
        headers: { Authorization: `Bearer ${assertSafeToken(token)}` },
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

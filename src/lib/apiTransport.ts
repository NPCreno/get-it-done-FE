/**
 * Optional transport seam for `apiClient`. While a transport is installed,
 * every request goes to it instead of the network: no token, no refresh, no
 * `fetch`. Used by the in-browser demo; with nothing installed `apiClient`
 * behaves exactly as before.
 */
export interface ApiTransportRequest {
  method: string;
  /** Without the query string. */
  path: string;
  query?: Record<string, string | number | undefined>;
  /** Already validated by the request schema. */
  body?: unknown;
  /** Composed signal: aborts on caller abort AND on timeout. */
  signal: AbortSignal;
  timeoutMs: number;
}

export type ApiTransport = (req: ApiTransportRequest) => Promise<{ status: number; text: string }>;

interface Installed {
  transport: ApiTransport;
}

let active: Installed | null = null;

/**
 * Installs `transport` and returns this owner's release. Installing while another
 * owner is active throws. The release is ownership-checked and idempotent: a stale
 * or repeated release never clears a newer transport.
 */
export function installApiTransport(transport: ApiTransport): () => void {
  if (active) throw new Error("API transport already installed");
  const mine: Installed = { transport };
  active = mine;
  return () => {
    if (active === mine) active = null;
  };
}

export function getActiveApiTransport(): ApiTransport | null {
  return active ? active.transport : null;
}

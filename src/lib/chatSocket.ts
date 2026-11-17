/**
 * One managed chat WebSocket per tab (FEAT-05). Modeled on `notificationStream.ts`:
 * framework-free, ref-counted, reconnecting with the same backoff. Rooms are
 * ref-counted too: the first `join` of a project sends a join frame, the last
 * leave sends a leave frame, and the last room closing closes the socket.
 *
 * The socket only RECEIVES. Sending goes through REST (`chatRequests.ts`).
 * `useChatRoom` wires the room handlers to the React Query cache.
 */
import { ChatSocketEventSchema, type ChatMessage, type ChatSocketEvent } from "@/app/contracts/responses";
import type { RefreshOutcome } from "./clientSession";
import { backoffDelay, HEALTHY_AFTER_MS } from "./notificationStream";

/** The server closes with this when auth is missing, bad, late or expired. */
export const CLOSE_UNAUTHORIZED = 4401;
/** A connection that was authenticated at least this long may reconnect at once after a 4401. */
export const FAST_RECONNECT_AFTER_MS = 10_000;
const CLOSE_NORMAL = 1000;

/** `https://host/api` → `wss://host/api/chat/ws`. Null when the base is not an http(s) URL. */
export function chatSocketUrl(apiBase: string): string | null {
  try {
    const url = new URL(`${apiBase.replace(/\/+$/, "")}/chat/ws`);
    if (url.protocol === "https:") url.protocol = "wss:";
    else if (url.protocol === "http:") url.protocol = "ws:";
    else return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Pure. A frame the app understands, or null (bad JSON, unknown type, wrong shape). */
export function parseChatFrame(data: unknown): ChatSocketEvent | null {
  if (typeof data !== "string") return null;
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return null;
  }
  const parsed = ChatSocketEventSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------- controller

export interface SocketEvents {
  open: () => void;
  message: (data: unknown) => void;
  close: (code: number) => void;
}

/** The two calls the controller makes; the hook adapts the browser WebSocket to this. */
export interface SocketHandle {
  send(data: string): void;
  close(code?: number): void;
}

export interface ChatSocketDeps {
  url: string;
  createSocket: (url: string, events: SocketEvents) => SocketHandle;
  getToken: () => string | null;
  refresh: (stale: string | null) => Promise<RefreshOutcome>;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  random: () => number;
  now: () => number;
}

export interface ChatRoomHandlers {
  onCreated: (message: ChatMessage) => void;
  onDeleted: (id: string) => void;
  /** The room was (re)joined on a fresh connection: refetch to recover anything missed. */
  onResync: () => void;
  /** The server took this user out of the room (removed, left elsewhere, or no longer allowed). */
  onRemoved: () => void;
}

export interface ChatSocket {
  /** Ref-counted per project. Returns the leave function. */
  join(projectId: string, handlers: ChatRoomHandlers): () => void;
  /** A hidden tab holds no connection; visible again reconnects and resyncs. */
  setHidden(hidden: boolean): void;
}

interface Outcome {
  code: number;
  /** The server acknowledged auth on this connection. */
  ready: boolean;
  /** When the ack arrived (deps.now()), or null. */
  readyAt: number | null;
}

export function createChatSocket(deps: ChatSocketDeps): ChatSocket {
  const rooms = new Map<string, Set<ChatRoomHandlers>>();
  let hidden = false;
  let running: AbortController | null = null;
  /** The socket, only while it is authenticated. Join and leave frames go here. */
  let live: SocketHandle | null = null;
  /** Rooms the server refused or kicked us from: not re-joined until every subscriber left. */
  const gone = new Set<string>();

  const shouldRun = () => rooms.size > 0 && !hidden;

  const send = (socket: SocketHandle | null, frame: object) => {
    if (!socket) return;
    try {
      socket.send(JSON.stringify(frame));
    } catch {
      // not open any more: the close handler reconnects and re-joins
    }
  };

  const each = (projectId: string, fn: (h: ChatRoomHandlers) => void) => {
    for (const h of [...(rooms.get(projectId) ?? [])]) fn(h);
  };

  function dispatch(event: ChatSocketEvent): void {
    switch (event.type) {
      case "message.created":
        return each(event.data.project_id, (h) => h.onCreated(event.data));
      case "message.deleted":
        return each(event.data.project_id, (h) => h.onDeleted(event.data.id));
      case "removed":
        return removed(event.data.project_id);
      case "error":
        // A join the server refused: same 404 as a missing project.
        if (event.data.code === "NOT_FOUND" && event.data.project_id) removed(event.data.project_id);
        return;
    }
  }

  function removed(projectId: string): void {
    if (!rooms.has(projectId) || gone.has(projectId)) return;
    gone.add(projectId);
    each(projectId, (h) => h.onRemoved());
  }

  function connectOnce(token: string, signal: AbortSignal): Promise<Outcome> {
    return new Promise<Outcome>((resolve) => {
      const outcome: Outcome = { code: 0, ready: false, readyAt: null };
      let settled = false;
      let socket: SocketHandle | null = null;
      const finish = (code: number) => {
        if (settled) return;
        settled = true;
        if (live === socket) live = null;
        signal.removeEventListener("abort", onAbort);
        resolve({ ...outcome, code });
      };
      const onAbort = () => {
        try {
          socket?.close(CLOSE_NORMAL);
        } catch {
          // already closed
        }
        finish(CLOSE_NORMAL);
      };
      socket = deps.createSocket(deps.url, {
        // The token goes in the first frame, never in the URL (it would end up in logs).
        open: () => send(socket, { type: "auth", token }),
        message: (data) => {
          if (settled) return;
          const event = parseChatFrame(data);
          if (!event) return;
          if (event.type === "ready") {
            if (outcome.ready) return;
            outcome.ready = true;
            outcome.readyAt = deps.now();
            live = socket;
            const open = [...rooms.keys()].filter((id) => !gone.has(id));
            for (const projectId of open) send(socket, { type: "join", project_id: projectId });
            for (const projectId of open) each(projectId, (h) => h.onResync());
            return;
          }
          if (outcome.ready) dispatch(event);
        },
        close: (code) => finish(code),
      });
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  async function loop(signal: AbortSignal): Promise<void> {
    let attempt = 0;
    while (!signal.aborted) {
      let outcome: Outcome | null = null;
      let immediate = false;
      try {
        let token = deps.getToken();
        if (!token) {
          const refreshed = await deps.refresh(null);
          if (refreshed === "invalid") return; // the session flow owns the redirect
          token = deps.getToken();
        }
        if (token && !signal.aborted) {
          outcome = await connectOnce(token, signal);
          if (outcome.code === CLOSE_UNAUTHORIZED && !signal.aborted) {
            const refreshed = await deps.refresh(token);
            if (refreshed === "invalid") return;
            // The token expired during a good session: reconnect at once with the new one.
            immediate =
              refreshed === "refreshed" &&
              outcome.readyAt !== null &&
              deps.now() - outcome.readyAt >= FAST_RECONNECT_AFTER_MS;
          }
        }
      } catch {
        // createSocket threw or the refresh failed: handled below
      }
      if (signal.aborted) return;
      // Authenticated long enough means the next failure starts the backoff over.
      if (outcome?.readyAt != null && deps.now() - outcome.readyAt >= HEALTHY_AFTER_MS) attempt = 0;
      if (immediate) {
        attempt = 0;
        continue;
      }
      const delay = backoffDelay(attempt, deps.random);
      attempt += 1;
      try {
        await deps.sleep(delay, signal);
      } catch {
        return;
      }
    }
  }

  function sync(): void {
    if (shouldRun() && !running) {
      const controller = new AbortController();
      running = controller;
      void loop(controller.signal).finally(() => {
        if (running === controller) running = null;
      });
    } else if (!shouldRun() && running) {
      running.abort();
      running = null;
      live = null;
    }
  }

  return {
    join(projectId, handlers) {
      let set = rooms.get(projectId);
      if (!set) {
        set = new Set();
        rooms.set(projectId, set);
        send(live, { type: "join", project_id: projectId });
      }
      set.add(handlers);
      sync();
      let left = false;
      return () => {
        if (left) return;
        left = true;
        const current = rooms.get(projectId);
        current?.delete(handlers);
        if (current && current.size === 0) {
          rooms.delete(projectId);
          if (!gone.delete(projectId)) send(live, { type: "leave", project_id: projectId });
        }
        sync();
      };
    },
    setHidden(next) {
      hidden = next;
      sync();
    },
  };
}

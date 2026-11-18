/**
 * One managed live stream. The list endpoint is the source of truth: an event
 * only tells the app to refetch. Framework-free so it is testable with a fake
 * fetch; `useNotificationStream` wires it to React Query.
 */
import type { RefreshOutcome } from "./clientSession";

// ----------------------------------------------------------------- SSE parse

export interface SseMessage {
  id?: string;
  event: string;
  data: string;
}

/** Pure. Feed it the unparsed remainder plus the next chunk; it returns whole messages and the new remainder. */
export function parseSseChunk(rest: string, chunk: string): { messages: SseMessage[]; rest: string } {
  let text = (rest + chunk).replace(/\r\n/g, "\n");
  // A lone trailing CR may be the first half of a CRLF; hold it back.
  let held = "";
  if (text.endsWith("\r")) {
    held = "\r";
    text = text.slice(0, -1);
  }
  text = text.replace(/\r/g, "\n");
  const blocks = text.split("\n\n");
  const remainder = (blocks.pop() ?? "") + held;
  const messages: SseMessage[] = [];
  for (const block of blocks) {
    let id: string | undefined;
    let event: string | undefined;
    const data: string[] = [];
    let any = false;
    for (const line of block.split("\n")) {
      if (line === "" || line.startsWith(":")) continue;
      const i = line.indexOf(":");
      const name = i === -1 ? line : line.slice(0, i);
      let value = i === -1 ? "" : line.slice(i + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (name === "id") {
        id = value;
        any = true;
      } else if (name === "event") {
        event = value;
        any = true;
      } else if (name === "data") {
        data.push(value);
        any = true;
      }
    }
    if (any) messages.push({ ...(id !== undefined ? { id } : {}), event: event ?? "message", data: data.join("\n") });
  }
  return { messages, rest: remainder };
}

/** FEAT-08: the SSE event type the BE sends when one of this user's chat counts changed. */
export const CHAT_SSE_EVENT = "chat";

// ------------------------------------------------------------------- backoff

export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;
export const HEALTHY_AFTER_MS = 60_000;

/** 1 s, 2 s, 4 s ... capped at 30 s, plus up to 25% jitter (never above the cap). */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt));
  return Math.min(BACKOFF_MAX_MS, Math.round(base * (1 + 0.25 * random())));
}

// ---------------------------------------------------------------- controller

export interface StreamHandlers {
  /** A `notification` event arrived. */
  onNotification: () => void;
  /** A connection was (re)established: refetch to recover anything missed. */
  onConnected: () => void;
  /** FEAT-08: a `chat` event (some chat's unread count changed). It carries no counts. */
  onChat?: () => void;
}

export interface StreamDeps {
  fetch: typeof fetch;
  baseUrl: string;
  getToken: () => string | null;
  refresh: (stale: string | null) => Promise<RefreshOutcome>;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  random: () => number;
  now: () => number;
}

export interface NotificationStream {
  /** Ref-counted: the first subscriber connects, the last unsubscribe aborts. */
  subscribe(handlers: StreamHandlers): () => void;
  /** A hidden tab holds no connection; visible again reconnects. */
  setHidden(hidden: boolean): void;
}

export function createNotificationStream(deps: StreamDeps): NotificationStream {
  const subscribers = new Set<StreamHandlers>();
  let hidden = false;
  let running: AbortController | null = null;

  const emit = (k: keyof StreamHandlers) => subscribers.forEach((h) => h[k]?.());
  const shouldRun = () => subscribers.size > 0 && !hidden;

  async function loop(signal: AbortSignal): Promise<void> {
    let attempt = 0;
    while (!signal.aborted) {
      const connectedAt = deps.now();
      let healthy = false;
      try {
        let token = deps.getToken();
        if (!token) {
          const outcome = await deps.refresh(null);
          if (outcome === "invalid") return; // the session flow owns the redirect
          token = deps.getToken();
        }
        if (token) {
          const res = await deps.fetch(`${deps.baseUrl.replace(/\/+$/, "")}/notifications/sse`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            cache: "no-store",
            credentials: "omit",
            signal,
          });
          if (res.status === 401) {
            const outcome = await deps.refresh(token);
            if (outcome === "invalid") return;
          } else if (res.ok && res.body) {
            emit("onConnected");
            healthy = await readStream(res.body, signal);
          }
        }
      } catch {
        // network error or abort: handled below
      }
      if (signal.aborted) return;
      // Healthy long enough means the next failure starts the backoff over.
      if (healthy || deps.now() - connectedAt >= HEALTHY_AFTER_MS) attempt = 0;
      const delay = backoffDelay(attempt, deps.random);
      attempt += 1;
      try {
        await deps.sleep(delay, signal);
      } catch {
        return;
      }
    }
  }

  async function readStream(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<boolean> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let rest = "";
    const startedAt = deps.now();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const parsed = parseSseChunk(rest, decoder.decode(value, { stream: true }));
        rest = parsed.rest;
        for (const m of parsed.messages) {
          if (m.event === "notification") emit("onNotification");
          else if (m.event === CHAT_SSE_EVENT) emit("onChat");
        }
      }
    } catch {
      // aborted or broken connection
    } finally {
      reader.releaseLock?.();
    }
    return !signal.aborted && deps.now() - startedAt >= HEALTHY_AFTER_MS;
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
    }
  }

  return {
    subscribe(handlers) {
      subscribers.add(handlers);
      sync();
      return () => {
        subscribers.delete(handlers);
        sync();
      };
    },
    setHidden(next) {
      hidden = next;
      sync();
    },
  };
}

import { describe, expect, it, vi } from "vitest";
import {
  backoffDelay,
  BACKOFF_MAX_MS,
  createNotificationStream,
  HEALTHY_AFTER_MS,
  parseSseChunk,
  type StreamDeps,
} from "../notificationStream";

describe("F1: parseSseChunk", () => {
  it("parses a whole frame with id, event and data", () => {
    const r = parseSseChunk("", "id: n1\nevent: notification\ndata: {\"a\":1}\n\n");
    expect(r.messages).toEqual([{ id: "n1", event: "notification", data: '{"a":1}' }]);
    expect(r.rest).toBe("");
  });

  it("reassembles a frame split across chunks, even mid-line", () => {
    const a = parseSseChunk("", "event: notif");
    expect(a.messages).toEqual([]);
    const b = parseSseChunk(a.rest, "ication\ndata: x\n");
    expect(b.messages).toEqual([]);
    const c = parseSseChunk(b.rest, "\n");
    expect(c.messages).toEqual([{ event: "notification", data: "x" }]);
  });

  it("joins multi-line data with newlines and defaults the event to message", () => {
    expect(parseSseChunk("", "data: a\ndata: b\n\n").messages).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("ignores comments and blank lines", () => {
    expect(parseSseChunk("", ": hello\n\n").messages).toEqual([]);
  });

  it("handles CRLF, including a CR/LF split across chunks", () => {
    const a = parseSseChunk("", "event: ping\r\ndata: \r");
    const b = parseSseChunk(a.rest, "\n\r\n");
    expect([...a.messages, ...b.messages]).toEqual([{ event: "ping", data: "" }]);
  });

  it("returns several frames from one chunk and keeps the remainder", () => {
    const r = parseSseChunk("", "event: ping\ndata: \n\nevent: notification\ndata: 1\n\nevent: pi");
    expect(r.messages.map((m) => m.event)).toEqual(["ping", "notification"]);
    expect(r.rest).toBe("event: pi");
  });
});

describe("F2: backoff", () => {
  it("doubles from 1 s and never exceeds 30 s", () => {
    const delays = [0, 1, 2, 3, 4, 5, 6, 10, 50].map((n) => backoffDelay(n, () => 0));
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000]);
    for (const n of [0, 3, 9]) expect(backoffDelay(n, () => 1)).toBeLessThanOrEqual(BACKOFF_MAX_MS);
  });

  it("adds up to 25% jitter", () => {
    expect(backoffDelay(0, () => 1)).toBe(1250);
    expect(backoffDelay(1, () => 0.5)).toBe(2250);
  });
});

// ------------------------------------------------------------ F3: controller

const enc = new TextEncoder();
/** A response whose body the test feeds by hand. */
function liveResponse() {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (ctrl = c) });
  return {
    response: new Response(body, { status: 200 }),
    send: (text: string) => ctrl.enqueue(enc.encode(text)),
    end: () => ctrl.close(),
  };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function harness(over: Partial<StreamDeps> = {}) {
  let clock = 0;
  const sleeps: number[] = [];
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
  const deps: StreamDeps = {
    fetch: fetchMock as unknown as typeof fetch,
    baseUrl: "http://api/api",
    getToken: () => "tok",
    refresh: vi.fn(async () => "refreshed" as const),
    sleep: vi.fn(async (ms: number) => {
      sleeps.push(ms);
      await new Promise<void>((r) => setTimeout(r, 0));
    }),
    random: () => 0,
    now: () => clock,
    ...over,
  };
  const handlers = { onNotification: vi.fn(), onConnected: vi.fn() };
  return { deps, handlers, fetchMock, sleeps, advance: (ms: number) => (clock += ms) };
}

describe("F3: stream controller", () => {
  it("connects with the bearer token, invalidates on connect and on each notification", async () => {
    const h = harness();
    const live = liveResponse();
    h.fetchMock.mockResolvedValueOnce(live.response);
    const stream = createNotificationStream(h.deps);
    const off = stream.subscribe(h.handlers);
    await tick();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetchMock.mock.calls[0];
    expect(url).toBe("http://api/api/notifications/sse");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(h.handlers.onConnected).toHaveBeenCalledTimes(1);
    live.send("event: ping\ndata: \n\n");
    live.send("id: n1\nevent: notification\ndata: {}\n\n");
    await tick();
    expect(h.handlers.onNotification).toHaveBeenCalledTimes(1);
    off();
  });

  it("reconnects after the stream ends (e.g. token expiry) and signals onConnected again", async () => {
    const h = harness();
    const first = liveResponse();
    const second = liveResponse();
    h.fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    const off = createNotificationStream(h.deps).subscribe(h.handlers);
    await tick();
    first.end();
    await tick();
    await tick();
    expect(h.fetchMock).toHaveBeenCalledTimes(2);
    expect(h.handlers.onConnected).toHaveBeenCalledTimes(2);
    expect(h.sleeps).toEqual([1000]);
    off();
  });

  it("backs off 1 s, 2 s, 4 s while connections keep failing, and resets after a healthy run", async () => {
    const h = harness();
    h.fetchMock.mockRejectedValueOnce(new Error("net")).mockRejectedValueOnce(new Error("net")).mockRejectedValueOnce(new Error("net"));
    const healthy = liveResponse();
    h.fetchMock.mockResolvedValueOnce(healthy.response);
    h.fetchMock.mockRejectedValue(new Error("net"));
    const off = createNotificationStream(h.deps).subscribe(h.handlers);
    for (let i = 0; i < 12; i++) await tick();
    expect(h.sleeps.slice(0, 3)).toEqual([1000, 2000, 4000]);
    h.advance(HEALTHY_AFTER_MS + 1);
    healthy.end();
    for (let i = 0; i < 6; i++) await tick();
    expect(h.sleeps[3]).toBe(1000); // back to the start after a healthy stretch
    off();
  });

  it("401: refreshes and reconnects; if the session is gone it stops", async () => {
    const h = harness({ refresh: vi.fn(async () => "invalid" as const) });
    h.fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    const off = createNotificationStream(h.deps).subscribe(h.handlers);
    for (let i = 0; i < 4; i++) await tick();
    expect(h.deps.refresh).toHaveBeenCalledWith("tok");
    expect(h.fetchMock).toHaveBeenCalledTimes(1); // stopped, no retry loop
    off();

    const h2 = harness();
    const ok = liveResponse();
    h2.fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })).mockResolvedValueOnce(ok.response);
    const off2 = createNotificationStream(h2.deps).subscribe(h2.handlers);
    for (let i = 0; i < 6; i++) await tick();
    expect(h2.deps.refresh).toHaveBeenCalledWith("tok");
    expect(h2.fetchMock).toHaveBeenCalledTimes(2);
    off2();
  });

  it("is ref-counted: two subscribers share one fetch; the last unsubscribe aborts", async () => {
    const h = harness();
    const live = liveResponse();
    h.fetchMock.mockResolvedValue(live.response);
    const stream = createNotificationStream(h.deps);
    const a = stream.subscribe(h.handlers);
    const b = stream.subscribe({ onNotification: vi.fn(), onConnected: vi.fn() });
    await tick();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    const signal = h.fetchMock.mock.calls[0][1]!.signal as AbortSignal;
    a();
    expect(signal.aborted).toBe(false);
    b();
    expect(signal.aborted).toBe(true);
  });

  it("a hidden tab aborts and a visible tab reconnects", async () => {
    const h = harness();
    h.fetchMock.mockImplementation(async () => liveResponse().response);
    const stream = createNotificationStream(h.deps);
    const off = stream.subscribe(h.handlers);
    await tick();
    const signal = h.fetchMock.mock.calls[0][1]!.signal as AbortSignal;
    stream.setHidden(true);
    expect(signal.aborted).toBe(true);
    await tick();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    stream.setHidden(false);
    await tick();
    expect(h.fetchMock).toHaveBeenCalledTimes(2);
    off();
  });
});

describe("F4: chat events on the same stream (FEAT-08)", () => {
  async function connected() {
    const h = harness();
    const live = liveResponse();
    h.fetchMock.mockResolvedValueOnce(live.response);
    const handlers = { ...h.handlers, onChat: vi.fn() };
    const off = createNotificationStream(h.deps).subscribe(handlers);
    await tick();
    return { live, handlers, off };
  }

  it("a chat event calls onChat and not onNotification", async () => {
    const { live, handlers, off } = await connected();
    live.send('event: chat\ndata: {"project_id":"P1"}\n\n');
    await tick();
    expect(handlers.onChat).toHaveBeenCalledTimes(1);
    expect(handlers.onNotification).not.toHaveBeenCalled();
    off();
  });

  it("a notification event works as before", async () => {
    const { live, handlers, off } = await connected();
    live.send("id: n1\nevent: notification\ndata: {}\n\n");
    await tick();
    expect(handlers.onNotification).toHaveBeenCalledTimes(1);
    expect(handlers.onChat).not.toHaveBeenCalled();
    off();
  });

  it("a mix in one chunk calls each handler once", async () => {
    const { live, handlers, off } = await connected();
    live.send('id: n2\nevent: notification\ndata: {}\n\nevent: chat\ndata: {"project_id":"P1"}\n\nevent: ping\ndata: \n\n');
    await tick();
    expect(handlers.onNotification).toHaveBeenCalledTimes(1);
    expect(handlers.onChat).toHaveBeenCalledTimes(1);
    off();
  });

  it("a subscriber without onChat ignores chat events", async () => {
    const h = harness();
    const live = liveResponse();
    h.fetchMock.mockResolvedValueOnce(live.response);
    const off = createNotificationStream(h.deps).subscribe(h.handlers);
    await tick();
    live.send('event: chat\ndata: {"project_id":"P1"}\n\n');
    await tick();
    expect(h.handlers.onNotification).not.toHaveBeenCalled();
    off();
  });
});

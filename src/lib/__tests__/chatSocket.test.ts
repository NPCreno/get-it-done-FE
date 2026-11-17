import { describe, expect, it, vi } from "vitest";
import {
  chatSocketUrl,
  CLOSE_UNAUTHORIZED,
  createChatSocket,
  FAST_RECONNECT_AFTER_MS,
  parseChatFrame,
  type ChatRoomHandlers,
  type ChatSocketDeps,
  type SocketEvents,
} from "../chatSocket";
import { HEALTHY_AFTER_MS } from "../notificationStream";
import type { ChatMessage } from "@/app/contracts/responses";

const msg = (id: string, project_id = "P1"): ChatMessage => ({
  id,
  project_id,
  user_id: "u2",
  username: "bob",
  body: "hi",
  created_at: "2026-11-17T10:00:00.000Z",
});

describe("C1: chatSocketUrl and parseChatFrame", () => {
  it("turns the API base into the socket URL", () => {
    expect(chatSocketUrl("https://api.example.com/api")).toBe("wss://api.example.com/api/chat/ws");
    expect(chatSocketUrl("http://localhost:3001/api/")).toBe("ws://localhost:3001/api/chat/ws");
    expect(chatSocketUrl("not a url")).toBeNull();
    expect(chatSocketUrl("ftp://x/api")).toBeNull();
  });

  it("accepts only known, well-formed {type, data} frames", () => {
    const ready = { type: "ready", data: { user_id: "u1" } };
    expect(parseChatFrame(JSON.stringify(ready))).toEqual(ready);
    const created = { type: "message.created", data: msg("m1") };
    expect(parseChatFrame(JSON.stringify(created))).toEqual(created);
    const deleted = { type: "message.deleted", data: { id: "m1", project_id: "P1" } };
    expect(parseChatFrame(JSON.stringify(deleted))).toEqual(deleted);
    const removed = { type: "removed", data: { project_id: "P1" } };
    expect(parseChatFrame(JSON.stringify(removed))).toEqual(removed);
    const error = { type: "error", data: { code: "NOT_FOUND", project_id: "P1" } };
    expect(parseChatFrame(JSON.stringify(error))).toEqual(error);
    expect(parseChatFrame("{bad json")).toBeNull();
    expect(parseChatFrame('{"type":"typing","data":{}}')).toBeNull();
    expect(parseChatFrame('{"type":"joined","data":{"project_id":"P1"}}')).toBeNull(); // not acted on
    expect(parseChatFrame(JSON.stringify({ type: "message.created", data: { id: 1 } }))).toBeNull();
    expect(parseChatFrame(new ArrayBuffer(2))).toBeNull();
  });
});

// ------------------------------------------------------------ C2: controller

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const ticks = async (n: number) => {
  for (let i = 0; i < n; i++) await tick();
};

/** A socket the test drives by hand. */
class FakeSocket {
  sent: unknown[] = [];
  closedWith: number | undefined;
  constructor(
    public url: string,
    public events: SocketEvents
  ) {}
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code?: number) {
    this.closedWith = code;
  }
  // server side
  open() {
    this.events.open();
  }
  ready() {
    this.events.message(JSON.stringify({ type: "ready", data: { user_id: "u1" } }));
  }
  push(frame: object) {
    this.events.message(JSON.stringify(frame));
  }
  drop(code: number) {
    this.events.close(code);
  }
}

function harness(over: Partial<ChatSocketDeps> = {}) {
  let clock = 0;
  const sleeps: number[] = [];
  const sockets: FakeSocket[] = [];
  let token = "tok";
  const deps: ChatSocketDeps = {
    url: "wss://api/api/chat/ws",
    createSocket: (url, events) => {
      const s = new FakeSocket(url, events);
      sockets.push(s);
      return s;
    },
    getToken: () => token,
    refresh: vi.fn(async () => {
      token = "tok2";
      return "refreshed" as const;
    }),
    sleep: vi.fn(async (ms: number) => {
      sleeps.push(ms);
      await tick();
    }),
    random: () => 0,
    now: () => clock,
    ...over,
  };
  const room = (): ChatRoomHandlers & { [K in keyof ChatRoomHandlers]: ReturnType<typeof vi.fn> } =>
    ({ onCreated: vi.fn(), onDeleted: vi.fn(), onResync: vi.fn(), onRemoved: vi.fn() }) as never;
  return { deps, sockets, sleeps, room, advance: (ms: number) => (clock += ms) };
}

/** Open, then acknowledge auth. */
async function connect(s: FakeSocket) {
  s.open();
  s.ready();
  await tick();
}

describe("C2: chat socket controller", () => {
  it("sends the auth frame first, joins only after the ready ack, and never puts the token in the URL", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const leave = chat.join("P1", h.room());
    await tick();
    expect(h.sockets).toHaveLength(1);
    const s = h.sockets[0];
    expect(s.url).toBe("wss://api/api/chat/ws");
    expect(s.url).not.toContain("tok");
    s.open();
    expect(s.sent).toEqual([{ type: "auth", token: "tok" }]);
    s.ready();
    expect(s.sent).toEqual([
      { type: "auth", token: "tok" },
      { type: "join", project_id: "P1" },
    ]);
    leave();
  });

  it("routes created and deleted events to the room's handlers only, and ignores events before ready", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const a = h.room();
    const b = h.room();
    chat.join("P1", a);
    chat.join("P2", b);
    await tick();
    const s = h.sockets[0];
    s.open();
    s.push({ type: "message.created", data: msg("early") });
    expect(a.onCreated).not.toHaveBeenCalled();
    s.ready();
    s.push({ type: "message.created", data: msg("m1") });
    s.push({ type: "joined", data: { project_id: "P1" } }); // ignored
    s.push({ type: "message.deleted", data: { id: "m0", project_id: "P1" } });
    s.push({ type: "message.created", data: msg("x", "P9") });
    expect(a.onCreated).toHaveBeenCalledWith(msg("m1"));
    expect(a.onDeleted).toHaveBeenCalledWith("m0");
    expect(b.onCreated).not.toHaveBeenCalled();
    expect(b.onDeleted).not.toHaveBeenCalled();
  });

  it("is ref-counted: one socket for many rooms and subscribers; join and leave frames per room", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const off1 = chat.join("P1", h.room());
    const off2 = chat.join("P1", h.room());
    await tick();
    const s = h.sockets[0];
    await connect(s);
    const off3 = chat.join("P2", h.room());
    expect(h.sockets).toHaveLength(1);
    expect(s.sent.filter((f) => (f as { type: string }).type === "join")).toEqual([
      { type: "join", project_id: "P1" },
      { type: "join", project_id: "P2" },
    ]);
    off1();
    expect(s.sent.at(-1)).toEqual({ type: "join", project_id: "P2" }); // P1 still has a subscriber
    off2();
    expect(s.sent.at(-1)).toEqual({ type: "leave", project_id: "P1" });
    expect(s.closedWith).toBeUndefined();
    off3();
    expect(s.sent.at(-1)).toEqual({ type: "leave", project_id: "P2" });
    expect(s.closedWith).toBe(1000); // the last room closes the socket
    off3(); // idempotent
  });

  it("reconnects with backoff 1 s, 2 s, 4 s and resets after a healthy run", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    chat.join("P1", h.room());
    await tick();
    for (let i = 0; i < 3; i++) {
      h.sockets.at(-1)!.drop(1006);
      await ticks(3);
    }
    expect(h.sleeps).toEqual([1000, 2000, 4000]);
    const s = h.sockets.at(-1)!;
    await connect(s);
    h.advance(HEALTHY_AFTER_MS + 1);
    s.drop(1006);
    await ticks(3);
    expect(h.sleeps[3]).toBe(1000);
  });

  it("re-joins every open room and asks each room to resync after a reconnect", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const a = h.room();
    const b = h.room();
    chat.join("P1", a);
    chat.join("P2", b);
    await tick();
    await connect(h.sockets[0]);
    expect(a.onResync).toHaveBeenCalledTimes(1);
    h.sockets[0].drop(1006);
    await ticks(3);
    const second = h.sockets[1];
    await connect(second);
    expect(second.sent).toEqual([
      { type: "auth", token: "tok" },
      { type: "join", project_id: "P1" },
      { type: "join", project_id: "P2" },
    ]);
    expect(a.onResync).toHaveBeenCalledTimes(2);
    expect(b.onResync).toHaveBeenCalledTimes(2);
  });

  it("close 4401 after a long session: refreshes, then reconnects at once with the new token", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    chat.join("P1", h.room());
    await tick();
    await connect(h.sockets[0]);
    h.advance(FAST_RECONNECT_AFTER_MS);
    h.sockets[0].drop(CLOSE_UNAUTHORIZED);
    await ticks(3);
    expect(h.deps.refresh).toHaveBeenCalledWith("tok");
    expect(h.sleeps).toEqual([]); // no backoff
    expect(h.sockets).toHaveLength(2);
    h.sockets[1].open();
    expect(h.sockets[1].sent[0]).toEqual({ type: "auth", token: "tok2" });
  });

  it("close 4401 before ready: refreshes and reconnects with backoff (no tight loop)", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    chat.join("P1", h.room());
    await tick();
    h.sockets[0].open();
    h.sockets[0].drop(CLOSE_UNAUTHORIZED);
    await ticks(3);
    expect(h.deps.refresh).toHaveBeenCalledWith("tok");
    expect(h.sleeps).toEqual([1000]);
    expect(h.sockets).toHaveLength(2);
  });

  it("close 4401 with a dead session stops: no retry loop", async () => {
    const h = harness({ refresh: vi.fn(async () => "invalid" as const) });
    const chat = createChatSocket(h.deps);
    chat.join("P1", h.room());
    await tick();
    h.sockets[0].open();
    h.sockets[0].drop(CLOSE_UNAUTHORIZED);
    await ticks(5);
    expect(h.sockets).toHaveLength(1);
    expect(h.sleeps).toEqual([]);
  });

  it("with no access token it refreshes first; an invalid session never opens a socket", async () => {
    const h = harness({ getToken: () => null, refresh: vi.fn(async () => "invalid" as const) });
    createChatSocket(h.deps).join("P1", h.room());
    await ticks(3);
    expect(h.deps.refresh).toHaveBeenCalledWith(null);
    expect(h.sockets).toHaveLength(0);
  });

  it("a hidden tab closes the socket and a visible tab reconnects", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    chat.join("P1", h.room());
    await tick();
    await connect(h.sockets[0]);
    chat.setHidden(true);
    expect(h.sockets[0].closedWith).toBe(1000);
    await tick();
    expect(h.sockets).toHaveLength(1);
    chat.setHidden(false);
    await tick();
    expect(h.sockets).toHaveLength(2);
  });

  it("a handler that leaves its room during an event does not break dispatch", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const other = h.room();
    let leave = () => {};
    const self: ChatRoomHandlers = { onCreated: () => leave(), onDeleted: vi.fn(), onResync: vi.fn(), onRemoved: vi.fn() };
    leave = chat.join("P1", self);
    chat.join("P1", other);
    await tick();
    await connect(h.sockets[0]);
    h.sockets[0].push({ type: "message.created", data: msg("m1") });
    expect(other.onCreated).toHaveBeenCalledTimes(1);
  });

  it("removed: tells the room once, and a reconnect does not re-join it until every subscriber left", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const a = h.room();
    const b = h.room();
    const offA = chat.join("P1", a);
    chat.join("P2", b);
    await tick();
    await connect(h.sockets[0]);
    h.sockets[0].push({ type: "removed", data: { project_id: "P1" } });
    h.sockets[0].push({ type: "removed", data: { project_id: "P1" } });
    expect(a.onRemoved).toHaveBeenCalledTimes(1);
    expect(b.onRemoved).not.toHaveBeenCalled();
    h.sockets[0].drop(1006);
    await ticks(3);
    await connect(h.sockets[1]);
    expect(h.sockets[1].sent).toEqual([
      { type: "auth", token: "tok" },
      { type: "join", project_id: "P2" },
    ]);
    offA();
    expect(h.sockets[1].sent.at(-1)).toEqual({ type: "join", project_id: "P2" }); // no leave for a room we are not in
    chat.join("P1", h.room());
    expect(h.sockets[1].sent.at(-1)).toEqual({ type: "join", project_id: "P1" });
  });

  it("a refused join (error NOT_FOUND with the project) counts as removed; other errors do nothing", async () => {
    const h = harness();
    const chat = createChatSocket(h.deps);
    const a = h.room();
    chat.join("P1", a);
    await tick();
    await connect(h.sockets[0]);
    h.sockets[0].push({ type: "error", data: { code: "BAD_FRAME" } });
    h.sockets[0].push({ type: "error", data: { code: "TOO_MANY_ROOMS", project_id: "P1" } });
    expect(a.onRemoved).not.toHaveBeenCalled();
    h.sockets[0].push({ type: "error", data: { code: "NOT_FOUND", project_id: "P1" } });
    expect(a.onRemoved).toHaveBeenCalledTimes(1);
  });
});

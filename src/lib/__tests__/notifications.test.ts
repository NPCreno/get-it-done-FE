import { MutationObserver } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/notificationsRequests", () => ({
  getNotificationsPage: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  clearNotifications: vi.fn(),
}));

import { clearNotifications, getNotificationsPage, markAllNotificationsRead, markNotificationRead } from "@/app/api/notificationsRequests";
import { dataMutationOptions } from "../query/mutations";
import { invalidationsFor } from "../query/invalidation";
import { qk } from "../query/keys";
import { markReadOptions, NOTIFICATION_DATA_KEY, notificationsSpec } from "../query/notifications";
import { applyRead, revertRead, type NotificationPages } from "../query/notificationsOptimistic";
import { routeForNotification } from "../notificationRoutes";
import { deferred, failResult, flush, okResult, testClient } from "../query/__tests__/helpers";
import type { Notification } from "@/app/contracts/responses";

const n = (id: string, read: boolean): Notification => ({
  notif_id: id,
  type: "achievement",
  title: "t",
  message: "m",
  read,
  actionType: "acknowledge",
  createdAt: "2026-11-16T00:00:00.000Z",
});
const pages = (...items: Notification[][]): NotificationPages => ({
  pages: items.map((i, idx) => ({
    items: i,
    unread_count: idx === 0 ? items.flat().filter((x) => !x.read).length : 0,
    next_cursor: null,
  })),
  pageParams: items.map(() => undefined),
});

const U = "u1";
beforeEach(() => vi.clearAllMocks());

describe("F5: query layer", () => {
  it("the key equals the request parameters and the request gets the cursor and signal", async () => {
    const spec = notificationsSpec(U);
    expect(spec.queryKey).toEqual(["u", U, "notifications"]);
    vi.mocked(getNotificationsPage).mockResolvedValueOnce(okResult({ items: [], unread_count: 0, next_cursor: null }) as never);
    const signal = new AbortController().signal;
    await spec.queryFn({ signal, pageParam: "abc" });
    expect(getNotificationsPage).toHaveBeenCalledWith("abc", { signal });
    expect(spec.getNextPageParam({ next_cursor: "x" })).toBe("x");
    expect(spec.getNextPageParam({ next_cursor: null })).toBeUndefined();
  });

  it("applyRead flips one row and lowers the count once; revertRead only undoes that row", () => {
    const data = pages([n("a", false), n("b", false)], [n("c", false)]);
    const read = applyRead(data, "b")!;
    expect(read.pages[0].items.map((i) => i.read)).toEqual([false, true]);
    expect(read.pages[0].unread_count).toBe(data.pages[0].unread_count - 1);
    expect(applyRead(read, "b")).toBe(read); // idempotent: same object
    const reverted = revertRead(applyRead(read, "a"), "b")!;
    expect(reverted.pages[0].items.map((i) => i.read)).toEqual([true, false]); // a stays read
    expect(applyRead(undefined, "a")).toBeUndefined();
  });

  it("mark-read is optimistic and rolls back only its own row on failure", async () => {
    const qc = testClient();
    qc.setQueryData(qk.notifications(U), pages([n("a", false), n("b", false)]));
    const gate = deferred<ReturnType<typeof okResult>>();
    vi.mocked(markNotificationRead).mockReturnValueOnce(gate.promise as never);
    const m = new MutationObserver(qc, markReadOptions(qc, U));
    const p = m.mutate("a").catch(() => {});
    await flush();
    const mid = qc.getQueryData<NotificationPages>(qk.notifications(U))!;
    expect(mid.pages[0].items.map((i) => i.read)).toEqual([true, false]);
    expect(mid.pages[0].unread_count).toBe(1);
    // another row changes meanwhile
    qc.setQueryData(qk.notifications(U), applyRead(mid, "b"));
    vi.mocked(markNotificationRead).mockResolvedValue(failResult("http") as never);
    gate.resolve(failResult("http") as never);
    await p;
    const end = qc.getQueryData<NotificationPages>(qk.notifications(U))!;
    expect(end.pages[0].items.map((i) => i.read)).toEqual([false, true]);
  });

  it("mark-all and clear invalidate the notifications prefix", async () => {
    expect(invalidationsFor("notifications", U)).toEqual([qk.notifications(U)]);
    const qc = testClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(markAllNotificationsRead).mockResolvedValueOnce(okResult({ updated: 2 }) as never);
    await new MutationObserver(qc, dataMutationOptions(qc, U, NOTIFICATION_DATA_KEY, "notifications", () => markAllNotificationsRead())).mutate(undefined);
    expect(spy).toHaveBeenCalledWith({ queryKey: qk.notifications(U) });
    spy.mockClear();
    vi.mocked(clearNotifications).mockResolvedValueOnce(okResult(undefined) as never);
    await new MutationObserver(qc, dataMutationOptions(qc, U, NOTIFICATION_DATA_KEY, "notifications", () => clearNotifications(U))).mutate(undefined);
    expect(spy).toHaveBeenCalledWith({ queryKey: qk.notifications(U) });
  });
});

describe("F5: action routes allowlist", () => {
  it("every known type and any unknown type navigates nowhere", () => {
    for (const t of ["achievement", "milestone", "streak", "levelUp", "reward", "taskDue"]) {
      expect(routeForNotification(t)).toBeNull();
    }
    expect(routeForNotification("somethingNew")).toBeNull();
    expect(routeForNotification("__proto__")).toBeNull();
  });
});

import { MutationObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/userRequests", () => ({ updateUser: vi.fn() }));

import { updateUser } from "@/app/api/userRequests";
import type { PomodoroStyle } from "@/app/contracts/enums";
import type { UserRecord } from "@/app/contracts/responses";
import { qk } from "../keys";
import { invalidationsFor } from "../invalidation";
import { createStyleSaveTracker, setPomodoroStyleOptions, type PomodoroStyleVars } from "../pomodoroStyle";
import { deferred, failResult, flush, okResult, testClient } from "./helpers";

const U = "u1";
const mockUpdate = () => vi.mocked(updateUser);

/** A client with the profile cached, and a stand-in for the context user. */
function setup(initial: PomodoroStyle | undefined = undefined) {
  const qc = testClient();
  qc.setQueryData(qk.profile(U), { user_id: U, pomodoroStyle: initial } as unknown as UserRecord);
  let context: PomodoroStyle | undefined = initial;
  const tracker = createStyleSaveTracker();
  const options = setPomodoroStyleOptions(qc, U, { tracker, show: (s) => (context = s) });
  const cached = () => qc.getQueryData<UserRecord>(qk.profile(U))?.pomodoroStyle;
  const shown = () => context;
  const pick = (style: PomodoroStyle, previous: PomodoroStyle) => {
    const m = new MutationObserver<void, unknown, PomodoroStyleVars>(qc, options as never);
    return m.mutate({ style, previous }).catch(() => undefined);
  };
  return { qc, tracker, cached, shown, pick };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("useSetPomodoroStyle cache logic", () => {
  it("sends only { pomodoroStyle } for the session user", async () => {
    const { pick } = setup();
    mockUpdate().mockResolvedValueOnce(okResult({}) as never);
    await pick("ticket", "dial");
    expect(mockUpdate()).toHaveBeenCalledWith(U, { pomodoroStyle: "ticket" });
  });

  it("applies the pick at once, in the context user and the profile cache", async () => {
    const { pick, cached, shown } = setup();
    const call = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockReturnValueOnce(call.promise as never);
    const done = pick("horizon", "dial");
    await flush();
    expect(shown()).toBe("horizon");
    expect(cached()).toBe("horizon");
    call.resolve(okResult({}));
    await done;
    expect(shown()).toBe("horizon");
  });

  it("on error the previous value comes back in both places", async () => {
    const { pick, cached, shown, tracker } = setup("ticket");
    mockUpdate().mockResolvedValueOnce(failResult("network") as never);
    await pick("horizon", "ticket");
    expect(shown()).toBe("ticket");
    expect(cached()).toBe("ticket");
    expect(tracker.shown()).toBe("ticket");
  });

  it("two quick picks: the last one stays, and they reach the server in order", async () => {
    const { pick, shown, cached } = setup();
    const first = deferred<ReturnType<typeof okResult>>();
    const second = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockReturnValueOnce(first.promise as never).mockReturnValueOnce(second.promise as never);
    const a = pick("ticket", "dial");
    await flush();
    const b = pick("horizon", "ticket");
    await flush();
    expect(shown()).toBe("horizon");
    // Same scope: the second save waits for the first.
    expect(mockUpdate()).toHaveBeenCalledTimes(1);
    first.resolve(okResult({}));
    await flush();
    expect(mockUpdate()).toHaveBeenCalledTimes(2);
    expect(mockUpdate().mock.calls[1][1]).toEqual({ pomodoroStyle: "horizon" });
    second.resolve(okResult({}));
    await Promise.all([a, b]);
    expect(shown()).toBe("horizon");
    expect(cached()).toBe("horizon");
  });

  it("an older pick failing while a newer one saves leaves the newer pick on screen", async () => {
    const { pick, shown } = setup();
    const second = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockResolvedValueOnce(failResult() as never).mockReturnValueOnce(second.promise as never);
    const a = pick("ticket", "dial");
    const b = pick("horizon", "ticket");
    await a;
    expect(shown()).toBe("horizon");
    second.resolve(okResult({}));
    await b;
    expect(shown()).toBe("horizon");
  });

  it("both picks failing goes back to what the server had, not to the failed first pick", async () => {
    const { pick, shown, cached } = setup("dial");
    mockUpdate().mockResolvedValueOnce(failResult() as never).mockResolvedValueOnce(failResult() as never);
    await Promise.all([pick("ticket", "dial"), pick("horizon", "ticket")]);
    expect(shown()).toBe("dial");
    expect(cached()).toBe("dial");
  });

  it("the first pick saved, the second failed: back to the first", async () => {
    const { pick, shown } = setup("dial");
    mockUpdate().mockResolvedValueOnce(okResult({}) as never).mockResolvedValueOnce(failResult() as never);
    await Promise.all([pick("ticket", "dial"), pick("horizon", "ticket")]);
    expect(shown()).toBe("ticket");
  });

  it("invalidates the profile key only", () => {
    expect(invalidationsFor("pomodoro-style", U)).toEqual([qk.profile(U)]);
  });
});

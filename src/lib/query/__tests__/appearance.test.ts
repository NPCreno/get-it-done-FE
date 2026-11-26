import { MutationObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/userRequests", () => ({ updateUser: vi.fn() }));

import { updateUser } from "@/app/api/userRequests";
import type { UserRecord } from "@/app/contracts/responses";
import type { Appearance } from "@/lib/appearance";
import { qk } from "../keys";
import { invalidationsFor } from "../invalidation";
import {
  appearanceUpdateBody,
  createAppearanceSaveTracker,
  setAppearanceOptions,
  type AppearanceVars,
} from "../appearance";
import { deferred, failResult, flush, okResult, testClient } from "./helpers";

/** RD-1 §7: the Appearance card's save (optimistic, rollback, last pick wins). */
const U = "u1";
const mockUpdate = () => vi.mocked(updateUser);
const LIGHT: Appearance = { theme: "classic", mode: "light" };
const DARK: Appearance = { theme: "classic", mode: "dark" };
const SYSTEM: Appearance = { theme: "classic", mode: "system" };

function setup(initial: Appearance = LIGHT) {
  const qc = testClient();
  qc.setQueryData(qk.profile(U), { user_id: U, theme: initial.mode, appTheme: initial.theme } as unknown as UserRecord);
  let context: Appearance = initial;
  const tracker = createAppearanceSaveTracker(initial);
  const options = setAppearanceOptions(qc, U, { tracker, show: (a) => (context = a) });
  const cached = () => {
    const u = qc.getQueryData<UserRecord>(qk.profile(U));
    return { theme: u?.appTheme, mode: u?.theme };
  };
  const shown = () => context;
  const pick = (next: Appearance, previous: Appearance) => {
    const m = new MutationObserver<void, unknown, AppearanceVars>(qc, options as never);
    return m.mutate({ next, previous }).catch(() => undefined);
  };
  return { qc, tracker, cached, shown, pick };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("appearanceUpdateBody", () => {
  it("sends only what changed: the mode as `theme`, the theme as `appTheme`", () => {
    expect(appearanceUpdateBody(LIGHT, DARK)).toEqual({ theme: "dark" });
    expect(appearanceUpdateBody(LIGHT, { theme: "field", mode: "light" })).toEqual({ appTheme: "field" });
    expect(appearanceUpdateBody(LIGHT, { theme: "calm", mode: "system" })).toEqual({ theme: "system", appTheme: "calm" });
  });
});

describe("useSetAppearance cache logic", () => {
  it("saves for the session user", async () => {
    const { pick } = setup();
    mockUpdate().mockResolvedValueOnce(okResult({}) as never);
    await pick(SYSTEM, LIGHT);
    expect(mockUpdate()).toHaveBeenCalledWith(U, { theme: "system" });
  });

  it("is optimistic: the pick shows at once in the context user and the profile cache", async () => {
    const { pick, cached, shown } = setup();
    const call = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockReturnValueOnce(call.promise as never);
    const done = pick(DARK, LIGHT);
    await flush();
    expect(shown()).toEqual(DARK);
    expect(cached()).toEqual(DARK);
    call.resolve(okResult({}));
    await done;
    expect(shown()).toEqual(DARK);
  });

  it("rolls back on error, in both places", async () => {
    const { pick, cached, shown, tracker } = setup(DARK);
    mockUpdate().mockResolvedValueOnce(failResult("network") as never);
    await pick(LIGHT, DARK);
    expect(shown()).toEqual(DARK);
    expect(cached()).toEqual(DARK);
    expect(tracker.shown()).toEqual(DARK);
  });

  it("last pick wins: two quick picks reach the server in order and the second stays", async () => {
    const { pick, shown, cached } = setup();
    const first = deferred<ReturnType<typeof okResult>>();
    const second = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockReturnValueOnce(first.promise as never).mockReturnValueOnce(second.promise as never);
    const a = pick(DARK, LIGHT);
    await flush();
    const b = pick(SYSTEM, DARK);
    await flush();
    expect(shown()).toEqual(SYSTEM);
    expect(mockUpdate()).toHaveBeenCalledTimes(1); // same scope: the second waits
    first.resolve(okResult({}));
    await flush();
    expect(mockUpdate().mock.calls[1][1]).toEqual({ theme: "system" });
    second.resolve(okResult({}));
    await Promise.all([a, b]);
    expect(shown()).toEqual(SYSTEM);
    expect(cached()).toEqual(SYSTEM);
  });

  it("an older pick failing while a newer one saves leaves the newer pick on screen", async () => {
    const { pick, shown } = setup();
    const second = deferred<ReturnType<typeof okResult>>();
    mockUpdate().mockResolvedValueOnce(failResult() as never).mockReturnValueOnce(second.promise as never);
    const a = pick(DARK, LIGHT);
    const b = pick(SYSTEM, DARK);
    await a;
    expect(shown()).toEqual(SYSTEM);
    second.resolve(okResult({}));
    await b;
    expect(shown()).toEqual(SYSTEM);
  });

  it("both picks failing goes back to what the server had", async () => {
    const { pick, shown, cached } = setup(LIGHT);
    mockUpdate().mockResolvedValueOnce(failResult() as never).mockResolvedValueOnce(failResult() as never);
    await Promise.all([pick(DARK, LIGHT), pick(SYSTEM, DARK)]);
    expect(shown()).toEqual(LIGHT);
    expect(cached()).toEqual(LIGHT);
  });

  it("the first pick saved, the second failed: back to the first", async () => {
    const { pick, shown } = setup(LIGHT);
    mockUpdate().mockResolvedValueOnce(okResult({}) as never).mockResolvedValueOnce(failResult() as never);
    await Promise.all([pick(DARK, LIGHT), pick(SYSTEM, DARK)]);
    expect(shown()).toEqual(DARK);
  });
});

describe("invalidation", () => {
  it("declares the profile as what an appearance save invalidates", () => {
    expect(invalidationsFor("appearance", U)).toEqual([qk.profile(U)]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../clientSession", () => ({ refreshSession: vi.fn() }));

import { refreshSession } from "../clientSession";
import { resumeConsentIfSignedIn } from "../resumeConsent";

const CONSENT = "/oauth/authorize?client_id=c&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&state=s";

function stubWindow(search: string) {
  const store = new Map<string, string>();
  const replace = vi.fn();
  vi.stubGlobal("window", {
    location: { search, replace },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  });
  return { replace };
}

beforeEach(() => vi.mocked(refreshSession).mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("resumeConsentIfSignedIn (cross-site arrival with SameSite=Strict cookies)", () => {
  it("a live session goes back to the consent page, once per next", async () => {
    const { replace } = stubWindow(`?next=${encodeURIComponent(CONSENT)}`);
    vi.mocked(refreshSession).mockResolvedValue("refreshed");
    expect(await resumeConsentIfSignedIn()).toBe(true);
    expect(refreshSession).toHaveBeenCalledWith(null);
    expect(replace).toHaveBeenCalledWith(CONSENT);
    // Sent back here again for the same request: stay on the login form (no bounce loop).
    expect(await resumeConsentIfSignedIn()).toBe(false);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("no session: stays on the login form", async () => {
    const { replace } = stubWindow(`?next=${encodeURIComponent(CONSENT)}`);
    vi.mocked(refreshSession).mockResolvedValue("invalid");
    expect(await resumeConsentIfSignedIn()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("no next, or a next that safeNext refuses: does nothing, not even a refresh", async () => {
    for (const search of ["", "?next=%2Fdashboard", `?next=${encodeURIComponent("//evil.com")}`]) {
      const { replace } = stubWindow(search);
      expect(await resumeConsentIfSignedIn()).toBe(false);
      expect(replace).not.toHaveBeenCalled();
    }
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

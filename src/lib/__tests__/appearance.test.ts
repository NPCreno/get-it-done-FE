import { describe, expect, it } from "vitest";
import {
  APPEARANCE_COOKIE,
  DEFAULT_APPEARANCE,
  ENABLED_THEMES,
  NO_FLASH_SCRIPT,
  appearanceCookieString,
  appearanceOf,
  appearanceStatusText,
  clearAppearanceCookieString,
  cookieChoice,
  cookieValue,
  currentAppearance,
  enabledTheme,
  htmlAttributes,
  isDemoPath,
  noFlash,
  htmlClassName,
  parseCookie,
  resolveMode,
  withCookieAppearance,
  type Appearance,
} from "../appearance";

/** RD-1 §7: appearance resolution, the cookie and the no-flash script. */
describe("appearanceOf", () => {
  it("defaults: no user or nothing chosen is Classic + light (today's look)", () => {
    expect(appearanceOf(null)).toEqual({ theme: "classic", mode: "light" });
    expect(appearanceOf(undefined)).toEqual({ theme: "classic", mode: "light" });
    expect(appearanceOf({ theme: null, appTheme: null })).toEqual({ theme: "classic", mode: "light" });
    expect(appearanceOf({})).toEqual({ theme: "classic", mode: "light" });
  });

  it("passes system and every known value through", () => {
    expect(appearanceOf({ theme: "system", appTheme: "calm" })).toEqual({ theme: "calm", mode: "system" });
    expect(appearanceOf({ theme: "dark", appTheme: "field" })).toEqual({ theme: "field", mode: "dark" });
  });

  it("an unknown value gives the defaults", () => {
    expect(appearanceOf({ theme: "neon", appTheme: "retro" })).toEqual({ theme: "classic", mode: "light" });
  });
});

describe("resolveMode", () => {
  it("light and dark are themselves; system follows the device", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
  });
});

describe("ENABLED_THEMES", () => {
  it("Classic only until plan 54 (decided 2026-11-29); a disabled theme falls back to Classic", () => {
    expect([...ENABLED_THEMES]).toEqual(["classic"]);
    expect(enabledTheme("classic")).toBe("classic");
    expect(enabledTheme("calm")).toBe("classic");
    expect(enabledTheme("field")).toBe("classic");
  });

  it("appearanceOf keeps the account's choice (Calm, Field notes); only a missing or unknown theme gives Classic", () => {
    expect(appearanceOf({ theme: "dark", appTheme: "field" })).toEqual({ theme: "field", mode: "dark" });
    expect(appearanceOf({ theme: "system", appTheme: "calm" })).toEqual({ theme: "calm", mode: "system" });
    expect(appearanceOf({ theme: null, appTheme: null })).toEqual({ theme: "classic", mode: "light" });
    expect(appearanceOf({ theme: "dark", appTheme: "neon" })).toEqual({ theme: "classic", mode: "dark" });
  });
});

describe("currentAppearance", () => {
  const base = { user: null, cookie: null, demo: false, prefersDark: false };

  it("a user's choice wins over the cookie", () => {
    const a = currentAppearance({ ...base, user: { theme: "dark" }, cookie: { theme: "classic", mode: "light" } });
    expect(a).toEqual({ theme: "classic", mode: "dark", resolvedMode: "dark", isDark: true });
  });

  it("before the user is known, the cookie decides (no flash after a reload)", () => {
    expect(currentAppearance({ ...base, cookie: { theme: "classic", mode: "dark" } }).isDark).toBe(true);
    expect(currentAppearance(base)).toEqual({ theme: "classic", mode: "light", resolvedMode: "light", isDark: false });
  });

  it("system follows the device", () => {
    expect(currentAppearance({ ...base, user: { theme: "system" }, prefersDark: true }).isDark).toBe(true);
    expect(currentAppearance({ ...base, user: { theme: "system" }, prefersDark: false }).isDark).toBe(false);
  });

  it("a disabled theme shows as Classic but keeps the chosen mode", () => {
    expect(currentAppearance({ ...base, user: { theme: "dark", appTheme: "field" } })).toMatchObject({ theme: "classic", mode: "dark", isDark: true });
    expect(currentAppearance({ ...base, user: { theme: "light", appTheme: "calm" } })).toMatchObject({ theme: "classic", mode: "light" });
  });

  it("/demo is always Classic + System, whoever is signed in", () => {
    const user = { theme: "dark", appTheme: "calm" };
    expect(currentAppearance({ ...base, user, demo: true, prefersDark: false })).toEqual({
      theme: "classic",
      mode: "system",
      resolvedMode: "light",
      isDark: false,
    });
    expect(currentAppearance({ ...base, user, demo: true, prefersDark: true }).isDark).toBe(true);
    expect(isDemoPath("/demo")).toBe(true);
    expect(isDemoPath("/demo/x")).toBe(true);
    expect(isDemoPath("/demonstration")).toBe(false);
    expect(isDemoPath("/dashboard")).toBe(false);
    expect(isDemoPath(null)).toBe(false);
  });
});

describe("cookieChoice and the JWT copy of the user", () => {
  it("remembers only a signed-in user's choice, never on /demo", () => {
    expect(cookieChoice({ user: { theme: "dark" }, demo: false })).toEqual({ theme: "classic", mode: "dark" });
    expect(cookieChoice({ user: null, demo: false })).toBeNull();
    expect(cookieChoice({ user: { theme: "dark" }, demo: true })).toBeNull();
  });

  it("the cookie replaces the token's (possibly older) appearance; without a cookie nothing changes", () => {
    const jwt = { user_id: "u1", theme: "light", appTheme: null };
    expect(withCookieAppearance(jwt, { theme: "classic", mode: "dark" })).toEqual({ user_id: "u1", theme: "dark", appTheme: "classic" });
    expect(withCookieAppearance(jwt, null)).toBe(jwt);
  });
});

describe("the gid_appearance cookie", () => {
  it("round trips every theme × mode", () => {
    for (const theme of ["classic", "calm", "field"] as const) {
      for (const mode of ["light", "dark", "system"] as const) {
        const a: Appearance = { theme, mode };
        expect(parseCookie(cookieValue(a))).toEqual(a);
      }
    }
    expect(cookieValue({ theme: "field", mode: "system" })).toBe("field.system");
  });

  it("a missing or bad cookie gives null (the caller uses the defaults)", () => {
    for (const bad of [undefined, null, "", "classic", "classic.", ".dark", "classic.dark.x", "neon.dark", "classic.dim", "CLASSIC.DARK"]) {
      expect(parseCookie(bad)).toBeNull();
    }
  });

  it("is a year-long, site-wide, Lax cookie, readable by the page (never HttpOnly)", () => {
    const s = appearanceCookieString({ theme: "classic", mode: "dark" });
    expect(s).toBe(`${APPEARANCE_COOKIE}=classic.dark; Path=/; Max-Age=31536000; SameSite=Lax`);
    expect(s).not.toMatch(/HttpOnly/i);
    expect(clearAppearanceCookieString()).toContain("Max-Age=0");
  });

  it("htmlAttributes: the server renders light for System (the script corrects it) and Classic for a disabled theme", () => {
    expect(htmlAttributes(DEFAULT_APPEARANCE)).toEqual({ "data-theme": "classic", "data-mode": "light", "data-pref": "light" });
    expect(htmlAttributes({ theme: "classic", mode: "dark" })).toMatchObject({ "data-mode": "dark" });
    expect(htmlAttributes({ theme: "calm", mode: "system" })).toEqual({ "data-theme": "classic", "data-mode": "light", "data-pref": "system" });
    expect(htmlAttributes({ theme: "field", mode: "dark" })).toEqual({ "data-theme": "classic", "data-mode": "dark", "data-pref": "dark" });
  });
});

/** A fake <html> and matchMedia for the inline script. */
function fakeDocument(attrs: Record<string, string>) {
  const a = { ...attrs };
  const classes = new Set<string>();
  const doc = {
    documentElement: {
      classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) },
      getAttribute: (k: string) => a[k] ?? null,
      setAttribute: (k: string, v: string) => {
        a[k] = v;
      },
    },
  } as unknown as Document;
  return { doc, attrs: a, classes };
}
const media = (dark: boolean) => (q: string) => ({ matches: q === "(prefers-color-scheme: dark)" && dark });

describe("the no-flash script", () => {
  it("System: sets data-mode from the device before first paint", () => {
    const dark = fakeDocument({ "data-theme": "classic", "data-mode": "light", "data-pref": "system" });
    noFlash(dark.doc, "/dashboard", media(true));
    expect(dark.attrs["data-mode"]).toBe("dark");
    const light = fakeDocument({ "data-mode": "light", "data-pref": "system" });
    noFlash(light.doc, "/dashboard", media(false));
    expect(light.attrs["data-mode"]).toBe("light");
  });

  it("keeps the `dark` class in step with data-mode (plan 52-3)", () => {
    const sys = fakeDocument({ "data-mode": "light", "data-pref": "system" });
    noFlash(sys.doc, "/dashboard", media(true));
    expect(sys.classes.has("dark")).toBe(true);
    const explicit = fakeDocument({ "data-mode": "light", "data-pref": "light" });
    noFlash(explicit.doc, "/dashboard", media(true));
    expect(explicit.classes.has("dark")).toBe(false);
    expect(htmlClassName("f", { "data-theme": "classic", "data-mode": "dark", "data-pref": "dark" })).toBe("f dark");
    expect(htmlClassName("f", { "data-theme": "classic", "data-mode": "light", "data-pref": "system" })).toBe("f");
  });

  it("an explicit mode is left as the server rendered it", () => {
    const f = fakeDocument({ "data-mode": "dark", "data-pref": "dark" });
    noFlash(f.doc, "/dashboard", media(false));
    expect(f.attrs["data-mode"]).toBe("dark");
  });

  it("/demo is Classic + System whatever the cookie said", () => {
    const f = fakeDocument({ "data-theme": "calm", "data-mode": "dark", "data-pref": "dark" });
    noFlash(f.doc, "/demo", media(false));
    expect(f.attrs).toMatchObject({ "data-theme": "classic", "data-pref": "system", "data-mode": "light" });
  });

  it("never throws (a broken matchMedia leaves the page alone)", () => {
    const f = fakeDocument({ "data-mode": "light", "data-pref": "system" });
    expect(() =>
      noFlash(f.doc, "/", () => {
        throw new Error("no matchMedia");
      })
    ).not.toThrow();
    expect(f.attrs["data-mode"]).toBe("light");
  });

  it("the inline source runs on its own with the real globals' shapes, and stays tiny", () => {
    const f = fakeDocument({ "data-mode": "light", "data-pref": "system" });
    const run = new Function("document", "location", "window", NO_FLASH_SCRIPT);
    run(f.doc, { pathname: "/dashboard" }, { matchMedia: media(true) });
    expect(f.attrs["data-mode"]).toBe("dark");
    expect(NO_FLASH_SCRIPT).not.toMatch(/\b(import|require)\b/);
    expect(NO_FLASH_SCRIPT.length).toBeLessThan(1200);
  });
});

describe("the Appearance card's status line", () => {
  it("says what was saved, and what it went back to on failure", () => {
    expect(appearanceStatusText({ kind: "idle" })).toBe("");
    expect(appearanceStatusText({ kind: "saving" })).toBe("Saving…");
    expect(appearanceStatusText({ kind: "saved", changed: "mode", appearance: { theme: "classic", mode: "dark" } })).toBe(
      "Saved. Dark mode is on."
    );
    expect(appearanceStatusText({ kind: "saved", changed: "theme", appearance: { theme: "field", mode: "light" } })).toBe(
      "Saved. Field notes is on."
    );
    expect(appearanceStatusText({ kind: "failed", changed: "mode", restored: { theme: "classic", mode: "light" } })).toBe(
      "Couldn’t save your appearance. It’s back to Light mode; try again."
    );
  });
});

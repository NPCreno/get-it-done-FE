import { APP_THEMES, narrow, THEMES, type AppTheme, type Theme } from "@/app/contracts/enums";

/**
 * RD-1 appearance (plan 51b §3). Pure: no React, no DOM. Two choices saved to the account:
 * - the theme (`users.appTheme`): Classic, Calm or Field notes; null = Classic;
 * - the mode (`users.theme`): light, dark or system; null = light (today's default).
 * `useAppearance()` is the only place components get them from.
 */
export type { AppTheme };
export type Mode = Theme;
export type ResolvedMode = "light" | "dark";

export interface Appearance {
  theme: AppTheme;
  mode: Mode;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "classic", mode: "light" };
/** /demo has no account: Classic, following the device. */
export const DEMO_APPEARANCE: Appearance = { theme: "classic", mode: "system" };

/**
 * The themes a user can pick today. Calm and Field notes stay "Coming soon" until roadmap
 * Phase 3, because most screens move to tokens only in Phase 2.
 */
export const ENABLED_THEMES: readonly AppTheme[] = ["classic"];

export const APP_THEME_NAMES: Record<AppTheme, string> = {
  classic: "Classic",
  calm: "Calm",
  field: "Field notes",
};

export const MODE_NAMES: Record<Mode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

type UserAppearanceFields = { theme?: string | null; appTheme?: string | null };

/**
 * The account's choices. Never chosen (null, missing) or an unknown value gives Classic and
 * light, today's look; `system` passes through.
 */
export function appearanceOf(user: UserAppearanceFields | null | undefined): Appearance {
  return {
    theme: narrow(APP_THEMES, user?.appTheme) ?? "classic",
    mode: narrow(THEMES, user?.theme) ?? "light",
  };
}

/** A theme that is not enabled yet shows as Classic. */
export function enabledTheme(theme: AppTheme): AppTheme {
  return ENABLED_THEMES.includes(theme) ? theme : "classic";
}

export function resolveMode(mode: Mode, prefersDark: boolean): ResolvedMode {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

/**
 * The JWT copy of the user (shown until the profile loads) can be older than the last saved
 * choice, so the cookie's appearance replaces its own. Without a cookie it is left as it is.
 */
export function withCookieAppearance<T extends UserAppearanceFields>(user: T, cookie: Appearance | null): T {
  return cookie ? { ...user, theme: cookie.mode, appTheme: cookie.theme } : user;
}

/** What components read: the theme on screen (enabled only), the chosen mode, and the result. */
export interface AppearanceState {
  theme: AppTheme;
  mode: Mode;
  resolvedMode: ResolvedMode;
  isDark: boolean;
}

export function isDemoPath(pathname: string | null | undefined): boolean {
  return pathname === "/demo" || !!pathname?.startsWith("/demo/");
}

/**
 * The one resolution rule. /demo is always Classic + System. Otherwise the signed-in user's
 * choice; before the user is known, the cookie (the last choice on this browser); else defaults.
 */
export function currentAppearance(input: {
  user: UserAppearanceFields | null | undefined;
  cookie: Appearance | null;
  demo: boolean;
  prefersDark: boolean;
  /** RD-2 dev theme preview (development builds only; see `previewOverride`). */
  preview?: PreviewOverride | null;
}): AppearanceState {
  const pref = input.demo ? DEMO_APPEARANCE : input.user ? appearanceOf(input.user) : (input.cookie ?? DEFAULT_APPEARANCE);
  const resolvedMode = input.preview?.mode ?? resolveMode(pref.mode, input.prefersDark);
  // The preview may show a theme that isn't enabled yet: that is its whole point.
  const theme = input.preview?.theme ?? enabledTheme(pref.theme);
  return { theme, mode: pref.mode, resolvedMode, isDark: resolvedMode === "dark" };
}

// ---------------------------------------------------------------- dev theme preview (RD-2)

/**
 * Plan 52-0 §4. In development only, `?theme=calm|field|classic` and `?mode=light|dark` on any URL
 * override the appearance for this tab (sessionStorage), so Calm and Field notes can be checked
 * before roadmap Phase 3 turns them on. Never saved to the account or the cookie. A production
 * build ignores it: `env` is `process.env.NODE_ENV`, inlined at build time.
 */
export interface PreviewOverride {
  theme?: AppTheme;
  mode?: ResolvedMode;
}

export const PREVIEW_STORAGE_KEY = "gid_theme_preview";
const RESOLVED_MODES = ["light", "dark"] as const;

/** The bits of `Storage` the preview uses (sessionStorage in the browser, a fake in tests). */
export interface PreviewStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function previewOf(theme: unknown, mode: unknown): PreviewOverride | null {
  const t = narrow(APP_THEMES, theme);
  const m = narrow(RESOLVED_MODES, mode);
  if (!t && !m) return null;
  return { ...(t ? { theme: t } : {}), ...(m ? { mode: m } : {}) };
}

/**
 * The preview for this tab, or null. A `theme`/`mode` query wins and is remembered in `storage`;
 * without one, the remembered preview applies. Pure apart from writing `storage`; never throws.
 */
export function previewOverride(search: string, storage: PreviewStorage | null, env: string | undefined): PreviewOverride | null {
  if (env === "production") return null;
  const q = new URLSearchParams(search);
  const fromQuery = previewOf(q.get("theme"), q.get("mode"));
  try {
    if (fromQuery) {
      storage?.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(fromQuery));
      return fromQuery;
    }
    const raw = storage?.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { theme?: unknown; mode?: unknown } | null;
    return saved ? previewOf(saved.theme, saved.mode) : null;
  } catch {
    return fromQuery;
  }
}

/** The chip's ×: forget the preview for this tab. */
export function clearPreview(storage: PreviewStorage | null): void {
  try {
    storage?.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** `search` without the preview's own parameters (so a reload after × stays cleared). */
export function searchWithoutPreview(search: string): string {
  const q = new URLSearchParams(search);
  q.delete("theme");
  q.delete("mode");
  const rest = q.toString();
  return rest ? `?${rest}` : "";
}

/** "Preview: Calm · Dark", from what is on screen. */
export function previewLabel(state: Pick<AppearanceState, "theme" | "resolvedMode">): string {
  return `Preview: ${APP_THEME_NAMES[state.theme]} · ${MODE_NAMES[state.resolvedMode]}`;
}

/** The account's choice to remember in the cookie, or null when there is nothing to remember. */
export function cookieChoice(input: { user: UserAppearanceFields | null | undefined; demo: boolean }): Appearance | null {
  return input.demo || !input.user ? null : appearanceOf(input.user);
}

// ---------------------------------------------------------------- Appearance card status line

/** What the Appearance card's status line says. `changed` is what the latest pick changed. */
export type AppearanceStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; changed: "theme" | "mode"; appearance: Appearance }
  | { kind: "failed"; changed: "theme" | "mode"; restored: Appearance };

export function appearanceStatusText(status: AppearanceStatus): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "saving":
      return "Saving…";
    case "saved":
      return status.changed === "theme"
        ? `Saved. ${APP_THEME_NAMES[status.appearance.theme]} is on.`
        : `Saved. ${MODE_NAMES[status.appearance.mode]} mode is on.`;
    case "failed": {
      const back =
        status.changed === "theme" ? APP_THEME_NAMES[status.restored.theme] : `${MODE_NAMES[status.restored.mode]} mode`;
      return `Couldn’t save your appearance. It’s back to ${back}; try again.`;
    }
  }
}

// ---------------------------------------------------------------- cookie

/**
 * `gid_appearance=<theme>.<mode>`: a display preference, nothing secret, so readable by the
 * page (not HttpOnly). The root layout reads it to render `<html data-theme data-mode>` on the
 * server, so a dark user never sees a light first frame.
 */
export const APPEARANCE_COOKIE = "gid_appearance";
export const APPEARANCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function cookieValue({ theme, mode }: Appearance): string {
  return `${theme}.${mode}`;
}

/** A missing or malformed cookie gives null (the caller uses the defaults). */
export function parseCookie(value: string | null | undefined): Appearance | null {
  if (typeof value !== "string") return null;
  const [t, m, extra] = value.split(".");
  if (extra !== undefined) return null;
  const theme = narrow(APP_THEMES, t);
  const mode = narrow(THEMES, m);
  return theme && mode ? { theme, mode } : null;
}

/** The `Set-Cookie`/`document.cookie` string that stores the choice for a year. */
export function appearanceCookieString(a: Appearance): string {
  return `${APPEARANCE_COOKIE}=${cookieValue(a)}; Path=/; Max-Age=${APPEARANCE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAppearanceCookieString(): string {
  return `${APPEARANCE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * What `<html>` carries. `data-pref` is the chosen mode (so the inline script can resolve
 * `system`); `data-mode` is the resolved one the tokens key on.
 * No `dark` class: nothing sets it today, so the few `dark:` utilities and shadcn's `.dark`
 * variables are inactive; turning them on would restyle dark screens (calendar, menus, chart
 * tooltips, the task modal). Phase 2 can enable it deliberately.
 */
export interface HtmlAppearance {
  "data-theme": AppTheme;
  "data-mode": ResolvedMode;
  "data-pref": Mode;
}

/**
 * The server-rendered `<html>` attributes. For `system` the server cannot know the device, so it
 * renders light and the inline script (`noFlash`) corrects it before first paint.
 */
export function htmlAttributes(a: Appearance, prefersDark = false): HtmlAppearance {
  return {
    "data-theme": enabledTheme(a.theme),
    "data-mode": resolveMode(a.mode, prefersDark),
    "data-pref": a.mode,
  };
}

// ---------------------------------------------------------------- no-flash script

/**
 * Runs in `<head>` before first paint and only matters for System (and /demo, which is always
 * Classic + System): sets `data-mode` from the device setting. Tiny, no imports, never throws.
 * Exported as a function so a test can run it with a fake `document`, `location` and `matchMedia`.
 * SEC-10 (CSP) will need a nonce or a hash for this inline script.
 */
export function noFlash(d: Document, path: string, mm: (q: string) => { matches: boolean }): void {
  try {
    var h = d.documentElement; // eslint-disable-line no-var
    if (path === "/demo" || path.indexOf("/demo/") === 0) {
      h.setAttribute("data-theme", "classic");
      h.setAttribute("data-pref", "system");
    }
    if (h.getAttribute("data-pref") !== "system") return;
    h.setAttribute("data-mode", mm("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch {
    /* never block the page */
  }
}

/** The inline `<script>` body: the function above, called with the real globals. */
export const NO_FLASH_SCRIPT = `(${noFlash.toString()})(document,location.pathname,function(q){return window.matchMedia(q)})`;

import type { AppTheme } from "@/lib/appearance";

/**
 * RD-3 (plan 53b §3) wordmark classes per theme and place. Kept under `src/app` so Tailwind's scan sees them.
 * Classic is today's Rancho "Get it Done!" in each place, exactly; Calm is "Get It Done" in Poppins 600 with
 * "Done" in Rancho on the accent text (board 20); Field notes is "get it done" in Manrope 800, lowercase (board 18).
 */
export type WordmarkPlace = "sidebar" | "drawer" | "auth" | "loader";

export interface WordmarkClasses {
  /** The element's own classes (font, size, colour). */
  root: string;
  /** Calm's "Done" (Rancho on the accent text); null where the theme has no accent word. */
  accent: string | null;
}

const CALM_BASE = "font-poppins font-semibold tracking-[-.01em] whitespace-nowrap leading-none";
const FIELD_BASE = "font-manrope font-extrabold lowercase whitespace-nowrap leading-none";
/** Calm's "Done": Rancho at 1.27× the words around it (22 → 28 px on board 20). */
const CALM_ACCENT = "font-rancho font-normal text-[1.27em] text-th-acc-t";

const CLASSES: Record<AppTheme, Record<WordmarkPlace, WordmarkClasses>> = {
  classic: {
    sidebar: { root: "text-2xl text-th-acc font-rancho", accent: null },
    drawer: { root: "text-2xl text-th-acc font-rancho", accent: null },
    // The auth panel sets the colour (`text-th-auth-ink`), as today.
    auth: { root: "text-2xl font-rancho", accent: null },
    loader: { root: "font-rancho text-[30px] md:text-[36px] leading-none tracking-[.01em] text-th-acc-t", accent: null },
  },
  calm: {
    sidebar: { root: `${CALM_BASE} self-center text-[19px] text-th-ink`, accent: CALM_ACCENT },
    drawer: { root: `${CALM_BASE} self-center text-[19px] text-th-ink`, accent: CALM_ACCENT },
    auth: { root: `${CALM_BASE} text-[19px]`, accent: CALM_ACCENT },
    loader: { root: `${CALM_BASE} text-[22px] text-th-ink`, accent: CALM_ACCENT },
  },
  field: {
    sidebar: { root: `${FIELD_BASE} self-center text-[18px] tracking-[-.03em] text-th-ink`, accent: null },
    drawer: { root: `${FIELD_BASE} self-center text-[18px] tracking-[-.03em] text-th-ink`, accent: null },
    auth: { root: `${FIELD_BASE} text-[18px] tracking-[-.03em]`, accent: null },
    loader: { root: `${FIELD_BASE} text-[34px] tracking-[-.04em] text-th-ink`, accent: null },
  },
};

export function wordmarkClasses(theme: AppTheme, place: WordmarkPlace): WordmarkClasses {
  return CLASSES[theme][place];
}

/** The visible text per theme; the accessible name is always WORDMARK_NAME. */
export const WORDMARK_TEXT: Record<AppTheme, string> = {
  classic: "Get it Done!",
  calm: "Get It Done",
  field: "get it done",
};

export const WORDMARK_NAME = "Get It Done";

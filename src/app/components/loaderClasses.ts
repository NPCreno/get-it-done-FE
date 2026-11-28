/**
 * Class strings for the full-page loader (UX-04, design canvas page "Full-page loader").
 * Kept here, under `src/app`, so Tailwind's content scan sees every class. RD-2 (52-4): colours are theme
 * tokens (board 16), so the loader takes no `dark` and still reads no context.
 */

export type LoaderVariant = "page" | "inline";

export interface LoaderClassOptions {
  leaving?: boolean;
  variant?: LoaderVariant;
}

export interface LoaderClasses {
  /** The `role="status"` element. */
  root: string;
  /** Tile and wordmark together: the enter animation. */
  group: string;
  tile: string;
  mark: string;
  /** The logo ring. With reduced motion it is the full amber ring. */
  track: string;
  /** The turning quarter arc. Hidden with reduced motion. */
  arc: string;
  ticks: string;
  /** `null` for the inline variant, which has no wordmark. */
  word: string | null;
}

/** Enter: 150 ms delay (built into the animation, keeps fast loads from flashing), then 100 ms (UX-05). Opacity only with reduced motion. */
export const LOADER_ENTER = "motion-safe:animate-loader-in motion-reduce:animate-loader-fade-in";
/** Exit: fades and lifts 4 px in 90 ms, or fades in 60 ms with reduced motion (UX-05). */
export const LOADER_LEAVE =
  "motion-safe:animate-loader-out motion-reduce:animate-loader-fade-out pointer-events-none";
/** The view root while the loader leaves: rises 8 px in 120 ms after 40 ms, or fades in 80 ms (UX-05). */
export const PAGE_IN_CLASS = "motion-safe:animate-page-in motion-reduce:animate-page-fade-in";

export function loaderClasses({ leaving = false, variant = "page" }: LoaderClassOptions = {}): LoaderClasses {
  const page = variant === "page";
  const root = page
    ? // Positioned against MainLayout's scroll box (or the demo's <main>): the sidebar never blinks.
      `absolute inset-0 z-0 flex flex-col items-center justify-center pb-[8%] bg-th-page${leaving ? ` ${LOADER_LEAVE}` : ""}`
    : "flex justify-center py-16";

  return {
    root,
    group: `flex flex-col items-center gap-4 ${LOADER_ENTER}`,
    tile: "grid place-items-center size-16 md:size-[72px] rounded-[18px] md:rounded-[20px] border motion-reduce:animate-loader-breathe bg-th-card border-th-line",
    mark: "size-[42px] md:size-12 overflow-visible",
    track: "fill-none stroke-th-acc-sub motion-reduce:stroke-th-acc",
    arc: "fill-none stroke-th-acc [transform-origin:15px_15px] [transform:rotate(-90deg)] motion-safe:animate-loader-arc motion-reduce:hidden",
    ticks: "fill-none stroke-th-acc",
    word: page
      ? "font-rancho text-[30px] md:text-[36px] leading-none tracking-[.01em] text-th-acc-t"
      : null,
  };
}

// ---------------------------------------------------------------- RD-3 theme loaders (plan 53b §2, board 20)

/**
 * Calm: a green check disc (`--ok`, `--on-ok` check) with two rings rippling out, 0.8 s apart. With reduced
 * motion the rings are gone and the disc breathes.
 */
export const CALM_LOADER = {
  mark: "relative size-16",
  ripple: "absolute inset-0 rounded-full border-2 border-th-ok opacity-0 motion-safe:animate-calm-ripple motion-reduce:hidden",
  /** The second ring starts half a loop later. */
  rippleLate: "[animation-delay:800ms]",
  core: "absolute inset-0 grid place-items-center rounded-full bg-th-ok text-th-on-ok motion-reduce:animate-loader-breathe",
  check: "size-7",
} as const;

/**
 * Field notes: the lowercase wordmark with a 200 × 4 px pen stroke under it (`--acc-sub` track, `--acc` stroke,
 * `--hi` tip) sweeping left to right. With reduced motion the stroke is parked under the word and the word
 * breathes (the inline variant, which has no word, breathes the track).
 */
export const FIELD_LOADER = {
  track: "relative block w-[200px] h-1 rounded-full bg-th-acc-sub overflow-hidden",
  trackInline: "motion-reduce:animate-loader-breathe",
  stroke: "absolute inset-y-0 left-[35%] w-[30%] rounded-full bg-th-acc motion-safe:animate-field-sweep",
  tip: "absolute -right-0.5 -top-px size-1.5 rounded-full bg-th-hi",
  word: "motion-reduce:animate-loader-breathe",
} as const;

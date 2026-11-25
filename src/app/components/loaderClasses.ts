/**
 * Class strings for the full-page loader (UX-04, design canvas page "Full-page loader").
 * Kept here, under `src/app`, so Tailwind's content scan sees every class.
 */

export type LoaderVariant = "page" | "inline";

export interface LoaderClassOptions {
  dark?: boolean;
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

export function loaderClasses({ dark = false, leaving = false, variant = "page" }: LoaderClassOptions = {}): LoaderClasses {
  const page = variant === "page";
  const root = page
    ? // Positioned against MainLayout's scroll box (or the demo's <main>): the sidebar never blinks.
      `absolute inset-0 z-0 flex flex-col items-center justify-center pb-[8%] ${
        dark ? "bg-background-dark" : "bg-background-light"
      }${leaving ? ` ${LOADER_LEAVE}` : ""}`
    : "flex justify-center py-16";

  return {
    root,
    group: `flex flex-col items-center gap-4 ${LOADER_ENTER}`,
    tile: `grid place-items-center size-16 md:size-[72px] rounded-[18px] md:rounded-[20px] border motion-reduce:animate-loader-breathe ${
      dark ? "bg-foreground-dark border-gray-800" : "bg-white border-[#E0E0E0]"
    }`,
    mark: "size-[42px] md:size-12 overflow-visible",
    track: `fill-none ${dark ? "stroke-primary-700" : "stroke-primary-100"} motion-reduce:stroke-primary-default`,
    arc: "fill-none stroke-primary-default [transform-origin:15px_15px] [transform:rotate(-90deg)] motion-safe:animate-loader-arc motion-reduce:hidden",
    ticks: "fill-none stroke-primary-default",
    word: page
      ? `font-rancho text-[30px] md:text-[36px] leading-none tracking-[.01em] ${
          dark ? "text-primary-default" : "text-primary-600"
        }`
      : null,
  };
}

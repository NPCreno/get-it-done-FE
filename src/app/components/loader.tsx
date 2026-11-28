"use client";
import { useNextFrame } from "@/lib/useTicker";
import { useAppearance } from "@/hooks/useAppearance";
import type { AppTheme } from "@/lib/appearance";
import { CALM_LOADER, FIELD_LOADER, loaderClasses } from "./loaderClasses";
import type { LoaderVariant } from "./loaderClasses";
import { ThemeWordmarkView } from "./brand/ThemeWordmark";

// The sidebar logo's ticks (Sidebar.tsx, MobileSidebar.tsx), viewBox 0 0 30 30.
const TICKS = "M21.5624 11.2517L15.0075 18.7517L12.198 15.9392M11.247 18.7517L8.4374 15.9392M17.9126 11.2517L14.8921 14.7087";

/**
 * RD-3 (plan 53b §2, board 20): each theme's loader mark, inside the shared UX-04 frame (`LoaderView`).
 * Classic: the logo tile with one arc turning round its ring, and the Rancho wordmark (UX-04, unchanged).
 * Calm: a green check disc with two rings rippling out, and Calm's wordmark.
 * Field notes: the lowercase wordmark with a pen stroke sweeping under it.
 * `inline` is the mark alone (no wordmark). Pure: the theme is a prop.
 */
export function ThemeLoaderMark({ theme, variant = "page" }: { theme: AppTheme; variant?: LoaderVariant }) {
  const c = loaderClasses({ variant });
  const withWord = variant === "page";

  if (theme === "calm") {
    return (
      <>
        <span className={CALM_LOADER.mark}>
          <span className={CALM_LOADER.ripple} />
          <span className={`${CALM_LOADER.ripple} ${CALM_LOADER.rippleLate}`} />
          <span className={CALM_LOADER.core}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={CALM_LOADER.check}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </span>
        {withWord && <ThemeWordmarkView theme="calm" place="loader" as="p" />}
      </>
    );
  }

  if (theme === "field") {
    return (
      <>
        {withWord && <ThemeWordmarkView theme="field" place="loader" as="p" className={FIELD_LOADER.word} />}
        <span className={withWord ? FIELD_LOADER.track : `${FIELD_LOADER.track} ${FIELD_LOADER.trackInline}`}>
          <span className={FIELD_LOADER.stroke}>
            <span className={FIELD_LOADER.tip} />
          </span>
        </span>
      </>
    );
  }

  return (
    <>
      <span className={c.tile}>
        <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={c.mark}>
          <circle cx="15" cy="15" r="11.25" strokeWidth={2.4} className={c.track} />
          <circle
            cx="15"
            cy="15"
            r="11.25"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray="18 70.69"
            className={c.arc}
          />
          <path d={TICKS} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={c.ticks} />
        </svg>
      </span>
      {c.word && <p className={c.word}>Get it Done!</p>}
    </>
  );
}

/**
 * The full-page loader (UX-04) for a given theme: one `role="status"` that says "Loading", the mark hidden
 * from screen readers, and the shared enter/leave hand-off (150 ms show delay, UX-05 timings).
 * `variant="page"` is an overlay (`absolute inset-0`) over the page, shown for a page's first load only
 * (`useFirstLoad` + `usePresence`); `variant="inline"` is the mark alone, in the flow.
 */
export function LoaderView({ theme, leaving = false, variant = "page" }: { theme: AppTheme; leaving?: boolean; variant?: LoaderVariant }) {
  const c = loaderClasses({ leaving, variant });
  // Mounted empty and filled a frame later, so screen readers announce it.
  const textReady = useNextFrame(true);

  return (
    <div role="status" aria-hidden={leaving ? true : undefined} className={c.root}>
      <span className="sr-only">{textReady ? "Loading" : ""}</span>
      <div aria-hidden="true" className={c.group}>
        <ThemeLoaderMark theme={theme} variant={variant} />
      </div>
    </div>
  );
}

/** The loader in the theme on screen (`useAppearance()`; /demo is always Classic). */
export default function LoadingPage({ leaving = false, variant = "page" }: { leaving?: boolean; variant?: LoaderVariant }) {
  const { theme } = useAppearance();
  return <LoaderView theme={theme} leaving={leaving} variant={variant} />;
}

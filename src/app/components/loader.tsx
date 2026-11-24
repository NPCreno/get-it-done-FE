"use client";
import { useNextFrame } from "@/lib/useTicker";
import { loaderClasses } from "./loaderClasses";
import type { LoaderVariant } from "./loaderClasses";

// The sidebar logo's ticks (Sidebar.tsx, MobileSidebar.tsx), viewBox 0 0 30 30.
const TICKS = "M21.5624 11.2517L15.0075 18.7517L12.198 15.9392M11.247 18.7517L8.4374 15.9392M17.9126 11.2517L14.8921 14.7087";

/**
 * The full-page loader (UX-04): the app's logo on a tile, with one amber arc turning round its
 * ring, and the wordmark. `variant="page"` is an overlay (`absolute inset-0`) over the page,
 * shown for a page's first load only (`useFirstLoad` + `usePresence`); `variant="inline"` is the
 * tile alone, in the flow. It reads no context, so `/demo` can use it.
 */
export default function LoadingPage({
  dark = false,
  leaving = false,
  variant = "page",
}: {
  dark?: boolean;
  leaving?: boolean;
  variant?: LoaderVariant;
}) {
  const c = loaderClasses({ dark, leaving, variant });
  // Mounted empty and filled a frame later, so screen readers announce it.
  const textReady = useNextFrame(true);

  return (
    <div role="status" aria-hidden={leaving ? true : undefined} className={c.root}>
      <span className="sr-only">{textReady ? "Loading" : ""}</span>
      <div aria-hidden="true" className={c.group}>
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
      </div>
    </div>
  );
}

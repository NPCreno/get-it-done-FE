"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENABLED_THEMES, isDemoPath } from "@/lib/appearance";
import { markNewLooksSeen, takeNewLooksTurn } from "@/lib/newLooks";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * RD-3 (plan 53b §4): a dismissible card on the dashboard announcing the themes, shown once per device
 * (`src/lib/newLooks.ts`), never in /demo, and only once at least two themes are enabled (not before plan 54).
 * A card in the page, not a modal; colours are tokens.
 */
export default function NewLooksCard() {
  const demo = isDemoPath(usePathname());
  const [show, setShow] = useState(false);
  const decided = useRef(false);
  const titleId = useId();

  // Decided once, after mount (localStorage is browser-only, so the server never renders the card).
  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    if (takeNewLooksTurn(browserStorage(), demo, ENABLED_THEMES.length)) setShow(true);
  }, [demo]);

  if (!show) return null;

  const dismiss = () => {
    markNewLooksSeen(browserStorage());
    setShow(false);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-card border border-th-line bg-th-card text-th-ink font-ui"
    >
      <div className="flex flex-col gap-1 text-start">
        <h2 id={titleId} className="text-base font-bold text-th-ink-hd">
          New: pick a look.
        </h2>
        <p className="text-sm text-th-ink-sub">Classic, Calm or Field notes, in light or dark.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/profileSettings#appearance"
          onClick={dismiss}
          className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-btn bg-th-acc text-th-on-acc text-sm font-bold
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 ring-offset-[var(--card)]"
        >
          Open Appearance
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-btn border border-th-line-acc text-th-btn2-t text-sm font-bold hover:bg-th-btn2-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 ring-offset-[var(--card)]"
        >
          Not now
        </button>
      </div>
    </section>
  );
}

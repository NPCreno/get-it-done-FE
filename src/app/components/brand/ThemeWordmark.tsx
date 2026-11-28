"use client";
import { useAppearance } from "@/hooks/useAppearance";
import type { AppTheme } from "@/lib/appearance";
import { WORDMARK_NAME, WORDMARK_TEXT, wordmarkClasses, type WordmarkPlace } from "./wordmarkClasses";

interface WordmarkProps {
  place: WordmarkPlace;
  /** The element: the sidebar and drawer titles are headings (`h1`), the loader's is a `p`. */
  as?: "h1" | "p" | "span";
  /** Extra classes from the caller (layout, transitions); never colours or fonts. */
  className?: string;
}

/**
 * RD-3 (plan 53b §3): the wordmark for one theme. Pure, for tests and for callers that already know the theme.
 * The visible text differs per theme, so screen readers get one fixed name ("Get It Done") and the visible
 * letters are hidden from them.
 */
export function ThemeWordmarkView({ theme, place, as: Tag = "span", className = "" }: WordmarkProps & { theme: AppTheme }) {
  const c = wordmarkClasses(theme, place);
  const visible = c.accent ? (
    <>
      Get It <span className={c.accent}>Done</span>
    </>
  ) : (
    WORDMARK_TEXT[theme]
  );
  return (
    <Tag className={`${c.root} ${className}`.trim()}>
      <span className="sr-only">{WORDMARK_NAME}</span>
      <span aria-hidden="true">{visible}</span>
    </Tag>
  );
}

/** The wordmark in the theme on screen (`useAppearance()`). */
export default function ThemeWordmark(props: WordmarkProps) {
  const { theme } = useAppearance();
  return <ThemeWordmarkView theme={theme} {...props} />;
}

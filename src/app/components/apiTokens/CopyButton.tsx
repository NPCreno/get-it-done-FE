"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

interface CopyButtonProps {
  /** The exact text to copy. */
  text: string;
  /** What is copied, for the accessible name: "Copy the token". */
  what: string;
  /** The element showing the text. If the clipboard is refused, its text is selected instead. */
  target: RefObject<HTMLElement | null>;
  dark?: boolean;
}

const RESET_MS = 2000;

/** Selects the text of an input, a textarea or any element, so the user can copy it by hand. */
function selectText(el: HTMLElement | null): void {
  if (!el) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.select();
    return;
  }
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Copies with the async clipboard API and shows "Copied", also announced through a live region.
 * If the clipboard is unavailable or refused, it selects the text and says how to copy it.
 * It never logs the text (it may be a token).
 */
export default function CopyButton({ text, what, target, dark }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setNote("Copied");
      timer.current = setTimeout(() => {
        setCopied(false);
        setNote("");
      }, RESET_MS);
    } catch {
      setCopied(false);
      selectText(target.current);
      setNote("Couldn't copy automatically. The text is selected: press Ctrl+C (⌘C on a Mac) to copy it.");
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? `${what} copied` : `Copy ${what}`}
        className={`rounded-[5px] border px-3 py-1 font-lato text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2 ${
          copied ? "border-green-600 text-green-600" : `border-primary-200 text-primary-default ${dark ? "bg-transparent" : "bg-white"}`
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <span role="status" aria-live="polite" aria-atomic="true" className={copied || !note ? "sr-only" : `font-lato text-xs ${dark ? "text-gray-300" : "text-[#676767]"}`}>
        {note}
      </span>
    </span>
  );
}

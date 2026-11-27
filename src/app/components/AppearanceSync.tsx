"use client";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useFormState } from "@/app/context/FormProvider";
import { AppearanceContext, useAppearance } from "@/hooks/useAppearance";
import ThemePreviewChip from "./ThemePreviewChip";
import {
  appearanceCookieString,
  cookieChoice,
  cookieValue,
  isDemoPath,
  type Appearance,
} from "@/lib/appearance";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribePrefersDark(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const prefersDarkNow = () => window.matchMedia(DARK_QUERY).matches;
// The server and the hydration pass render light; System dark corrects itself right after.
const prefersDarkOnServer = () => false;

/**
 * RD-1 (plan 51b §3). In the root layout, inside FormProvider. Provides the cookie's appearance
 * (read by the server layout) and the device setting to `useAppearance()`, and keeps `<html>`
 * (`data-theme`, `data-mode`, `data-pref`) and the `gid_appearance` cookie in step with it.
 */
export default function AppearanceSync({ initialCookie, children }: { initialCookie: Appearance | null; children: ReactNode }) {
  const [cookie, setCookie] = useState(initialCookie);
  const prefersDark = useSyncExternalStore(subscribePrefersDark, prefersDarkNow, prefersDarkOnServer);
  const value = useMemo(() => ({ cookie, prefersDark }), [cookie, prefersDark]);
  return (
    <AppearanceContext.Provider value={value}>
      <ApplyAppearance onCookie={setCookie} />
      {/* RD-2 dev theme preview: development builds only. */}
      {process.env.NODE_ENV !== "production" && <ThemePreviewChip />}
      {children}
    </AppearanceContext.Provider>
  );
}

function ApplyAppearance({ onCookie }: { onCookie: (a: Appearance) => void }) {
  const { theme, mode, resolvedMode } = useAppearance();
  const { userData } = useFormState();
  const demo = isDemoPath(usePathname());

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    html.setAttribute("data-mode", resolvedMode);
    html.setAttribute("data-pref", mode);
  }, [theme, mode, resolvedMode]);

  // Remember the account's choice on this browser, so the next first paint is already right.
  const choice = cookieChoice({ user: userData, demo });
  const choiceKey = choice ? cookieValue(choice) : null;
  useEffect(() => {
    if (!choice) return;
    document.cookie = appearanceCookieString(choice);
    onCookie(choice);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choiceKey is choice's identity
  }, [choiceKey, onCookie]);

  return null;
}

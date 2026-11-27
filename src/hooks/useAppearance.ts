"use client";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useFormState } from "@/app/context/FormProvider";
import { currentAppearance, isDemoPath, type Appearance, type AppearanceState } from "@/lib/appearance";
import { getPreview, getServerPreview, subscribePreview } from "@/lib/themePreview";

/**
 * RD-1: what the root layout knows about appearance before any user loads. `cookie` is the last
 * choice on this browser (the `gid_appearance` cookie, kept current by AppearanceSync);
 * `prefersDark` is the device setting (false on the server and during hydration).
 */
export interface AppearanceContextValue {
  cookie: Appearance | null;
  prefersDark: boolean;
}

export const AppearanceContext = createContext<AppearanceContextValue>({ cookie: null, prefersDark: false });

/**
 * The only source of theme and mode for components (`isDark` replaces every
 * hand-written dark check on the user). Follows the device live when the mode is System.
 * RD-2: in development, a `?theme=`/`?mode=` preview overrides it for the tab (never in production).
 */
export function useAppearance(): AppearanceState {
  const { userData } = useFormState();
  const { cookie, prefersDark } = useContext(AppearanceContext);
  const demo = isDemoPath(usePathname());
  // Only the appearance fields matter, so a profile refetch with other changes re-renders nothing here.
  const hasUser = !!userData;
  const theme = userData?.theme;
  const appTheme = userData?.appTheme;
  const preview = useSyncExternalStore(subscribePreview, getPreview, getServerPreview);
  return useMemo(
    () => currentAppearance({ user: hasUser ? { theme, appTheme } : null, cookie, demo, prefersDark, preview }),
    [hasUser, theme, appTheme, cookie, demo, prefersDark, preview]
  );
}

/** The cookie's appearance, for seeding the JWT copy of the user (MainLayout). */
export function useAppearanceCookie(): Appearance | null {
  return useContext(AppearanceContext).cookie;
}

"use client";
import { useId } from "react";
import { AlertCircle, Check, Monitor, Moon, Sun } from "lucide-react";
import { APP_THEMES, THEMES, type AppTheme } from "@/app/contracts/enums";
import PomodoroStylePicker from "@/app/components/pomodoro/PomodoroStylePicker";
import { useAppearance } from "@/hooks/useAppearance";
import {
  APP_THEME_NAMES,
  ENABLED_THEMES,
  MODE_NAMES,
  appearanceStatusText,
  enabledTheme,
  type Mode,
  type ResolvedMode,
} from "@/lib/appearance";
import { useSetAppearance } from "@/lib/query/mutations";

const MODE_ICONS: Record<Mode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/**
 * RD-1 Profile → Appearance (canvas board 20). Two real radio groups (native radios: arrow keys
 * move and select; a disabled theme is skipped), then the Pomodoro timer picker (FEAT-10).
 * Saves on change with `useSetAppearance`, apart from the Profile form: the radios have names the
 * form never reads. Calm and Field notes show "Coming soon" until they are in ENABLED_THEMES.
 */
export default function AppearanceCard() {
  const { resolvedMode } = useAppearance();
  const { appearance, pick, status } = useSetAppearance();
  const shownTheme = enabledTheme(appearance.theme);
  const themeName = useId();
  const modeName = useId();
  const statusColour =
    status.kind === "saved"
      ? "text-th-ok-t"
      : status.kind === "failed"
        ? "text-th-err-t"
        : "text-th-ink2";

  return (
    <section
      aria-labelledby={`${themeName}-title`}
      className={`flex flex-col gap-5 p-5 rounded-[10px] bg-th-card [border-width:var(--edge-w)] border-th-line`}
    >
      <div className="flex flex-col">
        <h2 id={`${themeName}-title`} className="font-lato text-2xl text-th-acc-t fade-in-delay-1 select-none">
          Appearance
        </h2>
        <p className="font-lato text-[13px] text-th-ink fade-in-delay-1 select-none">
          Changes apply right away and follow you to every device.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2 border-0 m-0 p-0 min-w-0">
        <legend className="p-0 mb-2 font-lato text-[15px] font-black leading-5 text-th-ink">Theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {APP_THEMES.map((t) => {
            const enabled = ENABLED_THEMES.includes(t);
            const on = t === shownTheme;
            return (
              <label
                key={t}
                aria-disabled={enabled ? undefined : true}
                className={`relative flex flex-col gap-2 min-w-0 rounded-[calc(var(--r-card)/1.5)] font-lato
                  has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-th-focus
                  ${enabled ? "cursor-pointer" : "cursor-not-allowed"}
                  ${on ? "border-2 border-th-acc-t bg-th-acc-sub p-[5px] pb-[9px]" : "border border-th-line p-1.5 pb-2.5"}`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={themeName}
                  value={t}
                  checked={on}
                  disabled={!enabled}
                  onChange={() => pick({ theme: t, mode: appearance.mode })}
                />
                <ThemePreview theme={t} mode={resolvedMode} />
                <span className="flex flex-col min-w-0 px-1">
                  <span className={`text-sm font-black leading-[18px] ${enabled ? "text-th-ink" : "text-th-ink2"}`}>
                    {APP_THEME_NAMES[t]}
                  </span>
                  {!enabled && <span className="text-xs leading-4 text-th-ink2">Coming soon</span>}
                </span>
                {/* The radio dot sits on the preview's corner: the tiles are narrow in the Profile column. */}
                {enabled && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-2 right-2 grid place-items-center size-[18px] rounded-full border-2 bg-th-card ${on ? "border-th-acc-t" : "border-th-ink2"}`}
                  >
                    {on && <span className="size-2 rounded-full bg-th-acc-t" />}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col border-0 m-0 p-0 min-w-0">
        <legend className="p-0 mb-2 font-lato text-[15px] font-black leading-5 text-th-ink">Mode</legend>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-[8px] bg-th-page">
          {THEMES.map((m) => {
            const on = m === appearance.mode;
            const Icon = MODE_ICONS[m];
            return (
              <label
                key={m}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-ctl cursor-pointer font-lato text-sm font-bold leading-none
                  has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-th-focus
                  ${on ? "bg-th-card text-th-ink shadow-[0_0_0_1px_var(--line)]" : "text-th-ink2"}`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={modeName}
                  value={m}
                  checked={on}
                  onChange={() => pick({ theme: appearance.theme, mode: m })}
                />
                <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
                {MODE_NAMES[m]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p role="status" className={`flex items-center gap-1.5 min-h-[18px] -mt-2 font-lato text-[13px] font-bold leading-[18px] ${statusColour}`}>
        {status.kind === "saving" && (
          <span aria-hidden="true" className="size-3 rounded-full border-2 border-th-line border-t-th-ink2 motion-safe:animate-spin" />
        )}
        {status.kind === "saved" && <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        {status.kind === "failed" && <AlertCircle aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        {appearanceStatusText(status)}
      </p>

      <div className="pt-4 border-t border-th-line">
        {/* FEAT-10: saves on change, apart from the Profile form. */}
        <PomodoroStylePicker />
      </div>
    </section>
  );
}

/**
 * A tiny live preview, drawn in the theme's OWN tokens: the `data-theme`/`data-mode` scope makes
 * every `th-*` class inside resolve to that theme, whatever the page theme is. Decorative.
 */
function ThemePreview({ theme, mode }: { theme: AppTheme; mode: ResolvedMode }) {
  return (
    <span
      aria-hidden="true"
      data-theme={theme}
      data-mode={mode}
      className="flex gap-1 h-[78px] p-1.5 overflow-hidden rounded-[calc(var(--r-card)/2)] bg-th-page"
    >
      {theme !== "field" && (
        <span className={`w-4 rounded-[3px] bg-th-card ${theme === "calm" ? "border border-th-line" : ""}`} />
      )}
      <span className={`flex flex-1 flex-col gap-1 min-w-0 ${theme === "field" ? "pl-0.5" : ""}`}>
        {theme === "classic" && <span className="font-rancho text-base leading-4 text-th-acc">Done!</span>}
        {theme === "calm" && <span className="font-head text-[13px] leading-4 [font-weight:var(--w-head)] text-th-ink">Aa</span>}
        {theme === "field" && (
          <span className="font-head text-lg leading-4 text-th-ink">
            Aa <i className="text-th-acc-t">aa</i>
          </span>
        )}
        <span
          className={`flex flex-1 items-end gap-[3px] p-1 bg-th-card ${
            theme === "field" ? "rounded-[10px]" : theme === "calm" ? "rounded border border-th-line" : "rounded"
          }`}
        >
          <PreviewBar theme={theme} height="40%" tone="low" />
          <PreviewBar theme={theme} height="80%" tone="high" />
          <PreviewBar theme={theme} height="55%" tone="mid" />
        </span>
      </span>
    </span>
  );
}

/** Board 20's three bars: Classic amber, Calm amber with a green peak, Field green with marigold. */
function PreviewBar({ theme, height, tone }: { theme: AppTheme; height: string; tone: "low" | "high" | "mid" }) {
  const colour =
    theme === "field"
      ? { low: "bg-th-acc-sub", high: "bg-th-acc", mid: "bg-th-hi" }[tone]
      : tone === "high"
        ? theme === "calm" ? "bg-th-ok" : "bg-th-acc"
        : "bg-primary-200";
  return <span style={{ height }} className={`flex-1 ${theme === "field" ? "rounded-full" : "rounded-sm"} ${colour}`} />;
}

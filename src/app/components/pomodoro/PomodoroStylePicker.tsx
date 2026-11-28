"use client";
import { useId } from "react";
import { AlertCircle, Check } from "lucide-react";
import { POMODORO_STYLES, type PomodoroStyle } from "@/app/contracts/enums";
import { POMODORO_STYLE_HINTS, POMODORO_STYLE_NAMES, pickerStatusText } from "@/lib/pomodoroStyle";
import { useSetPomodoroStyle } from "@/lib/query/mutations";

/**
 * FEAT-10 Profile → Appearance, "Pomodoro timer" (board 17D). A real radio group (native radios in
 * labels, arrow keys move and select). Not part of the Profile form: it saves on change and never
 * makes the form dirty; the radios have no `name` the form reads.
 */
export default function PomodoroStylePicker() {
  const { style, pick, status } = useSetPomodoroStyle();
  const name = useId();
  const hintId = useId();
  const txt = "text-th-ink";
  const txt2 = "text-th-ink2";
  const line = "border-th-line";
  const statusColour =
    status.kind === "saved"
      ? "text-th-ok-t"
      : status.kind === "failed"
        ? "text-th-danger-t"
        : txt2;

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-2 border-0 m-0 p-0" aria-describedby={hintId}>
        <legend className={`p-0 mb-0.5 font-lato text-base font-bold leading-[22px] ${txt}`}>Pomodoro timer</legend>
        <p id={hintId} className={`-mt-1.5 mb-1.5 font-lato text-[13px] leading-[18px] ${txt2}`}>
          Changes the timer right away.
        </p>
        {POMODORO_STYLES.map((s) => {
          const on = s === style;
          return (
            <label
              key={s}
              className={`grid grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-3 min-h-[64px] rounded-xl cursor-pointer font-lato has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-th-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--card)] ${
                on
                  ? `border-2 py-[7px] pl-[7px] pr-[11px] border-th-acc-t bg-th-acc-sub`
                  : `border py-2 pl-2 pr-3 ${line}`
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={s}
                checked={on}
                onChange={() => pick(s)}
              />
              <span
                aria-hidden="true"
                className={`grid place-items-center w-16 h-12 rounded-lg overflow-hidden bg-th-page`}
              >
                <Thumb style={s} />
              </span>
              <span className="flex flex-col">
                <span className={`text-[15px] font-bold leading-5 ${txt}`}>{POMODORO_STYLE_NAMES[s]}</span>
                <span className={`text-[13px] leading-[18px] ${txt2}`}>{POMODORO_STYLE_HINTS[s]}</span>
              </span>
              <span
                aria-hidden="true"
                className={`grid place-items-center size-5 rounded-full border-2 ${
                  on ? "border-th-acc-t" : "border-th-ink2"
                }`}
              >
                {on && <span className={`size-2.5 rounded-full bg-th-acc-t`} />}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p role="status" className={`flex items-center gap-1.5 min-h-[18px] font-lato text-[13px] leading-[18px] ${statusColour}`}>
        {status.kind === "saving" && (
          <span
            aria-hidden="true"
            className={`size-3 rounded-full border-2 motion-safe:animate-spin border-th-line border-t-th-ink2`}
          />
        )}
        {status.kind === "saved" && <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        {status.kind === "failed" && <AlertCircle aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
        {pickerStatusText(status)}
      </p>
    </div>
  );
}

/** Decorative drawings of each timer (board 17D). */
function Thumb({ style }: { style: PomodoroStyle }) {
  const card = "fill-th-card";
  const line = "stroke-th-line";
  const txt = "fill-th-ink";
  if (style === "dial") {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" className={`${card} ${line}`} />
        <path d="M20 20V5A15 15 0 0 1 33.5 26.5Z" className="fill-th-acc" />
        <circle cx="20" cy="20" r="7" className={card} />
      </svg>
    );
  }
  if (style === "ticket") {
    return (
      <svg width="44" height="36" viewBox="0 0 44 36">
        <rect x="4" y="2" width="36" height="20" rx="4" className={card} />
        <rect x="36" y="8" width="3" height="13" className="fill-th-acc" />
        <rect x="9" y="7" width="20" height="7" rx="1" className={txt} />
        <line x1="6" y1="24" x2="38" y2="24" className="stroke-th-ink2" strokeDasharray="2 2" />
        <rect x="4" y="26" width="36" height="8" rx="3" className={card} />
        <rect x="22" y="28" width="15" height="4" rx="2" className="fill-th-acc" />
      </svg>
    );
  }
  return (
    <svg width="56" height="40" viewBox="0 0 56 40">
      <rect x="18" y="8" width="20" height="8" rx="1" className={txt} opacity=".85" />
      <line x1="0" y1="27" x2="56" y2="27" className={line} strokeWidth="2" />
      <line x1="0" y1="27" x2="22" y2="27" className="stroke-th-acc" strokeWidth="2" />
      <circle cx="22" cy="27" r="4" className="fill-th-acc" />
    </svg>
  );
}

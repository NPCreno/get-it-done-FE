"use client";
import { useId } from "react";
import { TimerConfig, type TimerType } from "@/lib/timerService";
import { MODE_NAMES, TIMER_TYPES } from "./faceCopy";
import { accent, surface } from "./faceClasses";

/**
 * FEAT-10 timer-type choice, a real radio group: native radios (visually hidden) inside labels, so
 * arrow keys move and select. Choosing still goes through the controller's confirm.
 *  - `pill`: the dial's Focus / Short / Long with a dot (board 17A)
 *  - `card`: the ticket stub's three cards with each type's length (board 17B)
 *  - `tab`: the horizon's underlined tabs (board 17C)
 */
export default function ModeRadios({
  value,
  onChange,
  variant,
  short = false,
  className = "",
}: {
  value: TimerType;
  onChange: (type: TimerType) => void;
  variant: "pill" | "card" | "tab";
  /** Short names (Short / Long) instead of Short break / Long break. */
  short?: boolean;
  className?: string;
}) {
  const name = useId();
  const s = surface();
  const layout = variant === "card" ? "grid grid-cols-3 gap-2" : variant === "pill" ? "flex gap-1" : "flex gap-0.5";
  return (
    <div role="radiogroup" aria-label="Timer type" className={`${layout} ${className}`}>
      {TIMER_TYPES.map((type) => {
        const on = type === value;
        const a = accent(type);
        const label = short ? MODE_NAMES[type].short : MODE_NAMES[type].long;
        const input = (
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={type}
            checked={on}
            onChange={() => onChange(type)}
          />
        );
        if (variant === "card") {
          return (
            <label
              key={type}
              className={`flex flex-col items-start gap-0.5 min-h-[56px] rounded-xl text-left font-ui text-sm font-bold leading-[18px] cursor-pointer ${s.txt} ${s.ringWithin} ${
                on ? `border-2 py-[7px] px-[11px] ${a.border} ${a.sub}` : `border py-2 px-3 ${s.border} ${s.hover}`
              }`}
            >
              {input}
              {label}
              <small className={`font-normal text-[13px] leading-[18px] ${s.txt2}`}>{TimerConfig[type] / 60} min</small>
            </label>
          );
        }
        if (variant === "tab") {
          return (
            <label
              key={type}
              className={`inline-flex items-center min-h-[44px] px-3 rounded-full font-ui text-sm font-bold leading-none cursor-pointer ${s.ringWithin} ${
                on ? `${s.txt} ${a.underline}` : `${s.txt2} ${s.hover}`
              }`}
            >
              {input}
              {label}
            </label>
          );
        }
        return (
          <label
            key={type}
            className={`inline-flex items-center gap-2 min-h-[40px] px-3 rounded-full font-ui text-sm font-bold leading-none cursor-pointer ${s.ringWithin} ${
              on ? `${s.txt} ${a.sub}` : `${s.txt2} ${s.hover}`
            }`}
          >
            {input}
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${on ? accent(type, true).bg : "bg-current opacity-50"}`}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

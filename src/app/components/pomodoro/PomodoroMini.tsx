"use client";
import type { PomodoroStyle } from "@/app/contracts/enums";
import type { TimerPhase } from "@/lib/timerPhase";
import type { TimerType } from "@/lib/timerService";
import { miniWedgePath } from "./geometry";
import { clock, fractionDone, fractionLeft, miniCaption, pct } from "./faceCopy";
import { accent, surface } from "./faceClasses";

export interface MiniProps {
  style: PomodoroStyle;
  dark: boolean;
  phase: TimerPhase;
  type: TimerType;
  timeLeft: number;
  fullDuration: number;
  rounds: number;
  /** The dial mini's text: `timerCopy().label`. */
  label: string;
}

/**
 * FEAT-10 "Sidebar timer" row of boards 17A–C, laid out for the dashboard header's 44 px button:
 *  - dial: a tiny wedge and the label (the wedge dims while paused);
 *  - ticket: the number, a draining strip and a stub caption;
 *  - horizon: a thin number, a line with a dot, and a caption.
 * Decorative: the button around it carries the accessible name.
 */
export default function PomodoroMini({ style, dark, phase, type, timeLeft, fullDuration, rounds, label }: MiniProps) {
  const s = surface(dark);
  const dim = phase === "paused" ? "opacity-[.45]" : "";
  const quiet = phase === "running" ? "" : s.txt2;

  if (style === "dial") {
    const a = accent(dark, type, true);
    return (
      <span aria-hidden="true" className="flex items-center gap-2">
        <svg viewBox="0 0 34 34" className="size-7 shrink-0">
          <circle cx={17} cy={17} r={15} fill="none" className={s.faceStroke} strokeWidth={2} />
          <path d={miniWedgePath(timeLeft)} className={`${a.fill} ${dim}`} />
        </svg>
        <span className={`font-bold text-sm tabular-nums whitespace-nowrap ${quiet}`}>{label}</span>
      </span>
    );
  }

  const a = accent(dark, type);
  const caption = miniCaption(style, phase, type, rounds);

  if (style === "ticket") {
    return (
      <span aria-hidden="true" className="flex items-center gap-2.5">
        <span className="flex flex-col gap-1 w-12">
          <span className="font-black text-[15px] leading-none tracking-[-.02em] tabular-nums text-center">{clock(timeLeft)}</span>
          <span className={`block h-1 rounded-full overflow-hidden ${s.lineBg}`}>
            <span className={`block h-full ${a.bg} ${dim}`} style={{ width: pct(fractionLeft(timeLeft, fullDuration)) }} />
          </span>
        </span>
        <span className={`self-stretch border-l border-dashed ${s.border}`} />
        <span className={`text-[11px] leading-[14px] whitespace-nowrap ${s.txt2}`}>{caption}</span>
      </span>
    );
  }

  const done = pct(fractionDone(timeLeft, fullDuration));
  return (
    <span aria-hidden="true" className="flex items-center gap-2.5">
      <span className="flex flex-col items-center gap-1.5 w-12">
        <span className="font-light text-[17px] leading-none tracking-[-.02em] tabular-nums">{clock(timeLeft)}</span>
        <span className={`relative block w-full h-0.5 ${s.lineBg}`}>
          <span className={`absolute inset-y-0 left-0 ${a.bg} ${dim}`} style={{ width: done }} />
          <span className={`absolute top-1/2 size-2 -mt-1 -ml-1 rounded-full ${a.bg} ${dim}`} style={{ left: done }} />
        </span>
      </span>
      <span className={`text-[11px] leading-[14px] whitespace-nowrap ${s.txt2}`}>{caption}</span>
    </span>
  );
}

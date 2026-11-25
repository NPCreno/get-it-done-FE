"use client";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import { DIAL, dialNumbers, dialTicksPath, dialWedgePath } from "./geometry";
import { faceLine } from "./faceCopy";
import { accent, surface } from "./faceClasses";
import ModeRadios from "./ModeRadios";
import type { PomodoroController } from "./usePomodoroController";

const TICKS = dialTicksPath();
const NUMBERS = dialNumbers();

/**
 * FEAT-10 option A, the dial (board 17A): the time left is a wedge on a 60-minute face. A centred
 * card from 768 px, a bottom sheet on a phone. The wedge redraws once a second, no tween.
 */
export default function DialTimer({ ctl, dark }: { ctl: PomodoroController; dark: boolean }) {
  const s = surface(dark);
  const a = accent(dark, ctl.type);
  const wedge = accent(dark, ctl.type, true);
  const idleReset = !ctl.canReset;
  return (
    <DialogContent
      overlayClassName={`fixed inset-0 z-50 flex items-end md:items-center justify-center ${s.scrim}`}
      className={`relative flex flex-col items-center gap-[18px] w-full md:w-[440px] min-h-[92%] md:min-h-0 rounded-t-3xl md:rounded-3xl border-t md:border px-4 pt-3 pb-7 md:px-6 md:pt-5 font-lato ${s.card} ${s.border} ${s.txt}`}
    >
      <DialogTitle className="sr-only">Pomodoro timer</DialogTitle>
      <DialogDescription className="sr-only">Start, pause or reset a focus or break timer.</DialogDescription>
      <span aria-hidden="true" className={`md:hidden w-10 h-[5px] rounded-full ${s.lineBg}`} />
      <div className="w-full flex items-center justify-between">
        <ModeRadios value={ctl.type} onChange={ctl.requestType} variant="pill" dark={dark} short />
        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close"
            className={`grid place-items-center size-11 rounded-full ${s.txt2} ${s.hover} ${s.ring}`}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </DialogClose>
      </div>

      <div className="relative size-[300px] mt-4 md:mt-0">
        <svg viewBox={DIAL.viewBox} aria-hidden="true" className="size-full overflow-visible">
          <circle cx={DIAL.cx} cy={DIAL.cy} r={DIAL.faceR} className={`${s.cardFill} ${s.faceStroke}`} strokeWidth={1} />
          <path d={TICKS} className={s.tick} strokeWidth={1.4} strokeLinecap="round" />
          <path d={dialWedgePath(ctl.timeLeft)} className={wedge.fill} />
          <circle cx={DIAL.cx} cy={DIAL.cy} r={DIAL.hubR} className={s.cardFill} />
          {NUMBERS.map((n) => (
            <text key={n.label} x={n.x} y={n.y} textAnchor="middle" className={`${s.numFill} font-lato font-bold text-[9px]`}>
              {n.label}
            </text>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <p role="timer" aria-live="off" className="font-bold text-[44px] leading-none tracking-[-.02em] tabular-nums">
            {ctl.displayTime}
          </p>
          <p className={`text-[13px] leading-[18px] ${s.txt2}`}>of {ctl.fullDuration / 60} min</p>
        </div>
      </div>

      <p className={`text-[15px] leading-[22px] text-center ${s.txt2}`}>{faceLine(ctl.phase, ctl.type)}</p>

      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label="Reset timer"
          onClick={ctl.reset}
          disabled={idleReset}
          className={`grid place-items-center size-12 rounded-full border ${s.border} ${s.card} ${s.txt} ${s.ring} ${
            idleReset ? "invisible" : ""
          }`}
        >
          <RotateCcw aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          aria-label={ctl.action}
          onClick={ctl.toggle}
          className={`grid place-items-center size-[72px] rounded-full ${a.action} ${s.ring}`}
        >
          {ctl.isActive ? (
            <Pause aria-hidden="true" className="size-[26px] fill-current stroke-none" />
          ) : (
            <Play aria-hidden="true" className="size-[26px] ml-[3px] fill-current stroke-none" />
          )}
        </button>
        <span aria-hidden="true" className="size-12" />
      </div>
      <p aria-hidden="true" className={`-mt-2 text-[13px] leading-[18px] font-bold ${s.txt2}`}>
        {ctl.action}
      </p>
    </DialogContent>
  );
}

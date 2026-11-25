"use client";
import { RotateCcw, X } from "lucide-react";
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import { clock, faceLine, fractionDone, kicker, pct } from "./faceCopy";
import { accent, surface } from "./faceClasses";
import ModeRadios from "./ModeRadios";
import type { PomodoroController } from "./usePomodoroController";

/**
 * FEAT-10 option C, the horizon (board 17C): the same Radix dialog (focus trap, Esc), but full
 * screen. A sun travels along one line as the round passes; it glides with a 1 s linear transition
 * per tick and steps with reduced motion. "Leave focus" only closes: `timerService` keeps running.
 */
export default function HorizonTimer({ ctl, dark }: { ctl: PomodoroController; dark: boolean }) {
  const s = surface(dark);
  const a = accent(dark, ctl.type);
  const done = pct(fractionDone(ctl.timeLeft, ctl.fullDuration));
  return (
    <DialogContent
      overlayClassName="fixed inset-0 z-50"
      className={`fixed inset-0 rounded-none max-w-none flex flex-col font-lato ${s.hzPage} ${s.txt}`}
    >
      <DialogTitle className="sr-only">Focus mode</DialogTitle>
      <DialogDescription className="sr-only">A full-screen Pomodoro timer. Start, pause or reset it.</DialogDescription>

      <div className="flex items-center justify-between gap-3 py-3 pl-4 pr-3 md:py-5 md:px-7">
        <p className={`flex items-center gap-2.5 font-black text-[13px] leading-[18px] tracking-[.14em] uppercase ${a.text}`}>
          <span aria-hidden="true" className={`size-2.5 rounded-full ${a.bg}`} />
          {kicker(ctl.phase, ctl.type, ctl.completedFocusRounds, false)}
        </p>
        <ModeRadios value={ctl.type} onChange={ctl.requestType} variant="tab" dark={dark} className="hidden md:flex" />
        <DialogClose asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 min-h-[44px] w-11 md:w-auto md:px-3.5 rounded-full border font-bold text-sm leading-none ${s.hzBorder} ${s.txt} ${s.hover} ${s.ring}`}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only md:not-sr-only">Leave focus</span>
          </button>
        </DialogClose>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2.5 pb-[110px]">
        <p
          role="timer"
          aria-live="off"
          className="font-light text-[108px] md:text-[184px] leading-[.9] tracking-[-.04em] tabular-nums"
        >
          {ctl.displayTime}
        </p>
        <p className={`px-6 text-[17px] leading-[26px] text-center ${s.txt2}`}>{faceLine(ctl.phase, ctl.type)}</p>
      </div>

      <div aria-hidden="true" className={`absolute inset-x-0 top-[66%] h-0.5 ${s.hzLineBg}`}>
        <span
          className={`absolute inset-y-0 left-0 ${a.bg} transition-[width] duration-1000 ease-linear motion-reduce:transition-none`}
          style={{ width: done }}
        />
        <span
          className={`absolute top-1/2 size-[18px] -mt-[9px] -ml-[9px] rounded-full ${a.sun} ${s.sunHalo} transition-[left] duration-1000 ease-linear motion-reduce:transition-none`}
          style={{ left: done }}
        />
      </div>
      <div
        aria-hidden="true"
        className={`absolute left-4 right-4 md:left-7 md:right-7 top-[calc(66%+14px)] flex justify-between font-bold text-[13px] leading-[18px] tabular-nums ${s.txt2}`}
      >
        <span>0:00</span>
        <span>{clock(ctl.fullDuration)}</span>
      </div>

      <ModeRadios
        value={ctl.type}
        onChange={ctl.requestType}
        variant="tab"
        dark={dark}
        short
        className="md:hidden absolute left-4 right-4 bottom-[116px] justify-center"
      />

      <div className="absolute inset-x-0 bottom-10 md:bottom-14 flex justify-center gap-3">
        {ctl.canReset && (
          <button
            type="button"
            onClick={ctl.reset}
            className={`inline-flex items-center gap-2 min-h-[56px] px-[22px] rounded-full border font-bold text-[15px] leading-none ${s.hzBorder} ${s.txt} ${s.hover} ${s.ring}`}
          >
            <RotateCcw aria-hidden="true" className="size-[18px]" />
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={ctl.toggle}
          className={`min-w-[160px] min-h-[56px] px-7 rounded-full font-black text-[17px] leading-none ${a.action} ${s.ring}`}
        >
          {ctl.action}
        </button>
      </div>
    </DialogContent>
  );
}

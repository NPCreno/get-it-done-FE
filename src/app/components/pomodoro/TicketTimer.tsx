"use client";
import { RotateCcw, X } from "lucide-react";
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import { FOCUS_ROUNDS_PER_CYCLE } from "@/lib/timerService";
import { faceLine, kicker, nextHint, pct, pipsLabel } from "./faceCopy";
import { accent, surface } from "./faceClasses";
import ModeRadios from "./ModeRadios";
import type { PomodoroController } from "./usePomodoroController";

/**
 * FEAT-10 option B, the ticket (board 17B): a heavy number on top, a perforation, and a stub with
 * the choices and one big button. The bar on the right drains with the time left (it steps once a
 * second); the pips are the focus rounds done in this cycle.
 */
export default function TicketTimer({ ctl }: { ctl: PomodoroController }) {
  const s = surface();
  const a = accent(ctl.type);
  const rounds = ctl.completedFocusRounds;
  return (
    <DialogContent
      overlayClassName={`fixed inset-0 z-50 flex items-end md:items-center justify-center ${s.scrim}`}
      className={`flex flex-col w-full md:w-[400px] font-ui ${s.txt}`}
    >
      <DialogTitle className="sr-only">Pomodoro timer</DialogTitle>
      <DialogDescription className="sr-only">Start, pause or reset a focus or break timer.</DialogDescription>

      <div className={`relative overflow-hidden rounded-t-[22px] pt-5 pr-6 pb-4 pl-7 flex flex-col ${s.card}`}>
        <span aria-hidden="true" className={`absolute inset-y-0 right-0 w-2.5 ${s.lineBg}`}>
          <span className={`absolute inset-x-0 bottom-0 ${a.bg}`} style={{ height: pct(ctl.fraction) }} />
        </span>
        <div className="flex items-center justify-between mr-1.5">
          <p className={`font-black text-xs leading-4 tracking-[.14em] uppercase ${a.text}`}>
            {kicker(ctl.phase, ctl.type, rounds, true)}
          </p>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className={`grid place-items-center size-11 -mr-2.5 rounded-full ${s.txt2} ${s.hover} ${s.ring}`}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </DialogClose>
        </div>
        <p
          role="timer"
          aria-live="off"
          className="mt-2 font-black text-[104px] md:text-[112px] leading-[.92] tracking-[-.05em] tabular-nums"
        >
          {ctl.displayTime}
        </p>
        <p className={`mt-2.5 text-[15px] leading-[22px] ${s.txt2}`}>{faceLine(ctl.phase, ctl.type)}</p>
        <div className="flex items-center gap-1.5 mt-4">
          {Array.from({ length: FOCUS_ROUNDS_PER_CYCLE }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`w-[22px] h-2 rounded-sm ${i < rounds ? a.bg : s.lineBg}`}
            />
          ))}
          <span className={`ml-1.5 text-[13px] leading-[18px] ${s.txt2}`}>{pipsLabel(rounds)}</span>
        </div>
      </div>

      {/* The perforation: two notches cut from the card, so the scrim shows through. */}
      <div aria-hidden="true" className={`relative h-6 ${s.notches}`}>
        <span className={`absolute left-[18px] right-[18px] top-1/2 -translate-y-1/2 border-t-2 border-dashed ${s.border}`} />
      </div>

      <div className={`md:rounded-b-[22px] px-6 pt-2.5 pb-8 md:pb-6 flex flex-col gap-4 ${s.card}`}>
        <ModeRadios value={ctl.type} onChange={ctl.requestType} variant="card" />
        <div className="flex gap-2.5">
          {ctl.canReset && (
            <button
              type="button"
              onClick={ctl.reset}
              className={`inline-flex items-center gap-2 min-h-[52px] px-[18px] rounded-[14px] border font-bold text-[15px] leading-none ${s.border} ${s.txt} ${s.hover} ${s.ring}`}
            >
              <RotateCcw aria-hidden="true" className="size-[18px]" />
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={ctl.toggle}
            className={`flex-1 min-h-[52px] rounded-[14px] font-black text-base leading-none tracking-[.02em] ${a.action} ${s.ring}`}
          >
            {ctl.action}
          </button>
        </div>
        <p className={`text-[13px] leading-[18px] text-center ${s.txt2}`}>{nextHint(rounds, ctl.type)}</p>
      </div>
    </DialogContent>
  );
}

'use client';

import { useCallback } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { TimerConfig } from '@/lib/timerService';
import { timerCopy, timerPhase } from '@/lib/timerPhase';
import { pomodoroStyleOf } from '@/lib/pomodoroStyle';
import { useFormState } from '@/app/context/FormProvider';
import PomodoroMini from './pomodoro/PomodoroMini';
import { surface } from './pomodoro/faceClasses';

interface PomodoroButtonProps {
  onOpenChange: (open: boolean) => void;
}

/**
 * The timer button by the dashboard search. FEAT-10: it shows the mini of the user's timer style
 * (`pomodoroStyleOf(userData)`, never `useProfile`: this is shared with `/demo`); its logic, its
 * `timerCopy` name and tooltip are unchanged. The play/pause and reset controls sit next to the
 * opening button, not inside it.
 */
export default function PomodoroButton({ onOpenChange }: PomodoroButtonProps) {
  const { userData } = useFormState();
  const style = pomodoroStyleOf(userData);
  const { timeLeft, isActive, currentTimer, completedFocusRounds, pause, start, reset, isAtDefaultTime } = useTimer();

  // Toggle between play and pause
  const togglePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pause();
    } else {
      start(currentTimer);
    }
  }, [isActive, currentTimer, pause, start]);

  // Reset to the default time for the current mode, and back to idle
  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    reset(currentTimer);
    if (isActive) {
      pause();
    }
  }, [currentTimer, reset, isActive, pause]);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // idle | running | paused: every label below comes from this one phase (BUG-04)
  const phase = timerPhase(isActive, timeLeft, TimerConfig[currentTimer]);
  const copy = timerCopy(phase, currentTimer, formatTime(timeLeft));
  const s = surface();
  const control = `grid place-items-center size-7 rounded-full ${s.txt2} ${s.hover} ${s.ring}`;

  return (
    <div className={`relative group flex items-center gap-1 h-[44px] pr-1.5 rounded-[10px] border font-ui ${s.card} ${s.border} ${s.txt}`}>
      <button
        type="button"
        className={`flex items-center h-full pl-3 pr-1.5 rounded-[10px] ${s.ring}`}
        onClick={() => onOpenChange(true)}
        aria-label={copy.ariaLabel}
      >
        <PomodoroMini
          style={style}
          phase={phase}
          type={currentTimer}
          timeLeft={timeLeft}
          fullDuration={TimerConfig[currentTimer]}
          rounds={completedFocusRounds}
          label={copy.label}
        />
      </button>

      {/* Control buttons - only when the timer is running or paused */}
      {phase !== 'idle' && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={togglePlayPause}
            className={control}
            aria-label={isActive ? 'Pause timer' : 'Resume timer'}
          >
            {isActive ? (
              <Pause aria-hidden="true" className="size-3.5 fill-current stroke-none" />
            ) : (
              <Play aria-hidden="true" className="size-3.5 fill-current stroke-none" />
            )}
          </button>
          {/* Reset - only when not at the default time */}
          {!isAtDefaultTime && (
            <button type="button" onClick={handleReset} className={control} aria-label="Reset timer">
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Tooltip */}
      <div
        aria-hidden="true"
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10"
      >
        {copy.tooltip}
      </div>
    </div>
  );
}

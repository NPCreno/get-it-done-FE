import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import type { TimerType } from '@/lib/timerService';
import ConfirmationModal from './confirmation';
import { useFormState } from '@/app/context/FormProvider';

interface PomodoroModalProps {
  onClose: () => void;
}

interface TimerConfig {
  label: string;
  time: number;
  bgGradient: string;
  buttonColor: string;
  borderColor: string;
  textColor: string;
}

const TIMER_CONFIG: Record<TimerType, TimerConfig> = {
  pomodoro: {
    label: 'Focus',
    time: 25 * 60, // 25 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-primary-default',
    borderColor: 'border-primary-default/30',
    textColor: 'text-primary-default dark:text-primary-400'
  },
  shortBreak: {
    label: 'Short Break',
    time: 5 * 60, // 5 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-blue-500',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500 dark:text-blue-400'
  },
  longBreak: {
    label: 'Long Break',
    time: 15 * 60, // 15 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500 dark:text-emerald-400'
  }
} as const;

export default function PomodoroModal({ 
  onClose,
}: PomodoroModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTimerType, setPendingTimerType] = useState<TimerType | null>(null);
  const { 
    userData
  } = useFormState();

  const { 
    timeLeft, 
    isActive, 
    currentTimer: activeTimer, 
    toggle, 
    pause,
    reset: resetTimer,
    setCurrentTimer,
    isAtDefaultTime
  } = useTimer('pomodoro');

  // Get the current timer configuration
  const currentTimer = useMemo(() => {
    return TIMER_CONFIG[activeTimer] || TIMER_CONFIG.pomodoro;
  }, [activeTimer]);
  
  // Safe timer type for rendering
  const safeTimerType = useMemo(() => 
    (activeTimer in TIMER_CONFIG ? activeTimer : 'pomodoro') as TimerType
  , [activeTimer]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  const handleTimerChange = useCallback((timerType: TimerType) => {
    // Only change timer type if it's different from current and valid
    if (timerType !== activeTimer && timerType in TIMER_CONFIG) {
      // Show confirmation dialog if timer is active or not at default value
      if (isActive || !isAtDefaultTime) {
        setPendingTimerType(timerType);
        setShowConfirm(true);
      } else {
        // If timer is inactive and at default, just switch the mode
        setCurrentTimer(timerType);
      }
    }
  }, [activeTimer, isActive, isAtDefaultTime, setCurrentTimer]);
  
  const handleTimerButtonClick = (timerType: TimerType) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleTimerChange(timerType);
  };

  const handleConfirmChange = useCallback(() => {
    if (pendingTimerType) {
      // Pause current timer and switch mode without auto-starting
      pause();
      setCurrentTimer(pendingTimerType);
      setShowConfirm(false);
      setPendingTimerType(null);
    }
  }, [pendingTimerType, pause, setCurrentTimer]);

  const handleCancelChange = useCallback(() => {
    setShowConfirm(false);
    setPendingTimerType(null);
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetTimer(activeTimer);
  }, [activeTimer, resetTimer]);

  // Format time for display
  const displayTime = useMemo(() => {
    const mins = Math.floor(Math.max(0, timeLeft) / 60);
    const secs = Math.max(0, timeLeft % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const toggleTimer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggle();
  }, [toggle]);


  const renderConfirmationModal = useMemo(() => {
    if (!showConfirm || !pendingTimerType) return null;
    
    return (
      <ConfirmationModal
        onClose={handleCancelChange}
        title={`Switch to ${pendingTimerType.replace(/^\w/, c => c.toUpperCase())}?`}
        description={`Switching to ${pendingTimerType.replace(/^\w/, c => c.toUpperCase())} mode will reset the timer.`}
        actions={[
          {
            label: 'Cancel',
            onClick: handleCancelChange,
            variant: 'secondary'
          },
          {
            label: 'Switch',
            onClick: handleConfirmChange,
            variant: 'primary'
          }
        ]}
      />
    );
  }, [showConfirm, pendingTimerType, handleCancelChange, handleConfirmChange]);

  return (
    <div>
      {renderConfirmationModal}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300"
        onClick={onClose}
      >
        <div
          className={`relative ${userData?.theme === 'dark' ? 'bg-foreground-dark border-gray-800 border' : 'bg-white'} dark:bg-gray-900 w-[500px] max-w-[95vw] rounded-2xl shadow-xl dark:shadow-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 ease-out overflow-hidden border border-gray-200 dark:border-gray-700`}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Timer type selector */}
          <div className='w-full max-w-xs mb-8 mx-auto'>
            <div className={`relative flex flex-row justify-between items-center rounded-full border ${currentTimer.borderColor} h-12 p-1 transition-colors duration-300 overflow-hidden ${userData?.theme === 'dark' ? 'bg-foreground-dark border-gray-800 border' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
              {/* Animated background */}
              <div 
                className={`absolute top-1 h-[calc(100%-8px)] rounded-full transition-all duration-300 ease-out ${currentTimer.buttonColor} ${
                  activeTimer === 'longBreak' ? 'left-4' : 'left-1'
                }`}
                style={{
                  width: `calc(${100 / Object.keys(TIMER_CONFIG).length}% - 8px)`,
                  transform: `translateX(calc(${Object.keys(TIMER_CONFIG).indexOf(activeTimer) * 100}% + 4px))`,
                }}
              />
              
              {(Object.entries(TIMER_CONFIG) as Array<[TimerType, TimerConfig]>).map(([key, config]) => {
                const isActive = safeTimerType === key;
                return (
                  <button
                    key={key}
                    className={`relative z-10 flex-1 flex items-center justify-center text-sm font-medium h-full transition-colors duration-300 ${
                      isActive 
                        ? 'text-white' 
                        : `${config.textColor} hover:bg-black/5 dark:hover:bg-white/5`
                    }`}
                    onClick={handleTimerButtonClick(key)}
                    disabled={isActive}
                  >
                    <span className='relative z-10'>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Timer display */}
          <div className='relative mb-10'>
            <h1 className={`${currentTimer.textColor} text-7xl md:text-8xl font-bold font-mono tracking-tighter text-center mb-2`}>
              {displayTime}
            </h1>
            {isActive && (
              <span className='absolute -bottom-6 left-1/2 transform -translate-x-1/2 -translate-y-4 text-gray-600 dark:text-white/70 text-sm font-medium tracking-wide'>
                {activeTimer === 'pomodoro' ? 'Time to focus! 💪' : 'Take a break! ☕'}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className='flex items-center justify-center gap-4 w-full'>
            <button
              className={`py-3 px-8 rounded-xl font-medium text-white ${currentTimer.buttonColor} hover:opacity-90 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2`}
              onClick={toggleTimer}
            >
              {isActive ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start
                </>
              )}
            </button>
            
            <div className='flex gap-2'>
              {!isAtDefaultTime && (
                <button
                  className={`p-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors duration-200 flex items-center justify-center`}
                  onClick={handleReset}
                  title="Reset timer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              
              <button
                className='p-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors duration-200 flex items-center justify-center'
                onClick={onClose}
                title="Close timer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
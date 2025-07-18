'use client';

import { useTimer } from '@/hooks/useTimer';
import { useState, useCallback } from 'react';

// Control button icons
const PlayPauseIcon = ({ isPlaying }: { isPlaying: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-opacity duration-200 group-hover/control:opacity-100"
  >
    {isPlaying ? (
      // Pause icon
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
      </>
    ) : (
      // Play icon
      <path
        d="M8 5.5V18.5L18 12L8 5.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

interface PomodoroButtonProps {
  onOpenChange: (open: boolean) => void;
}

export default function PomodoroButton({ onOpenChange }: PomodoroButtonProps) {
  const { timeLeft, isActive, currentTimer, pause, start, reset, isAtDefaultTime } = useTimer();
  
  // Toggle between play and pause
  const togglePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pause();
    } else {
      start(currentTimer);
    }
  }, [isActive, currentTimer, pause, start]);
  
  // Track if we've ever interacted with the timer
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Handle reset button click - reset to default time and pause
  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Mark that we've interacted with the timer
    setHasInteracted(true);
    // Reset to default time for current mode
    reset(currentTimer);
    // Ensure timer is paused after reset
    if (isActive) {
      pause();
    }
  }, [currentTimer, reset, isActive, pause]);

  // Default timer values in seconds
  const defaultTimes = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Determine if we should show the timer or the default text
  const shouldShowTimer = () => {
    // Always show timer when active or when not at default time
    if (isActive || timeLeft !== defaultTimes[currentTimer]) return true;
    
    // Show timer if we've ever interacted with it
    // This ensures the timer stays visible after reset
    return hasInteracted;
  };

  // Get button text based on state
  const getButtonText = () => {
    if (shouldShowTimer()) {
      return formatTime(timeLeft);
    }
    return `Start ${currentTimer === 'pomodoro' ? 'Pomodoro' : currentTimer === 'shortBreak' ? 'Short Break' : 'Long Break'}`;
  };

  // Get colors based on timer mode
  const getModeColors = () => {
    switch(currentTimer) {
      case 'shortBreak':
        return {
          gradient: 'from-blue-400 to-blue-600',
          hoverGradient: 'from-blue-500 to-blue-700',
          glowColor: 'shadow-blue-500/50',
          iconColor: 'text-blue-800'
        };
      case 'longBreak':
        return {
          gradient: 'from-emerald-400 to-emerald-600',
          hoverGradient: 'from-emerald-500 to-emerald-700',
          glowColor: 'shadow-emerald-500/50',
          iconColor: 'text-emerald-800'
        };
      default: // pomodoro
        return {
          gradient: 'from-amber-300 to-amber-500',
          hoverGradient: 'from-amber-400 to-amber-600',
          glowColor: 'shadow-amber-500/50',
          iconColor: 'text-amber-800'
        };
    }
  };

  // Get button styles based on timer type and state
  const getButtonStyles = () => {
    const baseStyles = 'relative px-5 py-2 flex flex-row gap-2 items-center justify-center rounded-xl h-[44px] font-lato font-medium text-white shadow-md hover:shadow-lg transform transition-all duration-300 hover:translate-y-[-1px] active:translate-y-0 active:scale-95 overflow-hidden group';
    
    const { gradient, hoverGradient, glowColor } = getModeColors();

    // Add colored glow shadow when active
    const activeGlow = isActive ? `shadow-[0_0_15px_3px] ${glowColor}` : '';

    return `${baseStyles} bg-gradient-to-r ${gradient} ${activeGlow} before:absolute before:inset-0 before:bg-gradient-to-r ${hoverGradient} before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300`;
  };

  return (
    <div className="relative group">
      <button
        className={getButtonStyles()}
        onClick={() => onOpenChange(true)}
        aria-label={isActive ? `Pomodoro timer: ${formatTime(timeLeft)} remaining` : 'Start Pomodoro timer'}
      >
        {/* Animated shine effect */}
        <span className="absolute inset-0 rounded-xl overflow-hidden">
          <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        </span>

        {/* Timer icon with subtle animation */}
        <div className="relative z-10 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-300 group-hover:rotate-12 ${isActive ? 'animate-pulse' : ''} ${getModeColors().iconColor}`}
          >
            <path
              d="M6.6156 7.49915C4.79638 9.53097 3.77785 12.1549 3.74978 14.882C3.68064 21.1134 8.76834 26.2374 14.9998 26.2492C21.2224 26.2609 26.2498 21.2201 26.2498 14.9992C26.2498 8.87376 21.3543 3.88919 15.2635 3.74916C15.2292 3.74805 15.195 3.75387 15.163 3.76625C15.131 3.77863 15.1019 3.79733 15.0773 3.82122C15.0527 3.84512 15.0331 3.87372 15.0198 3.90533C15.0065 3.93694 14.9997 3.97091 14.9998 4.00521V8.9054"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.745 14.481H15.746C15.9144 14.6024 16.0355 14.7775 16.0897 14.9761L16.1083 15.063C16.1431 15.2679 16.1067 15.478 16.0057 15.6577L15.9579 15.7329C15.8386 15.9033 15.6649 16.0266 15.4667 16.0835L15.3807 16.104C15.1479 16.1469 14.908 16.0958 14.7118 15.9634C14.6695 15.9336 14.6294 15.9009 14.5927 15.8647L14.4872 15.7417L11.5594 11.5542L15.745 14.481Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Button text and control */}
        <div className="relative z-10 flex items-center gap-2">
          <span className={`text-base  tracking-wide text-white ${shouldShowTimer() ? 'font-bold' : 'font-medium'}`}>
            {getButtonText()}
          </span>
          
          {/* Control buttons - only show when timer is active or paused */}
          {(isActive || shouldShowTimer()) && (
            <div className="flex items-center gap-1">
              {/* Play/Pause button */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="group/control flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
                aria-label={isActive ? 'Pause timer' : 'Resume timer'}
              >
                <PlayPauseIcon isPlaying={isActive} />
              </button>
              
              {/* Reset button - only show when not at default time */}
              {!isAtDefaultTime && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
                  aria-label="Reset timer"
                >
                  <svg 
                    className="h-3.5 w-3.5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Subtle pulse effect */}
        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
      </button>
      
      {/* Tooltip */}
      <div className={`
        absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
        bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-10
      `}>
        {isActive ? 'Timer is running' : 'Start Pomodoro'}
      </div>
    </div>
  );
}

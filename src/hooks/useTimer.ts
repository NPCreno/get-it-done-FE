import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { TimerType, TimerState } from '@/lib/timerService';
import { timerService, TimerConfig } from '@/lib/timerService';

export const useTimer = (initialTimerType: TimerType = 'pomodoro') => {
  const [timerState, setTimerState] = useState<TimerState>(() => ({
    timeLeft: TimerConfig[initialTimerType],
    isRunning: false,
    currentTimer: initialTimerType,
    completedFocusRounds: 0
  }));
  
  const isMountedRef = useRef(true);
  const initialTimerRef = useRef(initialTimerType);

  // Subscribe to timer service updates
  useEffect(() => {
    isMountedRef.current = true;
    
    const handleStateChange = (newState: TimerState) => {
      if (isMountedRef.current) {
        setTimerState(newState);
      }
    };

    // Subscribe and get current state
    const unsubscribe = timerService.subscribe(handleStateChange);
    
    // Initial sync
    const currentState = timerService.getCurrentState();
    handleStateChange(currentState);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync with initialTimerType prop if it changes
  useEffect(() => {
    if (initialTimerRef.current !== initialTimerType) {
      timerService.setTimerType(initialTimerType);
      initialTimerRef.current = initialTimerType;
    }
  }, [initialTimerType]);

  const toggle = useCallback((timerType: TimerType = timerState.currentTimer) => {
    timerService.toggle(timerType);
  }, [timerState.currentTimer]);

  const start = useCallback((timerType: TimerType = timerState.currentTimer) => {
    timerService.start(timerType);
  }, [timerState.currentTimer]);

  const pause = useCallback(() => {
    timerService.pause();
  }, []);

  const reset = useCallback((timerType: TimerType = timerState.currentTimer) => {
    timerService.reset(timerType);
  }, [timerState.currentTimer]);

  const setCurrentTimerType = useCallback((timerType: TimerType) => {
    timerService.setTimerType(timerType);
  }, []);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    timeLeft: timerState.timeLeft,
    isActive: timerState.isRunning,
    currentTimer: timerState.currentTimer,
    completedFocusRounds: timerState.completedFocusRounds,
    isAtDefaultTime: timerState.timeLeft === TimerConfig[timerState.currentTimer],
    toggle,
    start,
    pause,
    reset,
    setCurrentTimer: setCurrentTimerType,
  }), [
    timerState.timeLeft, 
    timerState.isRunning, 
    timerState.currentTimer, 
    timerState.completedFocusRounds,
    toggle, 
    start, 
    pause, 
    reset, 
    setCurrentTimerType
  ]);
};

// Timer configuration
const TimerConfigValues = {
  pomodoro: 25 * 60,    // 25 minutes in seconds
  shortBreak: 5 * 60,   // 5 minutes in seconds
  longBreak: 15 * 60    // 15 minutes in seconds
} as const;

// Types
export type TimerType = keyof typeof TimerConfigValues;

export type TimerConfigType = typeof TimerConfigValues;
export const TimerConfig: TimerConfigType = TimerConfigValues;

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  currentTimer: TimerType;
  /** FEAT-10: focus rounds finished in this cycle (0–4); the Ticket's pips. Client only. */
  completedFocusRounds: number;
}

/** The Ticket shows four pips: a cycle is four focus rounds, then a long break. */
export const FOCUS_ROUNDS_PER_CYCLE = 4;

/** A stored count, or 0 for a state saved before the field existed (or a broken value). */
export function storedRounds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(FOCUS_ROUNDS_PER_CYCLE, Math.max(0, Math.floor(value)));
}

/**
 * The count after a round of `type` reached 0: a focus round adds one (at most four), a long break
 * starts a new cycle, a short break changes nothing.
 */
export function roundsAfterFinish(type: TimerType, rounds: number): number {
  if (type === 'pomodoro') return Math.min(FOCUS_ROUNDS_PER_CYCLE, rounds + 1);
  if (type === 'longBreak') return 0;
  return rounds;
}

type Subscriber = (state: TimerState) => void;

export class TimerService {
  private static instance: TimerService | null = null;
  private subscribers: Subscriber[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private endTime: number | null = null;
  private isRunning: boolean = false;
  private currentTimeLeft: number = TimerConfig.pomodoro;
  private currentTimerType: TimerType = 'pomodoro';
  private completedFocusRounds: number = 0;
  private audio: HTMLAudioElement | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  private constructor() {
    // Only initialize audio in browser environment
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.loadState();
      this.beforeUnloadHandler = () => this.saveState();
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  // Clean up all resources
  public destroy(): void {
    this.pause();
    this.subscribers = [];
    
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    // Clear the singleton instance
    TimerService.instance = null;
  }

  public static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService();
      // Register cleanup on window unload
      if (typeof window !== 'undefined') {
        window.addEventListener('unload', () => {
          if (TimerService.instance) {
            TimerService.instance.destroy();
          }
        });
      }
    }
    return TimerService.instance;
  }

  private notifySubscribers(): void {
    const state = this.getCurrentState();
    this.subscribers.forEach(subscriber => subscriber(state));
  }

  private async playSound(url: string): Promise<void> {
    try {
      // Only play sound in browser environment with audio support
      if (typeof window !== 'undefined' && this.audio) {
        this.audio.src = url;
        this.audio.volume = 0.5;
        await this.audio.play().catch(error => {
          console.error('Error playing sound:', error);
        });
      }
    } catch (error) {
      console.error('Error in playSound:', error);
    }
  }

  private saveState(): void {
    try {
      const state = {
        endTime: this.endTime,
        isRunning: this.isRunning,
        currentTimerType: this.currentTimerType,
        currentTimeLeft: this.currentTimeLeft,
        completedFocusRounds: this.completedFocusRounds,
        savedAt: Date.now()
      };
      localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  }
  
  public cleanup(): void {
    this.pause();
    this.subscribers = [];
  }

  public start(timerType: TimerType, duration: number = TimerConfig[timerType]): void {
    // If we're already running, just update the timer type if it changed
    if (this.isRunning && this.intervalId) {
      if (this.currentTimerType !== timerType) {
        this.currentTimerType = timerType;
        this.currentTimeLeft = duration;
        this.endTime = Date.now() + (this.currentTimeLeft * 1000);
      }
      return;
    }

    // If we're resuming from pause, use the current time left
    const timeToUse = this.currentTimerType === timerType && this.currentTimeLeft > 0 
      ? this.currentTimeLeft 
      : duration;

    this.pause();
    this.currentTimerType = timerType;
    this.currentTimeLeft = timeToUse;
    this.isRunning = true;
    this.endTime = Date.now() + (timeToUse * 1000);
    
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.playSound('/soundfx/start.mp3');
    this.notifySubscribers();
    this.saveState();
  }

  public pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.notifySubscribers();
    this.saveState();
  }

  public reset(timerType: TimerType = this.currentTimerType): void {
    this.pause();
    this.currentTimerType = timerType;
    this.currentTimeLeft = TimerConfig[timerType];
    this.isRunning = false;
    this.endTime = null;
    this.notifySubscribers();
    this.saveState();
  }

  public toggle(timerType: TimerType = this.currentTimerType): void {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start(timerType);
    }
  }

  public setTimerType(timerType: TimerType): void {
    if (this.currentTimerType !== timerType) {
      this.currentTimerType = timerType;
      this.currentTimeLeft = TimerConfig[timerType];
      this.notifySubscribers();
      this.saveState();
    }
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    // Immediately send current state to new subscriber
    callback(this.getCurrentState());
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  public getCurrentState(): TimerState {
    return {
      timeLeft: this.currentTimeLeft,
      isRunning: this.isRunning,
      currentTimer: this.currentTimerType,
      completedFocusRounds: this.completedFocusRounds
    };
  }

  private tick(): void {
    if (!this.endTime) return;
    
    const now = Date.now();
    const timeLeft = Math.ceil((this.endTime - now) / 1000);
    
    if (timeLeft <= 0) {
      this.currentTimeLeft = 0;
      // FEAT-10: counted here, where the alarm plays; pause() below saves it.
      this.completedFocusRounds = roundsAfterFinish(this.currentTimerType, this.completedFocusRounds);
      this.pause();
      // Play alarm when timer ends
      this.playSound('/soundfx/alarm.mp3');
    } else {
      this.currentTimeLeft = timeLeft;
    }
    
    this.notifySubscribers();
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('pomodoroTimerState');
      if (!saved) return;

      let state;
      try {
        state = JSON.parse(saved);
      } catch (parseError) {
        console.error('Invalid JSON in stored timer state:', parseError);
        this.resetToDefault();
        return;
      }

      // Don't restore if the state is too old (e.g., > 24 hours)
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const isStateTooOld = Date.now() - (state.savedAt || 0) > TWENTY_FOUR_HOURS;
      
      if (isStateTooOld) {
        this.resetToDefault();
        return;
      }

      // FEAT-10: kept from here on; only the staleness rule above (and a broken state) clears it.
      this.completedFocusRounds = storedRounds(state.completedFocusRounds);

      const timePassed = Math.floor((Date.now() - state.savedAt) / 1000);
      
      if (state.isRunning && state.endTime) {
        this.currentTimeLeft = Math.max(0, state.currentTimeLeft - timePassed);
        if (this.currentTimeLeft > 0) {
          this.endTime = Date.now() + (this.currentTimeLeft * 1000);
          this.start(state.currentTimerType, this.currentTimeLeft);
        } else {
          // Finished while the app was closed: the alarm never played, so the round is not counted.
          this.resetToDefault(this.completedFocusRounds);
        }
      } else {
        this.currentTimeLeft = Math.max(0, state.currentTimeLeft - timePassed);
        this.currentTimerType = state.currentTimerType;
        this.isRunning = false;
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
      this.resetToDefault();
    }
  }

  private resetToDefault(completedFocusRounds = 0): void {
    this.completedFocusRounds = completedFocusRounds;
    this.currentTimeLeft = TimerConfig.pomodoro;
    this.currentTimerType = 'pomodoro';
    this.isRunning = false;
    this.endTime = null;
    this.notifySubscribers();
    this.saveState();
  }
}

// Export a singleton instance
export const timerService = TimerService.getInstance();

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * FEAT-10 §1d: `completedFocusRounds` in timerService. Fake timers drive `Date.now` and the
 * interval; `window`, `localStorage` and `Audio` are stubs (the service only touches them in a
 * browser).
 */

const KEY = "pomodoroTimerState";
let store: Record<string, string>;
type Service = import("../timerService").TimerService;
let TimerService: typeof import("../timerService").TimerService;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T09:00:00.000Z"));
  store = {};
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
  vi.stubGlobal(
    "Audio",
    class {
      src = "";
      volume = 1;
      play = () => Promise.resolve();
      pause = () => undefined;
    }
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.resetModules();
  ({ TimerService } = await import("../timerService"));
  // The module made its own instance at import; start each test from the stored state below.
  TimerService.getInstance().destroy();
});

afterEach(() => {
  TimerService.getInstance().destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fresh(saved?: object): Service {
  TimerService.getInstance().destroy();
  if (saved) store[KEY] = JSON.stringify(saved);
  else delete store[KEY];
  return TimerService.getInstance();
}

const rounds = (s: Service) => s.getCurrentState().completedFocusRounds;
const stored = () => JSON.parse(store[KEY]).completedFocusRounds;

/** Run `type` from its start until it reaches 0. */
function finish(s: Service, type: "pomodoro" | "shortBreak" | "longBreak", seconds: number) {
  s.start(type, seconds);
  // Resuming the same type keeps its own time left (unchanged behaviour), so run whatever is left.
  vi.advanceTimersByTime((s.getCurrentState().timeLeft + 1) * 1000);
}

describe("completedFocusRounds", () => {
  it("a focus round reaching 0 adds one, and it is saved", () => {
    const s = fresh();
    expect(rounds(s)).toBe(0);
    finish(s, "pomodoro", 3);
    expect(s.getCurrentState().timeLeft).toBe(0);
    expect(rounds(s)).toBe(1);
    expect(stored()).toBe(1);
  });

  it("stops at four", () => {
    const s = fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, endTime: null, completedFocusRounds: 4, savedAt: Date.now() });
    expect(rounds(s)).toBe(4);
    finish(s, "pomodoro", 2);
    expect(rounds(s)).toBe(4);
  });

  it("a short break reaching 0 changes nothing", () => {
    const s = fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, endTime: null, completedFocusRounds: 2, savedAt: Date.now() });
    finish(s, "shortBreak", 2);
    expect(rounds(s)).toBe(2);
  });

  it("a long break reaching 0 starts a new cycle", () => {
    const s = fresh({ currentTimerType: "longBreak", currentTimeLeft: 900, isRunning: false, endTime: null, completedFocusRounds: 4, savedAt: Date.now() });
    finish(s, "longBreak", 2);
    expect(rounds(s)).toBe(0);
    expect(stored()).toBe(0);
  });

  it("an old stored state without the field loads as 0", () => {
    const s = fresh({ currentTimerType: "shortBreak", currentTimeLeft: 120, isRunning: false, endTime: null, savedAt: Date.now() });
    expect(s.getCurrentState().currentTimer).toBe("shortBreak");
    expect(rounds(s)).toBe(0);
  });

  it("a stored count loads, and a broken one loads as 0", () => {
    expect(rounds(fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, completedFocusRounds: 3, savedAt: Date.now() }))).toBe(3);
    expect(rounds(fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, completedFocusRounds: "3", savedAt: Date.now() }))).toBe(0);
    expect(rounds(fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, completedFocusRounds: 99, savedAt: Date.now() }))).toBe(4);
  });

  it("a state older than 24 h starts at 0", () => {
    const s = fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, completedFocusRounds: 3, savedAt: Date.now() - 25 * 3600_000 });
    expect(rounds(s)).toBe(0);
  });

  it("reset, pause and switching type leave it alone", () => {
    const s = fresh({ currentTimerType: "pomodoro", currentTimeLeft: 1500, isRunning: false, completedFocusRounds: 2, savedAt: Date.now() });
    s.start("pomodoro");
    vi.advanceTimersByTime(5000);
    s.pause();
    expect(rounds(s)).toBe(2);
    s.reset();
    expect(rounds(s)).toBe(2);
    s.setTimerType("longBreak");
    expect(rounds(s)).toBe(2);
    s.toggle();
    vi.advanceTimersByTime(3000);
    s.toggle();
    expect(rounds(s)).toBe(2);
    expect(stored()).toBe(2);
  });
});

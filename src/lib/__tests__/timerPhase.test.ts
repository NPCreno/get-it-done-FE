import { describe, expect, it } from "vitest";
import { timerCopy, timerPhase } from "../timerPhase";

const FULL = 25 * 60;

describe("timerPhase", () => {
  it("is idle at the full length (fresh, reset or a switched type)", () => {
    expect(timerPhase(false, FULL, FULL)).toBe("idle");
  });

  it("is running whenever the clock ticks, even at the full length", () => {
    expect(timerPhase(true, FULL, FULL)).toBe("running");
    expect(timerPhase(true, 61, FULL)).toBe("running");
  });

  it("is paused when stopped with time used and time left", () => {
    expect(timerPhase(false, FULL - 1, FULL)).toBe("paused");
    expect(timerPhase(false, 1, FULL)).toBe("paused");
  });

  it("is idle once finished at 0: Start begins a new session, it does not resume", () => {
    expect(timerPhase(false, 0, FULL)).toBe("idle");
  });
});

describe("timerCopy", () => {
  it("idle says Start", () => {
    expect(timerCopy("idle", "pomodoro", "25:00")).toEqual({
      label: "Start Pomodoro",
      ariaLabel: "Start Pomodoro timer",
      action: "Start",
      tooltip: "Start Pomodoro",
    });
    expect(timerCopy("idle", "shortBreak", "5:00").label).toBe("Start Short Break");
  });

  it("running shows the time and Pause", () => {
    expect(timerCopy("running", "pomodoro", "12:34")).toEqual({
      label: "12:34",
      ariaLabel: "Pomodoro timer: 12:34 remaining",
      action: "Pause",
      tooltip: "Timer is running",
    });
  });

  it("paused says Paused and Resume, never Start", () => {
    expect(timerCopy("paused", "longBreak", "3:05")).toEqual({
      label: "Paused",
      ariaLabel: "Pomodoro paused: 3:05 left",
      action: "Resume",
      tooltip: "Timer is paused",
    });
  });
});

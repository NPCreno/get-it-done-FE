import { describe, expect, it } from "vitest";
import { pickerStatusText, pomodoroStyleOf } from "../pomodoroStyle";

describe("pomodoroStyleOf", () => {
  it("is the dial without a valid choice", () => {
    expect(pomodoroStyleOf(null)).toBe("dial");
    expect(pomodoroStyleOf(undefined)).toBe("dial");
    expect(pomodoroStyleOf({})).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: null })).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: "" })).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: "Dial" })).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: "Ticket" })).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: "clock" })).toBe("dial");
  });

  it("passes each valid value through", () => {
    expect(pomodoroStyleOf({ pomodoroStyle: "dial" })).toBe("dial");
    expect(pomodoroStyleOf({ pomodoroStyle: "ticket" })).toBe("ticket");
    expect(pomodoroStyleOf({ pomodoroStyle: "horizon" })).toBe("horizon");
  });
});

describe("pickerStatusText (board 17D)", () => {
  it("says what happened", () => {
    expect(pickerStatusText({ kind: "idle" })).toBe("");
    expect(pickerStatusText({ kind: "saving" })).toBe("Saving…");
    expect(pickerStatusText({ kind: "saved", style: "ticket" })).toBe("Saved. The timer now uses Ticket.");
    expect(pickerStatusText({ kind: "failed", restored: "dial" })).toBe(
      "Couldn’t save your timer style. It’s back to Dial; try again."
    );
  });
});

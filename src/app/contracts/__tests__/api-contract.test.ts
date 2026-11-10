import { describe, expect, it } from "vitest";
import contract from "../api-contract.json";
import { LIMITS, PATTERNS } from "../common";
import {
  BOOLEAN_STRINGS,
  NEW_TASK_STATUSES,
  REPEAT_EVERY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEMES,
  WEEKDAYS,
} from "../enums";

describe("FE literals match the vendored BE contract (src/app/contracts/api-contract.json)", () => {
  it("enums", () => {
    expect([...TASK_PRIORITIES]).toEqual(contract.taskPriorities);
    expect([...TASK_STATUSES]).toEqual(contract.taskStatuses);
    expect([...NEW_TASK_STATUSES]).toEqual(contract.newTaskStatuses);
    expect([...REPEAT_EVERY]).toEqual(contract.repeatEvery);
    expect([...WEEKDAYS]).toEqual(contract.weekdays);
    expect([...THEMES]).toEqual(contract.themes);
    expect([...BOOLEAN_STRINGS]).toEqual(contract.booleanStrings);
  });

  it("limits", () => {
    expect(LIMITS).toEqual(contract.limits);
  });

  it("regex sources", () => {
    expect(PATTERNS).toEqual(contract.patterns);
  });

  it("contract version is known", () => {
    expect(contract.version).toBe(1);
  });
});

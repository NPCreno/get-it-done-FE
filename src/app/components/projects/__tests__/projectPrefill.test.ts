import { describe, expect, it } from "vitest";
import { EMPTY_PROJECT_FORM, projectFormValuesOf, shouldPrefill, type PrefillInput } from "../projectPrefill";

const base: PrefillInput = { loadedId: "p1", editingId: "p1", sessionPrefilled: false, dirty: false };

describe("shouldPrefill", () => {
  it("prefills once when the edited project's data first arrives", () => {
    expect(shouldPrefill(base)).toBe(true);
  });

  it("never prefills a second time in the same session (a refetch)", () => {
    expect(shouldPrefill({ ...base, sessionPrefilled: true })).toBe(false);
  });

  it("never overwrites fields the user has changed", () => {
    expect(shouldPrefill({ ...base, dirty: true })).toBe(false);
  });

  it("ignores another project's data", () => {
    expect(shouldPrefill({ ...base, loadedId: "p2" })).toBe(false);
  });

  it("waits while nothing is loaded", () => {
    expect(shouldPrefill({ ...base, loadedId: undefined })).toBe(false);
  });

  it("never prefills while creating or closed (#55)", () => {
    expect(shouldPrefill({ ...base, editingId: undefined })).toBe(false);
    expect(shouldPrefill({ ...base, editingId: undefined, loadedId: undefined })).toBe(false);
  });

  it("a new session prefills again, each with its own project", () => {
    // Session 1 edits p1 and was filled; session 2 edits p2.
    expect(shouldPrefill({ ...base, sessionPrefilled: true })).toBe(false);
    expect(shouldPrefill({ loadedId: "p2", editingId: "p2", sessionPrefilled: false, dirty: false })).toBe(true);
    // p1's late response while p2 is being edited is ignored.
    expect(shouldPrefill({ loadedId: "p1", editingId: "p2", sessionPrefilled: false, dirty: false })).toBe(false);
  });
});

describe("projectFormValuesOf", () => {
  it("copies the project fields only", () => {
    const values = projectFormValuesOf({
      title: "Launch",
      description: "Ship it",
      due_date: "2026-12-01T00:00:00.000Z",
      colorLabel: "Mint",
      color: "#B5EAD7",
    });
    expect(values).toEqual({
      title: "Launch",
      description: "Ship it",
      due_date: "2026-12-01T00:00:00.000Z",
      colorLabel: "Mint",
      color: "#B5EAD7",
    });
    expect(Object.keys(values).sort()).toEqual(Object.keys(EMPTY_PROJECT_FORM).sort());
  });

  it("keeps an unset due date as null", () => {
    expect(projectFormValuesOf({ title: "", description: "", due_date: null, colorLabel: "", color: "" })).toEqual(
      EMPTY_PROJECT_FORM
    );
  });
});

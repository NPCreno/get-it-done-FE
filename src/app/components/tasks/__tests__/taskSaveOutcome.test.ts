import { describe, expect, it, vi } from "vitest";
import type { ApiFailure, ApiFailureKind } from "@/lib/apiClient";
import { createToastController } from "@/hooks/toastController";
import { outcomeOf, outcomeOfException, showToast, type SaveMode } from "../taskSaveOutcome";

const KINDS: ApiFailureKind[] = [
  "network",
  "timeout",
  "aborted",
  "unauthorized",
  "forbidden",
  "http",
  "api",
  "invalid_response",
  "invalid_request",
];
const SILENT: ApiFailureKind[] = ["aborted", "unauthorized"];
const MODES: SaveMode[] = ["create", "update"];
const failure = (kind: ApiFailureKind): ApiFailure => ({ ok: false, status: 0, kind, message: `${kind} message` });

describe("outcomeOf", () => {
  it.each(MODES)("%s success closes, resets and toasts with the fixed copy, never the server text", (mode) => {
    const o = outcomeOf(mode, { ok: true, data: { message: "from server" } });
    expect(o.close).toBe(true);
    expect(o.reset).toBe(true);
    expect(o.toast).toEqual({
      kind: "success",
      title: mode === "create" ? "Task Created" : "Task Updated",
      fallback: mode === "create" ? "Your new task has been created successfully" : "Your task has been updated successfully",
    });
  });

  it.each(MODES.flatMap((m) => KINDS.map((k) => [m, k] as const)))("%s failure %s keeps the modal open and the values", (mode, kind) => {
    const f = failure(kind);
    const o = outcomeOf(mode, { ok: false, failure: f });
    expect(o.close).toBe(false);
    expect(o.reset).toBe(false);
    expect(o.toast).toEqual(SILENT.includes(kind) ? null : { kind: "failure", failure: f });
  });

  it("an exception keeps the modal open and shows the generic toast", () => {
    const err = new Error("boom");
    expect(outcomeOfException(err)).toEqual({ close: false, reset: false, toast: { kind: "unexpected", error: err } });
  });
});

describe("showToast", () => {
  it("routes each intent to the page's controller with the existing shapes", () => {
    const c = createToastController();
    showToast(c, { kind: "success", title: "Task Created", fallback: "fb" });
    expect(c.getSnapshot().toast).toMatchObject({ title: "Task Created", description: "fb", className: "text-th-ok-t" });
    showToast(c, { kind: "failure", failure: failure("http") });
    expect(c.getSnapshot().toast).toMatchObject({ className: "text-th-danger-t" });
    showToast(c, { kind: "unexpected", error: new Error("x") });
    expect(c.getSnapshot().toast).toMatchObject({ title: "Something Went Wrong", description: "x" });
    const id = c.getSnapshot().id;
    showToast(c, null);
    expect(c.getSnapshot().id).toBe(id);
    c.dispose();
    vi.useRealTimers();
  });
});

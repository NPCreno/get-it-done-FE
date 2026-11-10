import { describe, expect, it } from "vitest";
import { applyPatch, planSubtaskStatus, planTaskStatus, revertPatch, type TaskLike } from "../optimistic";

const task = (id: string, status: TaskLike["status"], subs: [string, TaskLike["status"]][] = []): TaskLike => ({
  task_id: id,
  status,
  subInstances: subs.map(([sid, s]) => ({ taskSubInstance_id: sid, status: s })),
});

describe("applyPatch / revertPatch (pure)", () => {
  it("are immutable and keep identity when nothing changes", () => {
    const list = [task("A", "Pending"), task("B", "Pending")];
    const frozen = JSON.stringify(list);
    const next = applyPatch(list, { taskId: "A", task: { from: "Pending", to: "Complete" } })!;
    expect(JSON.stringify(list)).toBe(frozen);
    expect(next[0].status).toBe("Complete");
    expect(next[1]).toBe(list[1]);
    expect(applyPatch(list, { taskId: "Z", task: { from: "Pending", to: "Complete" } })).toBe(list);
    expect(applyPatch(undefined, { taskId: "A" })).toBeUndefined();
  });

  it("revert is a compare-and-swap: a value that is no longer `to` is left alone", () => {
    const patch = { taskId: "A", task: { from: "Pending", to: "Complete" } } as const;
    expect(revertPatch([task("A", "Complete")], patch)![0].status).toBe("Pending");
    // something later already moved it to Overdue: do not overwrite
    const later = [task("A", "Overdue")];
    expect(revertPatch(later, patch)).toBe(later);
  });

  it("revert only touches its own task and subtask", () => {
    const list = [task("A", "Complete", [["s1", "Complete"], ["s2", "Complete"]]), task("B", "Complete")];
    const patch = { taskId: "A", subtask: { id: "s1", from: "Pending", to: "Complete" } } as const;
    const out = revertPatch(list, patch)!;
    expect(out[0].subInstances!.map((s) => s.status)).toEqual(["Pending", "Complete"]);
    expect(out[1]).toBe(list[1]);
  });
});

describe("plans", () => {
  it("task status uses the cached current value, else the fallback, and skips no-ops", () => {
    expect(planTaskStatus(task("A", "Pending"), "A", "Complete")).toEqual({ taskId: "A", task: { from: "Pending", to: "Complete" } });
    expect(planTaskStatus(undefined, "A", "Complete", "Pending")).toEqual({ taskId: "A", task: { from: "Pending", to: "Complete" } });
    expect(planTaskStatus(task("A", "Complete"), "A", "Complete")).toEqual({ taskId: "A" });
  });

  it("completing the last open subtask completes the parent", () => {
    const t = task("T", "Pending", [["s1", "Complete"], ["s2", "Pending"]]);
    expect(planSubtaskStatus(t, "T", "s2", "Complete")).toEqual({
      taskId: "T",
      subtask: { id: "s2", from: "Pending", to: "Complete" },
      task: { from: "Pending", to: "Complete" },
    });
  });

  it("un-completing a subtask of a Complete parent sets the parent Pending", () => {
    const t = task("T", "Complete", [["s1", "Complete"], ["s2", "Complete"]]);
    expect(planSubtaskStatus(t, "T", "s1", "Pending")).toEqual({
      taskId: "T",
      subtask: { id: "s1", from: "Complete", to: "Pending" },
      task: { from: "Complete", to: "Pending" },
    });
  });

  it("a middle subtask leaves the parent alone; an unknown parent gives no parent change", () => {
    const t = task("T", "Pending", [["s1", "Pending"], ["s2", "Pending"]]);
    expect(planSubtaskStatus(t, "T", "s1", "Complete").task).toBeUndefined();
    expect(planSubtaskStatus(undefined, "T", "s1", "Complete")).toEqual({ taskId: "T" });
  });
});

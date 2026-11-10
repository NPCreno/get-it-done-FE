import { MutationObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/taskRequests", () => ({
  updateTaskStatus: vi.fn(),
  updateSubTaskStatus: vi.fn(),
  updateTaskApi: vi.fn(),
  createTaskApi: vi.fn(),
  deleteTaskApi: vi.fn(),
  deleteRecurringTasksApi: vi.fn(),
  createSubTaskApi: vi.fn(),
  deleteSubTaskApi: vi.fn(),
}));
vi.mock("@/app/api/projectsRequests", () => ({ createProject: vi.fn(), updateProject: vi.fn(), deleteProjectById: vi.fn() }));
vi.mock("@/app/api/userRequests", () => ({ updateUser: vi.fn() }));

import { updateSubTaskStatus, updateTaskApi, updateTaskStatus } from "@/app/api/taskRequests";
import { qk } from "../keys";
import { setSubTaskStatusOptions, setTaskStatusOptions } from "../mutations";
import type { TaskLike } from "../optimistic";
import { windowFor } from "../window";
import { deferred, failResult, flush, okResult, testClient } from "./helpers";

const U = "u1";
const LIST_KEY = qk.upcoming(U, windowFor(Date.parse("2026-11-10T10:00:00.000Z")));

const task = (id: string, status: TaskLike["status"], subs: [string, TaskLike["status"]][] = []): TaskLike => ({
  task_id: id,
  status,
  subInstances: subs.map(([sid, s]) => ({ taskSubInstance_id: sid, status: s })),
});

function seed(tasks: TaskLike[]) {
  const qc = testClient();
  qc.setQueryData(LIST_KEY, tasks);
  const get = () => qc.getQueryData<TaskLike[]>(LIST_KEY)!;
  const by = (id: string) => get().find((t) => t.task_id === id)!;
  return { qc, get, by };
}

type Result = ReturnType<typeof okResult> | ReturnType<typeof failResult>;
const mockTask = () => vi.mocked(updateTaskStatus);
const mockSub = () => vi.mocked(updateSubTaskStatus);

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("Q4: the project-view toggle uses the status endpoint", () => {
  it("setTaskStatus calls updateTaskStatus(taskId, status) and never updateTaskApi", async () => {
    const { qc } = seed([task("A", "Pending")]);
    mockTask().mockResolvedValueOnce(okResult(undefined) as never);
    const m = new MutationObserver(qc, setTaskStatusOptions(qc, U, "A"));
    await m.mutate({ taskId: "A", to: "Complete" });
    expect(mockTask()).toHaveBeenCalledTimes(1);
    expect(mockTask().mock.calls[0][0]).toBe("A");
    expect(mockTask().mock.calls[0][1]).toBe("Complete");
    expect(vi.mocked(updateTaskApi)).not.toHaveBeenCalled();
  });
});

describe("concurrent optimistic updates roll back per entity", () => {
  it("failing A reverts A only; B keeps its optimistic value, then is kept when it succeeds", async () => {
    const { qc, by } = seed([task("A", "Pending"), task("B", "Pending")]);
    const dA = deferred<Result>();
    const dB = deferred<Result>();
    mockTask().mockImplementation(((id: string) => (id === "A" ? dA.promise : dB.promise)) as never);
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const mA = new MutationObserver(qc, setTaskStatusOptions(qc, U, "A"));
    const mB = new MutationObserver(qc, setTaskStatusOptions(qc, U, "B"));
    const pA = mA.mutate({ taskId: "A", to: "Complete" }).catch(() => undefined);
    const pB = mB.mutate({ taskId: "B", to: "Complete" });
    await flush();
    expect(by("A").status).toBe("Complete");
    expect(by("B").status).toBe("Complete");

    dA.resolve(failResult("http"));
    await pA;
    expect(by("A").status).toBe("Pending"); // reverted
    expect(by("B").status).toBe("Complete"); // untouched, still pending on the server
    expect(invalidate).not.toHaveBeenCalled(); // B is still in flight: no mid-burst refetch

    dB.resolve(okResult(undefined));
    await pB;
    expect(by("B").status).toBe("Complete"); // kept
    expect(invalidate).toHaveBeenCalled(); // the last of the burst reconciles
  });
});

describe("subtask status failures", () => {
  const setup = () =>
    seed([task("T", "Pending", [["s1", "Complete"], ["s2", "Pending"]])]);

  it("a failed subtask call reverts the subtask AND the parent", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { qc, by } = setup();
    const d = deferred<Result>();
    mockSub().mockReturnValueOnce(d.promise as never);
    const m = new MutationObserver(qc, setSubTaskStatusOptions(qc, U, "T"));
    const p = m.mutate({ taskId: "T", subtaskId: "s2", to: "Complete" }).catch(() => undefined);
    await flush();
    expect(by("T").subInstances!.find((s) => s.taskSubInstance_id === "s2")!.status).toBe("Complete");
    expect(by("T").status).toBe("Complete"); // parent follows optimistically
    d.resolve(failResult("http"));
    await p;
    expect(by("T").subInstances!.find((s) => s.taskSubInstance_id === "s2")!.status).toBe("Pending");
    expect(by("T").status).toBe("Pending");
    expect(mockTask()).not.toHaveBeenCalled(); // parent never touched on the server
  });

  it("a failed parent call after the subtask succeeded reverts only the parent", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { qc, by } = setup();
    mockSub().mockResolvedValueOnce(okResult(undefined) as never);
    mockTask().mockResolvedValueOnce(failResult("http") as never);
    const m = new MutationObserver(qc, setSubTaskStatusOptions(qc, U, "T"));
    await m.mutate({ taskId: "T", subtaskId: "s2", to: "Complete" }).catch(() => undefined);
    expect(by("T").status).toBe("Pending"); // parent reverted
    // the subtask change is on the server and stays: the final invalidation reconciles
    expect(by("T").subInstances!.find((s) => s.taskSubInstance_id === "s2")!.status).toBe("Complete");
    expect(mockTask()).toHaveBeenCalledTimes(1);
    expect(mockTask().mock.calls[0].slice(0, 2)).toEqual(["T", "Complete"]);
  });

  it("completing the last subtask sends the subtask PATCH, then the parent PATCH", async () => {
    const { qc } = setup();
    const order: string[] = [];
    mockSub().mockImplementationOnce((async () => (order.push("sub"), okResult(undefined))) as never);
    mockTask().mockImplementationOnce((async () => (order.push("parent"), okResult(undefined))) as never);
    const m = new MutationObserver(qc, setSubTaskStatusOptions(qc, U, "T"));
    await m.mutate({ taskId: "T", subtaskId: "s2", to: "Complete" });
    expect(order).toEqual(["sub", "parent"]);
  });
});

describe("same-parent serialization (mutation scope)", () => {
  it("the second mutation on a parent starts only after the first settles", async () => {
    const { qc, by } = seed([task("T", "Pending", [["s1", "Pending"], ["s2", "Pending"]])]);
    const d1 = deferred<Result>();
    const events: string[] = [];
    mockTask().mockImplementationOnce((() => (events.push("task-start"), d1.promise)) as never);
    mockSub().mockImplementationOnce((async () => (events.push("sub-start"), okResult(undefined))) as never);
    // Pinned: a queued mutation's onMutate runs eagerly and sees the first one's optimistic
    // state (parent Complete), so un-completing the rule sends the parent back to Pending.
    mockTask().mockImplementationOnce((async () => (events.push("parent-start"), okResult(undefined))) as never);

    const m1 = new MutationObserver(qc, setTaskStatusOptions(qc, U, "T"));
    const m2 = new MutationObserver(qc, setSubTaskStatusOptions(qc, U, "T"));
    const p1 = m1.mutate({ taskId: "T", to: "Complete" });
    const p2 = m2.mutate({ taskId: "T", subtaskId: "s1", to: "Complete" });
    await flush();
    await flush();
    expect(events).toEqual(["task-start"]); // the subtask call is queued behind it

    d1.resolve(okResult(undefined));
    await Promise.all([p1, p2]);
    expect(events).toEqual(["task-start", "sub-start", "parent-start"]);
    expect(by("T").status).toBe("Pending");
    expect(by("T").subInstances!.find((s) => s.taskSubInstance_id === "s1")!.status).toBe("Complete");
  });
});

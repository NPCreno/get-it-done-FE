import { narrow, TASK_STATUSES, type TaskStatus } from "@/app/contracts/enums";
import type { ApiTransport, ApiTransportRequest } from "@/lib/apiTransport";
import * as analytics from "./analytics";
import type { Clock } from "./clock";
import { DAY_MS } from "./clock";
import * as crud from "./crud";
import { DEMO_USER_ID } from "./seed";
import type { DemoStore } from "./store";

/**
 * The fake backend's router. Matches `{method, full anchored path}` by pattern, specific
 * patterns before the generic `/tasks/:taskId`. Anything else is 501 (fails closed: it never
 * reaches the network). Responses use the real envelope `{status:'success', message, data}`.
 */
export const NOT_AVAILABLE = { status: 501, text: '{"message":"Not available in the demo"}' } as const;

type Res = { status: number; text: string };
interface Ctx {
  store: DemoStore;
  clock: Clock;
  params: Record<string, string>;
  query: NonNullable<ApiTransportRequest["query"]>;
  body: unknown;
}
interface Route {
  key: string;
  method: string;
  segments: string[];
  handle: (c: Ctx) => Res;
}

const json = (status: number, body: unknown): Res => ({ status, text: JSON.stringify(body) });
const envelope = (data: unknown, message: string): Res => json(200, { status: "success", message, data });
const fromOut = <T>(o: crud.Out<T>): Res =>
  o.ok ? envelope(o.data, o.message) : json(o.status, { statusCode: o.status, message: o.message });
const fail = (status: number, message: string): Res => json(status, { statusCode: status, message });

/** `:userId` must be the demo user; anything else is not yours. */
const ownUser = (c: Ctx): Res | null => (c.params.userId === DEMO_USER_ID ? null : fail(403, "Forbidden"));

const integer = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

const rangeOf = (c: Ctx): { start: number; end: number } | null => {
  const start = crud.parseInstant(c.query.startDate);
  const end = crud.parseInstant(c.query.endDate);
  return start === null || end === null || end < start ? null : { start, end };
};

const monthYear = (c: Ctx): { month: number; year: number } | null => {
  const month = integer(c.query.month, 1, 12);
  const year = integer(c.query.year, 1970, 9999);
  return month === null || year === null ? null : { month, year };
};

const r = (method: string, pattern: string, handle: Route["handle"]): Route => ({
  key: `${method} ${pattern}`,
  method,
  segments: pattern.split("/").filter(Boolean),
  handle,
});

export const ROUTES: readonly Route[] = [
  r("GET", "/projects/getAll/:userId", (c) =>
    ownUser(c) ?? envelope(c.store.projects.map((p) => crud.projectView(c.store, p)), "Projects fetched successfully")
  ),
  r("GET", "/tasks/getTasksByUser/:userId", (c) => {
    const w = rangeOf(c);
    if (!w) return fail(400, "Invalid startDate or endDate");
    return (
      ownUser(c) ??
      envelope(crud.tasksInWindow(c.store, w.start, w.end).map((t) => crud.taskView(c.store, t)), "Tasks fetched successfully")
    );
  }),
  r("GET", "/tasks/getDashboardData/:userId", (c) => {
    const w = rangeOf(c);
    if (!w) return fail(400, "Invalid startDate or endDate");
    return ownUser(c) ?? envelope(analytics.dashboardSummary(c.store, w.start, w.end), "Dashboard data retrieved successfully");
  }),
  r("GET", "/tasks/completion-trend/:userId", (c) => {
    const w = rangeOf(c);
    if (!w || w.end - w.start > 366 * DAY_MS) return fail(400, "Invalid startDate or endDate");
    return ownUser(c) ?? envelope(analytics.completionTrend(c.store, w.start, w.end), "Task completion trend retrieved successfully");
  }),
  r("GET", "/tasks/task-distribution/:userId", (c) => {
    const m = monthYear(c);
    if (!m) return fail(400, "Invalid month or year");
    return ownUser(c) ?? envelope(analytics.distribution(c.store, m.month, m.year), "Task distribution retrieved successfully");
  }),
  r("GET", "/tasks/calendar-heatmap/:userId", (c) => {
    const m = monthYear(c);
    if (!m) return fail(400, "Invalid month or year");
    return ownUser(c) ?? envelope(analytics.heatmap(c.store, m.month, m.year), "Calendar heatmap data retrieved successfully");
  }),
  r("GET", "/tasks/streak/:userId", (c) =>
    ownUser(c) ?? envelope(analytics.streak(c.store, c.clock), "Streak retrieved successfully")
  ),
  r("POST", "/tasks/create", (c) => fromOut(crud.createTask(c.store, c.clock, c.body))),
  r("POST", "/tasks/createSubTask", (c) => fromOut(crud.createSubTask(c.store, c.clock, c.body))),
  r("PATCH", "/tasks/update-task-status/:taskId/status/:status", (c) => {
    const status = narrow(TASK_STATUSES, c.params.status);
    if (!status) return fail(400, "Invalid status");
    return fromOut(crud.setTaskStatus(c.store, c.clock, c.params.taskId, status as TaskStatus));
  }),
  r("PATCH", "/tasks/update-subtask-status/:subId/status/:status", (c) => {
    const status = narrow(TASK_STATUSES, c.params.status);
    if (!status) return fail(400, "Invalid status");
    return fromOut(crud.setSubTaskStatus(c.store, c.clock, c.params.subId, status as TaskStatus));
  }),
  r("DELETE", "/tasks/subTask/:subId", (c) => fromOut(crud.deleteSubTask(c.store, c.params.subId))),
  r("DELETE", "/tasks/deleteRecurringTasks/:templateId", (c) => fromOut(crud.deleteRecurring(c.store, c.params.templateId))),
  // Generic routes last.
  r("PATCH", "/tasks/:taskId", (c) => fromOut(crud.updateTask(c.store, c.clock, c.params.taskId, c.body))),
  r("DELETE", "/tasks/:taskId", (c) => fromOut(crud.deleteTask(c.store, c.params.taskId))),
];

export const ROUTE_KEYS: readonly string[] = ROUTES.map((x) => x.key);

/** Each segment is decoded once (`apiPath` encodes them); null when malformed. */
function split(path: string): string[] | null {
  try {
    return path.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

export function matchRoute(method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const parts = split(path);
  if (!parts) return null;
  for (const route of ROUTES) {
    if (route.method !== method || route.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = route.segments.every((seg, i) => {
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = parts[i];
        return parts[i] !== "";
      }
      return seg === parts[i];
    });
    if (ok) return { route, params };
  }
  return null;
}

export interface DemoTransportOptions {
  /** Test mode: record the route key of every request in `hits`. */
  recordHits?: boolean;
  /** Awaited after the store is resolved and before the handler runs (tests hold requests open here). */
  beforeHandle?: (req: ApiTransportRequest) => Promise<void> | void;
}

export type DemoTransport = ApiTransport & { readonly hits: string[] };

/** `getStore` is called once per request, so a reset swaps the store for the next request only. */
export function createDemoTransport(getStore: () => DemoStore, clock: Clock, opts: DemoTransportOptions = {}): DemoTransport {
  const hits: string[] = [];
  const transport = async (req: ApiTransportRequest): Promise<Res> => {
    const store = getStore();
    const hit = matchRoute(req.method, req.path);
    if (opts.recordHits) hits.push(hit ? hit.route.key : `UNMATCHED ${req.method} ${req.path}`);
    if (!hit) return NOT_AVAILABLE;
    await opts.beforeHandle?.(req);
    if (req.signal.aborted) throw new Error("aborted");
    return hit.route.handle({ store, clock, params: hit.params, query: req.query ?? {}, body: req.body });
  };
  return Object.assign(transport, { hits });
}

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/app/context/FormProvider", () => ({
  useFormState: () => ({ isSidebarExpanded: true, sidebarAnimated: false }),
}));

import SidebarLink, { sidebarLinkLabel } from "../sidebarLink";
import { DashboardIcon } from "../icons/AppIcons";
import {
  cancelDelete,
  confirmDelete,
  DELETE_TASK_TITLE,
  deleteTaskDescription,
  requestDelete,
} from "../tasks/deleteConfirmState";
import { ProjectTaskSchema, TaskListItemSchema } from "@/app/contracts/responses";

describe("BUG-05 §1: deleting a task asks first", () => {
  it("request → confirm deletes exactly that task and closes", () => {
    const open = requestDelete(null, "task-1", "Write the brief");
    expect(open).toEqual({ taskId: "task-1", title: "Write the brief" });
    expect(confirmDelete(open)).toEqual({ next: null, deleteTaskId: "task-1" });
  });

  it("request → cancel deletes nothing", () => {
    requestDelete(null, "task-1", "Write the brief");
    expect(cancelDelete()).toEqual({ next: null, deleteTaskId: null });
    expect(confirmDelete(null).deleteTaskId).toBeNull();
  });

  it("a second request replaces the first (one dialog at a time)", () => {
    const first = requestDelete(null, "task-1", "A");
    expect(confirmDelete(requestDelete(first, "task-2", "B")).deleteTaskId).toBe("task-2");
  });

  it("copy: the title, cut at 60 characters", () => {
    expect(DELETE_TASK_TITLE).toBe("Delete this task?");
    expect(deleteTaskDescription("Write the brief")).toBe('"Write the brief" and its subtasks will be removed from your lists.');
    const long = "x".repeat(80);
    expect(deleteTaskDescription(long)).toBe(`"${"x".repeat(60)}…" and its subtasks will be removed from your lists.`);
    expect(deleteTaskDescription("   ")).toContain('"This task"');
  });

  it("no call site can delete without the confirm: useTaskDelete does not hand out deleteTask", () => {
    const root = join(__dirname, "..", "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== "__tests__" && name !== "node_modules") walk(p);
        } else if (/\.tsx?$/.test(name)) files.push(p);
      }
    };
    walk(root);
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /useTaskDelete\(/.test(src) && /\{[^}]*\bdeleteTask\b[^}]*\}\s*=\s*useTaskDelete\(/.test(src);
    });
    expect(offenders).toEqual([]);
    const hook = readFileSync(join(root, "components", "tasks", "useTaskDelete.ts"), "utf8");
    const returned = hook.slice(hook.lastIndexOf("return {"));
    expect(returned).not.toMatch(/^\s*deleteTask,/m);
    expect(returned).toMatch(/requestDelete,/);
  });
});

describe("BUG-05 §2: sidebar items are real links with one name", () => {
  const render = (props: Partial<Parameters<typeof SidebarLink>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(SidebarLink, { href: "/dashboard", icon: DashboardIcon, text: "Dashboard", ...props })
    );

  it("renders an <a href> with no menuitem role and decorative icons", () => {
    const html = render();
    expect(html).toMatch(/^<a [^>]*href="\/dashboard"/);
    expect(html).not.toContain("menuitem");
    expect(html).not.toMatch(/role=/);
    expect(html).not.toMatch(/tabindex/i);
    // RD-3: one inline SVG icon, hidden from screen readers, painted in currentColor (no <img>).
    expect(html).not.toContain("<img");
    expect([...html.matchAll(/<svg [^>]*aria-hidden="true"/g)]).toHaveLength(1);
    expect(html).toContain('fill="currentColor"');
  });

  it("its name is exactly the label (no aria-label without a badge); the active page is marked", () => {
    const html = render();
    expect(html).not.toContain("aria-label");
    expect(html.replace(/<[^>]+>/g, "")).toBe("Dashboard");
    expect(html).toContain('aria-current="page"');
    expect(render({ href: "/projects", text: "Projects" })).not.toContain("aria-current");
  });

  it("with a badge the name reads the count once", () => {
    const html = render({ href: "/projects", text: "Projects", badge: 3, badgeLabel: "unread chat messages" });
    expect(html).toContain('aria-label="Projects, 3 unread chat messages"');
    expect(sidebarLinkLabel("Projects", 120, "unread")).toBe("Projects, more than 99 unread");
    expect(sidebarLinkLabel("Projects", 0, "unread")).toBeUndefined();
  });
});

describe("BUG-05 §3: a task id is a string", () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    task_id: "task-1",
    title: "T",
    description: null,
    priority: "Low",
    status: "Pending",
    due_date: null,
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
    deletedAt: null,
    project_id: "PRJ-1",
  };

  it("the schemas accept a uuid string and reject a number", () => {
    expect(ProjectTaskSchema.safeParse(row).success).toBe(true);
    expect(ProjectTaskSchema.safeParse({ ...row, id: 7 }).success).toBe(false);
    const listRow = { ...row, user_id: "u", project_title: null, template_id: null, subInstances: [] };
    expect(TaskListItemSchema.safeParse(listRow).success).toBe(true);
    expect(TaskListItemSchema.safeParse({ ...listRow, id: 7 }).success).toBe(false);
  });
});

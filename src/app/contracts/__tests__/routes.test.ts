import { describe, expect, it } from "vitest";
import contract from "../api-contract.json";
import { subTaskStatusPath, taskStatusPath } from "../../api/paths";

// One encodeURIComponent per :param, the same rule apiPath applies.
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(values[name]));

const ID = "a/b c";
const ID_ENCODED = "a%2Fb%20c";

const builders: Record<string, { build: () => string; values: Record<string, string> }> = {
  taskStatus: {
    build: () => taskStatusPath(ID, "Complete"),
    values: { task_id: ID, status: "Complete" },
  },
  subTaskStatus: {
    build: () => subTaskStatusPath(ID, "Complete"),
    values: { taskSubInstance_id: ID, status: "Complete" },
  },
};

describe("request path builders match the vendored contract routes", () => {
  it("every contract route has a builder (and no builder is orphaned)", () => {
    expect(Object.keys(builders).sort()).toEqual(Object.keys(contract.routes).sort());
  });

  for (const [key, { build, values }] of Object.entries(builders)) {
    it(`${key}: builder output equals the filled contract template`, () => {
      const template = (contract.routes as Record<string, string>)[key];
      expect(build()).toBe(fill(template, values));
    });
  }

  it("encodes each value exactly once", () => {
    expect(taskStatusPath(ID, "Complete")).toBe(`/tasks/update-task-status/${ID_ENCODED}/status/Complete`);
    expect(subTaskStatusPath(ID, "Complete")).toBe(
      `/tasks/update-subtask-status/${ID_ENCODED}/status/Complete`
    );
    expect(taskStatusPath(ID, "Complete")).not.toContain("%25");
    expect(subTaskStatusPath(ID, "Complete")).not.toContain("%25");
  });
});

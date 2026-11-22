import { describe, expect, it } from "vitest";
import contract from "../api-contract.json";
import {
  chatMemberPath,
  chatMembersPath,
  chatMessagePath,
  chatMessagesPath,
  chatReadPath,
  chatSharedProjectsPath,
  chatUnreadPath,
  notificationReadPath,
  notificationsListPath,
  notificationsReadAllPath,
  subTaskStatusPath,
  taskStatusPath,
  apiTokenPath,
  apiTokensPath,
  oauthAuthorizeCheckPath,
  oauthAuthorizePath,
  oauthGrantPath,
  oauthGrantsPath,
  taskAssigneePath,
} from "../../api/paths";

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
  notificationsList: { build: () => notificationsListPath(), values: {} },
  notificationRead: { build: () => notificationReadPath(ID), values: { notif_id: ID } },
  notificationsReadAll: { build: () => notificationsReadAllPath(), values: {} },
  chatMembersList: { build: () => chatMembersPath(ID), values: { project_id: ID } },
  chatMemberAdd: { build: () => chatMembersPath(ID), values: { project_id: ID } },
  chatMemberRemove: { build: () => chatMemberPath(ID, "u/1"), values: { project_id: ID, user_id: "u/1" } },
  chatSharedProjects: { build: () => chatSharedProjectsPath(), values: {} },
  chatMessagesList: { build: () => chatMessagesPath(ID), values: { project_id: ID } },
  chatMessageSend: { build: () => chatMessagesPath(ID), values: { project_id: ID } },
  chatMessageDelete: { build: () => chatMessagePath(ID, "m 1"), values: { project_id: ID, id: "m 1" } },
  chatUnread: { build: () => chatUnreadPath(), values: {} },
  chatMarkRead: { build: () => chatReadPath(ID), values: { project_id: ID } },
  tokensList: { build: () => apiTokensPath(), values: {} },
  tokenCreate: { build: () => apiTokensPath(), values: {} },
  tokenRevoke: { build: () => apiTokenPath(ID), values: { id: ID } },
  // FEAT-07d OAuth consent and connected apps
  oauthAuthorizeCheck: { build: () => oauthAuthorizeCheckPath(), values: {} },
  oauthAuthorize: { build: () => oauthAuthorizePath(), values: {} },
  oauthGrantsList: { build: () => oauthGrantsPath(), values: {} },
  oauthGrantRevoke: { build: () => oauthGrantPath(ID), values: { id: ID } },
  // FEAT-09 shared tasks
  taskAssignee: { build: () => taskAssigneePath(ID), values: { task_id: ID } },
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

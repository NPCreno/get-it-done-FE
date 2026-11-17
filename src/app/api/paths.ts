import { apiPath } from "@/lib/apiClient";
import type { TaskStatus } from "@/app/contracts/enums";

// Pure path builders, checked against the vendored contract's `routes` by
// contracts/__tests__/routes.test.ts. Values are passed raw: apiPath encodes each once.
export const taskStatusPath = (taskId: string, status: TaskStatus) =>
  apiPath`/tasks/update-task-status/${taskId}/status/${status}`;

export const subTaskStatusPath = (taskSubInstanceId: string, status: TaskStatus) =>
  apiPath`/tasks/update-subtask-status/${taskSubInstanceId}/status/${status}`;

export const notificationsListPath = () => "/notifications";

export const notificationReadPath = (notifId: string) => apiPath`/notifications/${notifId}/read`;

export const notificationsReadAllPath = () => "/notifications/read-all";

// FEAT-05 chat: its own `/chat` prefix, so nothing collides with `/projects/:project_id`.
export const chatMembersPath = (projectId: string) => apiPath`/chat/projects/${projectId}/members`;

export const chatMemberPath = (projectId: string, userId: string) =>
  apiPath`/chat/projects/${projectId}/members/${userId}`;

export const chatSharedProjectsPath = () => "/chat/shared-projects";

export const chatMessagesPath = (projectId: string) => apiPath`/chat/projects/${projectId}/messages`;

export const chatMessagePath = (projectId: string, messageId: string) =>
  apiPath`/chat/projects/${projectId}/messages/${messageId}`;

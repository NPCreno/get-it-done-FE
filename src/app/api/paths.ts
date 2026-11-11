import { apiPath } from "@/lib/apiClient";
import type { TaskStatus } from "@/app/contracts/enums";

// Pure path builders, checked against the vendored contract's `routes` by
// contracts/__tests__/routes.test.ts. Values are passed raw: apiPath encodes each once.
export const taskStatusPath = (taskId: string, status: TaskStatus) =>
  apiPath`/tasks/update-task-status/${taskId}/status/${status}`;

export const subTaskStatusPath = (taskSubInstanceId: string, status: TaskStatus) =>
  apiPath`/tasks/update-subtask-status/${taskSubInstanceId}/status/${status}`;

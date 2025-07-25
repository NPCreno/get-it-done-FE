import { ITask } from "../ITask";

export interface ITaskResponse {
    status: string;
    message: string;
    data: ITask | ITask[];
    error?: string | undefined;
}
  
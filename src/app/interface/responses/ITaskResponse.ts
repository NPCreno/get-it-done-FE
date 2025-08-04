import { ISubTask } from "../ISubTask";
import { ITask } from "../ITask";

export interface ITaskResponse {
    status: string;
    message: string;
    data: ITask | ITask[] | ISubTask | ISubTask[];
    error?: string | undefined;
}
  
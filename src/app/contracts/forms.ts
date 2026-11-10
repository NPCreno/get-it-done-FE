/**
 * Form value types. Forms hold what inputs hold (strings), so enums are plain
 * strings here and dates are ISO strings or null. Mappers (mappers.ts) turn
 * these into transport requests; they never contain `user_id` because the
 * backend takes the owner from the token.
 */
export type IsoDate = string;

export interface TaskFormValues {
  project_id: string;
  project_title: string;
  project_color: string;
  project: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: IsoDate | null;
  isRecurring: boolean;
  repeat_every: string;
  repeat_days: string[];
  start_date: IsoDate | null;
  end_date: IsoDate | null;
  task_id?: string;
}

export interface ProjectFormValues {
  title: string;
  description: string;
  color: string;
  colorLabel: string;
  due_date: IsoDate | null;
}

/** The projects page edits projects and tasks with one form. */
export type ProjectOrTaskFormValues = TaskFormValues & ProjectFormValues;

export interface SubTaskFormValues {
  title: string;
  task_id: string;
  due_date: IsoDate | null;
  status: string;
}

export interface ProfileFormValues {
  fullname: string;
  username: string;
  password: string;
  enableNotifications: boolean;
  soundFx: boolean;
  theme?: string;
}

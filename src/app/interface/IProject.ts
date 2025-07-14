export interface IProject {
    title: string;
    description: string;
    due_date: Date;
    tasks: number;
    project_id?: string;
    color?: string;
    task_count?: number;
    task_completed?: number;
    completed_tasks?: number; // Keeping for backward compatibility
    updatedAt?: string;
    createdAt?: string;
    colorLabel?: string;
  }
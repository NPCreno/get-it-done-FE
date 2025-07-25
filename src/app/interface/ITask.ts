export interface ITask {
    project_id: string;
    task_id: string;
    title: string;
    description: string;
    due_date: Date;
    status: string;
    priority: string;
    project_title?: string;
    template_id?: string;
}

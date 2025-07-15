export interface IUpdateProjectResponse {
    status: string;
    message: string;
    data: {
      id: number;
      project_id: string;
      title: string;
      description: string;
      color: string;
      colorLabel: string;
      due_date: string | null;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      user_id: string;
    };
  }
  
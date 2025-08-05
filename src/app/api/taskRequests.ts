import { CreateSubTaskDto } from "../interface/dto/create-subTask-dto";
import { CreateTaskDto } from "../interface/dto/create-task-dto";
import { UpdateTaskDto } from "../interface/dto/update-task-dto";
import { getAccessToken } from "../utils/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL

export const createTaskApi = async (payload: CreateTaskDto) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/create`, 
        { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error creating task:', err);
    throw err;
  }
};

export const updateTaskApi = async (payload: UpdateTaskDto) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/${payload.task_id}`, 
        { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error updating task:', err);
    throw err;
  }
};

export const deleteTaskApi = async (taskId: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/${taskId}`, 
        { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error deleting task:', err);
    throw err;
  }
};

export const deleteSubTaskApi = async (taskSubInstance_id: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/subTask/${taskSubInstance_id}`, 
        { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error deleting task:', err);
    throw err;
  }
};

export const deleteRecurringTasksApi = async (taskTemplate_id: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/deleteRecurringTasks/${taskTemplate_id}`, 
        { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete recurring tasks');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error deleting recurring tasks:', err);
    throw err;
  }
};

export const getTasksByUser= async (userId: string, startDate: string, endDate: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/getTasksByUser/${userId}?startDate=${startDate}&endDate=${endDate}`, 
        { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },

    });
    if (response.ok) {
      data = await response.json();
    }
    else{
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    console.error('Error getting tasks by user:', err);
    throw err;
  }
};

export const getTasksByProject= async (project_id: string, startDate: string, endDate: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/getTasksByProj/${project_id}?startDate=${startDate}&endDate=${endDate}`, 
        { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },

    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error getting tasks by project:', err);
    throw err;
  }
};

export const getDashboardData= async (userId: string, startDate: string, endDate: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/getDashboardData/${userId}?startDate=${startDate}&endDate=${endDate}`, 
        { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },

    });
    if (response.ok) {
      data = await response.json();
    }
    else{
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) { 
    console.error('Error getting dashboard data:', err);
    throw err;
  }
};

export const getTaskCompletionTrend= async (userId: string, startDate: string, endDate: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/completion-trend/${userId}?startDate=${startDate}&endDate=${endDate}`, 
        { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },

    });
    if (response.ok) {
      data = await response.json();
    }
    else{
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    console.error('Error getting task completion trend:', err);
    throw err;
  }
};

export const getTaskDistributionData= async (userId: string, month: string, year: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/task-distribution/${userId}?month=${month}&year=${year}`, 
        { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },

    });
    if (response.ok) {
      data = await response.json();
    }
    else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    console.error('Error getting task distribution data:', err);
    throw err;
  }
};

export const getCalendarHeatmap = async (userId: string, month: string, year: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/calendar-heatmap/${userId}?month=${month}&year=${year}`, 
    { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      // For new users without any tasks, return an empty array
      return { data: [] };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error getting calendar heatmap data:', err);
    // Return empty data structure instead of throwing error
    return { data: [] };
  }
};

export const getStreakCount = async (userId: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/streak/${userId}`, 
    { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      // For new users without any tasks, return 0 streak
      return { data: { count: 0 } };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching streak count:', err);
    // Return 0 streak in case of any error
    return { data: { count: 0 } };
  }
};

export const updateTaskStatus= async (taskId: string, status: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/update-task-status/${taskId}/status/${status}`, 
        { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      data = await response.json();
    }
    else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    console.error('Error updating task status:', err);
    throw err;
  }
};

export const updateSubTaskStatus= async (taskSubInstance_id: string, status: string) => {
  try {
    const token = getAccessToken();
    let data;
    const response = await fetch(`${apiUrl}/tasks/update-subtask-status/${taskSubInstance_id}/status/${status}`, 
        { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      data = await response.json();
    }
    else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    return data;
  } catch (err) {
    console.error('Error updating task status:', err);
    throw err;
  }
};

export const createSubTaskApi = async (payload: CreateSubTaskDto) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/tasks/createSubTask`, 
        { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error creating task:', err);
    throw err;
  }
};

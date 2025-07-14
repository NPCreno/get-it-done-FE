import { CreateProjectDto } from "../interface/dto/create-project-dto";
import { UpdateProjectDto } from "../interface/dto/update-project-dto";
import { getAccessToken } from "../utils/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL


export const createProject = async (payload: CreateProjectDto) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/projects/create`, 
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
    console.error('Error creating user:', err);
    throw err;
  }
};

export const getProjectsForUser = async (userId: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/projects/getAll/${userId}`, 
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
    console.error('Error creating user:', err);
    throw err;
  }
};

export const getProjectById = async (projectId: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/projects/${projectId}`, 
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
    console.error('Error creating user:', err);
    throw err;
  }
};

export const updateProject = async (payload: UpdateProjectDto) => {
  try {
    const token = getAccessToken();
    
    // Create a clean payload with only the fields defined in UpdateProjectDto
    const cleanPayload: Partial<UpdateProjectDto> = {
      title: payload.title,
      description: payload.description,
      due_date: payload.due_date,
      color: payload.color,
      project_id: payload.project_id,
      colorLabel: payload.colorLabel
    };

    const response = await fetch(`${apiUrl}/projects/${payload.project_id}`, 
    { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(cleanPayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update project');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error updating project:', err);
    throw err;
  }
};


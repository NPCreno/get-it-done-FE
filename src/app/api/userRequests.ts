import { CreateUserDto } from "../interface/dto/create-user-dto";
import { UpdateUserDto } from "../interface/dto/update-user-dto";
import { getAccessToken } from "../utils/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL

export const createUser = async (payload: CreateUserDto) => {
  try {
    const response = await fetch(`${apiUrl}/user/create`, 
        { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

export const loginEmail = async (email: string, password: string, rememberMe: boolean) => {
  try {
    const payload = {
      email,
      password,
      rememberMe
    };

    const response = await fetch(`${apiUrl}/user/loginEmail`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error logging in using email:', err);
    throw err;
  }
};

export const loginUsername = async (username: string, password: string, rememberMe: boolean) => {
  try {
    const payload = {
      username,
      password,
      rememberMe
    };

    const response = await fetch(`${apiUrl}/user/loginUsername`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error logging in using username:', err);
    throw err;
  }
};

export const getUser = async (userId: string) => {
  try {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/user/get/${userId}`, 
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
    console.error('Error getting user:', err);
    throw err;
  }
};

export const updateUser = async (userid: string, payload: UpdateUserDto) => {
  try {
    const token = getAccessToken();
    // Remove fields with empty string values
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== "")
    );
    const response = await fetch(`${apiUrl}/user/update/${userid}`, 
        { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(cleanedPayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update user');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

import { CreateUserDto } from "../interface/dto/create-user-dto";
import { UpdateUserDto } from "../interface/dto/update-user-dto";
import { IUser } from "../interface/IUser";
import { apiClient, apiPath } from "@/lib/apiClient";

export const createUser = (payload: CreateUserDto) =>
  apiClient("/user/create", {
    method: "POST",
    body: payload,
    auth: false,
    fallbackError: "Failed to create account",
  });

// The backend returns the raw user here, not an envelope.
export const getUser = (userId: string) =>
  apiClient<IUser>(apiPath`/user/get/${userId}`, {
    expect: "raw",
    fallbackError: "Failed to load user",
  });

export const updateUser = (userid: string, payload: UpdateUserDto) => {
  // Remove fields with empty string values
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "")
  );
  return apiClient(apiPath`/user/update/${userid}`, {
    method: "PATCH",
    body: cleanedPayload,
    expect: "raw",
    fallbackError: "Failed to update profile",
  });
};

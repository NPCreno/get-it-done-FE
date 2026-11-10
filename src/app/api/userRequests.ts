import { apiClient, apiPath } from "@/lib/apiClient";
import { UserSchema } from "../contracts/responses";
import { CreateUserRequestSchema, UpdateUserRequestSchema } from "../contracts/requests";
import type { CreateUserDraft } from "../contracts/mappers";
import type { UpdateUserRequest } from "../contracts/requests";

export const createUser = (payload: CreateUserDraft) =>
  apiClient("/user/create", {
    method: "POST",
    body: payload,
    requestSchema: CreateUserRequestSchema,
    auth: false,
    fallbackError: "Failed to create account",
  });

// The backend returns the raw user here, not an envelope.
export const getUser = (userId: string) =>
  apiClient(apiPath`/user/get/${userId}`, {
    expect: "raw",
    schema: UserSchema,
    fallbackError: "Failed to load user",
  });

export const updateUser = (userid: string, payload: UpdateUserRequest) =>
  apiClient(apiPath`/user/update/${userid}`, {
    method: "PATCH",
    body: payload,
    requestSchema: UpdateUserRequestSchema,
    expect: "raw",
    fallbackError: "Failed to update profile",
  });

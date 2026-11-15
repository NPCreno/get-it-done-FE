import { apiClient, apiPath } from "@/lib/apiClient";
import { LIMITS } from "../contracts/common";
import { NotificationsPageSchema } from "../contracts/responses";
import { notificationReadPath, notificationsListPath, notificationsReadAllPath } from "./paths";

export const NOTIFICATIONS_PAGE_SIZE = 50;
if (NOTIFICATIONS_PAGE_SIZE > LIMITS.notificationsPageMax) throw new Error("page size exceeds the contract maximum");

/** `cursor` is opaque: pass back exactly what the previous page returned. */
export const getNotificationsPage = (cursor: string | undefined, opts?: { signal?: AbortSignal }) =>
  apiClient(notificationsListPath(), {
    query: { limit: NOTIFICATIONS_PAGE_SIZE, cursor },
    schema: NotificationsPageSchema,
    signal: opts?.signal,
    fallbackError: "Failed to load notifications",
  });

export const markNotificationRead = (notifId: string) =>
  apiClient(notificationReadPath(notifId), { method: "PATCH", fallbackError: "Failed to mark notification as read" });

export const markAllNotificationsRead = () =>
  apiClient(notificationsReadAllPath(), { method: "PATCH", fallbackError: "Failed to mark notifications as read" });

/** The owner is the token, but the route still carries the id (checked by the backend). */
export const clearNotifications = (userId: string) =>
  apiClient(apiPath`/notifications/clear/${userId}`, {
    method: "DELETE",
    expect: "none",
    fallbackError: "Failed to clear notifications",
  });

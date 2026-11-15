import { NOTIFICATION_TYPES, type NotificationType } from "@/app/contracts/enums";

/**
 * Where a notification leads, decided HERE and never by backend data. Every
 * type is `null` today: the old backend paths (/achievements, /rewards, ...)
 * are not FE routes. Acknowledging only marks the notification read.
 */
export const NOTIFICATION_ACTION_ROUTES: Record<NotificationType, string | null> = {
  achievement: null,
  milestone: null,
  streak: null,
  levelUp: null,
  reward: null,
  taskDue: null,
};

export function routeForNotification(type: string): string | null {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type)
    ? NOTIFICATION_ACTION_ROUTES[type as NotificationType]
    : null;
}

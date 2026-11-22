import { NOTIFICATION_TYPES, type NotificationType } from "@/app/contracts/enums";

/**
 * Where a notification leads, decided HERE and never by backend data. The old
 * backend paths (/achievements, /rewards, ...) are not FE routes, so those types
 * are `null` and acknowledging only marks them read. FEAT-09: an assignment leads
 * to the projects page.
 */
export const NOTIFICATION_ACTION_ROUTES: Record<NotificationType, string | null> = {
  achievement: null,
  milestone: null,
  streak: null,
  levelUp: null,
  reward: null,
  taskDue: null,
  assignment: "/projects",
};

export function routeForNotification(type: string): string | null {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type)
    ? NOTIFICATION_ACTION_ROUTES[type as NotificationType]
    : null;
}

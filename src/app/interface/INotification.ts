import type { Notification } from "@/app/contracts/responses";

/** The notification card's props: the zod-derived item plus display and handlers. */
export interface INotificationProps {
  notification: Notification;
  /** Relative time, already formatted. */
  time: string;
  onMarkRead: (notifId: string) => void;
  pending?: boolean;
}

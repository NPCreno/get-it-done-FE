import type { Notification, NotificationsPage } from "@/app/contracts/responses";

/** The shape TanStack's infinite query stores. */
export interface NotificationPages {
  pages: NotificationsPage[];
  pageParams: unknown[];
}

/**
 * Marks ONE notification read and lowers unread_count on the first page, only
 * if it was unread. Returns the same object when nothing changed.
 */
export function applyRead(data: NotificationPages | undefined, id: string): NotificationPages | undefined {
  return setRead(data, id, true);
}

/**
 * Compare-and-swap rollback: restores unread only where this id is currently
 * read, so another mutation's change to a different row is never touched.
 */
export function revertRead(data: NotificationPages | undefined, id: string): NotificationPages | undefined {
  return setRead(data, id, false);
}

function setRead(data: NotificationPages | undefined, id: string, to: boolean): NotificationPages | undefined {
  if (!data) return data;
  let flipped = false;
  const pages = data.pages.map((page) => {
    let changed = false;
    const items = page.items.map((n): Notification => {
      if (n.notif_id !== id || n.read === to) return n;
      changed = true;
      return { ...n, read: to };
    });
    if (!changed) return page;
    flipped = true;
    return { ...page, items };
  });
  if (!flipped) return data;
  const delta = to ? -1 : 1;
  pages[0] = { ...pages[0], unread_count: Math.max(0, pages[0].unread_count + delta) };
  return { ...data, pages };
}

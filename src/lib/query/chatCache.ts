import type { ChatMessage, ChatMessagesPage } from "@/app/contracts/responses";

/** The shape TanStack's infinite query stores. Page 0 holds the NEWEST messages. */
export interface ChatMessagePages {
  pages: ChatMessagesPage[];
  pageParams: unknown[];
}

const has = (data: ChatMessagePages, id: string) => data.pages.some((p) => p.items.some((m) => m.id === id));

/**
 * Adds one message to the newest page. Idempotent by id: our own send arrives
 * once from the REST response and again from the socket. Nothing loaded yet
 * means nothing to patch (the first fetch will include it).
 */
export function addMessage(data: ChatMessagePages | undefined, message: ChatMessage): ChatMessagePages | undefined {
  if (!data || data.pages.length === 0 || has(data, message.id)) return data;
  const [first, ...rest] = data.pages;
  return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
}

/** Removes one message wherever it is. Returns the same object when it is not there. */
export function removeMessage(data: ChatMessagePages | undefined, id: string): ChatMessagePages | undefined {
  if (!data || !has(data, id)) return data;
  return {
    ...data,
    pages: data.pages.map((p) => (p.items.some((m) => m.id === id) ? { ...p, items: p.items.filter((m) => m.id !== id) } : p)),
  };
}

/** For display: oldest at the top, each id once. */
export function oldestFirst(data: ChatMessagePages | undefined): ChatMessage[] {
  if (!data) return [];
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const page of data.pages) {
    for (const m of page.items) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out.reverse();
}

/** Only a successful, fully empty history is "empty". */
export const isEmptyChat = (data: ChatMessagePages): boolean => data.pages.every((p) => p.items.length === 0);

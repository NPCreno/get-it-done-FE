import { formatUnread, unreadLabel } from "@/lib/query/chatUnread";

/**
 * FEAT-08: a small unread-chat count. Nothing at 0; "99+" above 99. The visible number is hidden
 * from screen readers and the accessible name says what it counts.
 */
export default function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  const text = formatUnread(count);
  if (!text) return null;
  return (
    <span
      className={`inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-error-default px-1 font-lato text-[10px] font-bold leading-none text-white ${className}`}
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{unreadLabel(count)}</span>
    </span>
  );
}

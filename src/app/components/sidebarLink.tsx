"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormState } from "../context/FormProvider";

/**
 * The link's accessible name when it carries a badge ("Projects, 3 unread chat messages"); without
 * a badge the visible label is the name, so nothing is set. Pure, for tests.
 */
export function sidebarLinkLabel(text: string, badge: number, badgeLabel: string): string | undefined {
  return badge > 0 ? `${text}, ${badge > 99 ? "more than 99" : badge} ${badgeLabel}` : undefined;
}

/**
 * One sidebar item (BUG-05): a real Next `<Link>`, so Enter, middle-click and "open in new tab"
 * work natively. The icons are decorative (`alt=""`), so the name is read once.
 */
export default function SidebarLink({
  href,
  icon,
  iconHover,
  text,
  onClick,
  forceShowText = false,
  className = "",
  badge = 0,
  badgeLabel = "unread",
}: {
  href: string;
  icon: string;
  iconHover: string;
  text: string;
  /** Runs before navigation (the mobile drawer closes itself). */
  onClick?: () => void;
  forceShowText?: boolean;
  className?: string;
  /** Unread count; hidden at 0. */
  badge?: number;
  /** What the badge counts, for the link's accessible name ("Projects, 3 unread chat messages"). */
  badgeLabel?: string;
}) {
  const { isSidebarExpanded, sidebarAnimated } = useFormState();
  // The mobile drawer always shows its labels; the desktop labels follow the toggle (UX-02).
  const showText = forceShowText || isSidebarExpanded;
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      title={showText ? undefined : text}
      className={`flex items-center gap-2 rounded-[10px] h-[35px] w-full flex-shrink-0 justify-start linkbtn cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2
        ${isActive
          ? "bg-th-acc shadow-[0px_4px_10.9px_0px_rgba(0,_0,_0,0.25)]"
          : "hover:bg-th-acc-wash"
        } ${className}`}
      aria-current={isActive ? "page" : undefined}
      aria-label={sidebarLinkLabel(text, badge, badgeLabel)}
    >
      <span className="relative ml-2 w-5 h-5 flex-shrink-0">
        {badge > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-2 -right-2 z-10 min-w-[16px] h-4 px-1 rounded-full bg-error-default text-white text-[10px] leading-4 text-center font-bold"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        <Image
          src={icon}
          alt=""
          width={20}
          height={20}
          className={`absolute transition-opacity duration-300 ${isActive ? "opacity-0" : "opacity-100"}`}
        />
        <Image
          src={iconHover}
          alt=""
          width={20}
          height={20}
          className={`absolute transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      {/* Always rendered (clipped by the collapsed panel, never display:none), so the link keeps
          its name; a short fade stops letters being cut mid-glyph at rest. */}
      <span
        className={`font-bold font-lato text-[13px] ml-2 whitespace-nowrap transition-opacity duration-150
            ${sidebarAnimated ? "motion-reduce:transition-none" : "!transition-none"}
            ${showText ? "opacity-100 delay-100" : "opacity-0"}
            ${isActive ? "text-th-on-acc" : "text-th-acc-t"}
          `}
      >
        {text}
      </span>
    </Link>
  );
}

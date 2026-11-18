"use client";
import { useFormState } from "../context/FormProvider";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function SidebarLink({
  href,
  icon,
  iconHover,
  text,
  onClick,
  forceShowText = false,
  className = "",
  badge = 0,
}: {
  href: string;
  icon: string;
  iconHover: string;
  text: string;
  onClick?: () => void;
  forceShowText?: boolean;
  className?: string;
  /** Unread count; hidden at 0. */
  badge?: number;
}) {
  const { isSidebarExpanded, sidebarAnimated } = useFormState();
  // The mobile drawer always shows its labels; the desktop labels follow the toggle (UX-02).
  const showText = forceShowText || isSidebarExpanded;
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine if current route matches the link's href
  const isActive = pathname === href;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Call the provided onClick handler if it exists
    if (onClick) {
      onClick();
    }
    
    // Navigate to the new route
    router.push(href);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={showText ? undefined : text}
      className={`flex items-center gap-2 rounded-[10px] h-[35px] w-full flex-shrink-0 justify-start linkbtn cursor-pointer
        ${isActive 
          ? "bg-primary-default shadow-[0px_4px_10.9px_0px_rgba(0,_0,_0,0.25)]" 
          : "hover:bg-primary-default/10"
        } ${className}`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={badge > 0 ? `${text}, ${badge} unread` : undefined}
    >
      <div className="relative ml-2 w-5 h-5 flex-shrink-0">
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
          alt={text}
          width={20}
          height={20}
          className={`absolute transition-opacity duration-300 ${isActive ? 'opacity-0' : 'opacity-100'}`}
        />
        <Image
          src={iconHover}
          alt={text}
          width={20}
          height={20}
          className={`absolute transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      {/* Always rendered (clipped by the collapsed panel, never display:none), so the link keeps
          its name; a short fade stops letters being cut mid-glyph at rest. */}
      <span
        className={`font-bold font-lato text-[13px] ml-2 whitespace-nowrap transition-opacity duration-150
            ${sidebarAnimated ? "motion-reduce:transition-none" : "!transition-none"}
            ${showText ? "opacity-100 delay-100" : "opacity-0"}
            ${isActive ? "text-white" : "text-primary-default"}
          `}
      >
        {text}
      </span>
    </div>
  );
}

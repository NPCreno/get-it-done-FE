"use client";
import { useFormStore } from "../store/useFormStore";
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
}: {
  href: string;
  icon: string;
  iconHover: string;
  text: string;
  onClick?: () => void;
  forceShowText?: boolean;
  className?: string;
}) {
  const { isSidebarOpen } = useFormStore();
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
      className={`flex items-center gap-2 rounded-[10px] h-[35px] ${isActive ? "w-full" : "w-[35px]"} justify-start 
        group-hover:w-[126px] transition-all duration-300 linkbtn cursor-pointer
        ${isActive 
          ? "bg-primary-default shadow-[0px_4px_10.9px_0px_rgba(0,_0,_0,0.25)]" 
          : "hover:bg-primary-default/10"
        } ${className}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative ml-2 w-5 h-5 flex-shrink-0">
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
      <span
        className={`font-bold font-lato text-[13px] transition-all duration-300 whitespace-nowrap
            ${(isSidebarOpen || forceShowText) ? "opacity-100 w-auto ml-2" : "opacity-0 w-0 ml-0"}
            ${isActive ? "text-white" : "text-primary-default"}
            ${forceShowText ? '!opacity-100 !w-auto !ml-2' : ''}
          `}
      >
        {text}
      </span>
    </div>
  );
}

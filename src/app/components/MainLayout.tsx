"use client";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import HamburgerButton from "./HamburgerButton";
import { useFormState } from "@/app/context/FormProvider";
import { getAccessToken, parseJwt } from "../utils/utils";
import { useProfile } from "@/lib/query/queries";
import { shallowEqual } from "../utils/shallowEqual";
import { useNotificationStream } from "@/lib/useNotificationStream";
import { sidebarWrapperWidth } from "./sidebarWidths";
import { MAIN_LAYOUT_ROOT_CLASS, MAIN_LAYOUT_SCROLL_CLASS } from "./mainLayoutClasses";
import ServerWakeBanner from "./ServerWakeBanner";
import { useAppearance, useAppearanceCookie } from "@/hooks/useAppearance";
import { withCookieAppearance } from "@/lib/appearance";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    isSidebarExpanded,
    sidebarAnimated,
    isMobileSidebarOpen, 
    closeMobileSidebar, 
    setUserData, 
  } = useFormState();
  const { isDark } = useAppearance();
  const appearanceCookie = useAppearanceCookie();
  const [isMobile, setIsMobile] = useState(false);

  // Check if the screen is mobile size on mount and on resize with debounce
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint is 768px
    };

    // Initial check
    checkIfMobile();

    // Debounce the resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkIfMobile, 100);
    };

    const controller = new AbortController();
    const { signal } = controller;
    
    // Add event listener with signal for cleanup
    window.addEventListener('resize', handleResize, { signal });

    // Clean up
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Close mobile sidebar when clicking on main content
  const handleMainContentClick = () => {
    if (isMobile && isMobileSidebarOpen) {
      closeMobileSidebar();
    }
  };

  // The profile query owns the fetch (deduplicated and cached across pages). The
  // context user is replaced only when a field actually changed.
  useNotificationStream();
  const profile = useProfile();
  useEffect(() => {
    const token = getAccessToken();
    const jwtUser = token ? parseJwt(token)?.user : null;
    // RD-1: the token's copy of the user can predate the last appearance change; the cookie is current.
    if (jwtUser && jwtUser.user_id) setUserData((prev) => prev ?? withCookieAppearance(jwtUser, appearanceCookie));
    // Seeds once per mount: a later cookie change comes with the fresh profile anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserData]);
  useEffect(() => {
    if (profile.data) {
      const fresh = profile.data;
      setUserData((prev) => (shallowEqual(prev, fresh) ? prev : fresh));
    }
  }, [profile.data, setUserData]);

  return (
    // RD-1 shell on tokens: the background comes from <html data-mode>, so it is right on the first frame.
    <div className={`${MAIN_LAYOUT_ROOT_CLASS} bg-th-page`}>
      {/* Desktop Sidebar - Hidden on mobile. Its toggle (not hover) sets the width; the content
          moves once, together with the panel (UX-02). */}
      <div 
        className={`hidden md:block flex-shrink-0 p-5 h-screen ${
          sidebarAnimated ? "transition-[width] duration-150 ease-out motion-reduce:transition-none" : ""
        }`}
        style={{ width: `${sidebarWrapperWidth(isSidebarExpanded)}px` }}
      >
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      {/* Click-away convenience for the mobile menu; keyboard users close it with Esc or its close button. */}
      <div 
        role="presentation"
        className="flex-1 transition-all duration-150 h-screen overflow-auto"
        onClick={handleMainContentClick}
      >
        {/* Hamburger Button - Only visible on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <HamburgerButton />
        </div>
        
        {/* `relative` (BUG-06): keeps absolute children such as `sr-only` captions inside this box. */}
        <div className={MAIN_LAYOUT_SCROLL_CLASS}>
          <div className="p-4 md:p-6 flex-1">
            {/* UX-03: in the flow above the page, inside the scroll box, so the sidebar never moves. */}
            <ServerWakeBanner dark={isDark} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

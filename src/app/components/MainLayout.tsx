"use client";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import HamburgerButton from "./HamburgerButton";
import { useFormState } from "@/app/context/FormProvider";
import { getAccessToken, parseJwt } from "../utils/utils";
import { useProfile } from "@/lib/query/queries";
import { shallowEqual } from "../utils/shallowEqual";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    sidebarWidth, 
    setSidebarWidth, 
    isMobileSidebarOpen, 
    closeMobileSidebar, 
    setUserData, 
    userData
  } = useFormState();
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
  const profile = useProfile();
  useEffect(() => {
    const token = getAccessToken();
    const jwtUser = token ? parseJwt(token)?.user : null;
    if (jwtUser && jwtUser.user_id) setUserData((prev) => prev ?? jwtUser);
  }, [setUserData]);
  useEffect(() => {
    if (profile.data) {
      const fresh = profile.data;
      setUserData((prev) => (shallowEqual(prev, fresh) ? prev : fresh));
    }
  }, [profile.data, setUserData]);

  return (
    <div className={`flex ${userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"} h-screen overflow-hidden`}>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div 
        className={`hidden md:block hover:w-[146px] w-[80px] p-5 h-screen transition-all duration-300`}
        style={{ width: `${sidebarWidth + 20}px` }}
        onMouseEnter={() => setSidebarWidth(146)}
        onMouseLeave={() => setSidebarWidth(60)}
      >
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      <div 
        className="flex-1 transition-all duration-300 h-screen overflow-auto"
        onClick={handleMainContentClick}
      >
        {/* Hamburger Button - Only visible on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <HamburgerButton />
        </div>
        
        <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden pt-16 md:pt-0 ">
          <div className="p-4 md:p-6 flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

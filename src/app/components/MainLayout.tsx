"use client";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import HamburgerButton from "./HamburgerButton";
import { useFormState } from "@/app/context/FormProvider";
import { getAccessToken, parseJwt } from "../utils/utils";
import { getUser } from "../api/userRequests";

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
  const [isDoneFetchingUser, setIsDoneFetchingUser] = useState(false);

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

    useEffect(() => {
      const fetchUser = async () => {
        if (isDoneFetchingUser) return;
        else {
          try {
            if (!userData) {
              // If no user, try getting one from cookies
              const token = getAccessToken();
              if (!token) {
                console.error("No access_token found in cookies");
                return;
              }
              const parsedUser = parseJwt(token).user;
              if (!parsedUser || !parsedUser.user_id) {
                console.error("Failed to parse user or missing user_id in token");
                return;
              }
              setIsDoneFetchingUser(true);
              setUserData(parsedUser);
              const response = await getUser(parsedUser.user_id);

              if (response) {
                setIsDoneFetchingUser(true);
                setUserData(response);
              }
              return;
            }
            // Only fetch updated user info if we have a user
            const response = await getUser(userData.user_id);
            if (response) {
              setIsDoneFetchingUser(true);
              setUserData(response);
            }
          } catch (error) {
            console.error("Failed to fetch user:", error);
          }
        }
      };
      fetchUser();
    }, [userData, setUserData, isDoneFetchingUser]);

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

import { useEffect } from 'react';
import { useFormState } from "@/app/context/FormProvider";
import SidebarLink from "./sidebarLink";

export default function MobileSidebar() {
  const { isMobileSidebarOpen, closeMobileSidebar, userData } = useFormState();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeMobileSidebar]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileSidebarOpen]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeMobileSidebar();
    }
  };

  // Focus management for accessibility
  useEffect(() => {
    if (isMobileSidebarOpen) {
      // Focus on first focusable element when sidebar opens
      const firstFocusable = document.querySelector<HTMLElement>('.mobile-sidebar [role="menuitem"]');
      firstFocusable?.focus();
      
      // Trap focus inside the sidebar when open
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeMobileSidebar();
          const menuButton = document.getElementById('menu-button');
          menuButton?.focus();
          return;
        }
        
        if (e.key === 'Tab') {
          const focusableElements = Array.from(
            document.querySelectorAll('.mobile-sidebar [role="menuitem"], .mobile-sidebar button, .mobile-sidebar [href]')
          ) as HTMLElement[];
          
          if (!focusableElements.length) return;
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
        aria-hidden={!isMobileSidebarOpen}
        aria-label="Close menu"
        role="button"
        tabIndex={isMobileSidebarOpen ? 0 : -1}
      />
      
      {/* Mobile Sidebar */}
      <aside
        className={`mobile-sidebar fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isMobileSidebarOpen}
      >
        <div 
          className={`h-full flex flex-col py-5 px-4 overflow-y-auto w-full ${userData?.theme === 'dark' ? 'bg-background-dark' : 'bg-background-light'}`}
          role="menu"
          aria-label="Main menu"
          aria-orientation="vertical"
          onKeyDown={(e) => {
            // Prevent default tab behavior, we handle it in the effect
            if (e.key === 'Tab') {
              e.preventDefault();
            }
          }}
        >
          {/* Logo and Title */}
          <div className="flex items-center mb-10 px-2">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.2499 15.0027C26.2499 8.79175 21.2108 3.75269 14.9999 3.75269C8.78897 3.75269 3.7499 8.79175 3.7499 15.0027C3.7499 21.2136 8.78897 26.2527 14.9999 26.2527C21.2108 26.2527 26.2499 21.2136 26.2499 15.0027Z" stroke="#FEAD03" strokeWidth="2" strokeMiterlimit="10"/>
              <g filter="url(#filter0_d_628_413)">
                <path d="M21.5624 11.2517L15.0075 18.7517L12.198 15.9392M11.247 18.7517L8.4374 15.9392M17.9126 11.2517L14.8921 14.7087" stroke="#FEAD03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
              </g>
              <defs>
                <filter id="filter0_d_628_413" x="3.4374" y="10.2517" width="23.125" height="17.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="4"/>
                  <feGaussianBlur stdDeviation="2"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_628_413"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_628_413" result="shape"/>
                </filter>
              </defs>
            </svg>
            <h1 className="ml-3 text-2xl text-primary-default font-rancho">
              Get it Done!
            </h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col gap-4 mt-8 px-2">
            <SidebarLink
              href="/dashboard"
              icon="/svgs/dashboard-yellow.svg"
              iconHover="/svgs/dashboard-white.svg"
              text="Dashboard"
              onClick={closeMobileSidebar}
              forceShowText={true}
            />
            <SidebarLink
              href="/projects"
              icon="/svgs/projects-yellow.svg"
              iconHover="/svgs/projects-white.svg"
              text="Projects"
              onClick={closeMobileSidebar}
              forceShowText={true}
            />
            <SidebarLink
              href="/notifications"
              icon="/svgs/notifs-yellow.svg"
              iconHover="/svgs/notifs-white.svg"
              text="Notifications"
              onClick={closeMobileSidebar}
              forceShowText={true}
            />
            <SidebarLink
              href="/profileSettings"
              icon="/svgs/profile-yellow.svg"
              iconHover="/svgs/profile-white.svg"
              text="Profile"
              onClick={closeMobileSidebar}
              forceShowText={true}
              className="w-full"
            />
          </nav>
        </div>
      </aside>
    </>
  );
}

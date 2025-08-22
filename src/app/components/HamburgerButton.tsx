import { useFormStore } from "@/app/store/useFormStore";

export default function HamburgerButton() {
  const { isMobileSidebarOpen, toggleMobileSidebar } = useFormStore();

  // Don't render the button when sidebar is open
  if (isMobileSidebarOpen) {
    return null;
  }

  return (
    <button
      id="menu-button"
      className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
      onClick={toggleMobileSidebar}
      aria-label="Open menu"
      aria-expanded={isMobileSidebarOpen}
      aria-controls="mobile-navigation"
      aria-haspopup="dialog"
    >
      <div className="w-6 flex flex-col items-end justify-center space-y-1.5">
        <span
          className={`h-0.5 bg-current transition-all duration-300 ease-out ${
            isMobileSidebarOpen ? "w-6 transform rotate-45 translate-y-2" : "w-6"
          }`}
        />
        <span
          className={`h-0.5 bg-current transition-all duration-300 ease-out ${
            isMobileSidebarOpen ? "opacity-0" : "w-5"
          }`}
        />
        <span
          className={`h-0.5 bg-current transition-all duration-300 ease-out ${
            isMobileSidebarOpen
              ? "w-6 transform -rotate-45 -translate-y-2"
              : "w-4"
          }`}
        />
      </div>
    </button>
  );
}

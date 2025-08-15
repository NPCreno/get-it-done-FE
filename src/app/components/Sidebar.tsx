"use client";

import { useFormState } from "@/app/context/FormProvider";
import SidebarLink from "./sidebarLink";

export default function Sidebar() {
  const { sidebarWidth, setSidebarWidth, isSidebarOpen, setIsSidebarOpen, userData } = useFormState();

  return (
    <>
      {/* Sidebar for large screens */}
      <aside
        className={`flex flex-col h-full py-5 px-[10px] rounded-[10px] items-start group transition-all duration-300 border
        ${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"} 
        ${userData?.theme === "dark" ? "text-white" : "text-black"}
        ${userData?.theme === "dark" ? "border-gray-800" : ""}`
      }
        style={{ width: `${sidebarWidth}px` }} // Use global state for width
        onMouseEnter={() => {
          setSidebarWidth(146);
          setIsSidebarOpen(true);
        }}
        onMouseLeave={() => {
          setSidebarWidth(60);
          setIsSidebarOpen(false);
        }}
      >
        <div className="flex flex-row fixed gap-[10px] max-h-[30px] group-hover:ml-0 ml-1">
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

          <h1
            className={`text-2xl text-primary-default font-rancho transition-opacity duration-300 
            ${isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
          >
            Get it Done!
          </h1>
        </div>

        <nav className="flex flex-col gap-5 mt-[60px]">
          <SidebarLink
            href="/dashboard"
            icon="/svgs/dashboard-yellow.svg"
            iconHover="/svgs/dashboard-white.svg"
            text="Dashboard"
          />
          <SidebarLink
            href="/projects"
            icon="/svgs/projects-yellow.svg"
            iconHover="/svgs/projects-white.svg"
            text="Projects"
          />
          <SidebarLink
            href="/notifications"
            icon="/svgs/notifs-yellow.svg"
            iconHover="/svgs/notifs-white.svg"
            text="Notifications"
          />
          <SidebarLink
            href="/profileSettings"
            icon="/svgs/profile-yellow.svg"
            iconHover="/svgs/profile-white.svg"
            text="Profile"
          />
        </nav>
      </aside>
    </>
  );
}

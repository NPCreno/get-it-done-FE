"use client";

import { useEffect, useRef, useState } from "react";

interface DashboardSearchProps {
  theme?: string;
}

/**
 * Expandable task search box. It owns its own state so typing re-renders only this
 * component, not the whole dashboard page. (The box does not filter anything yet.)
 */
export default function DashboardSearch({ theme }: DashboardSearchProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Focus the search box when the user expands it (instead of autoFocus).
  useEffect(() => {
    if (isSearchExpanded) searchInputRef.current?.focus();
  }, [isSearchExpanded]);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative flex justify-end">
      <div
        className={`relative flex items-center ${
          theme === 'dark' 
            ? 'bg-foreground-dark border border-gray-800' 
            : 'bg-white'
        } rounded-xl overflow-hidden h-[44px] transition-all duration-300 ease-out ${
          isSearchExpanded
            ? theme === 'dark'
              ? "shadow-lg ring-1 ring-gray-800"
              : "shadow-md ring-1 ring-gray-200"
            : theme === 'dark'
              ? "w-[44px] hover:bg-gray-900/80"
              : "w-[44px] hover:bg-gray-50"
        }`}
        style={{
          width: isSearchExpanded ? "280px" : "44px",
          transitionProperty: "width, box-shadow, border-color, background-color",
          transitionDuration: "300ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder={isSearchExpanded ? "Search tasks..." : ""}
          className={`bg-transparent border-0 focus:ring-0 focus:outline-none h-full pl-4 pr-10 ${
            theme === 'dark' 
              ? 'text-white placeholder-gray-500' 
              : 'text-gray-700 placeholder-gray-400'
          } transition-all duration-200 ${
            isSearchExpanded
              ? "w-full opacity-100"
              : "w-0 opacity-0"
          }`}
          onBlur={(e) => {
            if (
              !e.currentTarget.parentElement?.contains(
                e.relatedTarget as Node
              ) &&
              !searchQuery
            ) {
              setIsSearchExpanded(false);
            }
          }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
              if (!searchQuery) {
                setIsSearchExpanded(false);
              }
            }
          }}
        />
        <button
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
            isSearchExpanded && searchQuery
              ? theme === 'dark'
                ? "text-gray-400 hover:bg-gray-800"
                : "text-gray-500 hover:bg-gray-100"
              : theme === 'dark'
                ? "text-gray-500 hover:text-gray-300 right-[4px]"
                : "text-gray-400 hover:text-gray-600 right-[4px]"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (isSearchExpanded && searchQuery) {
              setSearchQuery("");
              const input = e.currentTarget.parentElement?.querySelector("input");
              input?.focus();
            } else {
              setIsSearchExpanded((v) => !v);
            }
          }}
          aria-label={
            isSearchExpanded && searchQuery
              ? "Clear search"
              : "Search"
          }
        >
          {isSearchExpanded && searchQuery ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="transition-transform duration-200 hover:scale-110"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 15 15"
              fill="currentColor"
              className="transition-transform duration-200 hover:scale-110"
            >
              <path d="M13.5937 12.5381L9.95859 8.90234C10.5444 8.0973 10.8596 7.12707 10.8586 6.13144C10.8586 3.52549 8.73838 1.40527 6.13242 1.40527C3.52646 1.40527 1.40625 3.52549 1.40625 6.13144C1.40625 8.7374 3.52646 10.8576 6.13242 10.8576C7.12805 10.8586 8.09828 10.5434 8.90332 9.95762L12.5391 13.5928L13.5937 12.5381ZM6.13242 9.36494C5.49281 9.365 4.86755 9.17538 4.33571 8.82007C3.80388 8.46476 3.38935 7.95971 3.14455 7.3688C2.89976 6.77789 2.83569 6.12766 2.96046 5.50034C3.08523 4.87302 3.39322 4.29679 3.84549 3.84452C4.29777 3.39225 4.874 3.08425 5.50132 2.95949C6.12864 2.83472 6.77887 2.89878 7.36978 3.14358C7.96069 3.38837 8.46574 3.8029 8.82105 4.33474C9.17636 4.86658 9.36597 5.49184 9.36592 6.13144C9.36491 6.98871 9.02391 7.81058 8.41773 8.41676C7.81156 9.02294 6.98969 9.36393 6.13242 9.36494V9.36494Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

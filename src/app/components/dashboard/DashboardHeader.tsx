"use client";
import DashboardSearch from "@/app/components/DashboardSearch";
import PomodoroButton from "@/app/components/PomodoroButton";

interface DashboardHeaderProps {
  dark?: boolean;
  onPomodoroOpenChange: (open: boolean) => void;
}

export default function DashboardHeader({ dark, onPomodoroOpenChange }: DashboardHeaderProps) {
  return (
    <div className="relative flex flex-col md:flex-row justify-between gap-4 mb-2">
      {/* Left header */}
      <div className="relative z-10 flex flex-col group">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-primary-default to-primary-200 rounded-full transform transition-transform duration-300 group-hover:scale-y-110"></div>
          <div className="space-y-0.5">
            <h1 className={`text-2xl md:text-3xl font-bold fade-in select-none bg-clip-text text-transparent ${
              dark
                ? "bg-gradient-to-r from-blue-300 via-amber-200 to-blue-300"
                : "bg-gradient-to-r from-gray-800 to-gray-600"
            }`}>
              Dashboard
            </h1>
            <p className="font-lato text-sm text-gray-500 fade-in-delay-1 select-none transition-all duration-300 group-hover:text-gray-600">
              Track your tasks and monitor your progress
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -left-2 -top-2 w-24 h-24 bg-primary-50 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
      {/* Right header */}
      <div className="flex flex-col lg:flex-row gap-[10px] md:items-end items-start">
        <DashboardSearch dark={dark} />

        <PomodoroButton onOpenChange={onPomodoroOpenChange} />
      </div>
    </div>
  );
}

"use client";
import DashboardSearch from "@/app/components/DashboardSearch";
import PomodoroButton from "@/app/components/PomodoroButton";

interface DashboardHeaderProps {
  onPomodoroOpenChange: (open: boolean) => void;
}

export default function DashboardHeader({ onPomodoroOpenChange }: DashboardHeaderProps) {
  return (
    <div className="relative flex flex-col md:flex-row justify-between gap-4 mb-2">
      {/* Left header */}
      <div className="relative z-10 flex flex-col group">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[image:var(--abar)] rounded-full transform transition-transform duration-300 group-hover:scale-y-110"></div>
          <div className="space-y-0.5">
            {/* RD-2: --title is Classic's gradient (gray in light, blue–amber in dark); Calm and Field notes are flat --txt. */}
            <h1 className="text-2xl md:text-3xl font-title [font-weight:var(--w-title)] [letter-spacing:var(--ls-title)] fade-in select-none bg-clip-text text-transparent bg-[image:var(--title)]">
              Dashboard
            </h1>
            <p className="font-ui text-sm text-th-ink-dim fade-in-delay-1 select-none transition-all duration-300 group-hover:text-th-ink-mid">
              Track your tasks and monitor your progress
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -left-2 -top-2 w-24 h-24 bg-primary-50 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
      {/* Right header */}
      <div className="flex flex-col lg:flex-row gap-[10px] md:items-end items-start">
        <DashboardSearch />

        <PomodoroButton onOpenChange={onPomodoroOpenChange} />
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { ChartAreaGradient } from "./shadcn/areaChart";
import Image from "next/image";
import { ChartPieInteractive } from "./shadcn/pieChart";
import MonthlyHeatmap from "./MonthlyHeatmap";
import { CardTitle } from "./shadcn/card";
import StreakCounter from "./streakCounter";
import { ITaskCompletionTrendData } from "../interface/ITaskCompletionTrendData";
import { ITaskDistribution } from "../interface/ITaskDistribution";
import { Database } from 'lucide-react';
import { IHeatmapData } from "../interface/IHeatmapData";
import { useFormState } from "../context/FormProvider";
import LoadError, { useRecoveryFocus } from "./LoadError";
import type { LoadState } from "@/lib/query/loadState";

/** What a card needs to show loading, error and refresh-failure states. */
export interface ChartLoad {
  state: LoadState<unknown>;
  onRetry: () => void;
  retrying: boolean;
}
interface ChartCardProps {
  header: string;
  delay: string;
  streakCount?: number;
  taskCompletionData?: ITaskCompletionTrendData[];
  taskDistributionData?: ITaskDistribution[];
  calendarHeatmapData?: IHeatmapData[];
  load: ChartLoad;
}

export default function ChartCard({
  header,
  delay,
  streakCount = 0, // Default to 0 if not provided
  taskCompletionData = [],
  taskDistributionData = [],
  calendarHeatmapData = [],
  load,
}: ChartCardProps) {
  const { userData } = useFormState();
  const focusRef = useRecoveryFocus<HTMLDivElement>(load.state.status);
  const widget = header.toLowerCase();

  const skeleton = (
    <div
      aria-busy="true"
      className={`w-full h-full min-h-[200px] flex items-center justify-center p-4 animate-pulse ${
        userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"
      }`}
    >
      <span className="sr-only">Loading {widget}</span>
      <div className="h-24 w-full max-w-[220px] rounded-[10px] bg-gray-300/40" />
    </div>
  );

  const errorBlock = (variant: "full" | "compact") =>
    load.state.status === "error" ? (
      <div className={variant === "full" ? "w-full h-full flex items-center p-3" : "w-full p-2"}>
        <LoadError widget={widget} failure={load.state.failure} onRetry={load.onRetry} retrying={load.retrying} theme={userData?.theme} variant={variant} />
      </div>
    ) : null;

  const refreshBlock =
    load.state.status === "ready" && load.state.refreshFailure ? (
      <div className="w-full p-2">
        <LoadError widget={widget} failure={load.state.refreshFailure} onRetry={load.onRetry} retrying={load.retrying} theme={userData?.theme} variant="compact" />
      </div>
    ) : null;

  const status = load.state.status;

  const renderNoDataState = () => (
    <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center 
        ${userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"} 
        ${userData?.theme === "dark" ? "text-white" : "text-black"}
        ${userData?.theme === "dark" ? "border-background-dark" : "border-background-light"}`}>
      <Database className="h-16 w-16 text-gray-400 mb-2" />
      <p className="text-gray-500 text-sm">No data available</p>
    </div>
  );

  const renderChart = () => {
    switch (header) {
      case "Task Completion Trend":
        if (status === "loading") return skeleton;
        if (status === "error") return errorBlock("full");
        if (status === "empty") return renderNoDataState();
        return (
          <div className={`w-full h-full ${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"}`}>
            <ChartAreaGradient 
              data={taskCompletionData}
              colors={{
                completed: "#53D86A",
              }}
              className={userData?.theme === "dark" ? "bg-foreground-dark border-gray-800 border text-white" : "bg-foreground-light"}
              aria-label={`Task completion trend chart showing ${taskCompletionData.length} days of data`}
            />
            {refreshBlock}
          </div>
        );
      case "Task Distribution by project":
        return (
          <div className={`${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"} w-full h-full`}>
            <ChartPieInteractive 
              data={taskDistributionData}
              title="Task Distribution"
              description="Completed tasks by project"
              noData={status === "empty"}
              statusSlot={status === "loading" ? skeleton : status === "error" ? errorBlock("full") : undefined}
              theme={userData?.theme}
            />
          </div>
        );
      case "Productivity Streak":
        if (status === "loading") return skeleton;
        if (status === "error") return errorBlock("full");
        return (
          <>
            <StreakCounter streakCount={streakCount} header={header} theme={userData?.theme}/>
            {refreshBlock}
          </>
        );
      case "Calendar Heat map":
        return (
          <div className={`w-full h-full p-4  rounded-[10px] shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] 
          hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left 
          ${userData?.theme === "dark" ? "bg-foreground-dark border-gray-800 border" : "bg-foreground-light"}`}>
            <CardTitle className={`${userData?.theme === "dark" ? "text-white" : "text-black"}`}>{header}</CardTitle>
            <MonthlyHeatmap 
              values={calendarHeatmapData.map(item => ({
                date: item.date,
                count: item.value
              }))}
              theme={userData?.theme}
              statusSlot={status === "loading" ? skeleton : status === "error" ? errorBlock("full") : undefined}
            />
            {refreshBlock}
          </div>
        );
      default:
        return (
          <div
      className={`p-5 flex flex-col gap-[10px] justify-start items-start 
      ${userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"}
      hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left ${delay}`}
    >
      <span className="text-text text-[13px] font-lato">{header}</span>
      <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center flex-col">
        <Image
        src={"/svgs/under-development.svg"}
        height={100}
        width={100}
        alt="Coming soon"
        className="opacity-20"
        />
        Coming soon
        </div>
    </div>
        );
    }
  };

  return (
    <div
      className={`relative flex flex-col gap-[10px] justify-start items-start 
       
        rounded-[10px] w-full h-full min-h-[300px]
      hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left 
      ${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"}${delay} group`}
      role="region"
      aria-label={`${header} chart`}
      tabIndex={-1}
      ref={focusRef}
    >
      <div className={`w-full h-full rounded-[10px] overflow-hidden ${userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"}`}>
        <div className="h-full transform transition-all duration-300 group-hover:scale-[1.01]">
          {renderChart()}
        </div>
      </div>
    </div>
  );
}

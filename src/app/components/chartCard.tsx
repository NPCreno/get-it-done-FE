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
  const focusRef = useRecoveryFocus<HTMLDivElement>(load.state.status);
  const widget = header.toLowerCase();

  const skeleton = (
    <div
      aria-busy="true"
      className="w-full h-full min-h-[200px] flex items-center justify-center p-4 animate-pulse bg-th-page"
    >
      <span className="sr-only">Loading {widget}</span>
      <div className="h-24 w-full max-w-[220px] rounded-card bg-th-skeleton" />
    </div>
  );

  const errorBlock = (variant: "full" | "compact") =>
    load.state.status === "error" ? (
      <div className={variant === "full" ? "w-full h-full flex items-center p-3" : "w-full p-2"}>
        <LoadError widget={widget} failure={load.state.failure} onRetry={load.onRetry} retrying={load.retrying} variant={variant} />
      </div>
    ) : null;

  const refreshBlock =
    load.state.status === "ready" && load.state.refreshFailure ? (
      <div className="w-full p-2">
        <LoadError widget={widget} failure={load.state.refreshFailure} onRetry={load.onRetry} retrying={load.retrying} variant="compact" />
      </div>
    ) : null;

  const status = load.state.status;

  const renderNoDataState = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-th-page text-th-ink-abs border-th-page">
      <Database className="h-16 w-16 text-th-ink-faint mb-2" />
      <p className="text-th-ink-dim text-sm">No data available</p>
    </div>
  );

  const renderChart = () => {
    switch (header) {
      case "Task Completion Trend":
        if (status === "loading") return skeleton;
        if (status === "error") return errorBlock("full");
        if (status === "empty") return renderNoDataState();
        return (
          <div className="w-full h-full bg-th-card">
            <ChartAreaGradient 
              data={taskCompletionData}
              colors={{
                completed: "var(--chart-1)",
              }}
              className="bg-th-card border-th-edge text-th-card-fg"
              aria-label={`Task completion trend chart showing ${taskCompletionData.length} days of data`}
            />
            {refreshBlock}
          </div>
        );
      case "Task Distribution by project":
        return (
          <div className="bg-th-card w-full h-full">
            <ChartPieInteractive 
              data={taskDistributionData}
              title="Task Distribution"
              description="Completed tasks by project"
              noData={status === "empty"}
              statusSlot={status === "loading" ? skeleton : status === "error" ? errorBlock("full") : undefined}
            />
          </div>
        );
      case "Productivity Streak":
        if (status === "loading") return skeleton;
        if (status === "error") return errorBlock("full");
        return (
          <>
            <StreakCounter streakCount={streakCount} header={header} />
            {refreshBlock}
          </>
        );
      case "Calendar Heat map":
        return (
          <div className="w-full h-full p-4 rounded-card shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)]
          hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left
          bg-th-card [border-width:var(--edge-w)] border-th-edge">
            <CardTitle className="text-th-ink-abs">{header}</CardTitle>
            <MonthlyHeatmap 
              values={calendarHeatmapData.map(item => ({
                date: item.date,
                count: item.value
              }))}
              statusSlot={status === "loading" ? skeleton : status === "error" ? errorBlock("full") : undefined}
            />
            {refreshBlock}
          </div>
        );
      default:
        return (
          <div
      className={`p-5 flex flex-col gap-[10px] justify-start items-start bg-th-page
      hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left ${delay}`}
    >
      <span className="text-th-ink text-[13px] font-ui">{header}</span>
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
       
        rounded-card w-full h-full min-h-[300px]
      hover:shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 fade-in-left 
      bg-th-card${delay} group`}
      role="region"
      aria-label={`${header} chart`}
      tabIndex={-1}
      ref={focusRef}
    >
      <div className="w-full h-full rounded-card overflow-hidden bg-th-page">
        <div className="h-full transform transition-all duration-300 group-hover:scale-[1.01]">
          {renderChart()}
        </div>
      </div>
    </div>
  );
}

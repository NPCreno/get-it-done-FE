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
interface ChartCardProps {
  header: string;
  delay: string;
  streakCount?: number;
  taskCompletionData?: ITaskCompletionTrendData[];
  taskDistributionData?: ITaskDistribution[];
  calendarHeatmapData?: IHeatmapData[];
}

export default function ChartCard({
  header,
  delay,
  streakCount = 0, // Default to 0 if not provided
  taskCompletionData = [],
  taskDistributionData = [],
  calendarHeatmapData = [],
}: ChartCardProps) {
  const { userData } = useFormState();

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
        if (!taskCompletionData || taskCompletionData.length === 0) {
          return renderNoDataState();
        }
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
          </div>
        );
      case "Task Distribution by project":
        return (
          <div className={`${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"} w-full h-full`}>
            <ChartPieInteractive 
              data={taskDistributionData}
              title="Task Distribution"
              description="Completed tasks by project"
              noData={!taskDistributionData || taskDistributionData.length === 0 || taskDistributionData.every(task => task.value === 0)}
              theme={userData?.theme}
            />
          </div>
        );
      case "Productivity Streak":
        return <StreakCounter streakCount={streakCount} header={header} theme={userData?.theme}/>
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
            />
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
    >
      <div className={`w-full h-full rounded-[10px] overflow-hidden ${userData?.theme === "dark" ? "bg-background-dark" : "bg-background-light"}`}>
        <div className="h-full transform transition-all duration-300 group-hover:scale-[1.01]">
          {renderChart()}
        </div>
      </div>
    </div>
  );
}

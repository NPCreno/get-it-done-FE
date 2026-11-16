"use client";
import ChartCard from "@/app/components/chartCard";
import type { DashboardData } from "./useDashboardData";

interface AnalyticsGridProps {
  data: Pick<
    DashboardData,
    | "taskCompletionData"
    | "taskDistributionData"
    | "calendarHeatmapData"
    | "streakCount"
    | "trendLoad"
    | "distributionLoad"
    | "streakLoad"
    | "heatmapLoad"
  >;
}

export default function AnalyticsGrid({ data }: AnalyticsGridProps) {
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-5 w-full fade-in-delay-2">
      <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary-100/20">
        <ChartCard
          header="Task Completion Trend"
          delay="fade-in-left-delay-1"
          taskCompletionData={data.taskCompletionData}
          load={data.trendLoad}
        />
      </div>
      <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-100/20">
        <ChartCard
          header="Task Distribution by project"
          delay="fade-in-left-delay-2"
          taskDistributionData={data.taskDistributionData}
          load={data.distributionLoad}
        />
      </div>
      <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-100/20">
        <ChartCard
          header="Productivity Streak"
          delay="fade-in-left-delay-3"
          streakCount={data.streakCount}
          load={data.streakLoad}
        />
      </div>
      <div className="transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-green-100/20">
        <ChartCard
          header="Calendar Heat map"
          delay="fade-in-left-delay-4"
          calendarHeatmapData={data.calendarHeatmapData}
          load={data.heatmapLoad}
        />
      </div>
    </div>
  );
}

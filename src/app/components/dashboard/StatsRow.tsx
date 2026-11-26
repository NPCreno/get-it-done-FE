"use client";
import StatsCard from "@/app/components/statsCard";
import LoadError from "@/app/components/LoadError";
import type { DashboardData } from "./useDashboardData";

interface StatsRowProps {
  data: Pick<DashboardData, "summary" | "summaryState" | "dashboardData">;
  dark?: boolean;
}

export default function StatsRow({ data, dark }: StatsRowProps) {
  const { summary, summaryState, dashboardData } = data;
  const failed = summaryState.status === "error";
  return (
    <>
      {summaryState.status === "error" && (
        <LoadError
          widget="task summary"
          failure={summaryState.failure}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
          dark={dark}
        />
      )}
      {summaryState.status === "ready" && summaryState.refreshFailure && (
        <LoadError
          widget="task summary"
          failure={summaryState.refreshFailure}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
          dark={dark}
          variant="compact"
        />
      )}

      {/* first row cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full fade-in-delay-2 group/cards">
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-100/30">
          <StatsCard
            icon="/svgs/list-outline.svg"
            header="All Tasks"
            content={failed ? "—" : String(dashboardData.all_tasks)}
            delay="fade-in-left-delay-1"
            className="h-full hover:bg-gradient-to-br from-white to-gray-50 transition-all duration-300"
            dark={dark}
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/30">
          <StatsCard
            icon="/svgs/timer-outline.svg"
            header="To Do"
            content={failed ? "—" : String(dashboardData.pending_tasks)}
            delay="fade-in-left-delay-2"
            className="h-full hover:bg-gradient-to-br from-white to-amber-50/30 transition-all duration-300"
            dark={dark}
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100/30">
          <StatsCard
            icon="/svgs/folder-open-outline.svg"
            header="All Projects"
            content={failed ? "—" : String(dashboardData.all_projects)}
            delay="fade-in-left-delay-3"
            className="h-full hover:bg-gradient-to-br from-white to-blue-50/30 transition-all duration-300"
            dark={dark}
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-100/30">
          <StatsCard
            icon="/svgs/checkbox-outline.svg"
            header="Complete"
            content={failed ? "—" : String(dashboardData.complete_tasks)}
            delay="fade-in-left-delay-4"
            className="h-full hover:bg-gradient-to-br from-white to-green-50/30 transition-all duration-300"
            dark={dark}
          />
        </div>
      </div>
    </>
  );
}

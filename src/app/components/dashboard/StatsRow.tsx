"use client";
import StatsCard from "@/app/components/statsCard";
import LoadError from "@/app/components/LoadError";
import { CheckboxIcon, FolderOpenIcon, ListIcon, TimerIcon } from "@/app/components/icons/AppIcons";
import type { DashboardData } from "./useDashboardData";

interface StatsRowProps {
  data: Pick<DashboardData, "summary" | "summaryState" | "dashboardData">;
}

export default function StatsRow({ data }: StatsRowProps) {
  // Only LoadError (not converted in this batch) still takes the mode.
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
        />
      )}
      {summaryState.status === "ready" && summaryState.refreshFailure && (
        <LoadError
          widget="task summary"
          failure={summaryState.refreshFailure}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
          variant="compact"
        />
      )}

      {/* first row cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full fade-in-delay-2 group/cards">
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-100/30">
          <StatsCard
            icon={ListIcon}
            header="All Tasks"
            content={failed ? "—" : String(dashboardData.all_tasks)}
            delay="fade-in-left-delay-1"
            className="h-full hover:bg-gradient-to-br transition-all duration-300"
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/30">
          <StatsCard
            icon={TimerIcon}
            header="To Do"
            content={failed ? "—" : String(dashboardData.pending_tasks)}
            delay="fade-in-left-delay-2"
            className="h-full hover:bg-gradient-to-br transition-all duration-300"
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100/30">
          <StatsCard
            icon={FolderOpenIcon}
            header="All Projects"
            content={failed ? "—" : String(dashboardData.all_projects)}
            delay="fade-in-left-delay-3"
            className="h-full hover:bg-gradient-to-br transition-all duration-300"
          />
        </div>
        <div className="transform transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-100/30">
          <StatsCard
            icon={CheckboxIcon}
            header="Complete"
            content={failed ? "—" : String(dashboardData.complete_tasks)}
            delay="fade-in-left-delay-4"
            className="h-full hover:bg-gradient-to-br transition-all duration-300"
          />
        </div>
      </div>
    </>
  );
}

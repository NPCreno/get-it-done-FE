"use client";
import type { RefObject } from "react";
import ProjectCard from "@/app/components/projectCard";
import LoadError from "@/app/components/LoadError";
import type { IProject } from "@/app/interface/IProject";
import type { LoadState } from "@/lib/query/loadState";

interface ProjectGridProps {
  projectsState: LoadState<IProject[]>;
  projectData: IProject[];
  onRetry: () => void;
  retrying: boolean;
  theme?: string;
  /** Where focus goes if a delete removes the button that opened the dialog. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNewProject: () => void;
  onOpenProject: (project: IProject) => void;
  onAddTask: (project: IProject) => void;
  onEditProject: (project: IProject) => void;
  onDeleteProject: (projectId: string) => void;
}

/** The projects header, the cards with their actions, the empty state and the load errors (DATA-04). */
export default function ProjectGrid({
  projectsState,
  projectData,
  onRetry,
  retrying,
  theme,
  headingRef,
  onNewProject,
  onOpenProject,
  onAddTask,
  onEditProject,
  onDeleteProject,
}: ProjectGridProps) {
  return (
    <>
      {(projectsState.status === "ready" || projectsState.status === "error") && (
        <>
          <div className="flex justify-between">
            {/* Left header */}
            <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary-default rounded-full"></div>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={`outline-none text-2xl md:text-3xl font-bold fade-in select-none bg-clip-text text-transparent ${
                      theme === "dark" 
                        ? "bg-gradient-to-r from-blue-300 via-amber-200 to-blue-300" 
                        : "bg-gradient-to-r from-gray-800 to-gray-600"
                }`}>
                  Projects
                </h1>
                <p className="font-lato text-sm text-gray-500 fade-in-delay-1 select-none mt-1">
                Organize your tasks into projects
                </p>
              </div>
            </div>
          </div>

            <div className="flex flex-row gap-[10px] items-end">
              <button
                className="relative px-6 py-2.5 flex flex-row gap-2 items-center justify-center rounded-xl h-[44px] font-lato font-medium text-white 
                bg-gradient-to-r from-primary-default to-primary-200 shadow-md hover:shadow-lg
                transform transition-all duration-300 hover:translate-y-[-1px] active:translate-y-0 active:scale-95 overflow-hidden group
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary-200 before:to-primary-default
                before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 ml-3"
                onClick={onNewProject}
              >
                {/* Animated ring effect */}
                <span className="absolute inset-0 rounded-xl overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </span>

                {/* Project icon */}
                <div className="relative z-10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                    <path d="M3 9.50147V6.12646C3 5.62918 3.19754 5.15227 3.54917 4.80064C3.90081 4.44901 4.37772 4.25146 4.875 4.25146H8.43234C8.80256 4.25147 9.16448 4.36108 9.4725 4.56646L10.7775 5.43646C11.0855 5.64185 11.4474 5.75146 11.8177 5.75146H19.125C19.6223 5.75146 20.0992 5.94901 20.4508 6.30064C20.8025 6.65227 21 7.12918 21 7.62647V9.50147" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22.4954 11.122L21.7351 18.8774C21.7351 19.3742 21.538 19.8506 21.1871 20.2021C20.8362 20.5536 20.3601 20.7516 19.8634 20.7524H4.1368C3.64009 20.7516 3.16402 20.5536 2.8131 20.2021C2.46218 19.8506 2.26508 19.3742 2.26508 18.8774L1.50477 11.122C1.48827 10.9156 1.51468 10.708 1.58234 10.5123C1.65001 10.3166 1.75745 10.137 1.89792 9.98489C2.03838 9.83275 2.20882 9.71135 2.39851 9.62832C2.5882 9.54529 2.79302 9.50243 3.00008 9.50244H21.0048C21.2114 9.50308 21.4158 9.54641 21.6049 9.62973C21.794 9.71304 21.9639 9.83454 22.1038 9.98661C22.2438 10.1387 22.3508 10.318 22.4182 10.5134C22.4856 10.7088 22.5119 10.916 22.4954 11.122V11.122Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="13" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="10" y1="15" x2="14" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <span className="relative z-10 text-base font-medium tracking-wide">
                  New Project
                </span>

                {/* Subtle shine effect on hover */}
                <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
              </button>
            </div>
          </div>

          {projectsState.status === "ready" && projectsState.refreshFailure && (
            <div className="my-3">
              <LoadError
                widget="your projects"
                failure={projectsState.refreshFailure}
                onRetry={onRetry}
                retrying={retrying}
                theme={theme}
                variant="compact"
              />
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-4 md:grid-cols-2">
            {projectsState.status === "error" ? (
              <div className="col-span-full">
                <LoadError
                  widget="your projects"
                  failure={projectsState.failure}
                  onRetry={onRetry}
                  retrying={retrying}
                  theme={theme}
                />
              </div>
            ) : projectData.length > 0 ? (
              projectData.map((project, index) => {
                // Calculate column index (0-3) based on the card's position
                const columnIndex = index % 4;
                const animationClass = `fade-in-delay-${columnIndex + 1}`;
                return (
                  <div key={index} className={animationClass}>
                    <ProjectCard
                      project={project}
                      onClick={() => onOpenProject(project)}
                      onAddTaskClick={() => onAddTask(project)}
                      onEditClick={() => onEditProject(project)}
                      onDeleteClick={() => {
                        if (project.project_id) {
                          onDeleteProject(project.project_id);
                        }
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-text text-[13px] font-lato">
                  No projects found
                </p>
              </div>
            )}
          </div>
        </>
      )}
        
      {projectsState.status === "empty" && (
        <>
          <div className="w-full h-full flex items-center justify-center py-16 px-4">
            <div className={`flex flex-col gap-6 items-center max-w-md justify-center text-center p-8 ${
              theme === "dark" 
                ? "bg-foreground-dark border border-gray-800" 
                : "bg-white border border-gray-100"
            } rounded-2xl shadow-sm transform transition-all hover:shadow-md`}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in">
                <path d="M12.5 37.5063V23.4438C12.5 21.3718 13.3231 19.3847 14.7882 17.9196C16.2534 16.4544 18.2405 15.6313 20.3125 15.6313H35.1348C36.6773 15.6314 38.1853 16.0881 39.4687 16.9438L44.9062 20.5688C46.1897 21.4246 47.6977 21.8813 49.2402 21.8813H79.6875C81.7595 21.8813 83.7466 22.7044 85.2118 24.1696C86.6769 25.6347 87.5 27.6218 87.5 29.6938V37.5063" stroke="#FEAD03" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M93.7308 44.2578L90.5628 76.5723C90.5628 78.6419 89.7416 80.627 88.2795 82.0917C86.8173 83.5564 84.8337 84.3811 82.764 84.3848H17.2367C15.167 84.3811 13.1834 83.5564 11.7212 82.0917C10.2591 80.627 9.43784 78.6419 9.43785 76.5723L6.26988 44.2578C6.20112 43.3978 6.31118 42.5329 6.5931 41.7175C6.87503 40.9021 7.32272 40.1539 7.90799 39.52C8.49326 38.8861 9.20343 38.3802 9.99379 38.0343C10.7842 37.6883 11.6376 37.5097 12.5003 37.5098H87.5199C88.381 37.5124 89.2323 37.693 90.0203 38.0401C90.8084 38.3873 91.5162 38.8935 92.0993 39.5271C92.6825 40.1607 93.1284 40.908 93.4092 41.7221C93.6899 42.5361 93.7994 43.3994 93.7308 44.2578V44.2578Z" stroke="#FEAD03" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M50 47V75.5" stroke="#FEAD03" strokeWidth="7" strokeLinecap="round"/>
                <path d="M36 61H64" stroke="#FEAD03" strokeWidth="7" strokeLinecap="round"/>
              </svg>
              <div className="space-y-2">
                {/* Same ref as the "Projects" heading: only one of the two is mounted, and deleting the last project swaps them. */}
                <h1 ref={headingRef} tabIndex={-1} className={`outline-none font-lato text-2xl md:text-3xl font-bold fade-in-delay-1 bg-gradient-to-r ${
                  theme === 'dark' 
                    ? 'from-amber-400 to-yellow-500' 
                    : 'from-primary-default to-yellow-400'
                } bg-clip-text text-transparent`}>
                  No Projects Yet ✨
                </h1>
                <p className={`font-lato fade-in-delay-2 max-w-md leading-relaxed ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  Start organizing your work by creating your first project.
                  <br />
                  Every great achievement starts with a plan!
                </p>
              </div>
              <button
                className={`px-6 py-3 w-full flex flex-row gap-2 items-center justify-center text-white font-lato rounded-xl 
                  hover:shadow-lg transition-all duration-300 fade-in-delay-3 transform hover:-translate-y-0.5
                  ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:shadow-amber-500/20'
                      : 'bg-gradient-to-r from-primary-default to-yellow-400 hover:shadow-primary-default/20'
                  }`}
                onClick={onNewProject}
              >
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.7501 12.499H5.25012M12.0001 5.74902V19.249V5.74902Z"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Add Your First Project
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

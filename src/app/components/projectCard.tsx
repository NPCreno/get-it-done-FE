import { IProject } from "../interface/IProject";
import { useState } from "react";
import ConfirmationModal from "./modals/confirmation";

// Helper functions for colors and gradients
const getGradientClass = (color: string = 'gray') => {
  const gradientMap: Record<string, string> = {
    'red': 'from-red-50 to-red-100',
    'blue': 'from-blue-50 to-blue-100',
    'green': 'from-green-50 to-green-100',
    'yellow': 'from-yellow-50 to-yellow-100',
    'purple': 'from-purple-50 to-purple-100',
    'pink': 'from-pink-50 to-pink-100',
    'indigo': 'from-indigo-50 to-indigo-100',
    'gray': 'from-gray-50 to-gray-100',
  };
  return gradientMap[color.toLowerCase()] || 'from-gray-50 to-gray-100';
};

const getTextColor = (color: string = 'gray') => {
  const textMap: Record<string, string> = {
    'red': 'text-red-700',
    'blue': 'text-blue-700',
    'green': 'text-green-700',
    'yellow': 'text-yellow-700',
    'purple': 'text-purple-700',
    'pink': 'text-pink-700',
    'indigo': 'text-indigo-700',
    'gray': 'text-gray-700',
  };
  return textMap[color.toLowerCase()] || 'text-gray-700';
};

export default function ProjectCard({
  project,
  onClick,
  onAddTaskClick,
  onEditClick,
  onDeleteClick,
}: {
  project: IProject & { priority?: 'high' | 'medium' | 'low' | string };
  onClick: () => void;
  onAddTaskClick: () => void;
  onEditClick?: (e: React.MouseEvent) => void;
  onDeleteClick?: (e: React.MouseEvent) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const projectColor = project.color?.toLowerCase() || 'gray';
  const gradientClass = getGradientClass(projectColor);
  const textColor = getTextColor(projectColor);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest('.action-button')) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteClick?.(new MouseEvent('click') as any);
    setShowDeleteConfirm(false);
  };

  const progress = project.task_count 
    ? Math.round(((project.task_completed ?? 0) / project.task_count) * 100) 
    : 0;
  
  const dueDate = project.due_date ? new Date(project.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = dueDate && daysUntilDue !== null && daysUntilDue < 0;
  const priority = project.priority || 'none';

  return (
    <div
      onClick={handleCardClick}
      className={`group relative p-5 rounded-2xl bg-gradient-to-br ${gradientClass} 
        border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 
        cursor-pointer overflow-hidden relative ${
          progress >= 100 
            ? 'shadow-[0_0_20px_5px_rgba(52,211,153,0.3)]' 
            : progress >= 80 
              ? 'shadow-[0_0_15px_3px_rgba(52,211,153,0.2)]' 
              : ''
        }`}
    >
      {/* Simple overlay for completed projects */}
      {progress >= 80 && (
        <div 
          className={`absolute inset-0 rounded-2xl pointer-events-none ${
            progress >= 100 ? 'bg-opacity-30' : progress >= 90 ? 'bg-opacity-20' : 'bg-opacity-10'
          }`}
          style={{
            boxShadow: progress >= 100 
              ? '0 0 40px 20px rgba(52, 211, 153, 0.5)'
              : progress >= 90 
                ? '0 0 30px 10px rgba(52, 211, 153, 0.3)'
                : '0 0 20px 5px rgba(52, 211, 153, 0.2)'
          }}
        />
      )}
      {/* Simple hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/10 transition-all duration-300" />
      {/* Header with title and menu button */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {project.title}
            </h2>
            {priority !== 'none' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${textColor} bg-opacity-20`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </span>
            )}
          </div>
          
          <div className="min-h-[40px]">
            {project.description ? (
              <p className="text-sm text-gray-600 line-clamp-2">
                {project.description}
              </p>
            ) : <div className="h-5"></div>}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEditClick?.(e);
            }}
            className="action-button p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white/70 hover:text-white"
            aria-label="Edit project"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            onClick={handleDeleteClick}
            className="action-button p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 text-red-400 hover:text-red-300"
            aria-label="Delete project"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Completion Status */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">
            {project.task_completed ?? 0} of {project.task_count || 0} tasks completed
            {progress >= 100 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                Completed!
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500">
            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/10">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddTaskClick();
            }}
            className="relative px-4 py-2 flex flex-row gap-2 items-center justify-center rounded-xl h-[36px] font-medium text-white 
                     bg-gradient-to-r from-primary-default to-primary-200 shadow-sm hover:shadow-md
                     transition-all duration-300 hover:opacity-90 active:opacity-100 overflow-hidden"
          >
            
            {/* Plus icon with subtle animation */}
            <div className="relative z-10 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-transform duration-300 group-hover:rotate-90"
              >
                <path
                  d="M18.7501 12.499H5.25012M12.0001 5.74902V19.249"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                />
              </svg>
            </div>
            
            {/* Button text with subtle tracking */}
            <span className="relative z-10 text-sm font-medium">Add Task</span>
            
            {/* Subtle shine effect on hover */}
            <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
          </button>
          
          {dueDate && (
            <div 
              className={`flex items-center text-xs px-3 py-1.5 rounded-xl border shadow-sm ${
                isOverdue || daysUntilDue === 0
                  ? 'bg-error-100 text-error-700 border-error-200' 
                  : daysUntilDue === 1
                    ? 'bg-error-100 text-error-700 border-error-200'
                    : daysUntilDue === 3
                      ? 'bg-accent-100 text-accent-700 border-accent-200'
                      : 'bg-white/90 text-gray-800 border-white/30'
              }`}
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="mr-1.5" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </div>
      {showDeleteConfirm && (
      <ConfirmationModal
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        confirmationTitle="Delete Project"
        confirmationDescription={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
        confirmBtnLabel="Delete"
      />
    )}
    </div>
  );
}

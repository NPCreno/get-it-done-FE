import { useFormState } from '@/app/context/FormProvider';
import React, { useEffect, useCallback, useState } from 'react';

export interface ConfirmationModalProps {
  onClose: () => void;
  title: string;
  description: string;
  actions: ActionButton[];
  fullScreen?: boolean;
}
export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger'; // Add more variants as needed
  className?: string; // For custom styling
}

export default function ConfirmationModal({ 
  onClose, 
  title,
  description,
  actions,
  fullScreen = false,
}: ConfirmationModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const { userData } = useFormState();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isClosing) {
      handleClose();
    }
  }, [isClosing, handleClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  return (
      <div className={`${fullScreen ? 'absolute inset-0' : 'fixed inset-0 bg-black bg-opacity-40'} flex justify-center items-center z-[100] transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'}`}>
                <div
        className={`${userData?.theme === 'dark' ? 'bg-foreground-dark border border-gray-800' : ''} ${
          fullScreen ? 'w-full h-full' : 'w-auto h-auto rounded-[10px] shadow-2xl transform transition-all duration-200'
        } p-5 flex flex-col gap-5 justify-center ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: isClosing ? 'none' : 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        <div className="flex flex-col gap-[10px]">
            <div className={`flex flex-row justify-center items-center ${userData?.theme === 'dark' ? 'text-white' : 'text-text'} text-3xl font-bold font-lato`}>
              {title}
            </div>
            <h2 className="text-[#676767] text-sm font-lato text-center">{description}</h2>
        </div>

        <div className={`flex ${actions.length > 2 ? "flex-col items-center gap-[10px] justify-center" : "flex-row items-center gap-[10px] justify-center"}`}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`
                px-4 py-2 rounded-md
                ${
                  action.variant === 'primary' 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : action.variant === 'secondary'
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : action.variant === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }
                ${action.className || ''}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
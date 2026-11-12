import { useFormState } from '@/app/context/FormProvider';
import React, { useCallback, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/app/components/shadcn/dialog';

interface ConfirmationModalProps {
  onClose: () => void;
  title: string;
  description: string;
  actions: ActionButton[];
  /** Card variant: covers its container instead of the viewport. Pass `container` too. */
  fullScreen?: boolean;
  /** Element the card variant is portaled into (it must be `relative` and clip overflow). */
  container?: HTMLElement | null;
}
interface ActionButton {
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
  container,
}: ConfirmationModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const { userData } = useFormState();
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  // Focus the first non-destructive action so Enter cannot confirm by accident.
  const initialIndex = Math.max(actions.findIndex((a) => a.variant !== 'danger'), 0);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        container={fullScreen ? container : undefined}
        overlayClassName={`${fullScreen ? 'absolute inset-0 z-20' : 'fixed inset-0 bg-black bg-opacity-40 z-[100]'} flex justify-center items-center transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'}`}
        overlayProps={{ onClick: stop }}
        // A backdrop press did not close this modal before; keep that.
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          initialFocusRef.current?.focus();
        }}
        className={`${userData?.theme === 'dark' ? 'bg-foreground-dark border border-gray-800' : 'bg-white'} ${
          fullScreen ? 'w-full h-full' : 'w-auto h-auto rounded-[10px] shadow-2xl transform transition-all duration-200'
        } p-5 flex flex-col gap-5 justify-center ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={stop}
        style={{
          animation: isClosing ? 'none' : 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        <div className="flex flex-col gap-[10px]">
            <DialogTitle className={`flex flex-row justify-center items-center ${userData?.theme === 'dark' ? 'text-white' : 'text-text'} text-3xl font-bold font-lato`}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-[#676767] text-sm font-lato text-center">{description}</DialogDescription>
        </div>

        <div className={`flex ${actions.length > 2 ? "flex-col items-center gap-[10px] justify-center" : "flex-row items-center gap-[10px] justify-center"}`}>
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              ref={index === initialIndex ? initialFocusRef : undefined}
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
      </DialogContent>
    </Dialog>
  );
}

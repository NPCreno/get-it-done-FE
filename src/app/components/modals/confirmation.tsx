import React, { useEffect, useCallback, useState } from 'react';

interface ConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  confirmationTitle: string;
  confirmationDescription: string;
  confirmBtnLabel: string;
  fullScreen?: boolean;
}

export default function ConfirmationModal({ 
  onClose, 
  onConfirm,
  confirmationTitle,
  confirmationDescription,
  confirmBtnLabel,
  fullScreen = false,
}: ConfirmationModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
 
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isClosing) {
      handleClose();
    }
  }, [isClosing]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match this with the popOut animation duration
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    setIsConfirming(true);
    setTimeout(() => {
      onConfirm();
    }, 300); // Slight delay to show the click effect
  }, [onConfirm]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  return (
    <div
      className={`${fullScreen ? 'absolute inset-0' : 'fixed inset-0 bg-black bg-opacity-40'} flex justify-center items-center z-[100] transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white ${
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
            <div className="flex flex-row justify-center items-center text-text text-3xl font-bold font-lato">
              {confirmationTitle}
            </div>
            <h2 className="text-[#676767] text-sm font-lato text-center">{confirmationDescription}</h2>
        </div>

        <div className="flex flex-row justify-center gap-[10px] w-full  items-center">
          <button 
            className="border border-error-200 rounded-[5px] flex justify-center items-center text-error-default
            font-lato text-xs p-[10px] font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
            onClick={handleClose}
            disabled={isConfirming}
          >
            {isConfirming ? 'Cancelling...' : 'Cancel'}
          </button>
          
          <button 
            className="bg-error-300 rounded-[5px] flex justify-center items-center text-white font-lato 
            text-xs p-[10px] hover:bg-error-400 active:bg-error-500 transition-all duration-150 transform
            hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed" 
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : (
              confirmBtnLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
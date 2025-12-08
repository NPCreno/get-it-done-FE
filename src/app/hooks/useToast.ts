"use client";

import { useFormStore } from "../store/useFormStore";
import { ToastVariant } from "../interface/types";

interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
  showCloseButton?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function useToast() {
  const { addToast } = useFormStore();

  const toast = (options: ToastOptions) => {
    addToast({
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration,
      showCloseButton: options.showCloseButton,
      icon: options.icon,
      className: options.className,
    });
  };

  return {
    toast
  };
}

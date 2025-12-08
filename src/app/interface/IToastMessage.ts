import { ToastVariant } from "./types";

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  variant: ToastVariant;
  duration?: number;
  showCloseButton?: boolean;
  icon?: React.ReactNode;
  className?: string;
}
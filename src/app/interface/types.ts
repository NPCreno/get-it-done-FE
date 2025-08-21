import { TimerType } from "@/lib/timerService";
import { ActionButton } from "../components/modals/confirmation";

export interface ConfirmationState {
  show: boolean;
  taskIdToDelete?: string | null;
  title: string;
  description: string;
  actions: ActionButton[];
}

export interface toasMessage{
  title: string,
  description: string,
  className?: string,
  variant: ToastVariant,
}

export interface profileSettingsFormValues {
  fullname: string;
  username: string;
  password: string;
  theme: string;
  enableNotifications: boolean;
  soundFx: boolean;
}

export interface ProjectModalState {
  isOpen: boolean;
  projectId: string | undefined;
  isEdit: boolean;
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-white border-[#CCCCCC]',
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

export const variantTextColors: Record<ToastVariant, string> = {
  default: 'text-text',
  success: 'text-green-700',
  error: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
};

export interface TimerConfig {
  label: string;
  time: number;
  bgGradient: string;
  buttonColor: string;
  borderColor: string;
  textColor: string;
}

export const TIMER_CONFIG: Record<TimerType, TimerConfig> = {
  pomodoro: {
    label: 'Focus',
    time: 25 * 60, // 25 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-primary-default',
    borderColor: 'border-primary-default/30',
    textColor: 'text-primary-default dark:text-primary-400'
  },
  shortBreak: {
    label: 'Short Break',
    time: 5 * 60, // 5 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-blue-500',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500 dark:text-blue-400'
  },
  longBreak: {
    label: 'Long Break',
    time: 15 * 60, // 15 minutes in seconds
    bgGradient: 'from-white to-gray-100 dark:from-gray-900 dark:to-gray-800',
    buttonColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500 dark:text-emerald-400'
  }
} as const;

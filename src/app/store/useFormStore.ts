"use client";

import { ITask } from "../interface/ITask";
import { IUser } from "../interface/IUser";
import { create } from "zustand";
import { ToastMessage } from "../interface/IToastMessage";

type CalendarMonthYear = { month: string; year: string };

type FormStore = {
  // universal states
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  isMobileSidebarOpen: boolean;

  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  sidebarWidth: number;
  setSidebarWidth: (value: number) => void;

  selectedTaskData: ITask | null;
  setSelectedTaskData: (task: ITask | null) => void;

  selectedMonth: string;
  setSelectedMonth: (value: string) => void;

  selectedYear: string;
  setSelectedYear: (value: string) => void;

  calendarMonthYear: CalendarMonthYear;
  setCalendarMonthYear: (val: CalendarMonthYear) => void;

  userData: IUser | null;
  setUserData: (user: IUser | null) => void;

  refreshPage: boolean;
  setRefreshPage: (value: boolean) => void;

  // Toast state
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

export const useFormStore = create<FormStore>((set) => ({
  isSidebarOpen: false,
  setIsSidebarOpen: (value) => set({ isSidebarOpen: value }),

  isMobileSidebarOpen: false,
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  sidebarWidth: 60,
  setSidebarWidth: (value) => set({ sidebarWidth: value }),

  selectedTaskData: null,
  setSelectedTaskData: (task) => set({ selectedTaskData: task }),

  selectedMonth: (new Date().getMonth() + 1).toString(),
  setSelectedMonth: (value) => set({ selectedMonth: value }),

  selectedYear: new Date().getFullYear().toString(),
  setSelectedYear: (value) => set({ selectedYear: value }),

  calendarMonthYear: {
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
  },
  setCalendarMonthYear: (val) => set({ calendarMonthYear: val }),

  userData: null,
  setUserData: (user) => set({ userData: user }),

  refreshPage: false,
  setRefreshPage: (value) => set({ refreshPage: value }),

  // Toast state
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));


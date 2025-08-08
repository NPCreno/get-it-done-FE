"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ITask } from "../interface/ITask";
import { IUser } from "../interface/IUser";

// Define the types for form state and additional universal states
type FormStateType = {
  name: string;
  email: string;
  applicationStatus: string;
};

type UniversalStateType = {
  formState: FormStateType;
  setFormState: React.Dispatch<React.SetStateAction<FormStateType>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarWidth: number;
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
  selectedTaskData: ITask | null;
  setSelectedTaskData: React.Dispatch<React.SetStateAction<ITask | null>>;
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  selectedYear: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  calendarMonthYear: {month: string, year: string};
  setCalendarMonthYear: React.Dispatch<React.SetStateAction<{month: string, year: string}>>;
  userData: IUser | null;
  setUserData: React.Dispatch<React.SetStateAction<IUser | null>>;
};

// Create the context
const FormContext = createContext<UniversalStateType | null>(null);

// Create the Provider component
export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formState, setFormState] = useState<FormStateType>({
    name: "",
    email: "",
    applicationStatus: "pending",
  });

  // Additional universal states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(60);
  const [selectedTaskData, setSelectedTaskData] = useState<ITask | null>(null);
  const [userData, setUserData] = useState<IUser | null>(null);
  // Initialize with current month (1-12) and year (e.g., 2025)
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [calendarMonthYear, setCalendarMonthYear] = useState<{month: string, year: string}>({month: selectedMonth, year: selectedYear});
  // Mobile sidebar actions
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <FormContext.Provider
      value={{
        formState,
        setFormState,
        isSidebarOpen,
        setIsSidebarOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        closeMobileSidebar,
        isLoading,
        setIsLoading,
        sidebarWidth,
        setSidebarWidth,
        selectedTaskData,
        setSelectedTaskData,
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        calendarMonthYear,
        setCalendarMonthYear,
        userData,
        setUserData,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

// Custom hook to use the global state
export const useFormState = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormState must be used within a FormProvider");
  }
  return context;
};

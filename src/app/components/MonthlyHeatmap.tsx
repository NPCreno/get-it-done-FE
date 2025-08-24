'use client';

import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isToday,
  addDays
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormStore } from '../store/useFormStore';
import { endOfWeek, startOfWeek } from '../utils/utils';

interface HeatmapValue {
  date: string;
  count: number;
}

interface MonthlyHeatmapProps {
  values: HeatmapValue[];
  className?: string;
}

export default function MonthlyHeatmap({ 
  values = [], 
  className = '',
}: MonthlyHeatmapProps) {
  const { userData } = useFormStore();
  const { calendarMonthYear, setCalendarMonthYear } = useFormStore();
  // Initialize currentMonth from calendarMonthYear if available, otherwise use current date
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (calendarMonthYear?.month && calendarMonthYear?.year) {
      return new Date(parseInt(calendarMonthYear.year), parseInt(calendarMonthYear.month) - 1, 1);
    }
    return new Date();
  });
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  let day = startDate;

  // Create a map of date to count for quick lookup
  const valueMap = values.reduce<Record<string, number>>((acc, { date, count }) => {
    acc[date] = count;
    return acc;
  }, {});

  // Update local state when calendarMonthYear changes from outside
  useEffect(() => {
    if (calendarMonthYear?.month && calendarMonthYear?.year) {
      const newMonth = new Date(
        parseInt(calendarMonthYear.year),
        parseInt(calendarMonthYear.month) - 1, // Convert to 0-indexed month
        1
      );
      if (!isSameMonth(newMonth, currentMonth)) {
        setCurrentMonth(newMonth);
      }
    }
  }, [calendarMonthYear, currentMonth]);

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setCalendarMonthYear({
      month: (newMonth.getMonth() + 1).toString(),
      year: newMonth.getFullYear().toString()
    });
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setCalendarMonthYear({
      month: (newMonth.getMonth() + 1).toString(),
      year: newMonth.getFullYear().toString()
    });
  };
  
  const getDayClass = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const count = valueMap[dayKey] || 0;
    let classes = 'w-6 h-6 rounded-sm flex items-center justify-center text-xs';
    
    if (!isSameMonth(day, monthStart)) {
      return classes + ` ${userData?.theme === "dark" ? "bg-foreground-dark" : "bg-gray-50"} text-gray-600`;
    }
    
    if (isToday(day)) {
      classes += ' ring-1 ring-gray-200';
    }
    
    if (count > 0) {
      if (count <= 1) classes += ` ${userData?.theme === "dark" ? "bg-success-dark-100 text-white" : "bg-success-100 text-black"}`;
      else if (count <= 2) classes += ` ${userData?.theme === "dark" ? "bg-success-dark-200 text-white" : "bg-success-200 text-black"}`;
      else if (count <= 4) classes += ` ${userData?.theme === "dark" ? "bg-success-dark-300 text-white" : "bg-success-300 text-black"}`;
      else if (count <= 6) classes += ` ${userData?.theme === "dark" ? "bg-success-dark-600 text-white" : "bg-success-600 text-black"}`;
      else classes += ` ${userData?.theme === "dark" ? "bg-success-dark-700 text-white" : "bg-success-700 text-black"}`;
    } else {
      classes += ` ${userData?.theme === "dark" ? "bg-gray-dark-50" : "bg-gray-50"} text-gray-200`;
    }
    
    return classes;
  };

  // Generate day headers (S, M, T, W, T, F, S)
  const dayHeaders = [];
  const dayHeaderFormat = 'EEEEEE';
  const startDateHeaders = startOfWeek(new Date());
  
  for (let i = 0; i < 7; i++) {
    dayHeaders.push(
      <div key={`header-${i}`} className="text-xs text-gray-500 text-center w-6">
        {format(addDays(startDateHeaders, i), dayHeaderFormat)}
      </div>
    );
  }

  // Generate days
  const rows = [];
  let daysInWeek = [];
  
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayKey = format(day, 'yyyy-MM-dd');
      const count = valueMap[dayKey] || 0;
      
      daysInWeek.push(
        <div
          key={day.toString()}
          className={getDayClass(day)}
          title={`${dayKey}: ${count} ${count === 1 ? 'task' : 'tasks'}`}
        >
          {format(day, 'd')}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7 gap-1 mb-1 justify-items-center">
        {daysInWeek}
      </div>
    );
    daysInWeek = [];
  }

  return (
    <div className={`w-full flex flex-col p-4 ${className}`}>
      <div className="flex justify-between items-center w-full">
        <div className="flex w-full items-center justify-center">
          <button 
            onClick={handlePrevMonth}
            className={`p-1 hover:bg-gray-100 rounded ${userData?.theme === "dark" ? "text-white hover:text-black" : "text-black hover:text-white"}`}
            aria-label="Previous month"
          >
            <ChevronLeft className={`w-4 h-4 `} />
          </button>
          <span className={`text-sm mx-2 w-32 text-center ${userData?.theme === "dark" ? "text-white" : "text-black"}`}>
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            className={`p-1 hover:bg-gray-100 rounded ${userData?.theme === "dark" ? "text-white hover:text-black" : "text-black hover:text-white"}`}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-gray-500 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="h-4">{day}</div>
        ))}
      </div>
      
      <div className="grid gap-1">
        {rows}
      </div>
      
      <div className="flex justify-end mt-2 text-xs text-gray-500">
        <div className="flex items-center">
          <span className="mr-2">Less</span>
          <div className="flex space-x-1">
            <div className={`w-3 h-3 ${userData?.theme === "dark" ? "bg-success-dark-100" : "bg-success-100"} rounded-sm`}></div>
            <div className={`w-3 h-3 ${userData?.theme === "dark" ? "bg-success-dark-200" : "bg-success-200"} rounded-sm`}></div>
            <div className={`w-3 h-3 ${userData?.theme === "dark" ? "bg-success-dark-300" : "bg-success-300"} rounded-sm`}></div>
            <div className={`w-3 h-3 ${userData?.theme === "dark" ? "bg-success-dark-600" : "bg-success-600"} rounded-sm`}></div>
            <div className={`w-3 h-3 ${userData?.theme === "dark" ? "bg-success-dark-800" : "bg-success-800"} rounded-sm`}></div>
          </div>
          <span className="ml-2">More</span>
        </div>
      </div>
    </div>
  );
}

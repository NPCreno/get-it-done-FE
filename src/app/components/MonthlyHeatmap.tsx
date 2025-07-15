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
import { useFormState } from '../context/FormProvider';

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
  className = '' 
}: MonthlyHeatmapProps) {
  const { calendarMonthYear, setCalendarMonthYear } = useFormState();
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
      return classes + ' bg-gray-50 text-gray-300';
    }
    
    if (isToday(day)) {
      classes += ' ring-1 ring-blue-500';
    }
    
    if (count > 0) {
      if (count <= 1) classes += ' bg-success-100 text-gray-800';
      else if (count <= 2) classes += ' bg-success-200 text-gray-800';
      else if (count <= 4) classes += ' bg-success-default text-white';
      else if (count <= 6) classes += ' bg-success-600 text-white';
      else classes += ' bg-success-700 text-white';
    } else {
      classes += ' bg-gray-50 text-gray-800';
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
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm mx-2 w-32 text-center">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded"
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
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-success-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-success-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-success-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-success-800 rounded-sm"></div>
          </div>
          <span className="ml-2">More</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function endOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff));
}


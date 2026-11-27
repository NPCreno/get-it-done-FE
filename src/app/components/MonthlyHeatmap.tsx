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
import ChartDataTable from './ChartDataTable';
import { HEATMAP_COLUMNS, heatmapRows } from './chartRows';

interface HeatmapValue {
  date: string;
  count: number;
}

interface MonthlyHeatmapProps {
  values: HeatmapValue[];
  className?: string;
  /** Replaces the day grid (loading or error). The month navigation above it stays usable. */
  statusSlot?: React.ReactNode;
}

export default function MonthlyHeatmap({ 
  values = [], 
  className = '',
  statusSlot,
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
    
    // RD-2: the levels are heat tokens (board 18 --h*); Classic's values are today's greens.
    if (!isSameMonth(day, monthStart)) {
      return classes + ' bg-th-heat-out text-th-ink-mid';
    }
    
    if (isToday(day)) {
      classes += ' ring-1 ring-th-rule';
    }
    
    if (count > 0) {
      if (count <= 1) classes += ' bg-th-heat-1 text-th-on-heat';
      else if (count <= 2) classes += ' bg-th-heat-2 text-th-on-heat';
      else if (count <= 4) classes += ' bg-th-heat-3 text-th-on-heat';
      else if (count <= 6) classes += ' bg-th-heat-4 text-th-on-heat';
      else classes += ' bg-th-heat-5 text-th-on-heat';
    } else {
      classes += ' bg-th-heat-0 text-th-heat-0-t';
    }
    
    return classes;
  };

  // Generate day headers (S, M, T, W, T, F, S)
  const dayHeaders = [];
  const dayHeaderFormat = 'EEEEEE';
  const startDateHeaders = startOfWeek(new Date());
  
  for (let i = 0; i < 7; i++) {
    dayHeaders.push(
      <div key={`header-${i}`} className="text-xs text-th-ink-dim text-center w-6">
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
            className="p-1 hover:bg-th-menu-hover rounded text-th-ink-abs"
            aria-label="Previous month"
          >
            <ChevronLeft className={`w-4 h-4 `} />
          </button>
          <span className="text-sm mx-2 w-32 text-center text-th-ink-abs">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-th-menu-hover rounded text-th-ink-abs"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {statusSlot ? <div className="mt-3">{statusSlot}</div> : (<>
      {/* The table lists every day of the month for assistive tech; the grid is decorative (title tooltips stay for the mouse). */}
      <ChartDataTable
        caption={`Tasks completed per day in ${format(currentMonth, 'MMMM yyyy')}`}
        columns={HEATMAP_COLUMNS}
        rows={heatmapRows(values.map(({ date, count }) => ({ date, count })), currentMonth)}
      />
      <div aria-hidden="true">
      <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-th-ink-dim text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="h-4">{day}</div>
        ))}
      </div>
      
      <div className="grid gap-1">
        {rows}
      </div>
      
      <div className="flex justify-end mt-2 text-xs text-th-ink-dim">
        <div className="flex items-center">
          <span className="mr-2">Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-th-heat-1 rounded-sm"></div>
            <div className="w-3 h-3 bg-th-heat-2 rounded-sm"></div>
            <div className="w-3 h-3 bg-th-heat-3 rounded-sm"></div>
            <div className="w-3 h-3 bg-th-heat-4 rounded-sm"></div>
            {/* Classic never painted this one (its class named a shade that doesn't exist): --heat-top is transparent there. */}
            <div className="w-3 h-3 bg-th-heat-top rounded-sm"></div>
          </div>
          <span className="ml-2">More</span>
        </div>
      </div>
      </div>
      </>)}
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


"use client"
import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/shadcn/card"
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/shadcn/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/shadcn/select"
import { useFormStore } from "@/app/store/useFormStore"
import { Database } from "lucide-react"

export interface PieChartData {
  title: string;
  value: number;
  fill?: string;
}

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Desktop",
  },
  mobile: {
    label: "Mobile",
  },
  january: {
    label: "January",
    color: "var(--chart-1)",
  },
  february: {
    label: "February",
    color: "var(--chart-2)",
  },
  march: {
    label: "March",
    color: "var(--chart-3)",
  },
  april: {
    label: "April",
    color: "var(--chart-4)",
  },
  may: {
    label: "May",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

interface ChartPieInteractiveProps {
  data: PieChartData[];
  title?: string;
  description?: string;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  months?: {value: string; label: string}[];
  noData?: boolean;
  theme?: string;
}

const getMonthsUntilCurrent = () => {
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString(); // Get current month as 1-12 string
  
  // Include all months up to and including the current month
  return months.slice(0, months.findIndex(m => m.value === currentMonth) + 1 || months.length);
};

const defaultMonths = getMonthsUntilCurrent();

export function ChartPieInteractive({ 
  data,
  title = "Project Distribution",
  description = "Tasks by project",
  selectedMonth: propSelectedMonth,
  onMonthChange,
  months = defaultMonths,
  noData,
  theme = "light",
}: ChartPieInteractiveProps) {
  const id = "pie-interactive";
  const { selectedMonth: contextMonth, setSelectedMonth } = useFormStore();
  
  // Use prop if provided, otherwise use context, otherwise default to current month
  const selectedMonth = propSelectedMonth || contextMonth || (new Date().getMonth() + 1).toString();
  
  const handleMonthChange = (newMonth: string) => {
    const monthNumber = parseInt(newMonth, 10);
    if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) return;
    
    // Update the context
    setSelectedMonth(newMonth);
    
    // Call the parent's onChange if provided
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  return (
    <Card data-chart={id} className={`flex flex-col h-full min-h-[280px] ${theme === "dark" ? "bg-foreground-dark border-gray-800 border" : "bg-foreground-light"}`}>
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 p-4 pb-2">
        <div className="grid gap-0.5">
          <CardTitle className={`${theme === "dark" ? "text-white" : "text-gray-800"}`}>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger
            className={`ml-auto h-7 w-[130px] rounded-lg pl-2.5 ${theme === "dark" ? "text-white border-gray-800 border" : "text-black"}`}
            aria-label="Select month"
          >
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent align="end" className={`rounded-xl ${theme === 'dark' ? 'bg-foreground-dark border-gray-800 border' : 'bg-white'}`}>
            {months.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value}
                className={`rounded-lg [&_span]:flex cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-text'}`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-xs"
                    style={{
                      backgroundColor: `var(--color-${month.value})`,
                    }}
                  />
                  {month.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      {noData && (
        <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${theme === "dark" ? "bg-foreground-dark" : "bg-foreground-light"}`}>
          <Database className="h-16 w-16 text-gray-400 mb-2" />
          <p className="text-gray-500 text-sm">No data available</p>
        </div>
      )}
      {!noData && (
      <CardContent className="px-4 pt-0 pb-2 flex-1 flex items-center">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="w-full h-full max-h-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="title"
              innerRadius={60}
              strokeWidth={5}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const total = data.reduce((sum, item) => sum + item.value, 0);
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Completed Tasks
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>)}
    </Card>
    
  )
}

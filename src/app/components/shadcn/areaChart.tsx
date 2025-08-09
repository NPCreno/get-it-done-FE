"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/shadcn/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/shadcn/chart"

export const description = "An area chart with gradient fill"

interface ChartDataPoint {
  day: string;
  completed: number;
}

interface AreaChartProps {
  data: ChartDataPoint[];
  colors?: {
    completed?: string;
  };
  className?: string;
}

export function ChartAreaGradient({ data, colors, className }: AreaChartProps) {
  const chartConfig = {
    completed: {
      label: "Completed",
      color: colors?.completed || "var(--chart-1)",
    },
  } satisfies ChartConfig
  return (
    <Card className={`flex flex-col h-full min-h-[280px] ${className}`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle>Task Completion Trend</CardTitle>
        <CardDescription>
          Showing task completion vs creation for the week
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2 flex-1">
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 16,
              right: 16,
              top: 8,
              bottom: 8,
            }}
            height={200}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={chartConfig.completed.color}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={chartConfig.completed.color}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="completed"
              type="monotone"
              fill="url(#fillCompleted)"
              stroke={chartConfig.completed.color}
              fillOpacity={1}
              strokeWidth={2}
              stackId="1"
              dot={false}
              activeDot={{
                stroke: chartConfig.completed.color,
                strokeWidth: 2,
                r: 4,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--chart-1)]"></div>
            <span>Completed: {data.reduce((sum, item) => sum + item.completed, 0)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Last 7 days</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

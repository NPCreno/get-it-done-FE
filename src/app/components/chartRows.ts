import { addDays, endOfMonth, format, startOfMonth } from "date-fns";

// Pure row builders for ChartDataTable. Each takes the same prop array its chart renders,
// so the table can never show different numbers than the chart.

export type TableRow = (string | number)[];

export interface TrendPoint {
  day: string;
  completed: number;
}

export interface DistributionPoint {
  title: string;
  value: number;
}

export interface HeatmapPoint {
  date: string; // yyyy-MM-dd
  count: number;
}

export const TREND_COLUMNS = ["Day", "Completed"];
export const DISTRIBUTION_COLUMNS = ["Project", "Completed"];
export const HEATMAP_COLUMNS = ["Date", "Completed"];

export function trendRows(data: TrendPoint[]): TableRow[] {
  return data.map((d) => [d.day, d.completed]);
}

export function distributionRows(data: DistributionPoint[]): TableRow[] {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return [...data.map((d) => [d.title, d.value]), ["Total", total]];
}

/** Every day of the month containing `month` (28 to 31 rows, zeros included) plus a total row. */
export function heatmapRows(values: HeatmapPoint[], month: Date): TableRow[] {
  const counts = new Map<string, number>();
  for (const { date, count } of values) counts.set(date, (counts.get(date) ?? 0) + count);

  const rows: TableRow[] = [];
  let total = 0;
  const last = endOfMonth(month);
  for (let day = startOfMonth(month); day <= last; day = addDays(day, 1)) {
    const key = format(day, "yyyy-MM-dd");
    const count = counts.get(key) ?? 0;
    total += count;
    rows.push([key, count]);
  }
  rows.push(["Total", total]);
  return rows;
}

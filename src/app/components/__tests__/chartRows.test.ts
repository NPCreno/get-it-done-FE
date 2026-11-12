import { describe, expect, it } from "vitest";
import { distributionRows, heatmapRows, trendRows } from "../chartRows";

describe("trendRows", () => {
  it("lists the chart data as given", () => {
    const data = [
      { day: "Sun", completed: 0 },
      { day: "Mon", completed: 3 },
    ];
    expect(trendRows(data)).toEqual([
      ["Sun", 0],
      ["Mon", 3],
    ]);
  });
  it("is empty for no data", () => {
    expect(trendRows([])).toEqual([]);
  });
});

describe("distributionRows", () => {
  it("lists every slice and a total that adds up", () => {
    const data = [
      { title: "Work", value: 4 },
      { title: "Home", value: 2 },
    ];
    const rows = distributionRows(data);
    expect(rows.slice(0, 2)).toEqual([
      ["Work", 4],
      ["Home", 2],
    ]);
    expect(rows[rows.length - 1]).toEqual(["Total", 6]);
  });
});

describe("heatmapRows", () => {
  const values = [
    { date: "2026-11-03", count: 2 },
    { date: "2026-11-13", count: 5 },
    { date: "2026-10-31", count: 9 }, // outside the displayed month
  ];

  it("has one row per day of the month, zeros included, in date order", () => {
    const rows = heatmapRows(values, new Date(2026, 10, 15));
    const days = rows.slice(0, -1);
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual(["2026-11-01", 0]);
    expect(days[29]).toEqual(["2026-11-30", 0]);
    expect(days[2]).toEqual(["2026-11-03", 2]);
    expect(days[12]).toEqual(["2026-11-13", 5]);
  });

  it("handles 28, 29 and 31 day months", () => {
    expect(heatmapRows([], new Date(2026, 1, 1))).toHaveLength(28 + 1);
    expect(heatmapRows([], new Date(2028, 1, 1))).toHaveLength(29 + 1);
    expect(heatmapRows([], new Date(2026, 0, 1))).toHaveLength(31 + 1);
  });

  it("total equals the sum of the displayed days only", () => {
    const rows = heatmapRows(values, new Date(2026, 10, 1));
    const days = rows.slice(0, -1);
    const sum = days.reduce((s, r) => s + (r[1] as number), 0);
    expect(rows[rows.length - 1]).toEqual(["Total", 7]);
    expect(sum).toBe(7);
  });
});

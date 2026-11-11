import type { Distribution } from "@/app/contracts/responses";

/** Emptiness rules per resource. Summary, heatmap and streak are never empty: zeros are real data. */
export const isEmptyList = (data: readonly unknown[]): boolean => data.length === 0;

export const isEmptyDistribution = (data: readonly Distribution[]): boolean =>
  data.length === 0 || data.every((d) => d.value === 0);

export const never = (): boolean => false;

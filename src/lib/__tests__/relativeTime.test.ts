import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../relativeTime";

const now = Date.parse("2026-11-16T12:00:00.000Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("formatRelativeTime", () => {
  it("buckets", () => {
    expect(formatRelativeTime(ago(5_000), now)).toBe("just now");
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe("5m ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe("2d ago");
    expect(formatRelativeTime(ago(30 * 86_400_000), now)).not.toMatch(/ago/);
    expect(formatRelativeTime("nonsense", now)).toBe("");
    expect(formatRelativeTime(new Date(now + 60_000).toISOString(), now)).toBe("just now");
  });
});

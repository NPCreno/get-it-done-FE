import { describe, expect, it } from "vitest";
import { readSidebarExpanded, SIDEBAR_STORAGE_KEY, writeSidebarExpanded } from "../sidebarPreference";
import { sidebarPanelWidth, sidebarWrapperWidth } from "@/app/components/sidebarWidths";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const throwing = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("readSidebarExpanded", () => {
  it("defaults to collapsed when nothing is stored", () => {
    expect(readSidebarExpanded(() => memoryStorage())).toBe(false);
  });

  it("defaults to collapsed without storage (server render)", () => {
    expect(readSidebarExpanded(() => null)).toBe(false);
    expect(readSidebarExpanded(() => undefined)).toBe(false);
  });

  it("reads a stored true or false", () => {
    expect(readSidebarExpanded(() => memoryStorage({ [SIDEBAR_STORAGE_KEY]: "true" }))).toBe(true);
    expect(readSidebarExpanded(() => memoryStorage({ [SIDEBAR_STORAGE_KEY]: "false" }))).toBe(false);
  });

  it.each(["{not json", "", "1", '"true"', "null", "[]", "{}"])("treats %j as collapsed", (raw) => {
    expect(readSidebarExpanded(() => memoryStorage({ [SIDEBAR_STORAGE_KEY]: raw }))).toBe(false);
  });

  it("is collapsed when storage throws, or getting storage throws", () => {
    expect(readSidebarExpanded(() => throwing)).toBe(false);
    expect(
      readSidebarExpanded(() => {
        throw new Error("blocked");
      })
    ).toBe(false);
  });
});

describe("writeSidebarExpanded", () => {
  it("round-trips through the read", () => {
    const s = memoryStorage();
    writeSidebarExpanded(true, () => s);
    expect(s.data.get(SIDEBAR_STORAGE_KEY)).toBe("true");
    expect(readSidebarExpanded(() => s)).toBe(true);
    writeSidebarExpanded(false, () => s);
    expect(readSidebarExpanded(() => s)).toBe(false);
  });

  it("never throws when storage fails or is missing", () => {
    expect(() => writeSidebarExpanded(true, () => throwing)).not.toThrow();
    expect(() => writeSidebarExpanded(true, () => null)).not.toThrow();
    expect(() =>
      writeSidebarExpanded(true, () => {
        throw new Error("blocked");
      })
    ).not.toThrow();
  });
});

describe("sidebar widths", () => {
  it("keeps 60/146 px panels and the 20 px wrapper gutter", () => {
    expect(sidebarPanelWidth(false)).toBe(60);
    expect(sidebarPanelWidth(true)).toBe(146);
    expect(sidebarWrapperWidth(false)).toBe(80);
    expect(sidebarWrapperWidth(true)).toBe(166);
  });
});

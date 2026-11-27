import { describe, expect, it } from "vitest";
import {
  PREVIEW_STORAGE_KEY,
  clearPreview,
  currentAppearance,
  previewLabel,
  previewOverride,
  searchWithoutPreview,
  type PreviewStorage,
} from "../appearance";

/** RD-2 dev theme preview (plan 52-0 §4, plan 52-1 work item 1). */
function fakeStorage(initial: Record<string, string> = {}): PreviewStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("previewOverride", () => {
  it("is never active in a production build, even with a query and a stored preview", () => {
    const storage = fakeStorage({ [PREVIEW_STORAGE_KEY]: JSON.stringify({ theme: "calm", mode: "dark" }) });
    expect(previewOverride("?theme=field&mode=dark", storage, "production")).toBeNull();
    expect(previewOverride("", storage, "production")).toBeNull();
  });

  it("a production build doesn't write the query into storage", () => {
    const storage = fakeStorage();
    previewOverride("?theme=calm", storage, "production");
    expect(storage.data).toEqual({});
  });

  it("a query sets it and sessionStorage keeps it for the next page", () => {
    const storage = fakeStorage();
    expect(previewOverride("?theme=calm&mode=dark", storage, "development")).toEqual({ theme: "calm", mode: "dark" });
    expect(previewOverride("", storage, "development")).toEqual({ theme: "calm", mode: "dark" });
  });

  it("theme or mode alone is a partial preview", () => {
    expect(previewOverride("?theme=field", fakeStorage(), "development")).toEqual({ theme: "field" });
    expect(previewOverride("?mode=dark", fakeStorage(), "development")).toEqual({ mode: "dark" });
  });

  it("ignores unknown values and other parameters", () => {
    expect(previewOverride("?theme=neon&mode=system", fakeStorage(), "development")).toBeNull();
    expect(previewOverride("?next=/oauth/authorize", fakeStorage(), "development")).toBeNull();
  });

  it("a newer query replaces the stored preview", () => {
    const storage = fakeStorage();
    previewOverride("?theme=calm", storage, "development");
    expect(previewOverride("?theme=field&mode=light", storage, "development")).toEqual({ theme: "field", mode: "light" });
    expect(previewOverride("", storage, "development")).toEqual({ theme: "field", mode: "light" });
  });

  it("a broken stored value gives no preview; no storage still honours the query", () => {
    expect(previewOverride("", fakeStorage({ [PREVIEW_STORAGE_KEY]: "{not json" }), "development")).toBeNull();
    expect(previewOverride("?theme=calm", null, "development")).toEqual({ theme: "calm" });
  });

  it("× clears it", () => {
    const storage = fakeStorage();
    previewOverride("?theme=calm&mode=dark", storage, "development");
    clearPreview(storage);
    expect(previewOverride("", storage, "development")).toBeNull();
  });

  it("× also drops the preview parameters from the URL, keeping the rest", () => {
    expect(searchWithoutPreview("?theme=calm&mode=dark")).toBe("");
    expect(searchWithoutPreview("?theme=calm&next=%2Foauth%2Fauthorize")).toBe("?next=%2Foauth%2Fauthorize");
  });
});

describe("currentAppearance with a preview", () => {
  const base = { user: { theme: "light", appTheme: "classic" }, cookie: null, demo: false, prefersDark: false };

  it("shows a theme that is not enabled yet, and forces the mode", () => {
    expect(currentAppearance({ ...base, preview: { theme: "field", mode: "dark" } })).toEqual({
      theme: "field",
      mode: "light",
      resolvedMode: "dark",
      isDark: true,
    });
  });

  it("a partial preview keeps the account's other choice", () => {
    expect(currentAppearance({ ...base, preview: { theme: "calm" } })).toMatchObject({ theme: "calm", resolvedMode: "light" });
    expect(currentAppearance({ ...base, preview: { mode: "dark" } })).toMatchObject({ theme: "classic", isDark: true });
  });

  it("without a preview, disabled themes still fall back to Classic", () => {
    expect(currentAppearance({ ...base, user: { theme: "light", appTheme: "calm" }, preview: null }).theme).toBe("classic");
  });

  it("labels the chip from what is on screen", () => {
    expect(previewLabel({ theme: "calm", resolvedMode: "dark" })).toBe("Preview: Calm · Dark");
    expect(previewLabel({ theme: "field", resolvedMode: "light" })).toBe("Preview: Field notes · Light");
  });
});

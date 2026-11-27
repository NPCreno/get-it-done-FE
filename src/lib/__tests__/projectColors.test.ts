import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FALLBACK_PROJECT_COLOR, NO_TINT, PROJECT_COLORS, projectDotColor, projectTint, projectTintStyle } from "../projectColors";

/** Plan 52-2: the project colour choices are data, and every choice has its card tint in both modes. */
const css = readFileSync(join(process.cwd(), "src/styles/theme-tokens.css"), "utf8");

function modeBlock(mode: string): string {
  const block = new RegExp(`(?:^|\\n)\\[data-mode="${mode}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (!block) throw new Error(`no [data-mode="${mode}"] block`);
  return block;
}

describe("PROJECT_COLORS", () => {
  it("keeps today's ten choices, in order, with their saved hex values", () => {
    expect(PROJECT_COLORS.map((c) => [c.name, c.color])).toEqual([
      ["Lavender", "#E6E6FA"],
      ["Mint", "#B5EAD7"],
      ["Peach", "#FFDAB9"],
      ["Sky", "#A0D8EF"],
      ["Lemon", "#FFFACD"],
      ["Rose", "#FADADD"],
      ["Mauve", "#E0B0FF"],
      ["Baby Blue", "#BDE0FE"],
      ["Coral", "#FFB5A7"],
      ["Seafoam", "#C3FBD8"],
    ]);
  });

  it("finds the tint by label, ignoring case; an unknown label gets the grey tint", () => {
    expect(projectTint("Baby Blue")).toBe("baby-blue");
    expect(projectTint("mint")).toBe("mint");
    expect(projectTint("Teal")).toBe(NO_TINT);
    expect(projectTint(undefined)).toBe(NO_TINT);
    expect(projectTintStyle("Sky")).toEqual({ "--pc-a": "var(--pc-sky-a)", "--pc-b": "var(--pc-sky-b)" });
  });

  it("falls back to grey for a colour that isn't a hex", () => {
    expect(projectDotColor("#abc")).toBe("#abc");
    expect(projectDotColor("#B5EAD7")).toBe("#B5EAD7");
    expect(projectDotColor("red")).toBe(FALLBACK_PROJECT_COLOR);
    expect(projectDotColor("")).toBe(FALLBACK_PROJECT_COLOR);
  });

  for (const mode of ["light", "dark"]) {
    it(`defines both tint stops for every choice in ${mode} mode`, () => {
      const block = modeBlock(mode);
      for (const tint of [...PROJECT_COLORS.map((c) => c.tint), NO_TINT]) {
        expect(block, `--pc-${tint}-a`).toMatch(new RegExp(`--pc-${tint}-a:\\s*[^;]+;`));
        expect(block, `--pc-${tint}-b`).toMatch(new RegExp(`--pc-${tint}-b:\\s*[^;]+;`));
      }
    });
  }

  it("Classic's tints are today's Tailwind 50 → 100 (light) and 900/30 → 800/30 (dark)", () => {
    expect(modeBlock("light")).toContain("--pc-lavender-a: #F5F3FF;");
    expect(modeBlock("light")).toContain("--pc-lavender-b: #EDE9FE;");
    expect(modeBlock("dark")).toContain("--pc-mint-a: rgba(6, 78, 59, 0.3);");
    expect(modeBlock("dark")).toContain("--pc-none-b: rgba(55, 65, 81, 0.3);");
  });
});

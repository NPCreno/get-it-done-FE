import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RD-1 §3: `useAppearance()` is the only source of theme and mode. No component compares a theme
 * string to "dark" any more (that missed System mode); they read `isDark`. Only the appearance
 * module, the hook and their tests may read the raw values.
 */
const ROOT = join(process.cwd(), "src");
const ALLOWED = new Set(["lib/appearance.ts", "hooks/useAppearance.ts", "lib/__tests__/appearance.test.ts", "lib/__tests__/noThemeChecks.test.ts"]);
const PATTERNS = [/theme\s*[!=]==?\s*['"]dark['"]/, /\bisDarkMode\b/, /userData\??\.theme\b/];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe("no hand-written dark checks", () => {
  it("only lib/appearance.ts resolves the mode", () => {
    const hits: string[] = [];
    for (const f of files(ROOT)) {
      const rel = relative(ROOT, f).split(sep).join("/");
      if (ALLOWED.has(rel)) continue;
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (PATTERNS.some((p) => p.test(line))) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });
});

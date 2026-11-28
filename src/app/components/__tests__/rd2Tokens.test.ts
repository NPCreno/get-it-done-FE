import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RD-2 grep gate (plan 52-0 §5). Phase 2 is done (batch 52-4): no file under src/app may bring back a hex
 * colour or an `isDark ? … : …` colour ternary. Colours come from the tokens in src/styles/theme-tokens.css,
 * which switch with the theme and mode by themselves. The token file and PROJECT_COLORS (src/lib) are outside
 * src/app; the only exceptions inside it are listed in EXEMPT.
 */
const APP = join(process.cwd(), "src/app");

const EXEMPT: Record<string, string> = {
  // The landing page: Phase 6 rewrites it (roadmap 50). Its amber hero is the one contrast exception left.
  "page.tsx": "landing page, Phase 6",
  // The demo's sample projects: project colours are data, like PROJECT_COLORS (src/lib/projectColors.ts).
  "demo/fake/seed.ts": "demo project colours (data)",
};

/** Every .ts/.tsx file under src/app, as a path relative to it, without tests and fixtures. */
function appFiles(dir = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === "__tests__" || e.name === "__fixtures__" ? [] : appFiles(join(dir, e.name));
    return /\.tsx?$/.test(e.name) ? [relative(APP, join(dir, e.name)).split(sep).join("/")] : [];
  });
}

/**
 * A hex colour, except inside a CSS attribute selector `[stroke='#ccc']`/`[fill='…']`: recharts
 * paints its own default strokes, and chart.tsx matches them to restyle them; that's not our colour.
 */
const HEX = /(?<!\[(?:stroke|fill)=')#[0-9a-fA-F]{3,8}\b/;
/** A colour picked in JS from the mode: `isDark ? …`, `dark ? …`, `dark && …`. */
const TERNARY = /\b(isDark|dark)\s*(\?|&&)/;

function offences(rel: string): string[] {
  return readFileSync(join(APP, rel), "utf8")
    .split("\n")
    .flatMap((line, i) => {
      const hits: string[] = [];
      if (HEX.test(line)) hits.push(`${rel}:${i + 1}: hex colour: ${line.trim()}`);
      if (TERNARY.test(line)) hits.push(`${rel}:${i + 1}: mode ternary: ${line.trim()}`);
      return hits;
    });
}

describe("RD-2 Phase 2 done: the whole src/app tree is on theme tokens", () => {
  const files = appFiles();

  it("scans the whole tree, including the files every batch converted", () => {
    expect(files.length).toBeGreaterThan(150);
    for (const f of ["components/auth/LoginForm.tsx", "components/oauth/ConsentView.tsx", "demo/DemoLayout.tsx", "components/ServerWakeBanner.tsx", "components/loaderClasses.ts", "components/Sidebar.tsx", "components/MobileSidebar.tsx", "(auth)/login/page.tsx"]) {
      expect(files).toContain(f);
    }
  });

  it("has no hex colours and no isDark colour ternaries outside EXEMPT (theme checks: src/lib/__tests__/noThemeChecks.test.ts)", () => {
    expect(files.filter((f) => !(f in EXEMPT)).flatMap(offences)).toEqual([]);
  });

  it("every exemption still exists (remove it when its file is converted)", () => {
    for (const f of Object.keys(EXEMPT)) expect(files).toContain(f);
  });

  it("no `dark:` utility is left anywhere in the app (plan 52-3: <html> now carries the `dark` class)", () => {
    const DARK = /(^|[\s'"`])dark:[a-z]/;
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? (e.name === "__tests__" ? [] : walk(join(dir, e.name))) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : []
      );
    const hits = walk(join(process.cwd(), "src/app")).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => DARK.test(line))
        .map((line) => `${file}: ${line.trim()}`)
    );
    expect(hits).toEqual([]);
    expect(DARK.test('className="p-4 dark:bg-red-200"')).toBe(true);
    expect(DARK.test("dark: Moon")).toBe(false);
  });

  it("the gate itself catches both", () => {
    expect(HEX.test('className="bg-[#FAFAFA]"')).toBe(true);
    expect(HEX.test('stroke="#333333"')).toBe(true);
    expect(HEX.test("[&_.recharts-sector[stroke='#fff']]:stroke-transparent")).toBe(false);
    expect(TERNARY.test('isDark ? "text-white" : "text-text"')).toBe(true);
    expect(TERNARY.test("${dark ? 'a' : 'b'}")).toBe(true);
    expect(TERNARY.test('dark={isDark}')).toBe(false);
  });
});

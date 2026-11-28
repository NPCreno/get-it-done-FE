import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_THEMES } from "@/app/contracts/enums";
import { ENABLED_THEMES } from "@/lib/appearance";

/** Classic only until plan 54 (2026-11-29): Calm and Field notes are listed but "Coming soon" and disabled. */
describe("Appearance card: themes outside ENABLED_THEMES", () => {
  const src = readFileSync(join(process.cwd(), "src/app/components/appearance/AppearanceCard.tsx"), "utf8");

  it("Calm and Field notes are not enabled; Classic is", () => {
    expect(APP_THEMES.filter((t) => !ENABLED_THEMES.includes(t))).toEqual(["calm", "field"]);
  });

  it("a disabled theme's radio is disabled and its card says Coming soon", () => {
    expect(src).toContain("const enabled = ENABLED_THEMES.includes(t);");
    expect(src).toContain("disabled={!enabled}");
    expect(src).toContain('{!enabled && <span className="text-xs leading-4 text-th-ink2">Coming soon</span>}');
  });
});

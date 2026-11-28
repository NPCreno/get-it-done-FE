import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeWordmarkView } from "../brand/ThemeWordmark";
import { WORDMARK_NAME, wordmarkClasses } from "../brand/wordmarkClasses";

const html = (theme: "classic" | "calm" | "field", place: "sidebar" | "drawer" | "auth" | "loader" = "sidebar", as?: "h1" | "p") =>
  renderToStaticMarkup(createElement(ThemeWordmarkView, { theme, place, as }));
/** What a screen reader reads: the text outside aria-hidden. */
const accessibleText = (out: string) => out.replace(/<span aria-hidden="true">[\s\S]*<\/span><\/(span|h1|p)>$/, "").replace(/<[^>]+>/g, "");

describe("ThemeWordmark (plan 53b §3)", () => {
  it("Classic is today's Rancho 'Get it Done!' in each place", () => {
    expect(html("classic")).toContain("Get it Done!");
    expect(wordmarkClasses("classic", "sidebar").root).toBe("text-2xl text-th-acc font-rancho");
    expect(wordmarkClasses("classic", "auth").root).toBe("text-2xl font-rancho");
    expect(wordmarkClasses("classic", "loader").root).toContain("text-th-acc-t");
  });

  it("Calm is 'Get It Done' in Poppins 600, with 'Done' in Rancho on the accent text", () => {
    const out = html("calm");
    expect(out).toMatch(/Get It <span class="font-rancho font-normal text-\[1\.27em\] text-th-acc-t">Done<\/span>/);
    expect(wordmarkClasses("calm", "sidebar").root).toMatch(/font-poppins font-semibold/);
  });

  it("Field notes is 'get it done' in Manrope 800, lowercase", () => {
    expect(html("field")).toContain("get it done");
    expect(wordmarkClasses("field", "sidebar").root).toMatch(/font-manrope font-extrabold lowercase/);
  });

  it.each(["classic", "calm", "field"] as const)("%s: the accessible name is always 'Get It Done'", (theme) => {
    for (const place of ["sidebar", "drawer", "auth", "loader"] as const) {
      const out = html(theme, place, "h1");
      expect(out).toMatch(/^<h1 /);
      expect(accessibleText(out)).toBe(WORDMARK_NAME);
      expect(out).toContain('<span class="sr-only">Get It Done</span><span aria-hidden="true">');
    }
  });

  it("colours come from tokens only", () => {
    for (const theme of ["classic", "calm", "field"] as const) for (const place of ["sidebar", "drawer", "auth", "loader"] as const) {
      const c = wordmarkClasses(theme, place);
      expect(`${c.root} ${c.accent ?? ""}`).not.toMatch(/#|text-(white|black|gray|amber|primary)/);
    }
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../../../tailwind.config";
import { LoaderView, ThemeLoaderMark } from "../loader";
import { CALM_LOADER, FIELD_LOADER, LOADER_ENTER, LOADER_LEAVE, PAGE_IN_CLASS, loaderClasses } from "../loaderClasses";

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../../../..", rel), "utf8");
const classesOf = (s: string) => s.split(/\s+/).filter(Boolean);
const all = (c: ReturnType<typeof loaderClasses>) =>
  [c.root, c.group, c.tile, c.mark, c.track, c.arc, c.ticks, c.word ?? ""].join(" ");

describe("loaderClasses: theme tokens (UX-04 §1, RD-2 52-4)", () => {
  it("page, tile, ring and wordmark come from the theme tokens (board 16 in Classic), with no mode switch", () => {
    const c = loaderClasses();
    expect(classesOf(c.root)).toEqual(expect.arrayContaining(["absolute", "inset-0", "z-0", "bg-th-page", "pb-[8%]"]));
    expect(classesOf(c.tile)).toEqual(expect.arrayContaining(["bg-th-card", "border-th-line", "border", "size-16", "md:size-[72px]", "rounded-[18px]", "md:rounded-[20px]"]));
    expect(classesOf(c.track)).toContain("stroke-th-acc-sub");
    expect(classesOf(c.word!)).toEqual(expect.arrayContaining(["font-rancho", "text-th-acc-t", "text-[30px]", "md:text-[36px]", "leading-none"]));
    expect(all(c)).not.toMatch(/dark|gray-|primary-|background-|bg-white|#/);
  });

  it("the mark: arc and ticks in the accent, the arc starts at the top and turns round the centre", () => {
    const c = loaderClasses();
    expect(classesOf(c.arc)).toEqual(
      expect.arrayContaining(["stroke-th-acc", "[transform-origin:15px_15px]", "[transform:rotate(-90deg)]"])
    );
    expect(classesOf(c.ticks)).toContain("stroke-th-acc");
    expect(classesOf(c.mark)).toEqual(expect.arrayContaining(["size-[42px]", "md:size-12", "overflow-visible"]));
  });
});

describe("loaderClasses: motion pairs (UX-04 §2)", () => {
  const c = loaderClasses({ leaving: true });

  it("enter", () => {
    expect(classesOf(c.group)).toEqual(expect.arrayContaining(["motion-safe:animate-loader-in", "motion-reduce:animate-loader-fade-in"]));
  });

  it("loop: the arc turns; with reduced motion no arc, a full amber ring and a breathing tile", () => {
    expect(classesOf(c.arc)).toEqual(expect.arrayContaining(["motion-safe:animate-loader-arc", "motion-reduce:hidden"]));
    expect(classesOf(c.track)).toContain("motion-reduce:stroke-th-acc");
    expect(classesOf(c.tile)).toContain("motion-reduce:animate-loader-breathe");
  });

  it("exit (loader) and exit (page)", () => {
    expect(classesOf(c.root)).toEqual(expect.arrayContaining(["motion-safe:animate-loader-out", "motion-reduce:animate-loader-fade-out"]));
    expect(classesOf(PAGE_IN_CLASS)).toEqual(["motion-safe:animate-page-in", "motion-reduce:animate-page-fade-in"]);
  });

  it("every motion-safe animation has a motion-reduce partner on the same element", () => {
    for (const s of [LOADER_ENTER, LOADER_LEAVE, PAGE_IN_CLASS]) {
      expect(s).toMatch(/motion-safe:animate-/);
      expect(s).toMatch(/motion-reduce:animate-/);
    }
  });
});

describe("loaderClasses: leaving and variants", () => {
  it("the leaving classes appear only when leaving", () => {
    const still = loaderClasses({ leaving: false });
    expect(still.root).not.toMatch(/loader-out|loader-fade-out|pointer-events-none/);
    expect(loaderClasses({ leaving: true }).root).toContain(LOADER_LEAVE);
  });

  it("inline has no overlay and no wordmark", () => {
    const c = loaderClasses({ variant: "inline" });
    expect(classesOf(c.root)).not.toContain("absolute");
    expect(classesOf(c.root)).not.toContain("inset-0");
    expect(classesOf(c.root)).toContain("py-16");
    expect(c.word).toBeNull();
    expect(c.group).toContain(LOADER_ENTER); // same motion
  });
});

describe("LoadingPage markup", () => {
  const html = (props: Partial<Parameters<typeof LoaderView>[0]> = {}) =>
    renderToStaticMarkup(createElement(LoaderView, { theme: "classic", ...props }));

  it("is one status region; the tile and wordmark are hidden from screen readers", () => {
    const out = html();
    expect(out.match(/role="status"/g)).toHaveLength(1);
    expect(out).toMatch(/<div aria-hidden="true" class="flex flex-col/);
    expect(out).toContain('<span class="sr-only">'); // filled with "Loading" a frame after mount
    expect(out).toContain("Get it Done!");
    expect(out).toContain('stroke-dasharray="18 70.69"');
    expect(out).toContain('r="11.25"');
  });

  it("while leaving the region is aria-hidden, so Loading isn't read again", () => {
    expect(html({ leaving: true })).toMatch(/role="status" aria-hidden="true"/);
    expect(html()).not.toMatch(/role="status" aria-hidden/);
  });

  it("inline: the tile alone", () => {
    const out = html({ variant: "inline" });
    expect(out).not.toContain("Get it Done!");
    expect(out).not.toContain("inset-0");
  });
});

describe("Tailwind config (UX-04 §2)", () => {
  const ext = tailwindConfig.theme?.extend as {
    keyframes: Record<string, Record<string, Record<string, string>>>;
    animation: Record<string, string>;
  };

  it("has the 7 keyframes", () => {
    expect(ext.keyframes.loaderIn).toEqual({ "0%": { opacity: "0", transform: "scale(.96)" }, "100%": { opacity: "1", transform: "scale(1)" } });
    expect(ext.keyframes.loaderFadeIn).toEqual({ "0%": { opacity: "0" }, "100%": { opacity: "1" } });
    expect(ext.keyframes.loaderArc).toEqual({ "0%": { transform: "rotate(-90deg)" }, "100%": { transform: "rotate(270deg)" } });
    expect(ext.keyframes.loaderBreathe).toEqual({ "0%, 100%": { opacity: "1" }, "50%": { opacity: ".55" } });
    expect(ext.keyframes.loaderOut).toEqual({ "0%": { opacity: "1", transform: "translateY(0)" }, "100%": { opacity: "0", transform: "translateY(-4px)" } });
    expect(ext.keyframes.loaderFadeOut).toEqual({ "0%": { opacity: "1" }, "100%": { opacity: "0" } });
    expect(ext.keyframes.pageIn).toEqual({ "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } });
  });

  it("has the 8 animations with the exact timings (UX-05: halved, 150 ms show delay kept)", () => {
    expect(ext.animation).toMatchObject({
      "loader-in": "loaderIn 100ms cubic-bezier(.2,.8,.2,1) 150ms both",
      "loader-fade-in": "loaderFadeIn 100ms linear 150ms both",
      "loader-arc": "loaderArc 1.6s cubic-bezier(.65,0,.35,1) infinite",
      "loader-breathe": "loaderBreathe 2s ease-in-out infinite",
      "loader-out": "loaderOut 90ms ease-in both",
      "loader-fade-out": "loaderFadeOut 60ms linear both",
      "page-in": "pageIn 120ms cubic-bezier(.2,.8,.2,1) 40ms both",
      "page-fade-in": "loaderFadeIn 80ms linear both",
    });
  });
});

describe("no leftovers", () => {
  it("loader.tsx has no bouncing letters and no tagline", () => {
    const src = read("src/app/components/loader.tsx");
    expect(src).not.toContain("animate-bounce");
    expect(src).not.toMatch(/Stay organized|boost productivity|achieve your goals/);
  });

  it.each([
    "src/app/components/dashboard/DashboardView.tsx",
    "src/app/components/projects/ProjectsView.tsx",
    "src/app/(routes)/profileSettings/page.tsx",
  ])("%s has no setShowLoader or 500 ms fade", (file) => {
    const src = read(file);
    expect(src).not.toContain("setShowLoader");
    expect(src).not.toContain("duration-500");
  });

  it("the wake banner sits above the overlay, and the demo's <main> contains it", () => {
    expect(read("src/app/components/ServerWakeBanner.tsx")).toMatch(/data-server-wake-banner\s+className=\{`relative z-10 /);
    expect(read("src/app/demo/DemoLayout.tsx")).toMatch(/<main className="relative /);
  });
});

// ------------------------------------------------------------------ RD-3 theme loaders (plan 53b §2, §6)

describe("ThemeLoaderMark: one mark per theme (board 20)", () => {
  const mark = (theme: "classic" | "calm" | "field", variant: "page" | "inline" = "page") =>
    renderToStaticMarkup(createElement(ThemeLoaderMark, { theme, variant }));

  it("Classic is UX-04's tile, arc and Rancho wordmark, unchanged", () => {
    const out = mark("classic");
    expect(out).toContain('stroke-dasharray="18 70.69"');
    expect(out).toContain("Get it Done!");
    expect(out).not.toMatch(/calm-ripple|field-sweep/);
  });

  it("Calm is a green check disc with two ripples, then Calm's wordmark", () => {
    const out = mark("calm");
    expect(out.match(/motion-safe:animate-calm-ripple/g)).toHaveLength(2);
    expect(out).toContain("[animation-delay:800ms]");
    expect(out).toContain("bg-th-ok text-th-on-ok");
    expect(out).toContain('d="M20 6 9 17l-5-5"');
    expect(out).toMatch(/Get It <span class="font-rancho[^"]*text-th-acc-t">Done<\/span>/);
    expect(out).not.toContain("stroke-dasharray");
  });

  it("Field notes is the lowercase wordmark over a pen stroke with a marigold tip", () => {
    const out = mark("field");
    expect(out).toContain("get it done");
    expect(out).toContain("font-manrope");
    expect(out).toContain("motion-safe:animate-field-sweep");
    expect(out).toMatch(/bg-th-acc-sub/);
    expect(out).toMatch(/bg-th-hi/);
    expect(out.indexOf("get it done")).toBeLessThan(out.indexOf("field-sweep"));
  });

  it("inline is the mark alone, in every theme", () => {
    expect(mark("classic", "inline")).not.toContain("Get it Done!");
    expect(mark("calm", "inline")).not.toContain("Done");
    expect(mark("field", "inline")).not.toContain("get it done");
    expect(mark("field", "inline")).toContain("motion-reduce:animate-loader-breathe");
  });

  it("each theme sits inside one status region that says Loading, with the mark hidden", () => {
    for (const theme of ["classic", "calm", "field"] as const) {
      const out = renderToStaticMarkup(createElement(LoaderView, { theme }));
      expect(out.match(/role="status"/g)).toHaveLength(1);
      expect(out).toMatch(/<div aria-hidden="true" class="flex flex-col/);
      expect(out).toContain(LOADER_ENTER);
    }
  });
});

describe("Theme loaders: reduced motion (plan 53b §2)", () => {
  it("Calm: no ripples, the disc breathes", () => {
    expect(CALM_LOADER.ripple).toContain("motion-reduce:hidden");
    expect(CALM_LOADER.ripple).toContain("motion-safe:animate-calm-ripple");
    expect(CALM_LOADER.core).toContain("motion-reduce:animate-loader-breathe");
  });

  it("Field notes: the stroke is parked under the word (no animation), the word breathes", () => {
    expect(FIELD_LOADER.stroke).toContain("left-[35%]");
    expect(FIELD_LOADER.stroke).toContain("motion-safe:animate-field-sweep");
    expect(FIELD_LOADER.stroke).not.toMatch(/motion-reduce:animate/);
    expect(FIELD_LOADER.word).toBe("motion-reduce:animate-loader-breathe");
    expect(FIELD_LOADER.track).toContain("w-[200px]");
    expect(FIELD_LOADER.track).toContain("h-1");
  });

  it("every theme mark animation is motion-safe only", () => {
    for (const s of [...Object.values(CALM_LOADER), ...Object.values(FIELD_LOADER)]) {
      expect(s).not.toMatch(/(^|\s)animate-(calm|field)/);
    }
  });
});

describe("Tailwind config: theme loader timings (board 20)", () => {
  const ext = tailwindConfig.theme?.extend as {
    keyframes: Record<string, Record<string, Record<string, string>>>;
    animation: Record<string, string>;
  };

  it("calmRipple and fieldSweep keyframes", () => {
    expect(ext.keyframes.calmRipple).toEqual({ "0%": { transform: "scale(1)", opacity: ".55" }, "100%": { transform: "scale(1.9)", opacity: "0" } });
    expect(ext.keyframes.fieldSweep).toEqual({ "0%": { left: "-30%" }, "100%": { left: "100%" } });
  });

  it("calm-ripple 1.6 s and field-sweep 1.8 s, looping", () => {
    expect(ext.animation["calm-ripple"]).toBe("calmRipple 1.6s cubic-bezier(.2,.8,.2,1) infinite");
    expect(ext.animation["field-sweep"]).toBe("fieldSweep 1.8s cubic-bezier(.65,0,.35,1) infinite");
  });
});

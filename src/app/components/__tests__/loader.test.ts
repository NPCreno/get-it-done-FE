import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../../../tailwind.config";
import LoadingPage from "../loader";
import { LOADER_ENTER, LOADER_LEAVE, PAGE_IN_CLASS, loaderClasses } from "../loaderClasses";

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../../../..", rel), "utf8");
const classesOf = (s: string) => s.split(/\s+/).filter(Boolean);
const all = (c: ReturnType<typeof loaderClasses>) =>
  [c.root, c.group, c.tile, c.mark, c.track, c.arc, c.ticks, c.word ?? ""].join(" ");

describe("loaderClasses: tokens (UX-04 §1)", () => {
  it("light", () => {
    const c = loaderClasses({ dark: false });
    expect(classesOf(c.root)).toEqual(expect.arrayContaining(["absolute", "inset-0", "z-0", "bg-background-light", "pb-[8%]"]));
    expect(classesOf(c.tile)).toEqual(expect.arrayContaining(["bg-white", "border-[#E0E0E0]", "border", "size-16", "md:size-[72px]", "rounded-[18px]", "md:rounded-[20px]"]));
    expect(classesOf(c.track)).toContain("stroke-primary-100");
    expect(classesOf(c.word!)).toEqual(expect.arrayContaining(["font-rancho", "text-primary-600", "text-[30px]", "md:text-[36px]", "leading-none"]));
    expect(all(c)).not.toMatch(/dark|gray-800|primary-700/);
  });

  it("dark", () => {
    const c = loaderClasses({ dark: true });
    expect(classesOf(c.root)).toContain("bg-background-dark");
    expect(classesOf(c.tile)).toEqual(expect.arrayContaining(["bg-foreground-dark", "border-gray-800"]));
    expect(classesOf(c.track)).toContain("stroke-primary-700");
    expect(classesOf(c.word!)).toContain("text-primary-default");
    expect(all(c)).not.toMatch(/bg-white|#E0E0E0|primary-100|primary-600|background-light/);
  });

  it("the mark: arc and ticks in amber, the arc starts at the top and turns round the centre", () => {
    const c = loaderClasses();
    expect(classesOf(c.arc)).toEqual(
      expect.arrayContaining(["stroke-primary-default", "[transform-origin:15px_15px]", "[transform:rotate(-90deg)]"])
    );
    expect(classesOf(c.ticks)).toContain("stroke-primary-default");
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
    expect(classesOf(c.track)).toContain("motion-reduce:stroke-primary-default");
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
  const html = (props: Parameters<typeof LoadingPage>[0] = {}) => renderToStaticMarkup(createElement(LoadingPage, props));

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

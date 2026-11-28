import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as Icons from "../icons/AppIcons";

/** Plan 53b §6: every icon paints in currentColor, carries no fixed colour and is hidden from screen readers. */
describe("AppIcons", () => {
  const entries = Object.entries(Icons) as [string, ComponentType<{ size?: number; className?: string }>][];

  it("exports the sidebar, stat-card and task-row icons", () => {
    expect(entries.map(([n]) => n).sort()).toEqual(
      ["CheckCircleIcon", "CheckboxIcon", "DashboardIcon", "FolderOpenIcon", "ListIcon", "NotificationsIcon", "ProfileIcon", "ProjectsIcon", "TimerIcon", "TrashIcon"].sort()
    );
  });

  it.each(entries)("%s renders currentColor only, aria-hidden, at the given size", (_name, Icon) => {
    const html = renderToStaticMarkup(createElement(Icon, { size: 24, className: "text-th-acc-t" }));
    expect(html).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(html).toContain('width="24"');
    expect(html).toContain('class="text-th-acc-t"');
    expect(html).toMatch(/(fill|stroke)="currentColor"/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|="white"|="black"/);
    expect(html).not.toContain("<img");
  });

  it("the timer's hand takes the --stat-ico-hand token", () => {
    expect(renderToStaticMarkup(createElement(Icons.TimerIcon))).toContain('fill="var(--stat-ico-hand)"');
  });
});

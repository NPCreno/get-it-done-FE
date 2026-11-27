import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RD-2 grep gate (plan 52-0 §5, batch 52-1). The files this batch moved to theme tokens may not
 * bring back a hex colour or an `isDark ? … : …` colour ternary: colours come from the tokens in
 * src/styles/theme-tokens.css, which switch with the theme and mode by themselves.
 * Later batches add their own files to OWNED.
 */
const ROOT = join(process.cwd(), "src/app/components");

const OWNED = [
  // Dashboard
  "dashboard/DashboardView.tsx",
  "dashboard/DashboardHeader.tsx",
  "dashboard/StatsRow.tsx",
  "dashboard/TaskBoard.tsx",
  "dashboard/AnalyticsGrid.tsx",
  // Cards and charts
  "statsCard.tsx",
  "streakCounter.tsx",
  "MonthlyHeatmap.tsx",
  "chartCard.tsx",
  "shadcn/chart.tsx",
  "shadcn/pieChart.tsx",
  // Tasks and search
  "taskItem.tsx",
  "DashboardSearch.tsx",
  "dropdown.tsx",
  "tasks/AssigneeChip.tsx",
  "tasks/AssigneeSelect.tsx",
  // Pomodoro
  "pomodoro/faceClasses.ts",
  "pomodoro/DialTimer.tsx",
  "pomodoro/TicketTimer.tsx",
  "pomodoro/HorizonTimer.tsx",
  "pomodoro/PomodoroMini.tsx",
  "pomodoro/ModeRadios.tsx",
  "pomodoro/usePomodoroController.ts",
  "PomodoroButton.tsx",
  "modals/pomodoro.tsx",
  // Dev theme preview
  "ThemePreviewChip.tsx",
  // Batch 52-2: projects and chat. The project colour CHOICES are data (src/lib/projectColors.ts),
  // which is outside this gate on purpose.
  "projects/ProjectsView.tsx",
  "projects/ProjectGrid.tsx",
  "projects/ProjectEditorDialog.tsx",
  "projects/useProjectEditor.ts",
  "projects/projectPrefill.ts",
  "projects/sharedProject.ts",
  "projectCard.tsx",
  "modals/projectModal.tsx",
  "modals/viewProject.tsx",
  "chat/ChatPanel.tsx",
  "chat/MembersDialog.tsx",
  "chat/ProjectChatActions.tsx",
  "chat/SharedProjectsSection.tsx",
  "chat/UnreadBadge.tsx",
  "../(routes)/projects/page.tsx",
];

/**
 * A hex colour, except inside a CSS attribute selector `[stroke='#ccc']`/`[fill='…']`: recharts
 * paints its own default strokes, and chart.tsx matches them to restyle them; that's not our colour.
 */
const HEX = /(?<!\[(?:stroke|fill)=')#[0-9a-fA-F]{3,8}\b/;
/** A colour picked in JS from the mode: `isDark ? …`, `dark ? …`, `dark && …`. */
const TERNARY = /\b(isDark|dark)\s*(\?|&&)/;

function offences(rel: string): string[] {
  return readFileSync(join(ROOT, rel), "utf8")
    .split("\n")
    .flatMap((line, i) => {
      const hits: string[] = [];
      if (HEX.test(line)) hits.push(`${rel}:${i + 1}: hex colour: ${line.trim()}`);
      if (TERNARY.test(line)) hits.push(`${rel}:${i + 1}: mode ternary: ${line.trim()}`);
      return hits;
    });
}

describe("RD-2 batches 52-1 and 52-2: owned files are on theme tokens", () => {
  it("has no hex colours and no isDark colour ternaries", () => {
    expect(OWNED.flatMap(offences)).toEqual([]);
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

import type { CSSProperties } from "react";

/**
 * The colours a user can pick for a project (plan 52-2). They are DATA, not theme: the hex is saved
 * on the project and every theme shows it. So they live here, not in theme-tokens.css, and the RD-2
 * grep gate leaves this file out.
 *
 * `tint` names the card tint pair `--pc-<tint>-a/b` in src/styles/theme-tokens.css (the project's
 * colour, lighter in light mode, a dark wash in dark mode).
 */
export interface ProjectColor {
  name: string;
  color: string;
  tint: string;
}

export const PROJECT_COLORS: readonly ProjectColor[] = [
  { name: "Lavender", color: "#E6E6FA", tint: "lavender" },
  { name: "Mint", color: "#B5EAD7", tint: "mint" },
  { name: "Peach", color: "#FFDAB9", tint: "peach" },
  { name: "Sky", color: "#A0D8EF", tint: "sky" },
  { name: "Lemon", color: "#FFFACD", tint: "lemon" },
  { name: "Rose", color: "#FADADD", tint: "rose" },
  { name: "Mauve", color: "#E0B0FF", tint: "mauve" },
  { name: "Baby Blue", color: "#BDE0FE", tint: "baby-blue" },
  { name: "Coral", color: "#FFB5A7", tint: "coral" },
  { name: "Seafoam", color: "#C3FBD8", tint: "seafoam" },
];

/** The tint for a project without a known colour label. */
export const NO_TINT = "none";

/** A shared project's dot when its saved colour isn't a valid hex. */
export const FALLBACK_PROJECT_COLOR = "#9ca3af";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** The project's saved colour if it is a hex colour, else the grey fallback. */
export function projectDotColor(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : FALLBACK_PROJECT_COLOR;
}

/** The tint key for a colour label ("Baby Blue" → "baby-blue"); unknown labels get `NO_TINT`. */
export function projectTint(label: string | null | undefined): string {
  const name = (label ?? "").toLowerCase();
  return PROJECT_COLORS.find((c) => c.name.toLowerCase() === name)?.tint ?? NO_TINT;
}

/** Inline style that points a card's `--pc-a`/`--pc-b` (Tailwind `from-th-pc-a to-th-pc-b`) at its tint. */
export function projectTintStyle(label: string | null | undefined): CSSProperties {
  const tint = projectTint(label);
  return { "--pc-a": `var(--pc-${tint}-a)`, "--pc-b": `var(--pc-${tint}-b)` } as CSSProperties;
}

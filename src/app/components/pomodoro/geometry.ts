/**
 * FEAT-10 Dial geometry (board 17A). A 60-minute face: the wedge is the time left, drawn clockwise
 * from twelve o'clock, so it shrinks back to twelve as the round runs. Pure, so it is unit tested.
 */

/** The dial's SVG: centre (100, 100), wedge radius 80, drawn in a `-24 -24 248 248` viewBox. */
export const DIAL = { cx: 100, cy: 100, r: 80, faceR: 97, hubR: 46, viewBox: "-24 -24 248 248" } as const;

const HOUR = 3600;
const f2 = (n: number) => Number(n.toFixed(2)).toString();

/**
 * A pie wedge of `secondsLeft` on a 60-minute face of radius `r` around (cx, cy). 0 (or less) is
 * no wedge (`''`); an hour or more is a full disc.
 */
export function wedgePath(secondsLeft: number, cx: number, cy: number, r: number): string {
  const f = Math.min(1, Math.max(0, secondsLeft / HOUR));
  if (!(f > 0)) return "";
  if (f >= 1) {
    // Two half arcs: a single arc from a point back to itself draws nothing.
    return `M${f2(cx)} ${f2(cy - r)}A${r} ${r} 0 1 1 ${f2(cx)} ${f2(cy + r)}A${r} ${r} 0 1 1 ${f2(cx)} ${f2(cy - r)}Z`;
  }
  const a = f * 2 * Math.PI;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = a > Math.PI ? 1 : 0;
  return `M${f2(cx)} ${f2(cy)}L${f2(cx)} ${f2(cy - r)}A${r} ${r} 0 ${large} 1 ${f2(x)} ${f2(y)}Z`;
}

/** The big dial's wedge. */
export function dialWedgePath(secondsLeft: number): string {
  return wedgePath(secondsLeft, DIAL.cx, DIAL.cy, DIAL.r);
}

/** The sidebar mini's wedge (a 34 × 34 icon, radius 15). */
export function miniWedgePath(secondsLeft: number): string {
  return wedgePath(secondsLeft, 17, 17, 15);
}

/** Sixty minute ticks as one path; every fifth is longer. */
export function dialTicksPath(): string {
  let d = "";
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const r1 = i % 5 === 0 ? 84 : 89;
    const r2 = 94;
    d +=
      `M${(100 + r1 * Math.sin(a)).toFixed(1)} ${(100 - r1 * Math.cos(a)).toFixed(1)}` +
      `L${(100 + r2 * Math.sin(a)).toFixed(1)} ${(100 - r2 * Math.cos(a)).toFixed(1)}`;
  }
  return d;
}

/** The face's numbers 0, 5 … 55, outside the ticks (the y includes the text baseline offset). */
export function dialNumbers(): { label: string; x: number; y: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return {
      label: String(i * 5),
      x: Number((100 + 110 * Math.sin(a)).toFixed(1)),
      y: Number((104 - 110 * Math.cos(a)).toFixed(1)),
    };
  });
}

import { Instrument_Serif, Lato, Manrope, Poppins, Rancho } from "next/font/google";

/**
 * RD-1 fonts (plan 51b §2), self-hosted by next/font (served from /_next/static, no request to
 * Google). Each is a CSS variable on <html>; Tailwind's `font-lato`/`font-poppins`/`font-rancho`
 * and the theme tokens (`--f-head`, `--f-body`) read them.
 * Only Classic's fonts (Lato, Rancho) are preloaded (roadmap §5). Lato keeps 300 because the
 * Horizon and mini Pomodoro clocks use `font-light`.
 */
export const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
  variable: "--font-lato",
});

export const rancho = Rancho({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-rancho",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-poppins",
  preload: false,
});

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
  preload: false,
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
  preload: false,
});

/** The classes that define every `--font-*` variable; put on <html>. */
export const fontVariables = [lato, rancho, poppins, instrumentSerif, manrope].map((f) => f.variable).join(" ");

/**
 * Framer-motion timings for the dashboard stat cards (UX-05: halved at the user's request).
 * Pure, so the timings are testable without a DOM.
 */

/** The card's rise and fade, in seconds. */
export const STAT_CARD_DURATION_S = 0.25;
/** Stagger per card index, in seconds. */
export const STAT_CARD_STAGGER_S = 0.05;
/** The inner value's fade waits this long, in seconds. */
export const STAT_VALUE_DELAY_S = 0.1;

/** `delay` is a class name such as `fade-in-left-delay-2`; its trailing number is the card index. */
export function statCardTransition(delay: string): { duration: number; delay: number } {
  return {
    duration: STAT_CARD_DURATION_S,
    delay: parseFloat(delay.split("-").pop() || "0") * STAT_CARD_STAGGER_S,
  };
}

export const STAT_VALUE_TRANSITION = { delay: STAT_VALUE_DELAY_S } as const;

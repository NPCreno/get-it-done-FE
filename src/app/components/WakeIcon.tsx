import { Moon } from "lucide-react";

const Z_BASE = "absolute font-lato font-black leading-none opacity-0 motion-safe:animate-wake-z motion-reduce:hidden";

/**
 * UX-03: the sleeping-moon circle shared by the wake banner and the login/signup hint.
 * Decorative (`aria-hidden`); `moving` rocks the moon and drifts the z's (never with reduced motion).
 */
export default function WakeIcon({ moving, small = false }: { moving: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid place-items-center rounded-full bg-th-wake-ic-bg text-th-acc-t ${small ? "size-7" : "size-10"}`}
    >
      <Moon
        size={small ? 16 : 20}
        className={moving ? "origin-[50%_60%] motion-safe:animate-wake-rock" : undefined}
      />
      {moving && (
        <>
          <span className={`${Z_BASE} ${small ? "top-0.5 right-0" : "top-1.5 right-1"} text-[10px]`}>z</span>
          <span className={`${Z_BASE} ${small ? "top-0.5 right-0" : "top-1.5 right-1"} text-[8px] [animation-delay:800ms]`}>z</span>
          {!small && <span className={`${Z_BASE} top-1.5 right-1 text-[7px] [animation-delay:1600ms]`}>z</span>}
        </>
      )}
    </span>
  );
}

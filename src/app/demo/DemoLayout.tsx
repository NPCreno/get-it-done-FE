"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useDemoRuntime } from "./DemoRuntimeBoundary";

/** Top bar and banner for the demo. Deliberately no links to protected pages. */
export default function DemoLayout({ children }: { children: ReactNode }) {
  const runtime = useDemoRuntime();
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    setResetting(true);
    try {
      await runtime.reset();
    } catch {
      // A reset failure leaves the current demo data as it was; nothing to report.
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="font-rancho text-2xl">
          Get it Done!
        </Link>
        <nav aria-label="Account" className="flex items-center gap-3 text-sm">
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-primary-default px-3 py-1.5 text-white">
            Sign up free
          </Link>
        </nav>
      </header>
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <span>You&apos;re exploring a demo. Changes stay in this tab and reset on reload.</span>
        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          aria-label="Reset demo"
          className="rounded-md border border-amber-300 px-3 py-1 disabled:opacity-60"
        >
          Reset demo
        </button>
      </div>
      <main className="relative flex-1 bg-background-light p-4 md:p-6">{children}</main>
    </div>
  );
}

"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { FormProvider, useFormState } from "@/app/context/FormProvider";
import { SharingContext } from "@/lib/sharing";
import { demoUserRecord } from "./demoUser";
import { systemClock } from "./fake/clock";
import { DEMO_USER_ID } from "./fake/seed";
import { createDemoRuntime, type DemoRuntime } from "./runtime";

const RuntimeContext = createContext<DemoRuntime | null>(null);

/** The running demo, for the layout's Reset button. */
export function useDemoRuntime(): DemoRuntime {
  const rt = useContext(RuntimeContext);
  if (!rt) throw new Error("useDemoRuntime must be used inside DemoRuntimeBoundary");
  return rt;
}

/**
 * Sets the INNER FormProvider's identity to the demo user and renders children only once it is
 * set, so no query ever runs with a missing or real id. The outer (root) identity is untouched.
 */
function DemoIdentity({ children }: { children: ReactNode }) {
  const { userData, setUserData } = useFormState();
  useLayoutEffect(() => {
    setUserData(demoUserRecord(Date.now()));
  }, [setUserData]);
  return userData?.user_id === DEMO_USER_ID ? <>{children}</> : null;
}

function DemoSkeleton() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading the demo…
    </div>
  );
}

/**
 * Owns one demo runtime per mount. Initialization order: the runtime is created (pure), the
 * effect installs the transport, and only then does `ready` let the dashboard mount, under a
 * private FormProvider, the demo identity and the demo's own (unregistered) QueryClient.
 * Cleanup unmounts first, then stops the runtime (Strict Mode: start, stop, start).
 */
export default function DemoRuntimeBoundary({ children }: { children: ReactNode }) {
  const [runtime] = useState(() => createDemoRuntime({ clock: systemClock }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    runtime.start();
    setReady(true);
    return () => {
      setReady(false);
      runtime.stop();
    };
  }, [runtime]);

  if (!ready) return <DemoSkeleton />;
  return (
    <RuntimeContext.Provider value={runtime}>
      <FormProvider>
        <DemoIdentity>
          {/* FEAT-09: no shared projects or chat routes in the demo. */}
          <SharingContext.Provider value={false}>
            <QueryClientProvider client={runtime.queryClient}>{children}</QueryClientProvider>
          </SharingContext.Provider>
        </DemoIdentity>
      </FormProvider>
    </RuntimeContext.Provider>
  );
}

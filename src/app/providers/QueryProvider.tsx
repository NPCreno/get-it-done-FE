"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { createQueryClient, registerQueryClient } from "@/lib/query/client";
import { connectServerWake } from "@/lib/query/wake";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const c = createQueryClient();
    registerQueryClient(c);
    return c;
  });
  // UX-03: refetch active queries in error once the backend answers after a cold start.
  useEffect(() => connectServerWake(client), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

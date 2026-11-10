"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { createQueryClient, registerQueryClient } from "@/lib/query/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const c = createQueryClient();
    registerQueryClient(c);
    return c;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

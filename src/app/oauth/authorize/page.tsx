"use client";
import { Suspense } from "react";
import ConsentView from "@/app/components/oauth/ConsentView";

/**
 * FEAT-07d `/oauth/authorize`: the OAuth consent page claude.ai and other MCP clients open.
 * Protected by the middleware (a signed-out visitor goes to `/login?next=…` and comes back), with
 * no app sidebar. `next.config.mjs` forbids framing it.
 */
export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={null}>
      <ConsentView />
    </Suspense>
  );
}

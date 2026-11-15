"use client";

/**
 * SINGLE SWAP POINT. Replace this file's content with a re-export of the layout-free dashboard
 * body from ARCH-01 PR C (it must not call useProfile, useUnreadCount, useNotifications or
 * useNotificationStream), for example:
 *   export { default } from "@/app/components/dashboard/DashboardView";
 * Until then this placeholder renders, and the PR stays a draft.
 */
export default function DemoBody() {
  return (
    <div className="p-8" data-testid="demo-placeholder">
      <p className="font-semibold">Demo placeholder</p>
      <p className="text-sm text-muted-foreground">
        The dashboard appears here once the layout-free dashboard body (ARCH-01 PR C) is merged.
      </p>
    </div>
  );
}

"use client";

/**
 * The demo body is the real dashboard body. It is layout-free by contract (no useProfile,
 * useUnreadCount, useNotifications, notification stream or token reads; enforced by the lint
 * override in .eslintrc.json), so it runs against the in-browser fake API with no backend.
 */
export { default } from "@/app/components/dashboard/DashboardView";

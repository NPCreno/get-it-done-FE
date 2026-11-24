"use client";
import { useSyncExternalStore } from "react";
import { AWAKE_SNAPSHOT, serverWake, type WakeSnapshot } from "./serverWake";

const serverSnapshot = () => AWAKE_SNAPSHOT;

/** UX-03: the tab's server-wake state (always `awake` during server rendering). */
export function useServerWake(): WakeSnapshot {
  return useSyncExternalStore(serverWake.subscribe, serverWake.getSnapshot, serverSnapshot);
}

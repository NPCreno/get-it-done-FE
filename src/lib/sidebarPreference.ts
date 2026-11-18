/**
 * The desktop sidebar's expanded/collapsed choice, remembered per browser (UX-02). Storage may be
 * missing, blocked or full, and its value may be anything: every path falls back to collapsed.
 */
export const SIDEBAR_STORAGE_KEY = "gid.sidebar.expanded";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StorageSource = () => StorageLike | null | undefined;

const browserStorage: StorageSource = () => (typeof window === "undefined" ? null : window.localStorage);

/** The stored choice; collapsed (false) unless the stored value is exactly `true`. */
export function readSidebarExpanded(getStorage: StorageSource = browserStorage): boolean {
  try {
    const raw = getStorage()?.getItem(SIDEBAR_STORAGE_KEY);
    if (raw == null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

/** Saves the choice; a storage failure is ignored (the choice then lasts for this page only). */
export function writeSidebarExpanded(expanded: boolean, getStorage: StorageSource = browserStorage): void {
  try {
    getStorage()?.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(expanded));
  } catch {
    // private mode, blocked site data or a full quota: keep the in-memory choice
  }
}

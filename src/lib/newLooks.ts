/**
 * RD-3 (plan 53b §4): the one-time "New: pick a look" dashboard card. Pure, with the storage passed in
 * (localStorage in the browser, a fake in tests). Shown once per device: the first time it shows, it is
 * remembered, and either button also remembers it. Never in /demo, and never while fewer than two themes are
 * enabled (Classic only until plan 54): there is nothing to pick yet, and the turn is not used up. Storage that
 * throws counts as "seen", so a locked-down browser is never nagged.
 */
export const NEW_LOOKS_KEY = "gid_new_looks_seen";

export interface NewLooksStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function shouldShowNewLooks(storage: NewLooksStorage | null | undefined, demo: boolean, enabledThemes: number): boolean {
  if (demo || !storage || enabledThemes < 2) return false;
  try {
    return storage.getItem(NEW_LOOKS_KEY) === null;
  } catch {
    return false;
  }
}

export function markNewLooksSeen(storage: NewLooksStorage | null | undefined): void {
  try {
    storage?.setItem(NEW_LOOKS_KEY, "1");
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

/**
 * The one decision the card makes when it mounts: show it now (and remember that it was shown), or not.
 * Returns whether to show.
 */
export function takeNewLooksTurn(storage: NewLooksStorage | null | undefined, demo: boolean, enabledThemes: number): boolean {
  const show = shouldShowNewLooks(storage, demo, enabledThemes);
  if (show) markNewLooksSeen(storage);
  return show;
}

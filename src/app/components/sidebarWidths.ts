/** Desktop sidebar widths (UX-02). The panel animates between these; nothing else sets a width. */
export const SIDEBAR_COLLAPSED_WIDTH = 60;
export const SIDEBAR_EXPANDED_WIDTH = 146;
/** The layout wrapper's extra width around the panel, as before UX-02. */
export const SIDEBAR_GUTTER = 20;

export function sidebarPanelWidth(expanded: boolean): number {
  return expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
}

export function sidebarWrapperWidth(expanded: boolean): number {
  return sidebarPanelWidth(expanded) + SIDEBAR_GUTTER;
}

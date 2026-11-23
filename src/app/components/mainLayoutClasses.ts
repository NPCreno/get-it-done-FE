/**
 * Class strings for `MainLayout`'s boxes.
 *
 * BUG-06: the root and the scroll container must stay `relative`. Tailwind's `sr-only` is
 * `position: absolute`; with no positioned ancestor, a hidden caption or label far down the
 * scroll content is placed against the page, stretches the document past the `h-screen` layout,
 * and the window grows its own scrollbar and a blank band below the app. Don't remove `relative`.
 */
export const MAIN_LAYOUT_ROOT_CLASS = "relative flex h-screen overflow-hidden";
export const MAIN_LAYOUT_SCROLL_CLASS = "relative h-full flex flex-col overflow-y-auto overflow-x-hidden pt-16 md:pt-0";

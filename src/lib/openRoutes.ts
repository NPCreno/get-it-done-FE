/**
 * Routes open to everyone, signed in or not. Unlike `publicRoutes` in the middleware they never
 * redirect a signed-in user and never touch cookies. Pure, so it can be tested without Next.
 */
export const openRoutes = ["/demo"] as const;

/** `/demo` and `/demo/x` are open; `/demonstration` and `/dashboard` are not. */
export function isOpenRoute(pathname: string): boolean {
  return openRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

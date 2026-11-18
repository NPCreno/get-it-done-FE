import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * BUG-03: files in `public/` must skip the middleware, or signed-out visitors get a redirect to
 * /login instead of the image. Rebuilds the regex from `config.matcher[0]` the way Next does
 * (anchored with `^` and `$`). A path that matches runs the middleware (protected).
 */
let matcher: RegExp;

beforeAll(async () => {
  // middleware.ts throws at import time without JWT_SECRET.
  vi.stubEnv("JWT_SECRET", "test-secret-for-matcher");
  const { config } = await import("../middleware");
  expect(config.matcher).toHaveLength(1);
  matcher = new RegExp(`^${config.matcher[0]}$`);
});

describe("middleware matcher", () => {
  it.each([
    "/",
    "/dashboard",
    "/projects/1",
    "/api/auth/refresh",
    "/demo",
    "/login",
    "/svgs",
    "/api/report.json",
  ])("runs the middleware for %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    "/svgs/list-outline.svg",
    "/svgs/notifIcons/x.svg",
    "/svgs/Add%20project%20big.svg",
    "/get-it-done-icon.ico",
    "/people-meeting.jpg",
    "/getItDoneLogo.png",
    "/soundfx/bell.mp3",
    "/favicon.ico",
    "/_next/static/x.js",
    "/_next/image",
  ])("serves %s without the middleware", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});

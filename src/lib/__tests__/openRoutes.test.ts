import { describe, expect, it } from "vitest";
import { isOpenRoute, openRoutes } from "../openRoutes";

describe("D7: isOpenRoute", () => {
  it.each(["/demo", "/demo/", "/demo/x", "/demo/x/y"])("%s is open", (p) => expect(isOpenRoute(p)).toBe(true));
  it.each(["/", "/demonstration", "/demos", "/dashboard", "/login", "/signup", "/x/demo", "/api/demo", "/Demo"])(
    "%s is not open",
    (p) => expect(isOpenRoute(p)).toBe(false)
  );
  it("is only the demo", () => expect([...openRoutes]).toEqual(["/demo"]));
});

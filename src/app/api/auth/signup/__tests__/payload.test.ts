import { describe, expect, it } from "vitest";
import { buildSignupPayload, toSignupResponse } from "../payload";

const valid = { fullname: "Jane Doe", username: "janedoe", email: "jane@example.com", password: "Passw0rd!1" };

describe("buildSignupPayload", () => {
  it("forwards only the four signup fields", () => {
    const out = buildSignupPayload({ ...valid, user_id: "x", role: "admin", extra: 1 });
    expect(out).toEqual(valid);
    expect(Object.keys(out!).sort()).toEqual(["email", "fullname", "password", "username"]);
  });
  it("rejects bad input", () => {
    expect(buildSignupPayload(null)).toBeNull();
    expect(buildSignupPayload({ ...valid, email: "nope" })).toBeNull();
    expect(buildSignupPayload({ ...valid, username: undefined })).toBeNull();
  });
});

describe("toSignupResponse", () => {
  it("passes an envelope through and drops unknown fields", () => {
    expect(toSignupResponse({ status: "success", message: "ok", data: { a: 1 }, password: "x" }, true)).toEqual({
      status: "success",
      message: "ok",
      data: { a: 1 },
    });
  });
  it("maps a Nest error body (no status) to an error envelope with its message", () => {
    expect(toSignupResponse({ statusCode: 429, message: "Too many attempts. Please wait and try again." }, false)).toEqual({
      status: "error",
      message: "Too many attempts. Please wait and try again.",
    });
  });
  it("rejects a 2xx body that is not an envelope, and non-objects", () => {
    expect(toSignupResponse({ message: "hi" }, true)).toBeNull();
    expect(toSignupResponse("x", true)).toBeNull();
    expect(toSignupResponse(null, false)).toBeNull();
  });
});

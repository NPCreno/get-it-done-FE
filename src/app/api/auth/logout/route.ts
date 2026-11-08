import { NextResponse } from "next/server";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true });

  response.cookies.set("access_token", "", {
    maxAge: 0,
    secure,
    sameSite: "strict",
    path: "/",
    httpOnly: false,
  });
  response.cookies.set("refresh_token", "", {
    maxAge: 0,
    secure,
    sameSite: "strict",
    path: "/",
    httpOnly: true,
  });

  return response;
}

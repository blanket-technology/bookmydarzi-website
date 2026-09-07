import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";
import { setSessionCookies } from "@/lib/session";

// Proxies POST /auth/email/login. The browser posts email/password here;
// this route calls the real BMD API server-side and stores the returned
// JWTs as httpOnly cookies - the browser only ever gets back a plain
// { user } payload, never the tokens themselves.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 422 });
  }

  try {
    const res = await bmdFetch<{
      access_token?: string;
      refresh_token?: string;
      user?: unknown;
    }>("/auth/email/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    });

    if (!res.access_token) {
      return NextResponse.json({ message: "Login succeeded but no session was returned." }, { status: 502 });
    }

    await setSessionCookies(res.access_token, res.refresh_token ?? null);
    // /auth/email/login doesn't embed the profile by default - fetch it now
    // so the client gets the real signed-in user, not null.
    const user = await bmdFetch("/users/profile").catch(() => null);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: "Login failed. Please try again." }, { status: 500 });
  }
}

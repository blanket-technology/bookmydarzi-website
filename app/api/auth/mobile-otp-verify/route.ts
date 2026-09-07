import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";
import { setSessionCookies } from "@/lib/session";

// Proxies POST /auth/mobile/verify-otp - completes the [PRIMARY] mobile OTP
// login/signup flow (same endpoint handles both new and returning users -
// see app/schemas/auth.py's MobileOtpVerifyRequest). On success the backend
// returns JWTs same as email login, stored as httpOnly cookies exactly like
// app/api/auth/login/route.ts does.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const mobile = typeof body?.mobile === "string" ? body.mobile : "";
  const otp = typeof body?.otp === "string" ? body.otp : "";

  if (!/^\d{10}$/.test(mobile) || otp.length !== 6) {
    return NextResponse.json({ message: "Enter the 6-digit OTP." }, { status: 422 });
  }

  try {
    const res = await bmdFetch<{
      access_token?: string;
      refresh_token?: string;
      user?: unknown;
    }>("/auth/mobile/verify-otp", {
      method: "POST",
      body: { mobile, otp },
      skipAuth: true,
    });

    if (!res.access_token) {
      return NextResponse.json({ message: "OTP verified but no session was returned." }, { status: 502 });
    }

    await setSessionCookies(res.access_token, res.refresh_token ?? null);
    // Verify doesn't embed the profile by default - fetch it now so the
    // client gets the real signed-in user, not null.
    const user = await bmdFetch("/users/profile").catch(() => null);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: "OTP verification failed. Please try again." }, { status: 500 });
  }
}

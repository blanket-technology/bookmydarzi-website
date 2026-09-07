import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";

// Proxies POST /auth/mobile/request-otp - the [PRIMARY] login path the
// mobile app uses (see react_app/services/authService.ts's
// requestOtpRequest). No cookies are set here; this only sends the SMS OTP.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const mobile = typeof body?.mobile === "string" ? body.mobile : "";

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ message: "Enter a valid 10-digit mobile number." }, { status: 422 });
  }

  try {
    const res = await bmdFetch<{ message?: string }>("/auth/mobile/request-otp", {
      method: "POST",
      body: { mobile },
      skipAuth: true,
    });
    return NextResponse.json({ message: res.message ?? "OTP sent successfully" });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: "Could not send OTP. Please try again." }, { status: 500 });
  }
}

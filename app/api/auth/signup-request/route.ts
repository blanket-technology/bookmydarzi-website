import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";

// Proxies POST /auth/email/signup (step 1 of the 2-step signup flow - see
// react_app/services/authService.ts's registerRequest). Sends an email OTP;
// no JWT is returned at this stage, so there is nothing to store as a
// session cookie yet. Step 2 is app/api/auth/verify-otp/route.ts.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const first_name = typeof body?.first_name === "string" ? body.first_name : "";
  const last_name = typeof body?.last_name === "string" ? body.last_name : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const mobile = typeof body?.mobile === "string" ? body.mobile : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!first_name || !last_name || !email || !mobile || !password) {
    return NextResponse.json({ message: "All fields are required." }, { status: 422 });
  }

  try {
    const res = await bmdFetch<{ message?: string }>("/auth/email/signup", {
      method: "POST",
      body: { first_name, last_name, email, mobile, password },
      skipAuth: true,
    });
    return NextResponse.json({ message: res.message ?? "OTP sent to your email." });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: "Signup failed. Please try again." }, { status: 500 });
  }
}

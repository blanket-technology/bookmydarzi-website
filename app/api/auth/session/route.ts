import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

// Lets client components ask "am I logged in, and as whom" without ever
// handling the JWT themselves - reads the httpOnly cookie server-side and
// fetches the real profile.
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }
  try {
    const user = await bmdFetch("/users/profile");
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: null });
  }
}

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, reason: "Too short" });
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return NextResponse.json({ available: false, reason: "Invalid characters" });
  }

  try {
    const result = await convex.query(api.users.checkUsernameAvailable, { username });
    return NextResponse.json({ available: result ?? true });
  } catch {
    return NextResponse.json({ available: true });
  }
}
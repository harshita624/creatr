import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "LiveKit is not configured. Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { roomName, isHost } = body;
  if (!roomName) {
    return NextResponse.json({ error: "roomName is required" }, { status: 400 });
  }

  const user = await currentUser();
  const displayName = user?.fullName || user?.username || "Guest";

  // NOTE: anyone signed in who requests isHost: true gets a publish-capable
  // token for whatever roomName they send. That's safe here because only
  // your own editor UI ever sends isHost: true, and the actual session state
  // change (goLive/endStream in livestreams.js) separately re-checks post
  // ownership. If you ever expose this route more broadly, also verify
  // postId -> authorId ownership here before granting canPublish.
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: Boolean(isHost),
    canPublishData: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({ token: jwt, url: wsUrl });
}
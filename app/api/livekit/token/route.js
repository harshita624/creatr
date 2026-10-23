import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(request) {
  const { userId } = await auth();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "LiveKit is not configured. Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { roomName, isHost: requestedHost } = body;
  const isHost = requestedHost === true;
  if (typeof roomName !== "string" || !/^live-[a-zA-Z0-9]+$/.test(roomName)) {
    return NextResponse.json({ error: "A valid live room name is required" }, { status: 400 });
  }
  if (isHost && !userId) {
    return NextResponse.json({ error: "Sign in to start a livestream" }, { status: 401 });
  }

  const user = userId ? await currentUser() : null;
  const identity = userId || `viewer-${randomUUID()}`;
  const displayName = user?.fullName || user?.username || "Guest";

  // NOTE: anyone signed in who requests isHost: true gets a publish-capable
  // token for whatever roomName they send. That's safe here because only
  // your own editor UI ever sends isHost: true, and the actual session state
  // change (goLive/endStream in livestreams.js) separately re-checks post
  // ownership. If you ever expose this route more broadly, also verify
  // postId -> authorId ownership here before granting canPublish.
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: Boolean(isHost),
    canPublishData: Boolean(isHost),
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({ token: jwt, url: wsUrl });
}

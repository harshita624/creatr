import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
    return NextResponse.json({ error: "Image uploads are not configured on the server." }, { status: 503 });
  }

  const imagekit = new ImageKit({
    publicKey: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  });

  return NextResponse.json({
    ...imagekit.getAuthenticationParameters(),
    publicKey: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    userId,
  });
}

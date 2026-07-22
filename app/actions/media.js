"use server";

import { isImageKitUrl } from "@/lib/video-thumbnail";

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

function isDirectVideoUrl(url) {
  try {
    return DIRECT_VIDEO_EXTENSIONS.some((ext) =>
      new URL(url).pathname.toLowerCase().endsWith(ext)
    );
  } catch {
    return false;
  }
}

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getVimeoId(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const id = u.pathname.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function getVimeoThumbnail(id) {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

/**
 * Fetches a remote video and stores a copy in our own ImageKit media
 * library, so it gets a first-class ik.imagekit.io URL. This is what
 * lets us generate thumbnails server-side later — instead of ever
 * touching a <canvas> with cross-origin video, which browsers
 * permanently block from being read back ("tainted canvas").
 */
async function mirrorToImageKit(remoteUrl) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Video mirroring isn't configured on the server");
  }

  const form = new FormData();
  form.append("file", remoteUrl); // ImageKit fetches this URL itself, server-side
  form.append("fileName", `mirrored-${Date.now()}.mp4`);
  form.append("folder", "creator-media");
  form.append("useUniqueFileName", "true");

  const auth = Buffer.from(`${privateKey}:`).toString("base64");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not mirror this video");
  return data.url;
}

async function toPlayableFileUrl(url) {
  if (isImageKitUrl(url)) return { url, warning: null };
  try {
    const mirrored = await mirrorToImageKit(url);
    return { url: mirrored, warning: null };
  } catch (error) {
    // Playback still works from the original URL — only thumbnail
    // capture is unavailable if mirroring fails.
    return { url, warning: error.message };
  }
}

export async function resolveVideoUrl(rawUrl) {
  const url = rawUrl?.trim();
  if (!url) return { success: false, error: "No URL provided" };

  if (isDirectVideoUrl(url)) {
    const { url: playable, warning } = await toPlayableFileUrl(url);
    return { success: true, type: "file", url: playable, warning };
  }

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      success: true,
      type: "embed",
      url: `https://www.youtube.com/embed/${youtubeId}`,
      provider: "YouTube",
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      success: true,
      type: "embed",
      url: `https://player.vimeo.com/video/${vimeoId}`,
      provider: "Vimeo",
      thumbnailUrl: await getVimeoThumbnail(vimeoId),
    };
  }

  // Fall back: fetch the page server-side and look for a direct file link
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MediaResolverBot/1.0)" },
    });
    if (!res.ok) return { success: false, error: `Couldn't fetch that page (${res.status})` };

    const html = await res.text();
    const og =
      html.match(/<meta[^>]+property=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url)?["']/i);
    const sourceTag = html.match(/<source[^>]+src=["']([^"']+\.(?:mp4|webm|mov))["']/i);

    const found = og?.[1] || sourceTag?.[1];
    if (!found) {
      return {
        success: false,
        error: "Couldn't find a playable video on that page. Try pasting a direct .mp4 link instead.",
      };
    }

    const absolute = new URL(found, url).toString();
    const { url: playable, warning } = await toPlayableFileUrl(absolute);
    return { success: true, type: "file", url: playable, warning };
  } catch {
    return { success: false, error: "Couldn't reach that URL" };
  }
}
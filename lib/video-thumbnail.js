// Pure, client-safe helpers for ImageKit's URL-based video thumbnail
// transformation. No secrets involved — safe to import from both
// client components and server actions.

const IMAGEKIT_HOSTNAME_FRAGMENT = "ik.imagekit.io";

export function isImageKitUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes(IMAGEKIT_HOSTNAME_FRAGMENT);
  } catch {
    return false;
  }
}

/**
 * Builds a URL that returns a JPG frame from an ImageKit-hosted video,
 * generated server-side by ImageKit — no <canvas>, no CORS, no tainting.
 * Returns null if the given URL isn't hosted on ImageKit.
 */
export function getVideoThumbnailUrl(videoUrl, offsetSeconds = 0) {
  if (!isImageKitUrl(videoUrl)) return null;
  try {
    const url = new URL(videoUrl);
    const offset = Math.max(0, Math.floor(offsetSeconds || 0));
    return `${url.origin}${url.pathname}/ik-thumbnail.jpg?tr=so-${offset}`;
  } catch {
    return null;
  }
}
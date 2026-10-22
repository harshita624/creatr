"use client";

import { useEffect, useState } from "react";
import { resolvePodcastUrl } from "@/app/actions/media";

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|wav|ogg|opus|flac)(?:$|[?#])/i;

export default function PodcastAudioPlayer({ src, className = "w-full" }) {
  const [audioUrl, setAudioUrl] = useState(AUDIO_EXTENSIONS.test(src || "") ? src : "");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!src || AUDIO_EXTENSIONS.test(src)) {
      setAudioUrl(src || "");
      setError("");
      return () => { cancelled = true; };
    }

    setAudioUrl("");
    setError("");
    resolvePodcastUrl(src).then((result) => {
      if (cancelled) return;
      if (result.success) setAudioUrl(result.url);
      else setError(result.error || "Could not load this podcast episode");
    }).catch(() => {
      if (!cancelled) setError("Could not load this podcast episode");
    });
    return () => { cancelled = true; };
  }, [src]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!audioUrl) return <p className="text-sm text-neutral-500">Loading podcast episode…</p>;
  return <audio src={audioUrl} controls preload="none" className={className} />;
}

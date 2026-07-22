"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Radio, Users } from "lucide-react";

export default function LivestreamViewer({ postId }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const roomRef = useRef(null);

  const session = useQuery(api.livestreams.getPublicSessionForPost, postId ? { postId } : "skip");

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || session.status !== "live" || connected || connecting) return;

    let cancelled = false;

    async function join() {
      setConnecting(true);
      setError("");
      try {
        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: session.roomName, isHost: false }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error || "Could not join the stream");
        if (cancelled) return;

        const { Room, RoomEvent } = await import("livekit-client");
        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === "video" && videoRef.current) track.attach(videoRef.current);
          if (track.kind === "audio" && audioRef.current) track.attach(audioRef.current);
        });
        room.on(RoomEvent.ParticipantConnected, () => setViewerCount(room.remoteParticipants.size));
        room.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(room.remoteParticipants.size));
        room.on(RoomEvent.Disconnected, () => setConnected(false));

        await room.connect(tokenData.url, tokenData.token);
        if (cancelled) {
          room.disconnect();
          return;
        }
        setConnected(true);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not join the stream");
      } finally {
        if (!cancelled) setConnecting(false);
      }
    }

    join();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [session?.status, session?.roomName]);

  if (!session || session.status !== "live") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-slate-400">
        This stream isn't live right now.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900">
      <video ref={videoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
      <audio ref={audioRef} autoPlay />
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-sm font-semibold text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting to the stream...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center text-sm font-semibold text-red-300">
          {error}
        </div>
      )}
      {connected && (
        <>
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            <Radio className="h-3 w-3" />
            LIVE
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
            <Users className="h-3.5 w-3.5" />
            {viewerCount}
          </div>
        </>
      )}
    </div>
  );
}
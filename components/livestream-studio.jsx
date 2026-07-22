"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, Radio, Users, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LivestreamStudio({ postId, onEnsureDraft }) {
  const videoRef = useRef(null);
  const roomRef = useRef(null);

  const session = useQuery(api.livestreams.getSessionForPost, postId ? { postId } : "skip");
  const goLiveMutation = useMutation(api.livestreams.goLive);
  const endStreamMutation = useMutation(api.livestreams.endStream);
  const recordPeakViewers = useMutation(api.livestreams.recordPeakViewers);

  const [connecting, setConnecting] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  const handleGoLive = async () => {
    setConnecting(true);
    setError("");
    try {
      const ensuredId = postId || (await onEnsureDraft?.());
      if (!ensuredId) throw new Error("Save the draft first");

      const { roomName } = await goLiveMutation({ postId: ensuredId });

      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, isHost: true }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || "Could not get a stream token");

      // Loaded only when you actually go live, so the editor doesn't ship
      // this (fairly large) WebRTC bundle on every page load.
      const { Room, RoomEvent, Track, createLocalTracks } = await import("livekit-client");

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => setViewerCount(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(room.remoteParticipants.size));
      room.on(RoomEvent.Disconnected, () => setIsLive(false));

      await room.connect(tokenData.url, tokenData.token);

      const tracks = await createLocalTracks({ audio: true, video: true });
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
      }

      setIsLive(true);
      toast.success("You're live");
    } catch (err) {
      setError(err.message || "Could not go live");
      toast.error(err.message || "Could not go live");
    } finally {
      setConnecting(false);
    }
  };

  const handleEndStream = async () => {
    try {
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (postId) {
        await recordPeakViewers({ postId, viewerCount });
        await endStreamMutation({ postId });
      }
      setIsLive(false);
      setViewerCount(0);
      toast.success("Stream ended");
    } catch (err) {
      toast.error(err.message || "Failed to end stream cleanly");
    }
  };

  const toggleMic = () => {
    roomRef.current?.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn((value) => !value);
  };

  const toggleCamera = () => {
    roomRef.current?.localParticipant.setCameraEnabled(!cameraOn);
    setCameraOn((value) => !value);
  };

  const alreadyLiveElsewhere = session?.status === "live" && !isLive;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Livestream studio</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
            <Radio className="h-5 w-5 text-red-500" />
            Go live from your browser
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Uses your camera and mic directly — no separate streaming software needed.
          </p>
        </div>
        {isLive && (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-slate-900">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-400">
            Camera preview appears once you go live
          </div>
        )}
        {isLive && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
            <Users className="h-3.5 w-3.5" />
            {viewerCount} watching
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {alreadyLiveElsewhere && (
        <p className="mt-3 text-sm font-semibold text-amber-600">
          This post shows as live from another session. Go live here to take over the broadcast.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isLive ? (
          <Button onClick={handleGoLive} disabled={connecting} className="soft-button">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Go live
          </Button>
        ) : (
          <>
            <Button onClick={toggleMic} className="quiet-button">
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-500" />}
              {micOn ? "Mute" : "Unmute"}
            </Button>
            <Button onClick={toggleCamera} className="quiet-button">
              {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-500" />}
              {cameraOn ? "Camera off" : "Camera on"}
            </Button>
            <Button onClick={handleEndStream} variant="outline" className="border-red-100 text-red-500 hover:bg-red-50">
              End stream
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
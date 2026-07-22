"use client";

import { useState } from "react";
import {
  ChevronRight, ImageIcon, Music2, Play, Scissors, Sparkles, X, Zap,
} from "lucide-react";
import { toast } from "sonner";

/* Free-to-use stock music vibes stored in postMeta.music as metadata.
   The actual audio URL can be added later via a music API integration.
   On the feed/reels player, postMeta.music shows as the track name. */
const MUSIC_LIBRARY = [
  { id: "1", title: "Chill Vibes",      artist: "Lo-Fi Beats",    duration: "2:45", genre: "Lo-Fi"      },
  { id: "2", title: "Energy Rush",      artist: "EDM Studio",     duration: "3:12", genre: "EDM"        },
  { id: "3", title: "Acoustic Morning", artist: "Guitar Solo",    duration: "2:30", genre: "Acoustic"   },
  { id: "4", title: "Hip Hop Groove",   artist: "Beat Factory",   duration: "3:00", genre: "Hip-Hop"    },
  { id: "5", title: "Cinematic Epic",   artist: "Orchestra Plus", duration: "4:15", genre: "Cinematic"  },
  { id: "6", title: "Pop Anthem",       artist: "Radio Hits",     duration: "3:30", genre: "Pop"        },
  { id: "7", title: "Sunset Vibes",     artist: "Tropical House", duration: "3:20", genre: "House"      },
  { id: "8", title: "Dark Trap",        artist: "Night Studio",   duration: "2:55", genre: "Trap"       },
  { id: "9", title: "Phonk Drive",      artist: "Drift Audio",    duration: "2:40", genre: "Phonk"      },
  { id:"10", title: "Jazzy Coffee",     artist: "Jazz Café",      duration: "3:10", genre: "Jazz"       },
];

const GENRES = ["All", "Lo-Fi", "EDM", "Acoustic", "Hip-Hop", "Pop", "House", "Trap", "Phonk", "Cinematic", "Jazz"];
const SPEEDS = ["0.3×", "0.5×", "1×", "2×", "3×"];
const COVERS = ["First frame", "Last frame", "Custom thumbnail"];

export default function ReelEditorPanel({ form }) {
  const { watch, setValue } = form;
  const values = watch();

  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [genre,           setGenre]           = useState("All");
  const [generatingAI,    setGeneratingAI]    = useState(false);

  const selectedMusic = values.postMeta?.music || "";
  const selectedSpeed = values.postMeta?.readinessNotes || "1×";
  const selectedCover = values.postMeta?.playlist || "First frame";

  const filtered = genre === "All" ? MUSIC_LIBRARY : MUSIC_LIBRARY.filter((t) => t.genre === genre);

  const setMusic = (track) => {
    setValue("postMeta.music", `${track.title} · ${track.artist}`, { shouldDirty: true });
    setShowMusicPicker(false);
    toast.success(`Music selected: ${track.title}`);
  };

  const removeMusic = () => {
    setValue("postMeta.music", "", { shouldDirty: true });
    toast.success("Music removed");
  };

  const generateCaption = async () => {
    const title = values.title?.trim();
    if (!title) { toast.error("Add a reel hook first"); return; }
    setGeneratingAI(true);
    try {
      const res  = await fetch("/api/ai/caption-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category: values.category }),
      });
      const data = await res.json();
      if (data.caption) {
        const tags = (data.hashtags ?? []).join(" ");
        setValue("postMeta.caption", `${data.caption}\n\n${tags}`, { shouldDirty: true });
        toast.success("Caption generated!");
      }
    } catch {
      toast.error("Caption generation failed");
    } finally { setGeneratingAI(false); }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#dbdbdb] bg-white">
        <div className="border-b border-[#efefef] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#262626]">Reel options</p>
          <p className="text-[11px] text-[#8e8e8e]">Music, speed, cover, AI caption</p>
        </div>

        <div className="divide-y divide-[#efefef]">

          {/* ── Music ──────────────────────────────────────────── */}
          <RowButton
            icon={
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500">
                <Music2 className="h-4 w-4 text-white" />
              </div>
            }
            title="Add music"
            subtitle={selectedMusic || "Search or browse tracks"}
            subtitleColor={selectedMusic ? "#0095f6" : undefined}
            right={
              selectedMusic ? (
                <button type="button" onClick={removeMusic}
                  className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#efefef]">
                  <X className="h-3.5 w-3.5 text-[#262626]" />
                </button>
              ) : null
            }
            onClick={() => setShowMusicPicker(true)}
          />

          {/* ── Speed ──────────────────────────────────────────── */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefef] text-[13px] font-bold text-[#262626]">
                {selectedSpeed}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#262626]">Speed</p>
                <p className="text-[11px] text-[#8e8e8e]">Adjust video playback speed</p>
              </div>
            </div>
            <div className="flex gap-2 pl-12">
              {SPEEDS.map((s) => (
                <button key={s} type="button"
                  onClick={() => setValue("postMeta.readinessNotes", s, { shouldDirty: true })}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    selectedSpeed === s
                      ? "border-[#0095f6] bg-[#0095f6] text-white"
                      : "border-[#dbdbdb] text-[#262626] hover:bg-[#fafafa]"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cover ──────────────────────────────────────────── */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefef]">
                <ImageIcon className="h-4 w-4 text-[#262626]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#262626]">Cover image</p>
                <p className="text-[11px] text-[#8e8e8e]">Shown before the reel plays</p>
              </div>
            </div>
            <div className="flex gap-2 pl-12">
              {COVERS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setValue("postMeta.playlist", c, { shouldDirty: true })}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    selectedCover === c
                      ? "border-[#0095f6] bg-[#0095f6] text-white"
                      : "border-[#dbdbdb] text-[#262626] hover:bg-[#fafafa]"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Trim ───────────────────────────────────────────── */}
          <RowButton
            icon={
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefef]">
                <Scissors className="h-4 w-4 text-[#262626]" />
              </div>
            }
            title="Trim & chapters"
            subtitle="Use the Video Studio panel above"
            onClick={() => toast.info("Scroll up to the Video Studio section")}
          />

          {/* ── AI Caption ─────────────────────────────────────── */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-pink-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#262626]">AI caption + hashtags</p>
                  <p className="text-[11px] text-[#8e8e8e]">Generated from your reel title</p>
                </div>
              </div>
              <button type="button" onClick={generateCaption} disabled={generatingAI}
                className="rounded-full bg-[#0095f6] px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50 hover:bg-[#1877f2] transition-colors">
                {generatingAI ? "..." : "Generate"}
              </button>
            </div>
            {values.postMeta?.caption && (
              <div className="mt-2 ml-12 rounded-xl bg-[#fafafa] border border-[#efefef] p-3">
                <p className="text-[12px] text-[#262626] leading-5 whitespace-pre-line">{values.postMeta.caption}</p>
              </div>
            )}
          </div>

          {/* ── Remix allowed ──────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefef]">
                <Zap className="h-4 w-4 text-[#262626]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#262626]">Allow remix</p>
                <p className="text-[11px] text-[#8e8e8e]">Others can remix your reel</p>
              </div>
            </div>
            <Toggle
              value={values.postMeta?.visibility !== "no-remix"}
              onChange={(v) => setValue("postMeta.visibility", v ? "public" : "no-remix", { shouldDirty: true })}
            />
          </div>

        </div>
      </div>

      {/* ── Music picker sheet ─────────────────────────────────── */}
      {showMusicPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setShowMusicPicker(false)}>
          <div className="w-full max-h-[85vh] overflow-hidden rounded-t-3xl bg-white"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between border-b border-[#efefef] px-5 py-4">
              <p className="text-sm font-bold text-[#262626]">Add music</p>
              <button onClick={() => setShowMusicPicker(false)}>
                <X className="h-5 w-5 text-[#8e8e8e]" />
              </button>
            </div>

            {/* Genre tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-[#efefef] px-5 py-3"
              style={{ scrollbarWidth: "none" }}>
              {GENRES.map((g) => (
                <button key={g} type="button" onClick={() => setGenre(g)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                    genre === g ? "bg-[#262626] text-white" : "bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]"
                  }`}>
                  {g}
                </button>
              ))}
            </div>

            {/* Track list */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 130px)" }}>
              {filtered.map((track) => (
                <button key={track.id} type="button" onClick={() => setMusic(track)}
                  className="flex w-full items-center gap-4 border-b border-[#efefef] px-5 py-3 text-left last:border-0 hover:bg-[#fafafa] transition-colors">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400">
                    <Music2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#262626] truncate">{track.title}</p>
                    <p className="text-[12px] text-[#8e8e8e]">{track.artist} · {track.duration}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-[#efefef] px-2.5 py-0.5 text-[11px] text-[#8e8e8e]">
                      {track.genre}
                    </span>
                    <Play className="h-4 w-4 text-[#8e8e8e]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RowButton({ icon, title, subtitle, subtitleColor, right, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors">
      {icon}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-semibold text-[#262626]">{title}</p>
        <p className="truncate text-[12px]" style={{ color: subtitleColor || "#8e8e8e" }}>
          {subtitle}
        </p>
      </div>
      {right}
      <ChevronRight className="h-4 w-4 shrink-0 text-[#8e8e8e]" />
    </button>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-[#0095f6]" : "bg-[#dbdbdb]"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
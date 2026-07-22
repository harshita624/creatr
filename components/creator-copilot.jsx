"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot, EyeOff, GripHorizontal, History,
  Loader2, MessageSquarePlus, Send, Sparkles, X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Authenticated } from "convex/react";

const STORAGE_KEY = "createk_creator_copilot_chats";

const STARTERS = [
  "Give me 3 post ideas for today",
  "What should I improve before publishing?",
  "Best hook for my next reel?",
];

function newChat(title = "New chat") {
  return {
    id: `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title,
    updatedAt: Date.now(),
    messages: [
      {
        role: "assistant",
        content:
          "Hi! I'm your CreateK Copilot. Ask me for post ideas, hooks, SEO fixes, or trend angles.",
      },
    ],
  };
}

export default function CreatorCopilot() {
  const pathname = usePathname();

  /* ── UI state ─────────────────────────────────────────────────── */
  const [open, setOpen]           = useState(false);
  const [hidden, setHidden]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [chats, setChats]         = useState(() => [newChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);

  /* ── Drag state (refs → no re-render during drag) ─────────────── */
  const deltaRef    = useRef({ x: 0, y: 0 });
  const [renderDelta, setRenderDelta] = useState({ x: 0, y: 0 });
  const dragInfo    = useRef(null); // { startX, startY, baseX, baseY }
  const hasDragged  = useRef(false);

  /* ── Persist chats ────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (saved.length) { setChats(saved); setActiveChatId(saved[0].id); }
    } catch { localStorage.removeItem(STORAGE_KEY); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 12)));
  }, [chats]);

  /* ── Global drag listeners ────────────────────────────────────── */
  useEffect(() => {
    const onMove = (e) => {
      if (!dragInfo.current) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - dragInfo.current.startX;
      const dy = cy - dragInfo.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) hasDragged.current = true;
      const next = { x: dragInfo.current.baseX + dx, y: dragInfo.current.baseY + dy };
      deltaRef.current = next;
      setRenderDelta({ ...next });
    };
    const onEnd = () => { dragInfo.current = null; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onEnd);
    };
  }, []);

  const startDrag = (clientX, clientY) => {
    hasDragged.current = false;
    dragInfo.current = {
      startX: clientX,
      startY: clientY,
      baseX:  deltaRef.current.x,
      baseY:  deltaRef.current.y,
    };
  };

  /* ── Chat helpers ─────────────────────────────────────────────── */
  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const messages   = activeChat?.messages || [];

  const context = useMemo(() => {
    if (pathname?.includes("/dashboard/create")) return "User is writing a post.";
    if (pathname?.includes("/feed"))              return "User is browsing the feed.";
    if (pathname?.includes("/dashboard/trends"))  return "User is researching trends.";
    if (pathname?.includes("/dashboard"))         return "User is in the creator dashboard.";
    return "User is browsing the creator platform.";
  }, [pathname]);

  const updateActive = (fn) =>
    setChats((cs) =>
      cs.map((c) => (c.id === activeChatId ? { ...fn(c), updatedAt: Date.now() } : c))
    );

  const startNewChat = () => {
    const c = newChat();
    setChats((cs) => [c, ...cs]);
    setActiveChatId(c.id);
    setShowHistory(false);
  };

  const sendMessage = async (val = input) => {
    const msg = val.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    const userMsg = { role: "user", content: msg };
    const nextMsgs = [...messages, userMsg];
    updateActive((c) => ({
      ...c,
      title:    c.title === "New chat" ? msg.slice(0, 34) : c.title,
      messages: nextMsgs,
    }));
    try {
      const res  = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context, history: messages.slice(-10) }),
      });
      const data = await res.json();
      updateActive((c) => ({
        ...c,
        messages: [...nextMsgs, { role: "assistant", content: data.reply || "No reply." }],
      }));
    } catch {
      updateActive((c) => ({
        ...c,
        messages: [...nextMsgs, { role: "assistant", content: "Couldn't reach the helper. Try again." }],
      }));
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared drag-transform style ──────────────────────────────── */
  const wrapStyle = {
    transform: `translate(${renderDelta.x}px, ${renderDelta.y}px)`,
    willChange: "transform",
  };

  /* ── Hidden state — show a tiny icon so user can restore ──────── */
  if (hidden) {
    return (
      <Authenticated>
        <div
          style={wrapStyle}
          className="fixed bottom-[5.5rem] right-4 z-50 sm:bottom-5 sm:right-5"
        >
          <button
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onClick={() => { if (!hasDragged.current) setHidden(false); }}
            title="Show Copilot"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-rose-400 to-violet-500 text-white shadow-xl transition-transform active:scale-95 select-none"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </Authenticated>
    );
  }

  /* ── Full render ──────────────────────────────────────────────── */
  return (
    <Authenticated>
      <div
        style={wrapStyle}
        className="fixed bottom-[5.5rem] right-4 z-50 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5 select-none"
      >
        {/* ── Chat panel ─────────────────────────────────────────── */}
        {open && (
          <div className="app-panel mb-2 flex w-[min(90vw,370px)] flex-col overflow-hidden shadow-2xl">

            {/* Header / drag handle */}
            <div
              onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
              className="flex shrink-0 cursor-grab items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-violet-50 px-4 py-2.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <GripHorizontal className="h-4 w-4 text-slate-300" />
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-300 to-violet-300">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none text-slate-900">CreateK Copilot</p>
                  <p className="mt-0.5 max-w-[130px] truncate text-[10px] text-slate-400">
                    {activeChat?.title || "Creator assistant"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {[
                  { icon: History,          fn: () => setShowHistory((v) => !v), title: "History"   },
                  { icon: MessageSquarePlus, fn: startNewChat,                   title: "New chat"  },
                  { icon: EyeOff,           fn: () => setHidden(true),           title: "Hide"      },
                  { icon: X,                fn: () => setOpen(false),            title: "Close"     },
                ].map(({ icon: Icon, fn, title }) => (
                  <button
                    key={title}
                    onClick={fn}
                    title={title}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1">
              {/* History sidebar */}
              {showHistory && (
                <aside className="hidden w-32 shrink-0 border-r border-slate-100 bg-slate-50/60 p-2 sm:block">
                  <button
                    onClick={startNewChat}
                    className="mb-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-white hover:text-orange-600 transition-colors"
                  >
                    <MessageSquarePlus className="h-3 w-3" />
                    New chat
                  </button>
                  <div className="space-y-0.5">
                    {chats.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setActiveChatId(c.id); setShowHistory(false); }}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                          c.id === activeChatId
                            ? "bg-orange-50 text-orange-600"
                            : "text-slate-400 hover:bg-white"
                        }`}
                      >
                        <span className="line-clamp-2 leading-4">{c.title}</span>
                      </button>
                    ))}
                  </div>
                </aside>
              )}

              {/* Messages + input */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="max-h-60 overflow-y-auto space-y-2 p-3">
                  {messages.map((m, i) => (
                    <div
                      key={`${m.role}-${i}`}
                      className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
                        m.role === "assistant"
                          ? "bg-slate-100/80 text-slate-700"
                          : "ml-4 bg-gradient-to-r from-orange-100 to-violet-100 text-slate-900"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-100/80 px-3 py-2 text-sm text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                      Thinking...
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 p-2.5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                      placeholder="Ask your copilot..."
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-orange-300"
                    />
                    <button
                      onClick={() => sendMessage()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 text-white shadow-md transition-transform active:scale-95"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Floating trigger button ─────────────────────────────── */}
        <button
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onClick={() => { if (!hasDragged.current) setOpen((v) => !v); }}
          className="soft-button flex h-12 items-center gap-2 rounded-2xl px-4 font-bold text-white shadow-lg transition-transform active:scale-95 select-none"
        >
          <Sparkles className="h-4 w-4" />
          Copilot
        </button>
      </div>
    </Authenticated>
  );
}
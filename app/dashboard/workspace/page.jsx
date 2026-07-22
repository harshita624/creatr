"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Archive, ArrowRight, Clapperboard, FileText,
  ImageIcon, Lightbulb, Loader2, Mic2, Plus,
  Radio, Sparkles, Tag, Trash2, Video, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLUMNS = [
  { id: "inbox",       label: "Inbox",       hint: "Captured, not reviewed yet" },
  { id: "planned",     label: "Planned",     hint: "Worth doing, format decided" },
  { id: "in_progress", label: "In progress", hint: "Has a real draft now"        },
  { id: "ready",       label: "Ready",       hint: "Polished, ready to publish"  },
];

const STATUS_OPTIONS = [
  ...COLUMNS,
  { id: "archived", label: "Archived", hint: "Parked for later" },
];

const TYPE_META = {
  article:    { label: "Post",      icon: FileText,    color: "text-slate-500 bg-slate-50"   },
  reel:       { label: "Reel",      icon: Clapperboard,color: "text-violet-600 bg-violet-50" },
  video:      { label: "Video",     icon: Video,       color: "text-blue-600 bg-blue-50"     },
  livestream: { label: "Live",      icon: Radio,       color: "text-red-600 bg-red-50"       },
  podcast:    { label: "Podcast",   icon: Mic2,        color: "text-amber-600 bg-amber-50"   },
  carousel:   { label: "Carousel",  icon: ImageIcon,   color: "text-emerald-600 bg-emerald-50"},
};

const EXAMPLES = [
  "Behind-the-scenes reel for launch week",
  "Carousel breaking down 5 lessons from last month",
  "Livestream Q&A about how I plan content",
];

export default function WorkspacePage() {
  const router = useRouter();
  const ideas              = useQuery(api.ideas.listIdeas) || [];
  const createIdea         = useMutation(api.ideas.createIdea);
  const updateIdea         = useMutation(api.ideas.updateIdea);
  const moveIdea           = useMutation(api.ideas.moveIdea);
  const deleteIdeaMutation = useMutation(api.ideas.deleteIdea);
  const convertToDraft     = useMutation(api.ideas.convertToDraft);

  const [quickAdd,       setQuickAdd]       = useState("");
  const [adding,         setAdding]         = useState(false);
  const [draggedId,      setDraggedId]      = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [activeId,       setActiveId]       = useState(null);
  const [showArchived,   setShowArchived]   = useState(false);
  const [converting,     setConverting]     = useState(null);
  // Mobile: which stage tab is selected
  const [mobileStage,    setMobileStage]    = useState("inbox");

  const byColumn = useMemo(() => {
    const grouped = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    grouped.archived = [];
    for (const idea of ideas) {
      (grouped[idea.status] || grouped.inbox).push(idea);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [ideas]);

  const activeIdea = ideas.find((i) => i._id === activeId) || null;
  const totalIdeas = ideas.filter((i) => i.status !== "archived").length;

  const handleQuickAdd = async () => {
    const title = quickAdd.trim();
    if (!title) return;
    setAdding(true);
    try {
      const id = await createIdea({ title });
      setQuickAdd("");
      setActiveId(id);
    } catch (err) {
      toast.error(err.message || "Failed to add idea");
    } finally { setAdding(false); }
  };

  const moveTo = async (id, status) => {
    const target = byColumn[status] || [];
    try { await moveIdea({ id, status, order: target.length }); }
    catch (err) { toast.error(err.message || "Failed to move idea"); }
  };

  const handleDrop = (status) => {
    setDragOverColumn(null);
    if (!draggedId) return;
    moveTo(draggedId, status);
    setDraggedId(null);
  };

  const handleConvert = async (id) => {
    setConverting(id);
    try {
      const postId = await convertToDraft({ id });
      toast.success("Draft created — opening the editor");
      router.push(`/dashboard/posts/edit/${postId}`);
    } catch (err) {
      toast.error(err.message || "Failed to create draft");
    } finally { setConverting(null); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteIdeaMutation({ id });
      if (activeId === id) setActiveId(null);
      toast.success("Idea deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete idea");
    }
  };

  // All stage columns including optionally archived
  const visibleColumns = showArchived
    ? [...COLUMNS, { id: "archived", label: "Archived", hint: "Parked for later" }]
    : COLUMNS;

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* ── Header panel ─────────────────────────────────────────────── */}
      <section className="app-panel overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-cyan-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Workspace</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              From idea to published post
            </h1>
          </div>
          <Button
            onClick={() => setShowArchived((v) => !v)}
            className="quiet-button shrink-0 self-start sm:self-auto"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Hide archived" : `Archived (${byColumn.archived.length})`}
          </Button>
        </div>

        {/* How-to strip */}
        <div className="mt-4 grid gap-3 rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4 sm:grid-cols-3">
          {[
            { n: 1, title: "Capture", desc: "Any idea below, even a rough one-liner." },
            { n: 2, title: "Click a card", desc: "Set its format and notes, then move it across stages." },
            { n: 3, title: "Turn into draft", desc: "Once it has a format — opens the right editor." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-orange-500">
                {n}
              </span>
              <p className="text-xs leading-5 text-slate-600">
                <strong className="text-slate-900">{title}</strong> {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Quick add */}
        <div className="mt-4 flex gap-2">
          <Input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="Capture a new idea..."
            className="bg-white"
          />
          <Button
            onClick={handleQuickAdd}
            disabled={adding || !quickAdd.trim()}
            className="soft-button shrink-0"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {/* Example prompts */}
        {totalIdeas === 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
              <Lightbulb className="h-3.5 w-3.5" />
              Try:
            </span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setQuickAdd(ex)}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm hover:text-orange-600">
                {ex}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Mobile: stage tab selector ──────────────────────────────── */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 gap-1 lg:hidden no-scrollbar">
        {visibleColumns.map((col) => (
          <button key={col.id} type="button"
            onClick={() => setMobileStage(col.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              mobileStage === col.id
                ? "bg-gradient-to-r from-orange-300 to-violet-300 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}>
            {col.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              mobileStage === col.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {byColumn[col.id]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Mobile: single active column ────────────────────────────── */}
      <div className="lg:hidden">
        <MobileColumn
          column={visibleColumns.find((c) => c.id === mobileStage) || COLUMNS[0]}
          ideas={byColumn[mobileStage] || []}
          onDragStart={setDraggedId}
          onDrop={handleDrop}
          dragOver={dragOverColumn === mobileStage}
          onDragOver={() => setDragOverColumn(mobileStage)}
          onDragLeave={() => setDragOverColumn(null)}
          onClick={setActiveId}
          onConvert={handleConvert}
          onMove={moveTo}
          converting={converting}
        />
      </div>

      {/* ── Desktop: all columns grid ────────────────────────────────── */}
      <div
        className={`hidden gap-4 lg:grid ${
          showArchived ? "xl:grid-cols-5 lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        {visibleColumns.map((column) => (
          <MobileColumn
            key={column.id}
            column={column}
            ideas={byColumn[column.id] || []}
            onDragStart={setDraggedId}
            onDrop={handleDrop}
            dragOver={dragOverColumn === column.id}
            onDragOver={() => setDragOverColumn(column.id)}
            onDragLeave={() => setDragOverColumn(null)}
            onClick={setActiveId}
            onConvert={handleConvert}
            onMove={moveTo}
            converting={converting}
          />
        ))}
      </div>

      {/* ── Idea editor modal ─────────────────────────────────────────── */}
      {activeIdea && (
        <IdeaEditorModal
          idea={activeIdea}
          onClose={() => setActiveId(null)}
          onSave={async (patch) => {
            try { await updateIdea({ id: activeIdea._id, ...patch }); }
            catch (err) { toast.error(err.message || "Failed to save"); throw err; }
          }}
          onDelete={() => handleDelete(activeIdea._id)}
          onConvert={() => handleConvert(activeIdea._id)}
          converting={converting === activeIdea._id}
        />
      )}
    </div>
  );
}

/* ── Column (used in both mobile single-col + desktop grid) ─────────── */
function MobileColumn({
  column, ideas, onDragStart, onDrop, dragOver,
  onDragOver, onDragLeave, onClick, onConvert, onMove, converting,
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(column.id)}
      className={`flex flex-col gap-3 rounded-2xl p-3 transition-colors min-h-[120px] ${
        dragOver ? "bg-orange-50 ring-2 ring-orange-200" : "bg-slate-50/60"
      }`}
    >
      <div className="px-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">{column.label}</p>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm">
            {ideas.length}
          </span>
        </div>
        <p className="text-xs text-slate-400">{column.hint}</p>
      </div>

      <div className="flex flex-col gap-2">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea._id}
            idea={idea}
            onDragStart={() => onDragStart(idea._id)}
            onClick={() => onClick(idea._id)}
            onConvert={() => onConvert(idea._id)}
            onMove={(status) => onMove(idea._id, status)}
            converting={converting === idea._id}
          />
        ))}
        {ideas.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Nothing here yet
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaCard({ idea, onDragStart, onClick, onConvert, onMove, converting }) {
  const meta = TYPE_META[idea.contentType] || null;
  const Icon = meta?.icon;
  return (
    <div draggable onDragStart={onDragStart}
      className="group rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <div onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-5 text-slate-900">{idea.title}</p>
          {idea.linkedPostId && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              Drafted
            </span>
          )}
        </div>
        {idea.notes && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{idea.notes}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          {meta ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              Click to set format
            </span>
          )}
          {!idea.linkedPostId && idea.contentType && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onConvert(); }}
              disabled={converting} title="Turn into draft">
              {converting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                : <ArrowRight className="h-3.5 w-3.5 text-orange-500" />}
            </button>
          )}
        </div>
      </div>
      <select value={idea.status} onChange={(e) => { e.stopPropagation(); onMove(e.target.value); }}
        className="mt-2 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 outline-none"
        onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>Move to: {o.label}</option>
        ))}
      </select>
    </div>
  );
}

function IdeaEditorModal({ idea, onClose, onSave, onDelete, onConvert, converting }) {
  const [title,       setTitle]       = useState(idea.title);
  const [notes,       setNotes]       = useState(idea.notes || "");
  const [contentType, setContentType] = useState(idea.contentType || "");
  const [tagInput,    setTagInput]    = useState("");
  const [tags,        setTags]        = useState(idea.tags || []);
  const [saving,      setSaving]      = useState(false);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ title: title.trim() || idea.title, notes, contentType: contentType || undefined, tags });
      onClose();
    } catch { /* onSave already toasted */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="app-panel w-full max-h-[90vh] overflow-y-auto rounded-t-3xl p-5 sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="section-label">Edit idea</p>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-3 font-bold" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes, angle, hook, key points..." rows={3}
          className="mb-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-orange-200" />

        <div className="mb-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Format — required before turning into a draft
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = contentType === key;
              return (
                <button key={key} type="button" onClick={() => setContentType(active ? "" : key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    active ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Tags</p>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag..." className="bg-slate-50" />
            <Button type="button" onClick={addTag} className="quiet-button shrink-0">
              <Tag className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button onClick={onDelete} variant="outline" className="border-red-100 text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            {contentType && !idea.linkedPostId && (
              <Button onClick={onConvert} disabled={converting} className="quiet-button">
                {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Turn into draft
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="soft-button">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
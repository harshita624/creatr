"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadToImageKit } from "@/lib/imagekit";
import { getPhotoFilterCss, PHOTO_FILTERS } from "@/lib/photo-filters";

const MAX_PHOTOS = 10;

export default function PhotoPostBuilder({ form }) {
  const { watch, setValue, getValues } = form;
  const photos = watch("photoItems") || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const activePhoto = photos[activeIndex];

  const updatePhoto = (index, patch) => {
    const next = [...(getValues("photoItems") || [])];
    next[index] = { ...next[index], ...patch };
    setValue("photoItems", next, { shouldDirty: true, shouldValidate: true });
  };

  const uploadPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const remaining = MAX_PHOTOS - (getValues("photoItems") || []).length;
    if (remaining <= 0) {
      toast.error(`A photo post can contain up to ${MAX_PHOTOS} photos`);
      return;
    }
    const selected = files.slice(0, remaining);
    if (selected.length < files.length) toast.info(`Only the first ${remaining} selected photos will be added`);
    setUploading(true);
    try {
      const uploaded = await Promise.all(selected.map(async (file) => {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
        const result = await uploadToImageKit(file, `photo-post-${Date.now()}-${file.name}`, "creator-media");
        if (!result.success || !result.data?.url) throw new Error(result.error || `Could not upload ${file.name}`);
        return { url: result.data.url, filter: "original" };
      }));
      const next = [...(getValues("photoItems") || []), ...uploaded];
      setValue("photoItems", next, { shouldDirty: true, shouldValidate: true });
      setActiveIndex(next.length - uploaded.length);
      toast.success(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added`);
    } catch (error) {
      toast.error(error.message || "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeActive = () => {
    const next = photos.filter((_, index) => index !== activeIndex);
    setValue("photoItems", next, { shouldDirty: true, shouldValidate: true });
    setActiveIndex(Math.max(0, Math.min(activeIndex, next.length - 1)));
  };

  const moveActive = (direction) => {
    const target = activeIndex + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[activeIndex], next[target]] = [next[target], next[activeIndex]];
    setValue("photoItems", next, { shouldDirty: true, shouldValidate: true });
    setActiveIndex(target);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Photos</h2>
          <p className="mt-1 text-xs text-slate-500">Upload up to {MAX_PHOTOS} photos, reorder them, and choose a filter for each.</p>
        </div>
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS} className="bg-orange-500 hover:bg-orange-600">
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
      </div>

      {activePhoto ? (
        <>
          <div className="mx-auto max-w-md overflow-hidden rounded-xl bg-slate-100">
            <div className="relative aspect-square">
              <img src={activePhoto.url} alt={`Photo ${activeIndex + 1}`} className="h-full w-full object-cover" style={{ filter: getPhotoFilterCss(activePhoto.filter) }} />
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">{activeIndex + 1} / {photos.length}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Filter</span>
            {PHOTO_FILTERS.map((filter) => (
              <button key={filter.id} type="button" onClick={() => updatePhoto(activeIndex, { filter: filter.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  (activePhoto.filter || "original") === filter.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:border-orange-300"
                }`}>
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={activeIndex === 0} onClick={() => moveActive(-1)} aria-label="Move photo earlier"><ArrowLeft className="mr-1 h-4 w-4" />Earlier</Button>
              <Button type="button" variant="outline" size="sm" disabled={activeIndex === photos.length - 1} onClick={() => moveActive(1)} aria-label="Move photo later">Later<ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={removeActive} className="text-red-600 hover:text-red-700"><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, index) => (
              <button key={`${photo.url}-${index}`} type="button" onClick={() => setActiveIndex(index)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeIndex ? "border-orange-500" : "border-transparent"}`} aria-label={`Edit photo ${index + 1}`}>
                <img src={photo.url} alt="" className="h-full w-full object-cover" style={{ filter: getPhotoFilterCss(photo.filter) }} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-orange-300 hover:bg-orange-50 sm:aspect-[4/3]">
          <ImagePlus className="mb-2 h-8 w-8" />
          <span className="text-sm font-semibold">Choose one or more photos</span>
          <span className="mt-1 text-xs">JPG, PNG, WEBP, or another browser-supported image</span>
        </button>
      )}
    </section>
  );
}

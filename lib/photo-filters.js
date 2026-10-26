export const PHOTO_FILTERS = [
  { id: "original", label: "Original", css: "none" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.08)" },
  { id: "warm", label: "Warm", css: "sepia(0.18) saturate(1.2)" },
  { id: "cool", label: "Cool", css: "saturate(0.9) hue-rotate(12deg)" },
  { id: "mono", label: "Mono", css: "grayscale(1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.32) contrast(0.92) saturate(0.85)" },
  { id: "fade", label: "Fade", css: "contrast(0.88) brightness(1.08) saturate(0.78)" },
];

export function getPhotoFilterCss(id) {
  return PHOTO_FILTERS.find((filter) => filter.id === id)?.css || "none";
}

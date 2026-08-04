import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxPhoto {
  imgUrl: string;
  alt?: string;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const total = photos.length;

  const next = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  const prev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  // keyboard support: Esc to close, arrows to navigate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onClose]);

  if (!photos[index]) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
        aria-label="Close full view"
      >
        <X className="w-6 h-6" />
      </button>

      {total > 1 && (
        <button
          onClick={prev}
          className="absolute left-2 md:left-6 text-white/70 hover:text-white p-2 z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* object-contain (not cover) so the full image shows regardless of
          portrait/landscape orientation — nothing gets cropped */}
      <img
        src={photos[index].imgUrl}
        alt={photos[index].alt || `Photo ${index + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain"
        onClick={(e) => e.stopPropagation()}
        referrerPolicy="no-referrer"
      />

      {total > 1 && (
        <button
          onClick={next}
          className="absolute right-2 md:right-6 text-white/70 hover:text-white p-2 z-10"
          aria-label="Next photo"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {total > 1 && (
        <p className="absolute bottom-4 text-sm text-white/60">
          {index + 1} / {total}
        </p>
      )}
    </div>
  );
}

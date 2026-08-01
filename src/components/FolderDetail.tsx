import { useEffect, useState } from "react";
import { X, ExternalLink, MapPin, Calendar, Hash, Building2, Loader2, ImageOff } from "lucide-react";
import FlipCarousel from "@/components/ui/flip-carousel";
import Lightbox from "@/components/Lightbox";
import DeleteFolderButton from "@/components/DeleteFolderButton";
import { fetchFolderPhotos, type DrivePhoto } from "@/lib/api";
import type { Entry } from "@/types";

interface FolderDetailProps {
  entry: (Entry & { id: string }) | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function FolderDetail({ entry, onClose, onDeleted }: FolderDetailProps) {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!entry?.folderLink) {
      setPhotos([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPhotos(true);
      setPhotoError(false);
      try {
        const result = await fetchFolderPhotos(entry.folderLink);
        if (!cancelled) setPhotos(result);
      } catch (err) {
        console.error("Could not load folder photos:", err);
        if (!cancelled) setPhotoError(true);
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry?.folderLink]);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg h-full bg-background border-l border-border overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-display font-bold text-lg truncate">{entry.brand}</h2>
          <button onClick={onClose} className="opacity-50 hover:opacity-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-2 text-sm border-b border-border">
          <div className="flex items-center gap-2 opacity-80">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>
              {entry.site}
              {entry.panel ? ` · Panel ${entry.panel}` : ""}
              {entry.direction ? ` · ${entry.direction}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 opacity-80">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{entry.date || "No date on record"}</span>
          </div>
          <div className="flex items-center gap-2 opacity-80">
            <Hash className="w-4 h-4 shrink-0" />
            <span>{entry.photoCount} photos in this folder</span>
          </div>
          {entry.department && (
            <div className="flex items-center gap-2 opacity-80">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>{entry.department}</span>
            </div>
          )}
        </div>

        <div className="py-4">
          {loadingPhotos && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm opacity-50">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading photos...
            </div>
          )}

          {!loadingPhotos && photoError && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-status-danger">
              <ImageOff className="w-6 h-6" />
              Could not load photos for this folder.
            </div>
          )}

          {!loadingPhotos && !photoError && photos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm opacity-50">
              <ImageOff className="w-6 h-6" />
              No photos found in this folder.
            </div>
          )}

          {!loadingPhotos && !photoError && photos.length > 0 && (
            <>
              <FlipCarousel
                cards={photos.map((p) => ({ imgUrl: p.url, alt: p.name }))}
                onImageClick={(i) => setLightboxIndex(i)}
              />
              <p className="text-center text-xs opacity-40 -mt-2">
                Click the photo for a full, uncropped view
              </p>
            </>
          )}
        </div>

        {entry.folderLink && (
          <div className="px-6 pb-3">
            <a
              href={entry.folderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent-indigo hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open full folder in Drive
            </a>
          </div>
        )}

        {entry.folderLink && (
          <div className="px-6 pb-6">
            <DeleteFolderButton folderLink={entry.folderLink} onDeleted={onDeleted} />
          </div>
        )}
      </div>

      {lightboxIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos.map((p) => ({ imgUrl: p.url, alt: p.name }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

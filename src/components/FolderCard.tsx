import { MapPin, Calendar, Hash, AlertTriangle } from "lucide-react";
import { brandColor } from "@/lib/brandColor";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types";

interface FolderCardProps {
  entry: Entry & { id: string };
  onOpen: (entry: Entry & { id: string }) => void;
}

export default function FolderCard({ entry, onOpen }: FolderCardProps) {
  const color = brandColor(entry.brand);
  return (
    <button
      onClick={() => onOpen(entry)}
      className={cn(
        "text-left rounded-lg border bg-card p-4 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4",
        color.border
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={cn("font-semibold text-sm truncate", color.text)}>{entry.brand}</h3>
        {entry.needsReview && (
          <span title="Needs review" className="shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs opacity-70">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {entry.site}
            {entry.panel ? ` · Panel ${entry.panel}` : ""}
            {entry.direction ? ` · ${entry.direction}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{entry.date || "No date"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 shrink-0" />
          <span>{entry.photoCount} photos</span>
        </div>
      </div>

      {entry.department && (
        <span className="inline-block mt-3 text-[11px] px-2 py-0.5 rounded-full bg-status-info-light text-status-info font-medium">
          {entry.department}
        </span>
      )}
    </button>
  );
}

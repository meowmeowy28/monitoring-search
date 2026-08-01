import { useMemo, type ReactNode } from "react";
import { Folder, Image as ImageIcon, Tag, AlertTriangle } from "lucide-react";
import FolderCard from "@/components/FolderCard";
import type { Entry } from "@/types";

interface HomeViewProps {
  entries: (Entry & { id: string })[];
  onOpen: (entry: Entry & { id: string }) => void;
}

export default function HomeView({ entries, onOpen }: HomeViewProps) {
  const stats = useMemo(() => {
    const totalPhotos = entries.reduce((sum, e) => sum + e.photoCount, 0);
    const brandCount = new Set(entries.map((e) => e.brand)).size;
    const needsReviewCount = entries.filter((e) => e.needsReview).length;
    return { folders: entries.length, photos: totalPhotos, brands: brandCount, needsReview: needsReviewCount };
  }, [entries]);

  const recentlyAdded = useMemo(() => {
    return [...entries]
      .filter((e) => e.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [entries]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<Folder className="w-4 h-4" />} label="Folders" value={stats.folders} color="text-accent-indigo" />
        <StatCard icon={<ImageIcon className="w-4 h-4" />} label="Photos" value={stats.photos} color="text-accent-cyan" />
        <StatCard icon={<Tag className="w-4 h-4" />} label="Brands" value={stats.brands} color="text-status-success" />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Needs Review"
          value={stats.needsReview}
          color="text-status-warning"
        />
      </div>

      {/* recently added */}
      {recentlyAdded.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50 mb-3">
            Recently Added
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentlyAdded.map((entry) => (
              <FolderCard key={entry.id} entry={entry} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      {recentlyAdded.length === 0 && (
        <p className="text-sm opacity-50 text-center py-12">
          Search above, or browse folders by brand in the sidebar to get started.
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className={`flex items-center gap-1.5 text-xs font-medium opacity-60 mb-1.5 ${color}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-display font-bold">{value}</div>
    </div>
  );
}

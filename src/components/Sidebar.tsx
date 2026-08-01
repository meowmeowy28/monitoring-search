import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandColor } from "@/lib/brandColor";
import type { Entry } from "@/types";

interface SidebarProps {
  entries: (Entry & { id: string })[];
  selectedId: string | null;
  onSelect: (entry: Entry & { id: string }) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ entries, selectedId, onSelect, open, onClose }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byBrand = useMemo(() => {
    const map = new Map<string, (Entry & { id: string })[]>();
    for (const entry of entries) {
      const list = map.get(entry.brand) ?? [];
      list.push(entry);
      map.set(entry.brand, list);
    }
    // sort brands alphabetically, and entries within a brand by date desc
    return new Map(
      [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([brand, list]) => [
          brand,
          list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")),
        ])
    );
  }, [entries]);

  const toggle = (brand: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  return (
    <>
      {/* backdrop — mobile only, closes the drawer on tap */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "w-64 shrink-0 border-r border-border overflow-y-auto py-3 bg-background",
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 md:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide opacity-50">
        All Folders
      </div>
      <nav>
        {[...byBrand.entries()].map(([brand, list]) => {
          const isOpen = expanded.has(brand);
          const color = brandColor(brand);
          return (
            <div key={brand}>
              <button
                onClick={() => toggle(brand)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
                {isOpen ? (
                  <FolderOpen className={cn("w-4 h-4 shrink-0", color.text)} />
                ) : (
                  <Folder className={cn("w-4 h-4 shrink-0", color.text)} />
                )}
                <span className="truncate font-medium">{brand}</span>
                <span className="ml-auto text-xs opacity-40">{list.length}</span>
              </button>

              {isOpen && (
                <div className="ml-4 border-l border-border">
                  {list.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        onSelect(entry);
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 pl-5 pr-4 py-1.5 text-sm text-left transition-colors",
                        selectedId === entry.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 opacity-50" />
                      <span className="truncate">
                        {entry.site}
                        {entry.date ? ` — ${entry.date}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      </aside>
    </>
  );
}

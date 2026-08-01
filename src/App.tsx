import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, FolderX, AlertCircle, Camera as CameraIcon, Plus, Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SearchBar, { type SortKey } from "@/components/SearchBar";
import FolderCard from "@/components/FolderCard";
import FolderDetail from "@/components/FolderDetail";
import AddEntryModal from "@/components/AddEntryModal";
import HomeView from "@/components/HomeView";
import { fetchEntries, getCachedEntries } from "@/lib/api";
import type { Entry } from "@/types";

export default function App() {
  const cachedOnMount = useMemo(() => getCachedEntries(), []);
  const [entries, setEntries] = useState<(Entry & { id: string })[]>(cachedOnMount ?? []);
  // only show the full loading state if we had nothing cached to show yet
  const [loading, setLoading] = useState(!cachedOnMount);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");

  const [selected, setSelected] = useState<(Entry & { id: string }) | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasSearched = Boolean(query.trim() || brandFilter || departmentFilter);

  const loadEntries = async (opts: { silent?: boolean } = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setLoadError(false);
      const data = await fetchEntries();
      setEntries(data);
    } catch (err) {
      console.error("Could not load from the Apps Script backend:", err);
      // if we already have cached data on screen, a background refresh
      // failing isn't worth showing a scary error for — just keep showing
      // what we have and quietly log it
      if (!opts.silent) setLoadError(true);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    // if we had cached data, refresh quietly in the background;
    // otherwise this is the real (visible) first load
    loadEntries({ silent: Boolean(cachedOnMount) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = entries;

    if (brandFilter) result = result.filter((e) => e.brand === brandFilter);
    if (departmentFilter) result = result.filter((e) => e.department === departmentFilter);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((e) =>
        [e.brand, e.site, e.panel, e.direction, e.date, e.department, e.folderName]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    const sorted = [...result];
    switch (sort) {
      case "date-desc":
        sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        break;
      case "date-asc":
        sorted.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        break;
      case "brand-az":
        sorted.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      case "brand-za":
        sorted.sort((a, b) => b.brand.localeCompare(a.brand));
        break;
      case "photos-desc":
        sorted.sort((a, b) => b.photoCount - a.photoCount);
        break;
    }
    return sorted;
  }, [entries, query, brandFilter, departmentFilter, sort]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 shrink-0 bg-primary text-primary-foreground">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-white/10"
          aria-label="Open folder browser"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent-indigo to-accent-cyan flex items-center justify-center shrink-0">
          <CameraIcon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight truncate">Site Monitor</h1>
          <p className="text-xs opacity-60">
            {loading ? "Loading..." : `${entries.length} entries`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-auto flex items-center gap-1.5 text-sm px-2.5 sm:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Folder</span>
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar
          entries={entries}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            brandFilter={brandFilter}
            onBrandFilterChange={setBrandFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            sort={sort}
            onSortChange={setSort}
            allEntries={entries}
          />

          <div className="flex-1 overflow-y-auto p-6">
            {loading && <LoadingMessage />}

            {loadError && (
              <div className="flex items-start gap-3 rounded-lg border border-status-danger/30 bg-status-danger-light px-4 py-3">
                <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                <p className="text-sm text-status-danger">
                  Could not load live data. Check that the Apps Script backend is deployed
                  and APPS_SCRIPT_URL in src/lib/api.ts is correct.
                </p>
              </div>
            )}

            {!loading && !loadError && !hasSearched && (
              <HomeView entries={entries} onOpen={setSelected} />
            )}

            {!loading && !loadError && hasSearched && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                <FolderX className="w-10 h-10" />
                <p className="text-sm">No entries match your search or filters.</p>
              </div>
            )}

            {!loading && !loadError && hasSearched && filtered.length > 0 && (
              <>
                <p className="text-xs opacity-50 mb-3">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((entry) => (
                    <FolderCard key={entry.id} entry={entry} onOpen={setSelected} />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <FolderDetail
        entry={selected}
        onClose={() => setSelected(null)}
        onDeleted={() => {
          setSelected(null);
          loadEntries();
        }}
      />

      {showAddModal && (
        <AddEntryModal
          onClose={() => setShowAddModal(false)}
          onAdded={loadEntries}
        />
      )}
    </div>
  );
}

// Shows a plain spinner at first, but if loading drags on (the Apps Script
// backend "waking up" from being idle can take 10-20+ seconds occasionally),
// switches to a reassuring message instead of leaving people wondering if
// the site is broken.
function LoadingMessage() {
  const [showReassurance, setShowReassurance] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowReassurance(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm opacity-50">
      <div className="w-3.5 h-3.5 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin shrink-0" />
      {showReassurance
        ? "Still loading — the first load of the day can take up to 30 seconds while the backend wakes up."
        : "Loading entries..."}
    </div>
  );
}

import { Search, X, ArrowUpDown } from "lucide-react";
import type { Entry } from "@/types";

export type SortKey = "date-desc" | "date-asc" | "brand-az" | "brand-za" | "photos-desc";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  brandFilter: string;
  onBrandFilterChange: (b: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (d: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  allEntries: (Entry & { id: string })[];
}

export default function SearchBar({
  query,
  onQueryChange,
  brandFilter,
  onBrandFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  sort,
  onSortChange,
  allEntries,
}: SearchBarProps) {
  const brands = [...new Set(allEntries.map((e) => e.brand))].sort();
  const departments = [...new Set(allEntries.map((e) => e.department).filter(Boolean))].sort();

  const hasActiveFilters = brandFilter || departmentFilter || query;

  const clearAll = () => {
    onQueryChange("");
    onBrandFilterChange("");
    onDepartmentFilterChange("");
  };

  return (
    <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-border">
      {/* main search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search brand, site, date, panel..."
          className="w-full pl-10 pr-4 py-2.5 rounded-md border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-accent-indigo/40 transition-shadow"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* structured filters + sort, as an alternative to typing */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={brandFilter}
          onChange={(e) => onBrandFilterChange(e.target.value)}
          className="text-sm rounded-md border border-border bg-card px-3 py-1.5 outline-none"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          className="text-sm rounded-md border border-border bg-card px-3 py-1.5 outline-none"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 ml-auto text-sm">
          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="rounded-md border border-border bg-card px-3 py-1.5 outline-none"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="brand-az">Brand A–Z</option>
            <option value="brand-za">Brand Z–A</option>
            <option value="photos-desc">Most photos</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-accent-indigo hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

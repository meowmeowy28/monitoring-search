// Assigns each brand a consistent color from a fixed palette, based on a
// simple hash of the brand name. Same brand always gets the same color,
// across the sidebar, cards, and detail panel.

const PALETTE = [
  { text: "text-rose-600", bg: "bg-rose-50", dot: "bg-rose-500", border: "border-rose-200" },
  { text: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-200" },
  { text: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500", border: "border-emerald-200" },
  { text: "text-sky-600", bg: "bg-sky-50", dot: "bg-sky-500", border: "border-sky-200" },
  { text: "text-violet-600", bg: "bg-violet-50", dot: "bg-violet-500", border: "border-violet-200" },
  { text: "text-pink-600", bg: "bg-pink-50", dot: "bg-pink-500", border: "border-pink-200" },
  { text: "text-cyan-600", bg: "bg-cyan-50", dot: "bg-cyan-500", border: "border-cyan-200" },
  { text: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-500", border: "border-orange-200" },
  { text: "text-teal-600", bg: "bg-teal-50", dot: "bg-teal-500", border: "border-teal-200" },
  { text: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-500", border: "border-indigo-200" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function brandColor(brand: string) {
  return PALETTE[hashString(brand) % PALETTE.length];
}

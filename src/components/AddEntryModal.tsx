import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { addEntry, fileToBase64 } from "@/lib/api";

interface AddEntryModalProps {
  onClose: () => void;
  onAdded: () => void; // trigger a re-fetch of entries after a successful add
}

export default function AddEntryModal({ onClose, onAdded }: AddEntryModalProps) {
  const [brand, setBrand] = useState("");
  const [site, setSite] = useState("");
  const [panel, setPanel] = useState("");
  const [direction, setDirection] = useState("");
  const [date, setDate] = useState("");
  const [department, setDepartment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Required fields, enforced client-side BEFORE anything is sent to Drive/Sheet —
  // this is what keeps auto-save from creating incomplete rows.
  const missingFields: string[] = [];
  if (!brand.trim()) missingFields.push("Brand");
  if (!site.trim()) missingFields.push("Site");
  if (!date.trim()) missingFields.push("Date");
  if (password.trim().length !== 6) missingFields.push("6-digit password");

  const canSubmit = missingFields.length === 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const photos = await Promise.all(files.map(fileToBase64));
      const result = await addEntry(password, {
        brand: brand.trim(),
        site: site.trim(),
        panel: panel.trim(),
        direction: direction.trim(),
        date,
        department: department.trim(),
        photos,
      });

      if (!result.ok) {
        setError(result.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-background border border-border rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
          <h2 className="font-display font-bold text-lg">Add Folder</h2>
          <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <Field label="Brand" required value={brand} onChange={setBrand} placeholder="e.g. BYD" />
          <Field label="Site" required value={site} onChange={setSite} placeholder="e.g. Balintawak" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Panel" value={panel} onChange={setPanel} placeholder="e.g. 1" />
            <Field label="Direction" value={direction} onChange={setDirection} placeholder="e.g. NB" />
          </div>
          <Field label="Date" required type="date" value={date} onChange={setDate} />
          <Field label="Department" value={department} onChange={setDepartment} placeholder="e.g. Field Ops" />

          <div>
            <label className="block text-sm font-medium mb-1.5">Photos</label>
            <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md py-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <Upload className="w-4 h-4 opacity-50" />
              <span className="text-sm opacity-60">
                {files.length > 0 ? `${files.length} photo(s) selected` : "Click to select photos"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Password <span className="text-status-danger">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit password"
              className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-accent-indigo/40"
            />
            <p className="text-xs opacity-50 mt-1">Required to add a new folder.</p>
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-background">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-40 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Saving..." : "Add Folder"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-status-danger">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-accent-indigo/40"
      />
    </div>
  );
}

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteEntry } from "@/lib/api";

interface DeleteFolderButtonProps {
  folderLink: string;
  onDeleted: () => void;
}

export default function DeleteFolderButton({ folderLink, onDeleted }: DeleteFolderButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (password.trim().length !== 6) {
      setError("Enter the 6-digit password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteEntry(password, folderLink);
      if (!result.ok) {
        setError(result.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-sm text-status-danger hover:underline"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete this folder
      </button>
    );
  }

  return (
    <div className="rounded-md border border-status-danger/30 bg-status-danger-light p-3 space-y-2">
      <p className="text-sm text-status-danger font-medium">
        This permanently removes the Sheet row and moves the Drive folder to trash.
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
        placeholder="6-digit password"
        className="w-full px-3 py-1.5 rounded-md border border-border bg-card text-sm outline-none"
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={submitting}
          className="text-sm px-3 py-1.5 rounded-md bg-status-danger text-white disabled:opacity-50 flex items-center gap-1.5"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Confirm Delete
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setPassword("");
            setError(null);
          }}
          className="text-sm px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

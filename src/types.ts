export interface Entry {
  brand: string;
  site: string;
  panel: string;
  direction: string;
  date: string; // ISO-ish string as stored in the Sheet, may be empty
  department: string;
  photoCount: number;
  folderName: string;
  folderLink: string;
  needsReview: boolean;
}

// Raw shape as returned by the Apps Script doGet JSON (matches your Sheet's
// exact column headers).
export interface RawSheetRow {
  Brand: string;
  Site: string;
  Panel: string;
  Direction: string;
  Date: string;
  Department: string;
  "Photo Count": number;
  "Folder Name (original)": string;
  "Folder Link": string;
  "Needs Review": string;
}

export function rowToEntry(row: RawSheetRow, index: number): Entry & { id: string } {
  return {
    id: `${row.Brand}-${row.Site}-${row.Date}-${index}`,
    brand: row.Brand || "",
    site: row.Site || "",
    panel: row.Panel || "",
    direction: row.Direction || "",
    date: row.Date || "",
    department: row.Department || "",
    photoCount: Number(row["Photo Count"]) || 0,
    folderName: row["Folder Name (original)"] || "",
    folderLink: row["Folder Link"] || "",
    needsReview: (row["Needs Review"] || "").trim().toUpperCase() === "YES",
  };
}

import { createWorker } from "tesseract.js";

/**
 * Runs text recognition on a captured photo (as a data URL) and returns
 * whatever text Tesseract could read off it. This is "best effort" — OCR on
 * a billboard photo taken in the field will rarely be perfect, which is why
 * the scan flow always shows the guess in an editable field instead of
 * saving it straight to a folder automatically.
 */
export async function runOCR(imageDataUrl: string): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(imageDataUrl);
    return (text || "").trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Picks whichever known brand best overlaps with the OCR'd text. A direct
 * substring match wins outright; otherwise brands are scored by how many of
 * their words showed up in the OCR text. Good enough as a starting guess —
 * not a spell checker — because the user always confirms/edits it before
 * saving.
 */
export function guessBrand(ocrText: string, knownBrands: string[]): string {
  const cleaned = ocrText.toUpperCase().replace(/[^A-Z0-9\s]/g, " ");
  const words = new Set(cleaned.split(/\s+/).filter(Boolean));

  let best = "";
  let bestScore = 0;

  for (const brand of knownBrands) {
    const brandUpper = brand.toUpperCase().trim();
    if (!brandUpper) continue;

    if (cleaned.includes(brandUpper)) {
      return brand; // strongest possible signal — stop looking
    }

    const brandWords = brandUpper.split(/\s+/).filter(Boolean);
    const hits = brandWords.filter((w) => words.has(w)).length;
    const score = brandWords.length > 0 ? hits / brandWords.length : 0;

    if (score > bestScore) {
      bestScore = score;
      best = brand;
    }
  }

  // require at least a decent partial match before trusting the guess
  return bestScore >= 0.5 ? best : "";
}

/**
 * Samples pixel brightness on a downscaled copy of the photo to guess
 * whether it was taken during the day or at night. Purely an informational
 * hint shown to the person taking the photo — not saved anywhere on its own.
 */
export function detectDayOrNight(imageDataUrl: string): Promise<"day" | "night"> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 32; // we only need an average, not detail
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("day");
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      let total = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        // standard perceived-brightness formula
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        count++;
      }
      resolve(count > 0 && total / count < 80 ? "night" : "day");
    };
    img.onerror = () => resolve("day");
    img.src = imageDataUrl;
  });
}

/** Converts a canvas data URL into the base64 payload the backend expects. */
export function dataUrlToPhoto(dataUrl: string, filename: string) {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  return {
    name: filename,
    mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg",
    base64Data: base64Data ?? "",
  };
}

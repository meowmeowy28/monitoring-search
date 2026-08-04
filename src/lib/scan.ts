import { createWorker, PSM } from "tesseract.js";

/**
 * Cleans up a raw camera photo before handing it to Tesseract. Field photos
 * of billboards/signs tend to be low-contrast, a bit dark, and much higher
 * resolution than the text on them needs — all things that make Tesseract
 * guess random-looking letters instead of reading what's actually there.
 * This: upscales small crops so letter strokes are thick enough to resolve,
 * converts to grayscale, and pushes contrast so text separates cleanly from
 * its background before recognition ever runs.
 */
function preprocessForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Tesseract does best around 300dpi-equivalent text height — upscale
      // modest-sized photos so small sign lettering has enough pixels to
      // form recognizable strokes, but don't blow up already-large photos.
      const minDim = 1600;
      const scale = Math.min(2, Math.max(1, minDim / Math.max(img.width, img.height)));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // grayscale + contrast stretch (min/max normalization) — makes faint
      // or unevenly-lit text pop instead of blending into the background
      let min = 255;
      let max = 0;
      const gray = new Uint8ClampedArray(w * h);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[p] = g;
        if (g < min) min = g;
        if (g > max) max = g;
      }
      const range = Math.max(1, max - min);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const stretched = ((gray[p] - min) / range) * 255;
        data[i] = data[i + 1] = data[i + 2] = stretched;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Runs text recognition on a captured photo (as a data URL) and returns
 * whatever text Tesseract could read off it. This is "best effort" — OCR on
 * a billboard photo taken in the field will rarely be perfect, which is why
 * the scan flow always shows the guess in an editable field instead of
 * saving it straight to a folder automatically.
 */
export async function runOCR(imageDataUrl: string): Promise<string> {
  const cleaned = await preprocessForOCR(imageDataUrl);
  const worker = await createWorker("eng");
  try {
    // SPARSE_TEXT: billboards/signs are a few big words on an open
    // background, not a paragraph — this segmentation mode looks for
    // scattered text blocks instead of assuming one solid text block,
    // which is what was causing letters to get jumbled/misread.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const {
      data: { text },
    } = await worker.recognize(cleaned);
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

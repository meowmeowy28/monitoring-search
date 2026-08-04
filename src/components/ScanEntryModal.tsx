import { useEffect, useRef, useState } from "react";
import { X, Camera as CameraIcon, Loader2, RotateCcw, MapPin, Sun, Moon } from "lucide-react";
import { addEntry } from "@/lib/api";
import { runOCR, guessBrand, detectDayOrNight, dataUrlToPhoto } from "@/lib/scan";
import { getCurrentLocation, reverseGeocode } from "@/lib/geo";

interface ScanEntryModalProps {
  onClose: () => void;
  onAdded: () => void; // trigger a re-fetch of entries after a successful add
  knownBrands: string[]; // used to guess which brand the OCR text matches
}

type Stage = "camera" | "analyzing" | "confirm";

// Today's date as YYYY-MM-DD, for pre-filling the Date field.
function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ScanEntryModal({ onClose, onAdded, knownBrands }: ScanEntryModalProps) {
  const [stage, setStage] = useState<Stage>("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // things detected from the photo/device — shown as hints, and used to
  // pre-fill the form below, but always editable before saving
  const [ocrText, setOcrText] = useState("");
  const [dayNight, setDayNight] = useState<"day" | "night" | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // the actual form fields that get submitted
  const [brand, setBrand] = useState("");
  const [site, setSite] = useState("");
  const [panel, setPanel] = useState("");
  const [direction, setDirection] = useState("");
  const [date, setDate] = useState(todayISO());
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // start the camera as soon as the modal opens
  useEffect(() => {
    if (stage !== "camera") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        // common on desktop without a camera, or if permission is denied —
        // fall back to a plain file input (still opens the camera app on
        // most phones) instead of leaving the person stuck
        if (!cancelled) {
          setCameraError(
            "Couldn't access the camera. You can still pick or take a photo below."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [stage]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    stopCamera();
    processPhoto(canvas.toDataURL("image/jpeg", 0.85));
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const processPhoto = async (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setStage("analyzing");
    setLocating(true);

    // run OCR, day/night detection, and GPS lookup together — none of these
    // should block the others
    const [text, tone, loc] = await Promise.all([
      runOCR(dataUrl).catch(() => ""),
      detectDayOrNight(dataUrl),
      getCurrentLocation(),
    ]);

    setOcrText(text);
    setDayNight(tone);
    setBrand(guessBrand(text, knownBrands) || text.split("\n")[0]?.trim().slice(0, 40) || "");

    if (loc) {
      setCoords(loc);
      const place = await reverseGeocode(loc).catch(() => null);
      if (place) setSite(place);
    }
    setLocating(false);

    setStage("confirm");
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
    setOcrText("");
    setDayNight(null);
    setCoords(null);
    setSubmitError(null);
    setStage("camera");
  };

  const missingFields: string[] = [];
  if (!brand.trim()) missingFields.push("Brand");
  if (!site.trim()) missingFields.push("Site");
  if (!date.trim()) missingFields.push("Date");
  if (password.trim().length !== 6) missingFields.push("6-digit password");
  const canSubmit = missingFields.length === 0 && !submitting && !!photoDataUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !photoDataUrl) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const photo = dataUrlToPhoto(photoDataUrl, `scan-${Date.now()}.jpg`);
      const result = await addEntry(password, {
        brand: brand.trim(),
        site: site.trim(),
        panel: panel.trim(),
        direction: direction.trim(),
        date,
        department: department.trim(),
        photos: [photo],
      });

      if (!result.ok) {
        setSubmitError(result.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      onAdded();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          stopCamera();
          onClose();
        }}
      />

      <div className="relative w-full max-w-md bg-background border border-border rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-display font-bold text-lg">Scan Photo</h2>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="opacity-50 hover:opacity-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === "camera" && (
          <div className="p-4 sm:p-6 space-y-3">
            <div className="relative aspect-[3/4] w-full bg-black rounded-md overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/70">
                  <p className="text-sm text-white text-center">{cameraError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!!cameraError}
                className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              >
                <CameraIcon className="w-4 h-4" />
                Capture
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm px-4 py-2.5 rounded-md border border-border hover:bg-black/5 dark:hover:bg-white/5"
              >
                Choose photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileFallback}
              />
            </div>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="p-4 sm:p-6 space-y-4">
            {photoDataUrl && (
              <img src={photoDataUrl} alt="Captured" className="w-full rounded-md" />
            )}
            <div className="flex items-center justify-center gap-2 text-sm opacity-60 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading the photo — brand, lighting, and location...
            </div>
          </div>
        )}

        {stage === "confirm" && (
          <form onSubmit={handleSubmit}>
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {photoDataUrl && (
                <div className="relative">
                  <img src={photoDataUrl} alt="Captured" className="w-full rounded-md" />
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-black/60 text-white hover:bg-black/80"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retake
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {dayNight && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                    {dayNight === "day" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                    Detected: {dayNight === "day" ? "Daytime" : "Nighttime"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                  <MapPin className="w-3 h-3" />
                  {locating
                    ? "Locating..."
                    : coords
                    ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`
                    : "GPS unavailable"}
                </span>
              </div>

              {ocrText && (
                <p className="text-xs opacity-50">
                  Text found in photo: <span className="italic">"{ocrText.replace(/\s+/g, " ").slice(0, 120)}"</span>
                </p>
              )}
              <p className="text-xs opacity-50 -mt-2">
                Review and fix anything below before saving — the brand and site are guesses.
              </p>

              <Field label="Brand" required value={brand} onChange={setBrand} placeholder="e.g. BYD" />
              <Field label="Site" required value={site} onChange={setSite} placeholder="e.g. Balintawak" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Panel" value={panel} onChange={setPanel} placeholder="e.g. 1" />
                <Field label="Direction" value={direction} onChange={setDirection} placeholder="e.g. NB" />
              </div>
              <Field label="Date" required type="date" value={date} onChange={setDate} />
              <Field label="Department" value={department} onChange={setDepartment} placeholder="e.g. Field Ops" />

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
                <p className="text-xs opacity-50 mt-1">Required to save this entry.</p>
              </div>

              {submitError && <p className="text-sm text-status-danger">{submitError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border sticky bottom-0 bg-background">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
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
                {submitting ? "Saving..." : "Save to Folder"}
              </button>
            </div>
          </form>
        )}
      </div>
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

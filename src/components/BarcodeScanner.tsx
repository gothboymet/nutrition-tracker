"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Camera barcode scanner (EAN-13 / EAN-8 / UPC). Uses the browser's built-in
// BarcodeDetector when it exists (Chrome on Android), otherwise loads the free
// ZXing library from a CDN on first use (iPhone Safari, desktop). The code can
// also be typed in by hand.

const ZXING_URL =
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
let zxingPromise: Promise<any> | null = null;

function loadZxing(): Promise<any> {
  const w = window as any;
  if (w.ZXing) return Promise.resolve(w.ZXing);
  if (!zxingPromise) {
    zxingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ZXING_URL;
      script.async = true;
      script.onload = () => resolve(w.ZXing);
      script.onerror = () => {
        zxingPromise = null;
        reject(new Error("Could not load the scanner"));
      };
      document.head.appendChild(script);
    });
  }
  return zxingPromise;
}

const isBarcode = (value: string) => /^\d{8,14}$/.test(value);

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">(
    "starting"
  );
  const [errorText, setErrorText] = useState("");
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState("");

  const finish = (code: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (navigator.vibrate) navigator.vibrate(60);
    onDetected(code);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let zxingReader: any = null;
    let cancelled = false;

    const start = async () => {
      const video = videoRef.current;
      if (!video) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorText("This browser can't use the camera. Type the code below.");
        setStatus("error");
        return;
      }

      try {
        const w = window as any;
        let native: any = null;
        if (w.BarcodeDetector) {
          const supported: string[] =
            (await w.BarcodeDetector.getSupportedFormats?.()) || [];
          if (supported.includes("ean_13")) {
            native = new w.BarcodeDetector({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e"].filter((f) =>
                supported.includes(f)
              ),
            });
          }
        }

        if (native) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) return;
          video.srcObject = stream;
          await video.play();
          setStatus("scanning");

          timer = setInterval(async () => {
            if (video.readyState < 2) return;
            try {
              const codes = await native.detect(video);
              const code = codes?.[0]?.rawValue;
              if (code && isBarcode(code)) finish(code);
            } catch {}
          }, 200);
          return;
        }

        const ZXing = await loadZxing();
        if (cancelled) return;
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
          ZXing.BarcodeFormat.EAN_13,
          ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.UPC_A,
          ZXing.BarcodeFormat.UPC_E,
        ]);
        zxingReader = new ZXing.BrowserMultiFormatReader(hints, 200);
        await zxingReader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (result: any) => {
            const code = result?.getText?.();
            if (code && isBarcode(code)) finish(code);
          }
        );
        if (!cancelled) setStatus("scanning");
      } catch (err: any) {
        console.error(err);
        if (cancelled) return;
        setErrorText(
          err?.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in the browser settings, or type the code below."
            : "Couldn't start the camera. Type the code below."
        );
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      try {
        zxingReader?.reset();
      } catch {}
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = () => {
    const code = manual.replace(/\s/g, "");
    if (!isBarcode(code)) {
      setManualError("A barcode has 8 to 14 digits.");
      return;
    }
    finish(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-background text-foreground rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Scan barcode</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-zinc-500 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
          />
          {status === "scanning" && (
            <div className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
          )}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-zinc-300">
              {status === "starting" ? "Starting camera..." : errorText}
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Point the camera at the barcode on the package.
        </p>

        <div className="flex gap-2">
          <input
            inputMode="numeric"
            placeholder="Or type the code"
            value={manual}
            onChange={(e) => {
              setManual(e.target.value);
              setManualError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
            className="flex-1 min-w-0 bg-background border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            onClick={submitManual}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Use
          </button>
        </div>
        {manualError && <p className="text-xs text-red-500">{manualError}</p>}
      </div>
    </div>
  );
}

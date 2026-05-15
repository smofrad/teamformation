"use client";

import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export function QrScannerPanel({
  onDetected,
  onError,
}: {
  onDetected: (payload: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const busyRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(true);

  async function handleScan(detectedCodes: Array<{ rawValue: string }>) {
    const rawValue = detectedCodes[0]?.rawValue?.trim();

    if (!rawValue || busyRef.current) {
      return;
    }

    busyRef.current = true;

    try {
      await onDetected(rawValue);
      setCameraActive(false);
      window.setTimeout(() => {
        setCameraActive(true);
        busyRef.current = false;
      }, 1800);
    } catch (error) {
      busyRef.current = false;
      onError(error instanceof Error ? error.message : "Scan failed.");
    }
  }

  if (!cameraActive) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-900">
        Scan captured. Camera will resume automatically.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950">
      <Scanner
        constraints={{ facingMode: { ideal: "environment" } }}
        formats={["qr_code"]}
        onError={(error) => onError(error instanceof Error ? error.message : "Camera error.")}
        onScan={handleScan}
        styles={{
          container: { width: "100%", minHeight: 320, background: "#020617" },
          video: { width: "100%", height: 320, objectFit: "cover" },
        }}
      />
    </div>
  );
}

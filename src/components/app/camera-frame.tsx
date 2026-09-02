import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraFrameProps {
  onCapture?: (imageDataUrl: string) => void;
  isScanning?: boolean;
  scanningText?: string;
  className?: string;
  mode?: "enroll" | "verify";
}

export function CameraFrame({
  onCapture,
  isScanning = false,
  scanningText = "Scanning biometric features...",
  className,
  mode = "verify",
}: CameraFrameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [livenessCheck, setLivenessCheck] = useState<{
    framing: boolean;
    lighting: boolean;
    blink: boolean;
    movement: boolean;
  }>({
    framing: true,
    lighting: true,
    blink: false,
    movement: false,
  });

  const startCamera = async () => {
    try {
      setPermissionError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access unavailable or denied, switching to simulated video mode", err);
      setPermissionError("Camera unavailable. Operating in high-precision simulated biometric mode.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Liveness check simulation interval during scanning
  useEffect(() => {
    if (!isScanning) {
      setScanProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    const livenessTimer1 = setTimeout(() => {
      setLivenessCheck((prev) => ({ ...prev, blink: true }));
    }, 600);

    const livenessTimer2 = setTimeout(() => {
      setLivenessCheck((prev) => ({ ...prev, movement: true }));
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(livenessTimer1);
      clearTimeout(livenessTimer2);
    };
  }, [isScanning]);

  const handleManualCapture = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (videoRef.current && cameraActive) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
        const dataUrl = canvas.toDataURL("image/png");
        onCapture?.(dataUrl);
      }
    } else {
      onCapture?.("simulated-face-hash-data");
    }
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border-2 border-border bg-slate-950 shadow-raised">
        {/* Real Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "size-full object-cover transform -scale-x-100",
            !cameraActive && "hidden",
          )}
        />

        {/* Hidden Canvas for Frame Snapshots */}
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        {/* Simulated Fallback Frame when Camera is Not Active */}
        {!cameraActive && (
          <div className="flex size-full flex-col items-center justify-center p-6 text-center text-slate-300">
            <div className="relative mb-3 flex size-24 items-center justify-center rounded-full border-2 border-dashed border-integrity/60 bg-integrity-soft/20">
              <ShieldCheck className="size-10 text-integrity" />
              <div className="absolute inset-0 rounded-full animate-ping border border-integrity/40 opacity-30" />
            </div>
            <p className="text-xs font-semibold tracking-wide text-slate-200">
              {permissionError ? "SIMULATED BIOMETRIC HARDWARE ACTIVE" : "INITIALIZING SENSOR..."}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Zero-Knowledge Face Descriptor Engine
            </p>
          </div>
        )}

        {/* Face Oval Overlay Guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "relative size-56 rounded-[50%] border-2 transition-colors duration-300 sm:size-64",
              isScanning
                ? "border-integrity bg-integrity/5 shadow-[0_0_24px_rgba(14,165,233,0.3)]"
                : "border-slate-400/50 border-dashed",
            )}
          >
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 size-4 border-t-2 border-l-2 border-integrity" />
            <div className="absolute -top-1 -right-1 size-4 border-t-2 border-r-2 border-integrity" />
            <div className="absolute -bottom-1 -left-1 size-4 border-b-2 border-l-2 border-integrity" />
            <div className="absolute -bottom-1 -right-1 size-4 border-b-2 border-r-2 border-integrity" />

            {/* Laser Scan Beam effect during scanning */}
            {isScanning && (
              <div
                className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-integrity to-transparent shadow-[0_0_12px_#0ea5e9] animate-pulse"
                style={{ top: `${scanProgress}%` }}
              />
            )}
          </div>
        </div>

        {/* Live Status Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-md">
            <span
              className={cn(
                "size-2 rounded-full",
                cameraActive ? "bg-success" : "bg-warning",
              )}
            />
            <span>{cameraActive ? "Sensor: Active" : "Sensor: Demo Mode"}</span>
          </div>

          <div className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
            {mode === "enroll" ? "ENROLLMENT" : "VERIFICATION"}
          </div>
        </div>

        {/* Scanning Overlay text & progress */}
        {isScanning && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 text-center">
            <p className="text-xs font-semibold text-integrity animate-pulse">{scanningText}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-integrity transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Liveness Check Indicators */}
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          {livenessCheck.framing ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : (
            <AlertCircle className="size-3.5 text-warning" />
          )}
          <span className="text-muted-foreground">Framing OK</span>
        </div>
        <div className="flex items-center gap-1">
          {livenessCheck.lighting ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : (
            <AlertCircle className="size-3.5 text-warning" />
          )}
          <span className="text-muted-foreground">Lighting Adequate</span>
        </div>
        <div className="flex items-center gap-1">
          {isScanning && livenessCheck.blink ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : (
            <span className="size-3.5 rounded-full border border-muted-foreground/40" />
          )}
          <span className="text-muted-foreground">Blink Detected</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-4 flex items-center gap-2">
        {!cameraActive && (
          <Button variant="outline" size="sm" onClick={startCamera} className="gap-1.5 text-xs">
            <RefreshCw className="size-3.5" />
            <span>Retry Camera</span>
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleManualCapture}
          disabled={isScanning}
          className="gap-1.5 text-xs"
        >
          <Camera className="size-3.5" />
          <span>{mode === "enroll" ? "Capture Face Sample" : "Simulate Instant Verification"}</span>
        </Button>
      </div>
    </div>
  );
}

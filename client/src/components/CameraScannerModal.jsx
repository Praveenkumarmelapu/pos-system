import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, Camera, Volume2, AlertCircle, Flashlight, FlashlightOff, CheckCircle2 } from 'lucide-react';

// Per-code cooldown so one barcode is not reported many times while it stays in view
const SCAN_COOLDOWN_MS = 1500;

// Only the formats a grocery shop actually uses: keeps decoding fast and avoids false reads
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

function videoConstraints(deviceId) {
  const base = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: 'environment' } };
  return {
    video: { ...base, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  };
}

async function getNativeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter(f => supported.includes(f));
    if (!formats.length) return null;
    return new window.BarcodeDetector({ formats });
  } catch {
    return null;
  }
}

export function CameraScannerModal({ isOpen, onClose, onScanSuccess, continuous = false, paused = false }) {
  const videoRef = useRef(null);
  const callbacks = useRef({ onClose, onScanSuccess });
  useEffect(() => { callbacks.current = { onClose, onScanSuccess }; }, [onClose, onScanSuccess]);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [error, setError] = useState(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const trackRef = useRef(null);

  // Audio beep generator using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.onended = () => { audioCtx.close().catch(() => {}); };
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    let cancelled = false;
    let controls;        // zxing controls
    let stream;          // native getUserMedia stream
    let frameHandle;     // requestVideoFrameCallback handle
    let timer;           // setTimeout fallback
    let stopped = false;
    const lastHit = { code: '', time: 0 };

    const stopAll = () => {
      if (stopped) return;
      stopped = true;
      cancelled = true;
      try { controls?.stop(); } catch {}
      if (frameHandle != null && video?.cancelVideoFrameCallback) {
        try { video.cancelVideoFrameCallback(frameHandle); } catch {}
      }
      if (timer != null) clearTimeout(timer);
      const s = stream || video?.srcObject;
      s?.getTracks?.().forEach(track => track.stop());
    };

    const handleCode = (code) => {
      if (pausedRef.current) return;
      const now = Date.now();
      if (code === lastHit.code && now - lastHit.time < SCAN_COOLDOWN_MS) return;
      lastHit.code = code;
      lastHit.time = now;
      playBeep();
      setLastScan({ code, time: now });
      callbacks.current.onScanSuccess?.(code);
      if (!continuous) {
        stopAll();
        callbacks.current.onClose?.();
      }
    };

    const tuneTrack = (activeStream) => {
      const track = activeStream?.getVideoTracks?.()[0];
      if (!track) return;
      trackRef.current = track;
      try {
        const caps = track.getCapabilities?.();
        if (caps?.torch) setTorchSupported(true);
        if (caps?.focusMode?.includes?.('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }
      } catch {}
    };

    // Engine 1: native BarcodeDetector (Chrome on Android) - hardware-accelerated, near-instant
    const startNative = async (detector) => {
      stream = await navigator.mediaDevices.getUserMedia(videoConstraints(selectedCameraId));
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      await video.play().catch(() => {});
      tuneTrack(stream);
      const scheduleNext = () => {
        if (cancelled) return;
        if (video.requestVideoFrameCallback) {
          frameHandle = video.requestVideoFrameCallback(loop);
        } else {
          timer = setTimeout(loop, 200);
        }
      };
      const loop = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(video);
          if (!cancelled && codes && codes.length > 0 && codes[0].rawValue) {
            handleCode(codes[0].rawValue);
          }
        } catch {}
        scheduleNext();
      };
      scheduleNext();
    };

    // Engine 2: zxing fallback (iPhone Safari, older browsers)
    const startZxing = async () => {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      reader.timeBetweenDecodingAttempts = 150;
      controls = await reader.decodeFromConstraints(videoConstraints(selectedCameraId), video, (result) => {
        if (result && !cancelled) handleCode(result.getText());
      });
      if (cancelled || stopped) { controls.stop(); return; }
      if (video.srcObject) tuneTrack(video.srcObject);
    };

    async function startCamera() {
      setError(null);
      setTorchSupported(false);
      setTorchOn(false);
      trackRef.current = null;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera scanning requires HTTPS or localhost. You can enter the barcode manually.');
        return;
      }
      try {
        const detector = await getNativeDetector();
        if (cancelled) return;
        if (detector) {
          await startNative(detector);
        } else {
          await startZxing();
        }
        if (cancelled) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCameras(devices.filter(d => d.kind === 'videoinput'));
      } catch (err) {
        stopAll();
        if (!cancelled) setError(err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow it in your browser or enter the barcode manually.'
          : 'The camera could not start. Check the selected camera or enter the barcode manually.');
      }
    }

    startCamera();
    return () => { stopAll(); };
  }, [isOpen, selectedCameraId, continuous]);

  // Fade the "scanned" confirmation chip after a moment in continuous mode
  useEffect(() => {
    if (!lastScan) return undefined;
    const t = setTimeout(() => setLastScan(null), 2500);
    return () => clearTimeout(t);
  }, [lastScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-base">
              {continuous ? 'Scan Products (keep scanning)' : 'Scan Product Barcode'}
            </h3>
          </div>
          <button
            type="button"
              onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative aspect-square max-h-[58vh] w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Aiming Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-40 border-2 border-dashed border-red-500 rounded-xl relative flex items-center justify-center shadow-lg">
              <div className="absolute inset-x-2 h-0.5 bg-red-500 animate-pulse"></div>
              <span className="text-[11px] font-medium tracking-wide bg-black/60 px-2.5 py-1 rounded-md text-slate-300">
                Center Barcode Within Box
              </span>
            </div>
          </div>

          {/* Scan confirmation chip (continuous mode) */}
          {continuous && lastScan && (
            <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
              <div className="flex items-center gap-1.5 bg-emerald-600/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
                <span>Scanned {lastScan.code}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
              <p className="text-sm text-red-300 font-medium mb-4">{error}</p>
              <button
                type="button"
              onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
              >
                Close & Enter Manually
              </button>
            </div>
          )}
        </div>

        {/* Controls & Camera Switcher */}
        <div className="p-4 bg-slate-950 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs">
            {cameras.length > 1 && (
              <>
                <span className="text-slate-400">Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={event => setSelectedCameraId(event.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Automatic</option>
                  {cameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </>
            )}
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${torchOn ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-300 border-slate-700'}`}
              >
                {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                <span>{torchOn ? 'Torch on' : 'Torch'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <span>{continuous ? 'Beeps on every scan' : 'Audio feedback enabled'}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              {continuous ? 'Done scanning' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

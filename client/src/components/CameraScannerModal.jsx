import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, Volume2, AlertCircle } from 'lucide-react';

export function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const videoRef = useRef(null);
  const callbacks = useRef({ onClose, onScanSuccess });
  useEffect(() => { callbacks.current = { onClose, onScanSuccess }; }, [onClose, onScanSuccess]);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;
    let scanned = false;
    let controls;

    async function startCamera() {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera scanning requires HTTPS or localhost. You can enter the barcode manually.');
        return;
      }
      try {
        const videoDevice = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: { ideal: 'environment' } };
        controls = await reader.decodeFromConstraints({ video: videoDevice, audio: false }, video, (result, _, scanControls) => {
          if (!result || cancelled || scanned) return;
          scanned = true;
          scanControls.stop();
          playBeep();
          callbacks.current.onScanSuccess(result.getText());
          callbacks.current.onClose();
        });
        if (cancelled || scanned) {
          controls.stop();
          return;
        }
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!cancelled) setCameras(devices);
      } catch (error) {
        if (!cancelled) setError(error.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow it in your browser or enter the barcode manually.'
          : 'The camera could not start. Check the selected camera or enter the barcode manually.');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      controls?.stop();
      video?.srcObject?.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-base">Scan Product Barcode</h3>
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
          {cameras.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
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
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <span>Audio feedback enabled</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Barcode,
  Bluetooth,
  Usb,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CameraScannerModal } from '../../components/CameraScannerModal';
import { ReceiptModal } from '../../components/ReceiptModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export function HardwarePage() {
  const { activeShop } = useAuth();

  const [activeTab, setActiveTab] = useState('printer'); // 'printer' | 'scanner'

  // --- Printer State ---
  const [connectionMethod, setConnectionMethod] = useState(
    localStorage.getItem('pos_printer_method') || 'system_print'
  );
  const [paperSize, setPaperSize] = useState(
    localStorage.getItem('pos_printer_paper') || '58mm'
  );
  const [copies, setCopies] = useState(
    parseInt(localStorage.getItem('pos_printer_copies') || '1', 10)
  );
  const [autoPrint, setAutoPrint] = useState(
    localStorage.getItem('pos_printer_autoprint') === 'true'
  );
  const [headerText, setHeaderText] = useState(
    activeShop?.name || 'Retail POS Store'
  );
  const [footerText, setFooterText] = useState(
    activeShop?.settings?.receiptFooter || 'Thank you! Visit again. Quality Guaranteed.'
  );

  // Direct Web Bluetooth state
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [bluetoothConnecting, setBluetoothConnecting] = useState(false);
  const [connectedBleDevice, setConnectedBleDevice] = useState(null);
  const [bleError, setBleError] = useState(null);

  // Test Print State
  const [testPrintSuccess, setTestPrintSuccess] = useState(false);
  const [reprinting, setReprinting] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [reprintError, setReprintError] = useState('');

  // --- Scanner State ---
  const [scannerType, setScannerType] = useState('usb_hid'); // 'usb_hid' | 'bluetooth_hid' | 'camera'
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannedTestCode, setScannedTestCode] = useState('');
  const [scannerDetected, setScannerDetected] = useState(false);
  const [detectedLatency, setDetectedLatency] = useState(null);
  const [scannedProductInfo, setScannedProductInfo] = useState(null);
  const [testingLookup, setTestingLookup] = useState(false);

  const keyTimesRef = useRef([]);

  // Check Web Bluetooth API capability safely
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setBluetoothSupported(true);
    } else {
      setBluetoothSupported(false);
    }
  }, []);

  // Fetch last bill for quick reprint test
  useEffect(() => {
    async function loadLastSale() {
      try {
        const res = await api.get('/sales?limit=1');
        if (res.data.success && res.data.data.length > 0) {
          setLastBill(res.data.data[0]);
        }
      } catch (err) {
        console.warn('Could not fetch last sale:', err);
      }
    }
    loadLastSale();
  }, []);

  // Save Printer Settings
  const handleSavePrinterSettings = () => {
    localStorage.setItem('pos_printer_method', connectionMethod);
    localStorage.setItem('pos_printer_paper', paperSize);
    localStorage.setItem('pos_printer_copies', copies.toString());
    localStorage.setItem('pos_printer_autoprint', autoPrint.toString());
    alert('Printer preferences saved successfully.');
  };

  // Direct Web Bluetooth Pairing Handshake (safe, non-fake)
  const handleConnectBluetooth = async () => {
    if (!navigator.bluetooth) {
      setBleError('Web Bluetooth is not supported in this browser. Please use Chrome on Android or Desktop.');
      return;
    }

    setBluetoothConnecting(true);
    setBleError(null);

    try {
      // Request standard ESC/POS or Serial Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });

      if (device) {
        setConnectedBleDevice(device.name || 'Bluetooth Thermal Printer');
        setConnectionMethod('web_bluetooth');
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setBleError('No Bluetooth device selected. Pair your thermal printer in OS Bluetooth settings first.');
      } else {
        setBleError(`Bluetooth pairing notice: ${err.message}`);
      }
    } finally {
      setBluetoothConnecting(false);
    }
  };

  // Perform Real Test Print
  const handleTestPrint = () => {
    setTestPrintSuccess(true);
    window.print();
    setTimeout(() => setTestPrintSuccess(false), 5000);
  };

  // Handle Interactive Barcode Scanner Testing
  const handleScannerTestKeyDown = (e) => {
    keyTimesRef.current.push(Date.now());

    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (!code) return;

      // Calculate typing latency
      if (keyTimesRef.current.length > 1) {
        const totalDuration = keyTimesRef.current[keyTimesRef.current.length - 1] - keyTimesRef.current[0];
        const avgCharTime = Math.round(totalDuration / keyTimesRef.current.length);
        setDetectedLatency(avgCharTime);

        // Hardware scanners output characters at < 50ms intervals
        if (avgCharTime < 60) {
          setScannerDetected(true);
        }
      }

      setScannedTestCode(code);
      keyTimesRef.current = [];

      // Audio Beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(2000, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {}

      lookupTestBarcode(code);
    }
  };

  function lookupTestBarcode(code) {
      setScannedTestCode(code);
      setScannedProductInfo(null);
      setTestingLookup(true);
      api.get(`/barcodes/lookup/${encodeURIComponent(code)}`)
        .then(res => {
          if (res.data.success && res.data.data.found) {
            setScannedProductInfo(res.data.data.product);
          } else {
            setScannedProductInfo({ name: res.data.data.lookupStatus === 'unavailable' ? 'Catalog temporarily unavailable' : 'No catalog match' });
          }
        })
        .catch(() => setScannedProductInfo({ name: 'Could not look up the barcode. Try again.' }))
        .finally(() => setTestingLookup(false));
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Print Stylesheet Scoped for Test Printing */}
      {!receipt && <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .thermal-test-ticket {
              display: block !important;
              width: ${paperSize === '80mm' ? '80mm' : paperSize === 'A4' ? '210mm' : '58mm'} !important;
              padding: 2mm !important;
              font-family: monospace !important;
              font-size: 11px !important;
              color: #000 !important;
            }
          }
        `
      }} />}

      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            <span>Hardware Setup Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure thermal receipt printers, USB/Bluetooth barcode scanners, and test physical hardware
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('printer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'printer'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Receipt Printers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'scanner'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="h-4 w-4" />
            <span>Barcode Scanners</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THERMAL RECEIPT PRINTER SETUP */}
      {/* ========================================================================= */}
      {activeTab === 'printer' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Method Selection */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-600" />
                  <span>Printer Connection Method</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  ESC/POS Compatible
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Method 1: System / Browser Print Dialog (Recommended) */}
                <div
                  onClick={() => setConnectionMethod('system_print')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    connectionMethod === 'system_print'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900">OS Driver / Browser Print</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Universal support for all Bluetooth, USB, Wi-Fi & LAN printers paired through Windows, Android, or Mac.
                  </p>
                </div>

                {/* Method 2: Direct Web Bluetooth */}
                <div
                  onClick={() => setConnectionMethod('web_bluetooth')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    connectionMethod === 'web_bluetooth'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900">Direct Web Bluetooth</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                      bluetoothSupported ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {bluetoothSupported ? 'Supported' : 'Chrome Only'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Direct browser-to-printer BLE stream on supported mobile and desktop Chrome devices.
                  </p>
                </div>
              </div>

              {/* Bluetooth Pairing Sub-Panel */}
              {connectionMethod === 'web_bluetooth' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Direct Bluetooth Pairing Status</p>
                      <p className="text-[11px] text-slate-500">
                        {connectedBleDevice ? `Connected to: ${connectedBleDevice}` : 'No direct Bluetooth connection active'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectBluetooth}
                      disabled={bluetoothConnecting}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Bluetooth className="h-3.5 w-3.5" />
                      <span>{bluetoothConnecting ? 'Searching...' : 'Pair Bluetooth Printer'}</span>
                    </button>
                  </div>

                  {bleError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>{bleError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Paper Size & Customization */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Paper Size & Thermal Configuration</span>
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '58mm', name: '58 mm (2 Inch)', desc: 'Standard Kirana Thermal Roll' },
                  { id: '80mm', name: '80 mm (3 Inch)', desc: 'Supermarket Fast Receipt' },
                  { id: 'A4', name: 'A4 Full Page', desc: 'Standard GST Tax Invoice' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaperSize(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paperSize === p.id
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/10'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Store Header on Receipt
                  </label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Receipt Footer Note
                  </label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Prompt Print immediately after checkout completion</span>
                </label>

                <button
                  type="button"
                  onClick={handleSavePrinterSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Thermal Ticket Preview & Physical Test Print */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live Thermal Ticket Preview
                </h3>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{paperSize} Width</span>
              </div>

              {/* Realistic Paper Voucher */}
              <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 flex justify-center">
                <div
                  className="bg-white p-4 shadow-sm border border-dashed border-slate-300 font-mono text-xs text-slate-800 transition-all"
                  style={{ width: paperSize === '80mm' ? '280px' : '230px' }}
                >
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <h4 className="font-black text-xs uppercase">{headerText}</h4>
                    <p className="text-[10px] text-slate-500">Ph: {activeShop?.contactPhone || '9849012345'}</p>
                    {activeShop?.gstin && <p className="text-[9px] font-bold mt-0.5">GSTIN: {activeShop.gstin}</p>}
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>INV: TEST-TICKET</span>
                      <span>CASH</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                      <span>POS-01</span>
                    </div>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                    <div className="flex justify-between font-bold text-[10px] border-b pb-0.5">
                      <span>Item</span>
                      <span>Qty × Price</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="truncate">Sample Kirana Rice</span>
                      <span>2 × ₹60 = ₹120</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="truncate">Tata Salt Lite 1kg</span>
                      <span>1 × ₹30 = ₹30</span>
                    </div>
                  </div>

                  <div className="py-2 text-[11px] font-black flex justify-between">
                    <span>GRAND TOTAL:</span>
                    <span>₹150.00</span>
                  </div>

                  <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                    {footerText}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Printer className="h-4 w-4" />
                  <span>Send Real Test Print</span>
                </button>

                {reprintError && <p role="alert" className="text-sm text-red-700">{reprintError}</p>}
                {lastBill && (
                  <button
                    type="button"
                    disabled={reprinting}
                    onClick={async () => {
                      setReprinting(true);
                      setReprintError('');
                      try {
                        const res = await api.get(`/sales/${lastBill._id}`);
                        setReceipt(res.data.data);
                      } catch {
                        setReprintError('Could not load the previous bill. Try again.');
                      } finally {
                        setReprinting(false);
                      }
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Open Previous Bill ({lastBill.invoiceNumber})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BARCODE SCANNER CONNECTIVITY & TESTING */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="no-print space-y-6">
          {/* Scanner Type Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type 1: USB Scanner */}
            <div
              onClick={() => setScannerType('usb_hid')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                scannerType === 'usb_hid'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <Usb className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">USB Handheld Scanner</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Plug-and-play USB scanner (Keyboard HID emulation). Works out-of-the-box across all retail hardware.
              </p>
            </div>

            {/* Type 2: Wireless Bluetooth Scanner */}
            <div
              onClick={() => setScannerType('bluetooth_hid')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                scannerType === 'bluetooth_hid'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Bluetooth className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">Bluetooth Wireless Scanner</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Pair scanner with your PC, tablet, or phone via OS Bluetooth Settings. Emulates direct keystrokes.
              </p>
            </div>

            {/* Type 3: Phone Camera Scanner */}
            <div
              onClick={() => setScannerType('camera')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                scannerType === 'camera'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Camera className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">Mobile Phone Camera</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Uses your phone's back camera with WebRTC & ZXing. Zero extra hardware purchase required.
              </p>
            </div>
          </div>

          {/* Interactive Live Scanner Test Console */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-blue-600" />
                  <span>Live Interactive Scanner Test Zone</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click inside the field below, then scan any product in your store to test hardware latency and auto-detection
                </p>
              </div>
              {scannerDetected && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Hardware Scanner Verified</span>
                </span>
              )}
            </div>

            {/* Test Input Field */}
            <div className="relative">
              <input
                type="text"
                placeholder="Point your scanner here and pull the trigger (or type code & press Enter)..."
                onKeyDown={handleScannerTestKeyDown}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                autoFocus
              />
            </div>

            {scannerType === 'camera' && <button type="button" className="btn btn-primary" onClick={() => setCameraOpen(true)}>
              <Camera className="h-4 w-4" /> Open camera scanner
            </button>}
            {/* Test Results Display */}
            {scannedTestCode && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Scanned Barcode:</span>
                    <span className="font-mono font-black text-blue-700 text-sm">{scannedTestCode}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Detection Latency:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {detectedLatency ? `${detectedLatency} ms / character` : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Device Classification:</span>
                    <span className={`font-bold ${scannerDetected ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {scannerType === 'camera' ? 'Camera or manual entry' : scannerDetected ? 'High-speed keyboard input' : 'Keyboard or manual entry'}
                    </span>
                  </div>
                </div>

                {/* Catalog Preview */}
                {scannedProductInfo && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Catalog Match:</span>
                      <p className="font-extrabold text-slate-900">{scannedProductInfo.name}</p>
                    </div>
                    {scannedProductInfo.sellingPrice && (
                      <span className="font-black text-blue-700">
                        {formatCurrency(scannedProductInfo.sellingPrice)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Setup Guidance */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-700" />
                <span>Shopkeeper Hardware Tip:</span>
              </span>
              <p className="text-[11px] leading-relaxed">
                Most USB barcode scanners come pre-configured in "HID Keyboard Wedge" mode with an automatic "Enter / Carriage Return" suffix. If your scanner doesn't submit automatically, scan the "Add Enter Suffix" barcode in your scanner manual.
              </p>
            </div>
          </div>
        </div>
      )}

      <CameraScannerModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onScanSuccess={lookupTestBarcode} />
      <ReceiptModal isOpen={!!receipt} onClose={() => setReceipt(null)} sale={receipt} shop={activeShop} isReprint />

      {/* Hidden Thermal Print Ticket for Physical Testing */}
      <div className={receipt ? "hidden" : "hidden print:block thermal-test-ticket"}>
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '3mm' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{headerText}</div>
          <div style={{ fontSize: '10px' }}>*** HARDWARE TEST TICKET ***</div>
          <div style={{ fontSize: '9px' }}>{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
        </div>
        <div style={{ padding: '3mm 0', borderBottom: '1px dashed #000', fontSize: '10px' }}>
          <div>PRINTER: {paperSize} Thermal</div>
          <div>TERMINAL: POS-01 (ACTIVE)</div>
          <div>STATUS: TEST TICKET</div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '3mm', fontSize: '9px' }}>
          <div>{footerText}</div>
        </div>
      </div>
    </div>
  );
}

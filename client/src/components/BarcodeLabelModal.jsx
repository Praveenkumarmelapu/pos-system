import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  X,
  Printer,
  Download,
  Copy,
  Sliders,
  CheckCircle2,
  Tag,
  Building2,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const PRESETS = {
  '40x25mm': { name: '40 × 25 mm (Compact)', widthMm: 40, heightMm: 25, fontSize: 10, barHeight: 32 },
  '50x30mm': { name: '50 × 30 mm (Standard Retail)', widthMm: 50, heightMm: 30, fontSize: 11, barHeight: 40 },
  '60x40mm': { name: '60 × 40 mm (Large / Box)', widthMm: 60, heightMm: 40, fontSize: 13, barHeight: 52 }
};

export function BarcodeLabelModal({ isOpen, onClose, product }) {
  const { activeShop } = useAuth();
  const [presetKey, setPresetKey] = useState('50x30mm');
  const [copies, setCopies] = useState(1);
  const [showShopName, setShowShopName] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showPackSize, setShowPackSize] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const barcodeSvgRef = useRef(null);
  const printAreaRef = useRef(null);

  const activePreset = PRESETS[presetKey] || PRESETS['50x30mm'];
  const barcodeValue = product?.barcode || 'INT00000000';

  useEffect(() => {
    if (!isOpen || !product || !barcodeSvgRef.current) return;

    try {
      JsBarcode(barcodeSvgRef.current, barcodeValue, {
        format: 'CODE128',
        width: 1.5,
        height: activePreset.barHeight,
        displayValue: true,
        fontSize: activePreset.fontSize,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 2,
        margin: 4,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
    } catch (err) {
      console.error('[JsBarcode Render Error]', err);
    }
  }, [isOpen, product, barcodeValue, activePreset]);

  if (!isOpen || !product) return null;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      // Record print event in backend
      await api.post('/barcodes/record-print', {
        barcodeValue,
        copies: parseInt(copies, 10) || 1
      });

      window.print();
    } catch (err) {
      console.error('Print recording failed:', err);
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPng = () => {
    setDownloading(true);
    try {
      const svgElement = barcodeSvgRef.current;
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        const a = document.createElement('a');
        a.download = `barcode-${barcodeValue}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        setDownloading(false);
      };

      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } catch (err) {
      console.error('PNG export failed', err);
      setDownloading(false);
    }
  };

  const handleDownloadSvg = () => {
    const svgElement = barcodeSvgRef.current;
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${barcodeValue}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Barcode Label Designer</h3>
              <p className="text-xs text-slate-500">
                Code 128 thermal sticker format for <span className="font-semibold text-slate-700">{product.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Preset & Copies Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sticker Size Preset
              </label>
              <select
                value={presetKey}
                onChange={(e) => setPresetKey(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {Object.entries(PRESETS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Number of Copies
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {[1, 5, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCopies(num)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
                      copies === num
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Label Content Customization Toggles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Sticker Content Options
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showShopName}
                  onChange={(e) => setShowShopName(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Shop Name</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showPackSize}
                  onChange={(e) => setShowPackSize(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Pack Size / Unit</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include MRP comparison</span>
              </label>
            </div>
          </div>

          {/* Live Label Preview on Realistic Sticker Canvas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Live Sticker Preview ({activePreset.widthMm} × {activePreset.heightMm} mm)</span>
              <span className="text-[11px] font-normal text-slate-400">Scale 1:1 on 203 DPI printer</span>
            </label>

            <div className="bg-slate-100/80 p-8 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center">
              <div
                id="thermal-label-preview"
                className="bg-white rounded-lg shadow-md border border-slate-300 p-3 flex flex-col justify-between items-center text-center transition-all duration-200"
                style={{
                  width: `${activePreset.widthMm * 5.2}px`,
                  minHeight: `${activePreset.heightMm * 5.2}px`
                }}
              >
                {/* Shop Header */}
                {showShopName && (
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 line-clamp-1 border-b border-slate-200 pb-1 w-full">
                    {activeShop?.name || 'Retail POS Store'}
                  </p>
                )}

                {/* Product Name */}
                <div className="my-1 w-full">
                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                    {product.name}
                  </h4>
                  {showPackSize && (product.packSize || product.unit) && (
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {product.packSize || `Per ${product.unit}`}
                    </span>
                  )}
                </div>

                {/* Barcode Artwork */}
                <div className="w-full flex justify-center py-1 overflow-hidden">
                  <svg ref={barcodeSvgRef} className="max-w-full" />
                </div>

                {/* Price Strip */}
                <div className="w-full border-t border-slate-200 pt-1.5 flex items-center justify-between px-1">
                  {showMrp && product.mrp > product.sellingPrice ? (
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 line-through">
                        MRP {formatCurrency(product.mrp)}
                      </span>
                    </div>
                  ) : <div />}

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>SVG</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>{printing ? 'Preparing...' : `Print ${copies} ${copies > 1 ? 'Labels' : 'Label'}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Sheet for Thermal Printer & CSS @media print */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${activePreset.widthMm}mm ${activePreset.heightMm}mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .thermal-print-page {
                width: ${activePreset.widthMm}mm;
                height: ${activePreset.heightMm}mm;
                page-break-after: always;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                padding: 2mm;
                box-sizing: border-box;
                font-family: sans-serif;
              }
            }
          `
        }} />

        {Array.from({ length: copies }).map((_, idx) => (
          <div key={idx} className="thermal-print-page">
            {showShopName && (
              <div style={{ fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
                {activeShop?.name || 'Retail POS Store'}
              </div>
            )}
            <div style={{ fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.1' }}>
              {product.name}
            </div>
            {showPackSize && (product.packSize || product.unit) && (
              <div style={{ fontSize: '6.5pt', color: '#555', textAlign: 'center' }}>
                {product.packSize || `Per ${product.unit}`}
              </div>
            )}
            <div style={{ margin: '1mm 0' }}>
              {/* Clone the SVG element for printing */}
              <div dangerouslySetInnerHTML={{
                __html: barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : ''
              }} />
            </div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', fontWeight: 'bold', borderTop: '0.5pt solid #ddd', paddingTop: '1mm' }}>
              {showMrp && product.mrp > product.sellingPrice ? (
                <span style={{ fontSize: '6.5pt', textDecoration: 'line-through', color: '#777' }}>
                  MRP {formatCurrency(product.mrp)}
                </span>
              ) : <span />}
              <span>{formatCurrency(product.sellingPrice)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

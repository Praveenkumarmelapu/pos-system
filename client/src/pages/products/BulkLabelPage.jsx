import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Printer,
  Tag,
  CheckSquare,
  Square,
  Search,
  Filter,
  ArrowLeft,
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

const PRESETS = {
  '40x25mm': { name: '40 × 25 mm (Compact)', widthMm: 40, heightMm: 25, fontSize: 9, barHeight: 28 },
  '50x30mm': { name: '50 × 30 mm (Standard)', widthMm: 50, heightMm: 30, fontSize: 10, barHeight: 36 },
  '60x40mm': { name: '60 × 40 mm (Large)', widthMm: 60, heightMm: 40, fontSize: 12, barHeight: 48 }
};

export function BulkLabelPage() {
  const { activeShop } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiesPerItem, setCopiesPerItem] = useState(2);
  const [presetKey, setPresetKey] = useState('50x30mm');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const activePreset = PRESETS[presetKey] || PRESETS['50x30mm'];

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products?limit=200');
      setProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProducts = products.filter(p => selectedIds.has(p._id));

  // Render barcodes after selectedProducts update
  useEffect(() => {
    if (selectedProducts.length === 0) return;

    selectedProducts.forEach(prod => {
      const svgs = document.querySelectorAll(`.barcode-svg-${prod._id}`);
      svgs.forEach(svg => {
        try {
          JsBarcode(svg, prod.barcode || 'INT000000', {
            format: 'CODE128',
            width: 1.3,
            height: activePreset.barHeight,
            displayValue: true,
            fontSize: activePreset.fontSize,
            font: 'monospace',
            fontOptions: 'bold',
            textMargin: 1,
            margin: 2,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch (e) {
          console.error(e);
        }
      });
    });
  }, [selectedProducts, presetKey, copiesPerItem]);

  const handleBulkGenerateMissing = async () => {
    const missing = products.filter(p => !p.barcode || p.barcode.startsWith('TEMP_'));
    if (missing.length === 0) {
      setFeedback({ message: 'All products currently have valid barcodes assigned.', type: 'info' });
      return;
    }

    setGenerating(true);
    try {
      await api.post('/barcodes/bulk-generate', {
        productIds: missing.map(m => m._id),
        labelPreset: presetKey
      });
      setFeedback({ message: `Successfully generated barcodes for ${missing.length} products!`, type: 'success' });
      await loadProducts();
    } catch (err) {
      setFeedback({ message: 'Failed to generate missing barcodes.', type: 'error' });
    } finally {
      setGenerating(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-grid {
              display: grid !important;
              grid-template-columns: repeat(auto-fill, minmax(${activePreset.widthMm}mm, 1fr)) !important;
              gap: 2mm !important;
              padding: 2mm !important;
            }
            .bulk-sticker-item {
              width: ${activePreset.widthMm}mm !important;
              height: ${activePreset.heightMm}mm !important;
              page-break-inside: avoid !important;
              border: 0.5pt dashed #ccc !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 1.5mm !important;
            }
          }
        `
      }} />

      {/* Header bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              <span>Bulk Barcode Label Studio</span>
            </h1>
            <p className="text-xs text-slate-500">
              Select products to generate and print Code 128 adhesive labels in bulk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBulkGenerateMissing}
            disabled={generating}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>{generating ? 'Generating...' : 'Auto-Generate Missing Barcodes'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedProducts.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>
              Print {selectedProducts.length * copiesPerItem} Labels
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`no-print p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Configuration & Selection Panel */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selection List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <button
                type="button"
                onClick={selectAll}
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
              >
                {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>Select All ({filteredProducts.length})</span>
              </button>
              <span className="text-blue-600 font-extrabold">{selectedIds.size} selected</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2">
            {loading ? (
              <LoadingSkeleton count={6} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No products matched</div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedIds.has(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => toggleSelect(p._id)}
                    className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected ? 'bg-blue-50/70 border border-blue-200/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      <div className="truncate">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.barcode || 'NO BARCODE'}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Print Preview & Label Sheet Grid */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          {/* Preset Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Preset
                </label>
                <select
                  value={presetKey}
                  onChange={(e) => setPresetKey(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white text-slate-800"
                >
                  {Object.entries(PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Copies / Product
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={copiesPerItem}
                  onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 text-center text-slate-800"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-medium text-slate-400">Total stickers to print:</span>
              <p className="text-base font-black text-slate-900">
                {selectedProducts.length * copiesPerItem}
              </p>
            </div>
          </div>

          {/* Label Preview Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/70 rounded-xl mt-4 border border-slate-200/80">
            {selectedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Tag className="h-8 w-8 text-slate-300 mb-2 stroke-[1.2]" />
                <p className="font-bold text-slate-700">No products selected</p>
                <p className="text-slate-400 mt-0.5">Select products from the left panel to preview printable labels</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedProducts.map((p) =>
                  Array.from({ length: copiesPerItem }).map((_, idx) => (
                    <div
                      key={`${p._id}-${idx}`}
                      className="bg-white rounded-lg border border-slate-300 p-2.5 flex flex-col justify-between items-center text-center shadow-xs"
                      style={{ minHeight: `${activePreset.heightMm * 3.8}px` }}
                    >
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-800 truncate w-full border-b border-slate-100 pb-0.5">
                        {activeShop?.name || 'Retail POS'}
                      </span>
                      <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1 my-1">
                        {p.name}
                      </h4>
                      <svg className={`barcode-svg-${p._id} max-w-full my-1`} />
                      <div className="w-full flex justify-between items-center text-[10px] font-extrabold border-t border-slate-100 pt-1">
                        <span className="text-slate-400">{p.packSize || p.unit}</span>
                        <span className="text-slate-900">{formatCurrency(p.sellingPrice)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Container for High Precision Physical Sticker Sheets */}
      <div className="hidden print:block print-grid">
        {selectedProducts.map((p) =>
          Array.from({ length: copiesPerItem }).map((_, idx) => (
            <div
              key={`print-${p._id}-${idx}`}
              className="bulk-sticker-item flex flex-col justify-between items-center text-center bg-white"
            >
              <div style={{ fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {activeShop?.name || 'Retail POS'}
              </div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', lineHeight: '1.1' }} className="truncate w-full">
                {p.name}
              </div>
              <div style={{ margin: '1mm 0' }}>
                <svg className={`barcode-svg-${p._id} max-w-full`} />
              </div>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', borderTop: '0.5pt solid #ddd', paddingTop: '0.5mm' }}>
                <span style={{ fontSize: '6pt', color: '#666' }}>{p.packSize || p.unit}</span>
                <span>{formatCurrency(p.sellingPrice)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

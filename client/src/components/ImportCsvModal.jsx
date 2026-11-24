import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

/**
 * ImportCsvModal
 * Bulk-imports the shop's price list from a CSV file (Excel: File > Save As > CSV).
 * Expected header: barcode,name,selling_price,purchase_price,stock,brand,pack_size
 * Only barcode, name and selling_price are required.
 */
const HEADER_ALIASES = {
  barcode: ['barcode', 'code', 'ean', 'upc'],
  name: ['name', 'product', 'product_name', 'item', 'item_name', 'title'],
  selling_price: ['selling_price', 'price', 'mrp', 'sellingprice', 'rate', 'sell_price'],
  purchase_price: ['purchase_price', 'purchaseprice', 'cost', 'cost_price', 'buy_price'],
  stock: ['stock', 'stock_quantity', 'qty', 'quantity'],
  brand: ['brand'],
  pack_size: ['pack_size', 'packsize', 'size', 'weight']
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  return rows;
}

function rowsToItems(rows) {
  if (!rows.length) return { items: [], headerError: 'The CSV file is empty.' };
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const colIndex = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    colIndex[key] = header.findIndex(h => aliases.includes(h));
  }
  if (colIndex.barcode === -1 || colIndex.name === -1 || colIndex.selling_price === -1) {
    return {
      items: [],
      headerError: 'CSV must have at least these columns: barcode, name, selling_price (or mrp/price).'
    };
  }
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (idx) => (idx >= 0 && r[idx] != null ? String(r[idx]).trim() : '');
    const barcode = get(colIndex.barcode);
    const name = get(colIndex.name);
    const price = parseFloat(get(colIndex.selling_price).replace(/[^\d.]/g, ''));
    if (!barcode || !name || !(price > 0)) continue; // silently skip unusable rows; user sees count
    items.push({
      barcode,
      name,
      sellingPrice: price,
      mrp: price,
      purchasePrice: parseFloat(get(colIndex.purchase_price).replace(/[^\d.]/g, '')) || 0,
      stockQuantity: parseInt(get(colIndex.stock), 10) || 0,
      brand: get(colIndex.brand),
      packSize: get(colIndex.pack_size)
    });
  }
  return { items, headerError: null };
}

export function ImportCsvModal({ isOpen, onClose, onImported }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const reset = () => {
    setFileName('');
    setItems([]);
    setParseError(null);
    setResult(null);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    setResult(null);
    setParseError(null);
    setItems([]);
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const { items: parsed, headerError } = rowsToItems(parseCsv(text));
      if (headerError) setParseError(headerError);
      else if (!parsed.length) setParseError('No usable rows found. Check that barcode, name and price are filled.');
      else setItems(parsed);
    } catch {
      setParseError('Could not read this file. Save it as CSV and try again.');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setParseError(null);
    try {
      let created = 0;
      let updated = 0;
      let failed = 0;
      const errorSamples = [];
      for (let i = 0; i < items.length; i += 500) {
        const chunk = items.slice(i, i + 500);
        const res = await api.post('/products/bulk-import', { items: chunk });
        const d = res.data.data;
        created += d.created;
        updated += d.updated;
        failed += d.failed;
        if (d.errors?.length) errorSamples.push(...d.errors.slice(0, 5));
      }
      setResult({ created, updated, failed, errorSamples });
      onImported?.();
    } catch (err) {
      setParseError(err.response?.data?.error?.message || 'Import failed. Check your connection and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Import price list (CSV)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add your whole stock at once. In Excel: File &gt; Save As &gt; CSV.
            </p>
          </div>
          <button type="button" onClick={() => { reset(); onClose(); }} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">CSV columns (first row = header):</p>
            <p className="font-mono">barcode,name,selling_price,purchase_price,stock,brand,pack_size</p>
            <p>Only <b>barcode</b>, <b>name</b> and <b>selling_price</b> are required. Existing barcodes get their price and stock updated.</p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
            {fileName ? <FileSpreadsheet className="h-8 w-8 text-emerald-600" /> : <Upload className="h-8 w-8 text-slate-400" />}
            <span className="text-xs font-semibold text-slate-700">{fileName || 'Choose CSV file'}</span>
            {items.length > 0 && <span className="text-[11px] text-emerald-700 font-bold">{items.length} products ready</span>}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </label>

          {items.length > 0 && !result && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">Barcode</th>
                    <th className="text-left px-3 py-2 font-bold">Name</th>
                    <th className="text-right px-3 py-2 font-bold">Price</th>
                    <th className="text-right px-3 py-2 font-bold">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 6).map((it) => (
                    <tr key={it.barcode} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono">{it.barcode}</td>
                      <td className="px-3 py-1.5 truncate max-w-[160px]">{it.name}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{it.sellingPrice}</td>
                      <td className="px-3 py-1.5 text-right">{it.stockQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 6 && (
                <p className="text-[10px] text-slate-400 px-3 py-1.5 bg-slate-50">...and {items.length - 6} more</p>
              )}
            </div>
          )}

          {parseError && (
            <p className="flex items-start gap-2 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {parseError}
            </p>
          )}

          {result && (
            <div className="flex items-start gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Done: {result.created} added, {result.updated} updated
                {result.failed > 0 ? `, ${result.failed} rows failed` : ''}.
                {result.errorSamples?.length > 0 && (
                  <span className="block text-rose-600 mt-1">
                    {result.errorSamples.map(e => `Row ${e.row} (${e.barcode || '?'})`).join(', ')}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !items.length}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-1.5"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{importing ? 'Importing...' : `Import ${items.length || ''} products`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

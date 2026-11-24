import React, { useEffect, useRef, useState } from 'react';
import { X, Barcode, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ProductImage } from './ui/ProductImage';

/**
 * QuickAddProductModal
 * Fast "first time seen" capture during billing: scan an unknown barcode,
 * type name (if the free catalogs don't know it) and selling price, save once.
 * From then on every scan of that barcode is an instant add-to-cart.
 */
export function QuickAddProductModal({ isOpen, onClose, barcode, match, onSaved }) {
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const nameRef = useRef(null);
  const priceRef = useRef(null);

  const catalogName = match?.product?.name && !match.product.name.startsWith('Item ') ? match.product.name : '';

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setSubmitting(false);
    setName(catalogName);
    const suggested = match?.product?.sellingPrice || match?.product?.mrp;
    setSellingPrice(suggested > 0 ? String(suggested / 100) : '');
    setPurchasePrice('');
    setStockQuantity('10');
    setTimeout(() => {
      if (catalogName) priceRef.current?.focus();
      else nameRef.current?.focus();
    }, 50);
  }, [isOpen, barcode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const price = parseFloat(sellingPrice);
    if (!name.trim()) {
      setErrorMessage('Enter the product name from the package.');
      return;
    }
    if (!price || price <= 0) {
      setErrorMessage('Enter the selling price (the MRP printed on the package).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/products', {
        barcode,
        name: name.trim(),
        brand: match?.product?.brand || '',
        category: match?.product?.category || 'Others',
        subCategory: match?.product?.subCategory || 'General Others',
        classificationStatus: match?.product?.classificationStatus || 'manual',
        imageUrl: match?.product?.imageUrl || '',
        packSize: match?.product?.packSize || '',
        unit: match?.product?.unit || 'pcs',
        sellingPrice: price,
        purchasePrice: parseFloat(purchasePrice) || 0,
        mrp: price,
        stockQuantity: parseInt(stockQuantity, 10) || 0
      });
      if (res.data.success) {
        onSaved?.(res.data.data);
      } else {
        setErrorMessage(res.data?.error?.message || 'Could not save the product. Try again.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Could not save the product. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">New product - first scan</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Save once; every later scan adds it instantly.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Barcode className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="font-mono text-sm font-bold text-slate-800">{barcode}</span>
            {catalogName && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Catalog match
              </span>
            )}
          </div>

          {match?.product?.imageUrl && (
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
              <ProductImage src={match.product.imageUrl} alt={catalogName} category={match.product.category} size="sm" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product name *</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lays Magic Masala 50g"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selling price (Rs) *</label>
            <input
              ref={priceRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="MRP on the package"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stock qty</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase price (Rs, optional)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save & add to bill</span>
          </button>
        </div>
      </form>
    </div>
  );
}

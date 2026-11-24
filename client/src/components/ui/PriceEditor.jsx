import React from 'react';
import { DollarSign, TrendingUp, Percent, Info, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function PriceEditor({
  mrp,
  setMrp,
  purchasePrice,
  setPurchasePrice,
  sellingPrice,
  setSellingPrice,
  taxRate,
  setTaxRate
}) {
  const purchaseNum = parseFloat(purchasePrice) || 0;
  const sellingNum = parseFloat(sellingPrice) || 0;
  const mrpNum = parseFloat(mrp) || 0;

  // Margin = (Selling - Cost) / Selling
  const marginPercent =
    sellingNum > 0 && sellingNum > purchaseNum
      ? Math.round(((sellingNum - purchaseNum) / sellingNum) * 100)
      : 0;

  // Markup = (Selling - Cost) / Cost
  const markupPercent =
    purchaseNum > 0 && sellingNum > purchaseNum
      ? Math.round(((sellingNum - purchaseNum) / purchaseNum) * 100)
      : 0;

  const grossProfitPerUnit = Math.max(0, sellingNum - purchaseNum);

  // Discount from MRP given to customer
  const discountFromMrp = mrpNum > sellingNum ? mrpNum - sellingNum : 0;
  const discountPercent = mrpNum > 0 && mrpNum > sellingNum ? Math.round((discountFromMrp / mrpNum) * 100) : 0;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200/90 space-y-4">
      {/* Title & Live Margin Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Smart Pricing & Profit Margin
            </h4>
            <span className="text-[10px] text-slate-500">
              Set customer billing rates and calculate store profitability
            </span>
          </div>
        </div>

        {sellingNum > 0 && purchaseNum > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{marginPercent}% Margin ({formatCurrency(grossProfitPerUnit * 100)}/unit profit)</span>
            </span>
          </div>
        )}
      </div>

      {/* 4-Tier Interactive Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Tier 1: MRP / Listed Price */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="product-mrp" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Catalog MRP (₹)
              </label>
              <span className="text-[9px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-100">
                Package MRP
              </span>
            </div>
            <div className="mt-2 relative">
              <span className="absolute left-2.5 top-2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                id="product-mrp"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="0.00"
                className="w-full pl-6 pr-2 py-1.5 text-base font-bold text-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {discountPercent > 0 ? (
              <span className="text-emerald-600 font-semibold">
                Customer saves {discountPercent}% (₹{discountFromMrp.toFixed(2)})
              </span>
            ) : (
              'Maximum retail price printed on product'
            )}
          </p>
        </div>

        {/* Tier 2: Purchase Cost (Private) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="product-cost" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Purchase Cost (₹) *
              </label>
              <span className="text-[9px] text-purple-700 font-semibold px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 flex items-center gap-0.5">
                <ShieldCheck className="h-3 w-3" /> Private
              </span>
            </div>
            <div className="mt-2 relative">
              <span className="absolute left-2.5 top-2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                required
                id="product-cost"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-6 pr-2 py-1.5 text-base font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Enter your actual supplier cost for profit reports.
          </p>
        </div>

        {/* Tier 3: Selling Price (Customer Billing Rate) */}
        <div className="bg-white p-3.5 rounded-xl border-2 border-blue-500 shadow-sm ring-2 ring-blue-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="product-price" className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">
                Selling Price (₹) *
              </label>
              <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded shadow-xs">
                Billing Rate
              </span>
            </div>
            <div className="mt-2 relative">
              <span className="absolute left-2.5 top-2 text-base font-extrabold text-blue-600">₹</span>
              <input
                type="number"
                step="any"
                required
                id="product-price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-6 pr-2 py-1.5 text-lg font-black text-blue-700 bg-transparent focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-blue-600 font-semibold mt-1">
            Authoritative POS checkout price
          </p>
        </div>

        {/* Tier 4: Tax Configuration (GST %) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                GST Tax Rate
              </label>
              <span className="text-[9px] text-slate-600 font-semibold px-1.5 py-0.5 rounded bg-slate-100">
                GSTIN Rules
              </span>
            </div>
            <div className="mt-2">
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>0% (Tax Exempt / Nil)</option>
                <option value={5}>5% GST (CGST 2.5% + SGST 2.5%)</option>
                <option value={12}>12% GST (CGST 6% + SGST 6%)</option>
                <option value={18}>18% GST (CGST 9% + SGST 9%)</option>
                <option value={28}>28% GST (CGST 14% + SGST 14%)</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Calculated and itemized on thermal receipts
          </p>
        </div>
      </div>
    </div>
  );
}

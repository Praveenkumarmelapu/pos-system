import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Sparkles,
  AlertCircle,
  Save,
  Loader2,
  Barcode,
  Camera,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Zap,
  Tag,
  Check,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ProductImage } from './ui/ProductImage';
import { CameraScannerModal } from './CameraScannerModal';
import { formatCurrency } from '../utils/formatters';

export function ProductFormModal({
  isOpen,
  onClose,
  initialBarcode = '',
  product = null,
  initialMatch = null,
  onSaved
}) {
  const isEdit = !!product;
  const { activeShop } = useAuth();
  const defaultThreshold = String(activeShop?.settings?.lowStockThresholdDefault ?? 5);

  // Categories data from API
  const [categoriesData, setCategoriesData] = useState({
    mainCategories: [],
    allCategories: [],
    tree: []
  });

  // Form Fields
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Grocery & Staples');
  const [subCategory, setSubCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [classificationStatus, setClassificationStatus] = useState('manual');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [packSize, setPackSize] = useState('');

  // Dedicated Smart Pricing Fields
  const [mrp, setMrp] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [stockQuantity, setStockQuantity] = useState('10');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [isVerifiedMrp, setIsVerifiedMrp] = useState(false);

  // Lookup & Auto-Detection State
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSource, setLookupSource] = useState(null);
  const [lookupStatus, setLookupStatus] = useState('none');
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [priceAutoDetected, setPriceAutoDetected] = useState(false);
  const [detectedPriceSource, setDetectedPriceSource] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load categories
  useEffect(() => {
    if (!isOpen) return;
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success && res.data.data) {
          setCategoriesData(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      }
    };
    fetchCats();
  }, [isOpen]);

  // Available subcategories for chosen main category
  const availableSubcategories = useMemo(() => {
    if (!category || !categoriesData.tree) return [];
    const parentNode = categoriesData.tree.find(
      (node) => node.name.toLowerCase() === category.toLowerCase()
    );
    return parentNode ? parentNode.subcategories || [] : [];
  }, [category, categoriesData.tree]);

  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      setBarcode(product.barcode || '');
      setName(product.name || '');
      setBrand(product.brand || '');
      setCategory(product.category || 'Grocery & Staples');
      setSubCategory(product.subCategory || '');
      setCategoryId(product.categoryId || '');
      setSubCategoryId(product.subCategoryId || '');
      setClassificationStatus(product.classificationStatus || 'manual');
      setDescription(product.description || '');
      setImageUrl(product.imageUrl || '');
      setUnit(product.unit || 'pcs');
      setPackSize(product.packSize || '');
      setMrp(product.mrp ? (product.mrp / 100).toString() : '');
      setPurchasePrice(product.purchasePrice ? (product.purchasePrice / 100).toString() : '');
      setSellingPrice(product.sellingPrice ? (product.sellingPrice / 100).toString() : '');
      setTaxRate(product.taxRate || 0);
      setStockQuantity(product.stockQuantity?.toString() || '0');
      setMinStockThreshold(product.minStockThreshold?.toString() || '5');
      setLookupSource(null);
      setLookupStatus('complete');
      setPriceAutoDetected(false);
      setIsVerifiedMrp(Boolean(product.verifiedMrp));
    } else if (initialBarcode) {
      setBarcode(initialBarcode);
      handleLookup(initialBarcode, initialMatch);
    } else {
      // Reset for new creation
      setBarcode('');
      setName('');
      setBrand('');
      setCategory('Grocery & Staples');
      setSubCategory('');
      setCategoryId('');
      setSubCategoryId('');
      setClassificationStatus('manual');
      setDescription('');
      setImageUrl('');
      setUnit('pcs');
      setPackSize('');
      setMrp('');
      setPurchasePrice('');
      setSellingPrice('');
      setTaxRate(0);
      setStockQuantity('10');
      setMinStockThreshold(defaultThreshold);
      setLookupSource(null);
      setLookupStatus('none');
      setPriceAutoDetected(false);
      setIsVerifiedMrp(false);
    }
  }, [product, initialBarcode, initialMatch, isOpen, defaultThreshold]);

  // Handle Category Change
  const handleCategorySelect = (newCat) => {
    setCategory(newCat);
    setSubCategory('');
    setClassificationStatus('manual');
    const foundMain = categoriesData.mainCategories?.find(
      (m) => m.name.toLowerCase() === newCat.toLowerCase()
    );
    setCategoryId(foundMain ? foundMain._id : '');
    setSubCategoryId('');
  };

  const handleSubCategorySelect = (newSub) => {
    setSubCategory(newSub);
    setClassificationStatus('manual');
    const foundSub = availableSubcategories.find(
      (s) => s.name.toLowerCase() === newSub.toLowerCase()
    );
    setSubCategoryId(foundSub ? foundSub._id : '');
  };

  // Automatic Barcode Lookup & Smart Price Detection
  const handleLookup = async (codeToLookup, existingMatch) => {
    const code = (codeToLookup || barcode).trim();
    if (!code) return;

    setLookupLoading(true);
    setErrorMessage(null);
    setPriceAutoDetected(false);

    try {
      const match =
        existingMatch ?? (await api.get(`/barcodes/lookup/${encodeURIComponent(code)}`)).data.data;
      if (match.found) {
        const p = match.product;
        const source = match.source;

        setName(p.name || '');
        setBrand(p.brand || '');
        if (p.category) {
          setCategory(p.category);
          setSubCategory(p.subCategory || '');
          setCategoryId(p.categoryId || '');
          setSubCategoryId(p.subCategoryId || '');
          setClassificationStatus(p.classificationStatus || 'auto_assigned');
        }
        setPackSize(p.packSize || '');
        setUnit(p.unit || 'pcs');
        setImageUrl(p.imageUrl || '');

        setMrp(p.mrp > 0 ? String(p.mrp / 100) : '');
        setIsVerifiedMrp(Boolean(p.verifiedMrp));
        setSellingPrice(p.sellingPrice > 0 ? String(p.sellingPrice / 100) : '');
        setPurchasePrice(p.purchasePrice > 0 ? String(p.purchasePrice / 100) : '');
        setStockQuantity('10');
        setPriceAutoDetected(p.sellingPrice > 0);
        setDetectedPriceSource(source === 'shop_inventory' ? 'Shop inventory' : 'Product catalog');
        setLookupSource(source === 'built_in_catalog' ? 'master_catalog' : source);
        setLookupStatus(match.lookupStatus);
      } else {
        setMrp('');
        setSellingPrice('');
        setPurchasePrice('');
        setStockQuantity('10');
        setLookupSource('none');
        setLookupStatus(match.lookupStatus);
        if (match.lookupStatus === 'unavailable') {
          setErrorMessage('The external catalog is unavailable. Enter product details manually below.');
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Product lookup failed. Try again or enter details.'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGenerateInternal = async () => {
    try {
      const res = await api.get('/products/generate-barcode');
      if (res.data.success) {
        setBarcode(res.data.data.barcode);
      }
    } catch {}
  };

  // Live profit margin calculation
  const purchaseNum = parseFloat(purchasePrice) || 0;
  const sellingNum = parseFloat(sellingPrice) || 0;
  const mrpNum = parseFloat(mrp) || 0;
  const profitMarginPercent =
    purchaseNum > 0 && sellingNum > purchaseNum
      ? Math.round(((sellingNum - purchaseNum) / sellingNum) * 100)
      : null;

  const handleMrpChange = (newMrpStr) => {
    setMrp(newMrpStr);
    setIsVerifiedMrp(false);
    const newMrp = parseFloat(newMrpStr) || 0;
    if (newMrp > 0 && (!sellingPrice || sellingPrice === mrp)) {
      setSellingPrice(newMrpStr);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const payload = {
      barcode: barcode.trim(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim() || 'Others',
      subCategory: subCategory.trim() || undefined,
      categoryId: categoryId || undefined,
      subCategoryId: subCategoryId || undefined,
      classificationStatus,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      mrp: parseFloat(mrp) || parseFloat(sellingPrice) || 0,
      taxRate: parseFloat(taxRate) || 0,
      stockQuantity: parseFloat(stockQuantity) || 0,
      minStockThreshold:
        minStockThreshold === '' ? Number(defaultThreshold) : Number(minStockThreshold),
      unit,
      packSize: packSize.trim()
    };

    try {
      const res = isEdit
        ? await api.patch(`/products/${product._id}`, payload)
        : await api.post('/products', payload);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {isEdit ? 'Edit Product' : 'Smart Supermarket Product Registration'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Auto-Categorization Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Automatic multi-tier lookup across internal inventory, master supermarket catalog, and external databases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: Barcode Scan & Lookup Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="h-4 w-4 text-blue-600" />
                <span>Product Barcode / SKU</span>
              </span>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleGenerateInternal}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Auto-Generate Loose Code
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                required
                disabled={isEdit}
                data-barcode-input="true"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup(barcode);
                  }
                }}
                placeholder="Scan manufacturer barcode (EAN-13, UPC) or type code..."
                className="w-full min-w-0 sm:flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />

              {!isEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => handleLookup(barcode)}
                    disabled={lookupLoading || !barcode.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span>Lookup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCameraScanOpen(true)}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    title="Camera Scanner"
                  >
                    <Camera className="h-4 w-4 text-blue-300" />
                  </button>
                </>
              )}
            </div>

            {/* Source Status Pill */}
            {lookupSource && (
              <div className="flex items-center gap-2 text-xs pt-1">
                {lookupSource === 'shop_inventory' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Found in Shop Inventory
                  </span>
                )}
                {lookupSource === 'master_catalog' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Matched in Master FMCG Catalog
                  </span>
                )}
                {lookupSource === 'external_catalog' && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Auto-classified from External Open Catalog
                  </span>
                )}
                {lookupSource === 'none' && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                    New Product Registered — Enter details below
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: Basic Product Information & Image */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Thumbnail */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Product Image</label>
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center relative group">
                <ProductImage
                  src={imageUrl}
                  alt={name || 'Product Image Preview'}
                  category={category}
                  className="w-full h-full object-cover"
                  size="lg"
                />
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL (Optional)"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Title, Brand, Category, Pack Size */}
            <div className="md:col-span-3 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tata Salt Vacuum Evaporated 1kg"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Tata, Nestle, Amul"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder="e.g. 1 kg, 500 g, 75 g, 1 L"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Categorization with Subcategory & Status Badge */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-blue-600" />
                    <span>Category & Subcategory</span>
                  </span>

                  {classificationStatus === 'auto_assigned' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <Check className="h-3 w-3 text-emerald-600" />
                      Auto-assigned
                    </span>
                  )}
                  {classificationStatus === 'pending_classification' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <Info className="h-3 w-3 text-amber-600" />
                      Assigned to Others
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Main Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {categoriesData.mainCategories?.map((c) => (
                        <option key={c._id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Subcategory
                    </label>
                    <select
                      value={subCategory}
                      onChange={(e) => handleSubCategorySelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- No Subcategory --</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub._id || sub.name} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PRICING & MARGIN */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span>Pricing & Profit Margin</span>
              </span>

              {profitMarginPercent !== null && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>+{profitMarginPercent}% Margin</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* MRP */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    MRP (₹)
                  </label>
                  {isVerifiedMrp && (
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp}
                  onChange={(e) => handleMrpChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Purchase Price */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Selling Price */}
              <div className="bg-blue-50/60 p-3 rounded-xl border-2 border-blue-500 shadow-xs">
                <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm font-bold text-blue-900 bg-transparent focus:outline-none"
                />
              </div>

              {/* GST Rate */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  GST Rate (%)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: INVENTORY & STOCK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Opening Stock ({unit}) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="l">Litres (L)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || lookupLoading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isEdit ? 'Update Product' : 'Add to Store'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {cameraScanOpen && (
        <CameraScannerModal
          isOpen={cameraScanOpen}
          onClose={() => setCameraScanOpen(false)}
          onScanSuccess={(code) => {
            setCameraScanOpen(false);
            setBarcode(code);
            handleLookup(code);
          }}
        />
      )}
    </div>
  );
}

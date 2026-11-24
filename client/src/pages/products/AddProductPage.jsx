import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Barcode,
  Search,
  Camera,
  Sparkles,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  Tag,
  Plus,
  Printer,
  Info,
  Check,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ProductImage } from '../../components/ui/ProductImage';
const CameraScannerModal = lazy(() => import('../../components/CameraScannerModal').then(m => ({ default: m.CameraScannerModal })));
const BarcodeLabelModal = lazy(() => import('../../components/BarcodeLabelModal').then(m => ({ default: m.BarcodeLabelModal })));
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { NotificationToast } from '../../components/ui/NotificationToast';

export function AddProductPage() {
  const navigate = useNavigate();
  const { activeShop } = useAuth();

  // Categories data from API
  const [categoriesData, setCategoriesData] = useState({
    mainCategories: [],
    allCategories: [],
    tree: []
  });
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form Fields - Section 1: Product Identification
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Form Fields - Section 2: Classification
  const [category, setCategory] = useState('Grocery & Staples');
  const [subCategory, setSubCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [classificationStatus, setClassificationStatus] = useState('manual'); // 'auto_assigned' | 'manual' | 'pending_classification'
  const [customCategoryModalOpen, setCustomCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('Grocery & Staples');
  const [savingCategory, setSavingCategory] = useState(false);

  // Form Fields - Section 3: Pricing
  const [mrp, setMrp] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [isVerifiedMrp, setIsVerifiedMrp] = useState(false);

  // Form Fields - Section 4: Inventory
  const [stockQuantity, setStockQuantity] = useState('10');
  const [unit, setUnit] = useState('pcs');
  const [packSize, setPackSize] = useState('');
  const [minStockThreshold, setMinStockThreshold] = useState(
    String(activeShop?.settings?.lowStockThresholdDefault ?? 5)
  );

  // Lookup & UI States
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSource, setLookupSource] = useState(null);
  const lookupRequest = useRef(0);
  const filledBarcode = useRef(null);
  const [existingProduct, setExistingProduct] = useState(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [labelModalProduct, setLabelModalProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const nameDebounceTimer = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success && res.data.data) {
          setCategoriesData(res.data.data);
          // Set initial category default if found
          const mains = res.data.data.mainCategories || [];
          if (mains.length > 0 && !category) {
            setCategory(mains[0].name);
            setCategoryId(mains[0]._id);
          }
        }
      } catch (err) {
        console.warn('Failed to load categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Update available subcategories when main category changes
  const availableSubcategories = React.useMemo(() => {
    if (!category || !categoriesData.tree) return [];
    const parentNode = categoriesData.tree.find(
      (node) => node.name.toLowerCase() === category.toLowerCase()
    );
    return parentNode ? parentNode.subcategories || [] : [];
  }, [category, categoriesData.tree]);

  // Handle Main Category Change
  const handleCategoryChange = (newCatName) => {
    setCategory(newCatName);
    setSubCategory('');
    setClassificationStatus('manual');

    const foundMain = categoriesData.mainCategories.find(
      (m) => m.name.toLowerCase() === newCatName.toLowerCase()
    );
    if (foundMain) {
      setCategoryId(foundMain._id);
    } else {
      setCategoryId('');
    }
    setSubCategoryId('');
  };

  // Handle SubCategory Change
  const handleSubCategoryChange = (newSubName) => {
    setSubCategory(newSubName);
    setClassificationStatus('manual');
    const foundSub = availableSubcategories.find(
      (s) => s.name.toLowerCase() === newSubName.toLowerCase()
    );
    if (foundSub) {
      setSubCategoryId(foundSub._id);
    } else {
      setSubCategoryId('');
    }
  };

  // Barcode Lookup with Auto-Categorization
  const handleBarcodeLookup = async (codeToLookup) => {
    const code = (codeToLookup || barcode).trim();
    if (!code) return;

    const request = ++lookupRequest.current;
    setBarcode(code);
    setLookupLoading(true);
    setLookupSource(null);
    setExistingProduct(null);
    setIsVerifiedMrp(false);

    try {
      const { data: { data: match } } = await api.get(`/barcodes/lookup/${encodeURIComponent(code)}`);
      if (request !== lookupRequest.current) return;
      setLookupSource(match.lookupStatus === 'unavailable' ? 'unavailable' : match.source);

      if (!match.found) {
        return;
      }
      const p = match.product;
      if (match.source === 'shop_inventory') {
        setExistingProduct(p);
        return;
      }

      filledBarcode.current = code;
      setName(p.name || '');
      setBrand(p.brand || '');
      setPackSize(p.packSize || '');
      setUnit(p.unit || 'pcs');
      setImageUrl(p.imageUrl || '');

      // Intelligent categorization result
      if (p.category) {
        setCategory(p.category);
        if (p.subCategory) {
          setSubCategory(p.subCategory);
        }
        if (p.categoryId) setCategoryId(p.categoryId);
        if (p.subCategoryId) setSubCategoryId(p.subCategoryId);
        setClassificationStatus(p.classificationStatus || 'auto_assigned');
      }

      // MRP & Pricing
      if (p.mrp > 0) {
        setMrp(String(p.mrp / 100));
        setIsVerifiedMrp(Boolean(p.verifiedMrp));
      } else {
        setMrp('');
        setIsVerifiedMrp(false);
      }

      if (p.sellingPrice > 0) {
        setSellingPrice(String(p.sellingPrice / 100));
      }
      if (p.purchasePrice > 0) {
        setPurchasePrice(String(p.purchasePrice / 100));
      }

      showToast(`Product identified: ${p.name}`);
    } catch (err) {
      if (request === lookupRequest.current) {
        showToast(
          err.response?.data?.error?.message || 'Could not look up barcode. You can enter details manually.',
          'error'
        );
      }
    } finally {
      if (request === lookupRequest.current) setLookupLoading(false);
    }
  };

  useBarcodeScanner({ onScan: handleBarcodeLookup, enabled: !cameraModalOpen && !submitting });

  const changeBarcode = (value) => {
    lookupRequest.current += 1;
    setBarcode(value);
    setLookupLoading(false);
    setLookupSource(null);
    setExistingProduct(null);
  };

  // Generate Loose Products Barcode
  const handleGenerateInternalCode = async () => {
    try {
      const res = await api.get('/products/generate-barcode');
      if (res.data.success) {
        changeBarcode(res.data.data.barcode);
        showToast('Generated internal barcode for loose / unpackaged product');
      }
    } catch {
      showToast('Could not generate a barcode. Try again.', 'error');
    }
  };

  // Real-time Category Suggestion from Product Name
  const handleNameChange = (newName) => {
    setName(newName);

    if (nameDebounceTimer.current) {
      clearTimeout(nameDebounceTimer.current);
    }

    if (newName.trim().length >= 3 && classificationStatus !== 'manual') {
      nameDebounceTimer.current = setTimeout(async () => {
        try {
          const res = await api.get(`/categories/suggest?q=${encodeURIComponent(newName.trim())}`);
          if (res.data.success && res.data.data) {
            const suggestion = res.data.data;
            if (suggestion.category && suggestion.category !== 'Others') {
              setCategory(suggestion.category);
              if (suggestion.subCategory) {
                setSubCategory(suggestion.subCategory);
              }
              setClassificationStatus(suggestion.confidence >= 60 ? 'auto_assigned' : 'pending_classification');
            }
          }
        } catch {
          // ignore background suggestion errors
        }
      }, 500);
    }
  };

  // Quick Create Custom Category
  const handleCreateCustomCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSavingCategory(true);
    try {
      const res = await api.post('/categories', {
        name: newCatName.trim(),
        parentName: newCatParent,
        icon: 'Tag'
      });

      if (res.data.success) {
        showToast(`Category '${newCatName}' created!`);
        // Refresh categories
        const catRes = await api.get('/categories');
        if (catRes.data.success) {
          setCategoriesData(catRes.data.data);
        }
        if (newCatParent) {
          setCategory(newCatParent);
          setSubCategory(newCatName.trim());
          setSubCategoryId(res.data.data._id);
        } else {
          setCategory(newCatName.trim());
          setCategoryId(res.data.data._id);
        }
        setClassificationStatus('manual');
        setCustomCategoryModalOpen(false);
        setNewCatName('');
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to create category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  // Profit Margin Calculation
  const marginCalculation = React.useMemo(() => {
    const sp = parseFloat(sellingPrice) || 0;
    const cp = parseFloat(purchasePrice) || 0;
    if (sp <= 0 || cp <= 0) return null;
    const profit = sp - cp;
    const marginPercent = ((profit / sp) * 100).toFixed(1);
    const markupPercent = ((profit / cp) * 100).toFixed(1);
    return { profit, marginPercent, markupPercent };
  }, [sellingPrice, purchasePrice]);

  // Save Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (submitting || lookupLoading || existingProduct) return;
    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      showToast('Selling price must be greater than 0', 'error');
      return;
    }

    setSubmitting(true);
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
      mrp: parseFloat(mrp) || 0,
      taxRate: parseFloat(taxRate) || 0,
      stockQuantity: parseFloat(stockQuantity) || 0,
      minStockThreshold: minStockThreshold === '' ? 5 : Number(minStockThreshold),
      unit,
      packSize: packSize.trim()
    };

    try {
      const res = await api.post('/products', payload);
      if (res.data.success) {
        showToast(`'${name}' added to your store inventory!`, 'success');
        navigate('/products', { replace: true });
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save product.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/categories"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Manage Categories</span>
          </Link>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Supermarket Smart Onboarding
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveProduct} className="space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: PRODUCT IDENTIFICATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                  1
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Product Identification
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-8">
                Scan manufacturer barcode or generate internal code for loose items
              </p>
            </div>

            <div className="flex items-center gap-2 ml-8 sm:ml-0">
              <button
                type="button"
                onClick={handleGenerateInternalCode}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-200/60"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Generate Loose Code</span>
              </button>
              {barcode && barcode.startsWith('INT') && (
                <button
                  type="button"
                  onClick={() =>
                    setLabelModalProduct({
                      barcode,
                      name: name || 'Loose Product',
                      sellingPrice: parseFloat(sellingPrice) * 100 || 0,
                      mrp: parseFloat(mrp) * 100 || 0,
                      packSize,
                      unit
                    })
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Label</span>
                </button>
              )}
            </div>
          </div>

          {/* Barcode Search Row */}
          <div className="flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => changeBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeLookup(e.currentTarget.value);
                  }
                }}
                placeholder="Scan manufacturer barcode (EAN-13, UPC) or type code..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => handleBarcodeLookup(barcode)}
              disabled={lookupLoading || !barcode.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors shrink-0"
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Smart Lookup</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Camera className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>

          {lookupSource && (
            <div
              role="status"
              className={`rounded-xl p-3 text-xs flex items-center gap-2.5 ${
                existingProduct
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : lookupSource === 'unavailable'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}
            >
              {existingProduct ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Product already exists in inventory:{' '}
                    <Link className="font-bold underline text-amber-900" to={`/products/${existingProduct._id}`}>
                      {existingProduct.name}
                    </Link>
                  </span>
                </>
              ) : lookupSource === 'none' ? (
                <>
                  <Info className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>New barcode registered. Enter product details below.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Product metadata successfully retrieved from catalog! Details populated automatically.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Product Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            {/* Image Preview & URL */}
            <div className="flex flex-col items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 w-full">
                Product Image
              </label>

              <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group">
                <ProductImage
                  src={imageUrl}
                  alt={name || 'New Item'}
                  category={category}
                  size="xl"
                />
              </div>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL (optional)"
                className="mt-2 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Inputs: Name, Brand, Description */}
            <div className="md:col-span-3 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Tata Salt Vacuum Evaporated 1kg, Britannia Good Day Cashew 100g"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Category will auto-suggest in real-time as you type the product name.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Tata, Nestle, Amul, Parle"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Description / Notes
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Premium iodized table salt"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: INTELLIGENT CLASSIFICATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                  2
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Supermarket Category Classification
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-8">
                Predefined supermarket category hierarchy tailored for Indian retail & kirana
              </p>
            </div>

            <div className="flex items-center gap-3 ml-8 sm:ml-0">
              {/* Classification Status Badge */}
              {classificationStatus === 'auto_assigned' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Category automatically assigned
                </span>
              )}
              {classificationStatus === 'pending_classification' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/60">
                  <Info className="h-3.5 w-3.5 text-amber-600" />
                  Assigned to Others (review suggested)
                </span>
              )}
              {classificationStatus === 'manual' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300/60">
                  <Tag className="h-3.5 w-3.5 text-blue-600" />
                  Custom / Manually selected
                </span>
              )}

              <button
                type="button"
                onClick={() => setCustomCategoryModalOpen(true)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Custom Category</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Main Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              >
                {categoriesData.mainCategories && categoriesData.mainCategories.length > 0 ? (
                  categoriesData.mainCategories.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="Grocery & Staples">Grocery & Staples</option>
                )}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Choose from 33 standard Indian supermarket categories.
              </span>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Subcategory (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={subCategory}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- No Subcategory --</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub._id || sub.name} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {availableSubcategories.length} subcategories available under {category}.
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: PRICING & TAXATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-bold text-xs">
                  3
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Pricing & Taxation
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-8">
                Selling price is always set by you; verified MRP displayed when available from package
              </p>
            </div>

            {marginCalculation && (
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/70 ml-8 sm:ml-0">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">
                  Margin: {marginCalculation.marginPercent}% (₹{marginCalculation.profit.toFixed(2)} profit)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* MRP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  MRP (₹)
                </label>
                {isVerifiedMrp && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Verified MRP
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mrp}
                onChange={(e) => {
                  setMrp(e.target.value);
                  setIsVerifiedMrp(false);
                }}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Maximum Retail Price</span>
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Cost to shop</span>
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
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
                className="w-full px-3.5 py-2.5 border-2 border-blue-500 rounded-xl text-sm font-bold text-slate-900 bg-blue-50/20 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
              />
              <span className="text-[10px] text-blue-600 font-semibold mt-1 block">Amount charged at POS</span>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GST Rate (%)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value={0}>0% (Tax Exempt)</option>
                <option value={5}>5% (Essential Goods)</option>
                <option value={12}>12% (Standard Low)</option>
                <option value={18}>18% (Standard FMCG)</option>
                <option value={28}>28% (Luxury / Aerated)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Included in price</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: INVENTORY & MEASUREMENT */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
              4
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Inventory & Stock Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Opening stock quantity and low inventory warning thresholds
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Opening Stock */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Opening Stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Available quantity in store</span>
            </div>

            {/* Measurement Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="l">Litres (L)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">POS billing unit</span>
            </div>

            {/* Pack Size */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pack Size
              </label>
              <input
                type="text"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g. 1 kg, 500 ml, 75 g"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Printed on bill / label</span>
            </div>

            {/* Low Stock Alert Threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Low Stock Alert Limit
              </label>
              <input
                type="number"
                min="0"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Warns when stock falls below</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to="/products"
            className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || lookupLoading || Boolean(existingProduct)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:shadow"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Product to Store</span>
          </button>
        </div>
      </form>

      {/* Quick Add Custom Category Modal */}
      {customCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Custom Category / Subcategory</h3>
            <p className="text-xs text-slate-500">
              Create a custom category or subcategory for your shop. Master categories will remain organized.
            </p>
            <form onSubmit={handleCreateCustomCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Parent Category
                </label>
                <select
                  value={newCatParent}
                  onChange={(e) => setNewCatParent(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {categoriesData.mainCategories?.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Organic Millet, Cold Pressed Oils"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !newCatName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {savingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {cameraModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 text-white rounded-2xl px-6 py-5 flex items-center gap-3 border border-slate-800">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <span className="text-sm">Starting camera scanner...</span>
            </div>
          </div>
        }>
        <CameraScannerModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onScanSuccess={(code) => {
            setCameraModalOpen(false);
            handleBarcodeLookup(code);
          }}
        />
        </Suspense>
      )}

      {/* Barcode Label Modal for Loose Products */}
      {labelModalProduct && (
        <Suspense fallback={null}>
        <BarcodeLabelModal
          isOpen={Boolean(labelModalProduct)}
          onClose={() => setLabelModalProduct(null)}
          product={labelModalProduct}
        />
        </Suspense>
      )}

      {/* Notification Toast */}
      {toast && <NotificationToast message={toast.message} type={toast.type} />}
    </div>
  );
}

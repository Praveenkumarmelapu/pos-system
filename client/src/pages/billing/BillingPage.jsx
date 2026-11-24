import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ShoppingCart,
  Sparkles,
  AlertCircle,
  PackagePlus,
  RefreshCw,
  X,
  CreditCard,
  User,
  SlidersHorizontal,
  ArrowRight,
  Tag
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
const CameraScannerModal = lazy(() => import('../../components/CameraScannerModal').then(m => ({ default: m.CameraScannerModal })));
const QuickAddProductModal = lazy(() => import('../../components/QuickAddProductModal').then(m => ({ default: m.QuickAddProductModal })));
import { CheckoutModal } from '../../components/CheckoutModal';
import { ReceiptModal } from '../../components/ReceiptModal';
const ProductFormModal = lazy(() => import('../../components/ProductFormModal').then(m => ({ default: m.ProductFormModal })));
import { CustomerSelectModal } from '../../components/CustomerSelectModal';
import { ProductCard } from '../../components/ProductCard';
import { ProductImage } from '../../components/ui/ProductImage';
import { CategoryPills } from '../../components/ui/CategoryPills';
import { NotificationToast } from '../../components/ui/NotificationToast';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/formatters';

export function BillingPage() {
  const {
    items,
    addItem,
    updateQuantity,
    updateItemDiscount,
    removeItem,
    clearCart,
    totals,
    selectedCustomer,
    setSelectedCustomer
  } = useCart();
  const { activeShop, user } = useAuth();

  // State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [productFormModalOpen, setProductFormModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState('');
  const [barcodeMatch, setBarcodeMatch] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [quickAddMatch, setQuickAddMatch] = useState(null);
  const suppressCodeRef = useRef({ code: '', until: 0 });
  const [completedSale, setCompletedSale] = useState(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // References
  const barcodeInputRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const lastScannedCodeRef = useRef('');
  const processingRef = useRef(false);

  // Audio Beep Effect
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keyboard Shortcuts: F2 (Barcode focus), F4 (Checkout), F8 (Clear Cart), Esc (Dismiss)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (items.length > 0) {
          setCheckoutModalOpen(true);
        } else {
          showToast('Cart is empty. Scan products first.', 'error');
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (items.length > 0 && window.confirm('Clear all items from the cart?')) {
          clearCart();
        }
      } else if (e.key === 'Escape') {
        setCameraModalOpen(false);
        setCheckoutModalOpen(false);
        setReceiptModalOpen(false);
        setProductFormModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, clearCart]);

  // Fetch products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        api.get('/products?limit=500'),
        api.get('/categories')
      ]);
      if (prodRes.status === 'fulfilled' && prodRes.value.data.success) {
        const prodData = prodRes.value.data.data;
        setProducts(prodData);
        const productCats = prodData.map((p) => p.category).filter(Boolean);
        let allCats = Array.from(new Set(productCats));
        if (catRes.status === 'fulfilled' && catRes.value.data.success) {
          const masterMains = (catRes.value.data.data.mainCategories || []).map((m) => m.name);
          allCats = Array.from(new Set([...allCats, ...masterMains.slice(0, 10)]));
        }
        setCategories(allCats.length > 0 ? allCats : ['Grocery & Staples', 'Dairy & Eggs', 'Snacks', 'Beverages']);
      }
    } catch (err) {
      console.warn('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Barcode normalization: scanners may strip or add leading zeros (UPC-A vs EAN-13)
  const barcodeVariants = (code) => {
    const c = String(code || '').trim();
    if (!/^\d{12,14}$/.test(c)) return [c];
    return [...new Set([c, c.replace(/^0+(?=\d{12}$)/, ''), c.padStart(13, '0'), c.padStart(14, '0')])];
  };

  // Local barcode index of the shop's own inventory: scan -> cart with zero network wait
  const barcodeIndex = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (!p.barcode) return;
      barcodeVariants(p.barcode).forEach((v) => {
        if (!map.has(v)) map.set(v, p);
      });
    });
    return map;
  }, [products]);

  const findLocalProduct = (code) => {
    const variants = barcodeVariants(code);
    for (let i = 0; i < variants.length; i++) {
      const hit = barcodeIndex.get(variants[i]);
      if (hit) return hit;
    }
    return null;
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Handle scanned or submitted barcode
  const handleBarcodeProcess = async (code) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Prevent concurrent processing
    if (processingRef.current) return;

    // Debounce: ignore same code within 1000ms
    const now = Date.now();
    if (lastScannedCodeRef.current === cleanCode && now - lastScannedTimeRef.current < 1000) {
      return;
    }

    processingRef.current = true;
    lastScannedCodeRef.current = cleanCode;
    lastScannedTimeRef.current = now;
    setBarcodeInput('');

    // Instant path: product already in shop inventory (loaded locally) - no network wait
    const localProduct = findLocalProduct(cleanCode);
    if (localProduct) {
      playBeep();
      addItem(localProduct);
      showToast(`Added '${localProduct.name}' to cart`);
      processingRef.current = false;
      refocusScanner();
      return;
    }

    try {
      const res = await api.get(`/barcodes/lookup/${encodeURIComponent(cleanCode)}`);
      if (res.data.success && res.data.data.found) {
        const match = res.data.data;
        if (match.source === 'shop_inventory') {
          playBeep();
          addItem(match.product);
          showToast(`Added '${match.product.name}' to cart`);
        } else {
          // Catalog match (master catalog / Open Food Facts): quick-add with details prefilled
          setBarcodeMatch(match);
          setQuickAddBarcode(cleanCode);
          setQuickAddMatch(match);
          setQuickAddOpen(true);
          showToast(`Found '${match.product.name}' in catalog. Confirm price and save.`, 'info');
        }
      } else {
        // Unknown barcode: quick-add with just name + price
        setQuickAddBarcode(cleanCode);
        setQuickAddMatch(null);
        setQuickAddOpen(true);
        showToast(res.data.data.lookupStatus === 'unavailable' ? 'Catalog is unavailable. Enter details to save it.' : `New barcode. Enter name and price once - saved forever.`, 'warning');
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Barcode lookup failed', 'error');
    } finally {
      processingRef.current = false;
      refocusScanner();
    }
  };

  // Hardware Scanner Hook
  useBarcodeScanner({
    onScan: (scannedCode) => {
      handleBarcodeProcess(scannedCode);
    },
    enabled: !cameraModalOpen && !checkoutModalOpen && !productFormModalOpen && !quickAddOpen
  });

  // Keep the scan box focused on desktops so a handheld scanner is always ready.
  // Skipped on touch devices where focus pops the on-screen keyboard.
  const isDesktopPointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  const refocusScanner = () => {
    if (isDesktopPointer()) barcodeInputRef.current?.focus();
  };

  useEffect(() => {
    if (!cameraModalOpen && !checkoutModalOpen && !productFormModalOpen && !receiptModalOpen && !quickAddOpen) {
      refocusScanner();
    }
  }, [cameraModalOpen, checkoutModalOpen, productFormModalOpen, receiptModalOpen, quickAddOpen]);

  // Camera scanner in billing runs in continuous mode: known items add instantly.
  // Unknown barcodes pause the camera, run the full catalog lookup once, and open
  // the quick-add sheet - after saving, the product is known forever.
  const handleCameraScan = async (code) => {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) return;
    if (cleanCode === suppressCodeRef.current.code && Date.now() < suppressCodeRef.current.until) return;

    const localProduct = findLocalProduct(cleanCode);
    if (localProduct) {
      addItem(localProduct);
      showToast(`Added '${localProduct.name}' to cart`);
      return;
    }

    setQuickAddBarcode(cleanCode);
    setQuickAddMatch(null);
    setQuickAddOpen(true); // camera pauses while this is open
    try {
      const res = await api.get(`/barcodes/lookup/${encodeURIComponent(cleanCode)}`);
      if (res.data.success && res.data.data.found && res.data.data.source !== 'shop_inventory') {
        setQuickAddMatch(res.data.data);
        setBarcodeMatch(res.data.data);
      }
    } catch {
      // Quick-add still works without catalog data: name + price is enough
    }
  };

  const handleQuickAddSaved = (product) => {
    setProducts((prev) => [...prev.filter((p) => p._id !== product._id), product]);
    addItem(product);
    showToast(`Saved '${product.name}' - added to bill`);
    suppressCodeRef.current = { code: quickAddBarcode, until: Date.now() + 5000 };
    setQuickAddOpen(false);
    setQuickAddBarcode('');
    setQuickAddMatch(null);
    setBarcodeMatch(null);
  };

  const handleBarcodeFormSubmit = (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (code) {
      handleBarcodeProcess(code);
    }
  };

  const handleAddToCart = (product) => {
    playBeep();
    addItem(product);
  };

  // Complete checkout handler
  const handleCompleteSale = async (paymentData) => {
    setIsSubmittingSale(true);
    const idempotencyKey = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      idempotencyKey,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discountAmount: item.discountAmount || 0
      })),
      totalDiscount: totals.billDiscountPaise / 100,
      paymentMethod: paymentData.paymentMethod,
      paidAmount: paymentData.paidAmount,
      creditAmount: paymentData.creditAmount,
      paymentBreakdown: paymentData.paymentBreakdown,
      paymentDetails: {
        receivedAmount: paymentData.receivedAmount,
        referenceNote: paymentData.referenceNote
      },
      customerId: paymentData.customerId || selectedCustomer?.id || selectedCustomer?._id || null,
      customerName: paymentData.customerName || selectedCustomer?.name || 'Walk-in Customer',
      customerPhone: paymentData.customerPhone || selectedCustomer?.phone || null
    };

    try {
      const res = await api.post('/sales', payload);
      if (res.data.success) {
        setCompletedSale(res.data.data);
        clearCart();
        setCheckoutModalOpen(false);
        setMobileCartOpen(false);
        setReceiptModalOpen(true);
        loadProducts(); // Refresh stock
        showToast('Sale completed successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Checkout failed', 'error');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Map of cart items for quick quantity lookup on product cards
  const cartQuantityMap = useMemo(() => {
    const map = new Map();
    items.forEach(i => map.set(i.productId, i.quantity));
    return map;
  }, [items]);

  return (
    <div className="h-full flex flex-col lg:flex-row min-w-0 bg-[#f8fafc] font-sans overflow-hidden">
      {/* LEFT SECTION: Search, Barcode Input, Category Filter, and Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-r border-slate-200/80">
        {/* POS Status Bar — compact, light */}
        <div className="bg-white border-b border-border px-4 py-1.5 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-3 text-txt-secondary">
            <span className="flex items-center gap-1.5 text-success font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
              Online
            </span>
            <span className="text-border">|</span>
            <span className="font-medium">Cashier: <span className="font-bold text-txt">{user?.name || 'Operator'}</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-txt-muted">
            <span className="bg-surface-muted text-txt-secondary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border">F2 Scan</span>
            <span className="bg-surface-muted text-txt-secondary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border">F4 Pay</span>
            <span className="bg-surface-muted text-txt-secondary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border">F8 Clear</span>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-border space-y-2.5 z-10 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Dedicated Barcode Scanner Input */}
            <form onSubmit={handleBarcodeFormSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3.5 top-3 h-4.5 w-4.5 text-txt-muted" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  data-barcode-input="true"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter code — press Enter"
                  className="w-full pl-10 pr-4 py-2.5 bg-blue-50/30 border-2 border-action/40 rounded-lg text-xs sm:text-sm font-mono focus:bg-white focus:ring-2 focus:ring-action/20 focus:border-action focus:outline-none transition-all placeholder:text-txt-muted text-txt"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="absolute right-3 top-3 text-txt-muted hover:text-txt"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-action hover:bg-action-hover text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
              >
                Scan / Enter
              </button>

              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="px-3.5 py-2.5 bg-nav hover:bg-nav-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                title="Open Mobile Camera Scanner"
              >
                <Camera className="h-4 w-4 text-blue-300" />
                <span className="hidden sm:inline">Camera</span>
              </button>
            </form>

            {/* Quick Text Filter by Name */}
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-txt-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, brand..."
                className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-action/20 focus:border-action focus:outline-none text-txt"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-txt-muted hover:text-txt"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Pill Filters */}
          <div className="pt-1">
            <CategoryPills
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </div>

        {/* Product Cards Gallery Viewport */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 h-56 animate-pulse flex flex-col justify-between">
                  <div className="aspect-square bg-slate-100 rounded-xl"></div>
                  <div className="space-y-1.5 mt-2">
                    <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description={
                searchQuery
                  ? `No items matching '${searchQuery}'. Try another search or scan a barcode.`
                  : 'No products in this category.'
              }
              actionLabel="Add New Product"
              onAction={() => {
                setUnregisteredBarcode('');
                setProductFormModalOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-20 lg:pb-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  cartQuantity={cartQuantityMap.get(product._id) || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Dedicated Sticky Checkout Cart Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-80 xl:w-96 bg-white border-l border-slate-200/80 flex-col h-full shadow-[0_0_15px_rgba(0,0,0,0.02)] select-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-action flex items-center justify-center">
              <ShoppingCart className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-txt text-sm leading-tight">Checkout Cart</h3>
              <span className="text-[11px] text-txt-muted font-medium">
                {totals.totalItemsCount} {totals.totalItemsCount === 1 ? 'item' : 'items'} in bill
              </span>
            </div>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-danger hover:text-danger-text font-semibold flex items-center gap-1 hover:bg-danger-light px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Customer Assignment Strip */}
        <div className="px-4 py-2 bg-surface-muted border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-txt truncate">
            <User className="h-3.5 w-3.5 text-action shrink-0" />
            <span className="font-semibold truncate">
              {selectedCustomer?.name || 'Walk-in Customer'}
            </span>
            {selectedCustomer?.outstandingUdhaar > 0 && (
              <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.2 rounded border border-red-200">
                Udhaar: {formatCurrency(selectedCustomer.outstandingUdhaar)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="text-[11px] font-semibold text-action hover:text-action-hover bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors shrink-0"
          >
            {selectedCustomer ? 'Change' : '+ Customer'}
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                <ShoppingCart className="h-8 w-8 stroke-[1.2] text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-700">Cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Scan barcodes or tap products on the left to start billing
              </p>
            </div>
          ) : (
            items.map((item) => {
              const lineTotal = Math.round((item.sellingPrice * item.quantity) - Math.round((item.discountAmount || 0) * 100));
              return (
                <div key={item.productId} className="pt-3 first:pt-0 flex items-start gap-3">
                  {/* Small Product Thumbnail */}
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      size="sm"
                    />
                  </div>

                  {/* Title & Price breakdown */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </h5>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <span>{formatCurrency(item.sellingPrice)}</span>
                      <span>×</span>
                      <span>{item.quantity}</span>
                    </div>

                    {/* Stepper & Line Total */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - (['kg', 'l'].includes(item.unit) ? 0.5 : 1))}
                            className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, e.target.value)}
                            className="h-6 w-14 text-center text-xs font-black text-slate-800 bg-white border-x border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + (['kg', 'l'].includes(item.unit) ? 0.5 : 1))}
                            className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                          {item.unit}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bill Calculations & Checkout Action */}
        <div className="p-5 border-t border-slate-200/80 bg-slate-50/70 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">{formatCurrency(totals.subtotalPaise)}</span>
          </div>

          {totals.totalTaxPaise > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>GST (Included / Added)</span>
              <span className="font-semibold text-slate-800">{formatCurrency(totals.totalTaxPaise)}</span>
            </div>
          )}

          {totals.billDiscountPaise > 0 && (
            <div className="flex justify-between text-success font-medium">
              <span>Extra Discount</span>
              <span className="font-semibold">-{formatCurrency(totals.billDiscountPaise)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-border flex justify-between items-baseline">
            <span className="text-sm font-bold text-txt">Final Payable</span>
            <span className="text-xl font-bold font-mono text-txt">
              {formatCurrency(totals.grandTotalPaise)}
            </span>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setCheckoutModalOpen(true)}
            className="w-full mt-3 py-3 bg-action hover:bg-action-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
          >
            <Receipt className="h-4.5 w-4.5" />
            <span>Complete Sale & Print</span>
          </button>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 bg-surface-card border-t border-border p-3 flex items-center justify-between shadow-2xl">
        <div
          onClick={() => setMobileCartOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer active:opacity-75 transition-opacity"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-action flex items-center justify-center font-bold text-sm relative">
            <ShoppingCart className="h-5 w-5" />
            {totals.totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-action text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {totals.totalItemsCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-txt-muted font-bold uppercase flex items-center gap-1">
              <span>View Cart</span>
              <span className="text-action font-bold">&uarr;</span>
            </div>
            <div className="text-base font-bold font-mono text-txt leading-tight">
              {formatCurrency(totals.grandTotalPaise)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCameraModalOpen(true)}
            className="p-2.5 bg-nav text-white rounded-lg text-xs font-bold"
            title="Scan with Camera"
          >
            <Camera className="h-4 w-4 text-blue-300" />
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setCheckoutModalOpen(true)}
            className="px-5 py-2.5 bg-action hover:bg-action-hover disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <span>Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-UP CART DRAWER */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase">
                  Current Bill ({totals.totalItemsCount} items)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all items from bill?')) {
                        clearCart();
                        setMobileCartOpen(false);
                      }
                    }}
                    className="text-xs text-rose-600 font-bold px-2 py-1 rounded hover:bg-rose-50"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Bill is currently empty. Scan or select items.
                </div>
              ) : (
                items.map((item) => {
                  const lineTotal = Math.round((item.sellingPrice * item.quantity) - Math.round((item.discountAmount || 0) * 100));
                  return (
                    <div key={item.productId} className="pt-3 first:pt-0 flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          category={item.category}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatCurrency(item.sellingPrice)} × {item.quantity} {item.unit}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - (['kg', 'l'].includes(item.unit) ? 0.5 : 1))}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, e.target.value)}
                              className="h-6 w-12 text-center text-xs font-black text-slate-900 bg-white border-x border-slate-200 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + (['kg', 'l'].includes(item.unit) ? 0.5 : 1))}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-1 text-slate-300 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Checkout Footer */}
            <div className="p-4 bg-surface-muted border-t border-border space-y-3">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-txt-secondary font-bold uppercase">Total Payable:</span>
                <span className="text-lg font-bold text-txt font-mono">
                  {formatCurrency(totals.grandTotalPaise)}
                </span>
              </div>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => {
                  setMobileCartOpen(false);
                  setCheckoutModalOpen(true);
                }}
                className="w-full py-3 bg-action hover:bg-action-hover disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                <span>Proceed to Pay & Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {cameraModalOpen && (
        <Suspense fallback={null}>
          <CameraScannerModal
            isOpen={cameraModalOpen}
            continuous
            paused={quickAddOpen}
            onClose={() => setCameraModalOpen(false)}
            onScanSuccess={handleCameraScan}
          />
        </Suspense>
      )}

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onCompleteSale={handleCompleteSale}
        isSubmitting={isSubmittingSale}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        sale={completedSale}
        shop={activeShop}
      />

      {productFormModalOpen && (
      <Suspense fallback={null}>
      {quickAddOpen && (
        <Suspense fallback={null}>
          <QuickAddProductModal
            isOpen={quickAddOpen}
            barcode={quickAddBarcode}
            match={quickAddMatch}
            onClose={() => {
              setQuickAddOpen(false);
              setQuickAddBarcode('');
              setQuickAddMatch(null);
              refocusScanner();
            }}
            onSaved={handleQuickAddSaved}
          />
        </Suspense>
      )}

      <ProductFormModal
        isOpen={productFormModalOpen}
        initialBarcode={unregisteredBarcode}
        initialMatch={barcodeMatch}
        onClose={() => {
          setProductFormModalOpen(false);
          setUnregisteredBarcode('');
          setBarcodeMatch(null);
        }}
        onSaved={(product) => {
          loadProducts();
          if (unregisteredBarcode && product?.stockQuantity > 0) addItem(product);
        }}
      />
      </Suspense>
      )}

      <CustomerSelectModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(cust) => setSelectedCustomer(cust)}
      />

      {/* Notification Toast */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

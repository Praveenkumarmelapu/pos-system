import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Edit2,
  Trash2,
  ArrowUpDown,
  Barcode,
  Sparkles,
  Download,
  AlertTriangle,
  Printer,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ProductFormModal } from '../../components/ProductFormModal';
import { ImportCsvModal } from '../../components/ImportCsvModal';
const BarcodeLabelModal = lazy(() => import('../../components/BarcodeLabelModal').then(m => ({ default: m.BarcodeLabelModal })));
import { ProductImage } from '../../components/ui/ProductImage';
import { StockBadge } from '../../components/ui/StockBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { CategoryPills } from '../../components/ui/CategoryPills';
import { formatCurrency } from '../../utils/formatters';
import { toCsv, downloadCsv } from '../../utils/csv';

export function ProductsPage() {
  const { activeShop } = useAuth();
  const canManage = activeShop?.role !== 'cashier';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controls
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // all, low_stock, out_of_stock
  const [sortBy, setSortBy] = useState('name'); // name, price_asc, price_desc, stock_asc, stock_desc

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [labelProduct, setLabelProduct] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        api.get('/products?limit=100'),
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
      console.warn('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter & Sort
  const processedProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          !search.trim() ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.includes(search) ||
          (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

        const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

        let matchesStatus = true;
        if (statusFilter === 'low_stock') {
          matchesStatus = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
        } else if (statusFilter === 'out_of_stock') {
          matchesStatus = p.stockQuantity <= 0;
        }

        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'stock_asc') return a.stockQuantity - b.stockQuantity;
        if (sortBy === 'stock_desc') return b.stockQuantity - a.stockQuantity;
        return a.name.localeCompare(b.name);
      });
  }, [products, search, selectedCategory, statusFilter, sortBy]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive '${name}'? Historical sales records will remain preserved.`)) {
      return;
    }
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not archive product.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Products Management</h2>
          <p className="text-xs text-slate-500">
            Catalog inventory, images, smart pricing, and stock thresholds ({processedProducts.length} items)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center p-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Link
            to="/products/labels"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Bulk Labels</span>
          </Link>

          <button
            onClick={() => {
              const csv = toCsv(products, [
                { key: 'barcode', label: 'Barcode' },
                { key: 'name', label: 'Name' },
                { key: 'brand', label: 'Brand' },
                { key: 'category', label: 'Category' },
                { key: 'sellingPrice', label: 'Selling Price (Rs)', value: (p) => (p.sellingPrice / 100).toFixed(2) },
                { key: 'mrp', label: 'MRP (Rs)', value: (p) => ((p.mrp || 0) / 100).toFixed(2) },
                { key: 'purchasePrice', label: 'Purchase Price (Rs)', value: (p) => ((p.purchasePrice || 0) / 100).toFixed(2) },
                { key: 'stockQuantity', label: 'Stock Qty' },
                { key: 'unit', label: 'Unit' },
                { key: 'taxRate', label: 'GST %' },
                { key: 'minStockThreshold', label: 'Low Stock Alert At' }
              ]);
              downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Download the product list as a CSV (Excel) file"
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {canManage && (
          <button
            onClick={() => setImportOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Import your price list from a CSV file"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          )}

          {canManage && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product title, brand, or barcode..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">All Stock Status</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="pt-1">
          <CategoryPills
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* Main Content: Grid View or Table View */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading products catalog...</div>
      ) : processedProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your search criteria, category selection, or register a new item."
          actionLabel="Add New Product"
          onAction={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: Visual Product Image Cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {processedProducts.map((p) => {
            const hasDiscount = p.mrp && p.mrp > p.sellingPrice;
            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Thumbnail Frame */}
                  <Link to={`/products/${p._id}`} className="block">
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-100 relative group-hover:border-blue-200 transition-colors">
                      <ProductImage
                        src={p.imageUrl}
                        alt={p.name}
                        category={p.category}
                        size="lg"
                      />
                      <div className="absolute top-2 left-2 z-10">
                        <StockBadge
                          quantity={p.stockQuantity}
                          minThreshold={p.minStockThreshold}
                          unit={p.unit}
                        />
                      </div>
                    </div>

                    {/* Title & Brand */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-slate-400 truncate">
                        {p.brand || p.category} {p.packSize ? `• ${p.packSize}` : ''}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors" title={p.name}>
                        {p.name}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {p.barcode}
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Pricing & Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(p.sellingPrice)}
                    </div>
                    {hasDiscount && (
                      <div className="text-[10px] text-slate-400 line-through">
                        MRP {formatCurrency(p.mrp)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLabelProduct(p)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print Barcode Label"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    {canManage && (
                    <>
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id, p.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Compact rows with image thumbnail */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product Item</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.name}
                          category={p.category}
                          size="sm"
                        />
                      </div>
                      <Link to={`/products/${p._id}`} className="truncate max-w-xs hover:text-blue-600 transition-colors">
                        <div className="font-bold text-slate-900 truncate hover:text-blue-600">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.brand} {p.packSize ? `(${p.packSize})` : ''}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{p.barcode}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{p.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-blue-700">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge
                        quantity={p.stockQuantity}
                        minThreshold={p.minStockThreshold}
                        unit={p.unit}
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setLabelProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print Barcode Label"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      {canManage && (
                      <>
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p._id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Archive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ImportCsvModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadProducts}
      />

      <ProductFormModal
        isOpen={modalOpen}
        product={editingProduct}
        onClose={() => setModalOpen(false)}
        onSaved={loadProducts}
      />

      {/* Barcode Label Modal */}
      {labelProduct && (
        <Suspense fallback={null}>
          <BarcodeLabelModal
            isOpen={!!labelProduct}
            product={labelProduct}
            onClose={() => setLabelProduct(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  GitMerge,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  PackageCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationToast } from '../../components/ui/NotificationToast';

export function CategoriesPage() {
  const [categoriesData, setCategoriesData] = useState({
    mainCategories: [],
    allCategories: [],
    tree: []
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedParents, setExpandedParents] = useState({});
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'unclassified'

  // Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catParentName, setCatParentName] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [savingCategory, setSavingCategory] = useState(false);

  // Merge Modal
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [merging, setMerging] = useState(false);

  // Unclassified / Others Products
  const [unclassifiedProducts, setUnclassifiedProducts] = useState([]);
  const [loadingUnclassified, setLoadingUnclassified] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [bulkTargetCategory, setBulkTargetCategory] = useState('Grocery & Staples');
  const [bulkTargetSubCategory, setBulkTargetSubCategory] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data.success && res.data.data) {
        setCategoriesData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUnclassifiedProducts = async () => {
    setLoadingUnclassified(true);
    try {
      const res = await api.get('/products?limit=200');
      if (res.data.success) {
        const others = res.data.data.filter(
          (p) =>
            p.category === 'Others' ||
            p.classificationStatus === 'pending_classification' ||
            !p.category
        );
        setUnclassifiedProducts(others);
      }
    } catch (err) {
      showToast('Failed to load products for categorization', 'error');
    } finally {
      setLoadingUnclassified(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'unclassified') {
      loadUnclassifiedProducts();
    }
  }, [activeTab]);

  const toggleExpand = (name) => {
    setExpandedParents((prev) => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Filtered Category Tree
  const filteredTree = useMemo(() => {
    if (!categoriesData.tree) return [];
    if (!search.trim()) return categoriesData.tree;

    const q = search.toLowerCase();
    return categoriesData.tree
      .map((node) => {
        const matchesParent = node.name.toLowerCase().includes(q);
        const matchingSubs = (node.subcategories || []).filter((sub) =>
          sub.name.toLowerCase().includes(q)
        );

        if (matchesParent || matchingSubs.length > 0) {
          return {
            ...node,
            subcategories: matchesParent ? node.subcategories : matchingSubs
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [categoriesData.tree, search]);

  // Open Add Category Modal
  const handleOpenAdd = (parentName = '') => {
    setEditingCategory(null);
    setCatName('');
    setCatParentName(parentName);
    setCatIcon('Tag');
    setCategoryModalOpen(true);
  };

  // Open Edit Category Modal
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatParentName(cat.parentName || '');
    setCatIcon(cat.icon || 'Tag');
    setCategoryModalOpen(true);
  };

  // Save Category (Add or Edit)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, {
          name: catName.trim(),
          parentName: catParentName || undefined,
          icon: catIcon
        });
        showToast('Category updated successfully');
      } else {
        await api.post('/categories', {
          name: catName.trim(),
          parentName: catParentName || undefined,
          icon: catIcon
        });
        showToast('Category created successfully');
      }
      setCategoryModalOpen(false);
      loadCategories();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;

    try {
      await api.delete(`/categories/${cat._id}`);
      showToast('Category deleted');
      loadCategories();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete category', 'error');
    }
  };

  // Merge Categories
  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!mergeSourceId || !mergeTargetId) {
      showToast('Select both source and target categories', 'error');
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      showToast('Source and Target categories must be different', 'error');
      return;
    }

    setMerging(true);
    try {
      const res = await api.post('/categories/merge', {
        sourceCategoryId: mergeSourceId,
        targetCategoryId: mergeTargetId
      });
      if (res.data.success) {
        showToast(
          `Merged categories successfully! ${res.data.data.reassignedProductsCount} products updated.`
        );
        setMergeModalOpen(false);
        setMergeSourceId('');
        setMergeTargetId('');
        loadCategories();
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  // Bulk Reassign Products
  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllProducts = () => {
    if (selectedProductIds.size === unclassifiedProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(unclassifiedProducts.map((p) => p._id)));
    }
  };

  const handleBulkReassign = async () => {
    if (selectedProductIds.size === 0) {
      showToast('Select at least one product to categorize', 'error');
      return;
    }

    setReassigning(true);
    try {
      const res = await api.post('/categories/bulk-reassign', {
        productIds: Array.from(selectedProductIds),
        targetCategory: bulkTargetCategory,
        targetSubCategory: bulkTargetSubCategory || undefined
      });

      if (res.data.success) {
        showToast(
          `Successfully categorized ${res.data.data.modifiedCount} products into ${bulkTargetCategory}!`
        );
        setSelectedProductIds(new Set());
        loadUnclassifiedProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to reassign products', 'error');
    } finally {
      setReassigning(false);
    }
  };

  const bulkAvailableSubcategories = useMemo(() => {
    if (!bulkTargetCategory || !categoriesData.tree) return [];
    const parentNode = categoriesData.tree.find(
      (node) => node.name.toLowerCase() === bulkTargetCategory.toLowerCase()
    );
    return parentNode ? parentNode.subcategories || [] : [];
  }, [bulkTargetCategory, categoriesData.tree]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Master Supermarket Categories
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Predefined hierarchy of 33 master supermarket categories with subcategories and smart classification
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMergeModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <GitMerge className="h-4 w-4 text-slate-600" />
            <span>Merge Categories</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Category Hierarchy ({categoriesData.mainCategories?.length || 33})</span>
        </button>

        <button
          onClick={() => setActiveTab('unclassified')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'unclassified'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Bulk Categorize 'Others'</span>
          {unclassifiedProducts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {unclassifiedProducts.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CATEGORY HIERARCHY */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="relative w-full sm:flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories and subcategories..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Total {categoriesData.allCategories?.length || 0} categories & subcategories available
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading supermarket category tree...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTree.map((parent) => {
                const isExpanded = expandedParents[parent.name] ?? false;
                const subs = parent.subcategories || [];

                return (
                  <div
                    key={parent.name}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {parent.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {parent.name}
                          </h3>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {subs.length} subcategories
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAdd(parent.name)}
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors"
                          title={`Add subcategory under ${parent.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExpand(parent.name)}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition-colors"
                          title="Toggle subcategories"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Subcategories list */}
                    <div className="p-3 space-y-1 max-h-56 overflow-y-auto">
                      {subs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2 text-center">
                          No subcategories added yet
                        </p>
                      ) : (
                        subs.slice(0, isExpanded ? subs.length : 5).map((sub) => (
                          <div
                            key={sub._id || sub.name}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group"
                          >
                            <span className="text-slate-700 font-medium truncate">
                              {sub.name}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(sub)}
                                className="p-0.5 text-slate-400 hover:text-slate-700"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              {!sub.isSystem && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(sub)}
                                  className="p-0.5 text-slate-400 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {!isExpanded && subs.length > 5 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(parent.name)}
                          className="text-[11px] font-bold text-blue-600 hover:underline pt-1 block w-full text-center"
                        >
                          + View {subs.length - 5} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BULK CATEGORIZE OTHERS */}
      {activeTab === 'unclassified' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <span>Bulk Reassign Products in 'Others'</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly select products currently in 'Others' or pending review and assign them to standard supermarket categories.
              </p>
            </div>

            {/* Bulk Action Controls */}
            {selectedProductIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 bg-blue-50/70 p-2 rounded-xl border border-blue-200/60">
                <span className="text-xs font-bold text-blue-800">
                  {selectedProductIds.size} selected
                </span>

                <select
                  value={bulkTargetCategory}
                  onChange={(e) => {
                    setBulkTargetCategory(e.target.value);
                    setBulkTargetSubCategory('');
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  {categoriesData.mainCategories?.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkTargetSubCategory}
                  onChange={(e) => setBulkTargetSubCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- Subcategory --</option>
                  {bulkAvailableSubcategories.map((sub) => (
                    <option key={sub._id || sub.name} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBulkReassign}
                  disabled={reassigning}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  {reassigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Apply Category</span>
                </button>
              </div>
            )}
          </div>

          {loadingUnclassified ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading unclassified products...</span>
            </div>
          ) : unclassifiedProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">All products are categorized!</h4>
              <p className="text-xs text-slate-500 mt-1">
                There are no products assigned to 'Others' or pending classification.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-3 py-1">
                <button
                  type="button"
                  onClick={selectAllProducts}
                  className="flex items-center gap-2 text-slate-700 hover:text-blue-600"
                >
                  {selectedProductIds.size === unclassifiedProducts.length ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span>Select All ({unclassifiedProducts.length})</span>
                </button>
                <span>Current Status</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {unclassifiedProducts.map((p) => {
                  const isSelected = selectedProductIds.has(p._id);
                  return (
                    <div
                      key={p._id}
                      onClick={() => toggleSelectProduct(p._id)}
                      className={`flex items-center justify-between p-3.5 text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {p.barcode} {p.brand ? `· Brand: ${p.brand}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {p.category || 'Others'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Parent Category (Leave empty for Main Category)
                </label>
                <select
                  value={catParentName}
                  onChange={(e) => setCatParentName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- No Parent (Main Category) --</option>
                  {categoriesData.mainCategories?.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Organic Millet, Cold Pressed Oils"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !catName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {savingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Categories Modal */}
      {mergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-blue-600" />
              <span>Merge Supermarket Categories</span>
            </h3>
            <p className="text-xs text-slate-500">
              Move all products from a redundant or typo category into a target standard category. The source category will be deactivated or merged safely.
            </p>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Source Category (To be merged from) *
                </label>
                <select
                  required
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- Select Source Category --</option>
                  {categoriesData.allCategories?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Category (To be merged into) *
                </label>
                <select
                  required
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- Select Target Category --</option>
                  {categoriesData.allCategories?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMergeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={merging || !mergeSourceId || !mergeTargetId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {merging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Merge Categories</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toast && <NotificationToast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

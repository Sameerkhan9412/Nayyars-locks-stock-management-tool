'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { 
  Loader2, 
  Plus, 
  Minus,
  Edit2, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Package, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
  categoryId: string | { _id: string; name: string };
}

interface Product {
  _id: string;
  name: string;
  categoryId: Category;
  subcategoryId: SubCategory;
  stock: number;
  lowStockLimit: number;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Stock adjustment modal states
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'IN' | 'OUT'>('IN');
  const [stockQuantity, setStockQuantity] = useState('1');
  const [stockNote, setStockNote] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [lowStockLimit, setLowStockLimit] = useState('10');

  const [filteredSubcategories, setFilteredSubcategories] = useState<SubCategory[]>([]);

  const fetchFiltersData = async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/subcategories'),
      ]);
      const catResult = await catRes.json();
      const subResult = await subRes.json();
      setCategories(catResult.categories || []);
      setSubcategories(subResult.subcategories || []);
    } catch (e) {
      toast.error('Failed to load filters data');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (filterCategory) queryParams.set('categoryId', filterCategory);
      if (filterSubcategory) queryParams.set('subcategoryId', filterSubcategory);
      queryParams.set('page', page.toString());
      queryParams.set('limit', pageSize.toString());
      
      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (!res.ok) throw new Error();
      const result = await res.json();
      setProducts(result.products || []);
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages || 1);
        setTotalProducts(result.pagination.total || 0);
      }
    } catch (e) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, pageSize, search, filterCategory, filterSubcategory]);

  const openStockModal = (product: Product, type: 'IN' | 'OUT') => {
    setStockProduct(product);
    setStockType(type);
    setStockQuantity('1');
    setStockNote('');
    setIsStockOpen(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct) return;
    const qtyVal = parseInt(stockQuantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (stockType === 'OUT' && stockProduct.stock < qtyVal) {
      toast.error(`Insufficient stock. Available stock: ${stockProduct.stock}`);
      return;
    }

    setStockLoading(true);
    try {
      const res = await fetch(`/api/products/${stockProduct._id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stockType,
          quantity: qtyVal,
          note: stockNote.trim(),
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(stockType === 'IN' ? 'Stock added successfully.' : 'Stock removed successfully.');
        setIsStockOpen(false);
        fetchProducts();
      } else {
        toast.error(result.error || 'Failed to adjust stock.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = subcategories.filter((sub) => {
        const catId = typeof sub.categoryId === 'object' ? sub.categoryId._id : sub.categoryId;
        return catId === selectedCategoryId;
      });
      setFilteredSubcategories(filtered);
      if (selectedSubcategoryId && !filtered.some((sub) => sub._id === selectedSubcategoryId)) {
        setSelectedSubcategoryId('');
      }
    } else {
      setFilteredSubcategories([]);
      setSelectedSubcategoryId('');
    }
  }, [selectedCategoryId, subcategories]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Please select a category.');
      return;
    }
    const stockVal = parseInt(initialStock, 10);
    const limitVal = parseInt(lowStockLimit, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      toast.error('Initial stock must be a non-negative number.');
      return;
    }
    if (isNaN(limitVal) || limitVal < 0) {
      toast.error('Low stock limit must be a non-negative number.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          stock: stockVal,
          lowStockLimit: limitVal,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Product created successfully.');
        setIsAddOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast.error(result.error || 'Failed to create product.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;
    if (!productName.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Please select a category.');
      return;
    }
    const limitVal = parseInt(lowStockLimit, 10);
    if (isNaN(limitVal) || limitVal < 0) {
      toast.error('Low stock limit must be a non-negative number.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/products/${currentProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          lowStockLimit: limitVal,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Product updated successfully.');
        setIsEditOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast.error(result.error || 'Failed to update product.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentProduct) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/products/${currentProduct._id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Product deleted successfully.');
        setIsDeleteOpen(false);
        setCurrentProduct(null);
        fetchProducts();
      } else {
        toast.error(result.error || 'Failed to delete product.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setInitialStock('0');
    setLowStockLimit('10');
    setCurrentProduct(null);
  };

  const openAdd = () => {
    resetForm();
    if (categories.length > 0) {
      setSelectedCategoryId(categories[0]._id);
    }
    setIsAddOpen(true);
  };

  const openEdit = (product: Product) => {
    setCurrentProduct(product);
    setProductName(product.name);
    setSelectedCategoryId(product.categoryId?._id || '');
    setSelectedSubcategoryId(product.subcategoryId?._id || '');
    setLowStockLimit(product.lowStockLimit.toString());
    setIsEditOpen(true);
  };

  const openDelete = (product: Product) => {
    setCurrentProduct(product);
    setIsDeleteOpen(true);
  };

  return (
    <AppLayout title="Products">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-3xl">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-850 rounded-md text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-black border border-neutral-800 rounded-md px-2 py-1">
            <span className="text-[9px] text-neutral-500 uppercase font-bold px-1">Cat:</span>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubcategory('');
                setPage(1);
              }}
              className="bg-black border-0 text-xs text-neutral-200 focus:ring-0 focus:outline-hidden cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
            >
              <option value="" className="bg-black text-neutral-200">All</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-black text-neutral-200">{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-black border border-neutral-800 rounded-md px-2 py-1">
            <span className="text-[9px] text-neutral-500 uppercase font-bold px-1">Sub:</span>
            <select
              value={filterSubcategory}
              onChange={(e) => {
                setFilterSubcategory(e.target.value);
                setPage(1);
              }}
              className="bg-black border-0 text-xs text-neutral-200 focus:ring-0 focus:outline-hidden cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
            >
              <option value="" className="bg-black text-neutral-200">All</option>
              {subcategories
                .filter((sub) => {
                  if (!filterCategory) return true;
                  const catId = typeof sub.categoryId === 'object' ? sub.categoryId._id : sub.categoryId;
                  return catId === filterCategory;
                })
                .map((sub) => (
                  <option key={sub._id} value={sub._id} className="bg-black text-neutral-200">{sub.name}</option>
                ))}
            </select>
          </div>
        </div>

        <button
          onClick={openAdd}
          disabled={categories.length === 0 || subcategories.length === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-955 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {(categories.length === 0 || subcategories.length === 0) && !loading && (
        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-md text-xs">
          Please set up Category and Subcategory parameters before adding products.
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              No products found
            </h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-xs">
              Add your first product to start tracking inventory levels.
            </p>
            {categories.length > 0 && subcategories.length > 0 && (
              <button
                onClick={openAdd}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Subcategory</th>
                  <th className="py-3.5 px-6 text-right">Stock</th>
                  <th className="py-3.5 px-6 text-right">Limit</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className="hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-white">
                      {product.name}
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      {product.categoryId?.name ?? '-'}
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      {product.subcategoryId?.name ?? '-'}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-white">
                      {product.stock}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-neutral-400">
                      {product.lowStockLimit}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge
                        stock={product.stock}
                        lowStockLimit={product.lowStockLimit}
                      />
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => openStockModal(product, 'IN')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                        title="Add Stock"
                      >
                        <Plus className="w-3 h-3" />
                        Stock
                      </button>
                      <button
                        onClick={() => openStockModal(product, 'OUT')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-neutral-950 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                        title="Remove Stock"
                      >
                        <Minus className="w-3 h-3" />
                        Stock
                      </button>
                      <Link
                        href={`/products/${product._id}`}
                        className="inline-block px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(product)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && products.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-neutral-850 bg-neutral-900/50">
            <div className="text-xs text-neutral-400">
              Showing{' '}
              <span className="font-semibold text-white font-mono">
                {Math.min((page - 1) * pageSize + 1, totalProducts)}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-white font-mono">
                {Math.min(page * pageSize, totalProducts)}
              </span>{' '}
              of <span className="font-semibold text-white font-mono">{totalProducts}</span> products
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[10px] font-bold uppercase text-neutral-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-black text-neutral-200 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
                >
                  <option value={10} className="bg-black text-neutral-200">10</option>
                  <option value={20} className="bg-black text-neutral-200">20</option>
                  <option value={50} className="bg-black text-neutral-200">50</option>
                </select>
              </div>

              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-neutral-500 text-xs">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded transition-colors cursor-pointer ${
                            page === p
                              ? 'bg-amber-500 text-neutral-950'
                              : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Product"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Product Name
            </label>
            <input
              type="text"
              autoFocus
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. NL-101"
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              <option value="" disabled className="bg-black text-neutral-400">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-black text-neutral-200">{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Subcategory (Optional)
            </label>
            <select
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              disabled={!selectedCategoryId}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors disabled:opacity-50 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              <option value="" className="bg-black text-neutral-200">None / Optional</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub._id} value={sub._id} className="bg-black text-neutral-200">{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Low Stock Limit
              </label>
              <input
                type="number"
                min="0"
                value={lowStockLimit}
                onChange={(e) => setLowStockLimit(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Product
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Product Details"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Product Name
            </label>
            <input
              type="text"
              autoFocus
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. NL-101"
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-black text-neutral-200">{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Subcategory (Optional)
            </label>
            <select
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              disabled={!selectedCategoryId}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors disabled:opacity-50 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              <option value="" className="bg-black text-neutral-200">None / Optional</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub._id} value={sub._id} className="bg-black text-neutral-200">{sub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Low Stock Limit
            </label>
            <input
              type="number"
              min="0"
              value={lowStockLimit}
              onChange={(e) => setLowStockLimit(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Product Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-md text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div className="text-xs space-y-1">
              <p className="font-bold uppercase tracking-wider text-red-500">Warning</p>
              <p>
                Are you sure you want to delete product{' '}
                <strong className="text-white">"{currentProduct?.name}"</strong>?
              </p>
              <p className="text-neutral-400">
                This will delete the product and clear all its stock history records. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitLoading}
              onClick={handleDeleteSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        title={stockType === 'IN' ? `Add Stock - ${stockProduct?.name}` : `Remove Stock - ${stockProduct?.name}`}
      >
        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-md">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Current Available Stock
            </span>
            <span className="text-xl font-bold text-white">
              {stockProduct?.stock ?? 0} units
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              {stockType === 'IN' ? 'Quantity to Add' : 'Quantity to Remove'}
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={stockNote}
              onChange={(e) => setStockNote(e.target.value)}
              placeholder={stockType === 'IN' ? 'e.g. Shipment arrival, supplier restock' : 'e.g. Customer purchase, damaged inventory'}
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsStockOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stockLoading}
              className={`flex items-center gap-1.5 px-4 py-2 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
                stockType === 'IN' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {stockLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {stockType === 'IN' ? 'Confirm Add' : 'Confirm Remove'}
            </button>
          </div>
        </form>
      </Dialog>
    </AppLayout>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/components/ui/Toast';
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  CheckCircle,
  Package,
  Layers,
  AlertCircle
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

interface BulkRow {
  name: string;
  categoryId: string;
  subcategoryId: string;
  stock: string;
  lowStockLimit: string;
}

export default function BulkAddProductsPage() {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Global defaults to quickly apply to rows
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultSubcategory, setDefaultSubcategory] = useState('');

  const [rows, setRows] = useState<BulkRow[]>([
    { name: '', categoryId: '', subcategoryId: '', stock: '0', lowStockLimit: '10' },
    { name: '', categoryId: '', subcategoryId: '', stock: '0', lowStockLimit: '10' },
    { name: '', categoryId: '', subcategoryId: '', stock: '0', lowStockLimit: '10' },
  ]);

  const fetchFilters = async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/subcategories'),
      ]);
      const catData = await catRes.json();
      const subData = await subRes.json();
      const cats = catData.categories || [];
      const subs = subData.subcategories || [];
      setCategories(cats);
      setSubcategories(subs);

      if (cats.length > 0) {
        setDefaultCategory(cats[0]._id);
        setRows((prev) =>
          prev.map((r) => ({
            ...r,
            categoryId: r.categoryId || cats[0]._id,
          }))
        );
      }
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const addRow = (count = 1) => {
    const newRows: BulkRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        name: '',
        categoryId: defaultCategory || (categories[0]?._id ?? ''),
        subcategoryId: defaultSubcategory || '',
        stock: '0',
        lowStockLimit: '10',
      });
    }
    setRows((prev) => [...prev, ...newRows]);
  };

  const duplicateRow = (index: number) => {
    const target = rows[index];
    const newRow: BulkRow = {
      ...target,
      name: target.name ? `${target.name} (Copy)` : '',
    };
    setRows((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, newRow);
      return next;
    });
    toast.success('Row duplicated');
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error('You need at least one row');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof BulkRow, val: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === 'categoryId') {
        copy[index].subcategoryId = '';
      }
      return copy;
    });
  };

  const applyDefaultsToAll = () => {
    if (!defaultCategory) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        categoryId: defaultCategory,
        subcategoryId: defaultSubcategory,
      }))
    );
    toast.success('Applied category defaults to all rows');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate rows
    const validProducts = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      if (!r.name.trim()) {
        toast.error(`Row #${rowNum}: Product Name is required`);
        return;
      }
      if (!r.categoryId) {
        toast.error(`Row #${rowNum}: Category is required`);
        return;
      }
      const stockNum = parseInt(r.stock, 10);
      const limitNum = parseInt(r.lowStockLimit, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        toast.error(`Row #${rowNum}: Stock must be 0 or greater`);
        return;
      }
      if (isNaN(limitNum) || limitNum < 0) {
        toast.error(`Row #${rowNum}: Low Stock Limit must be 0 or greater`);
        return;
      }

      validProducts.push({
        name: r.name.trim(),
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId || null,
        stock: stockNum,
        lowStockLimit: limitNum,
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: validProducts }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully added ${data.createdCount} products!`);
        router.push('/products');
      } else {
        toast.error(data.error || 'Failed to create bulk products');
      }
    } catch (e) {
      toast.error('Network error while saving products');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Bulk Add Products">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Bulk Add Products">
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base font-bold text-white">Multi-Product Bulk Entry</h2>
            <p className="text-xs text-neutral-400">
              Add multiple new products to inventory in a single submission.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addRow(1)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold rounded-md border border-neutral-750 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            Add Row
          </button>
          <button
            type="button"
            onClick={() => addRow(5)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold rounded-md border border-neutral-750 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            Add 5 Rows
          </button>
        </div>
      </div>

      {/* Preset Autofill Bar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-md mb-6 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
          <Layers className="w-4 h-4 text-amber-500" />
          Batch Category Defaults:
        </div>

        <div className="flex items-center gap-2">
          <select
            value={defaultCategory}
            onChange={(e) => {
              setDefaultCategory(e.target.value);
              setDefaultSubcategory('');
            }}
            className="px-3 py-1.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs focus:outline-hidden focus:border-amber-500 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
          >
            <option value="" disabled className="bg-black text-neutral-500">
              Select Category
            </option>
            {categories.map((c) => (
              <option key={c._id} value={c._id} className="bg-black text-neutral-200">
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={defaultSubcategory}
            onChange={(e) => setDefaultSubcategory(e.target.value)}
            disabled={!defaultCategory}
            className="px-3 py-1.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs focus:outline-hidden focus:border-amber-500 disabled:opacity-50 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
          >
            <option value="" className="bg-black text-neutral-200">
              None / Optional Subcategory
            </option>
            {subcategories
              .filter((sub) => {
                const catId =
                  typeof sub.categoryId === 'object' ? sub.categoryId._id : sub.categoryId;
                return catId === defaultCategory;
              })
              .map((sub) => (
                <option key={sub._id} value={sub._id} className="bg-black text-neutral-200">
                  {sub.name}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={applyDefaultsToAll}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Apply to All Rows
          </button>
        </div>
      </div>

      {/* Main Table Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase bg-neutral-950/60 border-b border-neutral-850">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Product Name *</th>
                  <th className="py-3 px-4 min-w-[180px]">Category *</th>
                  <th className="py-3 px-4 min-w-[180px]">Subcategory</th>
                  <th className="py-3 px-4 w-28 text-right">Initial Stock</th>
                  <th className="py-3 px-4 w-28 text-right">Low Stock Limit</th>
                  <th className="py-3 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {rows.map((row, idx) => {
                  const filteredSubs = subcategories.filter((s) => {
                    const catId =
                      typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
                    return catId === row.categoryId;
                  });

                  return (
                    <tr key={idx} className="hover:bg-neutral-850/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-neutral-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          required
                          value={row.name}
                          onChange={(e) => updateRow(idx, 'name', e.target.value)}
                          placeholder="e.g. Mortise Lock Brass 65mm"
                          className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                        />
                      </td>

                      <td className="py-2.5 px-4">
                        <select
                          required
                          value={row.categoryId}
                          onChange={(e) => updateRow(idx, 'categoryId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
                        >
                          <option value="" disabled className="bg-black text-neutral-500">
                            Select Category
                          </option>
                          {categories.map((c) => (
                            <option key={c._id} value={c._id} className="bg-black text-neutral-200">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-4">
                        <select
                          value={row.subcategoryId}
                          onChange={(e) => updateRow(idx, 'subcategoryId', e.target.value)}
                          disabled={!row.categoryId}
                          className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500 disabled:opacity-50 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
                        >
                          <option value="" className="bg-black text-neutral-200">
                            None / Optional
                          </option>
                          {filteredSubs.map((s) => (
                            <option key={s._id} value={s._id} className="bg-black text-neutral-200">
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          min="0"
                          required
                          value={row.stock}
                          onChange={(e) => updateRow(idx, 'stock', e.target.value)}
                          className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs text-right font-mono text-white focus:outline-hidden focus:border-amber-500 transition-colors"
                        />
                      </td>

                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          min="0"
                          required
                          value={row.lowStockLimit}
                          onChange={(e) => updateRow(idx, 'lowStockLimit', e.target.value)}
                          className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs text-right font-mono text-white focus:outline-hidden focus:border-amber-500 transition-colors"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateRow(idx)}
                            className="p-1 text-neutral-400 hover:text-amber-500 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length <= 1}
                            className="p-1 text-neutral-400 hover:text-red-400 disabled:opacity-30 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-neutral-950/40 border-t border-neutral-850 flex items-center justify-between">
            <button
              type="button"
              onClick={() => addRow(1)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Another Product Row
            </button>
            <span className="text-xs text-neutral-400 font-mono">
              Total items to create: <strong className="text-white">{rows.length}</strong>
            </span>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/products"
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md border border-neutral-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Products...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Create {rows.length} Products
              </>
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { 
  Loader2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  categoryId: Category;
  subcategoryId: SubCategory;
  stock: number;
  lowStockLimit: number;
}

interface StockMovement {
  _id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy: { name: string };
  createdAt: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  const fetchProduct = async () => {
    if (!id || id === 'undefined') return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load product details.');
      }
      const result = await res.json();
      setProduct(result.product);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!id || id === 'undefined') return;
    try {
      const res = await fetch(`/api/stock-history?productId=${id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to load stock history.');
      }
      const result = await res.json();
      setHistory(result.history || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load stock history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchProduct();
      fetchHistory();
    }
  }, [id]);

  const handleStockAdjustment = async (type: 'IN' | 'OUT') => {
    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    
    if (type === 'OUT' && product && product.stock < qtyVal) {
      toast.error(`Insufficient stock. Available stock: ${product.stock}`);
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, quantity: qtyVal, note: note.trim() }),
      });
      const result = await res.json();
      
      if (res.ok) {
        toast.success(type === 'IN' ? 'Stock added successfully.' : 'Stock removed successfully.');
        setIsAddOpen(false);
        setIsRemoveOpen(false);
        setQuantity('1');
        setNote('');
        fetchProduct();
        fetchHistory();
      } else {
        toast.error(result.error || 'Failed to adjust stock.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Product Details">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout title="Product Details">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
            Product not found
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            The requested product details could not be retrieved.
          </p>
          <Link
            href="/products"
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold uppercase tracking-wider rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Product Details: ${product.name}`}>
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  {product.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1.5 font-medium">
                  <span>{product.categoryId?.name}</span>
                  <span className="text-neutral-700">/</span>
                  <span>{product.subcategoryId?.name}</span>
                </div>
              </div>
              <StatusBadge stock={product.stock} lowStockLimit={product.lowStockLimit} />
            </div>

            <div className="mb-8">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
                Current Stock Level
              </span>
              <span className="text-5xl font-black text-white">{product.stock}</span>
              <span className="text-xs text-neutral-400 block mt-2 font-medium">
                Low stock limit alert trigger:{' '}
                <strong className="text-neutral-200 font-mono font-bold">{product.lowStockLimit}</strong> units.
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-800 mt-6">
            <button
              onClick={() => {
                setQuantity('1');
                setNote('');
                setIsAddOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
            <button
              onClick={() => {
                setQuantity('1');
                setNote('');
                setIsRemoveOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider border border-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
              Remove Stock
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-250 pb-3 border-b border-neutral-800 mb-4">
            Stock Summary Information
          </h3>
          <ul className="space-y-4 text-xs text-neutral-400">
            <li className="flex justify-between">
              <span>Status</span>
              <span className="font-semibold text-neutral-200">
                {product.stock === 0 ? '🔴 Out of Stock' : product.stock <= product.lowStockLimit ? '🔴 Low Stock' : '🟢 In Stock'}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Total Available</span>
              <span className="font-semibold text-white font-mono">{product.stock} units</span>
            </li>
            <li className="flex justify-between">
              <span>Alert Threshold</span>
              <span className="font-semibold text-white font-mono">{product.lowStockLimit} units</span>
            </li>
            <li className="flex justify-between border-t border-neutral-800 pt-4">
              <span>Category</span>
              <span className="font-semibold text-white">{product.categoryId?.name}</span>
            </li>
            <li className="flex justify-between">
              <span>Subcategory</span>
              <span className="font-semibold text-white">{product.subcategoryId?.name}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200 pb-3 border-b border-neutral-800 mb-4">
          Product Stock History
        </h2>

        {historyLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-500">
            No stock movements recorded yet for this product.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Previous Stock</th>
                  <th className="py-3 px-4 text-right">New Stock</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {history.map((mov) => {
                  const isStockIn = mov.type === 'IN';
                  return (
                    <tr key={mov._id} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isStockIn 
                            ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/15' 
                            : 'bg-amber-500/10 text-amber-450 border border-amber-500/15'
                        }`}>
                          {isStockIn ? (
                            <TrendingUp className="w-3 h-3 text-emerald-450" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-amber-450" />
                          )}
                          {isStockIn ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isStockIn ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {isStockIn ? '+' : '-'}{mov.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-500">
                        {mov.previousStock}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-white">
                        {mov.newStock}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 max-w-[180px] truncate" title={mov.note || ''}>
                        {mov.note ? (
                          <span className="text-neutral-200">{mov.note}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 font-medium">
                        {mov.createdBy?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-neutral-450">
                        {new Date(mov.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Stock"
      >
        <div className="space-y-4">
          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-md">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Current Stock Level
            </span>
            <span className="text-xl font-bold text-white">{product.stock} units</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Quantity to Add
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Shipment arrival, supplier restock"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
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
              type="button"
              disabled={submitLoading}
              onClick={() => handleStockAdjustment('IN')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Add
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        title="Remove Stock"
      >
        <div className="space-y-4">
          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-md">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Current Available Stock
            </span>
            <span className="text-xl font-bold text-white">{product.stock} units</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Quantity to Remove
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer purchase, damaged inventory"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsRemoveOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitLoading}
              onClick={() => handleStockAdjustment('OUT')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Remove
            </button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}

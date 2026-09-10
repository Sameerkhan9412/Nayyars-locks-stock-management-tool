'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/components/ui/Toast';
import { Loader2, History, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface StockMovement {
  _id: string;
  productId: { _id: string; name: string };
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy: { name: string };
  createdAt: string;
}

export default function StockHistoryPage() {
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/stock-history');
      if (!res.ok) throw new Error();
      const result = await res.json();
      setHistory(result.history || []);
    } catch (e) {
      toast.error('Failed to load stock history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <AppLayout title="Stock History">
      <div className="mb-6">
        <p className="text-xs text-neutral-400">
          Timeline of all inventory additions and withdrawals.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <History className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              No stock movements yet
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              When stock is added or removed from any product, the history log will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6 text-right">Quantity</th>
                  <th className="py-3.5 px-6 text-right">Prev Stock</th>
                  <th className="py-3.5 px-6 text-right">New Stock</th>
                  <th className="py-3.5 px-6">Note</th>
                  <th className="py-3.5 px-6">Admin User</th>
                  <th className="py-3.5 px-6 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {history.map((mov) => {
                  const isStockIn = mov.type === 'IN';
                  return (
                    <tr
                      key={mov._id}
                      className="hover:bg-neutral-850/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        {mov.productId ? (
                          <Link
                            href={`/products/${mov.productId._id}`}
                            className="font-semibold text-white hover:text-amber-500 transition-colors hover:underline"
                          >
                            {mov.productId.name}
                          </Link>
                        ) : (
                          <span className="text-red-500 italic">Deleted Product</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
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
                      <td
                        className={`py-4 px-6 text-right font-mono font-bold ${
                          isStockIn ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isStockIn ? '+' : '-'}{mov.quantity}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-neutral-500">
                        {mov.previousStock}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-white">
                        {mov.newStock}
                      </td>
                      <td className="py-4 px-6 text-neutral-300 max-w-[200px] truncate" title={mov.note || ''}>
                        {mov.note ? (
                          <span className="text-neutral-200">{mov.note}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-neutral-300 font-medium">
                        {mov.createdBy?.name || '-'}
                      </td>
                      <td className="py-4 px-6 text-right text-neutral-450">
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
    </AppLayout>
  );
}

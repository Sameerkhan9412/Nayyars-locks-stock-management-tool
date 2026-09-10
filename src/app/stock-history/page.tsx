'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/components/ui/Toast';
import { Loader2, History, TrendingUp, TrendingDown, RefreshCw, Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface StockMovement {
  _id: string;
  productId?: { _id: string; name: string } | null;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy?: { name: string } | null;
  createdAt: string;
}

export default function StockHistoryPage() {
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const toast = useToast();

  const fetchHistory = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/stock-history', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to load stock history');
      }

      const result = await res.json();
      setHistory(result.history || []);
      if (isManualRefresh) {
        toast.success('Stock history refreshed.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to load stock history.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((mov) => {
      const matchesType = filterType === 'ALL' || mov.type === filterType;
      const productName = mov.productId?.name || 'Deleted Product';
      const adminName = mov.createdBy?.name || '';
      const noteText = mov.note || '';
      const query = search.trim().toLowerCase();
      
      const matchesSearch =
        query === '' ||
        productName.toLowerCase().includes(query) ||
        adminName.toLowerCase().includes(query) ||
        noteText.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [history, filterType, search]);

  return (
    <AppLayout title="Stock History">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-neutral-400">
            Timeline of all inventory additions and withdrawals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHistory(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh stock history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by product, note, or admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 p-1 border border-neutral-800 rounded-md">
          {(['ALL', 'IN', 'OUT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                filterType === type
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'IN' ? 'Stock In (+)' : 'Stock Out (-)'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              Error Loading Stock History
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-4">
              {error}
            </p>
            <button
              onClick={() => fetchHistory(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors cursor-pointer"
            >
              Try Again
            </button>
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
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Search className="w-10 h-10 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              No matching records
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              No stock movements matched your current filter and search query.
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
                {filteredHistory.map((mov) => {
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


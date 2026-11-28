'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/components/ui/Toast';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import {
  Loader2,
  ShoppingCart,
  RefreshCw,
  Search,
  AlertCircle,
  AlertTriangle,
  Download,
  CheckCircle,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface PlanRow {
  productId: string;
  name: string;
  category: string;
  subcategory: string;
  stock: number;
  lowStockLimit: number;
  pendingDemand: number;
  shortfall: number;
  bufferNeeded: number;
  suggestedOrder: number;
  customers: { name: string; qty: number }[];
}

interface Summary {
  productsToOrder: number;
  totalUnitsToOrder: number;
  productsWithCustomerShortage: number;
  unitsForCustomerOrders: number;
  openOrders: number;
}

type Filter = 'ALL' | 'CUSTOMER' | 'LOW';

export default function OrderPlannerPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [subcategory, setSubcategory] = useState('ALL');
  const toast = useToast();

  const fetchPlan = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/order-planner', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load order plan');
      setRows(data.rows || []);
      setSummary(data.summary || null);
      if (isManualRefresh) toast.success('Order plan refreshed.');
    } catch (e: any) {
      const msg = e?.message || 'Failed to load order plan';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Categories that actually have something to order, with product counts
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.category || 'Uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  // Subcategories (limited to the selected category) that have something to order
  const subcategoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (category !== 'ALL' && (r.category || 'Uncategorized') !== category) continue;
      const key = r.subcategory || 'No subcategory';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== 'ALL' && (r.category || 'Uncategorized') !== category) return false;
      if (subcategory !== 'ALL' && (r.subcategory || 'No subcategory') !== subcategory) return false;
      if (filter === 'CUSTOMER' && r.shortfall <= 0) return false;
      if (filter === 'LOW' && r.shortfall > 0) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.subcategory.toLowerCase().includes(q) ||
        r.customers.some((c) => c.name.toLowerCase().includes(q))
      );
    });
  }, [rows, filter, search, category, subcategory]);

  const { pageItems, paginationProps } = usePagination(filtered, [filter, search, category, subcategory], 20);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = [
      'Product',
      'Category',
      'Subcategory',
      'In Stock',
      'Pending Customer Demand',
      'Low Stock Limit',
      'Needed For Customer Orders',
      'Buffer To Stay Above Limit',
      'Total To Order',
      'Customers',
    ];
    const lines = filtered.map((r) =>
      [
        r.name,
        r.category,
        r.subcategory,
        r.stock,
        r.pendingDemand,
        r.lowStockLimit,
        r.shortfall,
        r.bufferNeeded,
        r.suggestedOrder,
        r.customers.map((c) => `${c.name} (${c.qty})`).join('; '),
      ]
        .map(esc)
        .join(',')
    );
    const blob = new Blob([[header.map(esc).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-plan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: 'Products To Order', value: summary?.productsToOrder ?? 0, tone: 'text-white' },
    { label: 'Total Units To Order', value: summary?.totalUnitsToOrder ?? 0, tone: 'text-amber-400' },
    {
      label: 'Short For Customer Orders',
      value: summary?.productsWithCustomerShortage ?? 0,
      tone: 'text-red-400',
      sub: `${summary?.unitsForCustomerOrders ?? 0} units`,
    },
    { label: 'Open Customer Orders', value: summary?.openOrders ?? 0, tone: 'text-neutral-200' },
  ];

  return (
    <AppLayout title="Order Planner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="text-xs text-neutral-400 max-w-2xl">
          Analyses all pending customer orders and current stock to show how much of each product you still need to
          order. <span className="text-neutral-300">To Order = pending customer demand + low-stock limit − stock in hand.</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Download this list as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchPlan(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-neutral-900 border border-neutral-800 rounded-md p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{c.label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${c.tone}`}>{c.value}</div>
            {c.sub && <div className="text-[11px] text-neutral-500 mt-0.5">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search product, category or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory('ALL');
          }}
          className="bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
          title="Filter by category"
        >
          <option value="ALL">All Categories ({rows.length})</option>
          {categoryOptions.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>

        <select
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          className="bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
          title="Filter by subcategory"
        >
          <option value="ALL">All Subcategories</option>
          {subcategoryOptions.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-neutral-900 p-1 border border-neutral-800 rounded-md">
          {(
            [
              ['ALL', 'All'],
              ['CUSTOMER', 'Customer Shortage'],
              ['LOW', 'Low Stock Only'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                filter === key ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
            <p className="text-xs text-neutral-400 max-w-sm mb-4">{error}</p>
            <button
              onClick={() => fetchPlan(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">Nothing to order</h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              Stock covers all pending customer orders and every product is above its low-stock limit.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Search className="w-10 h-10 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">No matching products</h3>
            <p className="text-xs text-neutral-500 max-w-xs">Nothing matched your filter and search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6 text-right">In Stock</th>
                  <th className="py-3.5 px-6 text-right">Customer Demand</th>
                  <th className="py-3.5 px-6 text-right">Low Limit</th>
                  <th className="py-3.5 px-6 text-right">To Order</th>
                  <th className="py-3.5 px-6">Why</th>
                  <th className="py-3.5 px-6">Waiting Customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {pageItems.map((r) => (
                  <tr key={r.productId} className="hover:bg-neutral-850/50 transition-colors">
                    <td className="py-4 px-6">
                      <Link
                        href={`/products/${r.productId}`}
                        className="font-semibold text-white hover:text-amber-500 transition-colors hover:underline"
                      >
                        {r.name}
                      </Link>
                      {(r.category || r.subcategory) && (
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          {[r.category, r.subcategory].filter(Boolean).join(' › ')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-white">{r.stock}</td>
                    <td className="py-4 px-6 text-right font-mono text-neutral-300">{r.pendingDemand}</td>
                    <td className="py-4 px-6 text-right font-mono text-neutral-500">{r.lowStockLimit}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-block px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 font-mono font-bold text-amber-400 text-sm">
                        {r.suggestedOrder}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        {r.shortfall > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            {r.shortfall} for customer orders
                          </span>
                        )}
                        {r.bufferNeeded > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                            <Package className="w-3 h-3" />
                            {r.bufferNeeded} to stay above low limit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-neutral-400 max-w-[240px]">
                      {r.customers.length === 0 ? (
                        <span className="text-neutral-600">—</span>
                      ) : (
                        <span
                          className="block truncate"
                          title={r.customers.map((c) => `${c.name} (${c.qty})`).join(', ')}
                        >
                          {r.customers.map((c) => `${c.name} (${c.qty})`).join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination {...paginationProps} label="products" pageSizeOptions={[20, 50, 100]} />
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-3">
        <ShoppingCart className="w-3 h-3" />
        Delivered and cancelled orders are ignored. Reload after restocking to see the updated plan.
      </p>
    </AppLayout>
  );
}

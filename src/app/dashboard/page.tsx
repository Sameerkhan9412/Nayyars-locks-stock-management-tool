'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { 
  FolderTree, 
  Layers, 
  Package, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  ClipboardList,
  Plus,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface CustomerShortage {
  requirementId: string;
  customerName: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  neededQuantity: number;
  currentStock: number;
  deficit: number;
  createdAt: string;
}

interface DashboardData {
  totalCategories: number;
  totalSubCategories: number;
  totalProducts: number;
  totalStock: number;
  availableStock?: number;
  totalFulfilledUnits?: number;
  totalGrossStock?: number;
  lowStockProducts: any[];
  pendingRequirementsCount: number;
  customerShortages: CustomerShortage[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Quick Restock modal state from dashboard
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<{ id: string; name: string; currentStock: number } | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockLoading, setRestockLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch (e) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openRestockModal = (productId: string, productName: string, currentStock: number, deficit: number) => {
    setRestockProduct({
      id: productId,
      name: productName,
      currentStock,
    });
    setRestockQty(deficit > 0 ? deficit.toString() : '20');
    setIsRestockOpen(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Restock quantity must be greater than 0');
      return;
    }

    setRestockLoading(true);
    try {
      const res = await fetch(`/api/products/${restockProduct.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'IN',
          quantity: qty,
          note: 'Restocked from dashboard shortage alert',
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        if (resData.fulfilledCount > 0) {
          toast.success(`Restocked ${qty} units! Auto-fulfilled ${resData.fulfilledCount} requirement(s).`);
        } else {
          toast.success(`Restocked ${qty} units of ${restockProduct.name}.`);
        }
        setIsRestockOpen(false);
        fetchDashboardData();
      } else {
        toast.error(resData.error || 'Failed to adjust stock');
      }
    } catch (e) {
      toast.error('Network error during restock');
    } finally {
      setRestockLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </AppLayout>
    );
  }

  const kpis = [
    {
      title: 'Total Categories',
      value: data?.totalCategories ?? 0,
      icon: FolderTree,
      color: 'text-neutral-400',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
    {
      title: 'Total Subcategories',
      value: data?.totalSubCategories ?? 0,
      icon: Layers,
      color: 'text-neutral-400',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
    {
      title: 'Total Products',
      value: data?.totalProducts ?? 0,
      icon: Package,
      color: 'text-neutral-400',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
    {
      title: 'Available Stock',
      value: data?.availableStock ?? data?.totalStock ?? 0,
      sublabel: 'Remaining in Warehouse',
      icon: Database,
      color: 'text-emerald-400',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
    {
      title: 'Fulfilled in Orders',
      value: data?.totalFulfilledUnits ?? 0,
      sublabel: 'Deducted for Customers',
      icon: CheckCircle2,
      color: 'text-amber-500',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
  ];

  const lowStockCount = data?.lowStockProducts.length ?? 0;
  const isLowStockAlert = lowStockCount > 0;

  const shortages = data?.customerShortages ?? [];
  const hasShortages = shortages.length > 0;

  return (
    <AppLayout title="Dashboard">
      {/* Top Banner / Stock Equation */}
      <div className="mb-6 p-4 rounded-md bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-neutral-300">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px] mr-1">Warehouse Net Stock:</span>
            Gross Received ({data?.totalGrossStock ?? 0}) - Fulfilled for Customers ({data?.totalFulfilledUnits ?? 0}) = <strong className="text-emerald-400 font-bold">{data?.availableStock ?? data?.totalStock ?? 0} units available in hand</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData()}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            href="/customer-requirements"
            className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider"
          >
            View Customer Orders &rarr;
          </Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-md border ${kpi.bgColor} ${kpi.borderColor} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <span className="text-xl font-bold text-white font-mono">{kpi.value}</span>
                {kpi.sublabel && (
                  <span className="block text-[9px] text-neutral-500 mt-0.5">{kpi.sublabel}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Low Stock KPI */}
        <div
          className={`p-4 rounded-md border flex flex-col justify-between ${
            isLowStockAlert
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isLowStockAlert ? 'text-amber-400 font-bold' : 'text-neutral-500'
              }`}
            >
              Low Stock
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                isLowStockAlert ? 'text-amber-500' : 'text-neutral-500'
              }`}
            />
          </div>
          <span
            className={`text-xl font-bold font-mono ${
              isLowStockAlert ? 'text-amber-400' : 'text-white'
            }`}
          >
            {lowStockCount}
          </span>
        </div>

        {/* Customer Shortages KPI */}
        <div
          className={`p-4 rounded-md border flex flex-col justify-between ${
            hasShortages
              ? 'bg-red-500/10 border-red-500/40 shadow-sm shadow-red-500/10'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                hasShortages ? 'text-red-400 font-bold' : 'text-neutral-500'
              }`}
            >
              Order Shortages
            </span>
            <ClipboardList
              className={`w-4 h-4 ${
                hasShortages ? 'text-red-500 animate-pulse' : 'text-neutral-500'
              }`}
            />
          </div>
          <span
            className={`text-xl font-bold font-mono ${
              hasShortages ? 'text-red-400' : 'text-white'
            }`}
          >
            {shortages.length}
          </span>
        </div>
      </div>

      {/* Customer Shortages Alert Section */}
      <div
        className={`rounded-md border p-6 mb-8 transition-colors ${
          hasShortages
            ? 'bg-neutral-900 border-red-500/30 shadow-md shadow-red-500/5'
            : 'bg-neutral-900 border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Customer Orders - Stock Shortages (Action Required)
            </h2>
            {hasShortages && (
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
                {shortages.length} Item{shortages.length > 1 ? 's' : ''} Needed
              </span>
            )}
          </div>

          <Link
            href="/customer-requirements"
            className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
          >
            View All Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!hasShortages ? (
          <div className="flex items-center gap-2.5 p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-md text-xs">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span>All customer requirements have sufficient inventory. No pending stock shortages.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850 bg-neutral-950/40">
                <tr>
                  <th className="py-3 px-4">Client / Customer</th>
                  <th className="py-3 px-4">Product Needed</th>
                  <th className="py-3 px-4 text-right">Requested</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  <th className="py-3 px-4 text-right">Deficit Needed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {shortages.map((item, idx) => (
                  <tr key={idx} className="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {item.customerName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-200">
                      {item.productName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {item.requestedQuantity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-300">
                      {item.currentStock}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                        Needs +{item.deficit > 0 ? item.deficit : item.neededQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          openRestockModal(
                            item.productId,
                            item.productName,
                            item.currentStock,
                            item.deficit > 0 ? item.deficit : item.neededQuantity
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Alert Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Low Stock Products
          </h2>
          {isLowStockAlert && (
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Attention Required
            </span>
          )}
        </div>

        {!isLowStockAlert ? (
          <div className="flex items-center gap-2.5 p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-md text-xs">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span>All products have sufficient stock.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subcategory</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4 text-right">Alert Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {data?.lowStockProducts.map((product) => (
                  <tr
                    key={product._id}
                    className="hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-white">
                      {product.name}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {product.categoryId?.name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {product.subcategoryId?.name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {product.stock}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-400">
                      {product.lowStockLimit}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        stock={product.stock}
                        lowStockLimit={product.lowStockLimit}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/products/${product._id}`}
                        className="inline-block px-3 py-1.5 bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Restock Dialog */}
      <Dialog
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        title={`Restock ${restockProduct?.name || 'Product'}`}
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-md text-xs space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Product:</span>
              <span className="font-bold text-white">{restockProduct?.name}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Current Stock:</span>
              <span className="font-bold font-mono text-white">{restockProduct?.currentStock}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Quantity to Add *
            </label>
            <input
              type="number"
              min="1"
              required
              autoFocus
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-200 font-mono focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <p className="text-[11px] text-amber-400/90 leading-normal">
            💡 Once restocked, the system will automatically fulfill the pending customer order and update the status to Fulfilled!
          </p>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={() => setIsRestockOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={restockLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {restockLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Restock
            </button>
          </div>
        </form>
      </Dialog>
    </AppLayout>
  );
}

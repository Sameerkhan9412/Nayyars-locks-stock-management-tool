'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { 
  FolderTree, 
  Layers, 
  Package, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  Loader2 
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalCategories: number;
  totalSubCategories: number;
  totalProducts: number;
  totalStock: number;
  lowStockProducts: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
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
      title: 'Total Stock',
      value: data?.totalStock ?? 0,
      icon: Database,
      color: 'text-neutral-400',
      bgColor: 'bg-neutral-900',
      borderColor: 'border-neutral-800',
    },
  ];

  const lowStockCount = data?.lowStockProducts.length ?? 0;
  const isLowStockAlert = lowStockCount > 0;

  return (
    <AppLayout title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-md border ${kpi.bgColor} ${kpi.borderColor} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <span className="text-xl font-bold text-white">{kpi.value}</span>
            </div>
          );
        })}

        <div
          className={`p-5 rounded-md border flex flex-col justify-between ${
            isLowStockAlert
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isLowStockAlert ? 'text-red-400 font-bold' : 'text-neutral-500'
              }`}
            >
              Low Stock
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                isLowStockAlert ? 'text-red-500' : 'text-neutral-500'
              }`}
            />
          </div>
          <span
            className={`text-xl font-bold ${
              isLowStockAlert ? 'text-red-400' : 'text-white'
            }`}
          >
            {lowStockCount}
          </span>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Low Stock Products
          </h2>
          {isLowStockAlert && (
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
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
    </AppLayout>
  );
}

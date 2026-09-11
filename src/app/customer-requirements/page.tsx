'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  ArrowUpRight,
  RefreshCw,
  Phone,
  FileText,
  User,
  AlertCircle,
  Truck,
  RotateCcw,
  PackageCheck 
} from 'lucide-react';

interface ProductOption {
  _id: string;
  name: string;
  stock: number;
  lowStockLimit: number;
}

interface RequirementItem {
  _id?: string;
  productId: ProductOption | { _id: string; name: string; stock?: number; lowStockLimit?: number };
  productName: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  status: 'FULFILLED' | 'PENDING_STOCK';
}

interface CustomerRequirement {
  _id: string;
  customerName: string;
  customerPhone?: string;
  note?: string;
  items: RequirementItem[];
  overallStatus: 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'PENDING_STOCK' | 'DELIVERED' | 'CANCELLED';
  deliveredAt?: string;
  createdBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

interface NewItemRow {
  productId: string;
  requestedQuantity: string;
}

export default function CustomerRequirementsPage() {
  const [requirements, setRequirements] = useState<CustomerRequirement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PENDING_STOCK' | 'FULFILLED' | 'DELIVERED' | 'ALL'>('ACTIVE');
  const [search, setSearch] = useState('');
  const toast = useToast();

  // Create Requirement Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [itemRows, setItemRows] = useState<NewItemRow[]>([
    { productId: '', requestedQuantity: '1' },
  ]);

  // Quick Restock Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<{ id: string; name: string; currentStock: number } | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockLoading, setRestockLoading] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<CustomerRequirement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRequirements = async () => {
    try {
      const res = await fetch('/api/customer-requirements', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequirements(data.requirements || []);
    } catch (e) {
      toast.error('Failed to load customer requirements');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=500', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      toast.error('Failed to load products list');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchRequirements(), fetchProducts()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddModal = () => {
    setCustomerName('');
    setCustomerPhone('');
    setOrderNote('');
    setItemRows([{ productId: products[0]?._id || '', requestedQuantity: '1' }]);
    setIsAddOpen(true);
  };

  const addItemRow = () => {
    setItemRows((prev) => [...prev, { productId: products[0]?._id || '', requestedQuantity: '1' }]);
  };

  const removeItemRow = (index: number) => {
    if (itemRows.length <= 1) {
      toast.error('At least one product item is required');
      return;
    }
    setItemRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof NewItemRow, value: string) => {
    setItemRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    for (let i = 0; i < itemRows.length; i++) {
      const row = itemRows[i];
      if (!row.productId) {
        toast.error(`Please select a product for item #${i + 1}`);
        return;
      }
      const qty = parseInt(row.requestedQuantity, 10);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Quantity for item #${i + 1} must be at least 1`);
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/customer-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          note: orderNote.trim(),
          items: itemRows.map((r) => ({
            productId: r.productId,
            requestedQuantity: parseInt(r.requestedQuantity, 10),
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Customer requirement added successfully');
        setIsAddOpen(false);
        await loadAll();
      } else {
        toast.error(data.error || 'Failed to create requirement');
      }
    } catch (e) {
      toast.error('Network error while saving requirement');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleManualFulfill = async (reqId: string) => {
    try {
      const res = await fetch(`/api/customer-requirements/${reqId}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (res.ok) {
        if (data.modified) {
          toast.success('Eligible items were fulfilled from stock!');
        } else {
          toast.error('Not enough stock available to fulfill pending items yet.');
        }
        await loadAll();
      } else {
        toast.error(data.error || 'Failed to update requirement');
      }
    } catch (e) {
      toast.error('Something went wrong');
    }
  };

  const handleMarkDelivered = async (reqId: string) => {
    try {
      const res = await fetch(`/api/customer-requirements/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_DELIVERED' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Order marked as Delivered to Client!');
        await loadAll();
      } else {
        toast.error(data.error || 'Failed to mark as delivered');
      }
    } catch (e) {
      toast.error('Something went wrong');
    }
  };

  const handleDeleteSubmit = async (restoreStock = false) => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customer-requirements/${deleteTarget._id}?restoreStock=${restoreStock}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        if (restoreStock) {
          toast.success('Order cancelled and stock restored to warehouse!');
        } else {
          toast.success('Order record deleted.');
        }
        setDeleteTarget(null);
        await loadAll();
      } else {
        toast.error(data.error || 'Failed to delete requirement');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openQuickRestock = (productId: string, productName: string, deficit: number) => {
    const prod = products.find((p) => p._id === productId);
    setRestockProduct({
      id: productId,
      name: productName,
      currentStock: prod ? prod.stock : 0,
    });
    setRestockQty(deficit > 0 ? deficit.toString() : '50');
    setIsRestockOpen(true);
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
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
          note: `Restocked to fulfill customer requirements`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.fulfilledCount > 0) {
          toast.success(`Restocked ${qty} units! Auto-fulfilled ${data.fulfilledCount} requirement(s).`);
        } else {
          toast.success(`Restocked ${qty} units of ${restockProduct.name}.`);
        }
        setIsRestockOpen(false);
        await loadAll();
      } else {
        toast.error(data.error || 'Failed to restock product');
      }
    } catch (e) {
      toast.error('Network error during restock');
    } finally {
      setRestockLoading(false);
    }
  };

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? req.overallStatus !== 'DELIVERED' && req.overallStatus !== 'CANCELLED'
          : statusFilter === 'PENDING_STOCK'
          ? req.overallStatus === 'PENDING_STOCK' || req.overallStatus === 'PARTIALLY_FULFILLED'
          : statusFilter === 'FULFILLED'
          ? req.overallStatus === 'FULFILLED'
          : req.overallStatus === 'DELIVERED';

      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        req.customerName.toLowerCase().includes(q) ||
        (req.customerPhone && req.customerPhone.toLowerCase().includes(q)) ||
        req.items.some((it) => it.productName.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [requirements, statusFilter, search]);

  // Summary counts
  const totalCount = requirements.length;
  const activeCount = requirements.filter((r) => r.overallStatus !== 'DELIVERED' && r.overallStatus !== 'CANCELLED').length;
  const shortageCount = requirements.filter((r) => r.overallStatus === 'PENDING_STOCK' || r.overallStatus === 'PARTIALLY_FULFILLED').length;
  const fulfilledCount = requirements.filter((r) => r.overallStatus === 'FULFILLED').length;
  const deliveredCount = requirements.filter((r) => r.overallStatus === 'DELIVERED').length;

  return (
    <AppLayout title="Customer Orders">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Total Customer Orders
            </span>
            <span className="text-2xl font-bold text-white font-mono">{totalCount}</span>
          </div>
          <Package className="w-6 h-6 text-neutral-500" />
        </div>

        <div
          className={`p-4 rounded-md border flex items-center justify-between transition-colors ${
            shortageCount > 0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  shortageCount > 0 ? 'text-red-400 font-bold' : 'text-neutral-500'
                }`}
              >
                Stock Shortage Orders
              </span>
              {shortageCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                  Needs Stock
                </span>
              )}
            </div>
            <span
              className={`text-2xl font-bold font-mono ${
                shortageCount > 0 ? 'text-red-400' : 'text-white'
              }`}
            >
              {shortageCount}
            </span>
          </div>
          <AlertTriangle
            className={`w-6 h-6 ${shortageCount > 0 ? 'text-red-500 animate-pulse' : 'text-neutral-500'}`}
          />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Fulfilled Orders
            </span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{fulfilledCount}</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-3xl">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, product..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-850 rounded-md text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-black border border-neutral-800 rounded-md p-1 flex-wrap">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Active Orders ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_STOCK')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'PENDING_STOCK'
                  ? 'bg-red-500 text-white font-bold'
                  : 'text-neutral-400 hover:text-red-400'
              }`}
            >
              {shortageCount > 0 && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />}
              Needs Stock ({shortageCount})
            </button>
            <button
              onClick={() => setStatusFilter('FULFILLED')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'FULFILLED'
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              Stock Ready ({fulfilledCount})
            </button>
            <button
              onClick={() => setStatusFilter('DELIVERED')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'DELIVERED'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'text-neutral-400 hover:text-blue-400'
              }`}
            >
              <Truck className="w-3 h-3" />
              Delivered ({deliveredCount})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-neutral-700 text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              All ({totalCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 rounded-md transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            disabled={products.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Requirement
          </button>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-neutral-900 border border-neutral-800 rounded-md">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-neutral-900 border border-neutral-800 rounded-md">
          <Package className="w-12 h-12 text-neutral-600 mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 mb-1">
            No Customer Requirements Found
          </h3>
          <p className="text-xs text-neutral-500 mb-4 max-w-sm">
            {search || statusFilter !== 'ALL'
              ? 'No orders match your selected filter criteria.'
              : 'Add customer product requirements to track orders and automatically reduce inventory stock.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
          >
            Add First Requirement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequirements.map((req) => {
            const isShortage = req.overallStatus !== 'FULFILLED';
            const allItemsFulfilled = req.overallStatus === 'FULFILLED';

            return (
              <div
                key={req._id}
                className={`rounded-md border transition-all ${
                  isShortage
                    ? 'bg-neutral-900 border-red-500/40 shadow-sm shadow-red-500/10'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-750'
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-850">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        isShortage
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {req.customerName.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{req.customerName}</h3>
                        {req.customerPhone && (
                          <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            {req.customerPhone}
                          </span>
                        )}
                        {req.overallStatus === 'DELIVERED' ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <Truck className="w-3 h-3" />
                            Delivered
                          </span>
                        ) : allItemsFulfilled ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Stock Ready
                          </span>
                        ) : req.overallStatus === 'PARTIALLY_FULFILLED' ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Partially Fulfilled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Stock Shortage
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1 flex-wrap">
                        <span>Ordered: {new Date(req.createdAt).toLocaleString()}</span>
                        {req.deliveredAt && (
                          <span className="text-blue-400 font-semibold">
                            • Delivered: {new Date(req.deliveredAt).toLocaleDateString()}
                          </span>
                        )}
                        {req.createdBy?.name && <span>• Admin: {req.createdBy.name}</span>}
                        {req.note && (
                          <span className="text-neutral-400 italic">
                            • &ldquo;{req.note}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Mark as Delivered Button */}
                    {req.overallStatus === 'FULFILLED' && (
                      <button
                        onClick={() => handleMarkDelivered(req._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-md transition-colors cursor-pointer"
                        title="Mark order as delivered to client"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Mark Delivered
                      </button>
                    )}

                    {isShortage && (
                      <button
                        onClick={() => handleManualFulfill(req._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold rounded-md border border-neutral-700 transition-colors cursor-pointer"
                        title="Check if available stock can fulfill this order now"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                        Check Stock
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteTarget(req)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] font-bold text-neutral-500 uppercase bg-neutral-950/40 border-b border-neutral-850">
                      <tr>
                        <th className="py-2.5 px-5">Requested Product</th>
                        <th className="py-2.5 px-5 text-right">Order Qty</th>
                        <th className="py-2.5 px-5 text-right">Deducted from Stock</th>
                        <th className="py-2.5 px-5 text-right">Available In-Hand Stock</th>
                        <th className="py-2.5 px-5">Order Status</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {req.items.map((item, idx) => {
                        const productObj: any = item.productId;
                        const currentLiveStock = productObj?.stock ?? 0;
                        const isItemFulfilled = item.status === 'FULFILLED';
                        const needed = item.requestedQuantity - (item.fulfilledQuantity || 0);
                        const deficit = Math.max(0, needed - currentLiveStock);

                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isItemFulfilled
                                ? 'hover:bg-neutral-850/30'
                                : 'bg-red-500/5 hover:bg-red-500/10'
                            }`}
                          >
                            <td className="py-3 px-5 font-semibold text-white">
                              {item.productName}
                            </td>

                            <td className="py-3 px-5 text-right font-mono font-bold text-neutral-200">
                              {item.requestedQuantity} units
                            </td>

                            <td className="py-3 px-5 text-right font-mono">
                              {isItemFulfilled ? (
                                <span className="inline-block font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px]">
                                  -{item.fulfilledQuantity} units
                                </span>
                              ) : (
                                <span className="text-neutral-500 text-[11px]">
                                  0 (Pending restock)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-5 text-right font-mono">
                              <span
                                className={`font-bold ${
                                  currentLiveStock === 0
                                    ? 'text-red-400'
                                    : currentLiveStock < needed
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {currentLiveStock} units in warehouse
                              </span>
                            </td>

                            <td className="py-3 px-5">
                              {isItemFulfilled ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Fulfilled & Deducted
                                </span>
                              ) : (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Shortage! Needs +{deficit > 0 ? deficit : needed} more
                                  </span>
                                  {currentLiveStock >= needed && (
                                    <span className="text-[10px] text-amber-400 font-semibold mt-1">
                                      Stock is now available! Click &quot;Check Stock&quot; to fulfill.
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-5 text-right">
                              {!isItemFulfilled && (
                                <button
                                  onClick={() =>
                                    openQuickRestock(
                                      productObj?._id || item.productId,
                                      item.productName,
                                      deficit > 0 ? deficit : needed
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Stock
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Customer Requirement Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="New Customer Requirement (Multi-Item Order)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Customer / Client Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma / Apex Traders"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Contact Phone (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Note / Reference (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="e.g. Project site delivery / urgent"
                className="w-full pl-9 pr-3 py-2 bg-neutral-955 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Products Table in Form */}
          <div className="border border-neutral-800 rounded-md p-3 bg-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Products Requested
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Product
              </button>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {itemRows.map((row, index) => {
                const selectedProduct = products.find((p) => p._id === row.productId);
                const reqQty = parseInt(row.requestedQuantity, 10) || 0;
                const hasEnoughStock = selectedProduct ? selectedProduct.stock >= reqQty : false;
                const deficit = selectedProduct ? Math.max(0, reqQty - selectedProduct.stock) : 0;

                return (
                  <div
                    key={index}
                    className="p-2.5 rounded-md border border-neutral-850 bg-neutral-900 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={row.productId}
                          onChange={(e) => updateItemRow(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs focus:outline-hidden focus:border-amber-500 [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
                        >
                          <option value="" disabled className="bg-black text-neutral-500">
                            Select Product
                          </option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id} className="bg-black text-neutral-200">
                              {p.name} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.requestedQuantity}
                          onChange={(e) => updateItemRow(index, 'requestedQuantity', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-3 py-2 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs text-right font-mono focus:outline-hidden focus:border-amber-500"
                        />
                      </div>

                      {itemRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-2 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {selectedProduct && (
                      <div className="p-2.5 rounded bg-black/70 border border-neutral-800 text-[11px] space-y-1 mt-1.5">
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Total In-Hand Stock Before Order:</span>
                          <span className="font-mono font-bold text-white">{selectedProduct.stock} units</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Quantity to Deduct for Customer:</span>
                          <span className="font-mono font-bold text-amber-400">-{reqQty} units</span>
                        </div>
                        <div className="border-t border-neutral-800 pt-1 flex items-center justify-between">
                          <span className="font-semibold text-neutral-300">Remaining In-Hand Stock After Order:</span>
                          {hasEnoughStock ? (
                            <span className="font-mono font-bold text-emerald-400">
                              {selectedProduct.stock - reqQty} units (Available)
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-red-400">
                              Shortage of {deficit} units (Won&apos;t deduct until restocked)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              Automatic Stock Handling
            </div>
            <p className="text-[11px] leading-relaxed">
              Items with sufficient stock will immediately be deducted from inventory. Items with a shortage
              will be flagged and automatically fulfilled once stock is added!
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-2">
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
              Save Requirement & Deduct Stock
            </button>
          </div>
        </form>
      </Dialog>

      {/* Quick Restock Modal */}
      <Dialog
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        title={`Add Stock for ${restockProduct?.name || 'Product'}`}
      >
        <form onSubmit={handleQuickRestockSubmit} className="space-y-4">
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
            💡 When you add stock, any pending customer orders waiting for this product will automatically be fulfilled and their UI status will update!
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Cancel or Delete Order"
      >
        {(() => {
          const hasDeductedStock = deleteTarget?.items.some((it) => (it.fulfilledQuantity || 0) > 0);
          return (
            <div className="space-y-4">
              <p className="text-xs text-neutral-300">
                You are managing the order entry for{' '}
                <strong className="text-white font-bold">{deleteTarget?.customerName}</strong>.
              </p>

              {hasDeductedStock ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs space-y-1.5 text-amber-300">
                  <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    Stock was deducted for this order!
                  </span>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    If this order is <strong>cancelled by the customer</strong>, choose <strong>Cancel & Restore Stock</strong> to return the items back to your warehouse inventory.
                    <br />
                    If the items were already <strong>delivered/dispatched</strong>, choose <strong>Delete Record Only</strong> to leave warehouse stock untouched.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  This order had zero deducted stock (it was still pending in shortage). Deleting will remove the requirement entry.
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                >
                  Close
                </button>

                {hasDeductedStock && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSubmit(true)}
                    disabled={deleteLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    title="Cancel order and add deducted quantity back to warehouse"
                  >
                    {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <RotateCcw className="w-3.5 h-3.5" />
                    Cancel & Restore Stock
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteSubmit(false)}
                  disabled={deleteLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete Record Only
                </button>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </AppLayout>
  );
}

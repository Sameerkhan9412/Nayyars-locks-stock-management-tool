'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export interface PickerProduct {
  _id: string;
  name: string;
  stock: number;
  lowStockLimit: number;
}

interface ProductPickerProps {
  value: PickerProduct | null;
  onChange: (product: PickerProduct | null) => void;
  placeholder?: string;
}

const RESULT_LIMIT = 20;

/**
 * Searchable product selector. Queries the server as the user types, so it
 * works with any number of products (no need to load them all up front).
 */
export default function ProductPicker({
  value,
  onChange,
  placeholder = 'Search product by name...',
}: ProductPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced server-side search whenever the dropdown is open
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(RESULT_LIMIT) });
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`/api/products?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setResults(data.products || []);
          setTotal(data.pagination?.total ?? (data.products || []).length);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (p: PickerProduct) => {
    onChange(p);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {value && !open ? (
        <div className="flex items-center justify-between gap-2 w-full px-3 py-2 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 text-left truncate cursor-pointer hover:text-amber-500"
            title="Click to change product"
          >
            {value.name} <span className="text-neutral-500">(Stock: {value.stock})</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-neutral-500 hover:text-red-400 cursor-pointer"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 bg-black text-neutral-200 border border-neutral-800 rounded-md text-xs placeholder-neutral-600 focus:outline-hidden focus:border-amber-500"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-amber-500" />
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-black border border-neutral-800 rounded-md shadow-xl">
          {results.length === 0 && !loading ? (
            <div className="px-3 py-3 text-xs text-neutral-500">No products found.</div>
          ) : (
            results.map((p) => (
              <button
                type="button"
                key={p._id}
                onClick={() => select(p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-850 cursor-pointer"
              >
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-neutral-500 flex-shrink-0">Stock: {p.stock}</span>
              </button>
            ))
          )}
          {total > results.length && (
            <div className="px-3 py-2 text-[10px] text-neutral-500 border-t border-neutral-850">
              Showing {results.length} of {total} products — keep typing to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

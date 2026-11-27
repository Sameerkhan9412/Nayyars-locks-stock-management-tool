'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function usePagination<T>(items: T[], resetKeys: unknown[] = [], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Go back to the first page whenever filters/search change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), resetKeys);

  // Clamp page if items shrink (e.g. after a delete)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    pageItems,
    paginationProps: {
      page,
      pageSize,
      total,
      totalPages,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
  pageSizeOptions?: number[];
}

export default function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  label = 'items',
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  if (total === 0) return null;

  const btn =
    'flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 text-xs font-semibold rounded transition-colors cursor-pointer';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-neutral-850 bg-neutral-900/50">
      <div className="text-xs text-neutral-400">
        Showing{' '}
        <span className="font-semibold text-white font-mono">
          {Math.min((page - 1) * pageSize + 1, total)}
        </span>{' '}
        to{' '}
        <span className="font-semibold text-white font-mono">
          {Math.min(page * pageSize, total)}
        </span>{' '}
        of <span className="font-semibold text-white font-mono">{total}</span> {label}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[10px] font-bold uppercase text-neutral-500">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-black text-neutral-200 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer [&>option]:bg-black [&>option]:text-neutral-200"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className={btn}>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
            .map((p, idx, arr) => {
              const prevP = arr[idx - 1];
              return (
                <React.Fragment key={p}>
                  {prevP && p - prevP > 1 && <span className="px-1 text-neutral-500 text-xs">...</span>}
                  <button
                    onClick={() => onPageChange(p)}
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
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={btn}
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

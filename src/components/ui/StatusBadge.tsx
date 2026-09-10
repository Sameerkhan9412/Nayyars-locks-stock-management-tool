import React from 'react';

interface StatusBadgeProps {
  stock: number;
  lowStockLimit: number;
}

export default function StatusBadge({ stock, lowStockLimit }: StatusBadgeProps) {
  let label = 'In Stock';
  let badgeClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let dotClass = 'bg-emerald-500';

  if (stock === 0) {
    label = 'Out of Stock';
    badgeClasses = 'bg-red-500/10 text-red-400 border-red-500/20';
    dotClass = 'bg-red-500';
  } else if (stock <= lowStockLimit) {
    label = 'Low Stock';
    badgeClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dotClass = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

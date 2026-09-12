'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList,
  FolderTree, 
  Layers, 
  Package, 
  History, 
  LogOut, 
  X 
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast.success('Logged out successfully');
        router.push('/login');
      } else {
        toast.error('Failed to logout');
      }
    } catch {
      toast.error('Network error while logging out');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customer Orders', href: '/customer-requirements', icon: ClipboardList },
    { name: 'Categories', href: '/categories', icon: FolderTree },
    { name: 'Subcategories', href: '/subcategories', icon: Layers },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Stock Movements', href: '/stock-history', icon: History },
  ];

  const LinkItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
          isActive
            ? 'bg-amber-500 text-neutral-950 font-bold'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
        }`}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
        <span>{item.name}</span>
      </Link>
    );
  };


  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-neutral-900 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#050505' }}
      >
        <div>
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-neutral-900">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex flex-col">
                <Image
                  src="/logo.png"
                  alt="Nayyar Locks Logo"
                  width={150}
                  height={49}
                  priority
                  className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
                <span className="text-[9px] text-amber-500/90 uppercase tracking-widest mt-1 font-bold">
                  Locks & Hardware
                </span>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="md:hidden text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-6">
            <div className="space-y-1">
              <LinkItem item={navItems[0]} />
              <LinkItem item={navItems[1]} />
            </div>

            <div className="space-y-2">
              <div className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Inventory
              </div>
              <div className="space-y-1">
                <LinkItem item={navItems[2]} />
                <LinkItem item={navItems[3]} />
                <LinkItem item={navItems[4]} />
              </div>
            </div>

            <div>
              <LinkItem item={navItems[5]} />
            </div>
          </nav>

        </div>

        <div className="p-4 border-t border-neutral-900">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-sm font-semibold text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

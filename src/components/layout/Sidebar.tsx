'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
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
        router.refresh();
      } else {
        toast.error('Logout failed');
      }
    } catch (e) {
      toast.error('Something went wrong');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Categories', href: '/categories', icon: FolderTree },
    { name: 'Sub Categories', href: '/subcategories', icon: Layers },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Stock History', href: '/stock-history', icon: History },
  ];

  const LinkItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
          isActive
            ? 'bg-neutral-900 text-amber-500 border-l-2 border-amber-500 font-semibold'
            : 'text-neutral-400 hover:bg-neutral-900/55 hover:text-neutral-250'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {item.name}
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
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-neutral-900">
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-widest text-white uppercase">
                NAYYARS
              </span>
              <div className="h-[2px] w-12 bg-amber-500 mt-1" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1.5 font-bold">
                Locks & Hardware
              </span>
            </div>

            <button
              onClick={onClose}
              className="md:hidden text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-6">
            <div>
              <LinkItem item={navItems[0]} />
            </div>

            <div className="space-y-2">
              <div className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Inventory
              </div>
              <div className="space-y-1">
                <LinkItem item={navItems[1]} />
                <LinkItem item={navItems[2]} />
                <LinkItem item={navItems[3]} />
              </div>
            </div>

            <div>
              <LinkItem item={navItems[4]} />
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

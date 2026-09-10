'use client';

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-neutral-950 border-b border-neutral-900">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-900 cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>

        <h1 className="text-sm font-bold text-white uppercase tracking-widest">
          {title}
        </h1>
      </div>

      {userName && (
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <div className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-500 font-bold uppercase">
            {userName.charAt(0)}
          </div>
          <span className="hidden sm:inline font-semibold">{userName}</span>
        </div>
      )}
    </header>
  );
}

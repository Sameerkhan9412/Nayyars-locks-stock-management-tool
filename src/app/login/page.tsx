'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations';
import { useToast } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success('Signed in successfully');
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error(json.error || 'Failed to sign in');
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-neutral-950">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.png"
            alt="NAYYARS Logo"
            width={200}
            height={66}
            priority
            className="h-12 w-auto object-contain mb-2.5"
          />
          <div className="h-[2px] w-20 bg-amber-500/60" />
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest mt-2 font-bold">
            Inventory Management System
          </span>
        </div>

        <h2 className="text-md font-bold uppercase tracking-wider text-neutral-200 text-center mb-6">
          Sign In to Your Account
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled={loading}
              {...register('email')}
              placeholder="name@company.com"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              disabled={loading}
              {...register('password')}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Login
          </button>
        </form>

      </div>
    </div>
  );
}

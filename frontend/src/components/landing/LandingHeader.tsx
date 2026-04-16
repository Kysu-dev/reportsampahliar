'use client';

import Link from 'next/link';
import { Leaf, LockKeyhole } from 'lucide-react';

type LandingNavKey = 'home' | 'monitor' | 'education' | 'about';

interface LandingHeaderProps {
  activeNav?: LandingNavKey;
}

const navItems = [
  { key: 'home' as const, label: 'Beranda', href: '/' },
  { key: 'monitor' as const, label: 'Pantau', href: '/#pantau' },
  { key: 'education' as const, label: 'Edukasi', href: '/edukasi' },
  { key: 'about' as const, label: 'Tentang Kami', href: '/#tentang-kami' },
];

export function LandingHeader({ activeNav = 'home' }: LandingHeaderProps) {
  return (
    <header className='sticky top-0 z-40 border-b border-emerald-100/80 bg-white/85 backdrop-blur-xl'>
      <div className='mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-4 py-4 sm:px-6'>
        <Link href='/' className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white'>
            <Leaf className='h-5 w-5' />
          </div>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700'>Platform</p>
            <p className='text-xl font-bold leading-none text-slate-900'>CleanTrack</p>
          </div>
        </Link>

        <div className='hidden items-center gap-8 md:flex'>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`relative text-sm font-medium transition-colors ${
                activeNav === item.key ? 'text-emerald-700' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {item.label}
              {activeNav === item.key && (
                <span className='absolute -bottom-3 left-0 h-[2px] w-full rounded-full bg-emerald-600' />
              )}
            </Link>
          ))}
        </div>

        <Link
          href='/admin/login'
          className='inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:from-emerald-100 hover:to-emerald-200'
        >
          Login Petugas
          <LockKeyhole className='h-4 w-4' />
        </Link>
      </div>
    </header>
  );
}

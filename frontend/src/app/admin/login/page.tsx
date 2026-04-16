'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { authService } from '@/lib/api';
import { toast, Toaster_ } from '@/components/ui/toaster';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.info('Lengkapi email dan password petugas');
      return;
    }

    setIsSubmitting(true);
    try {
      const loginResponse = await authService.login(email.trim(), password);
      const role = loginResponse.user?.role?.toLowerCase();

      if (role === 'admin') {
        toast.success('Login admin berhasil');
        router.push('/admin');
      } else {
        toast.success('Login petugas berhasil');
        router.push('/petugas');
      }
    } catch {
      toast.error('Login gagal', 'Periksa kembali email atau password petugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className='min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.2),transparent_32%),radial-gradient(circle_at_92%_6%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,#f3f8f4,#edf4f1_48%,#edf6f3)] px-4 py-8 sm:px-6'>
        <div className='mx-auto flex w-full max-w-md flex-col gap-4'>
          <Link href='/' className='inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800'>
            <ArrowRight className='h-4 w-4 rotate-180' />
            Kembali ke Beranda
          </Link>

          <section className='rounded-3xl bg-white/95 p-6 shadow-[0_30px_55px_-40px_rgba(8,47,34,0.8)] ring-1 ring-emerald-200 sm:p-8'>
            <div className='mb-6 space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700'>Akses Petugas</p>
              <h1 className='text-3xl font-black text-slate-900'>Login Petugas</h1>
              <p className='text-sm text-slate-600'>Masuk untuk memantau dan menindaklanjuti laporan CleanTrack.</p>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Email Petugas</label>
                <div className='relative'>
                  <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    type='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder='petugas@kampus.ac.id'
                    className='h-11 w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
                  />
                </div>
              </div>

              <div>
                <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Password</label>
                <div className='relative'>
                  <LockKeyhole className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    type='password'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder='Masukkan password'
                    className='h-11 w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
                  />
                </div>
              </div>

              <button
                type='submit'
                disabled={isSubmitting}
                className='inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-sm font-semibold text-white transition hover:from-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-75'
              >
                {isSubmitting ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </section>
        </div>
      </main>

      <Toaster_ />
    </>
  );
}

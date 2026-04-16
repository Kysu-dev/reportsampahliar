'use client';

import { type FormEvent, useState } from 'react';
import { CheckCircle2, SearchCheck, Users } from 'lucide-react';
import { reportService } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import CountUp from '@/components/CountUp';

interface HeroShowcaseProps {
  totalReports: number;
  activeWorkers: number;
  recentTrackingIds?: string[];
}

function toReadableStatus(status?: string) {
  if (status === 'done') return 'Selesai';
  if (status === 'in-progress') return 'Sedang Diproses';
  return 'Menunggu Verifikasi';
}

export function HeroShowcase({ totalReports, activeWorkers, recentTrackingIds = [] }: HeroShowcaseProps) {
  const [trackingCode, setTrackingCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trackingCode.trim()) {
      toast.info('Masukkan ID laporan terlebih dahulu');
      return;
    }

    setIsChecking(true);
    try {
      const report = await reportService.getReport(trackingCode.trim());
      const status = toReadableStatus(report?.status);
      toast.success(`Status laporan: ${status}`, report?.location || 'Lokasi tidak tersedia');
    } catch {
      toast.error('ID laporan tidak ditemukan', 'Pastikan ID yang kamu masukkan benar.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <section className='relative overflow-hidden px-4 py-10 sm:px-8 sm:py-12'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_85%_25%,rgba(21,128,61,0.16),transparent_35%),linear-gradient(115deg,rgba(16,185,129,0.12),rgba(248,252,250,0.6)_40%,rgba(255,255,255,0.95))]' />
      <div className='animate-float-slow pointer-events-none absolute right-[-160px] top-8 h-72 w-72 rounded-full border border-emerald-200/60' />
      <div className='animate-float-medium pointer-events-none absolute right-16 top-0 h-44 w-44 rounded-full border border-emerald-300/60' />

      <div className='relative grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-start'>
        <div className='space-y-7'>
          <div className='animate-rise-in max-w-2xl space-y-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700'>Respon Cepat Kampus</p>
            <h1 className='text-3xl font-black leading-tight text-slate-900 sm:text-5xl'>
              Wujudkan Itenas Bersih,
              <br />
              Mulai dari Laporanmu
            </h1>
            <p className='max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg'>
              Laporkan tumpukan sampah di sekitar kampus dengan alur yang jelas, validasi cepat, dan tindak lanjut
              transparan dari tim CleanTrack.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <article className='interactive-lift animate-rise-in-delay-1 rounded-2xl bg-white/95 p-4 shadow-[0_22px_38px_-28px_rgba(15,23,42,0.45)] ring-1 ring-emerald-100'>
              <div className='flex items-center gap-2 text-emerald-700'>
                <CheckCircle2 className='h-5 w-5' />
                <span className='text-sm font-semibold uppercase tracking-wide'>Laporan Selesai</span>
              </div>
              <p className='mt-3 text-4xl font-black text-slate-900'>
                <CountUp
                  from={0}
                  to={totalReports}
                  duration={1.8}
                  separator='.'
                />
                +
              </p>
              <p className='mt-1 text-sm text-slate-600'>Laporan terverifikasi dan ditindaklanjuti.</p>
            </article>

            <article className='interactive-lift animate-rise-in-delay-2 rounded-2xl bg-white/95 p-4 shadow-[0_22px_38px_-28px_rgba(15,23,42,0.45)] ring-1 ring-emerald-100'>
              <div className='flex items-center gap-2 text-emerald-700'>
                <Users className='h-5 w-5' />
                <span className='text-sm font-semibold uppercase tracking-wide'>Petugas Aktif</span>
              </div>
              <p className='mt-3 text-4xl font-black text-slate-900'>
                <CountUp
                  from={0}
                  to={activeWorkers}
                  duration={2}
                  delay={0.12}
                  separator='.'
                />
                +
              </p>
              <p className='mt-1 text-sm text-slate-600'>Tim lapangan dan verifikator yang siaga.</p>
            </article>
          </div>
        </div>

        <div className='animate-rise-in-delay-1 rounded-3xl bg-white/90 p-6 shadow-[0_30px_42px_-32px_rgba(12,74,57,0.58)] ring-1 ring-emerald-200 backdrop-blur'>
          <div className='mb-4 flex items-center gap-2 text-emerald-700'>
            <SearchCheck className='h-5 w-5' />
            <p className='text-xs font-semibold uppercase tracking-[0.24em]'>Pantau Cepat</p>
          </div>
          <h2 className='text-2xl font-bold text-slate-900'>Cek Status Laporan</h2>
          <p className='mt-1 text-sm text-slate-600'>Masukkan ID laporan yang kamu terima untuk melihat progress terbaru.</p>

          <form onSubmit={handleCheckStatus} className='mt-5 space-y-4'>
            <input
              type='text'
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              placeholder='Contoh: REP-2026-0142'
              className='h-11 w-full rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
            />
            <button
              type='submit'
              disabled={isChecking}
              className='h-11 w-full rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-sm font-semibold text-white transition hover:from-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-70'
            >
              {isChecking ? 'Mengecek...' : 'Cek Status'}
            </button>
          </form>

          {recentTrackingIds.length > 0 && (
            <div className='mt-4 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700'>ID Tersimpan di Browser Ini</p>
              <div className='flex flex-wrap gap-2'>
                {recentTrackingIds.map((id) => (
                  <button
                    key={id}
                    type='button'
                    onClick={() => setTrackingCode(id)}
                    className='rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100'
                  >
                    {id}
                  </button>
                ))}
              </div>
              <p className='text-[11px] text-slate-600'>Klik salah satu ID untuk isi otomatis kolom cek status.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Leaf, LocateFixed, ScanSearch, Truck, UserRoundPlus } from 'lucide-react';
import type { Report } from '@/types';

interface LandingRightRailProps {
  reports: Report[];
  isLoading?: boolean;
}

const stepCards = [
  {
    title: 'Lapor',
    description: 'Laporkan tumpukan sampah di sekitar kampus melalui form CleanTrack.',
    icon: UserRoundPlus,
  },
  {
    title: 'Verifikasi',
    description: 'Petugas memvalidasi titik dan tingkat urgensi laporan.',
    icon: ScanSearch,
  },
  {
    title: 'Eksekusi',
    description: 'Tim lapangan menangani laporan dan mengunggah update status.',
    icon: Truck,
  },
];

const fallbackNews = [
  {
    id: 'sample-1',
    title: 'Sortir sampah organik dan anorganik dari sumbernya',
    location: 'Kampus Itenas',
    image:
      'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'sample-2',
    title: 'Pengangkutan cepat di area parkir timur kampus',
    location: 'Area Parkir Timur',
    image:
      'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'sample-3',
    title: 'Aksi kolaboratif mahasiswa membersihkan titik rawan',
    location: 'Lapangan Utama',
    image:
      'https://images.unsplash.com/photo-1618477462146-050d2767eac4?auto=format&fit=crop&w=600&q=80',
  },
];

function toNewsData(reports: Report[]) {
  if (reports.length === 0) {
    return fallbackNews;
  }

  return [...reports]
    .sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    })
    .slice(0, 3)
    .map((report, index) => ({
      id: report.id,
      title: report.description,
      location: report.location,
      image:
        report.imageThumbnail ||
        report.imageUrl ||
        fallbackNews[index % fallbackNews.length].image,
    }));
}

export function LandingRightRail({ reports, isLoading = false }: LandingRightRailProps) {
  const newsData = toNewsData(reports);

  return (
    <aside className='bg-[#f7fbf8] px-4 py-8 sm:px-8'>
      <section id='pantau' className='space-y-6'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700'>Alur CleanTrack</p>
          <h2 className='mt-2 text-4xl font-black leading-tight text-slate-900'>Cara Kerja CleanTrack</h2>
        </div>

        <div className='grid gap-3 lg:grid-cols-3 xl:grid-cols-1'>
          {stepCards.map((step, index) => (
            <article key={step.title} className='interactive-lift rounded-2xl bg-white p-4 shadow-[0_20px_35px_-28px_rgba(11,28,48,0.58)] ring-1 ring-emerald-100'>
              <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <step.icon className='h-5 w-5' />
              </div>
              <p className='mt-3 text-2xl font-black text-slate-900'>{index + 1}. {step.title}</p>
              <p className='mt-2 text-sm leading-relaxed text-slate-600'>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id='edukasi' className='mt-10 space-y-5'>
        <div className='flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700'>Update Lapangan</p>
            <h3 className='mt-2 text-3xl font-black text-slate-900'>Sebaran Sampah Terkini</h3>
          </div>
          <Link
            href='/edukasi'
            className='rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-500 hover:to-green-600'
          >
            Lihat Semua
          </Link>
        </div>

        {isLoading ? (
          <div className='rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-emerald-100'>Memuat data laporan terbaru...</div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {newsData.map((item) => (
              <article key={item.id} className='interactive-lift overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-100'>
                <img src={item.image} alt={item.title} className='h-32 w-full object-cover' />
                <div className='space-y-2 p-4'>
                  <h4 className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.title}</h4>
                  <p className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'>
                    <LocateFixed className='h-3.5 w-3.5' />
                    {item.location}
                  </p>
                  <p className='text-xs font-medium text-emerald-700'>Baca Selengkapnya</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer id='tentang-kami' className='mt-12 rounded-3xl bg-white p-6 ring-1 ring-emerald-100'>
        <div className='grid gap-6 sm:grid-cols-2'>
          <div>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white'>
                <Leaf className='h-5 w-5' />
              </div>
              <span className='text-xl font-black text-slate-900'>CleanTrack</span>
            </div>
            <p className='mt-3 text-sm leading-relaxed text-slate-600'>
              Kampus Itenas, Jalan PHH Mustofa No. 23, Bandung. Platform kolaboratif pelaporan kebersihan lingkungan kampus.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4 text-sm text-slate-600'>
            <div>
              <p className='mb-2 font-semibold uppercase tracking-[0.16em] text-slate-900'>Quick Links</p>
              <div className='space-y-1'>
                <Link href='/' className='block hover:text-slate-900'>Beranda</Link>
                <Link href='/#pantau' className='block hover:text-slate-900'>Pantau</Link>
                <Link href='/edukasi' className='block hover:text-slate-900'>Edukasi</Link>
                <Link href='/#tentang-kami' className='block hover:text-slate-900'>Tentang Kami</Link>
              </div>
            </div>
            <div>
              <p className='mb-2 font-semibold uppercase tracking-[0.16em] text-slate-900'>Aksi</p>
              <div className='space-y-1'>
                <Link href='/#form-lapor' className='block hover:text-slate-900'>Buat Laporan</Link>
                <Link href='/edukasi' className='block hover:text-slate-900'>Baca Edukasi</Link>
                <a href='tel:+62000000000' className='block hover:text-slate-900'>+62 XXXX</a>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-6 border-t border-emerald-100 pt-4 text-xs text-slate-500'>
          Copyright CleanTrack 2026
        </div>
      </footer>
    </aside>
  );
}

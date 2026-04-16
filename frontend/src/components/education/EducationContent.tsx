import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  HandHelping,
  Leaf,
  Recycle,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Trash2,
} from 'lucide-react';

const learningPillars = [
  {
    title: 'Pilah dari Sumber',
    description:
      'Pisahkan organik, anorganik, dan residu sejak awal untuk menurunkan volume sampah campuran.',
    icon: Recycle,
    tone: 'from-emerald-500 to-green-700',
  },
  {
    title: 'Kurangi Sekali Pakai',
    description:
      'Gunakan tumbler, kotak makan, dan tas pakai ulang untuk menekan sampah plastik harian.',
    icon: Leaf,
    tone: 'from-teal-500 to-emerald-700',
  },
  {
    title: 'Lapor Secara Tepat',
    description:
      'Laporkan titik sampah dengan foto, lokasi jelas, dan deskripsi lengkap agar respons lebih cepat.',
    icon: ShieldCheck,
    tone: 'from-cyan-500 to-teal-700',
  },
];

const quickChecklist = [
  'Pisahkan sampah organik dan anorganik di kos/kelas.',
  'Hindari membuang sampah di area kosong belakang gedung.',
  'Pastikan kantong sampah tertutup sebelum dibawa ke TPS kampus.',
  'Laporkan titik baru maksimal 24 jam setelah ditemukan.',
  'Ajak minimal 1 teman dalam aksi bersih mingguan.',
  'Dokumentasikan sebelum dan sesudah saat aksi bersih.',
];

const weeklyPrograms = [
  {
    title: 'Senin Tanpa Plastik',
    summary: 'Bawa wadah makan dan minum sendiri selama aktivitas kampus.',
    time: 'Setiap Senin',
  },
  {
    title: 'Rabu Audit Sampah',
    summary: 'Catat 3 sumber sampah terbanyak di kelas atau organisasi.',
    time: 'Setiap Rabu',
  },
  {
    title: 'Jumat Bersih Area',
    summary: 'Aksi bersih bersama di titik rawan yang dipilih dari laporan minggu ini.',
    time: 'Setiap Jumat',
  },
];

const faqItems = [
  {
    question: 'Kapan saya harus melapor lewat CleanTrack?',
    answer:
      'Segera setelah menemukan titik sampah yang berpotensi mengganggu aktivitas, terutama jika menumpuk dan berulang.',
  },
  {
    question: 'Apa foto laporan wajib lebih dari satu?',
    answer:
      'Minimal satu foto sudah cukup, tetapi dua hingga tiga sudut foto akan mempercepat proses verifikasi lapangan.',
  },
  {
    question: 'Bagaimana jika lokasi tidak punya alamat jelas?',
    answer:
      'Gunakan fitur lokasi saat ini atau tulis patokan terdekat seperti nama gedung, parkiran, atau arah sisi kampus.',
  },
];

export function EducationContent() {
  return (
    <div className='grid gap-8 px-4 py-8 sm:px-8 sm:py-10'>
      <section className='rounded-3xl bg-[#f7fbf8] p-6 ring-1 ring-emerald-100 sm:p-8'>
        <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end'>
          <div className='space-y-5'>
            <p className='inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800'>
              <BookOpenCheck className='h-4 w-4' />
              Pusat Edukasi CleanTrack
            </p>
            <h1 className='max-w-3xl text-3xl font-black leading-tight text-slate-900 sm:text-5xl'>
              Belajar Kelola Sampah dengan
              <br />
              Cara Praktis dan Konsisten
            </h1>
            <p className='max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg'>
              Halaman ini disusun untuk bantu mahasiswa, staf, dan komunitas kampus membangun kebiasaan bersih dari
              langkah kecil yang berdampak nyata.
            </p>
          </div>

          <div className='space-y-3 rounded-2xl bg-white p-5 shadow-[0_22px_36px_-30px_rgba(15,23,42,0.52)] ring-1 ring-emerald-100'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700'>Fokus Minggu Ini</p>
            <p className='text-2xl font-black text-slate-900'>Kurangi Sampah Campuran</p>
            <p className='text-sm text-slate-600'>
              Targetkan minimal 60% sampah terpilah dari setiap kelas, organisasi, atau unit kegiatan.
            </p>
            <div className='flex flex-wrap gap-2 pt-2 text-xs font-semibold'>
              <span className='rounded-full bg-emerald-100 px-3 py-1 text-emerald-800'>Pilah Organik</span>
              <span className='rounded-full bg-teal-100 px-3 py-1 text-teal-800'>Minim Plastik</span>
              <span className='rounded-full bg-cyan-100 px-3 py-1 text-cyan-800'>Aksi Kolektif</span>
            </div>
          </div>
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700'>Materi Inti</p>
            <h2 className='mt-1 text-3xl font-black text-slate-900'>3 Pilar Edukasi</h2>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          {learningPillars.map((pillar) => (
            <article key={pillar.title} className='rounded-2xl bg-white p-5 ring-1 ring-emerald-100'>
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${pillar.tone} text-white`}>
                <pillar.icon className='h-5 w-5' />
              </div>
              <h3 className='text-lg font-bold text-slate-900'>{pillar.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-slate-600'>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <article className='rounded-2xl bg-white p-5 ring-1 ring-emerald-100'>
          <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'>
            <BadgeCheck className='h-4 w-4' />
            Checklist Harian
          </p>
          <h3 className='mt-2 text-2xl font-black text-slate-900'>Rutinitas Kecil, Dampak Besar</h3>
          <div className='mt-4 grid gap-2 sm:grid-cols-2'>
            {quickChecklist.map((item) => (
              <p key={item} className='inline-flex items-start gap-2 rounded-xl bg-[#f7fbf8] px-3 py-2 text-sm text-slate-700'>
                <Sparkles className='mt-0.5 h-4 w-4 shrink-0 text-emerald-700' />
                {item}
              </p>
            ))}
          </div>
        </article>

        <article className='rounded-2xl bg-white p-5 ring-1 ring-emerald-100'>
          <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'>
            <TimerReset className='h-4 w-4' />
            Program Mingguan
          </p>
          <div className='mt-4 space-y-3'>
            {weeklyPrograms.map((program) => (
              <div key={program.title} className='rounded-xl bg-[#f7fbf8] p-3'>
                <p className='text-sm font-semibold text-slate-900'>{program.title}</p>
                <p className='mt-1 text-sm text-slate-600'>{program.summary}</p>
                <p className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700'>
                  <CalendarClock className='h-3.5 w-3.5' />
                  {program.time}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className='grid gap-4 lg:grid-cols-[0.9fr_1.1fr]'>
        <article className='rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 p-6 text-white'>
          <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100'>
            <HandHelping className='h-4 w-4' />
            Ajak Komunitas
          </p>
          <h3 className='mt-3 text-2xl font-black leading-tight'>Bangun budaya bersih yang saling menular di kampus.</h3>
          <p className='mt-2 text-sm text-emerald-100'>
            Mulai dari satu kelas atau satu himpunan, lalu replikasi pola yang berhasil ke titik lain.
          </p>
          <div className='mt-5 flex flex-wrap gap-2 text-xs font-semibold'>
            <span className='rounded-full bg-white/20 px-3 py-1'>Kolaboratif</span>
            <span className='rounded-full bg-white/20 px-3 py-1'>Terukur</span>
            <span className='rounded-full bg-white/20 px-3 py-1'>Berkelanjutan</span>
          </div>
        </article>

        <article className='rounded-2xl bg-white p-5 ring-1 ring-emerald-100'>
          <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'>
            <Trash2 className='h-4 w-4' />
            Tanya Jawab
          </p>
          <div className='mt-3 space-y-2'>
            {faqItems.map((faq) => (
              <details key={faq.question} className='rounded-xl bg-[#f7fbf8] p-3'>
                <summary className='cursor-pointer text-sm font-semibold text-slate-900'>{faq.question}</summary>
                <p className='mt-2 text-sm leading-relaxed text-slate-600'>{faq.answer}</p>
              </details>
            ))}
          </div>
        </article>
      </section>

      <section className='rounded-3xl bg-[#f7fbf8] p-6 ring-1 ring-emerald-100 sm:p-8'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700'>Lanjutkan Aksi</p>
            <h3 className='mt-1 text-2xl font-black text-slate-900'>Sudah paham? Sekarang saatnya bergerak.</h3>
            <p className='mt-2 text-sm text-slate-600'>
              Terapkan panduan edukasi, lalu gunakan form CleanTrack untuk laporan lapangan terbaru.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Link
              href='/'
              className='inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'
            >
              Kembali ke Beranda
            </Link>
            <Link
              href='/#pantau'
              className='inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-500 hover:to-green-600'
            >
              Buka Alur Laporan
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

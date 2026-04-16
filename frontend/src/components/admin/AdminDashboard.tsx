'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  MapPin,
  Menu,
  Search,
  Settings,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ReportsDataTable, type DashboardReport } from '@/components/admin/ReportsDataTable';
import { Toaster_, toast } from '@/components/ui/toaster';
import { authService, reportService } from '@/lib/api';
import type { Report } from '@/types';

type AdminNavKey = 'overview' | 'reports' | 'officers' | 'maps';

const navItems: Array<{
  key: AdminNavKey;
  label: string;
  icon: LucideIcon;
}> = [
  { key: 'overview', label: 'Ikhtisar', icon: LayoutDashboard },
  { key: 'reports', label: 'Kelola Laporan', icon: ClipboardList },
  { key: 'officers', label: 'Daftar Petugas', icon: Users },
  { key: 'maps', label: 'Peta Operasional', icon: Map },
];

const topbarTitle: Record<AdminNavKey, string> = {
  overview: 'Ikhtisar Dashboard',
  reports: 'Manajemen Laporan',
  officers: 'Daftar Petugas',
  maps: 'Peta Operasional',
};

const phoneFieldCandidates = [
  'reporterPhone',
  'whatsappNumber',
  'whatsapp',
  'phoneNumber',
  'phone',
  'nomorWA',
  'noWa',
  'noWA',
] as const;

function extractReporterPhone(report: Report): string {
  const reportRecord = report as unknown as Record<string, unknown>;

  for (const key of phoneFieldCandidates) {
    const value = reportRecord[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '-';
}

function buildTrend(baseValue: number, offset: number) {
  const safeBase = Math.max(baseValue, 4);
  const multipliers = [0.56, 0.68, 0.62, 0.78, 0.74, 0.84, 0.79, 0.94];

  return multipliers.map((multiplier, index) => {
    const cadenceOffset = index % 2 === 0 ? 0 : 1;
    return Math.max(1, Math.round(safeBase * multiplier + offset + cadenceOffset));
  });
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const safeValues = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = Math.max(max - min, 1);

  const points = safeValues
    .map((value, index) => {
      const x = (index / (safeValues.length - 1)) * 100;
      const y = 36 - ((value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox='0 0 100 36' className='h-10 w-full'>
      <polyline points={points} fill='none' stroke={color} strokeWidth={2.8} strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

interface SidebarContentProps {
  activeNav: AdminNavKey;
  onNavigate: (next: AdminNavKey) => void;
  onLogout: () => Promise<void>;
  onCloseMobile?: () => void;
}

function SidebarContent({ activeNav, onNavigate, onLogout, onCloseMobile }: SidebarContentProps) {
  return (
    <>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white'>
            <Leaf className='h-5 w-5' />
            <MapPin className='absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white p-[1px] text-emerald-700' />
          </div>

          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300'>Platform</p>
            <p className='text-lg font-black text-slate-900 dark:text-slate-100'>CleanTrack</p>
          </div>
        </div>

        {onCloseMobile ? (
          <button
            onClick={onCloseMobile}
            className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300'
            aria-label='Tutup menu'
          >
            <X className='h-4 w-4' />
          </button>
        ) : null}
      </div>

      <nav className='mt-8 space-y-2'>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeNav;

          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                onCloseMobile?.();
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                active
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Icon className='h-4 w-4' />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className='mt-auto space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800'>
        <button className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'>
          <Settings className='h-4 w-4' />
          Pengaturan
        </button>

        <button
          onClick={() => {
            onCloseMobile?.();
            void onLogout();
          }}
          className='flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-300 dark:hover:bg-rose-900/35'
        >
          <LogOut className='h-4 w-4' />
          Keluar
        </button>
      </div>
    </>
  );
}

export function AdminDashboard() {
  const router = useRouter();

  const [activeNav, setActiveNav] = useState<AdminNavKey>('reports');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);

    try {
      const data = await reportService.getReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
      toast.error('Gagal memuat laporan', 'Pastikan backend aktif lalu refresh data dashboard.');
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/admin/login');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadReports();
    }
  }, [isAuthenticated, loadReports]);

  const handleUpdateStatus = useCallback(
    async (reportId: string, nextStatus: Report['status'], note: string) => {
      try {
        const updatedReport = await reportService.updateReportStatus(reportId, nextStatus, note);
        setReports((currentReports) =>
          currentReports.map((report) => (report.id === reportId ? { ...report, ...updatedReport } : report))
        );
        toast.success('Status laporan diperbarui');
      } catch (error) {
        toast.error('Update status gagal', 'Silakan coba kembali beberapa saat lagi.');
        throw error;
      }
    },
    []
  );

  const handleDeleteReport = useCallback(async (reportId: string) => {
    try {
      await reportService.deleteReport(reportId);
      setReports((currentReports) => currentReports.filter((report) => report.id !== reportId));
      toast.success('Laporan berhasil dihapus');
    } catch (error) {
      toast.error('Hapus laporan gagal', 'Periksa izin akun atau endpoint backend Anda.');
      throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    toast.info('Sesi admin telah diakhiri');
    router.push('/admin/login');
  }, [router]);

  const tableReports = useMemo<DashboardReport[]>(
    () =>
      reports.map((report) => ({
        ...report,
        reporterPhone: extractReporterPhone(report),
      })),
    [reports]
  );

  const summaryCards = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length;
    const inProgress = reports.filter((report) => report.status === 'in-progress').length;
    const done = reports.filter((report) => report.status === 'done').length;

    return [
      {
        key: 'total',
        title: 'Total Laporan',
        value: reports.length,
        subtitle: 'Akumulasi semua laporan masuk',
        icon: Search,
        iconClass:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
        lineColor: '#475569',
        trend: buildTrend(reports.length, 1),
      },
      {
        key: 'pending',
        title: 'Menunggu Verifikasi',
        value: pending,
        subtitle: 'Prioritas untuk diproses',
        icon: AlertCircle,
        iconClass:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        lineColor: '#d97706',
        trend: buildTrend(pending, 0),
      },
      {
        key: 'in-progress',
        title: 'Sedang Diproses',
        value: inProgress,
        subtitle: 'Dalam penanganan tim lapangan',
        icon: Truck,
        iconClass:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
        lineColor: '#0284c7',
        trend: buildTrend(inProgress, 1),
      },
      {
        key: 'done',
        title: 'Selesai Dibersihkan',
        value: done,
        subtitle: 'Laporan telah tuntas',
        icon: CheckCircle2,
        iconClass:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        lineColor: '#059669',
        trend: buildTrend(done, 2),
      },
    ];
  }, [reports]);

  if (!isAuthenticated) {
    return <div className='min-h-screen bg-[#F8FAFC] dark:bg-slate-950' />;
  }

  const showReportsModule = activeNav === 'overview' || activeNav === 'reports';

  return (
    <>
      <main className='min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
        <div className='relative flex min-h-screen'>
          <aside className='sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white/95 p-4 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950/85'>
            <SidebarContent activeNav={activeNav} onNavigate={setActiveNav} onLogout={handleLogout} />
          </aside>

          {mobileSidebarOpen ? (
            <>
              <button
                className='fixed inset-0 z-40 bg-slate-900/55 lg:hidden'
                onClick={() => setMobileSidebarOpen(false)}
                aria-label='Tutup sidebar'
              />

              <aside className='fixed inset-y-0 left-0 z-50 w-[82%] max-w-xs border-r border-slate-200 bg-white p-4 lg:hidden dark:border-slate-800 dark:bg-slate-950'>
                <SidebarContent
                  activeNav={activeNav}
                  onNavigate={setActiveNav}
                  onLogout={handleLogout}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                />
              </aside>
            </>
          ) : null}

          <div className='flex min-w-0 flex-1 flex-col'>
            <header className='sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85'>
              <div className='flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8'>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300'
                    aria-label='Buka sidebar'
                  >
                    <Menu className='h-5 w-5' />
                  </button>

                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-700 dark:text-emerald-300'>Dashboard CleanTrack</p>
                    <h1 className='text-xl font-black text-slate-900 dark:text-slate-100'>{topbarTitle[activeNav]}</h1>
                  </div>
                </div>

                <div className='flex items-center gap-2 sm:gap-4'>
                  <button className='relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300'>
                    <Bell className='h-4 w-4' />
                    <span className='absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500' />
                  </button>

                  <div className='hidden text-right sm:block'>
                    <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>Admin Rael</p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>Petugas Operasional</p>
                  </div>

                  <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-sm font-bold text-white'>
                    AR
                  </div>
                </div>
              </div>
            </header>

            <section className='flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8'>
              {showReportsModule ? (
                <>
                  <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                    {summaryCards.map((card) => {
                      const Icon = card.icon;

                      return (
                        <article
                          key={card.key}
                          className='rounded-xl border border-slate-200 bg-white p-5 shadow-[0_20px_36px_-30px_rgba(11,28,48,0.45)] dark:border-slate-800 dark:bg-slate-900'
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'>
                                {card.title}
                              </p>
                              <p className='mt-2 text-3xl font-black text-slate-900 dark:text-slate-100'>
                                {isLoadingReports ? '...' : card.value.toLocaleString('id-ID')}
                              </p>
                              <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{card.subtitle}</p>
                            </div>

                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.iconClass}`}>
                              <Icon className='h-5 w-5' />
                            </div>
                          </div>

                          <div className='mt-4 rounded-xl bg-slate-50 px-2 py-1 dark:bg-slate-950'>
                            <Sparkline values={card.trend} color={card.lineColor} />
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className='space-y-3'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <h2 className='text-2xl font-black text-slate-900 dark:text-slate-100'>Daftar Laporan</h2>
                        <p className='text-sm text-slate-500 dark:text-slate-400'>
                          Pantau laporan CleanTrack, lihat foto, update status, atau hapus laporan duplikat.
                        </p>
                      </div>

                      <button
                        onClick={() => void loadReports()}
                        className='inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                      >
                        Refresh Data
                      </button>
                    </div>

                    <ReportsDataTable
                      reports={tableReports}
                      loading={isLoadingReports}
                      onUpdateStatus={handleUpdateStatus}
                      onDeleteReport={handleDeleteReport}
                    />
                  </div>
                </>
              ) : (
                <div className='rounded-xl border border-slate-200 bg-white p-8 shadow-[0_20px_36px_-30px_rgba(11,28,48,0.45)] dark:border-slate-800 dark:bg-slate-900'>
                  <h2 className='text-2xl font-black text-slate-900 dark:text-slate-100'>{topbarTitle[activeNav]}</h2>
                  <p className='mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400'>
                    Modul ini sedang dipersiapkan. Sementara itu, gunakan menu Kelola Laporan untuk workflow utama petugas.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Toaster_ />
    </>
  );
}

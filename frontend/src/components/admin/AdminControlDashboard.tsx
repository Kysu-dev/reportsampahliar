'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
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
  Pencil,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  AdminReportsManagementTable,
  type AdminDashboardReport,
  type WasteCategory,
} from '@/components/admin/AdminReportsManagementTable';
import { Toaster_, toast } from '@/components/ui/toaster';
import { authService, officerService, reportService } from '@/lib/api';
import type { Officer, Report } from '@/types';

const AdminOperationalMap = dynamic(
  () => import('@/components/admin/AdminOperationalMap').then((module) => module.AdminOperationalMap),
  {
    ssr: false,
  }
);

type AdminNavKey = 'ringkasan' | 'laporan' | 'peta' | 'petugas' | 'aktivitas';

const navItems: Array<{ key: AdminNavKey; label: string; icon: LucideIcon }> = [
  { key: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'laporan', label: 'Laporan Masuk', icon: ClipboardList },
  { key: 'peta', label: 'Peta Operasional', icon: Map },
  { key: 'petugas', label: 'Manajemen Petugas', icon: Users },
  { key: 'aktivitas', label: 'Log Aktivitas', icon: History },
];

const navTitles: Record<AdminNavKey, string> = {
  ringkasan: 'Ringkasan Operasional',
  laporan: 'Daftar Laporan',
  peta: 'Peta Operasional',
  petugas: 'Manajemen Petugas',
  aktivitas: 'Log Aktivitas',
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

const categoryFieldCandidates = ['category', 'wasteCategory', 'wasteType', 'jenisSampah', 'jenis'] as const;
const mapLabelFieldCandidates = ['address', 'alamat', 'locationLabel', 'shortLocation', 'location', 'lokasi'] as const;

function pickString(report: Report, keys: readonly string[]): string | null {
  const reportRecord = report as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = reportRecord[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function pickNumber(report: Report, keys: readonly string[]): number | null {
  const reportRecord = report as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = reportRecord[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function extractReporterPhone(report: Report): string {
  const phone = pickString(report, phoneFieldCandidates);
  return phone ?? '-';
}

function normalizeWhatsappNumber(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return null;
  }

  if (digitsOnly.startsWith('62')) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith('0')) {
    return `62${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

function buildWhatsappLink(phone: string, displayId: string): string | null {
  const normalized = normalizeWhatsappNumber(phone);
  if (!normalized) {
    return null;
  }

  const message = encodeURIComponent(`Halo, kami dari Admin CleanTrack terkait laporan ${displayId}.`);
  return `https://wa.me/${normalized}?text=${message}`;
}

function formatDisplayId(report: Report, index: number): string {
  if (report.id.toUpperCase().startsWith('SB-')) {
    return report.id;
  }

  const createdYear = new Date(report.createdAt).getFullYear();
  const safeYear = Number.isNaN(createdYear) ? new Date().getFullYear() : createdYear;
  return `SB-${safeYear}-${String(index + 1).padStart(3, '0')}`;
}

function resolveWasteCategory(report: Report): WasteCategory {
  const explicitCategory = pickString(report, categoryFieldCandidates);
  const combinedHints = `${explicitCategory ?? ''} ${report.description} ${report.location}`.toLowerCase();

  const organicKeywords = ['organik', 'daun', 'sisa makanan', 'kompos', 'ranting', 'buah'];
  if (organicKeywords.some((keyword) => combinedHints.includes(keyword))) {
    return 'organik';
  }

  return 'anorganik';
}

function resolveMapsData(report: Report): { mapsQuery: string; mapsLabel: string } {
  const latitude = pickNumber(report, ['latitude', 'lat']);
  const longitude = pickNumber(report, ['longitude', 'lng', 'long']);

  if (latitude !== null && longitude !== null) {
    const mapsQuery = `${latitude},${longitude}`;
    const mapsLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    return { mapsQuery, mapsLabel };
  }

  const fallbackLocation = pickString(report, ['location', 'lokasi', 'address', 'alamat']) ?? 'Lokasi tidak tersedia';
  const shortLocation = pickString(report, mapLabelFieldCandidates);
  const mapsLabel = (shortLocation ?? fallbackLocation).slice(0, 64);

  return {
    mapsQuery: fallbackLocation,
    mapsLabel,
  };
}

function buildTrend(baseValue: number, offset: number): number[] {
  const seed = Math.max(baseValue, 4);
  const multipliers = [0.58, 0.67, 0.62, 0.75, 0.71, 0.82, 0.78, 0.9];

  return multipliers.map((multiplier, index) => {
    const cadence = index % 2 === 0 ? 0 : 1;
    return Math.max(1, Math.round(seed * multiplier + offset + cadence));
  });
}

function isToday(dateString: string): boolean {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    value.getDate() === now.getDate() &&
    value.getMonth() === now.getMonth() &&
    value.getFullYear() === now.getFullYear()
  );
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallbackMessage;
  }

  const errorObject = error as {
    response?: {
      data?: {
        error?: string;
        message?: string;
      };
    };
  };

  const responseData = errorObject.response?.data;
  if (typeof responseData?.error === 'string' && responseData.error.trim().length > 0) {
    return responseData.error;
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim().length > 0) {
    return responseData.message;
  }

  return fallbackMessage;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 36 - ((value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox='0 0 100 36' className='h-10 w-full'>
      <polyline points={points} fill='none' stroke={color} strokeWidth={2.6} strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

interface SidebarContentProps {
  activeNav: AdminNavKey;
  newReportsCount: number;
  onNavigate: (next: AdminNavKey) => void;
  onLogout: () => Promise<void>;
  onCloseMobile?: () => void;
}

function SidebarContent({
  activeNav,
  newReportsCount,
  onNavigate,
  onLogout,
  onCloseMobile,
}: SidebarContentProps) {
  return (
    <>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-[0_14px_24px_-18px_rgba(5,150,105,0.82)]'>
            <Leaf className='h-5 w-5' />
            <MapPin className='absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white p-[1px] text-[#059669]' />
          </div>

          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700'>Control Center</p>
            <p className='text-lg font-black text-slate-900'>CleanTrack</p>
          </div>
        </div>

        {onCloseMobile ? (
          <button
            onClick={onCloseMobile}
            className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700'
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
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                active
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                  : 'text-slate-600 hover:bg-white/85 hover:text-slate-900'
              }`}
            >
              <span className='flex items-center gap-3'>
                <Icon className='h-4 w-4' />
                {item.label}
              </span>

              {item.key === 'laporan' && newReportsCount > 0 ? (
                <span className='rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white'>
                  {newReportsCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className='mt-auto space-y-2 border-t border-emerald-100 pt-4'>
        <button className='flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900'>
          <Settings className='h-4 w-4' />
          Pengaturan
        </button>

        <button
          onClick={() => {
            onCloseMobile?.();
            void onLogout();
          }}
          className='flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
        >
          <LogOut className='h-4 w-4' />
          Log Out
        </button>
      </div>
    </>
  );
}

export function AdminControlDashboard() {
  const router = useRouter();

  const [activeNav, setActiveNav] = useState<AdminNavKey>('laporan');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | WasteCategory>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);
  const [isSavingOfficer, setIsSavingOfficer] = useState(false);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);
  const [deletingOfficerId, setDeletingOfficerId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPassword, setOfficerPassword] = useState('');

  const resetOfficerForm = useCallback(() => {
    setEditingOfficerId(null);
    setOfficerName('');
    setOfficerEmail('');
    setOfficerPassword('');
  }, []);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const data = await reportService.getReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
      toast.error('Gagal memuat laporan admin', 'Pastikan backend aktif lalu coba refresh dashboard.');
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const loadOfficers = useCallback(async () => {
    setIsLoadingOfficers(true);
    try {
      const data = await officerService.getOfficers();
      setOfficers(Array.isArray(data) ? data : []);
    } catch (error) {
      setOfficers([]);
      toast.error('Gagal memuat daftar petugas', extractApiErrorMessage(error, 'Periksa koneksi backend atau token admin.'));
    } finally {
      setIsLoadingOfficers(false);
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

  useEffect(() => {
    if (isAuthenticated && activeNav === 'petugas') {
      void loadOfficers();
    }
  }, [activeNav, isAuthenticated, loadOfficers]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    toast.info('Sesi admin ditutup');
    router.push('/admin/login');
  }, [router]);

  const mappedReports = useMemo<AdminDashboardReport[]>(
    () =>
      reports.map((report, index) => {
        const displayId = formatDisplayId(report, index);
        const reporterPhone = extractReporterPhone(report);
        const { mapsLabel, mapsQuery } = resolveMapsData(report);

        return {
          ...report,
          displayId,
          reporterPhone,
          wasteCategory: resolveWasteCategory(report),
          mapsLabel,
          mapsQuery,
          whatsappLink: buildWhatsappLink(reporterPhone, displayId),
        };
      }),
    [reports]
  );

  const newReportsCount = useMemo(
    () => reports.filter((report) => report.status === 'pending').length,
    [reports]
  );

  const statsCards = useMemo(() => {
    const totalToday = reports.filter((report) => isToday(report.createdAt)).length;
    const pendingCount = reports.filter((report) => report.status === 'pending').length;
    const inProgressCount = reports.filter((report) => report.status === 'in-progress').length;
    const doneCount = reports.filter((report) => report.status === 'done').length;
    const successRate = reports.length === 0 ? 0 : Math.round((doneCount / reports.length) * 100);

    return [
      {
        key: 'total-today',
        title: 'Total Laporan Hari Ini',
        value: totalToday,
        subtitle: 'Laporan baru 24 jam terakhir',
        icon: FileText,
        valueClass: 'text-slate-900',
        iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        lineColor: '#059669',
        trend: buildTrend(totalToday, 1),
      },
      {
        key: 'need-action',
        title: 'Perlu Tindakan',
        value: pendingCount,
        subtitle: 'Menunggu verifikasi admin',
        icon: AlertCircle,
        valueClass: 'text-amber-700',
        iconClass: 'border-amber-200 bg-amber-50 text-amber-700',
        lineColor: '#d97706',
        trend: buildTrend(pendingCount, 0),
      },
      {
        key: 'in-progress',
        title: 'Sedang Dibersihkan',
        value: inProgressCount,
        subtitle: 'Aktif dikerjakan tim lapangan',
        icon: Truck,
        valueClass: 'text-teal-700',
        iconClass: 'border-teal-200 bg-teal-50 text-teal-700',
        lineColor: '#0d9488',
        trend: buildTrend(inProgressCount, 1),
      },
      {
        key: 'success-rate',
        title: 'Selesai (Success Rate)',
        value: successRate,
        suffix: '%',
        subtitle: 'Rasio laporan terselesaikan',
        icon: CheckCircle,
        valueClass: 'text-emerald-700',
        iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        lineColor: '#059669',
        trend: buildTrend(Math.max(successRate, 8), 2),
      },
    ];
  }, [reports]);

  const handleFollowUp = useCallback(
    async (payload: { reportId: string; nextStatus: Report['status']; note: string; cleanupPhoto?: File }) => {
      try {
        const updatedReport = await reportService.updateReportFollowUp(payload.reportId, {
          status: payload.nextStatus,
          note: payload.note,
          cleanupPhoto: payload.cleanupPhoto,
        });

        setReports((currentReports) =>
          currentReports.map((report) =>
            report.id === payload.reportId
              ? {
                  ...report,
                  ...updatedReport,
                  status: payload.nextStatus,
                  updatedAt: new Date().toISOString(),
                }
              : report
          )
        );

        toast.success('Tindak lanjut laporan tersimpan');
      } catch (error) {
        toast.error('Gagal menyimpan tindak lanjut', 'Silakan ulangi proses dalam beberapa saat.');
        throw error;
      }
    },
    []
  );

  const startEditOfficer = useCallback((officer: Officer) => {
    setEditingOfficerId(officer.id);
    setOfficerName(officer.username ?? '');
    setOfficerEmail(officer.email ?? '');
    setOfficerPassword('');
  }, []);

  const handleDeleteOfficer = useCallback(
    async (officer: Officer) => {
      const confirmed = window.confirm(`Hapus akun petugas ${officer.username || officer.email}?`);
      if (!confirmed) {
        return;
      }

      setDeletingOfficerId(officer.id);
      try {
        const response = await officerService.deleteOfficer(officer.id);
        toast.success(response.message ?? 'Petugas berhasil dihapus');

        if (editingOfficerId === officer.id) {
          resetOfficerForm();
        }

        void loadOfficers();
      } catch (error) {
        toast.error('Hapus petugas gagal', extractApiErrorMessage(error, 'Coba ulangi beberapa saat lagi.'));
      } finally {
        setDeletingOfficerId(null);
      }
    },
    [editingOfficerId, loadOfficers, resetOfficerForm]
  );

  const handleSubmitOfficer = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nameValue = officerName.trim();
      const emailValue = officerEmail.trim().toLowerCase();
      const passwordValue = officerPassword.trim();
      const isEditingOfficer = editingOfficerId !== null;

      if (!nameValue || !emailValue) {
        toast.info('Lengkapi nama dan email petugas');
        return;
      }

      if (!isEditingOfficer && !passwordValue) {
        toast.info('Password wajib diisi untuk petugas baru');
        return;
      }

      if (passwordValue && passwordValue.length < 6) {
        toast.info('Password petugas minimal 6 karakter');
        return;
      }

      setIsSavingOfficer(true);
      try {
        let message = 'Data petugas berhasil disimpan';

        if (isEditingOfficer) {
          const payload: { email?: string; username?: string; password?: string } = {
            email: emailValue,
            username: nameValue,
          };

          if (passwordValue) {
            payload.password = passwordValue;
          }

          const response = await officerService.updateOfficer(editingOfficerId, payload);
          message = response.message ?? 'Data petugas berhasil diperbarui';
        } else {
          const response = await officerService.createOfficer({
            email: emailValue,
            username: nameValue,
            password: passwordValue,
          });
          message = response.message ?? 'Petugas baru berhasil ditambahkan';
        }

        resetOfficerForm();

        toast.success(message);
        void loadOfficers();
      } catch (error) {
        toast.error('Simpan data petugas gagal', extractApiErrorMessage(error, 'Coba ulangi beberapa saat lagi.'));
      } finally {
        setIsSavingOfficer(false);
      }
    },
    [editingOfficerId, loadOfficers, officerEmail, officerName, officerPassword, resetOfficerForm]
  );

  if (!isAuthenticated) {
    return <div className='min-h-screen bg-[#f4faf6]' />;
  }

  const breadcrumbCurrent = navTitles[activeNav];
  const showReportSection = activeNav === 'ringkasan' || activeNav === 'laporan';
  const showMapSection = activeNav === 'peta';
  const showOfficerSection = activeNav === 'petugas';
  const isEditingOfficer = editingOfficerId !== null;
  const officerInputClassName =
    'h-11 w-full rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 text-sm font-medium text-slate-900 caret-emerald-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(236,253,245,0.96)]';

  return (
    <>
      <main className='min-h-screen bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_86%_0%,rgba(21,128,61,0.12),transparent_30%),linear-gradient(180deg,#f5fbf7_0%,#f1f8f4_46%,#ecf6f1_100%)] text-slate-900'>
        <div className='relative flex min-h-screen'>
          <aside className='sticky top-0 hidden h-screen w-72 shrink-0 border-r border-emerald-100 bg-[linear-gradient(170deg,#f8fdf9_0%,#eef7f1_55%,#e9f4ed_100%)] p-4 lg:flex lg:flex-col'>
            <SidebarContent
              activeNav={activeNav}
              newReportsCount={newReportsCount}
              onNavigate={setActiveNav}
              onLogout={handleLogout}
            />
          </aside>

          {mobileSidebarOpen ? (
            <>
              <button
                className='fixed inset-0 z-40 bg-slate-900/40 lg:hidden'
                onClick={() => setMobileSidebarOpen(false)}
                aria-label='Tutup sidebar'
              />

              <aside className='fixed inset-y-0 left-0 z-50 w-[84%] max-w-xs border-r border-emerald-100 bg-[linear-gradient(170deg,#f8fdf9_0%,#eef7f1_55%,#e9f4ed_100%)] p-4 lg:hidden'>
                <SidebarContent
                  activeNav={activeNav}
                  newReportsCount={newReportsCount}
                  onNavigate={setActiveNav}
                  onLogout={handleLogout}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                />
              </aside>
            </>
          ) : null}

          <div className='flex min-w-0 flex-1 flex-col'>
            <header className='sticky top-0 z-30 border-b border-emerald-100 bg-white/88 backdrop-blur'>
              <div className='space-y-4 px-4 py-4 sm:px-6 lg:px-8'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => setMobileSidebarOpen(true)}
                      className='inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 lg:hidden'
                    >
                      <Menu className='h-5 w-5' />
                    </button>

                    <div className='space-y-1'>
                      <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        <span>Admin</span>
                        <ChevronRight className='h-3.5 w-3.5' />
                        <span className='text-emerald-700'>{breadcrumbCurrent}</span>
                      </div>
                      <h1 className='text-2xl font-black text-slate-900'>{navTitles[activeNav]}</h1>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 px-3 py-2 shadow-[0_14px_28px_-24px_rgba(5,150,105,0.7)]'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-sm font-bold text-white'>
                      AR
                    </div>

                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Admin Rael</p>
                      <div className='flex items-center gap-1.5 text-xs text-emerald-700'>
                        <span className='h-2 w-2 rounded-full bg-emerald-500' />
                        Online
                      </div>
                    </div>
                  </div>
                </div>

                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder='Cari ID Laporan atau Nama Pelapor...'
                    className='h-11 w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                  />
                </div>
              </div>
            </header>

            <section className='space-y-6 px-4 py-6 sm:px-6 lg:px-8'>
              <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {statsCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.key}
                      className='rounded-2xl border border-emerald-100 bg-white/95 p-5 shadow-[0_18px_34px_-30px_rgba(8,47,34,0.6)] transition hover:shadow-[0_26px_44px_-34px_rgba(8,47,34,0.62)]'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            {card.title}
                          </p>
                          <p className={`mt-2 text-3xl font-black ${card.valueClass}`}>
                            {isLoadingReports ? '...' : `${card.value.toLocaleString('id-ID')}${card.suffix ?? ''}`}
                          </p>
                          <p className='mt-1 text-xs text-slate-500'>{card.subtitle}</p>
                        </div>

                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${card.iconClass}`}>
                          <Icon className='h-5 w-5' />
                        </div>
                      </div>

                      <div className='mt-4 rounded-2xl bg-emerald-50/70 px-2 py-1'>
                        <Sparkline values={card.trend} color={card.lineColor} />
                      </div>
                    </article>
                  );
                })}
              </div>

              {showReportSection ? (
                <AdminReportsManagementTable
                  reports={mappedReports}
                  loading={isLoadingReports}
                  searchQuery={searchQuery}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  onFollowUp={handleFollowUp}
                />
              ) : showMapSection ? (
                <AdminOperationalMap
                  reports={mappedReports}
                  loading={isLoadingReports}
                  onQuickStatusUpdate={async ({ reportId, nextStatus, note }) => {
                    await handleFollowUp({
                      reportId,
                      nextStatus,
                      note,
                    });
                  }}
                />
              ) : showOfficerSection ? (
                <div className='relative overflow-hidden rounded-[30px] border border-emerald-100 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.14),transparent_36%),radial-gradient(circle_at_85%_9%,rgba(21,128,61,0.11),transparent_32%),linear-gradient(160deg,#f7fcf9_0%,#f2f9f4_36%,#ffffff_100%)] p-4 sm:p-5'>
                  <div className='pointer-events-none absolute -right-16 top-3 h-52 w-52 rounded-full border border-emerald-200/70' />
                  <div className='pointer-events-none absolute left-8 top-[-70px] h-44 w-44 rounded-full bg-emerald-100/40 blur-2xl' />

                  <div className='relative grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
                    <article className='rounded-3xl bg-white/95 p-6 shadow-[0_30px_45px_-35px_rgba(9,72,52,0.5)] ring-1 ring-emerald-100'>
                      <h2 className='text-xl font-black text-slate-900'>
                        {isEditingOfficer ? 'Edit Data Petugas' : 'Tambah Petugas Baru'}
                      </h2>
                      <p className='mt-1 text-sm text-slate-600'>
                        {isEditingOfficer
                          ? 'Ubah data akun petugas. Kosongkan password jika tidak ingin mengganti password.'
                          : 'Buat akun petugas operasional agar bisa login dan memproses laporan.'}
                      </p>

                      <form onSubmit={handleSubmitOfficer} className='mt-6 space-y-4'>
                        <div>
                          <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Nama Petugas</label>
                          <input
                            value={officerName}
                            onChange={(event) => setOfficerName(event.target.value)}
                            placeholder='Contoh: Dian Putri'
                            className={officerInputClassName}
                          />
                        </div>

                        <div>
                          <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Email Petugas</label>
                          <input
                            type='email'
                            value={officerEmail}
                            onChange={(event) => setOfficerEmail(event.target.value)}
                            placeholder='petugas.baru@cleantrack.local'
                            className={officerInputClassName}
                          />
                        </div>

                        <div>
                          <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Password</label>
                          <input
                            type='password'
                            value={officerPassword}
                            onChange={(event) => setOfficerPassword(event.target.value)}
                            placeholder={isEditingOfficer ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                            className={officerInputClassName}
                          />
                        </div>

                        <div className='flex flex-wrap items-center gap-2'>
                          <button
                            type='submit'
                            disabled={isSavingOfficer}
                            className='inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 px-5 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.9)] transition hover:from-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-70'
                          >
                            {isSavingOfficer ? 'Menyimpan...' : isEditingOfficer ? 'Simpan Perubahan' : 'Tambah Petugas'}
                          </button>

                          {isEditingOfficer ? (
                            <button
                              type='button'
                              onClick={resetOfficerForm}
                              className='inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700'
                            >
                              Batal Edit
                            </button>
                          ) : null}
                        </div>
                      </form>
                    </article>

                    <article className='rounded-3xl bg-white/95 p-6 shadow-[0_30px_45px_-35px_rgba(9,72,52,0.5)] ring-1 ring-emerald-100'>
                      <h3 className='text-xl font-black text-slate-900'>Daftar Petugas</h3>
                      <p className='mt-1 text-sm text-slate-600'>
                        Data ini diambil dari akun role user yang sudah tersimpan di database.
                      </p>

                      {isLoadingOfficers ? (
                        <p className='mt-6 text-sm text-slate-500'>Memuat daftar petugas...</p>
                      ) : officers.length === 0 ? (
                        <p className='mt-6 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-600'>
                          Belum ada petugas terdaftar. Tambahkan petugas pertama melalui form di sebelah kiri.
                        </p>
                      ) : (
                        <div className='mt-5 overflow-x-auto'>
                          <table className='min-w-full divide-y divide-emerald-100 text-sm'>
                            <thead>
                              <tr className='text-left text-xs uppercase tracking-[0.14em] text-slate-500'>
                                <th className='py-2 pr-3'>No</th>
                                <th className='px-3 py-2'>Nama</th>
                                <th className='px-3 py-2'>Email</th>
                                <th className='px-3 py-2'>Status</th>
                                <th className='px-3 py-2'>Aksi</th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-emerald-50'>
                              {officers.map((officer, index) => (
                                <tr key={officer.id}>
                                  <td className='py-2 pr-3 font-semibold text-slate-500'>{index + 1}</td>
                                  <td className='px-3 py-2 font-medium text-slate-900'>{officer.username || '-'}</td>
                                  <td className='px-3 py-2 text-slate-600'>{officer.email}</td>
                                  <td className='px-3 py-2'>
                                    <span className='inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'>
                                      Aktif
                                    </span>
                                  </td>
                                  <td className='px-3 py-2'>
                                    <div className='flex items-center gap-2'>
                                      <button
                                        onClick={() => startEditOfficer(officer)}
                                        className='inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50'
                                      >
                                        <Pencil className='h-3.5 w-3.5' />
                                        Edit
                                      </button>

                                      <button
                                        onClick={() => void handleDeleteOfficer(officer)}
                                        disabled={deletingOfficerId === officer.id}
                                        className='inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60'
                                      >
                                        <Trash2 className='h-3.5 w-3.5' />
                                        {deletingOfficerId === officer.id ? 'Menghapus...' : 'Hapus'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              ) : (
                <div className='rounded-3xl border border-emerald-100 bg-white/95 p-8 shadow-[0_22px_42px_-34px_rgba(8,47,34,0.65)]'>
                  <h2 className='text-2xl font-black text-slate-900'>{navTitles[activeNav]}</h2>
                  <p className='mt-2 max-w-2xl text-sm text-slate-600'>
                    Modul ini siap dijadikan panel lanjutan. Dashboard laporan utama tersedia pada menu Laporan Masuk.
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

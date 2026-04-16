'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  ImageOff,
  MapPin,
  MessageCircle,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { Report } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export type WasteCategory = 'organik' | 'anorganik';

export interface AdminDashboardReport extends Report {
  displayId: string;
  reporterPhone: string;
  wasteCategory: WasteCategory;
  mapsQuery: string;
  mapsLabel: string;
  whatsappLink: string | null;
}

interface FollowUpPayload {
  reportId: string;
  nextStatus: Report['status'];
  note: string;
  cleanupPhoto?: File;
}

interface AdminReportsManagementTableProps {
  reports: AdminDashboardReport[];
  loading: boolean;
  searchQuery: string;
  activeCategory: 'all' | WasteCategory;
  onCategoryChange: (next: 'all' | WasteCategory) => void;
  onFollowUp: (payload: FollowUpPayload) => Promise<void>;
}

const statusMeta: Record<
  Report['status'],
  {
    label: string;
    variant: 'warning' | 'secondary' | 'success';
    className: string;
  }
> = {
  pending: {
    label: 'Pending',
    variant: 'warning',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'in-progress': {
    label: 'On-Progress',
    variant: 'secondary',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  done: {
    label: 'Resolved',
    variant: 'success',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

function getStatusMeta(status: unknown) {
  if (status === 'pending' || status === 'in-progress' || status === 'done') {
    return statusMeta[status];
  }

  return statusMeta.pending;
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\"/g, '""');
  return `"${normalized}"`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function triggerDownload(content: string, fileName: string, mimeType: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function AdminReportsManagementTable({
  reports,
  loading,
  searchQuery,
  activeCategory,
  onCategoryChange,
  onFollowUp,
}: AdminReportsManagementTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayId', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });
  const [previewImage, setPreviewImage] = useState<{ url: string; reportId: string } | null>(null);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdminDashboardReport | null>(null);
  const [nextStatus, setNextStatus] = useState<Report['status']>('pending');
  const [officerNote, setOfficerNote] = useState('');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);

  const {
    files,
    isDragging,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    removeFile,
  } = useFileUpload({ multiple: false, maxFiles: 1 });

  const categoryCounts = useMemo(
    () => ({
      all: reports.length,
      organik: reports.filter((report) => report.wasteCategory === 'organik').length,
      anorganik: reports.filter((report) => report.wasteCategory === 'anorganik').length,
    }),
    [reports]
  );

  const categoryFilteredReports = useMemo(() => {
    if (activeCategory === 'all') {
      return reports;
    }

    return reports.filter((report) => report.wasteCategory === activeCategory);
  }, [activeCategory, reports]);

  const cleanupPhoto = files[0];
  const cleanupPhotoPreview = useMemo(
    () => (cleanupPhoto ? URL.createObjectURL(cleanupPhoto) : null),
    [cleanupPhoto]
  );

  useEffect(() => {
    return () => {
      if (cleanupPhotoPreview) {
        URL.revokeObjectURL(cleanupPhotoPreview);
      }
    };
  }, [cleanupPhotoPreview]);

  useEffect(() => {
    setPagination((currentPagination) => ({ ...currentPagination, pageIndex: 0 }));
  }, [activeCategory, searchQuery]);

  const openFollowUpSheet = useCallback((report: AdminDashboardReport) => {
    setSelectedReport(report);
    setNextStatus(report.status);
    setOfficerNote('');
    removeFile(-1);
    setFollowUpOpen(true);
  }, [removeFile]);

  const closeFollowUpSheet = useCallback(() => {
    setFollowUpOpen(false);
    setSelectedReport(null);
    setOfficerNote('');
    removeFile(-1);
  }, [removeFile]);

  const handleSubmitFollowUp = useCallback(async () => {
    if (!selectedReport) {
      return;
    }

    setIsSavingFollowUp(true);
    try {
      await onFollowUp({
        reportId: selectedReport.id,
        nextStatus,
        note: officerNote.trim(),
        cleanupPhoto,
      });
      closeFollowUpSheet();
    } finally {
      setIsSavingFollowUp(false);
    }
  }, [cleanupPhoto, closeFollowUpSheet, nextStatus, officerNote, onFollowUp, selectedReport]);

  const columns = useMemo<ColumnDef<AdminDashboardReport>[]>(
    () => [
      {
        accessorKey: 'displayId',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-emerald-700'
          >
            ID
            <ChevronsUpDown className='h-3.5 w-3.5' />
          </button>
        ),
        cell: ({ row }) => (
          <p className='font-semibold text-emerald-700'>{row.original.displayId}</p>
        ),
      },
      {
        id: 'evidence',
        header: 'Bukti',
        cell: ({ row }) => {
          const thumbnailSource = row.original.imageThumbnail || row.original.imageUrl;
          if (!thumbnailSource) {
            return (
              <div className='flex h-14 w-20 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 text-emerald-400'>
                <ImageOff className='h-4 w-4' />
              </div>
            );
          }

          const previewSource = row.original.imageUrl || thumbnailSource;

          return (
            <button
              onClick={() => setPreviewImage({ url: previewSource, reportId: row.original.displayId })}
              className='group block w-20 overflow-hidden rounded-2xl border border-emerald-100 ring-offset-2 ring-offset-white transition hover:ring-2 hover:ring-emerald-300'
            >
              <div className='relative aspect-[4/3] w-full'>
                <Image
                  src={thumbnailSource}
                  alt={`Bukti laporan ${row.original.displayId}`}
                  fill
                  unoptimized
                  className='object-cover transition duration-300 group-hover:scale-105'
                />
              </div>
            </button>
          );
        },
      },
      {
        id: 'reporter',
        accessorFn: (row) => `${row.reporterName} ${row.reporterPhone}`,
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-emerald-700'
          >
            Pelapor
            <ChevronsUpDown className='h-3.5 w-3.5' />
          </button>
        ),
        cell: ({ row }) => (
          <div className='space-y-1'>
            <p className='font-semibold text-slate-900'>{row.original.reporterName}</p>
            {row.original.whatsappLink ? (
              <a
                href={row.original.whatsappLink}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition hover:text-emerald-600'
              >
                <MessageCircle className='h-3.5 w-3.5' />
                {row.original.reporterPhone}
              </a>
            ) : (
              <p className='text-xs text-slate-500'>WA: {row.original.reporterPhone}</p>
            )}
          </div>
        ),
      },
      {
        id: 'location',
        accessorFn: (row) => row.mapsLabel,
        header: 'Lokasi',
        cell: ({ row }) => (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.original.mapsQuery)}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-start gap-2 text-left text-sm font-medium text-slate-700 transition hover:text-emerald-700'
          >
            <MapPin className='mt-0.5 h-4 w-4 shrink-0' />
            <span className='line-clamp-2'>{row.original.mapsLabel}</span>
          </a>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-emerald-700'
          >
            Status
            <ChevronsUpDown className='h-3.5 w-3.5' />
          </button>
        ),
        cell: ({ row }) => {
          const meta = getStatusMeta(row.original.status);
          return (
            <Badge variant={meta.variant} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${meta.className}`}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Aksi',
        cell: ({ row }) => (
          <button
            onClick={() => openFollowUpSheet(row.original)}
            className='inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 px-3 text-xs font-semibold text-white shadow-[0_14px_24px_-20px_rgba(5,150,105,0.85)] transition hover:from-emerald-500 hover:to-green-600'
          >
            Tindak Lanjuti
          </button>
        ),
      },
    ],
    [openFollowUpSheet]
  );

  const table = useReactTable({
    data: categoryFilteredReports,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      const meta = getStatusMeta(row.original.status);
      const searchable = [
        row.original.displayId,
        row.original.reporterName,
        row.original.reporterPhone,
        row.original.mapsLabel,
        meta.label,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(value);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const visibleRows = table.getRowModel?.()?.rows ?? [];

  const exportRows = (table.getFilteredRowModel?.()?.rows ?? []).map((row) => row.original);

  const handleExportExcel = useCallback(() => {
    if (exportRows.length === 0) {
      return;
    }

    const headers = ['ID', 'Pelapor', 'No WhatsApp', 'Lokasi', 'Kategori', 'Status', 'Diperbarui'];
    const rows = exportRows.map((report) => [
      report.displayId,
      report.reporterName,
      report.reporterPhone,
      report.mapsLabel,
      report.wasteCategory,
      getStatusMeta(report.status).label,
      new Date(report.updatedAt).toLocaleString('id-ID'),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvCell(String(value))).join(','))
      .join('\n');

    triggerDownload(csv, `cleantrack-admin-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }, [exportRows]);

  const handleExportPdf = useCallback(() => {
    if (exportRows.length === 0) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      return;
    }

    const tableRows = exportRows
      .map(
        (report) => `
          <tr>
            <td>${escapeHtml(report.displayId)}</td>
            <td>${escapeHtml(report.reporterName)}</td>
            <td>${escapeHtml(report.reporterPhone)}</td>
            <td>${escapeHtml(report.mapsLabel)}</td>
            <td>${escapeHtml(report.wasteCategory)}</td>
            <td>${escapeHtml(getStatusMeta(report.status).label)}</td>
          </tr>
        `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>CleanTrack Admin Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; color: #059669; }
            p { margin: 0 0 20px; color: #475569; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>CleanTrack - Laporan Admin</h1>
          <p>Dicetak pada ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Pelapor</th>
                <th>No WhatsApp</th>
                <th>Lokasi</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [exportRows]);

  return (
    <>
      <section className='rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fcf9_52%,#f3faf6_100%)] p-5 shadow-[0_22px_40px_-34px_rgba(8,47,34,0.65)]'>
        <div className='mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <Tabs value={activeCategory} onValueChange={(value) => onCategoryChange(value as 'all' | WasteCategory)}>
            <TabsList className='bg-emerald-50 text-slate-600 ring-1 ring-emerald-100'>
              <TabsTrigger value='all' className='hover:text-emerald-700'>Semua ({categoryCounts.all})</TabsTrigger>
              <TabsTrigger value='organik' className='hover:text-emerald-700'>Organik ({categoryCounts.organik})</TabsTrigger>
              <TabsTrigger value='anorganik' className='hover:text-emerald-700'>Anorganik ({categoryCounts.anorganik})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              onClick={handleExportExcel}
              disabled={exportRows.length === 0}
              className='inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <FileSpreadsheet className='h-4 w-4' />
              Export Excel
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportRows.length === 0}
              className='inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Download className='h-4 w-4' />
              Export PDF
            </button>
          </div>
        </div>

        <div className='mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/65 px-3 py-2 text-sm text-slate-600'>
          <Search className='h-4 w-4' />
          <span>
            Filter aktif: {searchQuery.trim() ? `"${searchQuery.trim()}"` : 'Tanpa kata kunci'} | {(table.getFilteredRowModel?.()?.rows ?? []).length} laporan ditemukan
          </span>
        </div>

        <div className='overflow-x-auto rounded-2xl border border-emerald-100 bg-white/95'>
          <table className='min-w-full text-sm'>
            <thead className='bg-emerald-50/70'>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length} className='px-4 py-14 text-center text-sm text-slate-500'>
                    Memuat laporan masuk...
                  </td>
                </tr>
              )}

              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className='px-4 py-14 text-center text-sm text-slate-500'>
                    Tidak ada laporan untuk filter yang dipilih.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className='border-t border-emerald-50 transition hover:bg-emerald-50/70'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 py-3 align-middle text-slate-700'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2 text-xs text-slate-500'>
            <span>Baris per halaman:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className='h-8 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100'
            >
              {[5, 8, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className='flex items-center justify-between gap-3 sm:justify-end'>
            <p className='text-xs font-medium text-slate-500'>
              Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}
            </p>

            <div className='flex items-center gap-2'>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className='inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ChevronLeft className='h-4 w-4' />
                Prev
              </button>

              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className='inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Next
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
          }
        }}
      >
        <DialogContent className='max-w-3xl rounded-2xl border border-emerald-100 bg-white' onClose={() => setPreviewImage(null)}>
          <DialogHeader>
            <DialogTitle>Bukti Laporan {previewImage?.reportId}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {previewImage ? (
              <div className='overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60'>
                <Image
                  src={previewImage.url}
                  alt={`Bukti laporan ${previewImage.reportId}`}
                  width={1600}
                  height={1200}
                  unoptimized
                  className='h-auto max-h-[70vh] w-full object-contain'
                />
              </div>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {followUpOpen && selectedReport ? (
        <div className='fixed inset-0 z-50'>
          <button className='absolute inset-0 bg-slate-900/40' onClick={closeFollowUpSheet} aria-label='Tutup panel tindak lanjut' />

          <aside className='absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l border-emerald-100 bg-white p-5 shadow-2xl'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'>Panel Tindak Lanjut</p>
                <h3 className='mt-1 text-xl font-black text-slate-900'>{selectedReport.displayId}</h3>
              </div>

              <button
                onClick={closeFollowUpSheet}
                className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='space-y-4 overflow-y-auto pr-1'>
              <div className='space-y-1.5'>
                <label className='block text-sm font-semibold text-slate-700'>Update Status</label>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as Report['status'])}
                  className='h-11 w-full rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                >
                  <option value='pending'>Pending</option>
                  <option value='in-progress'>On-Progress</option>
                  <option value='done'>Resolved</option>
                </select>
              </div>

              <Textarea
                label='Catatan Admin'
                value={officerNote}
                onChange={(event) => setOfficerNote(event.target.value)}
                placeholder='Contoh: Tim lapangan bergerak pukul 10.30, estimasi selesai 45 menit.'
                className='min-h-28 rounded-2xl border-emerald-100 bg-emerald-50/70 text-slate-900 focus:border-emerald-400 focus:ring-emerald-100'
              />

              <div className='space-y-1.5'>
                <label className='block text-sm font-semibold text-slate-700'>Upload Foto Hasil Pembersihan</label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex h-32 items-center justify-center rounded-2xl border border-dashed transition ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-emerald-200 bg-emerald-50/55 hover:border-emerald-300'
                  }`}
                >
                  <input type='file' accept='image/*' onChange={handleFileSelect} className='absolute inset-0 cursor-pointer opacity-0' />
                  <div className='text-center'>
                    <UploadCloud className='mx-auto h-6 w-6 text-emerald-700' />
                    <p className='mt-1 text-sm font-semibold text-slate-700'>Drop atau pilih foto hasil</p>
                    <p className='text-xs text-slate-500'>Format JPG/PNG</p>
                  </div>
                </div>

                {cleanupPhotoPreview ? (
                  <div className='space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-2'>
                    <div className='relative aspect-[4/3] overflow-hidden rounded-xl'>
                      <Image src={cleanupPhotoPreview} alt='Pratinjau foto hasil pembersihan' fill className='object-cover' unoptimized />
                    </div>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='line-clamp-1 text-xs text-slate-500'>{cleanupPhoto?.name}</p>
                      <button
                        onClick={() => removeFile(0)}
                        className='inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 text-slate-600 transition hover:border-rose-200 hover:text-rose-700'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='inline-flex items-center gap-1 text-xs text-slate-500'>
                    <Camera className='h-3.5 w-3.5' />
                    Belum ada foto terpilih
                  </div>
                )}
              </div>
            </div>

            <div className='mt-5 grid grid-cols-2 gap-2'>
              <button
                onClick={closeFollowUpSheet}
                className='inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-emerald-50'
              >
                Batal
              </button>
              <button
                onClick={() => void handleSubmitFollowUp()}
                disabled={isSavingFollowUp}
                className='inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.85)] transition hover:from-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-65'
              >
                {isSavingFollowUp ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

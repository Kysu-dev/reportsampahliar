'use client';

import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
  ImageOff,
  MoreHorizontal,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { Report } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export interface DashboardReport extends Report {
  reporterPhone: string;
}

interface ReportsDataTableProps {
  reports: DashboardReport[];
  loading: boolean;
  onUpdateStatus: (reportId: string, nextStatus: Report['status'], note: string) => Promise<void>;
  onDeleteReport: (reportId: string) => Promise<void>;
}

const statusMeta: Record<Report['status'], { label: string; variant: 'warning' | 'secondary' | 'success'; className: string }> = {
  pending: {
    label: 'Pending',
    variant: 'warning',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
  },
  'in-progress': {
    label: 'Diproses',
    variant: 'secondary',
    className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30',
  },
  done: {
    label: 'Selesai',
    variant: 'success',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30',
  },
};

function closeDropdown(element: HTMLElement) {
  const detailsElement = element.closest('details');
  if (detailsElement instanceof HTMLDetailsElement) {
    detailsElement.open = false;
  }
}

export function ReportsDataTable({
  reports,
  loading,
  onUpdateStatus,
  onDeleteReport,
}: ReportsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });

  const [previewImage, setPreviewImage] = useState<{ url: string; reportId: string } | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DashboardReport | null>(null);
  const [nextStatus, setNextStatus] = useState<Report['status']>('pending');
  const [officerNote, setOfficerNote] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openStatusDialog = useCallback((report: DashboardReport) => {
    setSelectedReport(report);
    setNextStatus(report.status);
    setOfficerNote('');
    setStatusDialogOpen(true);
  }, []);

  const handleStatusDialogChange = useCallback((open: boolean) => {
    setStatusDialogOpen(open);
    if (!open) {
      setSelectedReport(null);
      setOfficerNote('');
    }
  }, []);

  const handleSaveStatus = useCallback(async () => {
    if (!selectedReport) {
      return;
    }

    setIsSavingStatus(true);
    try {
      await onUpdateStatus(selectedReport.id, nextStatus, officerNote.trim());
      handleStatusDialogChange(false);
    } finally {
      setIsSavingStatus(false);
    }
  }, [handleStatusDialogChange, nextStatus, officerNote, onUpdateStatus, selectedReport]);

  const handleDeleteReport = useCallback(
    async (reportId: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const confirmed = window.confirm('Hapus laporan ini? Tindakan ini tidak dapat dibatalkan.');
      if (!confirmed) {
        return;
      }

      setDeletingId(reportId);
      try {
        await onDeleteReport(reportId);
      } finally {
        setDeletingId(null);
      }
    },
    [onDeleteReport]
  );

  const columns = useMemo<ColumnDef<DashboardReport>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300'
          >
            ID Laporan
            <ChevronsUpDown className='h-3.5 w-3.5' />
          </button>
        ),
        cell: ({ row }) => (
          <p className='font-semibold text-emerald-700 dark:text-emerald-300'>{row.original.id}</p>
        ),
      },
      {
        id: 'photo',
        header: 'Foto',
        cell: ({ row }) => {
          const thumbnailSource = row.original.imageThumbnail || row.original.imageUrl;
          if (!thumbnailSource) {
            return (
              <div className='flex h-12 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'>
                <ImageOff className='h-4 w-4' />
              </div>
            );
          }

          const previewSource = row.original.imageUrl || thumbnailSource;

          return (
            <button
              onClick={() => setPreviewImage({ url: previewSource, reportId: row.original.id })}
              className='group overflow-hidden rounded-xl border border-emerald-100 ring-offset-2 ring-offset-white transition hover:ring-2 hover:ring-emerald-300 dark:border-slate-700 dark:ring-offset-slate-950 dark:hover:ring-emerald-500/40'
              aria-label={`Lihat foto laporan ${row.original.id}`}
            >
              <Image
                src={thumbnailSource}
                alt={`Foto laporan ${row.original.id}`}
                width={80}
                height={48}
                unoptimized
                className='h-12 w-20 object-cover transition duration-300 group-hover:scale-105'
              />
            </button>
          );
        },
      },
      {
        id: 'reporter',
        header: 'Nama Pelapor & No. WA',
        cell: ({ row }) => (
          <div>
            <p className='font-semibold text-slate-900 dark:text-slate-100'>{row.original.reporterName}</p>
            <p className='text-xs text-slate-500 dark:text-slate-400'>WA: {row.original.reporterPhone}</p>
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Lokasi',
        cell: ({ row }) => {
          const locationText = row.original.location;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
          return (
            <a
              href={mapsUrl}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-start gap-1.5 text-left text-sm font-medium text-slate-700 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300'
            >
              <span className='line-clamp-2'>{locationText}</span>
              <ExternalLink className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            </a>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const meta = statusMeta[row.original.status];
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
        cell: ({ row }) => {
          const reportId = row.original.id;
          const isDeletingCurrentRow = deletingId === reportId;

          return (
            <details className='relative inline-flex'>
              <summary className='inline-flex cursor-pointer list-none items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300'>
                <MoreHorizontal className='h-3.5 w-3.5' />
                Pilih
                <ChevronDown className='h-3.5 w-3.5' />
              </summary>

              <div className='absolute right-0 top-[110%] z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40'>
                <button
                  onClick={(event) => {
                    closeDropdown(event.currentTarget);
                    openStatusDialog(row.original);
                  }}
                  className='flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300'
                >
                  <Wrench className='h-4 w-4' />
                  Update Status
                </button>

                <button
                  onClick={(event) => {
                    closeDropdown(event.currentTarget);
                    void handleDeleteReport(reportId);
                  }}
                  disabled={isDeletingCurrentRow}
                  className='flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <Trash2 className='h-4 w-4' />
                  {isDeletingCurrentRow ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </details>
          );
        },
      },
    ],
    [deletingId, handleDeleteReport, openStatusDialog]
  );

  const table = useReactTable({
    data: reports,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchableValue = `${row.original.id} ${row.original.reporterName} ${row.original.reporterPhone} ${row.original.location}`.toLowerCase();
      return searchableValue.includes(String(filterValue).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <>
      <div className='rounded-xl border border-emerald-100 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(8,47,34,0.42)] dark:border-slate-800 dark:bg-slate-900'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='relative w-full max-w-md'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder='Cari ID, pelapor, WA, atau lokasi...'
              className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-600'
            />
          </div>

          <p className='text-xs font-medium text-slate-500 dark:text-slate-400'>
            Menampilkan {table.getFilteredRowModel().rows.length} laporan
          </p>
        </div>

        <div className='overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-50 dark:bg-slate-900/70'>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'
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
                  <td colSpan={columns.length} className='px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400'>
                    Memuat data laporan...
                  </td>
                </tr>
              )}

              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className='px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400'>
                    Tidak ada laporan yang sesuai dengan filter.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className='border-t border-slate-100 transition hover:bg-emerald-50/70 dark:border-slate-800 dark:hover:bg-emerald-900/15'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 py-3 align-middle text-slate-700 dark:text-slate-200'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
            <span>Baris per halaman:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className='h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-600'
            >
              {[5, 8, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className='flex items-center justify-between gap-3 sm:justify-end'>
            <p className='text-xs font-medium text-slate-500 dark:text-slate-400'>
              Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}
            </p>

            <div className='flex items-center gap-2'>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className='inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300'
              >
                <ChevronLeft className='h-4 w-4' />
                Prev
              </button>

              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className='inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300'
              >
                Next
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
          }
        }}
      >
        <DialogContent className='max-w-3xl rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950' onClose={() => setPreviewImage(null)}>
          <DialogHeader>
            <DialogTitle>Foto Laporan {previewImage?.reportId}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {previewImage ? (
              <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900'>
                <Image
                  src={previewImage.url}
                  alt={`Foto laporan ${previewImage.reportId}`}
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

      <Dialog open={statusDialogOpen} onOpenChange={handleStatusDialogChange}>
        <DialogContent className='max-w-xl rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950' onClose={() => handleStatusDialogChange(false)}>
          <DialogHeader>
            <DialogTitle>Update Status Laporan {selectedReport?.id}</DialogTitle>
          </DialogHeader>

          <DialogBody className='space-y-4'>
            <div className='space-y-1.5'>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-200'>Status Baru</label>
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as Report['status'])}
                className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-600'
              >
                <option value='pending'>Pending</option>
                <option value='in-progress'>Sedang Diproses</option>
                <option value='done'>Selesai Dibersihkan</option>
              </select>
            </div>

            <Textarea
              label='Catatan Petugas'
              value={officerNote}
              onChange={(event) => setOfficerNote(event.target.value)}
              placeholder='Contoh: Tim sedang menuju lokasi, estimasi 30 menit.'
              className='rounded-xl border-slate-200 bg-slate-50 focus:border-emerald-400 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-600 dark:focus:ring-emerald-900/30'
            />
          </DialogBody>

          <DialogFooter className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button
              type='button'
              onClick={() => handleStatusDialogChange(false)}
              className='inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            >
              Batal
            </button>
            <button
              type='button'
              onClick={() => void handleSaveStatus()}
              disabled={isSavingStatus}
              className='inline-flex h-10 items-center justify-center rounded-xl bg-[#059669] px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-65'
            >
              {isSavingStatus ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

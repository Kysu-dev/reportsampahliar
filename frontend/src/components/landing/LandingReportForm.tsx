'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dynamic from 'next/dynamic';
import { Camera, LoaderCircle, Map, MapPinned, Phone, UserRound, X } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { reportService } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

const reportFormSchema = z.object({
  reporterName: z.string().min(2, 'Nama minimal 2 karakter'),
  whatsapp: z
    .string()
    .optional()
    .refine((value) => !value || /^(\+62|62|0)[0-9]{8,13}$/.test(value), {
      message: 'Format WhatsApp tidak valid',
    }),
  location: z.string().min(3, 'Lokasi minimal 3 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
});

type LandingReportFormData = z.infer<typeof reportFormSchema>;

interface Coordinates {
  latitude: number;
  longitude: number;
}

const ReportLocationPickerMap = dynamic(
  () => import('@/components/landing/ReportLocationPickerMap').then((module) => module.ReportLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-[270px] w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700'>
        Memuat peta manual...
      </div>
    ),
  }
);

interface LandingReportFormProps {
  onSuccess?: () => Promise<void> | void;
}

function extractSubmitError(error: unknown): { message: string; description?: string } {
  const fallback = {
    message: 'Gagal mengirim laporan',
    description: 'Silakan coba kembali dalam beberapa saat.',
  };

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const errorRecord = error as {
    message?: unknown;
    response?: {
      data?: unknown;
    };
  };

  const responseData = errorRecord.response?.data;
  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    return {
      message: 'Gagal mengirim laporan',
      description: responseData.trim(),
    };
  }

  if (responseData && typeof responseData === 'object') {
    const responseRecord = responseData as Record<string, unknown>;
    const backendError = [responseRecord.error, responseRecord.message]
      .find((value) => typeof value === 'string' && value.trim().length > 0)
      ?.toString()
      .trim();

    if (backendError) {
      return {
        message: 'Gagal mengirim laporan',
        description: backendError,
      };
    }
  }

  if (typeof errorRecord.message === 'string' && errorRecord.message.trim().length > 0) {
    const normalizedMessage = errorRecord.message.trim();

    if (/network error|failed to fetch|err_network/i.test(normalizedMessage.toLowerCase())) {
      return {
        message: 'Gagal mengirim laporan',
        description: 'Koneksi ke server gagal. Coba refresh halaman, pastikan URL yang dibuka benar, lalu kirim ulang.',
      };
    }

    return {
      message: 'Gagal mengirim laporan',
      description: normalizedMessage,
    };
  }

  return fallback;
}

export function LandingReportForm({ onSuccess }: LandingReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isManualPinOpen, setIsManualPinOpen] = useState(false);
  const {
    files,
    isDragging,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    removeFile,
    setFiles,
  } = useFileUpload();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    reset,
  } = useForm<LandingReportFormData>({
    resolver: zodResolver(reportFormSchema),
  });

  const mapGeoErrorToToast = (error: unknown): { message: string; description?: string } => {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return {
        message: 'Gagal mengambil lokasi',
        description: 'Kamu tetap bisa isi lokasi secara manual.',
      };
    }

    const geoError = error as GeolocationPositionError;

    if (geoError.code === geoError.PERMISSION_DENIED) {
      return {
        message: 'Akses lokasi ditolak',
        description: 'Izinkan akses lokasi di browser atau isi lokasi manual.',
      };
    }

    if (geoError.code === geoError.POSITION_UNAVAILABLE) {
      return {
        message: 'Lokasi tidak tersedia',
        description: 'Pastikan GPS aktif lalu coba lagi.',
      };
    }

    if (geoError.code === geoError.TIMEOUT) {
      return {
        message: 'Pengambilan lokasi timeout',
        description: 'Sinyal GPS lemah. Coba lagi, atau isi lokasi manual.',
      };
    }

    return {
      message: 'Gagal mengambil lokasi',
      description: 'Kamu tetap bisa isi lokasi secara manual.',
    };
  };

  const getCurrentPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const applyDetectedCoordinates = (position: GeolocationPosition) => {
    const nextCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    setCoordinates(nextCoordinates);

    if (!getValues('location').trim()) {
      setValue('location', 'Titik GPS terdeteksi', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      toast.error('Fitur lokasi hanya tersedia di browser');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Browser kamu tidak mendukung geolokasi');
      return;
    }

    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
      toast.error('Lokasi butuh koneksi aman', 'Buka aplikasi lewat HTTPS atau localhost.');
      return;
    }

    setIsLocating(true);

    try {
      try {
        const highAccuracyPosition = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });

        applyDetectedCoordinates(highAccuracyPosition);
      } catch (error) {
        const isTimeoutError =
          !!error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as GeolocationPositionError).code === (error as GeolocationPositionError).TIMEOUT;

        if (!isTimeoutError) {
          throw error;
        }

        toast.info(
          'GPS presisi butuh waktu lebih lama',
          'Mencoba mode lokasi cepat dari jaringan/cached...'
        );

        const fallbackPosition = await getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 600000,
        });

        applyDetectedCoordinates(fallbackPosition);
      }

      toast.success('Lokasi GPS berhasil disimpan');
    } catch (error) {
      const { message, description } = mapGeoErrorToToast(error);
      toast.error(message, description);
    } finally {
      setIsLocating(false);
    }
  };

  const handleManualPinSelect = (nextCoordinates: Coordinates) => {
    setCoordinates(nextCoordinates);

    if (!getValues('location').trim()) {
      setValue('location', 'Pin manual dipilih', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const onSubmit = async (data: LandingReportFormData) => {
    if (files.length === 0) {
      toast.error('Tambahkan minimal satu foto bukti');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reporterName', data.reporterName);
      formData.append('whatsapp', data.whatsapp?.trim() ?? '');
      formData.append('location', data.location);
      formData.append('description', data.description);

      if (coordinates) {
        formData.append('latitude', coordinates.latitude.toString());
        formData.append('longitude', coordinates.longitude.toString());
      }

      files.forEach((file) => {
        formData.append('images', file);
      });

      await reportService.createReport(formData);
      toast.success('Laporan berhasil dikirim', 'Terima kasih sudah ikut menjaga kebersihan kampus.');
      reset();
      setCoordinates(null);
      setIsManualPinOpen(false);
      setFiles([]);
      await onSuccess?.();
    } catch (error) {
      const submitError = extractSubmitError(error);
      toast.error(submitError.message, submitError.description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id='form-lapor' className='animate-rise-in rounded-3xl bg-white p-5 shadow-[0_30px_55px_-40px_rgba(8,47,34,0.8)] ring-1 ring-emerald-200 sm:p-8'>
      <div className='mb-6 text-center'>
        <p className='text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700'>Aksi Nyata</p>
        <h2 className='mt-2 text-3xl font-black text-slate-900'>Formulir Laporan Sampah</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div>
            <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Nama Lengkap</label>
            <div className='relative'>
              <UserRound className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                type='text'
                placeholder='Nama pelapor'
                {...register('reporterName')}
                className='h-11 w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
              />
            </div>
            {errors.reporterName && <p className='mt-1 text-xs text-red-500'>{errors.reporterName.message}</p>}
          </div>

          <div>
            <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Nomor WhatsApp (+62)</label>
            <div className='relative'>
              <Phone className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                type='text'
                placeholder='08xxxxxxxxxx'
                {...register('whatsapp')}
                className='h-11 w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
              />
            </div>
            {errors.whatsapp && <p className='mt-1 text-xs text-red-500'>{errors.whatsapp.message}</p>}
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-[1fr,1.1fr]'>
          <div>
            <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Lokasi Penemuan</label>
            <div className='space-y-2'>
              <input
                type='text'
                placeholder='Contoh: Area parkir belakang kampus'
                {...register('location')}
                className='h-11 w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
              />
              <button
                type='button'
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70'
              >
                {isLocating ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <MapPinned className='h-4 w-4' />}
                {isLocating ? 'Mengambil Lokasi...' : 'Gunakan Lokasi Saat Ini'}
              </button>
              <button
                type='button'
                onClick={() => setIsManualPinOpen((previous) => !previous)}
                className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'
              >
                <Map className='h-4 w-4' />
                {isManualPinOpen ? 'Tutup Peta Pin Manual' : 'Pilih Pin Manual di Peta'}
              </button>
              <p className='text-[11px] text-slate-500'>Browser akan meminta izin lokasi. Pastikan akses lewat HTTPS atau localhost.</p>
              {isManualPinOpen && (
                <div className='space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3'>
                  <p className='text-xs font-medium text-emerald-800'>Klik titik di peta untuk memasang pin manual.</p>
                  <ReportLocationPickerMap value={coordinates} onSelect={handleManualPinSelect} />
                  <p className='text-[11px] text-slate-500'>Tips: zoom in dulu agar pin lebih presisi.</p>
                </div>
              )}
              {coordinates && (
                <p className='text-xs font-medium text-emerald-700'>
                  Koordinat tersimpan: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                </p>
              )}
            </div>
            {errors.location && <p className='mt-1 text-xs text-red-500'>{errors.location.message}</p>}
          </div>

          <div>
            <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Deskripsi Masalah</label>
            <textarea
              placeholder='Jelaskan kondisi sampah, perkiraan volume, dan titik detailnya.'
              {...register('description')}
              className='min-h-[98px] w-full rounded-xl border border-emerald-100 bg-[#f7fbf8] px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white'
            />
            {errors.description && <p className='mt-1 text-xs text-red-500'>{errors.description.message}</p>}
          </div>
        </div>

        <div>
          <label className='mb-1.5 block text-sm font-semibold text-slate-700'>Upload Foto Bukti</label>
          <div className='grid gap-3 sm:grid-cols-[1fr,auto]'>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex h-[108px] items-center justify-center rounded-2xl border border-dashed transition ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-emerald-200 bg-[#f7fbf8] hover:border-emerald-300'
              }`}
            >
              <input
                type='file'
                accept='image/*'
                multiple
                onChange={handleFileSelect}
                className='absolute inset-0 cursor-pointer opacity-0'
              />
              <div className='text-center'>
                <Camera className='mx-auto h-7 w-7 text-emerald-700' />
                <p className='mt-1 text-sm font-semibold text-slate-700'>Drag and drop foto</p>
                <p className='text-xs text-slate-500'>atau klik untuk memilih</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-1'>
                {files.slice(0, 2).map((file, index) => (
                  <div key={`${file.name}-${index}`} className='group interactive-lift relative h-[108px] w-[108px] overflow-hidden rounded-2xl ring-1 ring-emerald-200'>
                    <img
                      src={URL.createObjectURL(file)}
                      alt='Pratinjau bukti laporan'
                      className='h-full w-full object-cover'
                    />
                    <button
                      type='button'
                      onClick={() => removeFile(index)}
                      className='absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/45'
                    >
                      <X className='h-4 w-4 text-white opacity-0 transition group-hover:opacity-100' />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 text-base font-semibold text-white transition hover:from-emerald-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-75'
        >
          {isSubmitting && <LoaderCircle className='h-4 w-4 animate-spin' />}
          {isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan Sekarang'}
        </button>
      </form>
    </section>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L, { type DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crosshair,
  Filter,
  LocateFixed,
  Search,
  UserRound,
} from 'lucide-react';
import type { AdminDashboardReport, WasteCategory } from '@/components/admin/AdminReportsManagementTable';
import type { Report } from '@/types';

type SeverityLevel = 'critical' | 'medium' | 'low' | 'unknown';

type StatusFilter = 'all' | Report['status'];
type SeverityFilter = 'all' | Exclude<SeverityLevel, 'unknown'>;
type SortMode = 'nearest' | 'oldest-pending';

interface AdminOperationalMapProps {
  reports: AdminDashboardReport[];
  loading: boolean;
  onQuickStatusUpdate: (payload: {
    reportId: string;
    nextStatus: Report['status'];
    note: string;
  }) => Promise<void>;
}

interface GeocodedPoint {
  lat: number;
  lng: number;
  source: 'numeric' | 'text';
}

interface MapReport extends AdminDashboardReport {
  lat: number;
  lng: number;
  coordinateSource: GeocodedPoint['source'];
  severity: SeverityLevel;
  markerColor: string;
}

const CAMPUS_CENTER = { lat: -6.8986, lng: 107.6366 };

const statusColors: Record<Report['status'], string> = {
  pending: '#dc2626',
  'in-progress': '#d97706',
  done: '#059669',
};

const statusLabels: Record<Report['status'], string> = {
  pending: 'Kritis / Belum Ditangani',
  'in-progress': 'Sedang Diproses',
  done: 'Selesai / Bersih',
};

const severityStyles: Record<SeverityLevel, { label: string; ring: string }> = {
  critical: { label: 'Kritis', ring: 'ring-rose-200 bg-rose-50 text-rose-700' },
  medium: { label: 'Sedang', ring: 'ring-amber-200 bg-amber-50 text-amber-700' },
  low: { label: 'Ringan', ring: 'ring-emerald-200 bg-emerald-50 text-emerald-700' },
  unknown: { label: 'Tidak Diketahui', ring: 'ring-slate-200 bg-slate-50 text-slate-600' },
};

function parseCoordinateText(value: string): GeocodedPoint | null {
  const match = value.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng, source: 'text' };
}

function pickNumber(report: AdminDashboardReport, keys: readonly string[]): number | null {
  const record = report as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
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

function resolveCoordinates(report: AdminDashboardReport): GeocodedPoint | null {
  const lat = pickNumber(report, ['latitude', 'lat']);
  const lng = pickNumber(report, ['longitude', 'lng', 'long', 'lon']);

  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng, source: 'numeric' };
  }

  const textCoordinate = parseCoordinateText(report.location);
  if (textCoordinate) {
    return textCoordinate;
  }

  const mapsCoordinate = parseCoordinateText(report.mapsQuery);
  if (mapsCoordinate) {
    return mapsCoordinate;
  }

  return null;
}

function resolveSeverity(report: AdminDashboardReport): SeverityLevel {
  const record = report as unknown as Record<string, unknown>;
  const rawSeverity = [
    record.severity,
    record.level,
    record.tingkat,
    record.priority,
    record.urgency,
  ]
    .find((value) => typeof value === 'string')
    ?.toString()
    .toLowerCase();

  if (rawSeverity) {
    if (['critical', 'high', 'tinggi', 'kritis', 'urgent'].some((keyword) => rawSeverity.includes(keyword))) {
      return 'critical';
    }

    if (['medium', 'sedang', 'normal', 'moderat'].some((keyword) => rawSeverity.includes(keyword))) {
      return 'medium';
    }

    if (['low', 'rendah', 'ringan'].some((keyword) => rawSeverity.includes(keyword))) {
      return 'low';
    }
  }

  if (report.status === 'pending') {
    return 'critical';
  }

  if (report.status === 'in-progress') {
    return 'medium';
  }

  if (report.status === 'done') {
    return 'low';
  }

  return 'unknown';
}

function buildMarkerIcon(color: string): DivIcon {
  return L.divIcon({
    className: 'cleantrack-leaflet-marker',
    html: `<span style="--marker-color:${color}" class="marker-dot"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function formatDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return `${(R * c).toFixed(2)} km`;
}

function FlyToLocation({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 17, {
        duration: 0.9,
      });
    }
  }, [map, target]);

  return null;
}

function buildSearchIndex(report: AdminDashboardReport): string {
  return `${report.id} ${report.displayId}`.toLowerCase();
}

export function AdminOperationalMap({
  reports,
  loading,
  onQuickStatusUpdate,
}: AdminOperationalMapProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [wasteFilter, setWasteFilter] = useState<'all' | WasteCategory>('all');
  const [searchId, setSearchId] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('oldest-pending');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isQuickActionSaving, setIsQuickActionSaving] = useState<string | null>(null);

  const mapReports = useMemo<MapReport[]>(() => {
    return reports
      .map((report) => {
        const coordinate = resolveCoordinates(report);
        if (!coordinate) {
          return null;
        }

        const severity = resolveSeverity(report);
        return {
          ...report,
          lat: coordinate.lat,
          lng: coordinate.lng,
          coordinateSource: coordinate.source,
          severity,
          markerColor: statusColors[report.status],
        };
      })
      .filter((report): report is MapReport => report !== null);
  }, [reports]);

  const filteredMapReports = useMemo(() => {
    return mapReports.filter((report) => {
      if (statusFilter !== 'all' && report.status !== statusFilter) {
        return false;
      }

      if (severityFilter !== 'all' && report.severity !== severityFilter) {
        return false;
      }

      if (wasteFilter !== 'all' && report.wasteCategory !== wasteFilter) {
        return false;
      }

      return true;
    });
  }, [mapReports, severityFilter, statusFilter, wasteFilter]);

  const searchResult = useMemo(() => {
    const keyword = searchId.trim().toLowerCase();
    if (!keyword) {
      return null;
    }

    return filteredMapReports.find((report) => buildSearchIndex(report).includes(keyword)) ?? null;
  }, [filteredMapReports, searchId]);

  const focusedPoint = useMemo(() => {
    if (searchResult) {
      return { lat: searchResult.lat, lng: searchResult.lng };
    }

    const selected = filteredMapReports.find((report) => report.id === selectedReportId);
    if (selected) {
      return { lat: selected.lat, lng: selected.lng };
    }

    return null;
  }, [filteredMapReports, searchResult, selectedReportId]);

  const cardReports = useMemo(() => {
    const sorted = [...filteredMapReports];

    if (sortMode === 'nearest') {
      sorted.sort((a, b) => {
        const dA = Number.parseFloat(formatDistanceKm(CAMPUS_CENTER, { lat: a.lat, lng: a.lng }));
        const dB = Number.parseFloat(formatDistanceKm(CAMPUS_CENTER, { lat: b.lat, lng: b.lng }));
        return dA - dB;
      });
    } else {
      sorted.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    return sorted.slice(0, 8);
  }, [filteredMapReports, sortMode]);

  const handleQuickAction = async (report: MapReport, action: 'assign' | 'complete') => {
    const payload =
      action === 'assign'
        ? {
            reportId: report.id,
            nextStatus: 'in-progress' as Report['status'],
            note: 'Ditugaskan dari peta operasional admin.',
          }
        : {
            reportId: report.id,
            nextStatus: 'done' as Report['status'],
            note: 'Diselesaikan cepat dari peta operasional admin.',
          };

    setIsQuickActionSaving(report.id);
    try {
      await onQuickStatusUpdate(payload);
    } finally {
      setIsQuickActionSaving(null);
    }
  };

  const center = useMemo<[number, number]>(() => {
    if (filteredMapReports.length > 0) {
      return [filteredMapReports[0].lat, filteredMapReports[0].lng];
    }

    return [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng];
  }, [filteredMapReports]);

  return (
    <div className='grid min-h-[calc(100vh-16rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
      <section className='relative overflow-hidden rounded-[30px] border border-emerald-100 bg-[radial-gradient(circle_at_16%_14%,rgba(16,185,129,0.17),transparent_36%),radial-gradient(circle_at_86%_6%,rgba(52,211,153,0.14),transparent_30%),linear-gradient(180deg,#f6fdf8_0%,#eff8f3_58%,#ebf6f0_100%)] p-3 sm:p-4'>
        <div className='absolute left-6 top-6 z-[500] flex w-[min(780px,calc(100%-3rem))] flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/80 bg-white/95 p-2 shadow-[0_20px_34px_-26px_rgba(6,78,59,0.7)] backdrop-blur'>
          <div className='flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'>
            <Filter className='h-3.5 w-3.5' />
            Filter Layer
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className='h-9 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300'
          >
            <option value='all'>Semua Status</option>
            <option value='pending'>Kritis / Pending</option>
            <option value='in-progress'>Sedang Diproses</option>
            <option value='done'>Selesai</option>
          </select>

          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
            className='h-9 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300'
          >
            <option value='all'>Semua Keparahan</option>
            <option value='critical'>Kritis</option>
            <option value='medium'>Sedang</option>
            <option value='low'>Ringan</option>
          </select>

          <select
            value={wasteFilter}
            onChange={(event) => setWasteFilter(event.target.value as 'all' | WasteCategory)}
            className='h-9 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300'
          >
            <option value='all'>Semua Kategori Sampah</option>
            <option value='organik'>Organik</option>
            <option value='anorganik'>Anorganik</option>
          </select>

          <div className='relative ml-auto min-w-[220px] flex-1'>
            <Search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400' />
            <input
              value={searchId}
              onChange={(event) => setSearchId(event.target.value)}
              placeholder='Cari ID laporan untuk fly-to...'
              className='h-9 w-full rounded-xl border border-emerald-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-300'
            />
          </div>
        </div>

        <div className='absolute right-6 top-[4.8rem] z-[500] rounded-2xl border border-emerald-200 bg-white/95 p-2 text-xs shadow-[0_16px_30px_-22px_rgba(6,78,59,0.75)] backdrop-blur'>
          <div className='mb-1 flex items-center gap-1.5 font-semibold text-slate-700'>
            <Crosshair className='h-3.5 w-3.5 text-emerald-600' />
            Legenda Marker
          </div>
          <div className='space-y-1 text-slate-600'>
            <p className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-full bg-rose-600' />
              Kritis / Pending
            </p>
            <p className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-full bg-amber-500' />
              Sedang Diproses
            </p>
            <p className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-full bg-emerald-600' />
              Selesai
            </p>
          </div>
        </div>

        <div className='h-[calc(100vh-19rem)] min-h-[560px] overflow-hidden rounded-[24px] border border-emerald-100'>
          <MapContainer
            center={center}
            zoom={14}
            scrollWheelZoom
            className='h-full w-full'
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            />

            <FlyToLocation target={focusedPoint} />

            {filteredMapReports.map((report) => {
              const icon = buildMarkerIcon(report.markerColor);
              const severityInfo = severityStyles[report.severity];

              return (
                <Marker
                  key={report.id}
                  position={[report.lat, report.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedReportId(report.id),
                  }}
                >
                  <Tooltip direction='top' offset={[0, -12]}>
                    <span className='text-xs font-semibold'>{report.displayId}</span>
                  </Tooltip>

                  <Popup minWidth={280} maxWidth={320} className='cleantrack-popup'>
                    <div className='space-y-3'>
                      <div className='overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/60'>
                        {report.imageUrl ? (
                          <Image
                            src={report.imageUrl}
                            alt={`Bukti ${report.displayId}`}
                            width={520}
                            height={300}
                            unoptimized
                            className='h-36 w-full object-cover'
                          />
                        ) : (
                          <div className='flex h-36 items-center justify-center text-xs text-slate-500'>Tidak ada foto</div>
                        )}
                      </div>

                      <div>
                        <p className='text-sm font-extrabold text-slate-900'>{report.displayId}</p>
                        <p className='mt-1 line-clamp-2 text-xs text-slate-600'>{report.description}</p>
                      </div>

                      <div className='flex flex-wrap items-center gap-1.5 text-[11px]'>
                        <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700'>
                          <UserRound className='h-3 w-3' />
                          {report.reporterName}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-1 font-semibold ring-1 ${severityInfo.ring}`}>
                          {severityInfo.label}
                        </span>
                        <span className='inline-flex rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200'>
                          {statusLabels[report.status]}
                        </span>
                      </div>

                      <div className='grid grid-cols-2 gap-2'>
                        <button
                          type='button'
                          onClick={() => void handleQuickAction(report, 'assign')}
                          disabled={isQuickActionSaving === report.id || report.status === 'in-progress'}
                          className='inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          Tugaskan Petugas
                        </button>

                        <button
                          type='button'
                          onClick={() => void handleQuickAction(report, 'complete')}
                          disabled={isQuickActionSaving === report.id || report.status === 'done'}
                          className='inline-flex h-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          Selesaikan Laporan
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {filteredMapReports.map((report) => (
              <Circle
                key={`${report.id}-halo`}
                center={[report.lat, report.lng]}
                radius={report.status === 'pending' ? 36 : report.status === 'in-progress' ? 26 : 16}
                pathOptions={{
                  color: report.markerColor,
                  fillColor: report.markerColor,
                  fillOpacity: 0.14,
                  weight: 1,
                }}
              />
            ))}
          </MapContainer>
        </div>

        <div className='absolute bottom-6 left-6 z-[500] rounded-2xl border border-emerald-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-[0_14px_28px_-22px_rgba(6,78,59,0.75)]'>
          {loading ? 'Memuat titik laporan...' : `${filteredMapReports.length} titik tampil di peta`}
          {searchResult ? ` • Fokus: ${searchResult.displayId}` : ''}
        </div>
      </section>

      <aside className='flex h-[calc(100vh-16rem)] min-h-[560px] flex-col overflow-hidden rounded-[30px] border border-emerald-100 bg-white/95 shadow-[0_20px_40px_-28px_rgba(6,78,59,0.35)]'>
        <div className='border-b border-emerald-100 p-4'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-base font-black text-slate-900'>Laporan Prioritas</h3>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className='h-8 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300'
            >
              <option value='oldest-pending'>Paling Lama Pending</option>
              <option value='nearest'>Terdekat dari Kampus</option>
            </select>
          </div>
          <p className='mt-1 text-xs text-slate-500'>Daftar ini sinkron dengan filter layer pada peta.</p>
        </div>

        <div className='flex-1 space-y-2 overflow-y-auto p-3'>
          {loading ? (
            <p className='rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-slate-600'>Memuat daftar laporan...</p>
          ) : cardReports.length === 0 ? (
            <p className='rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-sm text-slate-600'>
              Tidak ada laporan dengan filter saat ini.
            </p>
          ) : (
            cardReports.map((report) => {
              const severityInfo = severityStyles[report.severity];
              const distance = formatDistanceKm(CAMPUS_CENTER, { lat: report.lat, lng: report.lng });

              return (
                <button
                  key={report.id}
                  type='button'
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setSearchId(report.displayId);
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedReportId === report.id
                      ? 'border-emerald-300 bg-emerald-50/80 shadow-[0_14px_24px_-20px_rgba(6,78,59,0.5)]'
                      : 'border-emerald-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <p className='text-sm font-bold text-slate-900'>{report.displayId}</p>
                      <p className='mt-0.5 line-clamp-1 text-xs text-slate-600'>{report.mapsLabel}</p>
                    </div>

                    {report.status === 'pending' ? (
                      <AlertTriangle className='h-4 w-4 text-rose-600' />
                    ) : report.status === 'in-progress' ? (
                      <Clock3 className='h-4 w-4 text-amber-500' />
                    ) : (
                      <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                    )}
                  </div>

                  <div className='mt-2 flex flex-wrap items-center gap-1.5 text-[11px]'>
                    <span className={`rounded-full px-2 py-1 font-semibold ring-1 ${severityInfo.ring}`}>
                      {severityInfo.label}
                    </span>
                    <span className='rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700'>
                      {distance}
                    </span>
                    <span className='rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200'>
                      {statusLabels[report.status]}
                    </span>
                    <span className='rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600'>
                      {new Date(report.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className='border-t border-emerald-100 p-3 text-xs text-slate-500'>
          <div className='flex items-center justify-between'>
            <span className='inline-flex items-center gap-1'>
              <LocateFixed className='h-3.5 w-3.5 text-emerald-600' />
              Pusat referensi: Kampus Itenas
            </span>
            <span>{cardReports.length} ditampilkan</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

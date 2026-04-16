import type { AuthResponse, Officer, Report } from '@/types';
import api from '@/lib/axios';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickFirstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizeStatus(value: unknown): Report['status'] {
  if (typeof value !== 'string') {
    return 'pending';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'done' || normalized === 'in-progress' || normalized === 'pending') {
    return normalized as Report['status'];
  }

  if (normalized === 'process' || normalized === 'in_progress' || normalized === 'progress' || normalized === 'processing') {
    return 'in-progress';
  }

  if (normalized === 'completed' || normalized === 'selesai') {
    return 'done';
  }

  return 'pending';
}

function unwrapData(payload: unknown): unknown {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

function normalizeReportRecord(rawReport: unknown): Report {
  const record = isRecord(rawReport) ? rawReport : {};
  const createdAt = pickFirstString(record, ['createdAt', 'created_at']) ?? new Date().toISOString();
  const updatedAt = pickFirstString(record, ['updatedAt', 'updated_at']) ?? createdAt;

  const normalizedBase: Report = {
    id: pickFirstString(record, ['id', 'ID']) ?? 'UNKNOWN',
    reporterName: pickFirstString(record, ['reporterName', 'namaPelapor', 'nama_pelapor']) ?? 'Tanpa Nama',
    location: pickFirstString(record, ['location', 'lokasi', 'address', 'alamat']) ?? 'Lokasi tidak tersedia',
    description: pickFirstString(record, ['description', 'deskripsi']) ?? '-',
    imageUrl: pickFirstString(record, ['imageUrl', 'imageURL', 'fotoURL', 'fotoUrl']) ?? undefined,
    imageThumbnail: pickFirstString(record, ['imageThumbnail', 'thumbnailUrl', 'thumbnailURL', 'fotoThumbnail']) ?? undefined,
    status: normalizeStatus(record.status),
    createdAt,
    updatedAt,
  };

  // Keep extra backend fields (lat/lng/severity/others) for richer UI modules like map overlays.
  return {
    ...(record as unknown as Report),
    ...normalizedBase,
  };
}

function normalizeReport(payload: unknown): Report {
  return normalizeReportRecord(unwrapData(payload));
}

function normalizeReports(payload: unknown): Report[] {
  const source = unwrapData(payload);
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => normalizeReportRecord(item));
}

function extractMessage(payload: unknown, fallbackMessage: string): string {
  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  const message = payload.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }

  return fallbackMessage;
}

export const reportService = {
  async createReport(
    data: FormData
  ): Promise<{ id: string; message: string }> {
    const response = await api.post('/api/reports', data);

    const report = normalizeReport(response.data);
    return {
      id: report.id,
      message: extractMessage(response.data, 'laporan berhasil dibuat'),
    };
  },

  async getReports(): Promise<Report[]> {
    const response = await api.get('/api/reports');
    return normalizeReports(response.data);
  },

  async getReport(id: string): Promise<Report> {
    const response = await api.get(`/api/reports/${id}`);
    return normalizeReport(response.data);
  },

  async updateReportStatus(id: string, status: Report['status'], note?: string): Promise<Report> {
    const payload: Record<string, string> = { status };

    if (note && note.trim().length > 0) {
      payload.note = note.trim();
    }

    const response = await api.patch(`/api/reports/${id}`, payload);
    return normalizeReport(response.data);
  },

  async updateReportFollowUp(
    id: string,
    payload: {
      status: Report['status'];
      note?: string;
      cleanupPhoto?: File;
    }
  ): Promise<Report> {
    const { status, note, cleanupPhoto } = payload;

    if (cleanupPhoto) {
      const formData = new FormData();
      formData.append('status', status);

      if (note && note.trim().length > 0) {
        formData.append('note', note.trim());
      }

      formData.append('cleanupPhoto', cleanupPhoto);

      try {
        const response = await api.patch(`/api/reports/${id}/follow-up`, formData);

        return normalizeReport(response.data);
      } catch {
        // Fallback to status-only endpoint if follow-up upload endpoint is unavailable.
      }
    }

    return reportService.updateReportStatus(id, status, note);
  },

  async deleteReport(id: string): Promise<{ message?: string }> {
    const response = await api.delete(`/api/reports/${id}`);
    return response.data;
  },
};

type AuthApiResponse = Partial<AuthResponse> & {
  message?: string;
};

export const authService = {
  async register(email: string, username: string, password: string): Promise<AuthApiResponse> {
    const response = await api.post('/auth/register', { email, username, password });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthApiResponse> {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export const officerService = {
  async getOfficers(): Promise<Officer[]> {
    const response = await api.get('/api/officers');
    return response.data;
  },

  async getOfficerById(id: string): Promise<Officer> {
    const response = await api.get(`/api/officers/${id}`);
    return response.data;
  },

  async createOfficer(payload: { email: string; username: string; password: string }): Promise<{ message?: string; user?: Officer }> {
    const response = await api.post('/api/officers', payload);
    return response.data;
  },

  async updateOfficer(
    id: string,
    payload: { email?: string; username?: string; password?: string }
  ): Promise<{ message?: string; user?: Officer }> {
    const response = await api.patch(`/api/officers/${id}`, payload);
    return response.data;
  },

  async deleteOfficer(id: string): Promise<{ message?: string }> {
    const response = await api.delete(`/api/officers/${id}`);
    return response.data;
  },
};

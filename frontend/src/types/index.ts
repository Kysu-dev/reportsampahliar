export interface Report {
  id: string;
  reporterName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  description: string;
  imageUrl?: string;
  imageThumbnail?: string;
  status: 'pending' | 'in-progress' | 'done';
  severity?: string;
  nomorWA?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFormData {
  reporterName: string;
  location: string;
  description: string;
  file?: File;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface Officer {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
}

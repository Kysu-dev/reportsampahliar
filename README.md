# UTS Komputasi Awan - CleanTrack

## Identitas Mahasiswa
- Nama: Raelqiansyah Putranta Dibrata
- NRP: 152023167

## Deskripsi Singkat Tugas
CleanTrack adalah aplikasi pelaporan sampah liar berbasis web dengan arsitektur terpisah:
- Backend: Golang (Gin + GORM + MySQL)
- Frontend: Next.js
- Orkestrasi: Docker Compose

Fitur utama:
- Pelaporan sampah oleh masyarakat.
- Dashboard admin dan petugas untuk memantau laporan.
- Manajemen data petugas oleh admin.

## Struktur Proyek
- backend: API, autentikasi, manajemen laporan, dan koneksi database MySQL.
- frontend: antarmuka pengguna untuk landing page, admin, dan petugas.
- docker-compose.yml: konfigurasi menjalankan backend dan frontend dalam container.

## Cara Menjalankan Proyek
1. Pastikan MySQL lokal aktif dan database reportsampah sudah tersedia.
2. Jalankan dari root proyek:

```bash
docker compose up --build
```

3. Akses aplikasi:
- Frontend: http://3.238.195.18/
- Backend API: -

## Konfigurasi Database
Konfigurasi default saat ini menggunakan database:
- DB_NAME=reportsampah

Jika ingin mengganti database, sesuaikan variabel environment DB_HOST, DB_PORT, DB_USER, DB_PASS, dan DB_NAME.

## Akun Dummy
Akun dummy otomatis dibuat saat backend startup (jika belum ada):

- Admin
  - Email: admin@cleantrack.local
  - Password: admin123

- Petugas
  - Email: petugas@cleantrack.local
  - Password: petugas123

Catatan:
- Kredensial akun dummy dapat diubah melalui environment variable ADMIN_* dan OFFICER_*.

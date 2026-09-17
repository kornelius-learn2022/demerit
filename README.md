# Sistem Poin Pelanggaran & Kedisiplinan Siswa (Student Demerit System)

Sistem informasi manajemen kedisiplinan dan pencatatan poin pelanggaran (*demerit points*) siswa sekolah dasar dengan sistem skor progresif, notifikasi silang dua arah, dan manajemen berbasis peran (*role-based access control*).

---

## 🌟 Fitur Utama

- **Sistem Poin Disiplin Progresif**:
  - Baseline poin awal standar: **150 Poin**.
  - Ambang batas aman: Skor $\ge 120$ poin ($< 30$ demerit akumulasi).
  - Peringatan perhatian khusus: Skor $< 120$ poin ($\ge 30$ demerit akumulasi $\rightarrow$ Wajib Pemanggilan Orang Tua & Konseling).
- **Akses Berbasis Peran (RBAC)**:
  - **Administrator**: Kontrol penuh master data (siswa, kelas, aturan pelanggaran, tahun ajaran, manajemen guru, export/import).
  - **Guru Kelas / Wali Kelas (`pc1`)**: Memantau siswa kelas binaan (3A-3E, 4A-4D), mencatat demerit, serta **berhak menghapus catatan demerit siswa di kelasnya**.
  - **Guru Mata Pelajaran (`subject`)**: Mencatat pelanggaran kedisiplinan pada kelas-kelas yang diajar serta mengelola demerit yang dicatatnya.
- **Notifikasi Silang Real-time (Cross-Notifications)**:
  - **Saat Demerit Dicatat**:
    - Guru Mapel mencatat demerit $\rightarrow$ Wali Kelas menerima notifikasi seketika.
    - Wali Kelas mencatat demerit $\rightarrow$ Guru Mapel menerima notifikasi.
  - **Saat Demerit Dihapus**:
    - Wali Kelas menghapus demerit $\rightarrow$ Guru Mapel menerima notifikasi rincian penghapusan.
    - Guru Mapel menghapus demerit $\rightarrow$ Wali Kelas menerima notifikasi.
  - Dropdown lonceng interaktif: badge counter otomatis hilang saat lonceng dibuka atau tombol *Tandai sudah dibaca* diklik.
- **Fitur Ubah Nama Mandiri**:
  - Wali Kelas dan Guru Mata Pelajaran dapat langsung mengubah nama tampilan melalui modal profil tanpa perlu logout/login.
- **Login Fleksibel & Ramah Pengguna**:
  - Login dapat menggunakan username/panggilan dengan atau tanpa gelar *Ms/Mr/Bu/Pak*, huruf besar/kecil, atau tanda baca (contoh: `tina`, `ms tina`, `Ms. Tina`, `ferdi`, `Mr Ferdi`).
- **Export & Import Excel Asli Multi-Kolom**:
  - Ekspor data siswa, pelanggaran, dan guru ke format Excel `.xlsx` multi-kolom ber-styling rapi.
  - Impor batch data siswa, pengguna, dan pelanggaran via file Excel `.xlsx` / `.csv`.
- **Dukungan Dwibahasa (Bilingual)**:
  - Tersedia dalam Bahasa Indonesia dan Bahasa Inggris secara dinamis.

---

## 🏗️ Struktur Repositori

```
demerit/
├── student-punishment-api/      # Backend API (Laravel 10, PHP 8.2, SQLite)
│   ├── app/
│   │   ├── Http/Controllers/   # Auth, Punishment, Notification, Student, etc.
│   │   ├── Models/             # User, Student, Classroom, Punishment, Notification
│   │   ├── Policies/           # PunishmentPolicy (Scoping & Deletion Rights)
│   │   └── Services/           # StudentScoreService, CsvService (PhpSpreadsheet)
│   ├── database/
│   │   ├── database.sqlite     # Database SQLite pra-terkonfigurasi & terisi data
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   └── composer.json
│
├── student-punishment-web/      # Frontend Web (React 18, Vite, TypeScript, Tailwind)
│   ├── src/
│   │   ├── api/                # Axios API clients
│   │   ├── components/         # Layout, Modals, Tables, NotificationDropdown
│   │   ├── pages/              # Dashboard, Students, Punishments, Admin Pages
│   │   ├── stores/             # Zustand stores (AuthStore & LanguageStore)
│   │   └── types/              # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Panduan Menjalankan Sistem

### 1. Backend (Laravel API)

1. Masuk ke direktori backend:
   ```bash
   cd student-punishment-api
   ```
2. Pastikan PHP 8.2+ dengan ekstensi `pdo_sqlite` dan `gd` telah aktif.
3. Pasang dependensi:
   ```bash
   composer install
   ```
4. Salin file `.env`:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
5. Jalankan migrasi dan seeder (opsional bila menggunakan `database.sqlite` bawaan):
   ```bash
   php artisan migrate --seed
   ```
6. Jalankan server Laravel:
   ```bash
   php artisan serve --port=8000
   ```
   API akan aktif di `http://127.0.0.1:8000`.

---

### 2. Frontend (React + Vite)

1. Masuk ke direktori frontend:
   ```bash
   cd student-punishment-web
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembang:
   ```bash
   npm run dev
   ```
   Aplikasi web akan dapat diakses di `http://localhost:5173`.

---

## 👥 Akun & Peran Bawaan

Semua akun menggunakan password default: `password`

| Role | Username / Panggilan | Nama Guru | Kelas Binaan |
|---|---|---|---|
| **Administrator** | `admin` | Administrator | Sistem |
| **Guru Kelas (PC1)** | `tina` (atau `Ms Tina`) | Ms Tina (Wali Kelas 3A) | Kelas 3A |
| **Guru Kelas (PC1)** | `etha` (atau `Ms Etha`) | Ms Etha (Wali Kelas 3B) | Kelas 3B |
| **Guru Kelas (PC1)** | `icha` (atau `Ms Icha`) | Ms Icha (Wali Kelas 3C) | Kelas 3C |
| **Guru Kelas (PC1)** | `fefe` (atau `Ms Fefe`) | Ms Fefe (Wali Kelas 3D) | Kelas 3D |
| **Guru Kelas (PC1)** | `nathali` (atau `Ms Nathali`) | Ms Nathali (Wali Kelas 3E) | Kelas 3E |
| **Guru Kelas (PC1)** | `sharon` (atau `Ms Sharon`) | Ms Sharon (Wali Kelas 4A) | Kelas 4A |
| **Guru Kelas (PC1)** | `lia` (atau `Ms Lia`) | Ms Lia (Wali Kelas 4B) | Kelas 4B |
| **Guru Kelas (PC1)** | `fosa` (atau `Ms Fosa`) | Ms Fosa (Wali Kelas 4C) | Kelas 4C |
| **Guru Kelas (PC1)** | `ferdi` (atau `Mr Ferdi`) | Mr Ferdi (Wali Kelas 4D) | Kelas 4D |
| **Guru Mapel (Subject)** | Didaftarkan oleh Admin / Seeder | Guru Mata Pelajaran | Sesuai Penugasan |

---

## 📄 Lisensi
Hak Cipta (c) 2026. Seluruh hak cipta dilindungi undang-undang.
# 🏫 Sistem Informasi SPMB & Integrasi TU - SMA Muhammadiyah 3 Yogyakarta

Sistem terintegrasi berbasis Web Modular dengan prinsip **Single Source of Truth (SSoT)** untuk proses Penerimaan Siswa Baru hingga tata usaha (TU) tanpa input berulang.

---

## 👥 Pembagian Tugas & Modul Tim

| Modul | Deskripsi Modul | Penanggung Jawab (Developer) |
|---|---|---|
| `01_portal_spmb` | Portal Utama Pendaftaran Siswa Baru | **Yosa** |
| `02_admin_spmb` | Admin & Aktivasi Akun Pendaftar | **Yosa** |
| `03_keuangan_spmb` | Konfirmasi & Pembayaran Biaya SPMB | **Yosa** |
| `04_wawancara_spmb` | Input Nilai Wawancara & Pemetaan Jurusan | **Yosa** |
| `05_kelulusan_spmb` | Pengumuman Kelulusan Siswa Baru | **Yosa** |
| `06_verifikasi_loket` | Loket Daftar Ulang & Penyerahan Berkas | **Yosa** |
| `07_pengelolaan_data` | Lock & Validasi Data Final | **Yosa** |
| `08_basis_data_tu` | Schema Single Source of Truth TU | **Raudhatul** |
| `09_pemanfaatan_tu` | Dashboard Access TU (Tanpa Input Ulang) | **Raudhatul** |
| `10_executive_report` | Laporan Kepala Sekolah & Yayasan | **Novelia** |

---

## 🛠️ Aturan Pengembangan Paralel (Git Workflow)

1. **Struktur Terpisah**: Setiap modul berdiri di foldernya masing-masing dalam `modules/`.
2. **Import Terpusat**: Semua modul menggunakan data store terintegrasi melalui `import { db } from '../../config/database.js'`.
3. **Pengerjaan Branch**:
   - Yosa: `feature/spmb-yosa`
   - Raudhatul: `feature/tu-raudhatul`
   - Novelia: `feature/executive-novelia`
4. **Bebas Conflict**: Jangan mengubah file modul milik developer lain untuk menghindari merge conflict.

---

## 🚀 Cara Menjalankan Lokal
Buka file `index.html` menggunakan Live Server (VS Code Extension) atau local server HTTP (misal: `npx serve .` atau Python HTTP server) agar fiturnya berjalan dengan ESM (ECMAScript Modules).

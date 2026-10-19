# 🏢 Modul 09: Pemanfaatan Data Tata Usaha (TU Dashboard)

**SMA Muhammadiyah 3 Yogyakarta — Sistem Integrasi SPMB & TU**  
*Single Source of Truth (SSoT) Architecture*

---

## 📌 Informasi Modul

| Atribut | Keterangan |
|---|---|
| **Kode Modul** | `09_pemanfaatan_tu` |
| **Nama Modul** | Pemanfaatan Data Tata Usaha / Dashboard Access TU |
| **Penanggung Jawab (Single Accountable)** | **Raudhatul Audyna** *(Didukung Novelia Harlinda untuk UI/UX Dashboard)* |
| **Alur Terkait** | **Alur 15** *(Bagian Tata Usaha Mengakses Data Siswa Baru Secara Langsung Tanpa Input Ulang)* |
| **Layer Arsitektur** | **Presentation & Application Layer** |
| **Strategi Implementasi** | **Agile** *(Membutuhkan fleksibilitas dan feedback langsung staf TU)* |
| **Solusi Masalah Utama** | **Solusi Masalah M2 (Eliminasi Silo Data & Zero Re-entry Data >= 90%)** |

---

## 🎯 Tujuan & Nilai Bisnis

Modul ini adalah muara pemanfaatan data calon peserta didik yang telah melalui seluruh rangkaian seleksi SPMB (pendaftaran, verifikasi akun, pembayaran uang pangkal, wawancara, kelulusan, dan loket berkas fisik) hingga dikunci di Modul 07 (`VERIFIED_LOCKED`).

### Manfaat Utama:
1. **Zero Data Re-entry (0% Ketik Ulang Manual)**: Menghapus kebiasaan lama staf TU mengetik ulang formulir fisik ratusan siswa baru ke dalam Excel atau Buku Induk.
2. **Integritas SSoT**: Semua perubahan data kelas dan buku induk tersimpan langsung ke basis data terpadu `m3_spmb_tu_db`.
3. **Akselerasi Penempatan Rombel**: Penempatan rombongan belajar (X-MIPA-1 s/d X-IPS-2) dilakukan secara instan berdasarkan kuota dan hasil seleksi Modul 04.
4. **Kesiapan Sinkronisasi Dapodik**: Menyediakan generator ekspor data berstandar Dapodik Kemdikbudristek.

---

## 🛠️ Fitur-Fitur Utama

1. **Dashboard Buku Induk Siswa**:
   - Menampilkan seluruh pendaftar berstatus `VERIFIED_LOCKED` dari SPMB.
   - Penomoran otomatis Buku Induk Siswa (format `M3-2026-XXXX`).
   - Fitur pencarian cepat dan filter berbasis peminatan jurusan.
2. **Manajemen Rombongan Belajar (Rombel)**:
   - Visualisasi progres keterisian kelas X (kuota maks. 36 siswa per rombel).
   - Fitur distribusi otomatis siswa ke kelas berdasarkan minat dan ketersediaan kursi.
3. **Pencatatan Kontak Darurat & Ekstrakurikuler**:
   - Validasi nomor WhatsApp/telepon wali murid untuk kebutuhan darurat kesiswaan.
   - Pemetaan bakat siswa ke ekstrakurikuler kepanduan Hizbul Wathan, Tapak Suci, Robotik, PMR, dll.
4. **Formulir Resmi Buku Induk (Print Ready)**:
   - Fitur cetak dokumen lembar Buku Induk resmi berkop SMA Muhammadiyah 3 Yogyakarta lengkap dengan lembar tanda tangan Kepala TU.
5. **Ekspor Dapodik (.CSV)**:
   - Pengunduhan dataset siswa baru dalam format tabel yang siap diimpor ke aplikasi Dapodik.

---

## 💻 Struktur File Modul

```
modules/09_pemanfaatan_tu/
├── README.md             # Dokumentasi teknis & fungsional modul
├── tu_dashboard.css      # Stylesheet terisolasi, responsive, & modern design
├── tu_dashboard.html     # Standalone runner untuk pengujian mandiri di browser
└── tu_dashboard.js       # Core engine, SSoT reactive state, & business actions
```

---

## 🚀 Pengujian Mandiri

1. **Melalui Portal Integrasi Utama**:
   Buka `index.html` pada browser, lalu klik tab navigasi **09. Dashboard TU**.
2. **Melalui Standalone Runner**:
   Buka langsung file `modules/09_pemanfaatan_tu/tu_dashboard.html` melalui HTTP Live Server.

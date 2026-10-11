# 📖 Modul 01: Portal Utama SPMB (Handover & Contract Docs)

Dokumentasi resmi untuk **Modul 01: Portal SPMB** (Titik Masuk Pendaftar/Siswa). File ini menjelaskan kontrak data baku, *data lifecycle*, serta panduan integrasi *handover* untuk Modul 02 (Admin SPMB), Modul 03 (Keuangan SPMB), dan Modul 04 (Wawancara).

---

## 1. 📄 Struktur JSON Data Contract (`spmb_pendaftar_db`)

Seluruh data pendaftar disimpan di `localStorage` menggunakan key baku: **`spmb_pendaftar_db`**.

### Contoh Skema JSON Baku:
```json
{
  "id_pendaftar": "REG-2026-001",
  "nama_lengkap": "Budi Santoso",
  "email": "budi@email.com",
  "no_wa": "081234567890",
  "nisn": "1234567890",
  "status_akun": "active",
  "created_at": "2026-10-05T08:00:00Z",
  "biodata": {
    "nik": "3171012345678901",
    "alamat": "Jl. Merdeka No. 10",
    "asal_sekolah": "SMPN 1 Jakarta",
    "nama_orang_tua": "Siti Aminah",
    "pilihan_jurusan": "MIPA"
  },
  "berkas": {
    "ijazah": {
      "nama_file": "ijazah_smp_budi.pdf",
      "size": "1.4 MB",
      "ukuran_kb": 1400,
      "tipe": "application/pdf",
      "tgl_unggah": "05 Okt 2026",
      "status": "verified",
      "data_url": "data:application/pdf;base64,..."
    },
    "kk": {
      "nama_file": "kartu_keluarga_budi.jpg",
      "size": "920 KB",
      "ukuran_kb": 920,
      "tipe": "image/jpeg",
      "tgl_unggah": "05 Okt 2026",
      "status": "verified",
      "data_url": "data:image/png;base64,..."
    },
    "kartu_keluarga": { /* Alias kk untuk kompatibilitas */ },
    "akta": {
      "nama_file": "akta_kelahiran_budi.jpg",
      "size": "880 KB",
      "ukuran_kb": 880,
      "tipe": "image/jpeg",
      "tgl_unggah": "05 Okt 2026",
      "status": "verified",
      "data_url": "data:image/png;base64,..."
    },
    "akta_kelahiran": { /* Alias akta untuk kompatibilitas */ },
    "bukti_bayar": {
      "nama_file": "bukti_bayar_001.png",
      "size": "450 KB",
      "ukuran_kb": 450,
      "data_url": "data:image/png;base64,..."
    }
  },
  "pembayaran": {
    "file_bukti": "bukti_bayar_001.png",
    "file_data_url": "data:image/png;base64,...",
    "status_pembayaran": "pending_verification"
  }
}
```

---

## 2. 📊 Tabel Lifecycle Status Data

| Field Status | Nilai Status (*Value*) | Deskripsi Trajektori & Triggers | Modul Pengubah Utama |
| :--- | :--- | :--- | :--- |
| **`status_akun`** | `pending_activation` | Default saat siswa pertama kali registrasi akun awal. Formulir masih locked. | **Modul 1** (Portal SPMB) |
| **`status_akun`** | `active` | Akun telah diaktivasi oleh Admin. Siswa berhak mengisi & mengirim Formulir. | **Modul 2** (Admin SPMB) |
| **`status_pembayaran`** | `pending_verification` | Default saat siswa mengirim formulir biodata & upload file bukti bayar. | **Modul 1** (Portal SPMB) |
| **`status_pembayaran`** | `verified` | Bukti bayar dinyatakan sah & valid oleh tim Keuangan. | **Modul 3** (Keuangan SPMB) |
| **`status_pembayaran`** | `rejected` | Bukti bayar tidak valid / ditolak oleh tim Keuangan. | **Modul 3** (Keuangan SPMB) |

---

## 3. 🧪 Panduan Testing Handover Antar-Modul

### A. Handover ke Modul 2 (Admin SPMB)
1. Modul 2 membaca seluruh data siswa via helper `getPendaftarList()`.
2. Admin memverifikasi identitas awal, lalu memanggil fungsi:
   ```javascript
   import { updateStatusAkun } from './modules/01_portal_spmb/utils.js';
   updateStatusAkun('REG-2026-001', 'active');
   ```
3. Akun siswa kini aktif (`active`), sehingga siswa dapat mengisi Formulir Pendaftaran di Modul 1.

### B. Handover ke Modul 3 (Keuangan SPMB)
1. Setelah siswa mengirim Formulir Lengkap & Bukti Bayar, `status_pembayaran` berstatus `pending_verification`.
2. Modul 3 Keuangan membaca objek `pendaftar.pembayaran.file_bukti`.
3. Tim Keuangan melakukan verifikasi lalu memperbarui status:
   ```javascript
   import { updateStatusPembayaran } from './modules/01_portal_spmb/utils.js';
   // Jika sah:
   updateStatusPembayaran('REG-2026-002', 'verified');
   // Jika tidak sesuai:
   updateStatusPembayaran('REG-2026-002', 'rejected');
   ```

### C. Handover ke Modul 4 (Wawancara SPMB)
1. Modul 4 hanya memproses pendaftar yang sudah berstatus `status_pembayaran === 'verified'`.
2. Pendaftar yang telah diverifikasi siap dijadwalkan untuk sesi wawancara & tes penempatan.

---

## 🛠️ File Utama Modul 01: Portal SPMB
* [`portal.js`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/portal.js): SPA Component Terpadu (Alur 1a, 4, 5, 10) saat dijalankan di `index.html`.
* [`utils.js`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/utils.js): Sinkronisasi dua arah SSoT (`spmb_pendaftar_db` & `m3_spmb_tu_db`), escapeHTML XSS, CRUD, & Event Dispatcher.
* [`dummy-data.js`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/dummy-data.js): Inisialisasi seed data awal pendaftar sampel.
* [`register.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/register.html): Interface Standalone Registrasi Akun Mandiri (Alur 1a).
* [`status-akun.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/status-akun.html): Interface Standalone Status & Notifikasi Aktivasi (Alur 4).
* [`login.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/login.html): Interface Standalone Login Pendaftar.
* [`formulir.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/formulir.html): Interface Standalone Formulir Biodata & Upload Bukti Bayar (Alur 5).
* [`pengumuman.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/pengumuman.html): Interface Standalone Cek Pengumuman Kelulusan Mandiri (Alur 10).

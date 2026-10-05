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
  "status_akun": "pending_activation",
  "created_at": "2026-10-05T08:00:00Z",
  "biodata": {
    "nik": "3171012345678901",
    "alamat": "Jl. Merdeka No. 10",
    "asal_sekolah": "SMPN 1 Jakarta",
    "nama_orang_tua": "Siti Aminah",
    "pilihan_jurusan": "MIPA"
  },
  "pembayaran": {
    "file_bukti": "bukti_bayar_001.png",
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

## 🛠️ File Utama Modul 01
* [`dummy-data.js`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/dummy-data.js): Inisialisasi seed data awal pendaftar sampel A & B.
* [`utils.js`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/utils.js): Fungsi pembantu CRUD & update status untuk dikonsumsi modul lain.
* [`register.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/register.html): Interface Registrasi Akun Awal.
* [`status-akun.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/status-akun.html): Interface Cek Status Aktivasi.
* [`formulir.html`](file:///c:/Users/raudh/.gemini/antigravity-ide/scratch/m3-spmb-system/modules/01_portal_spmb/formulir.html): Interface Formulir Biodata & Upload Bukti.

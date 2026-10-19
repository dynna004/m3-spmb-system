# 🗄️ Modul 08: Basis Data Terintegrasi / SSoT Adapter

Dokumentasi implementasi resmi untuk **Modul 08: Basis Data Terintegrasi / SSoT Adapter** SMA Muhammadiyah 3 Yogyakarta.

Modul ini bertindak sebagai fondasi *Data Layer* yang mengikat seluruh alur data dari Modul 01 hingga Modul 07 dengan modul hilir (Modul 09 Tata Usaha & Modul 10 Executive Report) berdasarkan prinsip **Single Source of Truth (SSoT)**.

---

## 👥 Informasi Modul
- **Penanggung Jawab (Developer)**: Raudhatul Audyna
- **Alur Grand Design**: Jembatan Data antara Alur 14 (Penyimpanan Data Terkunci) dan Alur 15 (Penarikan Data TU tanpa Input Ulang)
- **Strategi Implementasi**: Hybrid
- **Layer Arsitektur**: *Data Layer*
- **Entitas Terhubung**: Modul 01–07 (Produsen Data SPMB), Modul 09 (Konsumen Data TU), Modul 10 (Konsumen Eksekutif).

---

## 🎯 Fitur & Sub-Panel Antarmuka

1. **Header & Metrik Health Check**:
   - Status koneksi storage lokal (`m3_spmb_tu_db`).
   - Total records calon siswa yang tersimpan di sistem.
   - Jumlah siswa yang telah terkunci permanen (`VERIFIED_LOCKED`).
   - Ukuran payload JSON storage (KB).

2. **Tab 1: Visual Relasi Entitas (ERD & Data Flow)**:
   - Memetakan 6 kartu entitas utama sistem SPMB–TU:
     1. Entitas Siswa & Akun (Modul 01/02)
     2. Entitas Keuangan (Modul 03)
     3. Entitas Seleksi & Kelulusan (Modul 04/05)
     4. Entitas Berkas Loket (Modul 06)
     5. Gerbang Lock Data Final (Modul 07)
     6. Entitas Tata Usaha (Modul 09/10)

3. **Tab 2: Kamus Data Interaktif (Data Dictionary)**:
   - Menjelaskan spesifikasi 16 field data penting (nama atribut, tipe data, modul produsen, deskripsi, dan contoh nilai).
   - Dilengkapi bilah pencarian instan (*live search*).

4. **Tab 3: Live JSON Inspector**:
   - Menampilkan data mentah JSON yang sedang aktif di `localStorage` secara terformat dan rapi.
   - Dilengkapi tombol **"📋 Salin JSON"** dan **"💾 Unduh Backup .json"**.

5. **Tab 4: Mesin Uji Integritas Data (Data Validator)**:
   - Mengaudit keunikan NISN (Zero Duplicate).
   - Menguji konsistensi status kunci dan pelunasan uang pangkal.
   - Mengonfirmasi tercapainya eliminasi silo data antara SPMB dan TU.

---

## 🔄 Sinkronisasi Data & Event Dispatcher
- **Database Key**: `m3_spmb_tu_db` (SSoT) dan `spmb_pendaftar_db`.
- **Event Listener**: Mendengarkan event global `spmb_db_updated` dan `db_updated` sehingga setiap kali ada penambahan siswa, pembayaran, kelulusan, atau penguncian data, tampilan Modul 08 langsung diperbarui secara otomatis.

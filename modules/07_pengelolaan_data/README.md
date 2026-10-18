# 🔒 Modul 07: Pengelolaan & Penguncian Data Final SPMB

Dokumentasi implementasi resmi untuk **Modul 07: Pengelolaan & Penguncian Data Final SPMB** (*Data Locking Engine*) SMA Muhammadiyah 3 Yogyakarta.

Modul ini bertanggung jawab atas **Alur 14** dalam Grand Design sistem SPMB–TU: bertindak sebagai gerbang otorisasi final (*Gatekeeper*) untuk membekukan data calon siswa yang telah memenuhi seluruh syarat pendaftaran sebelum diserahkan dan dialirkan ke Basis Data Tata Usaha (Modul 08 & Modul 09).

---

## 👥 Informasi Modul
- **Penanggung Jawab (Developer)**: Yosa
- **Alur Grand Design**: Alur 14 (Validasi & Lock Data Siswa ke Basis Data SSoT TU)
- **Strategi Implementasi**: Waterfall
- **Layer Arsitektur**: *Application / Business Logic Layer*
- **Entitas Terhubung**: Modul 03 (Keuangan), Modul 05 (Kelulusan), Modul 06 (Verifikasi Loket), Modul 08 (Basis Data TU), Modul 09 (Dashboard TU).

---

## 🎯 3 Syarat Mutlak Audit Pra-Kunci (Tripartite Audit Engine)
Sebelum status calon siswa dapat dikunci menjadi `VERIFIED_LOCKED` (`is_locked: true`), sistem melakukan validasi otomatis terhadap 3 syarat:
1. **Syarat 1 (Modul 05 - Kelulusan SPMB)**: Status kelulusan seleksi harus `LULUS`.
2. **Syarat 2 (Modul 03 - Keuangan SPMB)**: Pembayaran uang pangkal / biaya masuk harus `LUNAS`.
3. **Syarat 3 (Modul 06 - Verifikasi Loket)**: Berkas fisik asli (KK, Akta Kelahiran, Ijazah/SKL, Surat Pernyataan) telah diverifikasi dan sah di loket pendaftaran ulang (`TERVERIFIKASI`).

---

## 🛠️ Fitur-Fitur Utama Antarmuka

1. **Dashboard Metrik Ringkas**:
   - Total pendaftar terdata di sistem.
   - Pendaftar yang lolos audit dan berstatus **Siap Kunci (Ready)**.
   - Pendaftar yang telah **Terkunci Resmi ke TU (`VERIFIED_LOCKED`)**.
   - Pendaftar yang belum memenuhi syarat lengkap (**Incomplete**).

2. **Tabel Matriks Audit Interaktif**:
   - Indikator centang audit per pendaftar untuk kelulusan, keuangan, dan kelengkapan berkas fisik loket.
   - Tombol **"🔒 Kunci Data"** per siswa untuk otorisasi individual.
   - Modal detail audit untuk melihat rincian alasan dan catatan verifikator loket.
   - Tombol **"Buka Kunci (Admin Override)"** untuk kebutuhan pengujian ulang / koreksi data.

3. **Batch Lock ("Kunci Semua")**:
   - Membekukan seluruh calon siswa yang telah berstatus siap kunci secara massal dengan 1-klik.

4. **Pintasan Simulasi Pengujian (Demo Testbed)**:
   - Tombol **"⚙️ Simulasi Demo"** memudahkan demonstrasi saat pengujian oleh dosen:
     - Set semua siswa menjadi Lulus + Lunas (Siap Kunci).
     - Reset data ke kondisi awal pengujian.

5. **Log Transparansi & Riwayat Penguncian (Audit Trail)**:
   - Mencatat waktu (*timestamp*), aktor pengunci (*Koordinator SPMB*), dan nomor registrasi siswa yang dikunci ke TU.
   - Menyelesaikan potensi **Resistensi Perubahan Unit SPMB (Masalah M2)** dengan memberikan transparansi dan kepastian bahwa data tidak dapat diubah sepihak setelah diserahkan ke TU.

---

## 🔄 Sinkronisasi Data & Event Dispatcher
- **Database Key**: Menggunakan `spmb_pendaftar_db` dan `m3_spmb_tu_db` (SSoT).
- **Custom Event**: Mengirimkan broadcast `spmb_db_updated` dan `db_updated` ke window global setiap kali status penguncian berubah, sehingga **Modul 09 (Dashboard TU)** otomatis menyegarkan tampilan tanpa perlu me-reload halaman.

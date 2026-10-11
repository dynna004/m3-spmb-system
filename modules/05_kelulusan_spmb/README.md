# 🎓 Modul 05: Penetapan & Kelulusan SPMB

Dokumentasi resmi untuk **Modul 05: Penetapan & Kelulusan SPMB** SMA Muhammadiyah 3 Yogyakarta. Modul ini bertanggung jawab atas agregasi nilai rapor dan wawancara, perankingan otomatis calon siswa berdasarkan kuota rombel peminatan (MIPA & IPS), simulasi rapat pleno kelulusan, penerbitan Surat Keterangan Lulus (SKL) luring (Alur 9b), serta publikasi keputusan resmi ke Portal SPMB Calon Siswa (Alur 9a & Alur 10).

---

## 1. 🎯 Fitur & Struktur Antarmuka (UI/UX)

Antarmuka dirancang dengan standar desain modern dan profesional, konsisten penuh dengan Modul `01_portal_spmb` dan Modul `02_admin_spmb`:
* **Warna Aksen Utama**: `#006837` (Hijau Muhammadiyah) dengan hover `#004d28`.
* **Warna Sekunder**: `#f5a623` (Kuning Emas) untuk aksen badge & highlight.
* **Tipografi**: `Plus Jakarta Sans` dengan hierarki visual modern dan terstruktur.

### A. Layout Utama
1. **Sidebar (Kiri)**:
   * Logo identitas resmi **"SPMB Admin"** (SMA Muhammadiyah 3 Ygy).
   * Menu Navigasi Utama:
     * Menu Administrasi SPMB:
       * Sub-menu: Pengelolaan Akun (Shortcut ke Modul 02)
       * Sub-menu: Verifikasi Berkas (Shortcut ke Modul 06)
       * Sub-menu: Jadwal Wawancara (Shortcut ke Modul 04)
       * Sub-menu: **Penetapan Kelulusan** *(Status: Aktif / Selected)*
     * Menu Laporan & Statistik (Shortcut ke Modul 10)
     * Menu Pengaturan Kuota Sekolah (Shortcut ke Modul 08)
   * Footer Sidebar: Status Rapat Pleno Aktif & SK Penetapan TA 2026/2027.

2. **Top Header (Atas)**:
   * Judul halaman: **"Penetapan & Kelulusan SPMB"** dengan rekam jejak (*breadcrumb*).
   * **Prominent Publication Status Badge**:
     * `Status: DRAFT KEPUTUSAN` (Badge abu-abu/amber saat proses rapat pleno masih berlangsung).
     * `Status: DIPUBLIKASIKAN` (Badge hijau `#dcfce7` berpendar setelah keputusan diumumkan ke publik).
   * **Global Live Search Bar**: Mencari peserta seleksi secara *real-time* berdasarkan nama, nomor pendaftaran, NISN, atau asal sekolah.
   * Profil Administrator (*Admin SPMB - Panitia Pleno Kelulusan*).

---

## 2. 🧮 Section 1: Kuota & Perankingan Otomatis (Top Section)

1. **Panel Kontrol Kuota Peminatan**:
   * Input Kuota MIPA (Default: `240` siswa / 7 rombel).
   * Input Kuota IPS (Default: `160` siswa / 5 rombel).
2. **Formula Agregasi Nilai Objektif**:
   $$\text{Nilai Akhir} = (60\% \times \text{Nilai Rapor SMP}) + (40\% \times \text{Nilai Wawancara Modul 04})$$
3. **Tombol Utama `⚡ Jalankan Perankingan Otomatis`**:
   * Menghitung nilai gabungan seluruh peserta seleksi.
   * Mengurutkan peringkat secara objektif (peringkat 1, 2, 3...) per jurusan.
   * Menentukan status secara otomatis berdasarkan batas kuota:
     * Peringkat 1 s.d. Batas Kuota: **LULUS**
     * Ambang batas toleransi kuota cadangan: **CADANGAN**
     * Di luar kapasitas kuota: **TIDAK LULUS**

---

## 3. 📊 Section 2: Summary Cards (Statistik Kelulusan)

4 Kartu Ringkasan Dinamis yang merepresentasikan sidang pleno:
1. **Total Diproses**: Total akumulatif peserta seleksi yang dinilai (e.g. `850` siswa).
2. **Diterima (Lulus)**: Jumlah yang dinyatakan lulus seleksi (e.g. `400` siswa, warna hijau `#15803d`).
3. **Cadangan**: Jumlah peserta dalam daftar tunggu (e.g. `50` siswa, warna amber `#b45309`).
4. **Tidak Diterima**: Peserta di luar kuota (e.g. `400` siswa, warna merah `#b91c1c`).
*Angka statistik berubah otomatis saat kuota disesuaikan atau saat admin melakukan perubahan status manual.*

---

## 4. 📋 Section 3: Data Table Penetapan Kelulusan

Tabel komprehensif dengan kolom:
1. **No**: Nomor urut dinamis.
2. **Peringkat**: Badge ranking per jurusan (`#1` emas, `#2`-`#3` biru, `#4` dst).
3. **Nama Lengkap & No. Pendaftaran**: Nama pendaftar asli Indonesia, avatar inisial, badge NISN, dan nomor pendaftaran.
4. **Pilihan Jurusan**: Badge MIPA (biru) atau IPS (amber).
5. **Nilai Akhir**: Nilai teragregasi (e.g. `89.10`), dilengkapi rincian nilai Rapor dan Wawancara.
6. **Status Kelulusan (Interactive Dropdown)**:
   * Dropdown interaktif dengan opsi `✓ LULUS`, `⏳ CADANGAN`, dan `✕ TIDAK LULUS`.
   * Otomatis terisi oleh hasil perankingan kuota, namun dapat diubah secara manual (*manual override*) oleh panitia pleno.
7. **Aksi**:
   * Tombol **`🖨️ Cetak SKL`**: Mencetak Surat Keterangan Lulus Luring resmi bagi pendaftar luring (*walk-in* / Alur 9b).

---

## 5. 📢 Fitur Global & Penerbitan Dokumen Resmi

### A. Tombol `📢 Publikasikan ke Portal` (Alur 9a & Alur 10)
* Tombol dengan aksen primer hijau `#006837` yang mencolok di atas tabel.
* Membuka **Modal Konfirmasi Keamanan Pleno**:
  * Peringatan konsekuensi publikasi ke calon siswa.
  * Ringkasan total kelulusan MIPA & IPS.
  * Checkbox verifikasi kepsek & dewan guru wajib dicentang sebelum tombol publikasi aktif.
* Ketika dipublikasikan:
  * Badge Header berubah menjadi **`🟢 Status: DIPUBLIKASIKAN`**.
  * Data kelulusan disinkronkan ke `spmb_pendaftar_db` dan membroadcast event `spmb_kelulusan_published`.

### B. Tombol `📑 Cetak Draf Hasil (PDF)`
* Membuka dokumen resmi **Berita Acara Rapat Pleno Penetapan Kelulusan SPMB**:
  * Kop resmi SMA Muhammadiyah 3 Yogyakarta.
  * Nomor Berita Acara: `045/BA-PLENO/SPMB-M3/VI/2026`.
  * Tabel Rekapitulasi Alokasi Daya Tampung MIPA & IPS.
  * Daftar 5 Siswa Terbaik (Top Rank) MIPA & IPS.
  * Kolom tanda tangan Ketua Panitia SPMB dan Kepala Sekolah.

### C. Dokumen Cetak SKL Luring (Alur 9b)
* Surat Keterangan Lulus resmi perorangan:
  * Kop Majelis Dikdasmen Muhammadiyah & SMA Muhammadiyah 3 Yogyakarta.
  * Nomor SK: `421.3/SK-SPMB/M3/VI/2026/xxx`.
  * Identitas lengkap siswa & nilai akhir agregasi.
  * Kotak keputusan resmi (*DITERIMA PADA PEMINATAN MIPA/IPS*).
  * Instruksi jadwal penyerahan berkas fisik daftar ulang ke Modul 06.
  * Tanda tangan Kepala Sekolah (Dr. H. Sukardi, M.Pd.), stempel cap resmi, dan QR Code verifikasi.

---

## 6. 🗄️ Integrasi Database Terpusat (`spmb_pendaftar_db`)

Modul 05 telah terhubung penuh dan menggunakan satu database tunggal terpusat yang sama dengan seluruh modul lainnya:
1. **Penyimpanan Utama**: `localStorage.getItem('spmb_pendaftar_db')` melalui utility [`utils.js`](file:///modules/01_portal_spmb/utils.js).
2. **Sinkronisasi Dua Arah (*Two-Way Data Binding*)**:
   * **Membaca Data**: Mengambil seluruh pendaftar yang didaftarkan secara daring melalui Modul 01 (Portal Siswa) maupun pendaftar luring (*walk-in*) yang diinput dari Modul 02 (Loket Admin SPMB).
   * **Menyimpan Perankingan**: Saat tombol `⚡ Jalankan Perankingan Otomatis` diklik, field `nilai` (rapor, wawancara, akhir), `peringkat`, dan `status_kelulusan` diperbarui langsung ke masing-masing objek pendaftar di `spmb_pendaftar_db`.
   * **Manual Override**: Setiap perubahan status via dropdown baris tabel langsung tersimpan ke `spmb_pendaftar_db`.
   * **Publikasi Resmi**: Ketika dipublikasikan, status keputusan dan flag publikasi `spmb_kelulusan_status: 'PUBLISHED'` disimpan secara permanen.
3. **Event Dispatcher Real-Time**:
   * Mengirim dan mendengarkan event kustom: `spmb_db_updated`, `spmb_kelulusan_updated`, dan `spmb_kelulusan_published` sehingga perubahan data di modul lain langsung terrefleksi secara dinamis tanpa perlu reload halaman.

---

## 7. 📂 Struktur Berkas Modul 05

* [`kelulusan.js`](file:///modules/05_kelulusan_spmb/kelulusan.js): Logika perankingan otomatis, perhitungan agregasi nilai (60% Rapor + 40% Wawancara), manajemen kuota, pengubah status manual, dan event broadcast terpusat.
* [`kelulusan.css`](file:///modules/05_kelulusan_spmb/kelulusan.css): Seluruh styling layout dashboard, panel kuota, summary cards, tabel kelulusan, modal publikasi, dokumen SKL luring, dan Berita Acara Rapat Pleno (`@media print`).
* [`kelulusan.html`](file:///modules/05_kelulusan_spmb/kelulusan.html): Halaman tampilan mandiri (*standalone HTML page*) khusus Modul 05.
* [`README.md`](file:///modules/05_kelulusan_spmb/README.md): Dokumentasi resmi panduan Modul 05.

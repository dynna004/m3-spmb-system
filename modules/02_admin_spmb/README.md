# 🛡️ Modul 02: Admin SPMB & Pengelolaan Akun Peserta

Dokumentasi resmi untuk **Modul 02: Admin SPMB** (Sistem Penerimaan Peserta Didik Baru) SMA Muhammadiyah 3 Yogyakarta. Modul ini bertanggung jawab atas verifikasi identitas awal, aktivasi/nonaktivasi akun pendaftar, pratinjau berkas dokumen fisik, pendaftaran langsung loket offline (*walk-in*), dan integrasi data dua arah dengan Modul 01 (Portal SPMB) serta modul-modul turunan berikutnya (khususnya Modul 06 Verifikasi Loket & Modul 04 Wawancara).

---

## 1. 🎯 Fitur & Struktur Antarmuka (UI/UX)

Antarmuka dirancang dengan standar desain modern, konsisten penuh dengan modul `01_portal_spmb` dan `shared/styles.css`:
* **Warna Aksen Utama**: `#006837` (Hijau Muhammadiyah) dengan hover `#004d28`.
* **Warna Sekunder**: `#f5a623` (Kuning Emas) untuk aksen badge & highlight.
* **Tipografi**: `Plus Jakarta Sans` dengan hirarki visual modern, rapi, dan mudah dibaca.

### A. Layout Utama
1. **Sidebar (Kiri)**:
   * Logo identitas resmi **"SPMB Admin"** dengan ikon lencana pendidikan.
   * Menu Navigasi Utama:
     * **Menu Administrasi SPMB** *(Status: Aktif)*
       * Sub-menu: **Pengelolaan Akun** *(Status: Aktif / Selected)*
       * Shortcut Cepat: **➕ Loket Walk-in Offline** *(Buka modal input pendaftar langsung di tempat)*
       * Sub-menu: Verifikasi Berkas (Shortcut ke Modul 06)
       * Sub-menu: Jadwal Wawancara (Shortcut ke Modul 04)
     * Menu Laporan & Statistik (Shortcut ke Modul 10)
     * Menu Pengaturan Kuota (Shortcut ke Modul 08)
   * Footer Sidebar: Status server aktif, terhubung ke *single source of truth* database `spmb_pendaftar_db`.

2. **Top Header (Atas)**:
   * Judul halaman: **"Pengelolaan Akun Peserta"** dengan rekam jejak (*breadcrumb*).
   * **Global Live Search Bar**: Mencari peserta secara *real-time* berdasarkan nama lengkap, nomor pendaftaran, email, atau NISN.
   * **Ikon Notifikasi**: Menampilkan indikator jumlah akun yang sedang menunggu aktivasi admin.
   * **Profil Admin**: Badge akun administrator (*"Admin SPMB - Superadmin IT"*).

### B. Summary Cards (Kartu Ringkasan)
Terdiri dari 3 kartu metrik dinamis di bagian atas konten:
1. **Total Pendaftar**: Total akumulatif peserta SPMB (e.g. `1.250`).
2. **Akun Aktif**: Jumlah akun terverifikasi yang siap mengisi formulir (e.g. `1.200`).
3. **Menunggu Aktivasi**: Jumlah akun yang memerlukan tinjauan persetujuan admin (e.g. `50`).
*Metrik berubah secara dinamis dan responsif saat admin mengaktifkan/menonaktifkan akun atau menambahkan pendaftar baru.*

### C. Data Table Toolbar & Interaktivitas
Toolbar di atas tabel dilengkapi dengan:
1. **Tombol Shortcut `➕ Input Pendaftar Loket Offline` (Walk-in)**:
   * Tombol aksen hijau dengan badge kuning keemasan.
   * Membuka form pendaftaran langsung di tempat (*walk-in*) bagi siswa yang hadir di loket SMA Muhammadiyah 3 Yogyakarta.
2. **Filter Pills**: Semua, Aktif, Belum Aktif.
3. **Tombol Segarkan**: Sinkronisasi ulang secara *real-time* dengan basis data `spmb_pendaftar_db`.
4. Kolom Tabel:
   * **No**: Nomor urut dinamis.
   * **Nama Lengkap**: Avatar inisial, nama peserta, badge NISN, serta badge jalur pendaftaran (*Online* / *Loket Walk-in*).
   * **Nomor Pendaftaran**: Format baku `SPMB-2026-xxx` atau `SPMB-2026-WLK-xxx`.
   * **Email Peserta**: Tautan email langsung.
   * **Status Akun**: Badge visual Aktif (hijau) atau Belum Aktif (kuning).
   * **Aksi**: Tombol *Aktifkan*, *Detail*, dan *Nonaktifkan*.

---

## 2. 📋 Modal Detail Peserta (2 Tab Navigasi)

Modal detail pendaftar kini dilengkapi sistem multi-tab terstruktur:

### Tab 1: 📋 Rincian Biodata & Akun
* Menampilkan *Hero Box* calon siswa (Inisial, Nama Lengkap, Nomor Registrasi, Badge Jalur, dan Status Akun).
* Grid informasi detail:
  * NISN (10 digit) & NIK Kependudukan (16 digit)
  * Nomor WhatsApp / Kontak Orang Tua
  * Email Resmi Terdaftar
  * Pilihan Jurusan (MIPA, IPS, Bahasa & Budaya)
  * Status Pembayaran Formulir (Lunas Terverifikasi / Menunggu Verifikasi)
  * Asal Sekolah SMP/MTs & Alamat Lengkap Domisili
  * Waktu Registrasi Akun

### Tab 2: 📑 Pratinjau Berkas Fisik (Sinkronisasi Modul 06)
* **Notice Banner Integrasi**: Sinkronisasi verifikasi berkas fisik dengan Modul 06 (Verifikasi Loket & Daftar Ulang).
* **Grid 4 Kartu Dokumen Lampiran**:
  1. **Scan Ijazah SMP / MTs / SKL**: Format PDF, thumbnail visual ijazah resmi dengan stempel legalisir dan nomor seri kelulusan.
  2. **Scan Kartu Keluarga (KK)**: Format JPG, thumbnail visual Kartu Keluarga Dukcapil dengan daftar nama anggota keluarga & QR-code sah.
  3. **Pasfoto Resmi Calon Siswa (3x4)**: Format JPG, foto berseragam putih SMP berlatar belakang merah/biru.
  4. **Bukti Pembayaran / Kuitansi Loket**: Format PDF, slip bukti bayar resmi Rp 150.000 dengan cap stempel bendahara/kasir loket.
* **Fitur Interaktif pada Setiap Dokumen**:
  * **🔍 Lihat Penuh (Lightbox Viewer)**: Membuka berkas dalam ukuran resolusi penuh dengan mode gelap sinematik dan opsi unduh file.
  * **✓ Validkan / Batal Valid (Toggle Verifikasi Fisik)**: Admin dapat mengubah dan menyimpan status verifikasi berkas langsung ke basis data terpusat (`spmb_pendaftar_db`).

---

## 3. ➕ Form Input Pendaftar Offline (Loket Walk-in) & Cetak Tanda Terima

Fitur pelayanan bagi calon siswa yang datang langsung mendaftar di loket SPMB SMA Muhammadiyah 3 Yogyakarta:

### A. Alur Penginputan
1. Admin mengklik tombol `➕ Input Pendaftar Loket Offline` di toolbar atau sidebar.
2. Mengisi form pendaftaran loket:
   * **Identitas Siswa**: Nama lengkap, NISN (10 digit), NIK (16 digit), No. WhatsApp, dan tombol bantu `⚡ Buat Email Otomatis`.
   * **Akademik & Domisili**: Asal SMP/MTs, pilihan jurusan, dan alamat tinggal.
   * **Administrasi Loket**:
     * Checkbox `[x] Langsung Aktifkan Akun` (Terverifikasi identitas di tempat).
     * Opsi Pembayaran: `💵 Lunas Tunai di Loket (Rp 150.000)` atau `⏳ Menunggu Pembayaran`.
     * Checklist Berkas Fisik yang Diterima di Loket: Ijazah SMP, KK, Pasfoto 3x4, Kuitansi Tunai.
3. Klik `💾 Simpan & Terbitkan Registrasi Walk-in`.

### B. Otomasi Sistem & Penerbitan Tanda Terima
* Menghasilkan nomor registrasi otomatis dengan penanda walk-in: `SPMB-2026-WLK-xxx`.
* Menyimpan rekaman data lengkap ke `spmb_pendaftar_db` via `savePendaftar()`.
* Mengirim *broadcast custom event* `spmb_db_updated` untuk sinkronisasi antar-modul secara *real-time*.
* Menampilkan pop-up **Tanda Terima Pendaftaran Loket SPMB (Printable Slip)**:
  * Memuat logo dan kop resmi SMA Muhammadiyah 3 Yogyakarta.
  * Nomor registrasi besar, data siswa, pilihan jurusan, status lunas tunai, dan stempel loket.
  * Dilengkapi tombol `🖨️ Cetak / Print Struk` yang memicu dialog pencetakan peramban (*print preview*).

---

## 4. 🔄 Alur Integrasi Data & Handover Antar-Modul

```
[ Siswa Registrasi Online di Modul 01 ]        [ Calon Siswa Walk-in Datang ke Meja Loket ]
                    │                                                      │
                    ▼                                                      ▼
           status_akun: "pending"                         Admin klik [ ➕ Input Pendaftar Loket Offline ]
                    │                                                      │
                    ▼                                                      ▼
          [ Modul 02 Admin SPMB ] ◄───────────────────────── Simpan ke spmb_pendaftar_db (Status: "active")
                    │
                    ├─▶ Tinjau Biodata & Pratinjau Berkas Fisik (Tab 1 & Tab 2)
                    ├─▶ Toggle Validasi Berkas Scan (Sinkron ke Modul 06)
                    └─▶ Admin klik [ Aktifkan ] / [ Simpan Walk-in ]
                            │
                            ▼
          status_akun: "active" ──▶ Handover ke Modul 03 (Keuangan) & Modul 04 (Wawancara)
```

---

## 5. 📂 Struktur Berkas Modul 02

* [`admin.js`](file:///modules/02_admin_spmb/admin.js): Kode logika modul, perenderan dashboard, tabel akun, multi-tab modal detail (biodata & berkas), form loket walk-in, modal tanda terima struk, lightbox viewer, dan event dispatcher.
* [`admin.css`](file:///modules/02_admin_spmb/admin.css): Desain antarmuka modern, tabs navigation, kartu pratinjau dokumen, badge verifikasi, form walk-in, slip tanda terima cetak, lightbox, dan toast feedback.
* [`standalone.html`](file:///modules/02_admin_spmb/standalone.html): Halaman portal mandiri (*standalone*) khusus petugas admin/loket SPMB.


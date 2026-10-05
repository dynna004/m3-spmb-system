# 🛡️ Modul 02: Admin SPMB & Pengelolaan Akun Peserta

Dokumentasi resmi untuk **Modul 02: Admin SPMB** (Sistem Penerimaan Peserta Didik Baru) SMA Muhammadiyah 3 Yogyakarta. Modul ini bertanggung jawab atas verifikasi identitas awal, aktivasi/nonaktivasi akun pendaftar, dan integrasi data dua arah dengan Modul 01 (Portal SPMB) serta modul-modul turunan berikutnya.

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
*Metrik berubah secara dinamis dan responsif saat admin mengaktifkan atau menonaktifkan akun.*

### C. Data Table & Interaktivitas
Tabel modern dan responsif dengan kolom:
1. **No**: Nomor urut dinamis.
2. **Nama Lengkap**: Nama pendaftar asli Indonesia dengan avatar inisial dan badge nomor NISN.
3. **Nomor Pendaftaran**: Kode baku pendaftaran (format `SPMB-2026-xxx` / `REG-2026-xxx`).
4. **Email Peserta**: Tautan interaktif email peserta.
5. **Status Akun**: Badge visual modern:
   * **Aktif**: Pill hijau (`#dcfce7`, text `#15803d`) dengan titik hijau berpendar.
   * **Belum Aktif**: Pill kuning/amber (`#fef3c7`, text `#b45309`) dengan titik amber.
6. **Aksi (Action Buttons)**:
   * **Jika status "Belum Aktif"**: Menampilkan tombol **"Aktifkan"** (warna hijau `#006837`, efek hover halus, ikon ceklis).
   * **Jika status "Aktif"**: Menampilkan tombol **"Detail"** (modal informasi lengkap) dan tombol **"Nonaktifkan"** (outline merah/abu-abu).
   * Dilengkapi animasi umpan balik berupa **Toast Notification** di pojok kanan bawah saat status berhasil diubah.

---

## 2. 🔄 Alur Integrasi Data & Handover Antar-Modul

Modul 02 terintegrasi langsung dengan database `spmb_pendaftar_db` via helper `utils.js` dari Modul 01:

```
[ Siswa Registrasi di Modul 01 ]
                │
                ▼
status_akun: "pending_activation"
                │
                ▼ (Disimpan di spmb_pendaftar_db & broadcast event)
[ Modul 02 Admin SPMB ] ──▶ Tampil di tabel dengan status "Belum Aktif"
                │
                ▼ Admin klik tombol [ Aktifkan ]
updateStatusAkun(id, 'active')
                │
                ▼
status_akun: "active" ──▶ Siswa di Modul 01 langsung bisa Login & Mengisi Formulir
```

---

## 3. 📂 Struktur Berkas Modul 02

* [`admin.js`](file:///modules/02_admin_spmb/admin.js): Kode logika modul, perenderan dashboard, tabel data, filter, modal detail, dan event dispatcher.
* [`admin.css`](file:///modules/02_admin_spmb/admin.css): Desain antarmuka, layout responsif (sidebar + main area), summary cards, badges, modal, dan toast feedback.
* [`index.html`](file:///modules/02_admin_spmb/index.html): Halaman tampilan *standalone* untuk pengujian langsung tanpa melalui router utama.

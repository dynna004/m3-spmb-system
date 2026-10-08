/**
 * Modul 02: Admin & Aktivasi Akun SPMB
 * SMA Muhammadiyah 3 Yogyakarta
 * 
 * Fitur Utama:
 * 1. Layout Sidebar Navigasi & Top Header Administrator
 * 2. Summary Cards Statistik (Total, Aktif, Menunggu Aktivasi)
 * 3. Data Table Akun Peserta SPMB (Nama Dummy Indonesia, No Pendaftaran, Email, Status Badge)
 * 4. Interaktivitas Real-Time:
 *    - Aktivasi Akun (Tombol Aktifkan aksen hijau #006837)
 *    - Nonaktivasi Akun (Tombol Nonaktifkan aksen merah/abu-abu)
 *    - Modal Detail Peserta Lengkap
 *    - Live Search & Tab Filtering
 *    - Sinkronisasi Otomatis ke Database Terpusat (spmb_pendaftar_db)
 */

import { getPendaftarList, updateStatusAkun, dispatchSPMBEvent } from '../01_portal_spmb/utils.js';

// Pastikan CSS Modul 02 terhubung
function ensureAdminStyles() {
  const cssId = 'admin-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    // Path dinamis tergantung konteks URL
    const isStandalone = window.location.pathname.includes('/02_admin_spmb/');
    link.href = isStandalone ? './admin.css' : './modules/02_admin_spmb/admin.css';
    document.head.appendChild(link);
  }
}

// Fallback seed dummy data Indonesia jika storage kosong
const SEED_INDONESIAN_STUDENTS = [
  {
    id_pendaftar: "SPMB-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    email: "ahmad.dahlan@gmail.com",
    no_wa: "081234567891",
    nisn: "0051234567",
    status_akun: "pending_activation",
    created_at: "2026-10-05T08:00:00Z",
    biodata: { asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Malioboro No. 45, Yogyakarta" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-002",
    nama_lengkap: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    no_wa: "081234567890",
    nisn: "1234567890",
    status_akun: "active",
    created_at: "2026-10-05T09:15:00Z",
    biodata: { asal_sekolah: "SMP Negeri 1 Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Merdeka No. 10, Yogyakarta" },
    pembayaran: { status_pembayaran: "pending_verification" }
  },
  {
    id_pendaftar: "SPMB-2026-003",
    nama_lengkap: "Siti Nurhaliza",
    email: "siti.nurhaliza@gmail.com",
    no_wa: "081398765432",
    nisn: "0062345671",
    status_akun: "pending_activation",
    created_at: "2026-10-05T10:00:00Z",
    biodata: { asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta", pilihan_jurusan: "IPS", alamat: "Jl. Kusumanegara No. 12, Yogyakarta" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-004",
    nama_lengkap: "Rizky Ramadhan",
    email: "rizky.ramadhan@gmail.com",
    no_wa: "085612345678",
    nisn: "0058765432",
    status_akun: "active",
    created_at: "2026-10-05T10:30:00Z",
    biodata: { asal_sekolah: "SMP Negeri 5 Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Kaliurang KM 5, Sleman" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-005",
    nama_lengkap: "Dewi Sartika",
    email: "dewi.sartika@gmail.com",
    no_wa: "087812345678",
    nisn: "0067654321",
    status_akun: "pending_activation",
    created_at: "2026-10-05T11:15:00Z",
    biodata: { asal_sekolah: "SMP Muhammadiyah 3 Depok", pilihan_jurusan: "IPS", alamat: "Jl. Gejayan No. 88, Sleman" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-006",
    nama_lengkap: "Muhammad Farhan",
    email: "m.farhan@gmail.com",
    no_wa: "081287654321",
    nisn: "0053456789",
    status_akun: "active",
    created_at: "2026-10-05T12:00:00Z",
    biodata: { asal_sekolah: "SMP Negeri 8 Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Imogiri Timur KM 7, Bantul" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-007",
    nama_lengkap: "Annisa Maharani",
    email: "annisa.maharani@gmail.com",
    no_wa: "085712345678",
    nisn: "0064567890",
    status_akun: "active",
    created_at: "2026-10-05T13:20:00Z",
    biodata: { asal_sekolah: "SMP Muhammadiyah 7 Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Gambiran No. 19, Umbulharjo" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-008",
    nama_lengkap: "Dimas Pratama",
    email: "dimas.pratama@gmail.com",
    no_wa: "089612345678",
    nisn: "0059876543",
    status_akun: "pending_activation",
    created_at: "2026-10-05T14:10:00Z",
    biodata: { asal_sekolah: "SMP Negeri 2 Bantul", pilihan_jurusan: "IPS", alamat: "Jl. Bantul KM 4, Kasihan" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-009",
    nama_lengkap: "Zahra Aulia",
    email: "zahra.aulia@yahoo.co.id",
    no_wa: "082112345678",
    nisn: "0065678901",
    status_akun: "active",
    created_at: "2026-10-05T14:45:00Z",
    biodata: { asal_sekolah: "SMP IT Abu Bakar Yogyakarta", pilihan_jurusan: "MIPA", alamat: "Jl. Timoho No. 23, Yogyakarta" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-010",
    nama_lengkap: "Fajar Nugroho",
    email: "fajar.nugroho@gmail.com",
    no_wa: "081312345678",
    nisn: "0056789012",
    status_akun: "active",
    created_at: "2026-10-05T15:10:00Z",
    biodata: { asal_sekolah: "SMP Negeri 1 Sleman", pilihan_jurusan: "IPS", alamat: "Jl. Magelang KM 6, Mlati" },
    pembayaran: null
  }
];

/**
 * Mengambil data pendaftar terbaru dari local storage
 */
function fetchCurrentPendaftar() {
  try {
    let list = getPendaftarList();
    if (!list || list.length < 5) {
      // Inisialisasi seed jika belum lengkap
      const raw = localStorage.getItem('spmb_pendaftar_db');
      let current = raw ? JSON.parse(raw) : [];
      const currentIds = new Set(current.map(i => i.id_pendaftar || i.id));
      SEED_INDONESIAN_STUDENTS.forEach(seed => {
        if (!currentIds.has(seed.id_pendaftar)) {
          current.push(seed);
        }
      });
      localStorage.setItem('spmb_pendaftar_db', JSON.stringify(current));
      list = current;
    }
    return list;
  } catch (e) {
    console.error('fetchCurrentPendaftar error:', e);
    return SEED_INDONESIAN_STUDENTS;
  }
}

/**
 * Render Fungsi Utama Modul 02
 * @param {string} containerId - Target ID container
 */
export function renderAdminSPMB(containerId) {
  ensureAdminStyles();
  const container = document.getElementById(containerId);
  if (!container) return;

  // State Dashboard
  let searchQuery = '';
  let activeFilter = 'all'; // 'all', 'active', 'pending'
  let pendaftarList = fetchCurrentPendaftar();

  // Render Shell Layout Admin
  container.innerHTML = `
    <!-- Admin SPMB Dashboard Shell -->
    <div class="admin-shell" id="admin-spmb-root">
      
      <!-- Top Sub-Navigation Banner for Context -->
      <div style="background: #ffffff; padding: 0.75rem 1.75rem; border-bottom: 1px solid var(--admin-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--admin-primary); background: var(--admin-primary-light); padding: 4px 10px; border-radius: 20px;">
            🛡️ Modul 02: Admin SPMB
          </span>
          <span style="font-size: 0.8rem; color: var(--admin-text-muted);">
            Sistem Penerimaan Peserta Didik Baru - SMA Muhammadiyah 3 Yogyakarta
          </span>
        </div>
        <div>
          <a href="modules/02_admin_spmb/index.html" target="_blank" class="btn-refresh" style="text-decoration: none; font-size: 0.75rem; padding: 4px 10px;">
            ↗️ Buka Standalone View
          </a>
        </div>
      </div>

      <!-- Main Dashboard 2-Column Layout -->
      <div class="admin-dashboard-layout">
        
        <!-- ==============================================
             1. SIDEBAR (Kiri)
             ============================================== -->
        <aside class="admin-sidebar">
          <div>
            <!-- Sidebar Brand Logo -->
            <div class="sidebar-brand">
              <div class="brand-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="brand-info">
                <span class="brand-name">SPMB Admin</span>
                <span class="brand-tagline">SMA Muhammadiyah 3 Ygy</span>
              </div>
            </div>

            <!-- Navigasi Utama -->
            <div class="nav-section-title">Navigasi Utama</div>
            <ul class="nav-menu-list">
              
              <!-- Menu Aktif: Menu Administrasi SPMB -->
              <li class="nav-menu-item">
                <div class="nav-item-link parent-active" id="nav-parent-administrasi">
                  <div class="nav-link-content">
                    <span class="nav-link-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="3"/>
                        <line x1="9" y1="9" x2="15" y2="9"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                        <line x1="9" y1="17" x2="11" y2="17"/>
                      </svg>
                    </span>
                    <span>Menu Administrasi SPMB</span>
                  </div>
                  <span class="nav-chevron">▶</span>
                </div>

                <!-- Sub-Menu: Pengelolaan Akun (ACTIVE) -->
                <ul class="nav-submenu-list">
                  <li class="nav-submenu-item active">
                    <a href="javascript:void(0)" id="sub-pengelolaan-akun">
                      <span>👥 Pengelolaan Akun</span>
                      <span class="sub-badge">Aktif</span>
                    </a>
                  </li>
                  <li class="nav-submenu-item">
                    <a href="javascript:void(0)" onclick="alert('Menu Verifikasi Berkas terintegrasi pada Modul 06 (Verifikasi Loket & Berkas).')">
                      <span>📑 Verifikasi Berkas</span>
                    </a>
                  </li>
                  <li class="nav-submenu-item">
                    <a href="javascript:void(0)" onclick="alert('Menu Jadwal Wawancara terintegrasi pada Modul 04 (Wawancara).')">
                      <span>🎤 Jadwal Wawancara</span>
                    </a>
                  </li>
                </ul>
              </li>

              <!-- Menu Tambahan Pendukung -->
              <li class="nav-menu-item" style="margin-top: 6px;">
                <div class="nav-item-link" onclick="alert('Fitur Statistik & Laporan tersedia di Modul 10 (Executive Report).')">
                  <div class="nav-link-content">
                    <span class="nav-link-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                    </span>
                    <span>Laporan & Statistik</span>
                  </div>
                </div>
              </li>

              <li class="nav-menu-item">
                <div class="nav-item-link" onclick="alert('Pengaturan Kuota Sekolah terintegrasi pada Schema Tata Usaha (Modul 08).')">
                  <div class="nav-link-content">
                    <span class="nav-link-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </span>
                    <span>Pengaturan Kuota</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Sidebar Footer: Status Sistem -->
          <div class="sidebar-footer">
            <div class="system-status-box">
              <div class="status-indicator-row">
                <span class="pulse-dot"></span>
                <span>Server SPMB Aktif</span>
              </div>
              <div style="color: var(--admin-text-muted); font-size: 0.7rem; line-height: 1.4;">
                Data Terhubung: <strong>spmb_pendaftar_db</strong><br>
                Tahun Ajaran: 2026/2027
              </div>
            </div>
          </div>
        </aside>

        <!-- ==============================================
             2. MAIN AREA (Header + Konten Utama)
             ============================================== -->
        <main class="admin-main-area">
          
          <!-- Top Header (Atas) -->
          <header class="admin-top-header">
            <div class="header-left">
              <div class="header-breadcrumb">
                <span>Administrasi SPMB</span>
                <span class="breadcrumb-separator">/</span>
                <span style="color: var(--admin-primary); font-weight: 600;">Pengelolaan Akun</span>
              </div>
              <h1 class="header-title">
                <span>Pengelolaan Akun Peserta</span>
              </h1>
            </div>

            <div class="header-right">
              <!-- Search Bar -->
              <div class="search-bar-wrapper">
                <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input 
                  type="text" 
                  id="admin-search-input" 
                  class="search-input-field" 
                  placeholder="Cari nama, no. pendaftaran, email..." 
                  autocomplete="off"
                />
                <button type="button" id="admin-search-clear" class="search-clear-btn" title="Hapus pencarian">✕</button>
              </div>

              <!-- Notification Icon -->
              <button type="button" class="header-action-btn" id="btn-admin-notif" title="Notifikasi Baru">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span class="notif-badge-pill" id="badge-notif-count">3</span>
              </button>

              <!-- Profil Admin -->
              <div class="admin-profile-pill" id="admin-profile-card" title="Profil Administrator">
                <div class="admin-avatar">AP</div>
                <div class="admin-profile-meta">
                  <span class="admin-name">Admin SPMB</span>
                  <span class="admin-role">Superadmin IT</span>
                </div>
              </div>
            </div>
          </header>

          <!-- Konten Utama (Main Content Area) -->
          <div class="admin-content-body">
            
            <!-- Summary Cards (Kartu Ringkasan) -->
            <section class="summary-cards-grid">
              
              <!-- Card 1: Total Pendaftar -->
              <div class="summary-card card-total">
                <div class="stat-info">
                  <span class="stat-label">Total Pendaftar</span>
                  <span class="stat-value" id="stat-total-pendaftar">1,250</span>
                  <span class="stat-subtext">
                    <span style="color: var(--admin-primary); font-weight: 700;">+12%</span> dari minggu lalu
                  </span>
                </div>
                <div class="stat-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>

              <!-- Card 2: Akun Aktif -->
              <div class="summary-card card-active">
                <div class="stat-info">
                  <span class="stat-label">Akun Aktif</span>
                  <span class="stat-value" id="stat-akun-aktif" style="color: #15803d;">1,200</span>
                  <span class="stat-subtext">
                    <span style="color: #15803d; font-weight: 700;">✓ Siap</span> mengisi formulir
                  </span>
                </div>
                <div class="stat-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              </div>

              <!-- Card 3: Menunggu Aktivasi -->
              <div class="summary-card card-pending">
                <div class="stat-info">
                  <span class="stat-label">Menunggu Aktivasi</span>
                  <span class="stat-value" id="stat-menunggu-aktivasi" style="color: #b45309;">50</span>
                  <span class="stat-subtext">
                    <span style="color: #b45309; font-weight: 700;">⚡ Perlu</span> tindakan segera
                  </span>
                </div>
                <div class="stat-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
              </div>

            </section>

            <!-- Halaman Pengelolaan Akun (Data Table Card) -->
            <section class="admin-table-card">
              
              <!-- Toolbar Atas Tabel -->
              <div class="table-toolbar">
                <div class="toolbar-left">
                  <h2 class="table-card-title">
                    <span>Daftar Akun Peserta SPMB</span>
                  </h2>
                  <span class="data-count-chip" id="data-count-badge">Memuat data...</span>
                </div>

                <div class="toolbar-right">
                  <!-- Filter Pills: Semua, Aktif, Belum Aktif -->
                  <div class="filter-btn-group">
                    <button type="button" class="filter-btn active" data-filter="all">Semua</button>
                    <button type="button" class="filter-btn" data-filter="active">Aktif</button>
                    <button type="button" class="filter-btn" data-filter="pending">Belum Aktif</button>
                  </div>

                  <!-- Tombol Input Loket Offline -->
                  <button type="button" class="btn-refresh" id="btn-add-offline" style="background: var(--admin-primary); color: white; border: none; font-weight: 700;" title="Input Pendaftar Offline Loket">
                    <span>➕ Catat Pendaftar Loket Offline</span>
                  </button>

                  <!-- Tombol Refresh / Sinkronisasi -->
                  <button type="button" class="btn-refresh" id="btn-refresh-data" title="Muat ulang data terkini">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>

              <!-- Tabel Data Modern & Rapi -->
              <div class="table-responsive-wrapper">
                <table class="spmb-data-table" id="admin-pendaftar-table">
                  <thead>
                    <tr>
                      <th class="col-num">No</th>
                      <th>Nama Lengkap</th>
                      <th>Nomor Pendaftaran</th>
                      <th>Email Peserta</th>
                      <th>Status Akun</th>
                      <th style="text-align: right; padding-right: 24px;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="table-pendaftar-body">
                    <!-- Dynamic Rows populated by JS -->
                  </tbody>
                </table>
              </div>

              <!-- Table Footer -->
              <div class="table-footer">
                <div class="footer-info" id="table-footer-info">
                  Menampilkan data pendaftar terdaftar
                </div>
                <div class="pagination-controls">
                  <button type="button" class="pagination-btn" id="btn-page-prev" disabled>&larr; Sebelumnya</button>
                  <span style="font-size: 0.8rem; font-weight: 700; padding: 0 8px; color: var(--admin-primary);">Halaman 1</span>
                  <button type="button" class="pagination-btn" id="btn-page-next" disabled>Selanjutnya &rarr;</button>
                </div>
              </div>

            </section>

          </div>
        </main>

      </div>

      <!-- Modal Detail Peserta (Dialog Pop-up) -->
      <div class="admin-modal-backdrop" id="admin-detail-modal">
        <div class="admin-modal-card">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📋 Detail Akun Peserta SPMB</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-modal" title="Tutup">✕</button>
          </div>
          <div class="modal-body" id="modal-detail-content">
            <!-- Populated dynamically -->
          </div>
          <div class="modal-footer" id="modal-footer-actions">
            <!-- Buttons dynamically populated -->
          </div>
        </div>
      </div>

      <!-- Modal Pendaftaran Loket Offline -->
      <div class="admin-modal-backdrop" id="admin-offline-modal">
        <div class="admin-modal-card" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🏫 Pencatatan Pendaftar Loket Offline</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-offline-modal" title="Tutup">✕</button>
          </div>
          <form id="form-offline-register">
            <div class="modal-body" style="padding: 1.5rem;">
              <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 1rem;">
                Input pendaftar yang datang langsung ke loket pendaftaran SMA Muhammadiyah 3 Yogyakarta. Akun akan otomatis terdaftar dan diaktifkan.
              </p>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Nama Lengkap Siswa <span style="color:red">*</span></label>
                <input type="text" id="off-nama" class="search-input-field" style="width: 100%; border: 1.5px solid var(--admin-border); padding: 8px 12px; border-radius: 8px;" placeholder="Contoh: Muhammad Rizky" required>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">NISN <span style="color:red">*</span></label>
                <input type="text" id="off-nisn" class="search-input-field" style="width: 100%; border: 1.5px solid var(--admin-border); padding: 8px 12px; border-radius: 8px;" placeholder="10 Digit NISN" maxlength="10" required>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">No. WhatsApp / HP Ortu <span style="color:red">*</span></label>
                <input type="text" id="off-wa" class="search-input-field" style="width: 100%; border: 1.5px solid var(--admin-border); padding: 8px 12px; border-radius: 8px;" placeholder="081234567890" required>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Asal Sekolah (SMP / MTs) <span style="color:red">*</span></label>
                <input type="text" id="off-sekolah" class="search-input-field" style="width: 100%; border: 1.5px solid var(--admin-border); padding: 8px 12px; border-radius: 8px;" placeholder="SMPN 1 Yogyakarta" required>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Pilihan Jurusan <span style="color:red">*</span></label>
                <select id="off-jurusan" class="search-input-field" style="width: 100%; border: 1.5px solid var(--admin-border); padding: 8px 12px; border-radius: 8px;" required>
                  <option value="MIPA">MIPA (Matematika & IPA)</option>
                  <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--admin-border); display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-action-detail" id="btn-cancel-offline" style="padding: 8px 16px;">Batal</button>
              <button type="submit" class="btn-action-activate" style="padding: 8px 20px;">💾 Simpan Pendaftar Loket</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Toast Feedback Notification Container -->
      <div class="admin-toast-container" id="admin-toast-container"></div>

    </div>
  `;

  // Elemen DOM Referensi
  const searchInput = document.getElementById('admin-search-input');
  const searchClear = document.getElementById('admin-search-clear');
  const tableBody = document.getElementById('table-pendaftar-body');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const btnRefresh = document.getElementById('btn-refresh-data');
  const statTotal = document.getElementById('stat-total-pendaftar');
  const statAktif = document.getElementById('stat-akun-aktif');
  const statPending = document.getElementById('stat-menunggu-aktivasi');
  const countBadge = document.getElementById('data-count-badge');
  const footerInfo = document.getElementById('table-footer-info');
  const modalBackdrop = document.getElementById('admin-detail-modal');
  const modalContent = document.getElementById('modal-detail-content');
  const modalFooter = document.getElementById('modal-footer-actions');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const notifBtn = document.getElementById('btn-admin-notif');

  // Helper Toast Notification
  function showToast(title, message, type = 'success') {
    const toastContainer = document.getElementById('admin-toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type === 'success' ? 'toast-success' : 'toast-warning'}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</div>
      <div class="toast-message-box">
        <span class="toast-title">${title}</span>
        <span class="toast-desc">${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Update Summary Cards Statistik
  function updateSummaryStats() {
    const list = fetchCurrentPendaftar();
    pendaftarList = list;

    // Hitung akun di tabel lokal
    let activeLocal = 0;
    let pendingLocal = 0;

    list.forEach(item => {
      const isAct = (item.status_akun === 'active' || item.status_akun === 'AKTIF');
      if (isAct) activeLocal++;
      else pendingLocal++;
    });

    // Menghitung statistik makro konsisten dengan instruksi:
    // Base nominal: Total 1,250 | Aktif 1,200 | Menunggu 50
    // Dynamic variance based on local state changes
    const baseTotal = 1250;
    const baseActive = 1200;
    const basePending = 50;

    // Offset dari seed lokal
    const activeOffset = activeLocal - 6; // Nilai default active di seed = 6
    const pendingOffset = pendingLocal - 4; // Nilai default pending di seed = 4

    const computedActive = Math.max(0, baseActive + activeOffset);
    const computedPending = Math.max(0, basePending + pendingOffset);
    const computedTotal = baseTotal;

    statTotal.textContent = computedTotal.toLocaleString('id-ID');
    statAktif.textContent = computedActive.toLocaleString('id-ID');
    statPending.textContent = computedPending.toLocaleString('id-ID');
  }

  // Filter & Search Logic
  function getFilteredList() {
    const query = searchQuery.toLowerCase().trim();
    return pendaftarList.filter(item => {
      const isActive = (item.status_akun === 'active' || item.status_akun === 'AKTIF');
      
      // Filter status tab
      if (activeFilter === 'active' && !isActive) return false;
      if (activeFilter === 'pending' && isActive) return false;

      // Filter query pencarian
      if (!query) return true;
      const nama = (item.nama_lengkap || item.nama || '').toLowerCase();
      const id = (item.id_pendaftar || item.id || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const nisn = (item.nisn || '').toLowerCase();

      return nama.includes(query) || id.includes(query) || email.includes(query) || nisn.includes(query);
    });
  }

  // Format ID Registrasi ke SPMB-2026-xxx
  function formatRegNumber(rawId) {
    if (!rawId) return 'SPMB-2026-001';
    if (rawId.startsWith('REG-')) {
      return rawId.replace('REG-', 'SPMB-');
    }
    return rawId;
  }

  // Inisial Nama untuk Avatar
  function getInitials(name) {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Render Baris Data Table
  function renderTableRows() {
    const filtered = getFilteredList();

    countBadge.textContent = `${filtered.length} dari ${pendaftarList.length} Akun`;
    footerInfo.textContent = `Menampilkan ${filtered.length} akun peserta (${activeFilter === 'all' ? 'Semua Status' : (activeFilter === 'active' ? 'Status Aktif' : 'Menunggu Aktivasi')})`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="table-empty-state">
              <div class="empty-state-icon">🔍</div>
              <div class="empty-state-text">Tidak ada data peserta yang cocok</div>
              <div class="empty-state-subtext">Coba ubah kata kunci pencarian atau ganti filter status akun.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
      const regId = item.id_pendaftar || item.id;
      const displayRegNo = formatRegNumber(regId);
      const nama = item.nama_lengkap || item.nama || 'Calon Siswa';
      const email = item.email || `${nama.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
      const nisn = item.nisn || '-';
      const isActive = (item.status_akun === 'active' || item.status_akun === 'AKTIF');

      return `
        <tr data-id="${regId}">
          <!-- 1. No -->
          <td class="col-num">${index + 1}</td>

          <!-- 2. Nama Lengkap (Orang Indonesia + Avatar + NISN) -->
          <td>
            <div class="student-meta-cell">
              <div class="student-avatar" title="${nama}">${getInitials(nama)}</div>
              <div class="student-names-box">
                <span class="student-name-text">${nama}</span>
                <span class="student-nisn-badge">NISN: ${nisn}</span>
              </div>
            </div>
          </td>

          <!-- 3. Nomor Pendaftaran -->
          <td>
            <span class="reg-number-badge">${displayRegNo}</span>
          </td>

          <!-- 4. Email Peserta -->
          <td>
            <a href="mailto:${email}" class="email-cell-link" title="Kirim email ke ${email}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-text-muted);">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>${email}</span>
            </a>
          </td>

          <!-- 5. Status Akun (Badge/Pill Hijau atau Kuning) -->
          <td>
            ${isActive 
              ? `
                <span class="status-pill status-pill-active" title="Akun aktif dan siap mengisi formulir">
                  <span class="pill-dot"></span>
                  <span>Aktif</span>
                </span>
              `
              : `
                <span class="status-pill status-pill-pending" title="Akun baru menunggu verifikasi aktivasi oleh admin">
                  <span class="pill-dot"></span>
                  <span>Belum Aktif</span>
                </span>
              `
            }
          </td>

          <!-- 6. Aksi (Action Buttons) -->
          <td style="text-align: right; padding-right: 20px;">
            <div class="action-buttons-group" style="justify-content: flex-end;">
              ${!isActive 
                ? `
                  <!-- Tombol Aktifkan (Aksen Utama #006837) -->
                  <button 
                    type="button" 
                    class="btn-action-activate btn-trigger-activate" 
                    data-id="${regId}" 
                    data-name="${nama}"
                    title="Aktifkan akun pendaftar ini sekarang"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Aktifkan</span>
                  </button>

                  <button 
                    type="button" 
                    class="btn-action-detail btn-trigger-detail" 
                    data-id="${regId}"
                    title="Lihat rincian pendaftar"
                  >
                    <span>Detail</span>
                  </button>
                `
                : `
                  <!-- Tombol Detail & Nonaktifkan -->
                  <button 
                    type="button" 
                    class="btn-action-detail btn-trigger-detail" 
                    data-id="${regId}"
                    title="Lihat rincian pendaftar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>Detail</span>
                  </button>

                  <button 
                    type="button" 
                    class="btn-action-deactivate btn-trigger-deactivate" 
                    data-id="${regId}" 
                    data-name="${nama}"
                    title="Nonaktifkan akun pendaftar ini"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span>Nonaktifkan</span>
                  </button>
                `
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableEvents();
  }

  // Handle Event Klik Aktivasi, Nonaktivasi & Detail
  function attachTableEvents() {
    // 1. Tombol Aktifkan
    document.querySelectorAll('.btn-trigger-activate').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        executeActivation(id, name);
      };
    });

    // 2. Tombol Nonaktifkan
    document.querySelectorAll('.btn-trigger-deactivate').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        executeDeactivation(id, name);
      };
    });

    // 3. Tombol Detail
    document.querySelectorAll('.btn-trigger-detail').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openDetailModal(id);
      };
    });
  }

  // Eksekusi Aktivasi Akun
  function executeActivation(id, name) {
    updateStatusAkun(id, 'active');
    updateSummaryStats();
    renderTableRows();
    showToast('Akun Diaktifkan!', `Akun peserta ${name} berhasil diaktifkan. Siswa kini dapat mengisi formulir lengkap.`, 'success');
  }

  // Eksekusi Nonaktivasi Akun
  function executeDeactivation(id, name) {
    if (confirm(`Yakin ingin menonaktifkan akun peserta ${name}? Siswa tidak akan dapat melanjutkan proses formulir sebelum diaktifkan kembali.`)) {
      updateStatusAkun(id, 'pending_activation');
      updateSummaryStats();
      renderTableRows();
      showToast('Akun Dinonaktifkan', `Status akun ${name} diubah kembali menjadi Menunggu Aktivasi.`, 'warning');
    }
  }

  // Modal Detail Peserta
  function openDetailModal(id) {
    const student = pendaftarList.find(item => (item.id_pendaftar === id || item.id === id));
    if (!student) return;

    const isActive = (student.status_akun === 'active' || student.status_akun === 'AKTIF');
    const nama = student.nama_lengkap || student.nama || '-';
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const nisn = student.nisn || '-';
    const email = student.email || '-';
    const noWa = student.no_wa || '-';
    const asalSekolah = (student.biodata && student.biodata.asal_sekolah) ? student.biodata.asal_sekolah : '-';
    const jurusan = (student.biodata && student.biodata.pilihan_jurusan) ? student.biodata.pilihan_jurusan : '-';
    const alamat = (student.biodata && student.biodata.alamat) ? student.biodata.alamat : '-';
    const tglDaftar = student.created_at ? new Date(student.created_at).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '05 Oktober 2026';

    modalContent.innerHTML = `
      <div class="modal-student-hero">
        <div class="modal-avatar">${getInitials(nama)}</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--admin-text-title); margin: 0;">${nama}</h4>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span class="reg-number-badge">${regNo}</span>
            <span class="status-pill ${isActive ? 'status-pill-active' : 'status-pill-pending'}">
              <span class="pill-dot"></span>
              <span>${isActive ? 'Akun Aktif' : 'Belum Aktif'}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="modal-meta-grid">
        <div class="meta-field-box">
          <div class="meta-field-label">Nomor Induk Siswa (NISN)</div>
          <div class="meta-field-value">${nisn}</div>
        </div>
        <div class="meta-field-box">
          <div class="meta-field-label">No. WhatsApp</div>
          <div class="meta-field-value">${noWa}</div>
        </div>
        <div class="meta-field-box">
          <div class="meta-field-label">Email Terdaftar</div>
          <div class="meta-field-value">${email}</div>
        </div>
        <div class="meta-field-box">
          <div class="meta-field-label">Pilihan Jurusan</div>
          <div class="meta-field-value">${jurusan !== '-' ? jurusan : 'Belum Memilih'}</div>
        </div>
        <div class="meta-field-box" style="grid-column: span 2;">
          <div class="meta-field-label">Asal Sekolah</div>
          <div class="meta-field-value">${asalSekolah}</div>
        </div>
        <div class="meta-field-box" style="grid-column: span 2;">
          <div class="meta-field-label">Alamat Lengkap Domisili</div>
          <div class="meta-field-value">${alamat}</div>
        </div>
        <div class="meta-field-box" style="grid-column: span 2;">
          <div class="meta-field-label">Waktu Registrasi Akun</div>
          <div class="meta-field-value" style="font-size: 0.8rem; color: var(--admin-text-muted);">${tglDaftar} WIB</div>
        </div>
      </div>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn-refresh" id="btn-modal-close-footer" style="padding: 8px 16px;">Tutup</button>
      ${!isActive 
        ? `
          <button type="button" class="btn-action-activate" id="btn-modal-activate" style="padding: 8px 18px;">
            ✓ Aktifkan Akun Siswa Ini
          </button>
        `
        : `
          <button type="button" class="btn-action-deactivate" id="btn-modal-deactivate" style="padding: 8px 16px;">
            ✕ Nonaktifkan Akun
          </button>
        `
      }
    `;

    document.getElementById('btn-modal-close-footer').onclick = closeModal;
    
    const modalActBtn = document.getElementById('btn-modal-activate');
    if (modalActBtn) {
      modalActBtn.onclick = () => {
        executeActivation(id, nama);
        closeModal();
      };
    }

    const modalDeactBtn = document.getElementById('btn-modal-deactivate');
    if (modalDeactBtn) {
      modalDeactBtn.onclick = () => {
        executeDeactivation(id, nama);
        closeModal();
      };
    }

    modalBackdrop.classList.add('open');
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
  }

  btnCloseModal.onclick = closeModal;
  modalBackdrop.onclick = (e) => {
    if (e.target === modalBackdrop) closeModal();
  };

  // Search input listeners
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    searchClear.style.display = searchQuery ? 'block' : 'none';
    renderTableRows();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    renderTableRows();
    searchInput.focus();
  });

  // Filter tab buttons listener
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilter = e.currentTarget.getAttribute('data-filter');
      renderTableRows();
    });
  });

  // Tombol Refresh
  btnRefresh.addEventListener('click', () => {
    pendaftarList = fetchCurrentPendaftar();
    updateSummaryStats();
    renderTableRows();
    showToast('Data Disinkronkan', 'Tabel dan statistik akun telah disinkronkan dengan basis data terbaru.', 'success');
  });

  // Notifikasi Icon click
  notifBtn.addEventListener('click', () => {
    const pendingList = pendaftarList.filter(p => !(p.status_akun === 'active' || p.status_akun === 'AKTIF'));
    alert(`🔔 Informasi Notifikasi SPMB:\nTerdapat ${pendingList.length} calon peserta yang saat ini berstatus 'Belum Aktif' dan memerlukan tinjauan aktivasi akun oleh Admin.`);
  });

  // Dengarkan event eksternal dari Modul 01 (misal ada pendaftar baru)
  const onDatabaseChange = () => {
    pendaftarList = fetchCurrentPendaftar();
    updateSummaryStats();
    renderTableRows();
  };

  window.addEventListener('spmb_db_updated', onDatabaseChange);
  document.addEventListener('spmb_db_updated', onDatabaseChange);

  // Inisialisasi awal
  updateSummaryStats();
  renderTableRows();
}

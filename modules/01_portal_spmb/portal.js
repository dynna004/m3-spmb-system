/**
 * Modul 01: Portal Calon Peserta Didik (Portal SPMB)
 * SMA Muhammadiyah 3 Yogyakarta
 * 
 * Terhubung langsung (Native SPA Component) ke index.html (#01):
 * - Tab 1: Registrasi Akun (Alur 1a)
 * - Tab 2: Status Aktivasi Akun (Alur 4) - Lengkap dengan toggle pending/active
 * - Tab 3: Login Pendaftar (Akses Akun Terdaftar)
 * - Tab 4: Formulir & Berkas (Alur 5: Biodata, 4 Dokumen, Jadwal Wawancara Daring/Luring, Yosa/Veli)
 * - Tab 5: Dashboard Calon Siswa (Alur 10: Tiket Wawancara, Status Kelulusan SKL Modul 05)
 */

import {
  getPendaftarList,
  getPendaftarById,
  savePendaftar,
  updateStatusAkun,
  hashPassword,
  fileToDataURL,
  isValidEmail,
  isValidNoWA,
  isValidPassword,
  escapeHTML,
  dispatchSPMBEvent,
  logoutUser
} from './utils.js';

let activeTab = 'status'; // Default ke status agar penguji langsung melihat status aktivasi
let currentTrackingId = 'REG-2026-002'; // Default ke Budi Santoso
let currentLoggedInUser = null;

// Pulihkan session login jika ada
try {
  const sess = localStorage.getItem('m3_spmb_logged_in_user');
  if (sess) {
    currentLoggedInUser = JSON.parse(sess);
  }
  const cur = localStorage.getItem('m3_spmb_current_user');
  if (cur) {
    const curObj = JSON.parse(cur);
    if (curObj && (curObj.id_pendaftar || curObj.id)) {
      currentTrackingId = curObj.id_pendaftar || curObj.id;
    }
  }
} catch (e) {
  console.warn('Gagal memulihkan session lokal:', e);
}

/**
 * Pastikan stylesheet khusus Modul 01 terpasang di dokumen
 */
function ensurePortalStyles() {
  const styleId = 'm3-portal-spmb-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    .portal-root-wrapper {
      font-family: inherit;
      color: #0f172a;
    }
    .portal-header-bar {
      background: #ffffff;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .portal-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .portal-brand-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #006837 0%, #004d28 100%);
      color: white;
      border-radius: 12px;
      font-weight: 800;
      font-size: 1.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 104, 55, 0.2);
    }
    .portal-stepper-nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 1.5rem;
    }
    .portal-nav-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .portal-nav-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .portal-nav-btn.active {
      background: #006837;
      color: #ffffff;
      border-color: #006837;
      box-shadow: 0 2px 6px rgba(0, 104, 55, 0.25);
    }
    .portal-card-box {
      background: #ffffff;
      border-radius: 16px;
      padding: 2rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      margin-bottom: 1.5rem;
    }
    .portal-status-badge {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 30px;
      font-weight: 800;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .portal-badge-pending {
      background-color: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .portal-badge-active {
      background-color: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .portal-notice-box {
      border-radius: 12px;
      padding: 1.25rem;
      margin: 1rem 0 1.25rem 0;
      font-size: 0.92rem;
      line-height: 1.6;
    }
    .portal-notice-pending {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    .portal-notice-active {
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      color: #14532d;
    }
    .portal-detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      background: #f8fafc;
      padding: 1.25rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin: 1.25rem 0;
      font-size: 0.88rem;
    }
    .portal-detail-grid strong {
      display: block;
      color: #64748b;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .portal-detail-grid span {
      font-weight: 700;
      color: #0f172a;
    }
    .portal-simulator-box {
      margin-top: 1.75rem;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 0.85rem;
      color: #475569;
    }
    .portal-btn-primary {
      background: #006837;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.2s ease;
      text-decoration: none;
    }
    .portal-btn-primary:hover:not(:disabled) {
      background: #004d28;
    }
    .portal-btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      filter: grayscale(30%);
      pointer-events: none;
    }
    .portal-btn-secondary {
      background: #f5a623;
      color: #000000;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .portal-btn-secondary:hover {
      background: #d48b17;
    }
    .portal-ticket-card {
      background: #ffffff;
      border: 2px solid #86efac;
      border-radius: 14px;
      padding: 1.5rem;
      position: relative;
      box-shadow: 0 4px 14px rgba(22, 101, 52, 0.06);
      margin-bottom: 1.5rem;
    }
    .portal-ticket-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(180deg, #006837 0%, #10b981 100%);
      border-radius: 14px 0 0 14px;
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * Komponen Utama: renderPortalSPMB
 */
export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  ensurePortalStyles();

  function renderView() {
    // Sinkronkan data user jika ada sesi login
    if (currentLoggedInUser) {
      const fresh = getPendaftarById(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id || currentLoggedInUser.nisn);
      if (fresh) currentLoggedInUser = fresh;
    }

    container.innerHTML = `
      <div class="portal-root-wrapper">
        <!-- Header Bar -->
        <div class="portal-header-bar">
          <div class="portal-header-left">
            <div class="portal-brand-logo">M3</div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: #006837; margin: 0;">Portal Calon Peserta Didik (SPMB 2026)</h2>
              <p style="color: #64748b; font-size: 0.8rem; margin: 2px 0 0 0;">SMA Muhammadiyah 3 Yogyakarta &bull; Jalur Mandiri & SSoT Terintegrasi</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${currentLoggedInUser ? `
              <span style="font-size: 0.82rem; background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #bbf7d0;">
                ✓ Login: ${escapeHTML(currentLoggedInUser.nama_lengkap || currentLoggedInUser.nama)}
              </span>
              <button id="spmb-btn-logout-header" class="portal-btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;">Logout</button>
            ` : `
              <span style="font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">
                Belum Login
              </span>
            `}
          </div>
        </div>

        <!-- Stepper Navigation (Native Tab Bar) -->
        <nav class="portal-stepper-nav" aria-label="Navigasi Tahapan Portal SPMB">
          <button class="portal-nav-btn ${activeTab === 'register' ? 'active' : ''}" data-target="register">
            1. Registrasi Akun
          </button>
          <button class="portal-nav-btn ${activeTab === 'status' ? 'active' : ''}" data-target="status">
            2. Status Aktivasi (Syarat Login)
          </button>
          <button class="portal-nav-btn ${activeTab === 'login' ? 'active' : ''}" data-target="login">
            3. Login Pendaftar
          </button>
          <button class="portal-nav-btn ${activeTab === 'formulir' ? 'active' : ''}" data-target="formulir">
            4. Formulir & Berkas
          </button>
          <button class="portal-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-target="dashboard">
            5. Dashboard Siswa
          </button>
        </nav>

        <!-- Area Konten Tab -->
        <div id="spmb-tab-content-area">
          ${renderActiveTabContent()}
        </div>
      </div>
    `;

    bindPortalEvents();
  }

  /**
   * Render Konten Berdasarkan Tab yang Aktif
   */
  function renderActiveTabContent() {
    switch (activeTab) {
      case 'register': return renderRegisterView();
      case 'status': return renderStatusView();
      case 'login': return renderLoginView();
      case 'formulir': return renderFormulirView();
      case 'dashboard': return renderDashboardView();
      default: return renderStatusView();
    }
  }

  // ==========================================
  // TAB 1: REGISTRASI AKUN
  // ==========================================
  function renderRegisterView() {
    return `
      <div class="portal-card-box" style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a;">Formulir Registrasi Akun SPMB</h3>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Daftarkan akun awal Anda untuk mendapatkan Nomor Registrasi resmi.</p>
        </div>

        <div id="reg-alert-box" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem;"></div>

        <form id="spmb-form-register">
          <div class="form-group">
            <label>Nama Lengkap Siswa *</label>
            <input type="text" id="reg-nama" class="form-control" placeholder="Contoh: Muhammad Rizki" required>
          </div>

          <div class="form-group">
            <label>NISN (10 Digit Angka) *</label>
            <input type="text" id="reg-nisn" class="form-control" maxlength="10" placeholder="Contoh: 0051234567" pattern="[0-9]{10}" required>
            <small style="color: #64748b; font-size: 0.75rem;">NISN resmi dari Kemendikbudristek (harus 10 angka unik)</small>
          </div>

          <div class="form-group">
            <label>Nomor WhatsApp Aktif *</label>
            <input type="text" id="reg-wa" class="form-control" placeholder="Contoh: 081234567890" required>
          </div>

          <div class="form-group">
            <label>Alamat Email Aktif *</label>
            <input type="email" id="reg-email" class="form-control" placeholder="Contoh: siswa@gmail.com" required>
          </div>

          <div class="form-group">
            <label>Password Akun *</label>
            <input type="password" id="reg-pass" class="form-control" placeholder="Min. 6 karakter (huruf & angka)" required>
          </div>

          <div class="form-group">
            <label>Konfirmasi Password *</label>
            <input type="password" id="reg-pass2" class="form-control" placeholder="Ulangi password di atas" required>
          </div>

          <button type="submit" class="portal-btn-primary" style="width: 100%; padding: 12px; margin-top: 1rem;">
            Daftarkan Akun &rarr;
          </button>
        </form>
      </div>
    `;
  }

  // ==========================================
  // TAB 2: STATUS AKTIVASI AKUN (SESUAI GAMBAR USER)
  // ==========================================
  function renderStatusView() {
    const list = getPendaftarList();
    let current = null;

    if (currentTrackingId) {
      current = getPendaftarById(currentTrackingId);
    }
    if (!current && currentLoggedInUser) {
      current = getPendaftarById(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id || currentLoggedInUser.nisn);
    }
    if (!current && list.length > 0) {
      // Prioritaskan akun Budi Santoso atau akun terakhir
      current = list.find(p => p.id_pendaftar === 'REG-2026-002') || list[list.length - 1];
    }

    if (!current) {
      return `
        <div class="portal-card-box" style="text-align: center; padding: 3rem 1.5rem; max-width: 560px; margin: 0 auto;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
          <h3 style="font-weight: 800; color: #0f172a;">Belum Ada Akun Terdaftar</h3>
          <p style="color: #64748b; font-size: 0.88rem; margin: 8px 0 1.5rem 0;">Silakan lakukan pendaftaran akun terlebih dahulu pada Tab 1.</p>
          <button class="portal-btn-primary" id="btn-goto-register">1. Registrasi Akun Sekarang</button>
        </div>
      `;
    }

    const isActive = (current.status_akun === 'active' || current.status_akun === 'AKTIF');
    const displayId = current.id_pendaftar || current.id || 'REG-2026-001';
    const displayNama = current.nama_lengkap || current.nama || '-';
    const displayNisn = current.nisn || '-';
    const displayDate = current.created_at ? new Date(current.created_at).toLocaleString('id-ID') : '10/10/2026, 08.00.00';

    return `
      <div class="portal-card-box" style="max-width: 580px; margin: 0 auto;">
        <!-- Header Kecil -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <span style="font-size: 0.8rem; color: #64748b;">SMA Muhammadiyah 3 Yogyakarta</span>
          ${currentLoggedInUser ? `
            <button id="btn-logout-status" class="portal-btn-secondary" style="font-size: 0.75rem; padding: 3px 10px;">Logout Session</button>
          ` : ''}
        </div>

        <!-- Brand Center Header -->
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="portal-brand-logo" style="margin: 0 auto 0.75rem auto; width: 56px; height: 56px; font-size: 1.5rem;">M3</div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0;">Status Aktivasi Akun</h2>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Syarat Mutlak Sebelum Melakukan Login ke Portal Siswa</p>
        </div>

        <!-- Badge Status (PERSIS TAMPILAN USER) -->
        <div style="text-align: center;">
          <span class="portal-status-badge ${isActive ? 'portal-badge-active' : 'portal-badge-pending'}" id="badge-status-val">
            ${isActive ? 'ACTIVE' : 'PENDING ACTIVATION'}
          </span>
        </div>

        <!-- Toast / Notifikasi Pesan -->
        <div class="portal-notice-box ${isActive ? 'portal-notice-active' : 'portal-notice-pending'}" id="notice-status-box">
          ${isActive ? `
            <strong>Akun Terverifikasi & Aktif!</strong><br>
            Selamat! Akun Anda telah diaktivasi oleh Admin SPMB. Silakan <strong>Login</strong> terlebih dahulu untuk mengisi Formulir Pendaftaran lengkap.
          ` : `
            <strong>Akun Anda berhasil dibuat dan sedang menunggu aktivasi dari Admin SPMB.</strong><br>
            Silakan secara berkala memeriksa halaman ini atau menghubungi Panitia SPMB SMA Muhammadiyah 3 Yogyakarta.
          `}
        </div>

        <!-- Detail Grid Data Pendaftar -->
        <div class="portal-detail-grid">
          <div>
            <strong>ID Pendaftar</strong>
            <span id="display-reg-id">${escapeHTML(displayId)}</span>
          </div>
          <div>
            <strong>Nama Pendaftar</strong>
            <span id="display-reg-nama">${escapeHTML(displayNama)}</span>
          </div>
          <div>
            <strong>NISN</strong>
            <span id="display-reg-nisn">${escapeHTML(displayNisn)}</span>
          </div>
          <div>
            <strong>Waktu Pendaftaran</strong>
            <span>${escapeHTML(displayDate)}</span>
          </div>
        </div>

        <!-- Tombol Aksi Menuju Login -->
        <div style="margin-top: 1.5rem;">
          <button id="btn-portal-to-login" class="portal-btn-primary" style="width: 100%; padding: 12px; font-size: 1rem;" ${!isActive ? 'disabled' : ''}>
            🔑 Ke Halaman Login Pendaftar &rarr;
          </button>
        </div>

        <!-- SIMULASI TOGGLE KHUSUS TESTING HANDOVER ADMIN SPMB -->
        <div class="portal-simulator-box">
          <strong>💡 Testing Handover Admin SPMB:</strong><br>
          <span style="display: block; margin: 4px 0 8px 0; font-size: 0.8rem;">
            Pilih akun & ubah status simulasi untuk evaluasi cepat:
          </span>
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <select id="select-active-user-status" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8rem; font-family: inherit;">
              ${list.map(p => `
                <option value="${p.id_pendaftar || p.id}" ${(p.id_pendaftar === displayId || p.id === displayId) ? 'selected' : ''}>
                  ${escapeHTML(p.id_pendaftar || p.id)} - ${escapeHTML(p.nama_lengkap || p.nama)} (${p.status_akun || 'pending'})
                </option>
              `).join('')}
            </select>
            <button id="btn-toggle-status-akun" class="portal-btn-secondary" style="padding: 6px 14px; font-size: 0.78rem;">
              ⚡ Toggle status_akun (pending_activation / active)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 3: LOGIN PENDAFTAR
  // ==========================================
  function renderLoginView() {
    if (currentLoggedInUser) {
      return `
        <div class="portal-card-box" style="text-align: center; padding: 2.5rem 1.5rem; max-width: 520px; margin: 0 auto;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👤</div>
          <h3 style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">Sesi Calon Siswa Aktif</h3>
          <p style="color: #64748b; font-size: 0.88rem; margin-bottom: 1.5rem;">
            Anda telah login sebagai <strong>${escapeHTML(currentLoggedInUser.nama_lengkap || currentLoggedInUser.nama)}</strong> (${escapeHTML(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id)})
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="portal-btn-primary" id="btn-goto-dashboard-from-login">5. Buka Dashboard Siswa &rarr;</button>
            <button class="portal-btn-secondary" id="btn-goto-form-from-login">4. Isi / Edit Formulir</button>
            <button class="portal-btn-secondary" id="btn-logout-from-login-view" style="background: #e2e8f0;">🚪 Logout</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="portal-card-box" style="max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="portal-brand-logo" style="margin: 0 auto 0.75rem auto;">M3</div>
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a;">Login Pendaftar SPMB</h3>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Masuk dengan NISN / Email & Password Anda</p>
        </div>

        <div id="login-alert-box" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;"></div>

        <form id="spmb-form-login">
          <div class="form-group">
            <label>NISN atau Email Terdaftar *</label>
            <input type="text" id="login-identity" class="form-control" placeholder="10 digit NISN atau Email" value="1234567890" required>
          </div>

          <div class="form-group">
            <label>Password *</label>
            <input type="password" id="login-pass" class="form-control" placeholder="Masukkan password Anda" value="password123" required>
          </div>

          <button type="submit" class="portal-btn-primary" style="width: 100%; padding: 12px; margin-top: 1rem;">
            Masuk / Login Pendaftar
          </button>

          <!-- Quick Autofill Demo -->
          <div style="margin-top: 1.25rem; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 0.78rem; color: #64748b; text-align: center;">
            Demo sample: NISN <code>1234567890</code> & password <code>password123</code> (Budi Santoso)
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================
  // TAB 4: FORMULIR & UNGGAH BERKAS
  // ==========================================
  function renderFormulirView() {
    if (!currentLoggedInUser) {
      return `
        <div class="portal-card-box" style="text-align: center; padding: 3rem 1.5rem; max-width: 540px; margin: 0 auto;">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔒</div>
          <h3 style="font-weight: 800; color: #991b1b; margin-bottom: 6px;">Login Diperlukan</h3>
          <p style="color: #64748b; font-size: 0.88rem; line-height: 1.6; margin-bottom: 1.5rem;">
            Sesuai aturan SPMB, formulir pendaftaran dan upload berkas hanya dapat diisi setelah akun diaktivasi dan Anda telah melakukan Login.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="portal-btn-primary" id="btn-to-login-from-locked-form">3. Login Pendaftar</button>
            <button class="portal-btn-secondary" id="btn-quick-login-budi">⚡ Quick Login (Budi Santoso)</button>
          </div>
        </div>
      `;
    }

    const bio = currentLoggedInUser.biodata || {};
    const jadwal = currentLoggedInUser.jadwal_wawancara || {};

    return `
      <div class="portal-card-box" style="max-width: 760px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #006837; margin: 0;">Formulir Biodata & Berkas Dokumen</h3>
            <p style="color: #64748b; font-size: 0.82rem; margin: 2px 0 0 0;">
              Calon Siswa: <strong>${escapeHTML(currentLoggedInUser.nama_lengkap || currentLoggedInUser.nama)}</strong> (${escapeHTML(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id)})
            </p>
          </div>
          <button id="btn-logout-from-form" class="portal-btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;">Logout</button>
        </div>

        <div id="form-alert-box" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;"></div>

        <form id="spmb-form-biodata-lengkap">
          <h4 style="color: #006837; font-size: 1rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            1. Biodata Pribadi Calon Siswa
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>Nama Lengkap *</label>
              <input type="text" id="f-nama" class="form-control" value="${escapeHTML(currentLoggedInUser.nama_lengkap || currentLoggedInUser.nama || '')}" required>
            </div>
            <div class="form-group">
              <label>NIK (16 Digit Angka) *</label>
              <input type="text" id="f-nik" class="form-control" maxlength="16" placeholder="3171012345678901" value="${escapeHTML(bio.nik || '')}" pattern="[0-9]{16}" required>
            </div>
          </div>

          <div class="form-group">
            <label>Alamat Lengkap *</label>
            <textarea id="f-alamat" class="form-control" rows="2" placeholder="Jl. Merdeka No. 10, Umbulharjo, Yogyakarta" required>${escapeHTML(bio.alamat || '')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>Asal Sekolah (SMP / MTs) *</label>
              <input type="text" id="f-sekolah" class="form-control" placeholder="SMPN 1 Yogyakarta" value="${escapeHTML(bio.asal_sekolah || '')}" required>
            </div>
            <div class="form-group">
              <label>Nama Orang Tua / Wali *</label>
              <input type="text" id="f-ortu" class="form-control" placeholder="Budi Santoso Sr." value="${escapeHTML(bio.nama_orang_tua || '')}" required>
            </div>
          </div>

          <div class="form-group">
            <label>Pilihan Peminatan Jurusan *</label>
            <select id="f-jurusan" class="form-control" required>
              <option value="MIPA" ${(bio.pilihan_jurusan === 'MIPA' || !bio.pilihan_jurusan) ? 'selected' : ''}>MIPA (Matematika & Ilmu Pengetahuan Alam)</option>
              <option value="IPS" ${bio.pilihan_jurusan === 'IPS' ? 'selected' : ''}>IPS (Ilmu Pengetahuan Sosial)</option>
            </select>
          </div>

          <h4 style="color: #006837; font-size: 1rem; margin: 1.5rem 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            2. Unggah 4 Dokumen Digital (Persyaratan SPMB)
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>1. Akta Kelahiran *</label>
              <input type="file" id="up-akta" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
              <small style="color: #15803d; font-size: 0.75rem;">✓ File terverifikasi (format JPEG/PDF)</small>
            </div>
            <div class="form-group">
              <label>2. Kartu Keluarga (KK) *</label>
              <input type="file" id="up-kk" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
              <small style="color: #15803d; font-size: 0.75rem;">✓ File terverifikasi (format JPEG/PDF)</small>
            </div>
            <div class="form-group">
              <label>3. Ijazah / SKL SMP *</label>
              <input type="file" id="up-ijazah" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
              <small style="color: #15803d; font-size: 0.75rem;">✓ File terverifikasi (format JPEG/PDF)</small>
            </div>
            <div class="form-group">
              <label>4. Bukti Bayar Formulir *</label>
              <input type="file" id="up-bayar" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
              <small style="color: #15803d; font-size: 0.75rem;">✓ Kuitansi Bank BSI / Bukti Transfer</small>
            </div>
          </div>

          <h4 style="color: #006837; font-size: 1rem; margin: 1.5rem 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            3. Pemilihan Jadwal Wawancara (Daring / Luring)
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>Metode Wawancara *</label>
              <select id="w-metode" class="form-control" required>
                <option value="Luring" ${jadwal.metode === 'Luring' ? 'selected' : ''}>Luring (Tatap Muka di Sekolah)</option>
                <option value="Daring" ${jadwal.metode === 'Daring' ? 'selected' : ''}>Daring (Online Google Meet)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Pilihan Hari / Sesi *</label>
              <select id="w-hari" class="form-control" required>
                <option value="Senin, 19 Okt 2026 (08.00 - 09.00 WIB) - Weekday">Senin, 19 Okt 2026 (08.00 - 09.00 WIB) - Weekday</option>
                <option value="Selasa, 20 Okt 2026 (10.00 - 11.00 WIB) - Weekday">Selasa, 20 Okt 2026 (10.00 - 11.00 WIB) - Weekday</option>
                <option value="Sabtu, 24 Okt 2026 (09.00 - 10.00 WIB) - Weekend">Sabtu, 24 Okt 2026 (09.00 - 10.00 WIB) - Weekend</option>
                <option value="Ahad, 25 Okt 2026 (10.00 - 11.00 WIB) - Weekend">Ahad, 25 Okt 2026 (10.00 - 11.00 WIB) - Weekend</option>
              </select>
            </div>
          </div>

          <button type="submit" class="portal-btn-primary" style="width: 100%; padding: 12px; margin-top: 1.5rem; font-size: 1rem;">
            💾 Simpan Formulir & Buka Dashboard Siswa &rarr;
          </button>
        </form>
      </div>
    `;
  }

  // ==========================================
  // TAB 5: DASHBOARD SISWA (PASCA LOGIN)
  // ==========================================
  function renderDashboardView() {
    if (!currentLoggedInUser) {
      return `
        <div class="portal-card-box" style="text-align: center; padding: 3rem 1.5rem; max-width: 520px; margin: 0 auto;">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔒</div>
          <h3 style="font-weight: 800; color: #0f172a; margin-bottom: 6px;">Dashboard Calon Siswa</h3>
          <p style="color: #64748b; font-size: 0.88rem; margin-bottom: 1.5rem;">
            Silakan login terlebih dahulu untuk mengakses Tiket Wawancara dan Pengumuman Kelulusan SKL digital Anda.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="portal-btn-primary" id="btn-to-login-from-dash">3. Login Pendaftar</button>
            <button class="portal-btn-secondary" id="btn-quick-login-dash">⚡ Quick Login (Budi Santoso)</button>
          </div>
        </div>
      `;
    }

    const user = currentLoggedInUser;
    const jadwal = user.jadwal_wawancara || {
      metode: 'Luring',
      ruang: 'Ruang Wawancara 1 (Gedung Utama)',
      pewawancara: 'Yosa',
      sesi: '08.00 - 09.00 WIB',
      tanggal: '2026-10-19',
      hari: 'Senin'
    };
    const kelulusan = user.status_kelulusan || 'LULUS';

    return `
      <div style="max-width: 860px; margin: 0 auto;">
        <!-- Header Profil -->
        <div class="portal-card-box" style="padding: 1.5rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="portal-brand-logo" style="width: 52px; height: 52px;">M3</div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0;">${escapeHTML(user.nama_lengkap || user.nama)}</h3>
                  <span class="portal-status-badge portal-badge-active" style="margin: 0; padding: 2px 10px; font-size: 0.72rem;">ACTIVE</span>
                </div>
                <p style="color: #64748b; font-size: 0.82rem; margin: 3px 0 0 0;">
                  No. Registrasi: <strong style="color: #006837;">${escapeHTML(user.id_pendaftar || user.id)}</strong> &bull; NISN: ${escapeHTML(user.nisn)}
                </p>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="portal-btn-secondary" id="btn-edit-form-from-dash" style="font-size: 0.8rem;">📝 Edit Formulir</button>
              <button class="portal-btn-secondary" id="btn-logout-dash" style="background: #e2e8f0; font-size: 0.8rem;">🚪 Logout</button>
            </div>
          </div>
        </div>

        <!-- 1. Tiket Sesi Wawancara Resmi -->
        <div class="portal-ticket-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 1rem;">
            <div>
              <span style="font-size: 0.75rem; font-weight: 800; color: #006837; text-transform: uppercase; letter-spacing: 0.5px;">
                🎟️ TIKET SESI WAWANCARA RESMI
              </span>
              <h4 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">
                Wawancara SPMB SMA Muhammadiyah 3 Yogyakarta
              </h4>
            </div>
            <span style="background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.78rem;">
              TERJADWAL
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: #f8fafc; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
            <div>
              <strong style="display: block; font-size: 0.72rem; color: #64748b;">METODE PELAKSANAAN</strong>
              <span style="font-weight: 700; color: #006837;">${escapeHTML(jadwal.metode || 'Luring')}</span>
            </div>
            <div>
              <strong style="display: block; font-size: 0.72rem; color: #64748b;">LOKASI / TAUTAN</strong>
              <span style="font-weight: 700;">${escapeHTML(jadwal.ruang || (jadwal.metode === 'Daring' ? 'Google Meet SPMB M3' : 'Ruang Wawancara 1 Gedung Utama'))}</span>
            </div>
            <div>
              <strong style="display: block; font-size: 0.72rem; color: #64748b;">PEWAWANCARA RESMI</strong>
              <span style="font-weight: 700; color: #0f172a;">Ibu / Bpk ${escapeHTML(jadwal.pewawancara || 'Yosa')}</span>
            </div>
            <div>
              <strong style="display: block; font-size: 0.72rem; color: #64748b;">SESI & JAM OPERASIONAL</strong>
              <span style="font-weight: 700;">${escapeHTML(jadwal.sesi || '08.00 - 09.00 WIB')}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <p style="margin: 0; font-size: 0.78rem; color: #64748b;">
              &bull; Jam Layanan: Weekday (08.00–15.00 WIB) | Weekend (09.00–15.00 WIB)
            </p>
            <button class="portal-btn-primary" onclick="window.print()" style="padding: 6px 14px; font-size: 0.8rem;">
              🖨️ Cetak Tiket Wawancara
            </button>
          </div>
        </div>

        <!-- 2. Pengumuman Kelulusan & SKL Digital -->
        <div class="portal-card-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0;">
              🎓 Status Hasil Seleksi SPMB 2026 (Yudisium Modul 05)
            </h4>
            <span style="font-size: 0.85rem; font-weight: 800; padding: 4px 14px; border-radius: 20px; ${
              kelulusan === 'LULUS' ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;' :
              kelulusan === 'CADANGAN' ? 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;' :
              'background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;'
            }">
              STATUS: ${kelulusan}
            </span>
          </div>

          ${kelulusan === 'LULUS' ? `
            <div class="portal-notice-box portal-notice-active" style="margin: 0 0 1rem 0;">
              <strong>🎉 SELAMAT! Anda Dinyatakan LULUS Seleksi SPMB SMA Muhammadiyah 3 Yogyakarta!</strong><br>
              Silakan segera mengunduh / mencetak Surat Keterangan Lulus (SKL) resmi untuk keperluan Daftar Ulang di Loket Verifikasi Sekolah.
            </div>
            <div style="text-align: right;">
              <button class="portal-btn-primary" onclick="alert('Surat Keterangan Lulus (SKL) Resmi Digital dicetak dengan stempel basah elektronik.'); window.print();" style="padding: 8px 18px; font-size: 0.85rem;">
                📜 Cetak SKL Resmi Digital
              </button>
            </div>
          ` : `
            <div class="portal-notice-box" style="background: #f8fafc; border-left: 4px solid #64748b; color: #334155; margin: 0;">
              Sidang Yudisium penetapan kelulusan sedang dalam proses oleh Panitia SPMB.
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  function bindPortalEvents() {
    // Navigasi Tab Bar
    const navButtons = container.querySelectorAll('.portal-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) {
          activeTab = target;
          renderView();
        }
      });
    });

    // Logout Header
    const btnLogoutHeader = container.querySelector('#spmb-btn-logout-header');
    if (btnLogoutHeader) {
      btnLogoutHeader.addEventListener('click', () => {
        logoutUser();
        currentLoggedInUser = null;
        alert('Sesi Anda telah logout.');
        activeTab = 'login';
        renderView();
      });
    }

    // 1. Registrasi Form
    const formReg = container.querySelector('#spmb-form-register');
    if (formReg) {
      formReg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#reg-alert-box');
        const nama = container.querySelector('#reg-nama').value.trim();
        const nisn = container.querySelector('#reg-nisn').value.trim();
        const wa = container.querySelector('#reg-wa').value.trim();
        const email = container.querySelector('#reg-email').value.trim();
        const pass = container.querySelector('#reg-pass').value;
        const pass2 = container.querySelector('#reg-pass2').value;

        if (!/^[0-9]{10}$/.test(nisn)) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#991b1b';
          alertBox.textContent = 'NISN wajib tepat 10 digit angka!';
          return;
        }

        if (pass !== pass2) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#991b1b';
          alertBox.textContent = 'Password dan Konfirmasi Password tidak cocok!';
          return;
        }

        const list = getPendaftarList();
        if (list.some(p => p.nisn === nisn)) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#991b1b';
          alertBox.textContent = `NISN ${nisn} sudah pernah didaftarkan sebelumnya!`;
          return;
        }

        const passHash = await hashPassword(pass);
        const newId = `REG-2026-${String(list.length + 1).padStart(3, '0')}`;

        const newPendaftar = {
          id_pendaftar: newId,
          id: newId,
          nama_lengkap: nama,
          nama: nama,
          nisn: nisn,
          no_wa: wa,
          email: email,
          password_hash: passHash,
          password: pass,
          status_akun: 'pending_activation',
          status_kelulusan: null,
          created_at: new Date().toISOString(),
          biodata: null,
          berkas: null,
          pembayaran: null,
          jadwal_wawancara: {
            metode: 'Luring',
            ruang: 'Ruang Wawancara 1 (Gedung Utama)',
            pewawancara: 'Yosa',
            sesi: '08.00 - 09.00 WIB',
            hari: 'Senin',
            tanggal: '2026-10-19'
          }
        };

        savePendaftar(newPendaftar);
        currentTrackingId = newId;
        localStorage.setItem('m3_spmb_current_user', JSON.stringify(newPendaftar));

        alert(`Registrasi Berhasil! Nomor Pendaftaran Anda: ${newId}. Silakan pantau status aktivasi.`);
        activeTab = 'status';
        renderView();
      });
    }

    // 2. Status Aktivasi Handlers
    const selectUserStatus = container.querySelector('#select-active-user-status');
    if (selectUserStatus) {
      selectUserStatus.addEventListener('change', (e) => {
        currentTrackingId = e.target.value;
        const found = getPendaftarById(currentTrackingId);
        if (found) {
          localStorage.setItem('m3_spmb_current_user', JSON.stringify(found));
        }
        renderView();
      });
    }

    // TOMBOL TOGGLE STATUS AKUN (PENDING / ACTIVE)
    const btnToggleStatus = container.querySelector('#btn-toggle-status-akun');
    if (btnToggleStatus) {
      btnToggleStatus.addEventListener('click', (e) => {
        e.preventDefault();
        const list = getPendaftarList();
        let target = getPendaftarById(currentTrackingId);
        if (!target) {
          target = list.find(p => p.id_pendaftar === 'REG-2026-002') || list[0];
        }
        if (!target) return;

        const isAct = (target.status_akun === 'active' || target.status_akun === 'AKTIF');
        const nextStatus = isAct ? 'pending_activation' : 'active';

        const updated = updateStatusAkun(target.id_pendaftar || target.id || target.nisn, nextStatus);

        // Sinkronkan session jika user ini yang sedang login
        if (currentLoggedInUser && (currentLoggedInUser.nisn === target.nisn || currentLoggedInUser.id_pendaftar === target.id_pendaftar)) {
          currentLoggedInUser.status_akun = nextStatus;
          localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(currentLoggedInUser));
        }

        currentTrackingId = target.id_pendaftar || target.id;
        renderView();
      });
    }

    const btnPortalToLogin = container.querySelector('#btn-portal-to-login');
    if (btnPortalToLogin) {
      btnPortalToLogin.addEventListener('click', () => {
        activeTab = 'login';
        renderView();
      });
    }

    const btnLogoutStatus = container.querySelector('#btn-logout-status');
    if (btnLogoutStatus) {
      btnLogoutStatus.addEventListener('click', () => {
        logoutUser();
        currentLoggedInUser = null;
        renderView();
      });
    }

    const btnGotoReg = container.querySelector('#btn-goto-register');
    if (btnGotoReg) {
      btnGotoReg.addEventListener('click', () => {
        activeTab = 'register';
        renderView();
      });
    }

    // 3. Login Handlers
    const formLogin = container.querySelector('#spmb-form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#login-alert-box');
        const idVal = container.querySelector('#login-identity').value.trim();
        const passVal = container.querySelector('#login-pass').value;

        const list = getPendaftarList();
        const found = list.find(p => p.nisn === idVal || p.email === idVal || p.id_pendaftar === idVal || p.no_wa === idVal);

        if (!found) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#991b1b';
          alertBox.textContent = 'Akun dengan NISN / Email tersebut tidak ditemukan!';
          return;
        }

        const isAct = (found.status_akun === 'active' || found.status_akun === 'AKTIF');
        if (!isAct) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fffbeb';
          alertBox.style.color = '#92400e';
          alertBox.innerHTML = `
            <strong>Akun Belum Aktif!</strong> Status akun Anda masih <code>pending_activation</code>.<br>
            Harap menunggu persetujuan Admin atau periksa <a href="#" id="link-check-status" style="color: #b45309; font-weight: 700;">Status Aktivasi di Tab 2</a>.
          `;
          const checkLink = alertBox.querySelector('#link-check-status');
          if (checkLink) {
            checkLink.onclick = (evt) => {
              evt.preventDefault();
              currentTrackingId = found.id_pendaftar || found.id;
              activeTab = 'status';
              renderView();
            };
          }
          return;
        }

        currentLoggedInUser = found;
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(found));
        currentTrackingId = found.id_pendaftar || found.id;

        alert(`Login Berhasil! Selamat datang, ${found.nama_lengkap || found.nama}.`);
        activeTab = 'dashboard';
        renderView();
      });
    }

    const btnGotoDashLogin = container.querySelector('#btn-goto-dashboard-from-login');
    if (btnGotoDashLogin) {
      btnGotoDashLogin.addEventListener('click', () => { activeTab = 'dashboard'; renderView(); });
    }

    const btnGotoFormLogin = container.querySelector('#btn-goto-form-from-login');
    if (btnGotoFormLogin) {
      btnGotoFormLogin.addEventListener('click', () => { activeTab = 'formulir'; renderView(); });
    }

    const btnLogoutLoginView = container.querySelector('#btn-logout-from-login-view');
    if (btnLogoutLoginView) {
      btnLogoutLoginView.addEventListener('click', () => {
        logoutUser();
        currentLoggedInUser = null;
        renderView();
      });
    }

    // Quick Login Budi
    const btnQuickBudi = container.querySelectorAll('#btn-quick-login-budi, #btn-quick-login-dash');
    btnQuickBudi.forEach(b => {
      b.addEventListener('click', () => {
        const list = getPendaftarList();
        const budi = list.find(p => p.id_pendaftar === 'REG-2026-002') || list[0];
        if (budi) {
          budi.status_akun = 'active';
          currentLoggedInUser = budi;
          currentTrackingId = budi.id_pendaftar || budi.id;
          localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(budi));
          activeTab = 'dashboard';
          renderView();
        }
      });
    });

    const btnToLoginFromLocked = container.querySelectorAll('#btn-to-login-from-locked-form, #btn-to-login-from-dash');
    btnToLoginFromLocked.forEach(b => {
      b.addEventListener('click', () => { activeTab = 'login'; renderView(); });
    });

    // 4. Formulir Submission
    const formBio = container.querySelector('#spmb-form-biodata-lengkap');
    if (formBio) {
      formBio.addEventListener('submit', (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#form-alert-box');
        const nik = container.querySelector('#f-nik').value.trim();

        if (!/^[0-9]{16}$/.test(nik)) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#991b1b';
          alertBox.textContent = 'NIK wajib tepat 16 digit angka!';
          return;
        }

        const metodeWawancara = container.querySelector('#w-metode').value;
        const sesiWawancara = container.querySelector('#w-hari').value;
        const isDaring = metodeWawancara === 'Daring';

        const updated = {
          ...currentLoggedInUser,
          nama_lengkap: container.querySelector('#f-nama').value.trim(),
          biodata: {
            ...(currentLoggedInUser.biodata || {}),
            nik: nik,
            alamat: container.querySelector('#f-alamat').value.trim(),
            asal_sekolah: container.querySelector('#f-sekolah').value.trim(),
            nama_orang_tua: container.querySelector('#f-ortu').value.trim(),
            pilihan_jurusan: container.querySelector('#f-jurusan').value
          },
          berkas: {
            ...(currentLoggedInUser.berkas || {}),
            akta: { status: 'verified', nama_file: 'akta_kelahiran.pdf' },
            kk: { status: 'verified', nama_file: 'kartu_keluarga.jpg' },
            ijazah: { status: 'verified', nama_file: 'ijazah_smp.pdf' },
            bukti_bayar: { status: 'verified', nama_file: 'bukti_transfer.jpg' }
          },
          pembayaran: {
            ...(currentLoggedInUser.pembayaran || {}),
            status_pembayaran: 'lunas',
            file_bukti: 'bukti_transfer.jpg'
          },
          jadwal_wawancara: {
            metode: metodeWawancara,
            ruang: isDaring ? 'Google Meet SPMB M3' : 'Ruang Wawancara 1 (Gedung Utama)',
            pewawancara: isDaring ? 'Veli' : 'Yosa',
            sesi: sesiWawancara,
            hari: sesiWawancara.includes('Sabtu') || sesiWawancara.includes('Ahad') ? 'Weekend' : 'Weekday'
          }
        };

        savePendaftar(updated);
        currentLoggedInUser = updated;
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(updated));

        alert('Formulir berhasil disimpan lengkap dengan 4 berkas & jadwal wawancara! Membuka Dashboard Siswa...');
        activeTab = 'dashboard';
        renderView();
      });
    }

    const btnLogoutFromForm = container.querySelector('#btn-logout-from-form');
    if (btnLogoutFromForm) {
      btnLogoutFromForm.addEventListener('click', () => {
        logoutUser();
        currentLoggedInUser = null;
        activeTab = 'login';
        renderView();
      });
    }

    // 5. Dashboard Handlers
    const btnEditFormDash = container.querySelector('#btn-edit-form-from-dash');
    if (btnEditFormDash) {
      btnEditFormDash.addEventListener('click', () => {
        activeTab = 'formulir';
        renderView();
      });
    }

    const btnLogoutDash = container.querySelector('#btn-logout-dash');
    if (btnLogoutDash) {
      btnLogoutDash.addEventListener('click', () => {
        logoutUser();
        currentLoggedInUser = null;
        activeTab = 'login';
        renderView();
      });
    }
  }

  // Render awal
  renderView();

  // Dengarkan event pembaruan database dari modul lain
  window.addEventListener('spmb_db_updated', () => renderView());
  window.addEventListener('storage', () => renderView());
}

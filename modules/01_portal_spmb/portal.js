/**
 * Modul 01: Portal Utama Pendaftaran (Portal SPMB)
 * SMA Muhammadiyah 3 Yogyakarta
 * 
 * Memenuhi Alur Grand Design:
 * - Alur 1a: Registrasi akun secara online
 * - Alur 4:  Menerima notifikasi akun aktif
 * - Alur 5:  Pembayaran biaya pendaftaran dan pengisian biodata lengkap
 * - Alur 10: Akses pengumuman kelulusan mandiri
 * 
 * Standar: Anthropic Frontend Design, UI/UX Pro Max, Taste, & Ponytail Architecture.
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
  dispatchSPMBEvent
} from './utils.js';

let activeTab = 'register'; // 'register' | 'status' | 'login' | 'form' | 'kelulusan'
let currentLoggedInUser = null;
let currentTrackingId = null;

// Pulihkan session user jika ada
try {
  const sess = localStorage.getItem('m3_spmb_logged_in_user');
  if (sess) currentLoggedInUser = JSON.parse(sess);
  const cur = localStorage.getItem('m3_spmb_current_user');
  if (cur) currentTrackingId = JSON.parse(cur)?.id_pendaftar || null;
} catch (e) {}

/**
 * Render Utama Modul 01 ke viewport container
 */
export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  function renderView() {
    // Pastikan session data tersinkron
    if (currentLoggedInUser) {
      const fresh = getPendaftarById(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id);
      if (fresh) currentLoggedInUser = fresh;
    }

    container.innerHTML = `
      <div class="spmb-portal-root">
        <!-- Header Banner Institusi -->
        <header class="portal-hero-banner">
          <div class="hero-brand-group">
            <div class="hero-logo-box">M3</div>
            <div>
              <h1 class="hero-school-title">SMA Muhammadiyah 3 Yogyakarta</h1>
              <p class="hero-portal-subtitle">Portal Resmi Seleksi Penerimaan Murid Baru (SPMB) &bull; Tahun Ajaran 2026/2027</p>
            </div>
          </div>
          <div class="hero-meta-badges">
            <span class="hero-badge-tag"><span class="pulse-dot"></span> Sistem Terintegrasi SSoT</span>
            <span class="hero-badge-tag">Pendaftaran 24 Jam</span>
          </div>
        </header>

        <!-- Tab Navigasi Alur SPMB (Alur 1a, 4, 5, 10) -->
        <nav class="portal-nav-stepper" aria-label="Navigasi Tahapan Portal">
          <button class="stepper-tab ${activeTab === 'register' ? 'active' : ''}" data-tab="register">
            <span class="step-num">1</span>
            <span class="step-text"><strong>Registrasi Akun</strong><small>Alur 1a: Akun Mandiri</small></span>
          </button>
          <button class="stepper-tab ${activeTab === 'status' ? 'active' : ''}" data-tab="status">
            <span class="step-num">2</span>
            <span class="step-text"><strong>Status Aktivasi</strong><small>Alur 4: Cek Validasi</small></span>
          </button>
          <button class="stepper-tab ${activeTab === 'login' ? 'active' : ''}" data-tab="login">
            <span class="step-num">3</span>
            <span class="step-text"><strong>Login Siswa</strong><small>Akses Akun Terdaftar</small></span>
          </button>
          <button class="stepper-tab ${activeTab === 'form' ? 'active' : ''}" data-tab="form">
            <span class="step-num">4</span>
            <span class="step-text"><strong>Formulir & Bukti</strong><small>Alur 5: Biodata & Bayar</small></span>
          </button>
          <button class="stepper-tab ${activeTab === 'kelulusan' ? 'active' : ''}" data-tab="kelulusan">
            <span class="step-num">5</span>
            <span class="step-text"><strong>Pengumuman Kelulusan</strong><small>Alur 10: Hasil Seleksi</small></span>
          </button>
        </nav>

        <!-- Area Konten Dinamis -->
        <main class="portal-content-workspace">
          ${renderTabContent()}
        </main>

        <!-- Footer Informasi & Bantuan -->
        <footer class="portal-helper-footer">
          <div>
            <strong>Pusat Layanan SPMB SMA Muhammadiyah 3 Yogyakarta</strong> &bull; Jl. Kapten Piere Tandean No. 58 Wirobrajan, Yogyakarta
          </div>
          <div class="portal-quick-links">
            <a href="modules/01_portal_spmb/register.html" target="_blank" class="footer-link">Buka Halaman Mandiri (.html) ↗</a>
          </div>
        </footer>
      </div>

      <!-- Scoped CSS Stylesheet untuk Modul 01 -->
      <style>
        .spmb-portal-root {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
          overflow: hidden;
          font-family: inherit;
        }

        .portal-hero-banner {
          background: linear-gradient(135deg, #00562c 0%, #007a3e 100%);
          color: white;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .hero-brand-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hero-logo-box {
          width: 52px;
          height: 52px;
          background: #f5a623;
          color: #003d20;
          font-weight: 900;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          letter-spacing: -1px;
        }

        .hero-school-title {
          font-size: 1.35rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .hero-portal-subtitle {
          font-size: 0.85rem;
          margin-top: 2px;
          opacity: 0.92;
        }

        .hero-meta-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .hero-badge-tag {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #4ade80;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.4);
        }

        /* Stepper Navigation */
        .portal-nav-stepper {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px;
          gap: 4px;
        }

        .stepper-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #64748b;
        }

        .stepper-tab:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .stepper-tab.active {
          background: #ffffff;
          color: #006837;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #cbd5e1;
        }

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .stepper-tab.active .step-num {
          background: #006837;
          color: #ffffff;
        }

        .step-text strong {
          display: block;
          font-size: 0.82rem;
          line-height: 1.2;
        }

        .step-text small {
          display: block;
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 2px;
        }

        /* Workspace Area */
        .portal-content-workspace {
          padding: 2rem;
          max-width: 820px;
          margin: 0 auto;
          min-height: 520px;
        }

        .portal-box-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 2rem;
          box-shadow: 0 4px 16px -2px rgba(0,0,0,0.04);
        }

        .section-header-row {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-header-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-header-desc {
          color: #64748b;
          font-size: 0.85rem;
          margin-top: 4px;
        }

        /* Form Inputs */
        .portal-input-group {
          margin-bottom: 1.25rem;
        }

        .portal-label {
          display: block;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 0.4rem;
          color: #334155;
        }

        .req-star {
          color: #ef4444;
        }

        .portal-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s;
        }

        .portal-input:focus {
          outline: none;
          border-color: #006837;
          box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.12);
        }

        .portal-hint {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.35rem;
          display: flex;
          justify-content: space-between;
        }

        /* Buttons */
        .btn-portal-primary {
          background: #006837;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-portal-primary:hover {
          background: #004d28;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 104, 55, 0.2);
        }

        .btn-portal-secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-portal-secondary:hover {
          background: #e2e8f0;
        }

        /* Status & Notice Cards */
        .status-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 30px;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .badge-pending-act {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .badge-active-act {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .notice-infobox {
          border-radius: 10px;
          padding: 1.25rem;
          margin: 1.25rem 0;
          font-size: 0.88rem;
          line-height: 1.6;
        }

        .notice-infobox-warning {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          color: #92400e;
        }

        .notice-infobox-success {
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          color: #14532d;
        }

        .portal-grid-kv {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          background: #f8fafc;
          padding: 1.25rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          margin: 1.25rem 0;
        }

        .kv-item strong {
          display: block;
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kv-item span {
          display: block;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 3px;
        }

        /* Upload Dropzone */
        .upload-drop-area {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 1.5rem 1rem;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .upload-drop-area:hover {
          border-color: #006837;
          background: #f0fdf4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 104, 55, 0.08);
        }

        .upload-drop-area.is-uploaded {
          border-color: #22c55e;
          background: #f0fdf4;
        }

        .doc-preview-thumb {
          max-height: 80px;
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
          border: 1px solid #bbf7d0;
          object-fit: contain;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .doc-preview-pdf {
          margin-top: 8px;
          font-size: 0.75rem;
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .portal-helper-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 1rem 2rem;
          font-size: 0.8rem;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .footer-link {
          color: #006837;
          text-decoration: none;
          font-weight: 700;
        }

        .footer-link:hover {
          text-decoration: underline;
        }
      </style>
    `;

    bindTabEvents();
    bindActionEvents();
  }

  /**
   * Render Konten Berdasarkan Tab yang Aktif
   */
  function renderTabContent() {
    switch (activeTab) {
      case 'register':
        return renderRegisterView();
      case 'status':
        return renderStatusView();
      case 'login':
        return renderLoginView();
      case 'form':
        return renderFormulirView();
      case 'kelulusan':
        return renderKelulusanView();
      default:
        return renderRegisterView();
    }
  }

  // ==========================================
  // VIEW 1: REGISTRASI AKUN BARU (ALUR 1A)
  // ==========================================
  function renderRegisterView() {
    return `
      <div class="portal-box-card">
        <div class="section-header-row">
          <h2 class="section-header-title">📝 Registrasi Akun Mandiri Calon Siswa</h2>
          <p class="section-header-desc">Alur 1a: Buat akun pendaftaran Anda untuk mendapatkan nomor registrasi resmi SPMB 2026.</p>
        </div>

        <div id="spmb-alert-reg" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;"></div>

        <form id="form-portal-reg">
          <div class="portal-input-group">
            <label class="portal-label">Nama Lengkap Siswa <span class="req-star">*</span></label>
            <input type="text" id="reg-nama" class="portal-input" placeholder="Nama lengkap sesuai ijazah SMP/MTs" required>
          </div>

          <div class="portal-input-group">
            <label class="portal-label">NISN (Nomor Induk Siswa Nasional) <span class="req-star">*</span></label>
            <input type="text" id="reg-nisn" class="portal-input" maxlength="10" placeholder="10 digit angka NISN (contoh: 0051234567)" required>
            <div class="portal-hint">
              <span>Wajib 10 digit angka valid</span>
              <span id="nisn-count-txt">0/10</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            <div class="portal-input-group">
              <label class="portal-label">Alamat Email Aktif <span class="req-star">*</span></label>
              <input type="email" id="reg-email" class="portal-input" placeholder="contoh: siswa@email.com" required>
            </div>
            <div class="portal-input-group">
              <label class="portal-label">No. WhatsApp / HP Aktif <span class="req-star">*</span></label>
              <input type="tel" id="reg-wa" class="portal-input" placeholder="081234567890" required>
            </div>
          </div>

          <div class="portal-input-group">
            <label class="portal-label">Buat Password Akun <span class="req-star">*</span></label>
            <input type="password" id="reg-password" class="portal-input" placeholder="Minimal 6 karakter kombinasi huruf dan angka" required>
            <div class="portal-hint">
              <span>Password akan dienkripsi dengan standar SHA-256</span>
            </div>
          </div>

          <div style="margin-top: 1.5rem; display: flex; gap: 12px; align-items: center; justify-content: flex-end;">
            <button type="button" class="btn-portal-secondary" id="btn-goto-login">Sudah Punya Akun? Login</button>
            <button type="submit" class="btn-portal-primary" id="btn-submit-reg">
              🚀 Daftarkan Akun Saya
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================
  // VIEW 2: STATUS & NOTIFIKASI AKUN (ALUR 4)
  // ==========================================
  function renderStatusView() {
    const list = getPendaftarList();
    // Cari akun yang sedang dipantau atau akun login atau akun terakhir
    let current = null;
    if (currentTrackingId) current = getPendaftarById(currentTrackingId);
    if (!current && currentLoggedInUser) current = getPendaftarById(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id);
    if (!current && list.length > 0) current = list[list.length - 1];

    if (!current) {
      return `
        <div class="portal-box-card" style="text-align: center; padding: 3rem 1.5rem;">
          <span style="font-size: 3rem;">🔍</span>
          <h3 style="margin-top: 10px; color: #0f172a;">Belum Ada Akun Terpilih</h3>
          <p style="color: #64748b; font-size: 0.88rem; margin: 8px auto 1.5rem auto; max-width: 440px;">
            Silakan lakukan registrasi akun terlebih dahulu atau masukkan ID Registrasi / NISN Anda untuk memantau status aktivasi.
          </p>
          <button class="btn-portal-primary" id="btn-goto-reg-now">Menuju Formulir Registrasi</button>
        </div>
      `;
    }

    const isActive = current.status_akun === 'active' || current.status_akun === 'AKTIF';
    const isPaymentDone = current.pembayaran?.status_pembayaran === 'lunas' || current.status_pembayaran === 'LUNAS';

    return `
      <div class="portal-box-card">
        <div class="section-header-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h2 class="section-header-title">🔔 Status & Aktivasi Akun Pendaftar</h2>
            <p class="section-header-desc">Alur 4: Pantau status persetujuan akun oleh Admin SPMB sekolah.</p>
          </div>
          <div>
            ${isActive 
              ? '<span class="status-pill-badge badge-active-act">✅ AKUN SUDAH AKTIF</span>' 
              : '<span class="status-pill-badge badge-pending-act">⏳ MENUNGGU AKTIVASI ADMIN</span>'
            }
          </div>
        </div>

        ${isActive ? `
          <div class="notice-infobox notice-infobox-success">
            <strong>🎉 Selamat! Akun Anda telah AKTIF dan Diverifikasi oleh Unit SPMB.</strong><br>
            Anda sekarang dapat melanjutkan ke pengisian biodata diri lengkap, pemilihan jurusan (MIPA/IPS), serta unggah berkas bukti pembayaran formulir.
          </div>
        ` : `
          <div class="notice-infobox notice-infobox-warning">
            <strong>⏳ Permintaan Aktivasi Terkirim ke Admin SPMB (Alur 2 & 3).</strong><br>
            Mohon menunggu petugas Unit SPMB memverifikasi keabsahan data dasar dan NISN Anda. Begitu akun disetujui, tombol pengisian formulir akan terbuka otomatis.
          </div>
        `}

        <div class="portal-grid-kv">
          <div class="kv-item">
            <strong>Nomor Registrasi</strong>
            <span style="color: #006837;">${escapeHTML(current.id_pendaftar || current.id)}</span>
          </div>
          <div class="kv-item">
            <strong>Nama Lengkap Siswa</strong>
            <span>${escapeHTML(current.nama_lengkap || current.nama)}</span>
          </div>
          <div class="kv-item">
            <strong>NISN</strong>
            <span>${escapeHTML(current.nisn)}</span>
          </div>
          <div class="kv-item">
            <strong>Email Terdaftar</strong>
            <span>${escapeHTML(current.email)}</span>
          </div>
          <div class="kv-item">
            <strong>Status Pembayaran Formulir</strong>
            <span>${isPaymentDone ? '✅ Lunas (Alur 7)' : 'Belum Verifikasi'}</span>
          </div>
          <div class="kv-item">
            <strong>Waktu Pendaftaran</strong>
            <span>${new Date(current.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <!-- Tombol Aksi Lanjut -->
        <div style="margin-top: 1.5rem; display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 8px;">
            <!-- Testing Simulator Toggle -->
            <button class="btn-portal-secondary" id="btn-toggle-demo-act" title="Ubah status untuk kemudahan pengujian mandiri">
              ⚡ Simulasi Toggle Status Akun (${isActive ? 'Nonaktifkan' : 'Aktifkan Langsung'})
            </button>
          </div>

          <div style="display: flex; gap: 10px;">
            ${isActive ? `
              <button class="btn-portal-primary" id="btn-proceed-to-form">
                📝 Lanjut Isi Formulir Biodata & Bukti &rarr;
              </button>
            ` : `
              <button class="btn-portal-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
                🔒 Menunggu Persetujuan Admin...
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW 3: LOGIN SISWA PENDAFTAR
  // ==========================================
  function renderLoginView() {
    if (currentLoggedInUser) {
      return `
        <div class="portal-box-card" style="text-align: center; padding: 2.5rem 1.5rem;">
          <span style="font-size: 3rem;">👤</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 8px;">Anda Sedang Login</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.25rem;">
            Halo, <strong>${escapeHTML(currentLoggedInUser.nama_lengkap || currentLoggedInUser.nama)}</strong> (${escapeHTML(currentLoggedInUser.id_pendaftar || currentLoggedInUser.id)})
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-portal-primary" id="btn-goto-form-from-login">Lanjut ke Formulir Biodata &rarr;</button>
            <button class="btn-portal-secondary" id="btn-logout-portal">🚪 Logout Session</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="portal-box-card">
        <div class="section-header-row">
          <h2 class="section-header-title">🔐 Login Pendaftar SPMB</h2>
          <p class="section-header-desc">Masuk dengan NISN atau Email serta password yang didaftarkan pada Alur 1a.</p>
        </div>

        <div id="spmb-alert-login" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;"></div>

        <form id="form-portal-login">
          <div class="portal-input-group">
            <label class="portal-label">NISN atau Alamat Email <span class="req-star">*</span></label>
            <input type="text" id="login-identity" class="portal-input" placeholder="10 digit NISN atau email" required>
          </div>

          <div class="portal-input-group">
            <label class="portal-label">Password Akun <span class="req-star">*</span></label>
            <input type="password" id="login-password" class="portal-input" placeholder="Masukkan password Anda" required>
          </div>

          <div style="margin-top: 1.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <button type="button" class="btn-portal-secondary" id="btn-quick-fill-demo">💡 Isi Akun Demo (Ahmad Dahlan)</button>
            <button type="submit" class="btn-portal-primary" id="btn-submit-login">🔑 Masuk ke Portal</button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================
  // VIEW 4: FORMULIR & BUKTI BAYAR (ALUR 5)
  // ==========================================
  function renderFormulirView() {
    let user = currentLoggedInUser;
    if (!user && currentTrackingId) user = getPendaftarById(currentTrackingId);

    // Cek apakah akun aktif
    const isActive = user && (user.status_akun === 'active' || user.status_akun === 'AKTIF');

    if (!user || !isActive) {
      return `
        <div class="portal-box-card" style="text-align: center; padding: 3rem 1.5rem;">
          <span style="font-size: 3.5rem;">🔒</span>
          <h3 style="color: #991b1b; font-weight: 800; margin-top: 10px;">Akses Formulir Terkunci</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin: 10px auto 1.5rem auto; max-width: 480px;">
            Sesuai aturan bisnis SPMB, Anda wajib <strong>mendaftarkan akun (Alur 1a)</strong> dan memastikan akun telah <strong>diaktivasi oleh Admin (Alur 4)</strong> sebelum dapat mengisi formulir biodata dan mengunggah bukti bayar.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-portal-secondary" id="btn-nav-to-reg">1. Registrasi Akun</button>
            <button class="btn-portal-secondary" id="btn-nav-to-status">2. Cek Status Aktivasi</button>
            <button class="btn-portal-primary" id="btn-demo-autologin">⚡ Auto-Login Akun Aktif (Demo)</button>
          </div>
        </div>
      `;
    }

    const bio = user.biodata || {};
    const bayar = user.pembayaran || {};

    return `
      <div class="portal-box-card">
        <div class="section-header-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h2 class="section-header-title">📋 Formulir Biodata & Bukti Bayar Pendaftaran</h2>
            <p class="section-header-desc">Alur 5: Lengkapi profil calon peserta didik dan unggah bukti transfer biaya formulir.</p>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 4px 12px; border-radius: 8px;">
            Peserta: <strong>${escapeHTML(user.nama_lengkap || user.nama)}</strong> (${escapeHTML(user.id_pendaftar || user.id)})
          </div>
        </div>

        <div id="spmb-alert-form" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;"></div>

        <form id="form-portal-biodata">
          <!-- Sub Bagian 1: Biodata Diri -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 0.9rem; font-weight: 800; color: #006837; border-left: 3px solid #006837; padding-left: 8px;">
              A. Data Diri Calon Siswa
            </div>
            <button type="button" class="btn-portal-secondary" id="btn-fill-demo-bio" style="font-size: 0.75rem; padding: 3px 10px;" title="Isi contoh data pendaftar otomatis">
              💡 Isi Contoh Biodata (Demo)
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            <div class="portal-input-group">
              <label class="portal-label">Nama Lengkap Siswa <span class="req-star">*</span></label>
              <input type="text" id="bio-nama" class="portal-input" value="${escapeHTML(user.nama_lengkap || user.nama)}" required>
            </div>
            <div class="portal-input-group">
              <label class="portal-label">NIK (16 Digit) <span class="req-star">*</span></label>
              <input type="text" id="bio-nik" class="portal-input" maxlength="16" placeholder="3471012345670001" value="${escapeHTML(bio.nik || '')}" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            <div class="portal-input-group">
              <label class="portal-label">Asal Sekolah SMP/MTs <span class="req-star">*</span></label>
              <input type="text" id="bio-sekolah" class="portal-input" placeholder="SMP Muhammadiyah 1 Yogyakarta" value="${escapeHTML(bio.asal_sekolah || user.asal_sekolah || '')}" required>
            </div>
            <div class="portal-input-group">
              <label class="portal-label">Pilihan Peminatan Jurusan <span class="req-star">*</span></label>
              <select id="bio-jurusan" class="portal-input" required>
                <option value="MIPA" ${(bio.pilihan_jurusan === 'MIPA' || user.pilihan_jurusan === 'MIPA') ? 'selected' : ''}>MIPA (Matematika & Ilmu Pengetahuan Alam)</option>
                <option value="IPS" ${(bio.pilihan_jurusan === 'IPS' || user.pilihan_jurusan === 'IPS') ? 'selected' : ''}>IPS (Ilmu Pengetahuan Sosial)</option>
              </select>
            </div>
          </div>

          <div class="portal-input-group">
            <label class="portal-label">Alamat Lengkap Domisili <span class="req-star">*</span></label>
            <textarea id="bio-alamat" class="portal-input" rows="2" placeholder="Nama jalan, RT/RW, Kelurahan, Kecamatan, Kota" required>${escapeHTML(bio.alamat || '')}</textarea>
          </div>

          <div class="portal-input-group">
            <label class="portal-label">Nama Orang Tua / Wali Kandung <span class="req-star">*</span></label>
            <input type="text" id="bio-ortu" class="portal-input" placeholder="Nama ayah/ibu/wali" value="${escapeHTML(bio.nama_orang_tua || '')}" required>
          </div>

          <!-- Sub Bagian 2: Unggah Berkas Persyaratan Digital & Bukti Bayar -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin: 1.75rem 0 0.5rem 0;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #006837; border-left: 3px solid #006837; padding-left: 8px;">
              B. Unggah Berkas Persyaratan Digital & Bukti Pembayaran
            </div>
            <button type="button" class="btn-portal-secondary" id="btn-fill-demo-files" style="font-size: 0.78rem; padding: 4px 12px;" title="Isi contoh dokumen otomatis untuk mempermudah pengetesan">
              ⚡ Muat Contoh Dokumen Lengkap (Demo)
            </button>
          </div>
          <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 1rem;">
            Unggah foto/scan dokumen asli (Format JPG, PNG, atau PDF, Maks. 3 MB per berkas) untuk diverifikasi oleh Admin SPMB.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 1.5rem;">
            <!-- 1. Ijazah / SKL -->
            <div class="upload-drop-area ${user.berkas?.ijazah?.nama_file ? 'is-uploaded' : ''}" id="dropzone-ijazah">
              <span style="font-size: 1.8rem;">🎓</span>
              <div style="font-weight: 700; color: #006837; font-size: 0.88rem; margin-top: 4px;">Ijazah / SKL SMP/MTs <span class="req-star">*</span></div>
              <p style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Foto/PDF Ijazah atau Surat Keterangan Lulus</p>
              <input type="file" id="input-file-ijazah" accept="image/*,.pdf" style="display: none;">
              <div id="file-info-ijazah" style="margin-top: 6px; font-weight: 700; font-size: 0.78rem; color: ${user.berkas?.ijazah?.nama_file ? '#15803d' : '#0284c7'};">
                ${user.berkas?.ijazah?.nama_file ? `✓ Terunggah: ${escapeHTML(user.berkas.ijazah.nama_file)}` : 'Klik untuk memilih file'}
              </div>
              <div id="preview-box-ijazah" style="${user.berkas?.ijazah?.data_url ? 'display: block;' : 'display: none;'} margin-top: 6px;">
                ${user.berkas?.ijazah?.data_url ? ((user.berkas.ijazah.tipe === 'application/pdf' || user.berkas.ijazah.nama_file?.endsWith('.pdf')) ? `<div class="doc-preview-pdf">📄 PDF Terlampir (${escapeHTML(user.berkas.ijazah.size || '1.4 MB')})</div>` : `<img src="${user.berkas.ijazah.data_url}" class="doc-preview-thumb" alt="Ijazah">`) : ''}
              </div>
            </div>

            <!-- 2. Kartu Keluarga -->
            <div class="upload-drop-area ${(user.berkas?.kk?.nama_file || user.berkas?.kartu_keluarga?.nama_file) ? 'is-uploaded' : ''}" id="dropzone-kk">
              <span style="font-size: 1.8rem;">👨‍👩‍👧‍👦</span>
              <div style="font-weight: 700; color: #006837; font-size: 0.88rem; margin-top: 4px;">Kartu Keluarga (KK) <span class="req-star">*</span></div>
              <p style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Foto/PDF Kartu Keluarga terbaru</p>
              <input type="file" id="input-file-kk" accept="image/*,.pdf" style="display: none;">
              <div id="file-info-kk" style="margin-top: 6px; font-weight: 700; font-size: 0.78rem; color: ${(user.berkas?.kk?.nama_file || user.berkas?.kartu_keluarga?.nama_file) ? '#15803d' : '#0284c7'};">
                ${(user.berkas?.kk?.nama_file || user.berkas?.kartu_keluarga?.nama_file) ? `✓ Terunggah: ${escapeHTML(user.berkas.kk?.nama_file || user.berkas.kartu_keluarga?.nama_file)}` : 'Klik untuk memilih file'}
              </div>
              <div id="preview-box-kk" style="${(user.berkas?.kk?.data_url || user.berkas?.kartu_keluarga?.data_url) ? 'display: block;' : 'display: none;'} margin-top: 6px;">
                ${(user.berkas?.kk?.data_url || user.berkas?.kartu_keluarga?.data_url) ? (((user.berkas.kk?.tipe === 'application/pdf' || user.berkas.kk?.nama_file?.endsWith('.pdf'))) ? `<div class="doc-preview-pdf">📄 PDF Terlampir</div>` : `<img src="${user.berkas.kk?.data_url || user.berkas.kartu_keluarga?.data_url}" class="doc-preview-thumb" alt="KK">`) : ''}
              </div>
            </div>

            <!-- 3. Akta Kelahiran -->
            <div class="upload-drop-area ${(user.berkas?.akta?.nama_file || user.berkas?.akta_kelahiran?.nama_file) ? 'is-uploaded' : ''}" id="dropzone-akta">
              <span style="font-size: 1.8rem;">📜</span>
              <div style="font-weight: 700; color: #006837; font-size: 0.88rem; margin-top: 4px;">Akta Kelahiran Siswa <span class="req-star">*</span></div>
              <p style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Foto/PDF Akta Kelahiran resmi</p>
              <input type="file" id="input-file-akta" accept="image/*,.pdf" style="display: none;">
              <div id="file-info-akta" style="margin-top: 6px; font-weight: 700; font-size: 0.78rem; color: ${(user.berkas?.akta?.nama_file || user.berkas?.akta_kelahiran?.nama_file) ? '#15803d' : '#0284c7'};">
                ${(user.berkas?.akta?.nama_file || user.berkas?.akta_kelahiran?.nama_file) ? `✓ Terunggah: ${escapeHTML(user.berkas.akta?.nama_file || user.berkas.akta_kelahiran?.nama_file)}` : 'Klik untuk memilih file'}
              </div>
              <div id="preview-box-akta" style="${(user.berkas?.akta?.data_url || user.berkas?.akta_kelahiran?.data_url) ? 'display: block;' : 'display: none;'} margin-top: 6px;">
                ${(user.berkas?.akta?.data_url || user.berkas?.akta_kelahiran?.data_url) ? (((user.berkas.akta?.tipe === 'application/pdf' || user.berkas.akta?.nama_file?.endsWith('.pdf'))) ? `<div class="doc-preview-pdf">📄 PDF Terlampir</div>` : `<img src="${user.berkas.akta?.data_url || user.berkas.akta_kelahiran?.data_url}" class="doc-preview-thumb" alt="Akta">`) : ''}
              </div>
            </div>

            <!-- 4. Bukti Bayar Pendaftaran -->
            <div class="upload-drop-area ${bayar.file_bukti ? 'is-uploaded' : ''}" id="dropzone-bayar">
              <span style="font-size: 1.8rem;">💳</span>
              <div style="font-weight: 700; color: #006837; font-size: 0.88rem; margin-top: 4px;">Bukti Bayar Formulir (Rp 200rb) <span class="req-star">*</span></div>
              <p style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Struk transfer / bukti pembayaran bank</p>
              <input type="file" id="input-file-bayar" accept="image/*,.pdf" style="display: none;">
              <div id="file-info-txt" style="margin-top: 6px; font-weight: 700; font-size: 0.78rem; color: ${bayar.file_bukti ? '#15803d' : '#0284c7'};">
                ${bayar.file_bukti ? `✓ Terunggah: ${escapeHTML(bayar.file_bukti)}` : 'Klik untuk memilih file'}
              </div>
              <div id="preview-box-bayar" style="${bayar.file_data_url ? 'display: block;' : 'display: none;'} margin-top: 6px;">
                ${bayar.file_data_url ? (bayar.file_data_url.startsWith('data:image') ? `<img src="${bayar.file_data_url}" class="doc-preview-thumb" alt="Bukti Bayar">` : `<div class="doc-preview-pdf">📄 Dokumen PDF Terlampir</div>`) : ''}
              </div>
            </div>
          </div>

          <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 12px;">
            <button type="submit" class="btn-portal-primary" id="btn-save-biodata">
              💾 Simpan Biodata & Unggah Seluruh Dokumen (Alur 5 &rarr; 6)
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================
  // VIEW 5: CEK KELULUSAN MANDIRI (ALUR 10)
  // ==========================================
  function renderKelulusanView() {
    let current = currentLoggedInUser || (currentTrackingId ? getPendaftarById(currentTrackingId) : null);

    return `
      <div class="portal-box-card">
        <div class="section-header-row">
          <h2 class="section-header-title">🎓 Pengumuman Kelulusan Seleksi SPMB</h2>
          <p class="section-header-desc">Alur 10: Pengumuman hasil yudisium kelulusan resmi SMA Muhammadiyah 3 Yogyakarta.</p>
        </div>

        <!-- Box Pencarian Mandiri -->
        <div style="background: #f8fafc; padding: 1.25rem; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
          <label class="portal-label">Cari Status Berdasarkan No. Registrasi atau NISN:</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="search-kelulusan-id" class="portal-input" placeholder="Masukkan REG-2026-XXX atau 10 digit NISN" value="${escapeHTML(current ? (current.id_pendaftar || current.id) : '')}">
            <button class="btn-portal-primary" id="btn-check-kelulusan" style="flex-shrink: 0;">🔍 Cek Hasil</button>
          </div>
        </div>

        <div id="result-kelulusan-box">
          ${renderKelulusanResultCard(current)}
        </div>
      </div>
    `;
  }

  function renderKelulusanResultCard(user) {
    if (!user) {
      return `
        <div style="text-align: center; padding: 2rem; color: #64748b; font-size: 0.9rem;">
          Masukkan Nomor Registrasi atau NISN di atas untuk melihat status hasil seleksi.
        </div>
      `;
    }

    const status = (user.status_kelulusan || 'MENUNGGU').toUpperCase();
    const isLulus = status === 'LULUS';
    const isCadangan = status === 'CADANGAN';
    const isGagal = status === 'TIDAK LULUS';

    return `
      <div style="border-radius: 12px; border: 2px solid ${isLulus ? '#22c55e' : (isCadangan ? '#f59e0b' : '#cbd5e1')}; padding: 1.5rem; background: ${isLulus ? '#f0fdf4' : '#ffffff'};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a;">${escapeHTML(user.nama_lengkap || user.nama)}</h3>
            <span style="font-size: 0.8rem; color: #64748b;">No. Reg: <strong>${escapeHTML(user.id_pendaftar || user.id)}</strong> &bull; NISN: ${escapeHTML(user.nisn)}</span>
          </div>
          <div>
            <span style="padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; 
              background: ${isLulus ? '#dcfce7' : (isCadangan ? '#fef3c7' : (isGagal ? '#fee2e2' : '#f1f5f9'))}; 
              color: ${isLulus ? '#15803d' : (isCadangan ? '#b45309' : (isGagal ? '#991b1b' : '#475569'))};">
              ${isLulus ? '🎉 DINYATAKAN LULUS' : (isCadangan ? '⚠️ CADANGAN' : (isGagal ? '❌ TIDAK LULUS' : '⏳ DALAM PROSES SELEKSI'))}
            </span>
          </div>
        </div>

        <div class="portal-grid-kv" style="margin: 0 0 1rem 0; background: white;">
          <div class="kv-item">
            <strong>Peminatan Jurusan Diterima</strong>
            <span style="color: #006837;">${escapeHTML(user.biodata?.pilihan_jurusan || user.pilihan_jurusan || 'MIPA')}</span>
          </div>
          <div class="kv-item">
            <strong>Nilai Wawancara & Pemetaan</strong>
            <span>${user.nilai_wawancara || user.wawancara?.nilai_akhir || '88'} / 100</span>
          </div>
          <div class="kv-item">
            <strong>Rekomendasi Beasiswa</strong>
            <span>${escapeHTML(user.dataWawancara?.rekomendasi_beasiswa || user.wawancara?.beasiswa || 'Reguler')}</span>
          </div>
          <div class="kv-item">
            <strong>Gelombang Penerimaan</strong>
            <span>Gelombang 1 (Reguler)</span>
          </div>
        </div>

        ${isLulus ? `
          <div class="notice-infobox notice-infobox-success" style="margin-bottom: 0;">
            <strong>Langkah Selanjutnya: Daftar Ulang Fisik (Alur 11 & 12)</strong><br>
            Bagi calon siswa yang dinyatakan <strong>LULUS</strong>, silakan hadir langsung ke Loket SPMB SMA Muhammadiyah 3 Yogyakarta untuk:
            <ol style="margin-left: 1.25rem; margin-top: 4px;">
              <li>Membawa berkas fisik asli (Ijazah legalisir, Kartu Keluarga, Akta Kelahiran, Surat Bebas Narkoba).</li>
              <li>Melakukan pembayaran uang pangkal ke Bendahara Sekolah (Alur 12).</li>
              <li>Pengambilan seragam sekolah di Loket Verifikasi.</li>
            </ol>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // EVENT BINDINGS & LOGIC CONTROLLERS
  // ==========================================
  function bindTabEvents() {
    const tabs = container.querySelectorAll('.stepper-tab');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderView();
      });
    });
  }

  function bindActionEvents() {
    // 1. Registrasi Akun Handler
    const formReg = container.querySelector('#form-portal-reg');
    if (formReg) {
      const nisnInput = container.querySelector('#reg-nisn');
      const countTxt = container.querySelector('#nisn-count-txt');
      if (nisnInput && countTxt) {
        nisnInput.addEventListener('input', () => {
          countTxt.textContent = `${nisnInput.value.length}/10`;
        });
      }

      formReg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#spmb-alert-reg');
        const nama = container.querySelector('#reg-nama').value.trim();
        const nisn = container.querySelector('#reg-nisn').value.trim();
        const email = container.querySelector('#reg-email').value.trim();
        const wa = container.querySelector('#reg-wa').value.trim();
        const pass = container.querySelector('#reg-password').value;

        // Validasi
        if (!/^[0-9]{10}$/.test(nisn)) {
          showFormAlert(alertBox, 'NISN wajib diisi dengan tepat 10 digit angka!', true);
          return;
        }
        if (!isValidEmail(email)) {
          showFormAlert(alertBox, 'Format email tidak valid! Gunakan format contoh: nama@email.com', true);
          return;
        }
        if (!isValidNoWA(wa)) {
          showFormAlert(alertBox, 'Nomor WhatsApp tidak valid! Gunakan format Indonesia (contoh: 081234567890).', true);
          return;
        }
        if (!isValidPassword(pass)) {
          showFormAlert(alertBox, 'Password minimal 6 karakter kombinasi huruf dan angka!', true);
          return;
        }

        const list = getPendaftarList();
        if (list.some(p => p.nisn === nisn)) {
          showFormAlert(alertBox, 'NISN ini sudah terdaftar sebelumnya! Silakan menuju menu Login.', true);
          return;
        }

        const hashedPass = await hashPassword(pass);
        const newId = `REG-2026-${String(list.length + 1).padStart(3, '0')}`;

        const newAccount = {
          id_pendaftar: newId,
          nama_lengkap: nama,
          nisn: nisn,
          email: email,
          no_wa: wa,
          password_hash: hashedPass,
          status_akun: 'pending_activation',
          created_at: new Date().toISOString(),
          biodata: null,
          pembayaran: null
        };

        savePendaftar(newAccount);
        currentTrackingId = newId;
        localStorage.setItem('m3_spmb_current_user', JSON.stringify(newAccount));

        showFormAlert(alertBox, `✓ Registrasi berhasil! ID Pendaftar: <strong>${newId}</strong>. Mengalihkan ke Status Aktivasi...`, false);
        setTimeout(() => {
          activeTab = 'status';
          renderView();
        }, 1000);
      });

      const btnGoLogin = container.querySelector('#btn-goto-login');
      if (btnGoLogin) btnGoLogin.addEventListener('click', () => { activeTab = 'login'; renderView(); });
    }

    // 2. Status Akun Actions
    const btnToggleAct = container.querySelector('#btn-toggle-demo-act');
    if (btnToggleAct) {
      btnToggleAct.addEventListener('click', () => {
        let current = currentTrackingId ? getPendaftarById(currentTrackingId) : null;
        if (current) {
          const next = current.status_akun === 'active' ? 'pending_activation' : 'active';
          updateStatusAkun(current.id_pendaftar || current.id, next);
          renderView();
        }
      });
    }

    const btnProceedForm = container.querySelector('#btn-proceed-to-form');
    if (btnProceedForm) {
      btnProceedForm.addEventListener('click', () => {
        activeTab = 'form';
        renderView();
      });
    }

    const btnGotoRegNow = container.querySelector('#btn-goto-reg-now');
    if (btnGotoRegNow) {
      btnGotoRegNow.addEventListener('click', () => {
        activeTab = 'register';
        renderView();
      });
    }

    // 3. Login Actions
    const formLogin = container.querySelector('#form-portal-login');
    if (formLogin) {
      const btnQuickDemo = container.querySelector('#btn-quick-fill-demo');
      if (btnQuickDemo) {
        btnQuickDemo.addEventListener('click', () => {
          container.querySelector('#login-identity').value = '0051234567';
          container.querySelector('#login-password').value = 'password123';
        });
      }

      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#spmb-alert-login');
        const iden = container.querySelector('#login-identity').value.trim();
        const pass = container.querySelector('#login-password').value;

        const user = getPendaftarById(iden);
        if (!user) {
          showFormAlert(alertBox, 'Akun dengan NISN / Email tersebut tidak ditemukan!', true);
          return;
        }

        // Cek password hash atau demo fallback
        const hashed = await hashPassword(pass);
        const isPassOk = (user.password_hash === hashed) || pass === 'password123' || !user.password_hash;

        if (!isPassOk) {
          showFormAlert(alertBox, 'Password salah! Silakan periksa kembali kata sandi Anda.', true);
          return;
        }

        currentLoggedInUser = user;
        currentTrackingId = user.id_pendaftar || user.id;
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(user));

        showFormAlert(alertBox, `✓ Login berhasil! Selamat datang, ${user.nama_lengkap || user.nama}.`, false);
        setTimeout(() => {
          activeTab = 'form';
          renderView();
        }, 800);
      });
    }

    const btnLogout = container.querySelector('#btn-logout-portal');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        currentLoggedInUser = null;
        localStorage.removeItem('m3_spmb_logged_in_user');
        renderView();
      });
    }

    const btnGotoFormFromLogin = container.querySelector('#btn-goto-form-from-login');
    if (btnGotoFormFromLogin) {
      btnGotoFormFromLogin.addEventListener('click', () => {
        activeTab = 'form';
        renderView();
      });
    }

    // 4. Formulir Actions & File Upload (Akta Kelahiran, Kartu Keluarga, Ijazah/SKL, Bukti Bayar)
    const formBio = container.querySelector('#form-portal-biodata');
    if (formBio) {
      let user = currentLoggedInUser || (currentTrackingId ? getPendaftarById(currentTrackingId) : null);
      const berkasExisting = (user && user.berkas) ? user.berkas : {};
      const bayarExisting = (user && user.pembayaran) ? user.pembayaran : {};

      const uploadState = {
        ijazah: {
          nama_file: berkasExisting.ijazah?.nama_file || null,
          data_url: berkasExisting.ijazah?.data_url || null,
          size: berkasExisting.ijazah?.size || null,
          tipe: berkasExisting.ijazah?.tipe || null
        },
        kk: {
          nama_file: berkasExisting.kk?.nama_file || berkasExisting.kartu_keluarga?.nama_file || null,
          data_url: berkasExisting.kk?.data_url || berkasExisting.kartu_keluarga?.data_url || null,
          size: berkasExisting.kk?.size || berkasExisting.kartu_keluarga?.size || null,
          tipe: berkasExisting.kk?.tipe || berkasExisting.kartu_keluarga?.tipe || null
        },
        akta: {
          nama_file: berkasExisting.akta?.nama_file || berkasExisting.akta_kelahiran?.nama_file || null,
          data_url: berkasExisting.akta?.data_url || berkasExisting.akta_kelahiran?.data_url || null,
          size: berkasExisting.akta?.size || berkasExisting.akta_kelahiran?.size || null,
          tipe: berkasExisting.akta?.tipe || berkasExisting.akta_kelahiran?.tipe || null
        },
        bayar: {
          nama_file: bayarExisting.file_bukti || null,
          data_url: bayarExisting.file_data_url || null,
          size: bayarExisting.size || null,
          tipe: bayarExisting.tipe || null
        }
      };

      // Helper untuk mengikat dropzone, validasi ukuran/tipe, dan preview
      function bindDocUpload(dropzoneId, inputId, infoId, previewId, stateKey) {
        const dropzone = container.querySelector(dropzoneId);
        const fileInput = container.querySelector(inputId);
        const infoEl = container.querySelector(infoId);
        const previewEl = container.querySelector(previewId);

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const ext = file.name.split('.').pop().toLowerCase();
          const validExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
          if (!validExts.includes(ext)) {
            alert(`Format file .${ext} tidak didukung! Harap pilih gambar (JPG, PNG) atau PDF.`);
            fileInput.value = '';
            return;
          }

          if (file.size > 3 * 1024 * 1024) {
            alert(`Ukuran file "${file.name}" melebihi batas 3 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)!`);
            fileInput.value = '';
            return;
          }

          const base64 = await fileToDataURL(file);
          const sizeKb = Math.round(file.size / 1024);
          const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

          uploadState[stateKey] = {
            nama_file: file.name,
            data_url: base64,
            size: sizeStr,
            ukuran_kb: sizeKb,
            tipe: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg')
          };

          dropzone.classList.add('is-uploaded');
          if (infoEl) {
            infoEl.textContent = `✓ Terpilih: ${file.name} (${sizeStr})`;
            infoEl.style.color = '#15803d';
          }

          if (previewEl) {
            if (file.type.startsWith('image/')) {
              previewEl.innerHTML = `<img src="${base64}" class="doc-preview-thumb" alt="Preview ${file.name}">`;
              previewEl.style.display = 'block';
            } else {
              previewEl.innerHTML = `<div class="doc-preview-pdf">📄 PDF Siap Kirim (${sizeStr})</div>`;
              previewEl.style.display = 'block';
            }
          }
        });
      }

      // Hubungkan 4 dropzone berkas
      bindDocUpload('#dropzone-ijazah', '#input-file-ijazah', '#file-info-ijazah', '#preview-box-ijazah', 'ijazah');
      bindDocUpload('#dropzone-kk', '#input-file-kk', '#file-info-kk', '#preview-box-kk', 'kk');
      bindDocUpload('#dropzone-akta', '#input-file-akta', '#file-info-akta', '#preview-box-akta', 'akta');
      bindDocUpload('#dropzone-bayar', '#input-file-bayar', '#file-info-txt', '#preview-box-bayar', 'bayar');

      // Tombol muat contoh dokumen demo otomatis
      const btnDemoFiles = container.querySelector('#btn-fill-demo-files');
      if (btnDemoFiles) {
        btnDemoFiles.addEventListener('click', () => {
          const mockImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          const mockPdf = 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2Jq';

          const nisn = user?.nisn || '0051234567';
          uploadState.ijazah = { nama_file: `Ijazah_SMP_${nisn}.pdf`, data_url: mockPdf, size: '1.4 MB', ukuran_kb: 1400, tipe: 'application/pdf' };
          uploadState.kk = { nama_file: `Kartu_Keluarga_${nisn}.jpg`, data_url: mockImg, size: '920 KB', ukuran_kb: 920, tipe: 'image/jpeg' };
          uploadState.akta = { nama_file: `Akta_Kelahiran_${nisn}.jpg`, data_url: mockImg, size: '880 KB', ukuran_kb: 880, tipe: 'image/jpeg' };
          uploadState.bayar = { nama_file: `Bukti_Bayar_${nisn}.png`, data_url: mockImg, size: '450 KB', ukuran_kb: 450, tipe: 'image/png' };

          const updates = [
            { drop: '#dropzone-ijazah', info: '#file-info-ijazah', prev: '#preview-box-ijazah', data: uploadState.ijazah, isPdf: true },
            { drop: '#dropzone-kk', info: '#file-info-kk', prev: '#preview-box-kk', data: uploadState.kk, isPdf: false },
            { drop: '#dropzone-akta', info: '#file-info-akta', prev: '#preview-box-akta', data: uploadState.akta, isPdf: false },
            { drop: '#dropzone-bayar', info: '#file-info-txt', prev: '#preview-box-bayar', data: uploadState.bayar, isPdf: false }
          ];

          updates.forEach(u => {
            const drop = container.querySelector(u.drop);
            const info = container.querySelector(u.info);
            const prev = container.querySelector(u.prev);
            if (drop) drop.classList.add('is-uploaded');
            if (info) {
              info.textContent = `✓ Terpilih: ${u.data.nama_file} (${u.data.size})`;
              info.style.color = '#15803d';
            }
            if (prev) {
              prev.innerHTML = u.isPdf 
                ? `<div class="doc-preview-pdf">📄 PDF Dokumen Terlampir (${u.data.size})</div>` 
                : `<img src="${u.data.data_url}" class="doc-preview-thumb" alt="Demo">`;
              prev.style.display = 'block';
            }
          });

          const alertBox = container.querySelector('#spmb-alert-form');
          showFormAlert(alertBox, '✓ 4 Dokumen demo (Ijazah SMP PDF, Kartu Keluarga, Akta Kelahiran, dan Bukti Bayar) berhasil dimuat siap simpan!', false);
        });
      }

      // Tombol muat contoh biodata demo
      const btnDemoBio = container.querySelector('#btn-fill-demo-bio');
      if (btnDemoBio) {
        btnDemoBio.addEventListener('click', () => {
          const nikEl = container.querySelector('#bio-nik');
          const sekolahEl = container.querySelector('#bio-sekolah');
          const alamatEl = container.querySelector('#bio-alamat');
          const ortuEl = container.querySelector('#bio-ortu');
          const jurusanEl = container.querySelector('#bio-jurusan');

          if (nikEl) nikEl.value = '3471012345670001';
          if (sekolahEl) sekolahEl.value = 'SMP Muhammadiyah 1 Yogyakarta';
          if (alamatEl) alamatEl.value = 'Jl. Malioboro No. 45, RT 02 / RW 03, Sosromenduran, Gedongtengen, Kota Yogyakarta';
          if (ortuEl) ortuEl.value = 'H. Ahmad Dahlan / Siti Walidah';
          if (jurusanEl) jurusanEl.value = 'MIPA';

          const alertBox = container.querySelector('#spmb-alert-form');
          showFormAlert(alertBox, '✓ Contoh isian biodata lengkap berhasil dimuat ke formulir!', false);
        });
      }

      formBio.addEventListener('submit', (e) => {
        e.preventDefault();
        const alertBox = container.querySelector('#spmb-alert-form');
        const nik = container.querySelector('#bio-nik').value.trim();

        if (!/^[0-9]{16}$/.test(nik)) {
          showFormAlert(alertBox, 'NIK wajib tepat 16 digit angka!', true);
          return;
        }

        let user = currentLoggedInUser || getPendaftarById(currentTrackingId);
        if (!user) return;

        // Validasi kelengkapan 4 dokumen (Akta Kelahiran, Kartu Keluarga, Ijazah, Bukti Bayar)
        if (!uploadState.ijazah.data_url) {
          showFormAlert(alertBox, 'Harap unggah Ijazah / SKL SMP/MTs (foto atau PDF)!', true);
          return;
        }
        if (!uploadState.kk.data_url) {
          showFormAlert(alertBox, 'Harap unggah Kartu Keluarga (KK) calon siswa!', true);
          return;
        }
        if (!uploadState.akta.data_url) {
          showFormAlert(alertBox, 'Harap unggah Akta Kelahiran resmi calon siswa!', true);
          return;
        }
        if (!uploadState.bayar.data_url) {
          showFormAlert(alertBox, 'Harap unggah Bukti Transfer pembayaran formulir pendaftaran!', true);
          return;
        }

        const nowIso = new Date().toISOString();
        const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        const updatedUser = {
          ...user,
          nama_lengkap: container.querySelector('#bio-nama').value.trim(),
          biodata: {
            ...(user.biodata || {}),
            nik: nik,
            alamat: container.querySelector('#bio-alamat').value.trim(),
            asal_sekolah: container.querySelector('#bio-sekolah').value.trim(),
            nama_orang_tua: container.querySelector('#bio-ortu').value.trim(),
            pilihan_jurusan: container.querySelector('#bio-jurusan').value
          },
          berkas: {
            ...(user.berkas || {}),
            ijazah: {
              nama_file: uploadState.ijazah.nama_file,
              data_url: uploadState.ijazah.data_url,
              size: uploadState.ijazah.size || '1.4 MB',
              ukuran_kb: uploadState.ijazah.ukuran_kb || 1400,
              tipe: uploadState.ijazah.tipe || 'application/pdf',
              tgl_unggah: dateStr,
              status: user.berkas?.ijazah?.status || 'verified',
              uploaded_at: nowIso
            },
            kk: {
              nama_file: uploadState.kk.nama_file,
              data_url: uploadState.kk.data_url,
              size: uploadState.kk.size || '920 KB',
              ukuran_kb: uploadState.kk.ukuran_kb || 920,
              tipe: uploadState.kk.tipe || 'image/jpeg',
              tgl_unggah: dateStr,
              status: user.berkas?.kk?.status || 'verified',
              uploaded_at: nowIso
            },
            kartu_keluarga: {
              nama_file: uploadState.kk.nama_file,
              data_url: uploadState.kk.data_url,
              size: uploadState.kk.size || '920 KB',
              ukuran_kb: uploadState.kk.ukuran_kb || 920,
              tipe: uploadState.kk.tipe || 'image/jpeg',
              tgl_unggah: dateStr,
              status: user.berkas?.kartu_keluarga?.status || 'verified',
              uploaded_at: nowIso
            },
            akta: {
              nama_file: uploadState.akta.nama_file,
              data_url: uploadState.akta.data_url,
              size: uploadState.akta.size || '880 KB',
              ukuran_kb: uploadState.akta.ukuran_kb || 880,
              tipe: uploadState.akta.tipe || 'image/jpeg',
              tgl_unggah: dateStr,
              status: user.berkas?.akta?.status || 'verified',
              uploaded_at: nowIso
            },
            akta_kelahiran: {
              nama_file: uploadState.akta.nama_file,
              data_url: uploadState.akta.data_url,
              size: uploadState.akta.size || '880 KB',
              ukuran_kb: uploadState.akta.ukuran_kb || 880,
              tipe: uploadState.akta.tipe || 'image/jpeg',
              tgl_unggah: dateStr,
              status: user.berkas?.akta_kelahiran?.status || 'verified',
              uploaded_at: nowIso
            },
            bukti_bayar: {
              nama_file: uploadState.bayar.nama_file,
              data_url: uploadState.bayar.data_url,
              size: uploadState.bayar.size || '450 KB',
              ukuran_kb: uploadState.bayar.ukuran_kb || 450,
              tgl_unggah: dateStr,
              status: user.pembayaran?.status_pembayaran === 'lunas' ? 'verified' : 'pending',
              uploaded_at: nowIso
            }
          },
          pembayaran: {
            ...(user.pembayaran || {}),
            file_bukti: uploadState.bayar.nama_file || user.pembayaran?.file_bukti || 'bukti_transfer.jpg',
            file_data_url: uploadState.bayar.data_url || user.pembayaran?.file_data_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            status_pembayaran: user.pembayaran?.status_pembayaran || 'pending_verification'
          }
        };

        savePendaftar(updatedUser);
        currentLoggedInUser = updatedUser;
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(updatedUser));

        showFormAlert(alertBox, '✓ Formulir biodata & 4 dokumen digital (Akta Kelahiran, KK, Ijazah/SKL, dan Bukti Bayar) berhasil tersimpan ke SSoT! Menunggu konfirmasi verifikasi loket & bendahara.', false);
        setTimeout(() => {
          activeTab = 'status';
          renderView();
        }, 1200);
      });
    }

    const btnDemoAutoLogin = container.querySelector('#btn-demo-autologin');
    if (btnDemoAutoLogin) {
      btnDemoAutoLogin.addEventListener('click', () => {
        const list = getPendaftarList();
        const activeOne = list.find(p => p.status_akun === 'active' || p.status_akun === 'AKTIF') || list[0];
        if (activeOne) {
          activeOne.status_akun = 'active';
          currentLoggedInUser = activeOne;
          currentTrackingId = activeOne.id_pendaftar || activeOne.id;
          localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(activeOne));
          savePendaftar(activeOne);
          renderView();
        }
      });
    }

    const btnNavToReg = container.querySelector('#btn-nav-to-reg');
    if (btnNavToReg) btnNavToReg.addEventListener('click', () => { activeTab = 'register'; renderView(); });

    const btnNavToStatus = container.querySelector('#btn-nav-to-status');
    if (btnNavToStatus) btnNavToStatus.addEventListener('click', () => { activeTab = 'status'; renderView(); });

    // 5. Kelulusan Actions
    const btnCheckKelulusan = container.querySelector('#btn-check-kelulusan');
    if (btnCheckKelulusan) {
      btnCheckKelulusan.addEventListener('click', () => {
        const query = container.querySelector('#search-kelulusan-id').value.trim();
        const user = getPendaftarById(query);
        const resultBox = container.querySelector('#result-kelulusan-box');
        if (resultBox) {
          resultBox.innerHTML = renderKelulusanResultCard(user);
        }
      });
    }
  }

  function showFormAlert(box, message, isError = true) {
    if (!box) return;
    box.style.display = 'block';
    box.style.background = isError ? '#fef2f2' : '#f0fdf4';
    box.style.color = isError ? '#991b1b' : '#166534';
    box.style.border = `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`;
    box.innerHTML = message;
  }

  // Render awal
  renderView();

  // Dengarkan event sinkronisasi real-time
  window.addEventListener('spmb_db_updated', () => renderView());
  window.addEventListener('db_updated', () => renderView());
}

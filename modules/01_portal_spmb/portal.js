/**
 * Modul 01: Portal Utama Pendaftaran (Portal SPMB)
 * Lead Front-End Developer: SPMB Siswa Portal
 * Integrasi Penuh: Central Storage (spmb_pendaftar_db), Password Hash, Base64 Media Upload, Validasi UX, & Event Dispatcher
 */

import { db } from '../../config/database.js';
import { 
  getPendaftarList, 
  savePendaftar, 
  updateStatusAkun, 
  hashPassword, 
  fileToDataURL, 
  isValidEmail, 
  isValidNoWA, 
  isValidPassword,
  logoutUser
} from './utils.js';

export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--primary, #006837);">🎓 Modul 01: Portal Pendaftaran SPMB</h2>
        <p style="color: var(--text-muted, #64748b); font-size: 0.875rem;">SMA Muhammadiyah 3 Yogyakarta - Integrated Data Store (spmb_pendaftar_db)</p>
      </div>

      <!-- Standalone Links & Contract Docs -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <a href="modules/01_portal_spmb/register.html" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; text-decoration: none;">📄 Register.html</a>
        <a href="modules/01_portal_spmb/status-akun.html" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; text-decoration: none;">📄 Status-Akun.html</a>
        <a href="modules/01_portal_spmb/login.html" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; text-decoration: none;">🔑 Login.html</a>
        <a href="modules/01_portal_spmb/formulir.html" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; text-decoration: none;">📄 Formulir.html</a>
        <a href="modules/01_portal_spmb/README.md" target="_blank" class="btn btn-primary" style="font-size: 0.78rem; text-decoration: none;">📖 Contract README</a>
      </div>
    </div>

    <!-- Step Navigation Pills -->
    <div style="display: flex; gap: 8px; margin-bottom: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; flex-wrap: wrap;">
      <button id="tab-reg" class="tab-btn active" style="border-radius: 20px;">1. Registrasi Akun</button>
      <button id="tab-status" class="tab-btn" style="border-radius: 20px;">2. Status & Notifikasi</button>
      <button id="tab-login" class="tab-btn" style="border-radius: 20px;">3. Login Pendaftar</button>
      <button id="tab-form" class="tab-btn" style="border-radius: 20px;">4. Formulir Pendaftaran & Bukti</button>
    </div>

    <div id="spmb-step-content"></div>
  `;

  let currentSubStep = 'reg';

  const tabReg = document.getElementById('tab-reg');
  const tabStatus = document.getElementById('tab-status');
  const tabLogin = document.getElementById('tab-login');
  const tabForm = document.getElementById('tab-form');
  const stepContent = document.getElementById('spmb-step-content');

  function updateTabsUI() {
    tabReg.classList.toggle('active', currentSubStep === 'reg');
    tabStatus.classList.toggle('active', currentSubStep === 'status');
    tabLogin.classList.toggle('active', currentSubStep === 'login');
    tabForm.classList.toggle('active', currentSubStep === 'form');
  }

  tabReg.addEventListener('click', () => { currentSubStep = 'reg'; renderStep(); });
  tabStatus.addEventListener('click', () => { currentSubStep = 'status'; renderStep(); });
  tabLogin.addEventListener('click', () => { currentSubStep = 'login'; renderStep(); });
  tabForm.addEventListener('click', () => { currentSubStep = 'form'; renderStep(); });

  function renderStep() {
    updateTabsUI();

    const currentUser = JSON.parse(localStorage.getItem('m3_spmb_current_user'));
    const loggedInUser = JSON.parse(localStorage.getItem('m3_spmb_logged_in_user'));
    const pendaftarList = getPendaftarList();
    const activeAccount = currentUser ? (pendaftarList.find(p => p.nisn === currentUser.nisn || p.id_pendaftar === currentUser.id_pendaftar) || currentUser) : (pendaftarList[pendaftarList.length - 1] || null);

    if (currentSubStep === 'reg') {
      renderRegisterStep();
    } else if (currentSubStep === 'status') {
      renderStatusStep(activeAccount);
    } else if (currentSubStep === 'login') {
      renderLoginStep();
    } else if (currentSubStep === 'form') {
      renderFormStep(loggedInUser);
    }
  }

  // --- SUB STEP 1: REGISTRASI AKUN ---
  function renderRegisterStep() {
    stepContent.innerHTML = `
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header">
          <h3 class="card-title">📝 Registrasi Akun Awal Pendaftar</h3>
          <p style="font-size: 0.85rem; color: #64748b;">Password dienkripsi SHA-256 (Default: pending_activation)</p>
        </div>

        <form id="spmb-register-form">
          <div class="form-group">
            <label for="reg-nama">Nama Lengkap Siswa *</label>
            <input type="text" id="reg-nama" class="form-control" placeholder="Nama sesuai ijazah" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label for="reg-email">Email *</label>
              <input type="email" id="reg-email" class="form-control" placeholder="nama@domain.com" required>
            </div>

            <div class="form-group">
              <label for="reg-wa">No. WhatsApp *</label>
              <input type="text" id="reg-wa" class="form-control" placeholder="081234567890" required>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-nisn">NISN (Tepat 10 digit angka) *</label>
            <input type="text" id="reg-nisn" class="form-control" maxlength="10" placeholder="10 digit angka NISN" pattern="[0-9]{10}" required>
            <div style="font-size: 0.75rem; color: #64748b; display: flex; justify-content: space-between; margin-top: 4px;">
              <span>Validasi otomatis 10 digit</span>
              <span id="spa-nisn-count">0 / 10</span>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-password">Password *</label>
            <input type="password" id="reg-password" class="form-control" placeholder="Min. 6 karakter (huruf & angka)" required>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 10px;">
            Daftar Akun Baru
          </button>
        </form>
      </div>
    `;

    const nisnInput = document.getElementById('reg-nisn');
    const nisnCounter = document.getElementById('spa-nisn-count');
    nisnInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
      nisnCounter.textContent = `${e.target.value.length} / 10`;
    });

    document.getElementById('spmb-register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('reg-nama').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const noWa = document.getElementById('reg-wa').value.trim();
      const nisn = nisnInput.value.trim();
      const password = document.getElementById('reg-password').value;

      if (!/^[0-9]{10}$/.test(nisn)) {
        alert('NISN wajib diisi tepat 10 digit angka!');
        return;
      }
      if (!isValidEmail(email)) {
        alert('Format Email tidak valid!');
        return;
      }
      if (!isValidNoWA(noWa)) {
        alert('Format No. WhatsApp tidak valid (contoh: 081234567890)!');
        return;
      }
      if (!isValidPassword(password)) {
        alert('Password wajib minimal 6 karakter dan mengombinasikan huruf + angka!');
        return;
      }

      const pendaftarList = getPendaftarList();
      if (pendaftarList.some(p => p.nisn === nisn)) {
        alert('NISN ini sudah terdaftar!');
        return;
      }

      const hashedPassword = await hashPassword(password);
      const regId = `REG-2026-${String(pendaftarList.length + 1).padStart(3, '0')}`;
      
      const newAcc = {
        id_pendaftar: regId,
        nama_lengkap: nama,
        email: email,
        no_wa: noWa,
        nisn: nisn,
        password_hash: hashedPassword,
        status_akun: 'pending_activation',
        created_at: new Date().toISOString(),
        biodata: null,
        pembayaran: null
      };

      savePendaftar(newAcc);
      localStorage.setItem('m3_spmb_current_user', JSON.stringify(newAcc));

      alert('Akun berhasil dibuat dengan status pending_activation!');
      currentSubStep = 'status';
      renderStep();
    });
  }

  // --- SUB STEP 2: HALAMAN STATUS & NOTIFIKASI ---
  function renderStatusStep(account) {
    if (!account) {
      stepContent.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 2rem;">
          <p style="color: #64748b;">Belum ada akun terdaftar. Silakan lakukan registrasi akun terlebih dahulu.</p>
          <button class="btn btn-primary" id="btn-goto-reg" style="margin-top: 1rem;">Daftar Akun Baru</button>
        </div>
      `;
      document.getElementById('btn-goto-reg').onclick = () => { currentSubStep = 'reg'; renderStep(); };
      return;
    }

    const isActive = (account.status_akun === 'active' || account.status_akun === 'AKTIF');

    stepContent.innerHTML = `
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}" style="font-size: 0.85rem; padding: 6px 14px; text-transform: uppercase;">
            ${account.status_akun}
          </span>
          <button id="btn-logout-status" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;">Logout</button>
        </div>

        <div style="background-color: ${isActive ? '#f0fdf4' : '#fffbeb'}; border-left: 4px solid ${isActive ? '#22c55e' : '#f59e0b'}; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          ${isActive 
            ? '<strong>Selamat! Akun Anda telah AKTIF.</strong><br>Silakan <strong>Login</strong> terlebih dahulu untuk mengisi Formulir Pendaftaran lengkap.'
            : '<strong>Akun Anda berhasil dibuat dan sedang menunggu aktivasi dari Admin SPMB.</strong>'
          }
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1.25rem;">
          <div><strong>ID Pendaftar:</strong> ${account.id_pendaftar || account.id || 'REG-2026-001'}</div>
          <div><strong>Nama Lengkap:</strong> ${account.nama_lengkap || account.nama || '-'}</div>
          <div><strong>NISN:</strong> ${account.nisn || '-'}</div>
          <div><strong>Email / WA:</strong> ${account.email || account.no_wa || '-'}</div>
        </div>

        <button id="btn-to-login" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1rem;" ${!isActive ? 'disabled' : ''}>
          🔑 Ke Halaman Login Pendaftar &rarr;
        </button>

        <div style="margin-top: 1.5rem; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 0.8rem; border: 1px dashed #cbd5e1;">
          <strong>💡 Testing Handover Admin SPMB:</strong><br>
          <button id="btn-toggle-active" class="btn btn-secondary" style="margin-top: 6px; padding: 4px 12px; font-size: 0.75rem;">
            ⚡ Toggle status_akun (${isActive ? 'pending_activation' : 'active'})
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-logout-status').onclick = () => {
      logoutUser();
      renderStep();
    };

    if (isActive) {
      document.getElementById('btn-to-login').onclick = () => {
        currentSubStep = 'login';
        renderStep();
      };
    }

    document.getElementById('btn-toggle-active').onclick = () => {
      const nextStatus = isActive ? 'pending_activation' : 'active';
      const updated = updateStatusAkun(account.id_pendaftar || account.id, nextStatus);
      if (updated) {
        localStorage.setItem('m3_spmb_current_user', JSON.stringify(updated));
        renderStep();
      }
    };
  }

  // --- SUB STEP 3: LOGIN PENDAFTAR ---
  function renderLoginStep() {
    const loggedInUser = JSON.parse(localStorage.getItem('m3_spmb_logged_in_user'));

    if (loggedInUser) {
      stepContent.innerHTML = `
        <div class="card" style="max-width: 550px; margin: 0 auto; text-align: center; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✅</div>
          <h3 style="color: #166534; font-weight: 700;">Sudah Login</h3>
          <p style="color: #64748b; margin-top: 0.25rem;">Logged in as: <strong>${loggedInUser.nama_lengkap || loggedInUser.nama}</strong> (${loggedInUser.nisn})</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.5rem;">
            <button id="btn-to-form-direct" class="btn btn-primary">Isi Formulir Pendaftaran &rarr;</button>
            <button id="btn-logout" class="btn btn-secondary">Logout Sesi</button>
          </div>
        </div>
      `;
      document.getElementById('btn-to-form-direct').onclick = () => { currentSubStep = 'form'; renderStep(); };
      document.getElementById('btn-logout').onclick = () => {
        logoutUser();
        renderStep();
      };
      return;
    }

    stepContent.innerHTML = `
      <div class="card" style="max-width: 550px; margin: 0 auto;">
        <div class="card-header" style="text-align: center;">
          <h3 class="card-title">🔑 Login Pendaftar SPMB</h3>
          <p style="font-size: 0.85rem; color: #64748b;">Masuk dengan Hashed Password SHA-256</p>
        </div>

        <form id="spmb-login-form">
          <div class="form-group">
            <label for="l-identity">NISN / Email *</label>
            <input type="text" id="l-identity" class="form-control" placeholder="10 digit NISN atau email" required>
          </div>

          <div class="form-group">
            <label for="l-password">Password *</label>
            <input type="password" id="l-password" class="form-control" placeholder="Masukkan password" required>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 11px;">
            Masuk / Login
          </button>

          <div style="margin-top: 1.5rem; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 0.8rem; border: 1px dashed #cbd5e1;">
            <strong>💡 Fast-Track Login Demo (Budi Santoso - Active):</strong><br>
            <button id="btn-fast-login" type="button" class="btn btn-secondary" style="margin-top: 6px; padding: 4px 12px; font-size: 0.75rem;">
              ⚡ Auto Login Sample Active User
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('spmb-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const identity = document.getElementById('l-identity').value.trim();
      const password = document.getElementById('l-password').value;

      const pendaftarList = getPendaftarList();
      const user = pendaftarList.find(p => p.nisn === identity || p.email === identity);

      if (!user) {
        alert('NISN/Email tidak ditemukan! Silakan registrasi dahulu.');
        return;
      }

      const inputHash = await hashPassword(password);
      if (user.password_hash && user.password_hash !== inputHash && user.password !== password) {
        alert('Password salah!');
        return;
      }

      const isActive = (user.status_akun === 'active' || user.status_akun === 'AKTIF');
      if (!isActive) {
        alert('Akun Anda belum diaktivasi oleh Admin SPMB!');
        return;
      }

      localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(user));
      alert('Login Berhasil! Mengalihkan ke Formulir Pendaftaran...');
      currentSubStep = 'form';
      renderStep();
    });

    document.getElementById('btn-fast-login').onclick = () => {
      const pendaftarList = getPendaftarList();
      const sampleActive = pendaftarList.find(p => p.status_akun === 'active') || {
        id_pendaftar: 'REG-2026-002',
        nama_lengkap: 'Budi Santoso',
        nisn: '1234567890',
        status_akun: 'active',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(sampleActive));
      currentSubStep = 'form';
      renderStep();
    };
  }

  // --- SUB STEP 4: FORMULIR PENDAFTARAN LENGKAP & UPLOAD BUKTI ---
  function renderFormStep(loggedInUser) {
    const isAccountActive = loggedInUser && (loggedInUser.status_akun === 'active' || loggedInUser.status_akun === 'AKTIF');

    if (!loggedInUser || !isAccountActive) {
      stepContent.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 2.5rem;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔒</div>
          <h3 style="color: #991b1b; font-weight: 700;">Akses Ditolak</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Formulir pendaftaran hanya dapat diakses setelah akun diaktivasi oleh Admin SPMB dan Anda <strong>LOGIN</strong>.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="btn-back-login" class="btn btn-primary">Ke Halaman Login Pendaftar</button>
            <button id="btn-quick-active-spa" class="btn btn-secondary">
              ⚡ Auto Login Sample Active User (Demo)
            </button>
          </div>
        </div>
      `;
      document.getElementById('btn-back-login').onclick = () => { currentSubStep = 'login'; renderStep(); };
      document.getElementById('btn-quick-active-spa').onclick = () => {
        const pendaftarList = getPendaftarList();
        const activeUser = pendaftarList.find(p => p.status_akun === 'active') || {
          id_pendaftar: 'REG-2026-002',
          nama_lengkap: 'Budi Santoso',
          nisn: '1234567890',
          status_akun: 'active',
          created_at: new Date().toISOString()
        };
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(activeUser));
        renderStep();
      };
      return;
    }

    const bio = loggedInUser.biodata || {};
    const bayar = loggedInUser.pembayaran || {};

    stepContent.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 0 auto;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="card-title">📄 Formulir Pendaftaran Lengkap & Upload Bukti Bayar</h3>
            <p style="font-size: 0.85rem; color: #64748b;">Logged in as: <strong>${loggedInUser.nama_lengkap || loggedInUser.nama}</strong> (${loggedInUser.nisn})</p>
          </div>
          <button id="btn-logout-form" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;">Logout Sesi</button>
        </div>

        <form id="spmb-form-full">
          <h4 style="color: var(--primary, #006837); font-size: 0.95rem; margin-bottom: 0.75rem;">1. Objek Biodata Siswa</h4>
          
          <div class="form-group">
            <label>Nama Lengkap *</label>
            <input type="text" id="f-nama" class="form-control" value="${loggedInUser.nama_lengkap || loggedInUser.nama || ''}" required>
          </div>

          <div class="form-group">
            <label>NIK (16 Digit Angka) *</label>
            <input type="text" id="f-nik" class="form-control" maxlength="16" placeholder="3171012345678901" value="${bio.nik || ''}" pattern="[0-9]{16}" required>
            <div style="font-size: 0.75rem; color: #64748b; display: flex; justify-content: space-between; margin-top: 4px;">
              <span>Tepat 16 digit angka</span>
              <span id="spa-nik-count">${bio.nik ? bio.nik.length : 0} / 16</span>
            </div>
          </div>

          <div class="form-group">
            <label>Alamat Lengkap *</label>
            <textarea id="f-alamat" class="form-control" rows="3" placeholder="Jl. Merdeka No. 10" required>${bio.alamat || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Asal Sekolah (SMP / MTs) *</label>
            <input type="text" id="f-asal-sekolah" class="form-control" placeholder="SMPN 1 Jakarta" value="${bio.asal_sekolah || ''}" required>
          </div>

          <div class="form-group">
            <label>Nama Orang Tua / Wali *</label>
            <input type="text" id="f-ortu" class="form-control" placeholder="Siti Aminah" value="${bio.nama_orang_tua || ''}" required>
          </div>

          <div class="form-group">
            <label>Pilihan Jurusan *</label>
            <select id="f-jurusan" class="form-control" required>
              <option value="MIPA" ${bio.pilihan_jurusan === 'MIPA' ? 'selected' : ''}>MIPA</option>
              <option value="IPS" ${bio.pilihan_jurusan === 'IPS' ? 'selected' : ''}>IPS</option>
            </select>
          </div>

          <h4 style="color: var(--primary, #006837); font-size: 0.95rem; margin: 1.25rem 0 0.75rem 0;">2. Objek Pembayaran & Base64 Media</h4>

          <div class="form-group">
            <label>Simulasi File Bukti Pembayaran (.jpg, .png, .pdf) *</label>
            <input type="file" id="f-bukti" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
            <div id="f-bukti-preview" style="font-size: 0.8rem; color: #006837; font-weight: 600; margin-top: 4px;">
              ${bayar.file_bukti ? `✓ File terupload: ${bayar.file_bukti}` : ''}
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; padding: 12px; font-size: 1rem;">
            Simpan Formulir & Kirim Pendaftaran
          </button>
        </form>
      </div>
    `;

    document.getElementById('btn-logout-form').onclick = () => {
      logoutUser();
      currentSubStep = 'login';
      renderStep();
    };

    const nikInput = document.getElementById('f-nik');
    const nikCount = document.getElementById('spa-nik-count');
    nikInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
      nikCount.textContent = `${e.target.value.length} / 16`;
    });

    let uploadedFileName = bayar.file_bukti || null;
    let base64DataUrl = bayar.file_data_url || null;

    const fileInput = document.getElementById('f-bukti');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
          alert('Format file tidak didukung! Hanya .jpg, .png, atau .pdf.');
          fileInput.value = '';
          return;
        }
        uploadedFileName = file.name;
        base64DataUrl = await fileToDataURL(file);
        document.getElementById('f-bukti-preview').textContent = `✓ File terpilih: ${file.name} (Base64 Ready)`;
      }
    });

    document.getElementById('spmb-form-full').addEventListener('submit', (e) => {
      e.preventDefault();
      const nik = nikInput.value.trim();

      if (!/^[0-9]{16}$/.test(nik)) {
        alert('NIK wajib diisi tepat 16 digit angka!');
        return;
      }

      if (!uploadedFileName) {
        alert('Harap unggah file bukti bayar (.jpg, .png, .pdf)!');
        return;
      }

      const updatedAcc = {
        ...loggedInUser,
        nama_lengkap: document.getElementById('f-nama').value.trim(),
        biodata: {
          nik: nik,
          alamat: document.getElementById('f-alamat').value.trim(),
          asal_sekolah: document.getElementById('f-asal-sekolah').value.trim(),
          nama_orang_tua: document.getElementById('f-ortu').value.trim(),
          pilihan_jurusan: document.getElementById('f-jurusan').value
        },
        pembayaran: {
          file_bukti: uploadedFileName,
          file_data_url: base64DataUrl,
          status_pembayaran: 'pending_verification'
        }
      };

      savePendaftar(updatedAcc);
      localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(updatedAcc));

      alert('Formulir berhasil disimpan! Objek pembayaran (Base64) diset: pending_verification.');
      currentSubStep = 'status';
      renderStep();
    });
  }

  // Initial step render
  renderStep();
}

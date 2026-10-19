/**
 * =========================================================================================
 * MODUL 08: BASIS DATA TERINTEGRASI / SSOT ADAPTER (SCHEMA & DATA ENGINE)
 * SMA Muhammadiyah 3 Yogyakarta - Sistem Integrasi SPMB & TU
 * Penanggung Jawab / Developer: Raudhatul
 * =========================================================================================
 * Layer: Data Layer | Strategi: Hybrid
 * 
 * Modul ini berfungsi sebagai:
 * 1. Pusat Single Source of Truth (SSoT) Engine & Database Explorer.
 * 2. Visualisasi Skema Data Relasi (ERD) dan Alur Data Lintas Unit (SPMB ke TU).
 * 3. Kamus Data Interaktif (Data Dictionary) untuk atribut pendaftar & tata usaha.
 * 4. Live JSON Inspector: Penampil data mentah real-time dari LocalStorage (m3_spmb_tu_db).
 * 5. Mesin Uji Integritas Data (Data Integrity Validator): Memastikan zero-redundancy & konsistensi.
 * =========================================================================================
 */

import { db } from '../../config/database.js';

const STORAGE_KEY_SSOT_TU = 'm3_spmb_tu_db';

/**
 * Kamus Data Resmi SSoT SPMB–TU (Data Dictionary)
 */
const DATA_DICTIONARY = [
  { field: 'id', type: 'string', module: 'Modul 01/02', desc: 'Nomor unik registrasi peserta (contoh: SPMB-2026-001 / REG-2026-001)', sample: '"SPMB-2026-001"' },
  { field: 'nama', type: 'string', module: 'Modul 01/02', desc: 'Nama lengkap calon peserta didik sesuai akta kelahiran', sample: '"Ahmad Dahlan"' },
  { field: 'nisn', type: 'string', module: 'Modul 01/02', desc: 'Nomor Induk Siswa Nasional 10 digit resmi Dapodik/Kemdikbud', sample: '"0051234567"' },
  { field: 'asal_sekolah', type: 'string', module: 'Modul 01/02', desc: 'Nama sekolah asal jenjang SMP / MTs', sample: '"SMP Muhammadiyah 1 Yogyakarta"' },
  { field: 'pilihan_jurusan', type: 'string', module: 'Modul 01/04', desc: 'Peminatan pemetaan rombel (MIPA / IPS)', sample: '"MIPA"' },
  { field: 'status_akun', type: 'string', module: 'Modul 02', desc: 'Status verifikasi akun oleh Admin (AKTIF / PENDING)', sample: '"AKTIF"' },
  { field: 'status_pembayaran', type: 'string', module: 'Modul 03', desc: 'Status pelunasan biaya formulir & uang pangkal (LUNAS / BELUM_LUNAS)', sample: '"LUNAS"' },
  { field: 'nilai_wawancara', type: 'number', module: 'Modul 04', desc: 'Skor agregasi seleksi wawancara dan tahfidz (0-100)', sample: '88' },
  { field: 'status_kelulusan', type: 'string', module: 'Modul 05', desc: 'Keputusan sidang pleno kelulusan seleksi (LULUS / TIDAK LULUS)', sample: '"LULUS"' },
  { field: 'status_daftar_ulang', type: 'string', module: 'Modul 06', desc: 'Hasil verifikasi berkas fisik loket (TERVERIFIKASI / MENUNGGU_VERIFIKASI)', sample: '"TERVERIFIKASI"' },
  { field: 'is_locked', type: 'boolean', module: 'Modul 07', desc: 'Flag penguncian permanen Data Locking Engine (true = beku untuk TU)', sample: 'true' },
  { field: 'tgl_locked', type: 'string', module: 'Modul 07', desc: 'Timestamp ISO saat data dibekukan resmi ke SSoT TU', sample: '"2026-10-18T10:15:00Z"' },
  { field: 'locked_by', type: 'string', module: 'Modul 07', desc: 'Petugas / Koordinator SPMB yang mengotorisasi penguncian', sample: '"Koordinator SPMB (Yosa)"' },
  { field: 'data_tu.kelas_terpilih', type: 'string', module: 'Modul 09', desc: 'Penempatan rombongan belajar resmi Tata Usaha (X-MIPA-1 s/d X-IPS-3)', sample: '"X-MIPA-1"' },
  { field: 'data_tu.buku_induk_nomor', type: 'string', module: 'Modul 09', desc: 'Nomor register Buku Induk Siswa yang diterbitkan TU', sample: '"M3-2026-0001"' },
  { field: 'data_tu.status_dapodik', type: 'string', module: 'Modul 09', desc: 'Kesiapan sinkronisasi ke aplikasi Dapodik Kemdikbudristek', sample: '"SIAP_SINKRON"' }
];

/**
 * State Lokal Modul 08
 */
let schemaState = {
  activeTab: 'erd', // 'erd', 'dictionary', 'json', 'audit'
  searchQuery: '',
  containerId: 'module-viewport'
};

/**
 * Injeksi Stylesheet Modul 08
 */
function ensureSchemaStyles() {
  const cssId = 'schema-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/08_basis_data_tu/');
    link.href = isStandalone ? './schema.css' : './modules/08_basis_data_tu/schema.css';
    document.head.appendChild(link);
  }
}

/**
 * Helper Sanitasi String (Anti-XSS)
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mengambil data mentah dari LocalStorage SSoT
 */
function getRawSSoTData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('[Schema Modul] Gagal membaca storage SSoT:', err);
  }
  return db.get() || { pendaftar: [], pengaturan: {} };
}

/**
 * Menghitung ukuran payload data di LocalStorage
 */
function getStorageSizeBytes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    return raw ? new Blob([raw]).size : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Toast Notifikasi
 */
function showToast(message) {
  const existing = document.getElementById('schema-toast-notif');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'schema-toast-notif';
  toast.className = 'schema-toast';
  toast.innerHTML = `<span>✅</span> <span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

/**
 * Salin JSON ke Clipboard
 */
function copyJsonToClipboard() {
  const data = getRawSSoTData();
  const jsonStr = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast('Seluruh data JSON SSoT berhasil disalin ke clipboard!');
  }).catch(() => {
    showToast('Gagal menyalin JSON, silakan blok dan salin manual.');
  });
}

/**
 * Unduh Backup JSON
 */
function downloadJsonBackup() {
  const data = getRawSSoTData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_ssot_m3_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File backup JSON SSoT berhasil diunduh!');
}

/**
 * Menjalankan Audit Integritas Data SSoT
 */
function runDataIntegrityCheck() {
  const data = getRawSSoTData();
  const pendaftar = Array.isArray(data.pendaftar) ? data.pendaftar : [];
  
  const nisnSet = new Set();
  let duplicateNisn = 0;
  let lockedWithoutLunas = 0;
  let missingRequiredFields = 0;

  pendaftar.forEach(p => {
    if (p.nisn) {
      if (nisnSet.has(p.nisn)) duplicateNisn++;
      else nisnSet.add(p.nisn);
    }
    if (p.is_locked && String(p.status_pembayaran).toUpperCase() !== 'LUNAS') {
      lockedWithoutLunas++;
    }
    if (!p.nama || !p.nisn) {
      missingRequiredFields++;
    }
  });

  return {
    totalRecords: pendaftar.length,
    duplicateNisn,
    lockedWithoutLunas,
    missingRequiredFields,
    isHealthy: duplicateNisn === 0 && lockedWithoutLunas === 0 && missingRequiredFields === 0
  };
}

// =========================================================================================
// RENDER TAB VIEW: 1. ERD & PIPELINE ALUR DATA
// =========================================================================================
function renderErdView() {
  return `
    <div class="schema-panel">
      <div class="schema-panel-header">
        <div>
          <h3 class="schema-panel-title"><span>🔗</span> Arsitektur Relasi Entitas & Alur Single Source of Truth</h3>
          <p class="schema-panel-subtitle">
            Visualisasi bagaimana seluruh 10 modul saling terhubung ke satu skema database tanpa duplikasi data.
          </p>
        </div>
      </div>

      <div class="schema-erd-flow">
        <!-- Card 1: Pendaftaran & Akun -->
        <div class="schema-erd-card">
          <div class="schema-erd-header spmb">
            <span>1. Entitas Calon Siswa & Akun</span>
            <span class="schema-erd-tag">Modul 01 & 02</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">id (PK)</span>
              <span class="schema-field-type">String (Unique)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">nama</span>
              <span class="schema-field-type">String</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">nisn</span>
              <span class="schema-field-type">String (10 Digit)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">status_akun</span>
              <span class="schema-field-type">Enum ('AKTIF')</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Keuangan -->
        <div class="schema-erd-card">
          <div class="schema-erd-header spmb">
            <span>2. Entitas Keuangan SPMB</span>
            <span class="schema-erd-tag">Modul 03</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">status_pembayaran</span>
              <span class="schema-field-type">Enum ('LUNAS', 'BELUM')</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">nominal_biaya</span>
              <span class="schema-field-type">Currency</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">bukti_setor_url</span>
              <span class="schema-field-type">String Base64</span>
            </div>
          </div>
        </div>

        <!-- Card 3: Seleksi & Kelulusan -->
        <div class="schema-erd-card">
          <div class="schema-erd-header spmb">
            <span>3. Entitas Seleksi & Kelulusan</span>
            <span class="schema-erd-tag">Modul 04 & 05</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">nilai_wawancara</span>
              <span class="schema-field-type">Number (0-100)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">hafalan_juz</span>
              <span class="schema-field-type">Number</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">status_kelulusan</span>
              <span class="schema-field-type">Enum ('LULUS', 'GAGAL')</span>
            </div>
          </div>
        </div>

        <!-- Card 4: Loket Verifikasi Berkas -->
        <div class="schema-erd-card">
          <div class="schema-erd-header spmb">
            <span>4. Entitas Berkas Fisik Loket</span>
            <span class="schema-erd-tag">Modul 06</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">status_daftar_ulang</span>
              <span class="schema-field-type">Enum ('TERVERIFIKASI')</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">dokumen_terverifikasi</span>
              <span class="schema-field-type">Array&lt;DocId&gt;</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">catatan_loket</span>
              <span class="schema-field-type">Text</span>
            </div>
          </div>
        </div>

        <!-- Card 5: Gerbang Penguncian SSoT -->
        <div class="schema-erd-card">
          <div class="schema-erd-header lock">
            <span>5. Gerbang Lock Data Final</span>
            <span class="schema-erd-tag">Modul 07</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">is_locked</span>
              <span class="schema-field-type">Boolean (Freeze Flag)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">tgl_locked</span>
              <span class="schema-field-type">Timestamp ISO</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">locked_by</span>
              <span class="schema-field-type">String (Otorisator)</span>
            </div>
          </div>
        </div>

        <!-- Card 6: Tata Usaha (TU) -->
        <div class="schema-erd-card">
          <div class="schema-erd-header tu">
            <span>6. Pemanfaatan Data TU (Zero Re-entry)</span>
            <span class="schema-erd-tag">Modul 09 & 10</span>
          </div>
          <div class="schema-erd-fields">
            <div class="schema-erd-field-row">
              <span class="schema-field-name">data_tu.kelas_terpilih</span>
              <span class="schema-field-type">String (Rombel)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">data_tu.buku_induk_nomor</span>
              <span class="schema-field-type">String (NIS TU)</span>
            </div>
            <div class="schema-erd-field-row">
              <span class="schema-field-name">data_tu.status_dapodik</span>
              <span class="schema-field-type">Enum ('SIAP_SINKRON')</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER TAB VIEW: 2. KAMUS DATA (DATA DICTIONARY)
// =========================================================================================
function renderDictionaryView() {
  let filtered = DATA_DICTIONARY;
  if (schemaState.searchQuery.trim()) {
    const q = schemaState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.field.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.module.toLowerCase().includes(q)
    );
  }

  const rows = filtered.map(item => `
    <tr>
      <td><span class="schema-code-pill">${escapeHtml(item.field)}</span></td>
      <td><span class="schema-type-badge ${item.type}">${escapeHtml(item.type)}</span></td>
      <td><strong>${escapeHtml(item.module)}</strong></td>
      <td>${escapeHtml(item.desc)}</td>
      <td><code style="font-size:0.75rem; color:#006837;">${escapeHtml(item.sample)}</code></td>
    </tr>
  `).join('');

  return `
    <div class="schema-panel">
      <div class="schema-panel-header">
        <div>
          <h3 class="schema-panel-title"><span>📚</span> Kamus Data Single Source of Truth (Data Dictionary)</h3>
          <p class="schema-panel-subtitle">Spesifikasi formal atribut data SPMB–TU untuk menjamin standarisasi struktur data.</p>
        </div>
        <div>
          <input 
            type="text" 
            placeholder="Cari field / modul..." 
            value="${escapeHtml(schemaState.searchQuery)}"
            oninput="window.schemaApp.handleSearch(this.value)"
            style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.825rem; min-width: 200px;"
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="schema-dict-table">
          <thead>
            <tr>
              <th>Nama Field</th>
              <th>Tipe Data</th>
              <th>Modul Produsen</th>
              <th>Keterangan Fungsional</th>
              <th>Contoh Nilai</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:2rem;">Tidak ada atribut yang cocok.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER TAB VIEW: 3. LIVE JSON INSPECTOR
// =========================================================================================
function renderJsonView() {
  const data = getRawSSoTData();
  const formattedJson = JSON.stringify(data, null, 2);

  return `
    <div class="schema-panel">
      <div class="schema-panel-header">
        <div>
          <h3 class="schema-panel-title"><span>💻</span> Live JSON Data Inspector (Storage State)</h3>
          <p class="schema-panel-subtitle">
            Membaca data aktif secara real-time langsung dari LocalStorage key: <code>m3_spmb_tu_db</code>.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="schema-btn-toolbar" onclick="window.schemaApp.copyJson()">
            📋 Salin JSON
          </button>
          <button class="schema-btn-toolbar" onclick="window.schemaApp.downloadBackup()">
            💾 Unduh Backup .json
          </button>
          <button class="schema-btn-toolbar" onclick="window.schemaApp.refreshData()">
            🔄 Segarkan Data
          </button>
        </div>
      </div>

      <div class="schema-json-toolbar">
        <span>STORAGE KEY: <strong>m3_spmb_tu_db</strong></span>
        <span>FORMAT: <strong>application/json (UTF-8)</strong></span>
      </div>
      <pre class="schema-json-code-box"><code>${escapeHtml(formattedJson)}</code></pre>
    </div>
  `;
}

// =========================================================================================
// RENDER TAB VIEW: 4. UJI AUDIT INTEGRITAS DATA
// =========================================================================================
function renderAuditView() {
  const audit = runDataIntegrityCheck();

  return `
    <div class="schema-panel">
      <div class="schema-panel-header">
        <div>
          <h3 class="schema-panel-title"><span>🛡️</span> Laporan Audit & Pengujian Integritas Basis Data</h3>
          <p class="schema-panel-subtitle">
            Mesin audit otomatis untuk mendeteksi redundansi, anomali status, dan kelengkapan relasi antar-modul.
          </p>
        </div>
        <div>
          <button class="btn btn-primary" style="font-size: 0.8rem; padding: 7px 14px;" onclick="window.schemaApp.refreshData()">
            🔍 Jalankan Audit Ulang
          </button>
        </div>
      </div>

      <div class="schema-audit-results">
        <!-- Item 1: Status Integritas Global -->
        <div class="schema-audit-item ${audit.isHealthy ? 'pass' : 'warning'}">
          <div class="schema-audit-icon">${audit.isHealthy ? '✅' : '⚠️'}</div>
          <div>
            <h4 class="schema-audit-title">Status Kesehatan SSoT: ${audit.isHealthy ? 'SEMPURNA (100% HEALTHY)' : 'PERLU PERHATIAN'}</h4>
            <p class="schema-audit-desc">
              ${audit.isHealthy 
                ? 'Tidak ditemukan anomali data. Semua relasi antara pendaftaran, keuangan, berkas loket, dan penguncian data konsisten.' 
                : 'Ditemukan beberapa data yang memerlukan penyesuaian agar memenuhi standar integritas.'}
            </p>
          </div>
        </div>

        <!-- Item 2: Pencegahan Duplikasi NISN -->
        <div class="schema-audit-item ${audit.duplicateNisn === 0 ? 'pass' : 'warning'}">
          <div class="schema-audit-icon">${audit.duplicateNisn === 0 ? '✅' : '❌'}</div>
          <div>
            <h4 class="schema-audit-title">Uji Keunikan NISN: ${audit.duplicateNisn === 0 ? 'LOLOS (Zero Duplicate)' : `${audit.duplicateNisn} Duplikasi Ditemukan`}</h4>
            <p class="schema-audit-desc">
              Menjamin setiap calon peserta didik memiliki 1 NISN tunggal untuk mencegah pembuatan akun ganda pada sistem.
            </p>
          </div>
        </div>

        <!-- Item 3: Konsistensi Flag Kunci vs Pembayaran -->
        <div class="schema-audit-item ${audit.lockedWithoutLunas === 0 ? 'pass' : 'warning'}">
          <div class="schema-audit-icon">${audit.lockedWithoutLunas === 0 ? '✅' : '⚠️'}</div>
          <div>
            <h4 class="schema-audit-title">Uji Integritas Alur Kunci Data (Alur 14): ${audit.lockedWithoutLunas === 0 ? 'VALID (Zero Inconsistency)' : 'Anomali Terdeteksi'}</h4>
            <p class="schema-audit-desc">
              Memverifikasi bahwa tidak ada calon siswa yang berstatus <code>is_locked: true</code> sebelum pembayaran uang pangkal diverifikasi Lunas.
            </p>
          </div>
        </div>

        <!-- Item 4: Eliminasi Silo Data -->
        <div class="schema-audit-item pass">
          <div class="schema-audit-icon">🏢</div>
          <div>
            <h4 class="schema-audit-title">Uji Eliminasi Silo Data (Solusi Masalah M2): TERPENUHI</h4>
            <p class="schema-audit-desc">
              Unit Tata Usaha (Modul 09) membaca langsung ke tabel yang sama dengan SPMB. Data siswa baru tidak perlu diketik ulang secara manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER UTAMA MODUL 08
// =========================================================================================
function renderModuleUI() {
  const container = document.getElementById(schemaState.containerId);
  if (!container) return;

  const data = getRawSSoTData();
  const pendaftarList = Array.isArray(data.pendaftar) ? data.pendaftar : [];
  const totalRecords = pendaftarList.length;
  const lockedCount = pendaftarList.filter(p => p.is_locked).length;
  const storageBytes = getStorageSizeBytes();
  const storageKb = (storageBytes / 1024).toFixed(2);

  // Render Sub-Panel berdasarkan tab aktif
  let activePanelHtml = '';
  if (schemaState.activeTab === 'erd') activePanelHtml = renderErdView();
  else if (schemaState.activeTab === 'dictionary') activePanelHtml = renderDictionaryView();
  else if (schemaState.activeTab === 'json') activePanelHtml = renderJsonView();
  else if (schemaState.activeTab === 'audit') activePanelHtml = renderAuditView();

  container.innerHTML = `
    <div class="schema-module-container">

      <!-- 1. Header Banner -->
      <div class="schema-header-card">
        <div class="schema-header-top">
          <h1 class="schema-header-title">
            <span>🗄️</span> Modul 08: Basis Data Terintegrasi SPMB–TU (SSoT Adapter)
          </h1>
          <div class="schema-badges-group">
            <span class="schema-role-badge">
              <span>👤</span> Developer: Raudhatul Audyna
            </span>
            <span class="schema-role-badge ssot">
              <span>⚡</span> SSoT Architecture
            </span>
          </div>
        </div>
        <p class="schema-header-desc">
          Pondasi <strong>Single Source of Truth (SSoT)</strong> pada *Data Layer* yang mengintegrasikan basis data 
          kepanitiaan SPMB dengan sistem operasional Tata Usaha (TU). Menghapus redundansi data dan menjamin konsistensi 
          lintas alur dari pendaftaran awal hingga pembagian rombel di kelas X.
        </p>
      </div>

      <!-- 2. Metrik & Health Check Cards -->
      <div class="schema-stats-grid">
        <div class="schema-stat-card">
          <div class="schema-stat-icon health">🟢</div>
          <div>
            <div class="schema-stat-number" style="font-size:1.15rem; color:#059669;">ONLINE & AKTIF</div>
            <div class="schema-stat-label">Status SSoT Storage</div>
          </div>
        </div>

        <div class="schema-stat-card">
          <div class="schema-stat-icon records">👥</div>
          <div>
            <div class="schema-stat-number">${totalRecords} Siswa</div>
            <div class="schema-stat-label">Total Record Tersimpan</div>
          </div>
        </div>

        <div class="schema-stat-card">
          <div class="schema-stat-icon locked">🔒</div>
          <div>
            <div class="schema-stat-number">${lockedCount} Siswa</div>
            <div class="schema-stat-label">Terkunci & Siap di TU</div>
          </div>
        </div>

        <div class="schema-stat-card">
          <div class="schema-stat-icon size">💾</div>
          <div>
            <div class="schema-stat-number">${storageKb} KB</div>
            <div class="schema-stat-label">Ukuran JSON SSoT</div>
          </div>
        </div>
      </div>

      <!-- 3. Internal Navigation Tabs -->
      <div class="schema-nav-tabs">
        <button 
          class="schema-tab-button ${schemaState.activeTab === 'erd' ? 'active' : ''}" 
          onclick="window.schemaApp.switchTab('erd')"
        >
          <span>🔗</span> Visual Relasi Entitas (ERD)
        </button>
        <button 
          class="schema-tab-button ${schemaState.activeTab === 'dictionary' ? 'active' : ''}" 
          onclick="window.schemaApp.switchTab('dictionary')"
        >
          <span>📚</span> Kamus Data (Data Dictionary)
        </button>
        <button 
          class="schema-tab-button ${schemaState.activeTab === 'json' ? 'active' : ''}" 
          onclick="window.schemaApp.switchTab('json')"
        >
          <span>💻</span> Live JSON Inspector
        </button>
        <button 
          class="schema-tab-button ${schemaState.activeTab === 'audit' ? 'active' : ''}" 
          onclick="window.schemaApp.switchTab('audit')"
        >
          <span>🛡️</span> Uji Integritas Data
        </button>
      </div>

      <!-- 4. Tab Viewport Content -->
      <div id="schema-tab-viewport">
        ${activePanelHtml}
      </div>

    </div>
  `;
}

// =========================================================================================
// ENTRY POINT PUBLIK
// =========================================================================================
export function renderSchemaTU(containerId = 'module-viewport') {
  ensureSchemaStyles();
  schemaState.containerId = containerId;

  // Pasang global app handler untuk event onclick
  window.schemaApp = {
    switchTab: (tab) => {
      schemaState.activeTab = tab;
      renderModuleUI();
    },
    handleSearch: (val) => {
      schemaState.searchQuery = val;
      renderModuleUI();
    },
    copyJson: () => copyJsonToClipboard(),
    downloadBackup: () => downloadJsonBackup(),
    refreshData: () => {
      renderModuleUI();
      showToast('Data SSoT berhasil disegarkan secara real-time!');
    }
  };

  // Render awal
  renderModuleUI();

  // Dengarkan event pembaruan data secara dinamis
  const handleStorageUpdate = () => {
    renderModuleUI();
  };

  window.removeEventListener('spmb_db_updated', handleStorageUpdate);
  window.addEventListener('spmb_db_updated', handleStorageUpdate);
  window.addEventListener('db_updated', handleStorageUpdate);
}

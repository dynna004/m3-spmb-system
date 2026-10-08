/**
 * Modul 04: Penilaian Wawancara & Pemetaan Jurusan
 * SPMB SMA Muhammadiyah 3 Yogyakarta
 * Terintegrasi Single Source of Truth (SSoT) via config/database.js
 */

import { db } from '../../config/database.js';

// State internal modul
const ROLE_KEY = 'spmb_wawancara_edit_mode';
let currentSearch = '';
let currentFilterStatus = 'ALL';
let activeCandidateId = null;
let activeContainerId = 'module-viewport';
let isEditMode = true;

try {
  const savedMode = localStorage.getItem(ROLE_KEY);
  if (savedMode !== null) {
    isEditMode = savedMode === 'true';
  }
} catch (e) {}

/**
 * Sync & Fetch Data Pendaftar dari SSoT database
 * Memastikan minimal ada data pendaftar berstatus LUNAS untuk pengujian.
 */
function getPendaftarSSoT() {
  let data = [];
  try {
    const raw = db.get();
    if (raw && Array.isArray(raw.pendaftar)) {
      data = raw.pendaftar;
    }
  } catch (e) {
    console.warn('Error reading from SSoT db:', e);
  }

  // Jika data di SSoT kosong atau belum ada yang lunas, tambahkan mock data lunas untuk kemudahan testing
  if (!data || data.length === 0) {
    data = [
      {
        id: "REG-2026-001",
        nama: "Ahmad Dahlan",
        nisn: "0051234567",
        asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta",
        pilihan_jurusan: "MIPA",
        status_akun: "AKTIF",
        status_pembayaran: "LUNAS",
        statusWawancara: "BELUM",
        created_at: "2026-03-01T08:00:00Z"
      },
      {
        id: "REG-2026-002",
        nama: "Siti Walidah",
        nisn: "0051234568",
        asal_sekolah: "SMP Negeri 5 Yogyakarta",
        pilihan_jurusan: "IPS",
        status_akun: "AKTIF",
        status_pembayaran: "LUNAS",
        statusWawancara: "SELESAI",
        nilai_wawancara: 88,
        dataWawancara: {
          nilai_siswa: 90,
          catatan_siswa: "Siswa sangat aktif, berminat di bidang Olimpiade Sains.",
          nilai_wali: 86,
          catatan_wali: "Orang tua sangat mendukung kegiatan ekstrakurikuler sekolah.",
          peminatan_bakat: ["Sains", "IT"],
          hafalan_juz: 3,
          rekomendasi_beasiswa: "Potongan SPP (Beasiswa Tahfidz Parsial)",
          rekomendasi_akhir: "LAYAK",
          tanggal_wawancara: "2026-10-06T10:00:00Z"
        },
        created_at: "2026-03-02T09:30:00Z"
      },
      {
        id: "REG-2026-003",
        nama: "Budi Santoso",
        nisn: "0051234569",
        asal_sekolah: "SMP Negeri 1 Sleman",
        pilihan_jurusan: "MIPA",
        status_akun: "AKTIF",
        status_pembayaran: "LUNAS",
        statusWawancara: "BELUM",
        created_at: "2026-03-03T11:15:00Z"
      },
      {
        id: "REG-2026-004",
        nama: "Fatimah Az-Zahra",
        nisn: "0051234570",
        asal_sekolah: "MTs Mu'allimat Yogyakarta",
        pilihan_jurusan: "MIPA",
        status_akun: "AKTIF",
        status_pembayaran: "LUNAS",
        statusWawancara: "SELESAI",
        nilai_wawancara: 96,
        dataWawancara: {
          nilai_siswa: 98,
          catatan_siswa: "Tahfidz 16 Juz, fasih berbahasa Arab dan Inggris.",
          nilai_wali: 94,
          catatan_wali: "Orang tua siap mendukung program internasional.",
          peminatan_bakat: ["Sains", "Bahasa", "IT"],
          hafalan_juz: 16,
          rekomendasi_beasiswa: "Bebas SPP (Beasiswa Tahfidz Full)",
          rekomendasi_akhir: "LAYAK",
          tanggal_wawancara: "2026-10-07T14:20:00Z"
        },
        created_at: "2026-03-04T13:00:00Z"
      },
      {
        id: "REG-2026-005",
        nama: "Rizky Ramadhan",
        nisn: "0051234571",
        asal_sekolah: "SMP Muhammadiyah 2 Depok",
        pilihan_jurusan: "IPS",
        status_akun: "AKTIF",
        status_pembayaran: "BELUM",
        statusWawancara: "BELUM",
        created_at: "2026-03-05T15:45:00Z"
      }
    ];

    try {
      const dbObj = db.get() || { pendaftar: [], pengaturan: {} };
      dbObj.pendaftar = data;
      db.save(dbObj);
    } catch (err) {
      console.error('Failed saving initial data:', err);
    }
  }

  return data;
}

/**
 * Menghitung rekomendasi beasiswa otomatis berdasarkan hafalan Qur'an (Juz)
 * Rules:
 * - >= 15 juz: Bebas SPP (Beasiswa Tahfidz Full)
 * - 1-14 juz: Potongan SPP (Beasiswa Tahfidz Parsial)
 * - < 1 juz: Reguler (Non-Beasiswa)
 */
export function calculateBeasiswaRecommendation(juz) {
  const count = parseFloat(juz) || 0;
  if (count >= 15) {
    return {
      code: 'BEBAS_SPP',
      label: 'Bebas SPP (Beasiswa Tahfidz Full)',
      badgeClass: 'badge-beasiswa-full',
      icon: '👑'
    };
  } else if (count >= 1) {
    return {
      code: 'POTONGAN_SPP',
      label: 'Potongan SPP (Beasiswa Tahfidz Parsial)',
      badgeClass: 'badge-beasiswa-parsial',
      icon: '🌟'
    };
  } else {
    return {
      code: 'REGULER',
      label: 'Reguler (Non-Beasiswa)',
      badgeClass: 'badge-beasiswa-reguler',
      icon: '📘'
    };
  }
}

/**
 * Filter data hanya untuk siswa yang status pembayarannya LUNAS
 */
function getLunasCandidates() {
  const allData = getPendaftarSSoT();
  const lunas = allData.filter(item => {
    const statusPay = (item.status_pembayaran || item.pembayaran?.status_pembayaran || item.status_bayar || '').toUpperCase();
    return statusPay === 'LUNAS' || statusPay === 'VERIFIED';
  });

  // Fallback testing: Jika belum ada yang lunas, tampilkan seluruh pendaftar yang tersedia
  if (lunas.length === 0 && allData.length > 0) {
    return allData;
  }
  return lunas;
}

/**
 * Render utama modul Wawancara ke dalam container ID
 */
export function renderWawancara(containerId) {
  activeContainerId = containerId;
  const container = document.getElementById(containerId);
  if (!container) return;

  const lunasCandidates = getLunasCandidates();

  // Hitung statistik
  const totalLunas = lunasCandidates.length;
  const sudahWawancara = lunasCandidates.filter(c => (c.statusWawancara || '').toUpperCase() === 'SELESAI').length;
  const belumWawancara = totalLunas - sudahWawancara;
  const layakCount = lunasCandidates.filter(c => c.dataWawancara?.rekomendasi_akhir === 'LAYAK').length;

  container.innerHTML = `
    <!-- Custom Style Injection untuk Modul 04 -->
    <style>
      .wawancara-header {
        background: linear-gradient(135deg, #00562c 0%, #008349 100%);
        color: white;
        padding: 1.5rem;
        border-radius: var(--radius);
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      }
      .wawancara-header h2 {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: 0.3rem;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .wawancara-header p {
        font-size: 0.88rem;
        opacity: 0.9;
      }
      
      .stats-grid-wawancara {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .stat-card-w {
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.1rem 1.25rem;
        box-shadow: var(--shadow-sm);
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .stat-icon-w {
        width: 46px;
        height: 46px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        flex-shrink: 0;
      }
      .stat-val-w {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1.2;
        color: var(--text-main);
      }
      .stat-lbl-w {
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .filter-bar {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      .search-box-w {
        position: relative;
        flex: 1;
        min-width: 240px;
      }
      .search-box-w input {
        width: 100%;
        padding: 9px 14px 9px 36px;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
      }
      .search-box-w input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.12);
      }
      .search-icon-w {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
      }

      .badge-status-selesai {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.75rem;
      }
      .badge-status-belum {
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fde68a;
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.75rem;
      }

      .badge-beasiswa-full {
        background: #f5f3ff;
        color: #6b21a8;
        border: 1px solid #e9d5ff;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .badge-beasiswa-parsial {
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .badge-beasiswa-reguler {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      /* Modal Styling */
      .modal-wawancara-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        overflow-y: auto;
      }
      .modal-wawancara-overlay.show {
        display: flex;
      }
      .modal-wawancara-content {
        background: #ffffff;
        width: 100%;
        max-width: 780px;
        height: auto;
        max-height: 90vh;
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin: auto;
        animation: slideUpModal 0.25s ease-out;
      }
      @keyframes slideUpModal {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #form-penilaian-wawancara {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        margin: 0;
      }
      .modal-wawancara-header {
        flex-shrink: 0;
        background: #006837;
        color: white;
        padding: 1.1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .modal-wawancara-header h3 {
        font-size: 1.1rem;
        font-weight: 700;
        margin: 0;
      }
      .modal-close-btn {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.4rem;
        cursor: pointer;
        line-height: 1;
        opacity: 0.8;
      }
      .modal-close-btn:hover { opacity: 1; }
      
      .modal-wawancara-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      .form-section-title {
        font-size: 0.92rem;
        font-weight: 700;
        color: #006837;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 6px;
        margin-top: 1.25rem;
        margin-bottom: 0.85rem;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .form-section-title:first-child {
        margin-top: 0;
      }

      .grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 640px) {
        .grid-2col { grid-template-columns: 1fr; }
      }

      .bakat-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 6px;
      }
      .bakat-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f8fafc;
        border: 1.5px solid #cbd5e1;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .bakat-label:has(input:checked) {
        background: #e0f2fe;
        border-color: #0284c7;
        color: #0369a1;
      }

      .beasiswa-preview-box {
        background: #f8fafc;
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        padding: 10px 14px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.88rem;
        font-weight: 600;
      }

      .toast-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #006837;
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 1000;
        display: none;
        animation: fadeInToast 0.3s ease;
      }
      @keyframes fadeInToast {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>

    <!-- Banner Modul -->
    <div class="wawancara-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
        <div style="flex: 1; min-width: 280px;">
          <h2>🗣️ Modul 04: Penilaian Wawancara & Pemetaan Jurusan</h2>
          <p>Sistem evaluasi wawancara calon siswa & wali, rekomendasi beasiswa tahfidz otomatis, dan penentuan kelaikan kelulusan SSoT SPMB SMA Muhammadiyah 3 Yogyakarta.</p>
        </div>

        <!-- Mode Hak Akses Selector -->
        <div style="background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255, 255, 255, 0.35); padding: 10px 14px; border-radius: 12px; backdrop-filter: blur(6px); min-width: 230px;">
          <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; opacity: 0.95; margin-bottom: 5px;">
            🔑 Mode Hak Akses Pengguna
          </div>
          <select id="wawancara-role-select" style="width: 100%; padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; border: none; background: #ffffff; color: #006837; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            <option value="EDITING" ${isEditMode ? 'selected' : ''}>✏️ Pewawancara (Mode Editor)</option>
            <option value="NON_EDITING" ${!isEditMode ? 'selected' : ''}>👁️ Viewer (Mode Non-Editing)</option>
          </select>
        </div>
      </div>

      ${!isEditMode ? `
        <div style="background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 10px; margin-top: 14px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          🔒 <strong>Mode Akses Terbatas (Non-Editing / Read-Only):</strong> Anda sedang melihat modul sebagai Viewer. Pengisian dan pengeditan nilai wawancara dinonaktifkan.
        </div>
      ` : ''}
    </div>

    <!-- Stat Cards Summary -->
    <div class="stats-grid-wawancara">
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #e0f2fe; color: #0284c7;">💳</div>
        <div>
          <div class="stat-val-w">${totalLunas}</div>
          <div class="stat-lbl-w">Total Peserta Lunas</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #fef3c7; color: #d97706;">⏳</div>
        <div>
          <div class="stat-val-w">${belumWawancara}</div>
          <div class="stat-lbl-w">Belum Diwawancara</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #dcfce7; color: #16a34a;">✅</div>
        <div>
          <div class="stat-val-w">${sudahWawancara}</div>
          <div class="stat-lbl-w">Sudah Diwawancara</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #f5f3ff; color: #7c3aed;">⭐</div>
        <div>
          <div class="stat-val-w">${layakCount}</div>
          <div class="stat-lbl-w">Rekomendasi Layak</div>
        </div>
      </div>
    </div>

    <!-- Main Table Container Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Daftar Peserta Wawancara (Lunas Pembayaran SPMB)</h3>
        <span class="badge badge-info">SSoT Integrated Data</span>
      </div>
      <div class="card-body">
        
        <!-- Filter Bar Controls -->
        <div class="filter-bar">
          <div class="search-box-w">
            <span class="search-icon-w">🔍</span>
            <input type="text" id="wawancara-search" placeholder="Cari nama, No. Daftar, atau asal sekolah..." value="${currentSearch}">
          </div>

          <div style="display: flex; gap: 8px;">
            <select id="wawancara-filter-status" class="form-control" style="width: auto;">
              <option value="ALL" ${currentFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status Wawancara</option>
              <option value="BELUM" ${currentFilterStatus === 'BELUM' ? 'selected' : ''}>⏳ Belum Wawancara</option>
              <option value="SELESAI" ${currentFilterStatus === 'SELESAI' ? 'selected' : ''}>✅ Sudah Wawancara</option>
            </select>
          </div>
        </div>

        <!-- Table Responsive -->
        <div class="table-responsive">
          <table class="table" id="table-wawancara">
            <thead>
              <tr>
                <th>No. Daftar</th>
                <th>Nama Peserta</th>
                <th>Asal Sekolah</th>
                <th>Jalur / Jurusan</th>
                <th>Status Wawancara</th>
                <th>Rata-rata Nilai</th>
                <th>Rekomendasi</th>
                <th style="text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody id="wawancara-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Penilaian Wawancara -->
    <div class="modal-wawancara-overlay" id="modal-wawancara">
      <div class="modal-wawancara-content">
        <div class="modal-wawancara-header">
          <h3 id="modal-title-text">📝 Form Penilaian Wawancara</h3>
          <button class="modal-close-btn" id="modal-wawancara-close">&times;</button>
        </div>
        
        <form id="form-penilaian-wawancara">
          <div class="modal-wawancara-body">

            <!-- Alert Banner jika Non-Editing -->
            <div id="modal-readonly-banner" style="display: ${isEditMode ? 'none' : 'flex'}; background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 10px; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 600; align-items: center; gap: 8px;">
              🔒 <strong>Mode Non-Editing (Read-Only):</strong> Anda sedang melihat data nilai wawancara. Form di bawah dinonaktifkan dari pengeditan.
            </div>
            
            <!-- Info Peserta Summary -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 1rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">NAMA PESERTA</div>
                <div style="font-weight: 700; font-size: 1rem; color: #006837;" id="modal-candidate-name">-</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">NO. PENDAFTARAN</div>
                <div style="font-weight: 700; font-size: 0.95rem;" id="modal-candidate-id">-</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">PILIHAN JURUSAN</div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #0284c7;" id="modal-candidate-jurusan">-</div>
              </div>
            </div>

            <!-- Section 1: Nilai Wawancara Siswa -->
            <div class="form-section-title">👤 1. Penilaian Wawancara Siswa</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-nilai-siswa">Nilai Wawancara Siswa (0-100) <span style="color:red">*</span></label>
                <input type="number" id="wawancara-nilai-siswa" class="form-control" min="0" max="100" placeholder="Contoh: 85" required>
              </div>
              <div class="form-group">
                <label for="wawancara-catatan-siswa">Catatan & Profil Siswa</label>
                <textarea id="wawancara-catatan-siswa" class="form-control" rows="2" placeholder="Catatan keaktifan, kepribadian, kepemimpinan..."></textarea>
              </div>
            </div>

            <!-- Section 2: Nilai Wawancara Orang Tua / Wali -->
            <div class="form-section-title">👨‍👩‍👧 2. Penilaian Wawancara Orang Tua / Wali</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-nilai-wali">Nilai Wawancara Wali (0-100) <span style="color:red">*</span></label>
                <input type="number" id="wawancara-nilai-wali" class="form-control" min="0" max="100" placeholder="Contoh: 88" required>
              </div>
              <div class="form-group">
                <label for="wawancara-catatan-wali">Catatan & Kesiapan Wali</label>
                <textarea id="wawancara-catatan-wali" class="form-control" rows="2" placeholder="Dukungan orang tua, komitmen tata tertib..."></textarea>
              </div>
            </div>

            <!-- Section 3: Peminatan / Bakat -->
            <div class="form-section-title">🎨 3. Pemetaan Peminatan & Bakat</div>
            <div class="form-group">
              <label>Pilih Peminatan & Bakat Siswa (Bisa lebih dari 1):</label>
              <div class="bakat-checkboxes">
                <label class="bakat-label"><input type="checkbox" name="bakat" value="Sains"> 🧪 Sains & Riset</label>
                <label class="bakat-label"><input type="checkbox" name="bakat" value="Bahasa"> 🗣️ Bahasa & Komunikasi</label>
                <label class="bakat-label"><input type="checkbox" name="bakat" value="Sosial"> 🤝 Sosial & Humaniora</label>
                <label class="bakat-label"><input type="checkbox" name="bakat" value="IT"> 💻 IT & Rekayasa</label>
                <label class="bakat-label"><input type="checkbox" name="bakat" value="Seni"> 🎨 Seni & Desain</label>
                <label class="bakat-label"><input type="checkbox" name="bakat" value="Olahraga"> ⚽ Olahraga</label>
              </div>
            </div>

            <!-- Section 4: Hafalan Qur'an & Beasiswa -->
            <div class="form-section-title">📖 4. Hafalan Qur'an & Rekomendasi Beasiswa Tahfidz</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-hafalan-juz">Jumlah Hafalan Qur'an (Juz)</label>
                <input type="number" id="wawancara-hafalan-juz" class="form-control" min="0" max="30" step="0.5" value="0" placeholder="0 - 30 Juz">
              </div>
              <div class="form-group">
                <label>Rekomendasi Beasiswa (Otomatis)</label>
                <div class="beasiswa-preview-box" id="beasiswa-preview-container">
                  <span id="beasiswa-preview-icon">📘</span>
                  <span id="beasiswa-preview-text">Reguler (Non-Beasiswa)</span>
                </div>
              </div>
            </div>

            <!-- Section 5: Rekomendasi Akhir Kelulusan -->
            <div class="form-section-title">🎯 5. Rekomendasi Akhir Kelulusan</div>
            <div class="form-group">
              <label for="wawancara-rekomendasi-akhir">Rekomendasi Wawancara untuk Modul Kelulusan <span style="color:red">*</span></label>
              <select id="wawancara-rekomendasi-akhir" class="form-control" required style="font-weight: 700; color: #006837;">
                <option value="LAYAK">✅ LAYAK (Sangat Direkomendasikan Diterima)</option>
                <option value="CADANGAN">⚠️ CADANGAN (Dipertimbangkan / Antrean Cadangan)</option>
                <option value="TIDAK_LAYAK">❌ TIDAK LAYAK (Tidak Direkomendasikan)</option>
              </select>
            </div>

          </div>

          <div class="modal-footer" style="position: sticky; bottom: 0; background: #ffffff; border-top: 2px solid #e2e8f0; padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 12px; z-index: 20; box-shadow: 0 -4px 12px rgba(0,0,0,0.05);">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal" style="background: #f1f5f9; color: #475569; padding: 10px 20px; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;">Tutup</button>
            <button type="submit" class="btn btn-primary" id="btn-save-wawancara-submit" style="display: ${isEditMode ? 'inline-flex' : 'none'}; background: #006837; color: #ffffff; padding: 10px 24px; font-weight: 700; font-size: 0.95rem; border-radius: 8px; border: none; box-shadow: 0 4px 12px rgba(0, 104, 55, 0.3); cursor: pointer; align-items: center; gap: 8px;">
              💾 Simpan Penilaian Wawancara
            </button>
            <span id="modal-readonly-badge" style="display: ${!isEditMode ? 'inline-flex' : 'none'}; background: #e2e8f0; color: #475569; padding: 8px 16px; font-weight: 700; border-radius: 8px; font-size: 0.85rem; align-items: center; gap: 6px;">
              🔒 Mode Lihat Saja (Read-Only)
            </span>
          </div>
        </form>
      </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast-notification" id="wawancara-toast"></div>
  `;

  // Attach Table & Search Event Listeners
  attachTableEventListeners();
  renderTableRows();
}

/**
 * Render ulang isi tabel berdasarkan filter dan kata kunci pencarian
 */
function renderTableRows() {
  const tbody = document.getElementById('wawancara-tbody');
  if (!tbody) return;

  const lunasCandidates = getLunasCandidates();

  // Apply filters
  const filtered = lunasCandidates.filter(item => {
    const searchLower = currentSearch.toLowerCase().trim();
    const matchSearch = !searchLower || 
      (item.nama || item.nama_lengkap || '').toLowerCase().includes(searchLower) ||
      (item.id || item.id_pendaftar || '').toLowerCase().includes(searchLower) ||
      (item.asal_sekolah || item.biodata?.asal_sekolah || '').toLowerCase().includes(searchLower);

    const statusWawancara = (item.statusWawancara || 'BELUM').toUpperCase();
    const matchStatus = currentFilterStatus === 'ALL' || statusWawancara === currentFilterStatus;

    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          🔍 Tidak ditemukan data peserta wawancara yang sesuai filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const candidateId = item.id || item.id_pendaftar || '-';
    const candidateName = item.nama || item.nama_lengkap || 'Tanpa Nama';
    const asalSekolah = item.asal_sekolah || item.biodata?.asal_sekolah || '-';
    const jurusan = item.pilihan_jurusan || item.biodata?.pilihan_jurusan || 'MIPA';
    const statusW = (item.statusWawancara || 'BELUM').toUpperCase();

    const isSelesai = statusW === 'SELESAI';
    const badgeStatus = isSelesai 
      ? `<span class="badge-status-selesai">✅ Sudah Wawancara</span>`
      : `<span class="badge-status-belum">⏳ Belum Wawancara</span>`;

    // Skor rata-rata
    const scoreVal = item.nilai_wawancara !== undefined && item.nilai_wawancara !== null 
      ? item.nilai_wawancara 
      : (item.dataWawancara ? Math.round(((parseFloat(item.dataWawancara.nilai_siswa)||0) + (parseFloat(item.dataWawancara.nilai_wali)||0))/2) : '-');

    // Rekomendasi beasiswa & kelulusan
    let recBadge = '-';
    if (isSelesai && item.dataWawancara) {
      const recAkhir = item.dataWawancara.rekomendasi_akhir || 'LAYAK';
      const beasiswaCode = item.dataWawancara.hafalan_juz ? calculateBeasiswaRecommendation(item.dataWawancara.hafalan_juz) : null;
      
      let colorTag = '#16a34a';
      if (recAkhir === 'CADANGAN') colorTag = '#d97706';
      if (recAkhir === 'TIDAK_LAYAK') colorTag = '#dc2626';

      recBadge = `
        <div style="font-weight: 700; color: ${colorTag}; font-size: 0.82rem;">${recAkhir}</div>
        ${beasiswaCode ? `<div style="margin-top:2px;"><span class="${beasiswaCode.badgeClass}">${beasiswaCode.icon} ${beasiswaCode.label.split(' ')[0]}</span></div>` : ''}
      `;
    }

    return `
      <tr>
        <td><strong style="color: #006837;">${candidateId}</strong></td>
        <td><strong>${candidateName}</strong></td>
        <td>${asalSekolah}</td>
        <td><span class="badge badge-info">${jurusan}</span></td>
        <td>${badgeStatus}</td>
        <td><strong style="font-size: 0.95rem;">${scoreVal}</strong></td>
        <td>${recBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary btn-input-nilai" data-id="${candidateId}" style="padding: 6px 14px; font-size: 0.8rem; background: ${!isEditMode ? '#eff6ff' : (isSelesai ? '#0284c7' : '#006837')}; color: ${!isEditMode ? '#1d4ed8' : '#ffffff'}; border: ${!isEditMode ? '1px solid #bfdbfe' : 'none'}; font-weight: 700;">
            ${!isEditMode ? '👁️ Lihat Detail' : (isSelesai ? '✏️ Edit Nilai' : '📝 Input Nilai')}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Re-bind click event buttons
  document.querySelectorAll('.btn-input-nilai').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalPenilaian(id);
    });
  });
}

/**
 * Attach Event Listeners untuk Filter dan Search Bar
 */
function attachTableEventListeners() {
  const searchInput = document.getElementById('wawancara-search');
  const filterStatus = document.getElementById('wawancara-filter-status');
  const modalCloseBtn = document.getElementById('modal-wawancara-close');
  const modalCancelBtn = document.getElementById('btn-cancel-modal');
  const hafalanInput = document.getElementById('wawancara-hafalan-juz');
  const formModal = document.getElementById('form-penilaian-wawancara');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderTableRows();
    });
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      currentFilterStatus = e.target.value;
      renderTableRows();
    });
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModalPenilaian);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModalPenilaian);

  const roleSelect = document.getElementById('wawancara-role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      isEditMode = e.target.value === 'EDITING';
      try {
        localStorage.setItem(ROLE_KEY, isEditMode ? 'true' : 'false');
      } catch (err) {}
      renderWawancara(activeContainerId);
      showToast(isEditMode ? '✏️ Beralih ke Mode Editor (Pewawancara)' : '👁️ Beralih ke Mode Non-Editing (Viewer)');
    });
  }

  const modalOverlay = document.getElementById('modal-wawancara');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModalPenilaian();
    });
  }

  // Dynamic Beasiswa calculation on input change
  if (hafalanInput) {
    hafalanInput.addEventListener('input', (e) => {
      updateBeasiswaPreview(e.target.value);
    });
  }

  if (formModal) {
    formModal.addEventListener('submit', handleSaveWawancara);
  }
}

/**
 * Update Tampilan Preview Rekomendasi Beasiswa pada Form Modal secara Realtime
 */
function updateBeasiswaPreview(juzVal) {
  const rec = calculateBeasiswaRecommendation(juzVal);
  const iconEl = document.getElementById('beasiswa-preview-icon');
  const textEl = document.getElementById('beasiswa-preview-text');
  
  if (iconEl && textEl) {
    iconEl.textContent = rec.icon;
    textEl.textContent = rec.label;
  }
}

/**
 * Buka Modal Penilaian & Populate Data jika sudah ada
 */
function openModalPenilaian(candidateId) {
  activeCandidateId = candidateId;
  const allCandidates = getPendaftarSSoT();
  const candidate = allCandidates.find(c => (c.id || c.id_pendaftar) === candidateId);

  if (!candidate) {
    showToast('Data pendaftar tidak ditemukan!', 'error');
    return;
  }

  // Set Modal Info Header
  document.getElementById('modal-candidate-name').textContent = candidate.nama || candidate.nama_lengkap || '-';
  document.getElementById('modal-candidate-id').textContent = candidate.id || candidate.id_pendaftar || '-';
  document.getElementById('modal-candidate-jurusan').textContent = candidate.pilihan_jurusan || candidate.biodata?.pilihan_jurusan || 'MIPA';
  
  const existingW = candidate.dataWawancara || {};

  // Populate fields
  document.getElementById('wawancara-nilai-siswa').value = existingW.nilai_siswa !== undefined ? existingW.nilai_siswa : '';
  document.getElementById('wawancara-catatan-siswa').value = existingW.catatan_siswa || '';
  document.getElementById('wawancara-nilai-wali').value = existingW.nilai_wali !== undefined ? existingW.nilai_wali : '';
  document.getElementById('wawancara-catatan-wali').value = existingW.catatan_wali || '';
  
  // Checkboxes bakat
  const bakatArray = existingW.peminatan_bakat || [];
  document.querySelectorAll('input[name="bakat"]').forEach(cb => {
    cb.checked = bakatArray.includes(cb.value);
  });

  // Hafalan Juz & Beasiswa
  const juz = existingW.hafalan_juz !== undefined ? existingW.hafalan_juz : 0;
  document.getElementById('wawancara-hafalan-juz').value = juz;
  updateBeasiswaPreview(juz);

  // Rekomendasi Akhir
  document.getElementById('wawancara-rekomendasi-akhir').value = existingW.rekomendasi_akhir || 'LAYAK';

  // Set Modal Title & Read-only State
  const titleEl = document.getElementById('modal-title-text');
  if (titleEl) {
    titleEl.textContent = isEditMode 
      ? (existingW.nilai_siswa !== undefined ? '✏️ Edit Penilaian Wawancara' : '📝 Form Penilaian Wawancara')
      : '👁️ Detail Penilaian Wawancara (Mode Lihat / Non-Editing)';
  }

  const readonlyBanner = document.getElementById('modal-readonly-banner');
  if (readonlyBanner) readonlyBanner.style.display = isEditMode ? 'none' : 'flex';

  const submitBtn = document.getElementById('btn-save-wawancara-submit');
  if (submitBtn) submitBtn.style.display = isEditMode ? 'inline-flex' : 'none';

  const readonlyBadge = document.getElementById('modal-readonly-badge');
  if (readonlyBadge) readonlyBadge.style.display = isEditMode ? 'none' : 'inline-flex';

  // Enable/Disable all form fields
  const formFields = document.querySelectorAll('#form-penilaian-wawancara input, #form-penilaian-wawancara textarea, #form-penilaian-wawancara select');
  formFields.forEach(el => {
    el.disabled = !isEditMode;
  });

  // Display modal
  const modalEl = document.getElementById('modal-wawancara');
  if (modalEl) modalEl.classList.add('show');
}

/**
 * Tutup Modal Penilaian
 */
function closeModalPenilaian() {
  const modalEl = document.getElementById('modal-wawancara');
  if (modalEl) modalEl.classList.remove('show');
  activeCandidateId = null;
}

/**
 * Submit & Save Data Penilaian ke Single Source of Truth (SSoT)
 */
function handleSaveWawancara(e) {
  e.preventDefault();
  if (!activeCandidateId) return;

  if (!isEditMode) {
    showToast('🔒 Mode Non-Editing: Anda tidak memiliki hak akses untuk menyimpan data.', 'error');
    return;
  }

  const nilaiSiswa = parseFloat(document.getElementById('wawancara-nilai-siswa').value) || 0;
  const catatanSiswa = document.getElementById('wawancara-catatan-siswa').value.trim();
  const nilaiWali = parseFloat(document.getElementById('wawancara-nilai-wali').value) || 0;
  const catatanWali = document.getElementById('wawancara-catatan-wali').value.trim();

  // Peminatan/bakat checked
  const bakatSelected = [];
  document.querySelectorAll('input[name="bakat"]:checked').forEach(cb => {
    bakatSelected.push(cb.value);
  });

  const hafalanJuz = parseFloat(document.getElementById('wawancara-hafalan-juz').value) || 0;
  const beasiswaObj = calculateBeasiswaRecommendation(hafalanJuz);
  const rekomendasiAkhir = document.getElementById('wawancara-rekomendasi-akhir').value;

  // Hitung nilai akhir wawancara (rata-rata nilai siswa dan wali)
  const avgNilaiWawancara = Math.round((nilaiSiswa + nilaiWali) / 2);

  // Update ke database terpusat
  const dbData = db.get() || { pendaftar: [] };
  const targetIndex = dbData.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === activeCandidateId);

  if (targetIndex !== -1) {
    dbData.pendaftar[targetIndex].statusWawancara = "SELESAI";
    dbData.pendaftar[targetIndex].status_wawancara = "SELESAI";
    dbData.pendaftar[targetIndex].nilai_wawancara = avgNilaiWawancara;
    dbData.pendaftar[targetIndex].dataWawancara = {
      nilai_siswa: nilaiSiswa,
      catatan_siswa: catatanSiswa,
      nilai_wali: nilaiWali,
      catatan_wali: catatanWali,
      peminatan_bakat: bakatSelected,
      hafalan_juz: hafalanJuz,
      rekomendasi_beasiswa: beasiswaObj.label,
      rekomendasi_beasiswa_code: beasiswaObj.code,
      rekomendasi_akhir: rekomendasiAkhir,
      tanggal_wawancara: new Date().toISOString()
    };

    // Save SSoT
    db.save(dbData);

    // Trigger Custom Event untuk komunikasi ke Modul 05 (Kelulusan)
    window.dispatchEvent(new CustomEvent('spmb_wawancara_updated', {
      detail: {
        id: activeCandidateId,
        nilai_wawancara: avgNilaiWawancara,
        rekomendasi_akhir: rekomendasiAkhir,
        rekomendasi_beasiswa: beasiswaObj.label
      }
    }));

    closeModalPenilaian();
    renderWawancara(activeContainerId); // Re-render modul view
    showToast(`✅ Penilaian wawancara ${activeCandidateId} berhasil disimpan ke SSoT!`);
  } else {
    showToast('Gagal memperbarui data di SSoT', 'error');
  }
}

/**
 * Pop-up Toast Notification
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('wawancara-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.style.background = type === 'error' ? '#dc2626' : '#006837';
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

/**
 * Modul 03: Keuangan SPMB & Uang Pangkal
 * SMA Muhammadiyah 3 Yogyakarta
 * Terintegrasi Single Source of Truth (SSoT) via config/database.js & spmb_pendaftar_db
 */

import { db } from '../../config/database.js';

const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';
const STORAGE_KEY_UANG_PANGKAL = 'spmb_uang_pangkal_db';

let allPendaftar = [];
let allUangPangkal = [];
let currentModalId = null;
let pendingTolakId = null;

// Helper formatters
function formatRupiah(angka) {
  if (!angka && angka !== 0) return '-';
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBadgeClass(status) {
  const map = { pending_verification: 'badge-pending', lunas: 'badge-lunas', ditolak: 'badge-ditolak', cicilan: 'badge-cicilan' };
  return map[status] || 'badge-belum';
}

function getStatusLabel(status) {
  const map = { pending_verification: '⏳ Menunggu Verifikasi', lunas: '✅ Lunas', ditolak: '🚫 Ditolak', cicilan: '🔄 Cicilan' };
  return map[status] || '— Belum Bayar';
}

// Synchronize Pendaftar Data between spmb_pendaftar_db and SSoT (m3_spmb_tu_db)
function fetchMergedPendaftar() {
  let listModule01 = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (raw) listModule01 = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading spmb_pendaftar_db:', e);
  }

  let listSSoT = [];
  try {
    const rawSSoT = db.get();
    if (rawSSoT && Array.isArray(rawSSoT.pendaftar)) {
      listSSoT = rawSSoT.pendaftar;
    }
  } catch (e) {
    console.error('Error reading m3_spmb_tu_db:', e);
  }

  // Merge listSSoT and listModule01
  const map = new Map();

  listSSoT.forEach(p => {
    const id = p.id || p.id_pendaftar;
    map.set(id, {
      id_pendaftar: id,
      nama_lengkap: p.nama || p.nama_lengkap || 'Tanpa Nama',
      email: p.email || '-',
      no_wa: p.no_wa || '-',
      nisn: p.nisn || '-',
      status_akun: p.status_akun || 'active',
      created_at: p.created_at || new Date().toISOString(),
      biodata: {
        asal_sekolah: p.asal_sekolah || p.biodata?.asal_sekolah || '-',
        pilihan_jurusan: p.pilihan_jurusan || p.biodata?.pilihan_jurusan || 'MIPA',
        nama_orang_tua: p.biodata?.nama_orang_tua || '-'
      },
      pembayaran: {
        file_bukti: p.pembayaran?.file_bukti || 'bukti_bayar.png',
        file_data_url: p.pembayaran?.file_data_url || null,
        status_pembayaran: (p.status_pembayaran || p.pembayaran?.status_pembayaran || 'pending_verification').toLowerCase(),
        validated_at: p.pembayaran?.validated_at || null,
        validated_by: p.pembayaran?.validated_by || null
      }
    });
  });

  listModule01.forEach(p => {
    const id = p.id_pendaftar || p.id;
    if (!map.has(id)) {
      map.set(id, p);
    } else {
      // update payment status if module 01 has payment details
      const existing = map.get(id);
      if (p.pembayaran) {
        existing.pembayaran = Object.assign({}, existing.pembayaran, p.pembayaran);
      }
      map.set(id, existing);
    }
  });

  // Fallback dummy if still empty
  if (map.size === 0) {
    const dummies = [
      {
        id_pendaftar: "REG-2026-001",
        nama_lengkap: "Ahmad Dahlan",
        email: "ahmad@email.com",
        no_wa: "081234567891",
        nisn: "0051234567",
        status_akun: "active",
        created_at: "2026-10-05T08:00:00Z",
        biodata: { asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Kiai Suja" },
        pembayaran: { file_bukti: "bukti_001.jpg", status_pembayaran: "lunas", validated_at: "2026-10-05T09:00:00Z", validated_by: "Bendahara" }
      },
      {
        id_pendaftar: "REG-2026-002",
        nama_lengkap: "Budi Santoso",
        email: "budi@email.com",
        no_wa: "081234567890",
        nisn: "1234567890",
        status_akun: "active",
        created_at: "2026-10-05T09:15:00Z",
        biodata: { asal_sekolah: "SMPN 1 Jakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Siti Aminah" },
        pembayaran: { file_bukti: "bukti_002.png", status_pembayaran: "pending_verification" }
      },
      {
        id_pendaftar: "REG-2026-003",
        nama_lengkap: "Citra Dewi",
        email: "citra@email.com",
        no_wa: "082345678901",
        nisn: "2345678901",
        status_akun: "active",
        created_at: "2026-10-05T10:30:00Z",
        biodata: { asal_sekolah: "SMPN 2 Yogyakarta", pilihan_jurusan: "IPS", nama_orang_tua: "Eko Prasetyo" },
        pembayaran: { file_bukti: "bukti_003.jpg", status_pembayaran: "lunas", validated_at: "2026-10-05T12:00:00Z", validated_by: "Bendahara" }
      },
      {
        id_pendaftar: "REG-2026-004",
        nama_lengkap: "Fatimah Az-Zahra",
        email: "fatimah@email.com",
        no_wa: "083456789012",
        nisn: "3456789012",
        status_akun: "active",
        created_at: "2026-10-06T11:00:00Z",
        biodata: { asal_sekolah: "MTs Mu'allimat Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "H. Abdullah" },
        pembayaran: { file_bukti: "bukti_004.png", status_pembayaran: "pending_verification" }
      }
    ];
    dummies.forEach(d => map.set(d.id_pendaftar, d));
  }

  const result = Array.from(map.values());
  saveMergedPendaftar(result);
  return result;
}

function saveMergedPendaftar(data) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(data));
  } catch (e) {}

  try {
    const dbObj = db.get() || { pendaftar: [], pengaturan: {} };
    data.forEach(item => {
      const idx = dbObj.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === item.id_pendaftar);
      const isLunas = item.pembayaran && item.pembayaran.status_pembayaran === 'lunas';
      if (idx !== -1) {
        dbObj.pendaftar[idx].status_pembayaran = isLunas ? "LUNAS" : (item.pembayaran?.status_pembayaran?.toUpperCase() || "BELUM");
        dbObj.pendaftar[idx].pembayaran = item.pembayaran;
      } else {
        dbObj.pendaftar.push({
          id: item.id_pendaftar,
          nama: item.nama_lengkap,
          nisn: item.nisn,
          asal_sekolah: item.biodata?.asal_sekolah || '-',
          pilihan_jurusan: item.biodata?.pilihan_jurusan || 'MIPA',
          status_akun: item.status_akun || 'AKTIF',
          status_pembayaran: isLunas ? "LUNAS" : "BELUM",
          pembayaran: item.pembayaran,
          created_at: item.created_at
        });
      }
    });
    db.save(dbObj);
  } catch (e) {}
}

function fetchUangPangkal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UANG_PANGKAL);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveUangPangkal(data) {
  localStorage.setItem(STORAGE_KEY_UANG_PANGKAL, JSON.stringify(data));
}

/**
 * Main Exported Render Function for Module 03 Keuangan SPMB
 */
export function renderKeuangan(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <!-- Styling khusus Modul Keuangan -->
    <style>
      .keuangan-wrapper {
        background: #ffffff;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
        padding: 1.5rem;
      }
      .keuangan-banner {
        background: linear-gradient(135deg, #003d20 0%, #006837 60%, #008349 100%);
        color: white;
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .keuangan-banner h2 {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
      }
      .keuangan-banner p {
        font-size: 0.85rem;
        opacity: 0.88;
        margin: 0;
      }

      .stats-grid-keuangan {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .stat-card-k {
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.1rem 1.25rem;
        box-shadow: var(--shadow-sm);
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .stat-icon-k {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        flex-shrink: 0;
      }
      .stat-val-k {
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1.1;
        color: var(--text-main);
      }
      .stat-lbl-k {
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .section-tabs-k {
        display: flex;
        gap: 8px;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
      }
      .tab-k-btn {
        padding: 9px 18px;
        border-radius: 8px;
        border: 1.5px solid var(--border);
        background: #f8fafc;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--text-muted);
        transition: all 0.2s;
      }
      .tab-k-btn:hover {
        border-color: #006837;
        color: #006837;
      }
      .tab-k-btn.active {
        background: #006837;
        color: white;
        border-color: #006837;
      }

      .panel-k-section {
        display: none;
      }
      .panel-k-section.active {
        display: block;
      }

      .toolbar-k {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      /* Modal Styling */
      .modal-k-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .modal-k-overlay.show {
        display: flex;
      }
      .modal-k-box {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-k-header {
        padding: 1.1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
      }
      .modal-k-title {
        font-weight: 700;
        color: #006837;
        font-size: 1.05rem;
      }
      .modal-k-body {
        padding: 1.5rem;
      }
      .modal-k-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        background: #f8fafc;
      }
    </style>

    <div class="keuangan-wrapper">
      <!-- Top Banner -->
      <div class="keuangan-banner">
        <div>
          <h2>💳 Modul Keuangan SPMB — Bendahara</h2>
          <p>Verifikasi pembayaran formulir pendaftaran & pencatatan pelunasan uang pangkal SSoT SMA Muhammadiyah 3 Yogyakarta.</p>
        </div>
        <button class="btn btn-secondary" id="btn-k-refresh" style="font-size: 0.8rem; padding: 6px 14px;">
          🔄 Refresh Data
        </button>
      </div>

      <!-- Alert Notification Area -->
      <div id="k-alert-area"></div>

      <!-- KPI Stats -->
      <div class="stats-grid-keuangan">
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #e0f2fe; color: #0284c7;">👥</div>
          <div>
            <div class="stat-val-k" id="k-stat-total">0</div>
            <div class="stat-lbl-k">Total Pendaftar</div>
          </div>
        </div>
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #fef3c7; color: #d97706;">⏳</div>
          <div>
            <div class="stat-val-k" id="k-stat-pending">0</div>
            <div class="stat-lbl-k">Menunggu Validasi</div>
          </div>
        </div>
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #dcfce7; color: #16a34a;">✅</div>
          <div>
            <div class="stat-val-k" id="k-stat-lunas">0</div>
            <div class="stat-lbl-k">Pembayaran Lunas</div>
          </div>
        </div>
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #f5f3ff; color: #7c3aed;">🏫</div>
          <div>
            <div class="stat-val-k" id="k-stat-up">0</div>
            <div class="stat-lbl-k">Uang Pangkal Lunas</div>
          </div>
        </div>
      </div>

      <!-- Section Navigation Tabs -->
      <div class="section-tabs-k">
        <button class="tab-k-btn active" id="tab-btn-verifikasi">📋 Verifikasi Pembayaran Formulir</button>
        <button class="tab-k-btn" id="tab-btn-uangpangkal">🏫 Uang Pangkal Sekolah</button>
        <button class="tab-k-btn" id="tab-btn-rekap">📊 Rekap Keuangan</button>
      </div>

      <!-- Panel 1: Verifikasi Pembayaran Formulir -->
      <div id="panel-k-verifikasi" class="panel-k-section active">
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <h3 class="card-title">📋 Data Pembayaran Formulir Pendaftaran</h3>
            <span class="badge badge-info">Single Source of Truth</span>
          </div>
          <div class="card-body">
            <div class="toolbar-k">
              <div class="search-box-w" style="flex: 1; min-width: 240px; position: relative;">
                <input type="text" id="k-search-formulir" class="form-control" placeholder="Cari nama, ID pendaftar, no WA...">
              </div>
              <select id="k-filter-formulir" class="form-control" style="width: auto;">
                <option value="">Semua Status Pembayaran</option>
                <option value="pending_verification">⏳ Menunggu Verifikasi</option>
                <option value="lunas">✅ Lunas</option>
                <option value="ditolak">🚫 Ditolak</option>
                <option value="belum_bayar">— Belum Bayar</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID Pendaftar</th>
                    <th>Nama Lengkap</th>
                    <th>No. WA</th>
                    <th>Jurusan</th>
                    <th>Tgl. Daftar</th>
                    <th>Status</th>
                    <th style="text-align: center;">Aksi</th>
                  </tr>
                </thead>
                <tbody id="k-tbody-formulir">
                  <!-- Rendered via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel 2: Uang Pangkal Sekolah -->
      <div id="panel-k-uangpangkal" class="panel-k-section">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">➕ Catat Pelunasan Uang Pangkal</h3>
            <button class="btn btn-secondary" id="btn-k-clear-up" style="font-size: 0.8rem;">🗑 Bersihkan Form</button>
          </div>
          <div class="card-body">
            <div id="k-form-up-alert"></div>
            <form id="form-k-uangpangkal" autocomplete="off">
              <div class="grid-2col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div class="form-group" style="position: relative;">
                  <label for="up-cari-input">Cari Siswa (ID / Nama) <span style="color:red">*</span></label>
                  <input type="text" id="up-cari-input" class="form-control" placeholder="Ketik ID atau nama pendaftar...">
                  <div id="up-auto-results" style="position: absolute; left: 0; right: 0; top: 100%; z-index: 100; background: white; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; max-height: 180px; overflow-y: auto;"></div>
                </div>
                <div class="form-group">
                  <label for="up-id-val">ID Pendaftar</label>
                  <input type="text" id="up-id-val" class="form-control" readonly placeholder="Auto-isi dari pencarian">
                </div>
                <div class="form-group">
                  <label for="up-nama-val">Nama Siswa</label>
                  <input type="text" id="up-nama-val" class="form-control" readonly placeholder="Auto-isi dari pencarian">
                </div>
              </div>

              <div class="grid-2col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div class="form-group">
                  <label for="up-jumlah-val">Jumlah Dibayar (Rp) <span style="color:red">*</span></label>
                  <input type="number" id="up-jumlah-val" class="form-control" placeholder="Contoh: 5000000" min="1">
                </div>
                <div class="form-group">
                  <label for="up-tgl-val">Tanggal Bayar <span style="color:red">*</span></label>
                  <input type="date" id="up-tgl-val" class="form-control">
                </div>
                <div class="form-group">
                  <label for="up-metode-val">Metode Pembayaran <span style="color:red">*</span></label>
                  <select id="up-metode-val" class="form-control">
                    <option value="">-- Pilih Metode --</option>
                    <option value="Transfer Bank BPD DIY">Transfer Bank BPD DIY Syariah</option>
                    <option value="Transfer Bank Muamalat">Transfer Bank Muamalat</option>
                    <option value="Cash / Tunai Loket">Cash / Tunai Loket Sekolah</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="up-status-val">Status Pembayaran</label>
                  <select id="up-status-val" class="form-control">
                    <option value="lunas">✅ Lunas</option>
                    <option value="cicilan">🔄 Cicilan / Angsuran</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label for="up-catatan-val">Catatan Tambahan</label>
                <input type="text" id="up-catatan-val" class="form-control" placeholder="Catatan angsuran ke-1, nomor resi, dll...">
              </div>

              <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" style="background: #006837; color: white;">💾 Simpan Pembayaran Uang Pangkal</button>
              </div>
            </form>

            <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border);">

            <h4 style="font-size: 0.95rem; font-weight: 700; color: #006837; margin-bottom: 0.75rem;">📋 Riwayat Pelunasan Uang Pangkal</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID Pendaftar</th>
                    <th>Nama Siswa</th>
                    <th>Jumlah Dibayar</th>
                    <th>Tgl Bayar</th>
                    <th>Metode</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th style="text-align: center;">Aksi</th>
                  </tr>
                </thead>
                <tbody id="k-tbody-uangpangkal">
                  <!-- Rendered via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel 3: Rekap Keuangan -->
      <div id="panel-k-rekap" class="panel-k-section">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Rekapitulasi Keuangan SPMB</h3>
            <button class="btn btn-primary" id="btn-k-export-csv" style="font-size: 0.8rem;">📥 Export CSV</button>
          </div>
          <div class="card-body">
            <div id="k-rekap-content"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Detail Pendaftar & Bukti Bayar -->
    <div class="modal-k-overlay" id="modal-k-detail">
      <div class="modal-k-box">
        <div class="modal-k-header">
          <div class="modal-k-title" id="modal-k-detail-title">Detail Pendaftar</div>
          <button class="modal-close-btn" id="btn-close-detail" style="color:#333;">&times;</button>
        </div>
        <div class="modal-k-body" id="modal-k-detail-body"></div>
        <div class="modal-k-footer">
          <button class="btn btn-secondary" id="btn-cancel-detail">Tutup</button>
          <button class="btn btn-primary" id="btn-validate-modal" style="background: #006837; color: white;">✅ Validasi Pembayaran</button>
        </div>
      </div>
    </div>

    <!-- Modal Tolak Pembayaran -->
    <div class="modal-k-overlay" id="modal-k-tolak">
      <div class="modal-k-box" style="max-width: 440px;">
        <div class="modal-k-header">
          <div class="modal-k-title" style="color: #dc2626;">⚠️ Konfirmasi Penolakan</div>
          <button class="modal-close-btn" id="btn-close-tolak" style="color:#333;">&times;</button>
        </div>
        <div class="modal-k-body">
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Apakah Anda yakin ingin menolak pembayaran pendaftar ini?
          </p>
          <div id="modal-k-tolak-info" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 700; color: #dc2626; font-size: 0.88rem;"></div>
          <div class="form-group" style="margin-top: 1rem;">
            <label for="alasan-k-tolak">Alasan Penolakan</label>
            <textarea id="alasan-k-tolak" class="form-control" rows="2" placeholder="Bukti tidak terbaca / nominal tidak sesuai..."></textarea>
          </div>
        </div>
        <div class="modal-k-footer">
          <button class="btn btn-secondary" id="btn-cancel-tolak">Batal</button>
          <button class="btn btn-primary" id="btn-confirm-tolak" style="background: #dc2626; color: white;">🚫 Ya, Tolak Pembayaran</button>
        </div>
      </div>
    </div>
  `;

  // Init Data & Render
  allPendaftar = fetchMergedPendaftar();
  allUangPangkal = fetchUangPangkal();

  // Set default date input to today
  const tglInput = document.getElementById('up-tgl-val');
  if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];

  updateKeuanganStats();
  renderFormulirTable();
  renderUangPangkalTable();
  renderRekapContent();
  attachKeuanganEvents();
}

function updateKeuanganStats() {
  const elTotal = document.getElementById('k-stat-total');
  const elPending = document.getElementById('k-stat-pending');
  const elLunas = document.getElementById('k-stat-lunas');
  const elUp = document.getElementById('k-stat-up');

  if (elTotal) elTotal.textContent = allPendaftar.length;
  if (elPending) elPending.textContent = allPendaftar.filter(p => p.pembayaran && p.pembayaran.status_pembayaran === 'pending_verification').length;
  if (elLunas) elLunas.textContent = allPendaftar.filter(p => p.pembayaran && p.pembayaran.status_pembayaran === 'lunas').length;
  if (elUp) elUp.textContent = allUangPangkal.filter(u => u.status === 'lunas').length;
}

function renderFormulirTable() {
  const tbody = document.getElementById('k-tbody-formulir');
  if (!tbody) return;

  const searchVal = (document.getElementById('k-search-formulir')?.value || '').toLowerCase().trim();
  const filterVal = document.getElementById('k-filter-formulir')?.value || '';

  const filtered = allPendaftar.filter(p => {
    const matchSearch = !searchVal || 
      (p.nama_lengkap || '').toLowerCase().includes(searchVal) ||
      (p.id_pendaftar || '').toLowerCase().includes(searchVal) ||
      (p.no_wa || '').includes(searchVal);

    const statusPay = p.pembayaran ? p.pembayaran.status_pembayaran : 'belum_bayar';
    const matchFilter = !filterVal || statusPay === filterVal;

    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          🔍 Tidak ada data pembayaran yang sesuai pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const status = p.pembayaran ? p.pembayaran.status_pembayaran : 'belum_bayar';
    const isLunas = status === 'lunas';
    const isDitolak = status === 'ditolak';
    const isBelum = !p.pembayaran || status === 'belum_bayar';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${p.id_pendaftar}</code></td>
        <td><strong>${p.nama_lengkap}</strong></td>
        <td>${p.no_wa || '-'}</td>
        <td><span class="badge badge-info">${p.biodata?.pilihan_jurusan || 'MIPA'}</span></td>
        <td>${formatDate(p.created_at)}</td>
        <td><span class="badge ${getBadgeClass(status)}">${getStatusLabel(status)}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-k-view" data-id="${p.id_pendaftar}" style="padding: 4px 8px; font-size: 0.78rem;">🔍 Detail</button>
            <button class="btn btn-primary btn-k-valid" data-id="${p.id_pendaftar}" ${isLunas || isBelum ? 'disabled style="opacity:0.5;"' : ''} style="padding: 4px 8px; font-size: 0.78rem; background:#006837; color:white;">✅ Validasi</button>
            <button class="btn btn-secondary btn-k-tolak" data-id="${p.id_pendaftar}" ${isDitolak || isBelum ? 'disabled style="opacity:0.5;"' : ''} style="padding: 4px 8px; font-size: 0.78rem; background:#fef2f2; color:#dc2626; border:1px solid #fecaca;">🚫 Tolak</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button click events
  document.querySelectorAll('.btn-k-view').forEach(b => b.addEventListener('click', (e) => openDetailModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-valid').forEach(b => b.addEventListener('click', (e) => validatePembayaran(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-tolak').forEach(b => b.addEventListener('click', (e) => openTolakModal(e.currentTarget.getAttribute('data-id'))));
}

function renderUangPangkalTable() {
  const tbody = document.getElementById('k-tbody-uangpangkal');
  if (!tbody) return;

  if (allUangPangkal.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          🏫 Belum ada catatan pelunasan uang pangkal. Gunakan form di atas untuk mencatat.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allUangPangkal.map((u, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><code>${u.id_pendaftar}</code></td>
      <td><strong>${u.nama}</strong></td>
      <td><strong style="color: #006837;">${formatRupiah(u.jumlah)}</strong></td>
      <td>${formatDate(u.tgl_bayar)}</td>
      <td>${u.metode || '-'}</td>
      <td><span class="badge ${u.status === 'lunas' ? 'badge-lunas' : 'badge-cicilan'}">${u.status === 'lunas' ? '✅ Lunas' : '🔄 Cicilan'}</span></td>
      <td>${u.catatan || '-'}</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-k-del-up" data-id="${u.id}" style="padding: 4px 8px; font-size: 0.78rem; color: #dc2626;">🗑 Hapus</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-k-del-up').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Hapus catatan uang pangkal ini?')) {
        allUangPangkal = allUangPangkal.filter(u => u.id !== id);
        saveUangPangkal(allUangPangkal);
        updateKeuanganStats();
        renderUangPangkalTable();
        renderRekapContent();
        showKeuanganAlert('🗑 Data uang pangkal berhasil dihapus', 'info');
      }
    });
  });
}

function renderRekapContent() {
  const el = document.getElementById('k-rekap-content');
  if (!el) return;

  const lunas = allPendaftar.filter(p => p.pembayaran && p.pembayaran.status_pembayaran === 'lunas');
  const pending = allPendaftar.filter(p => p.pembayaran && p.pembayaran.status_pembayaran === 'pending_verification');
  const ditolak = allPendaftar.filter(p => p.pembayaran && p.pembayaran.status_pembayaran === 'ditolak');
  const totalUP = allUangPangkal.reduce((acc, u) => acc + (parseFloat(u.jumlah) || 0), 0);

  el.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.25rem;">
        <h4 style="font-weight: 700; color: #006837; margin-bottom: 1rem;">📋 Rekap Pembayaran Formulir</h4>
        <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Total Pendaftar</td><td style="font-weight:700; text-align:right;">${allPendaftar.length} orang</td></tr>
          <tr><td style="padding:4px 0; color:#15803d;">✅ Lunas</td><td style="font-weight:700; color:#15803d; text-align:right;">${lunas.length} orang</td></tr>
          <tr><td style="padding:4px 0; color:#d97706;">⏳ Menunggu Verification</td><td style="font-weight:700; color:#d97706; text-align:right;">${pending.length} orang</td></tr>
          <tr><td style="padding:4px 0; color:#dc2626;">🚫 Ditolak</td><td style="font-weight:700; color:#dc2626; text-align:right;">${ditolak.length} orang</td></tr>
        </table>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.25rem;">
        <h4 style="font-weight: 700; color: #1d4ed8; margin-bottom: 1rem;">🏫 Rekap Uang Pangkal</h4>
        <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Total Transaksi</td><td style="font-weight:700; text-align:right;">${allUangPangkal.length} catatan</td></tr>
          <tr><td style="padding:4px 0; font-weight:700;">Total Terkumpul</td><td style="font-weight:800; color:#1d4ed8; text-align:right;">${formatRupiah(totalUP)}</td></tr>
        </table>
      </div>
    </div>
  `;
}

function validatePembayaran(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  if (confirm(`Validasi pembayaran formulir untuk ${p.nama_lengkap} (${id})?\nStatus pembayaran akan diubah menjadi LUNAS.`)) {
    p.pembayaran = Object.assign({}, p.pembayaran, {
      status_pembayaran: 'lunas',
      validated_at: new Date().toISOString(),
      validated_by: 'Bendahara SPMB'
    });

    saveMergedPendaftar(allPendaftar);
    updateKeuanganStats();
    renderFormulirTable();
    renderRekapContent();
    closeModalK('modal-k-detail');
    showKeuanganAlert(`✅ Pembayaran ${p.nama_lengkap} berhasil divalidasi (LUNAS)!`);
  }
}

function openDetailModal(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  currentModalId = id;
  const status = p.pembayaran ? p.pembayaran.status_pembayaran : 'belum_bayar';

  document.getElementById('modal-k-detail-title').textContent = `Detail Pembayaran — ${p.nama_lengkap}`;
  
  const bodyEl = document.getElementById('modal-k-detail-body');
  bodyEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 1rem; font-size: 0.88rem;">
      <div><strong>ID Pendaftar:</strong> <code>${p.id_pendaftar}</code></div>
      <div><strong>Nama:</strong> ${p.nama_lengkap}</div>
      <div><strong>No. WA:</strong> ${p.no_wa || '-'}</div>
      <div><strong>Jurusan:</strong> ${p.biodata?.pilihan_jurusan || 'MIPA'}</div>
    </div>
    <div style="margin-bottom: 1rem;">
      <strong>Status Pembayaran:</strong> 
      <span class="badge ${getBadgeClass(status)}">${getStatusLabel(status)}</span>
    </div>
    <div style="background: #f8fafc; border: 1.5px dashed var(--border); border-radius: 8px; padding: 1rem; text-align: center;">
      ${p.pembayaran?.file_data_url ? `<img src="${p.pembayaran.file_data_url}" style="max-width:100%; max-height:220px; border-radius:8px;">` : `<div style="color:var(--text-muted);">📄 Bukti Bayar: <strong>${p.pembayaran?.file_bukti || 'Belum diunggah'}</strong></div>`}
    </div>
  `;

  const btnValid = document.getElementById('btn-validate-modal');
  if (btnValid) {
    btnValid.disabled = (status === 'lunas' || status === 'belum_bayar');
    btnValid.onclick = () => validatePembayaran(id);
  }

  document.getElementById('modal-k-detail').classList.add('show');
}

function openTolakModal(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  pendingTolakId = id;
  document.getElementById('modal-k-tolak-info').textContent = `${p.nama_lengkap} (${p.id_pendaftar})`;
  document.getElementById('alasan-k-tolak').value = '';
  document.getElementById('modal-k-tolak').classList.add('show');
}

function closeModalK(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('show');
}

function attachKeuanganEvents() {
  // Tabs switching
  const tabVer = document.getElementById('tab-btn-verifikasi');
  const tabUp = document.getElementById('tab-btn-uangpangkal');
  const tabRek = document.getElementById('tab-btn-rekap');

  const panelVer = document.getElementById('panel-k-verifikasi');
  const panelUp = document.getElementById('panel-k-uangpangkal');
  const panelRek = document.getElementById('panel-k-rekap');

  function switchKTab(tab) {
    [tabVer, tabUp, tabRek].forEach(t => t?.classList.remove('active'));
    [panelVer, panelUp, panelRek].forEach(p => p?.classList.remove('active'));

    if (tab === 'verifikasi') { tabVer?.classList.add('active'); panelVer?.classList.add('active'); }
    if (tab === 'uangpangkal') { tabUp?.classList.add('active'); panelUp?.classList.add('active'); }
    if (tab === 'rekap') { tabRek?.classList.add('active'); panelRek?.classList.add('active'); renderRekapContent(); }
  }

  tabVer?.addEventListener('click', () => switchKTab('verifikasi'));
  tabUp?.addEventListener('click', () => switchKTab('uangpangkal'));
  tabRek?.addEventListener('click', () => switchKTab('rekap'));

  // Filters & Search
  document.getElementById('k-search-formulir')?.addEventListener('input', renderFormulirTable);
  document.getElementById('k-filter-formulir')?.addEventListener('change', renderFormulirTable);

  // Refresh data
  document.getElementById('btn-k-refresh')?.addEventListener('click', () => {
    allPendaftar = fetchMergedPendaftar();
    allUangPangkal = fetchUangPangkal();
    updateKeuanganStats();
    renderFormulirTable();
    renderUangPangkalTable();
    renderRekapContent();
    showKeuanganAlert('🔄 Data berhasil di-refresh dari SSoT!', 'info');
  });

  // Modal actions
  document.getElementById('btn-close-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));
  document.getElementById('btn-cancel-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));
  document.getElementById('btn-close-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));
  document.getElementById('btn-cancel-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));

  // Confirm Tolak
  document.getElementById('btn-confirm-tolak')?.addEventListener('click', () => {
    if (!pendingTolakId) return;
    const p = allPendaftar.find(x => x.id_pendaftar === pendingTolakId);
    if (p) {
      const alasan = document.getElementById('alasan-k-tolak').value.trim();
      p.pembayaran = Object.assign({}, p.pembayaran, {
        status_pembayaran: 'ditolak',
        rejected_at: new Date().toISOString(),
        alasan_penolakan: alasan || 'Bukti bayar tidak valid'
      });
      saveMergedPendaftar(allPendaftar);
      updateKeuanganStats();
      renderFormulirTable();
      renderRekapContent();
      closeModalK('modal-k-tolak');
      showKeuanganAlert(`🚫 Pembayaran ${p.nama_lengkap} telah ditolak.`, 'error');
    }
  });

  // Form Uang Pangkal Submit
  document.getElementById('form-k-uangpangkal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('up-id-val').value.trim();
    const nama = document.getElementById('up-nama-val').value.trim();
    const jumlah = document.getElementById('up-jumlah-val').value;
    const tgl = document.getElementById('up-tgl-val').value;
    const metode = document.getElementById('up-metode-val').value;
    const status = document.getElementById('up-status-val').value;
    const catatan = document.getElementById('up-catatan-val').value.trim();

    if (!id || !nama) {
      showKeuanganAlert('Pilih siswa melalui pencarian terlebih dahulu!', 'error');
      return;
    }
    if (!jumlah || parseFloat(jumlah) <= 0) {
      showKeuanganAlert('Masukkan nominal jumlah bayar yang valid!', 'error');
      return;
    }

    const newRecord = {
      id: 'UP-' + Date.now(),
      id_pendaftar: id,
      nama: nama,
      jumlah: parseFloat(jumlah),
      tgl_bayar: tgl,
      metode: metode,
      status: status,
      catatan: catatan
    };

    allUangPangkal.push(newRecord);
    saveUangPangkal(allUangPangkal);
    updateKeuanganStats();
    renderUangPangkalTable();
    renderRekapContent();

    // Reset Form
    document.getElementById('up-cari-input').value = '';
    document.getElementById('up-id-val').value = '';
    document.getElementById('up-nama-val').value = '';
    document.getElementById('up-jumlah-val').value = '';
    document.getElementById('up-catatan-val').value = '';

    showKeuanganAlert(`💾 Catatan uang pangkal ${nama} berhasil disimpan!`);
  });

  // Autocomplete Autosearch for Uang Pangkal Form
  const searchInput = document.getElementById('up-cari-input');
  const resultsDiv = document.getElementById('up-auto-results');

  if (searchInput && resultsDiv) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length < 2) {
        resultsDiv.style.display = 'none';
        return;
      }
      const matches = allPendaftar.filter(p => p.nama_lengkap.toLowerCase().includes(q) || p.id_pendaftar.toLowerCase().includes(q)).slice(0, 6);
      if (matches.length === 0) {
        resultsDiv.style.display = 'none';
        return;
      }
      resultsDiv.innerHTML = matches.map(m => `
        <div class="auto-item-k" data-id="${m.id_pendaftar}" data-nama="${m.nama_lengkap}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem;">
          <strong>${m.nama_lengkap}</strong> <span style="color:var(--text-muted); font-size:0.78rem;">(${m.id_pendaftar})</span>
        </div>
      `).join('');

      resultsDiv.style.display = 'block';

      document.querySelectorAll('.auto-item-k').forEach(item => {
        item.addEventListener('click', (ev) => {
          const selectedId = ev.currentTarget.getAttribute('data-id');
          const selectedNama = ev.currentTarget.getAttribute('data-nama');
          document.getElementById('up-id-val').value = selectedId;
          document.getElementById('up-nama-val').value = selectedNama;
          searchInput.value = selectedNama;
          resultsDiv.style.display = 'none';
        });
      });
    });

    document.addEventListener('click', (ev) => {
      if (!searchInput.contains(ev.target) && !resultsDiv.contains(ev.target)) {
        resultsDiv.style.display = 'none';
      }
    });
  }

  // Export CSV
  document.getElementById('btn-k-export-csv')?.addEventListener('click', () => {
    const rows = [['No', 'ID Pendaftar', 'Nama Lengkap', 'Status Pembayaran Formulir', 'Tgl Validasi', 'Jurusan']];
    allPendaftar.forEach((p, i) => {
      rows.push([
        i + 1,
        p.id_pendaftar,
        p.nama_lengkap,
        p.pembayaran?.status_pembayaran || 'belum_bayar',
        p.pembayaran?.validated_at ? formatDate(p.pembayaran.validated_at) : '-',
        p.biodata?.pilihan_jurusan || '-'
      ]);
    });
    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_keuangan_spmb_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showKeuanganAlert('📥 File CSV rekap keuangan berhasil diunduh!', 'info');
  });
}

function showKeuanganAlert(msg, type = 'success') {
  const area = document.getElementById('k-alert-area');
  if (!area) return;

  const bg = type === 'error' ? '#fef2f2' : (type === 'info' ? '#eff6ff' : '#f0fdf4');
  const border = type === 'error' ? '#fecaca' : (type === 'info' ? '#bfdbfe' : '#bbf7d0');
  const color = type === 'error' ? '#dc2626' : (type === 'info' ? '#1d4ed8' : '#15803d');

  area.innerHTML = `
    <div style="background: ${bg}; border: 1px solid ${border}; color: ${color}; padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 0.88rem; margin-bottom: 1rem; animation: slideIn 0.2s ease;">
      ${msg}
    </div>
  `;

  setTimeout(() => {
    area.innerHTML = '';
  }, 3500);
}

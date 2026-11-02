/**
 * Modul 03: Keuangan SPMB & Uang Pangkal
 * SMA Muhammadiyah 3 Yogyakarta
 * Terintegrasi Single Source of Truth (SSoT) via config/database.js & spmb_pendaftar_db
 *
 * ATURAN BISNIS VALIDASI:
 * 1. Otomatis Tervalidasi: Calon siswa yang sudah ada bukti bayar digital lolos administrasi -> 'lunas_otomatis'
 * 2. Belum Ada Bukti Bayar: Status tetap 'pending' (tidak otomatis tervalidasi)
 * 3. Hak Akses Admin Keuangan: Admin TETAP BISA memvalidasi manual (tombol ✅ Validasi aktif) untuk
 *    pendaftar yang bayar langsung secara offline / tunai di loket sekolah -> 'lunas_manual'
 * 4. Audit Log Persisten mencatat seluruh perubahan otomatis maupun manual loket
 */

import { db } from '../../config/database.js';

const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';
const STORAGE_KEY_UANG_PANGKAL = 'spmb_uang_pangkal_db';
const STORAGE_KEY_AUDIT_LOG = 'spmb_keuangan_audit_log';

let allPendaftar = [];
let allUangPangkal = [];
let currentModalId = null;
let pendingTolakId = null;
let currentEditId = null;

// ==========================================
// 1. HELPER FORMATTERS & BADGES
// ==========================================

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

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function normalizeStatus(status, paymentObj = null) {
  if (!status) return 'pending';
  const st = String(status).toLowerCase().trim();
  if (st === 'lunas') {
    if (paymentObj && paymentObj.validation_method === 'automatic_upload') {
      return 'lunas_otomatis';
    }
    return 'lunas_manual';
  }
  if (st === 'lunas_otomatis' || st === 'lunas_manual' || st === 'pending' || st === 'pending_verification' || st === 'menunggu_bukti' || st === 'belum_bayar' || st === 'ditolak') {
    return st;
  }
  return st;
}

function getBadgeClass(status) {
  const norm = normalizeStatus(status);
  const map = {
    lunas_otomatis: 'badge-lunas-auto',
    lunas_manual: 'badge-lunas',
    lunas: 'badge-lunas',
    pending: 'badge-pending',
    pending_verification: 'badge-pending',
    menunggu_bukti: 'badge-pending',
    belum_bayar: 'badge-pending',
    ditolak: 'badge-ditolak',
    cicilan: 'badge-cicilan'
  };
  return map[norm] || 'badge-pending';
}

function getStatusLabel(status, paymentObj = null) {
  const norm = normalizeStatus(status, paymentObj);
  const map = {
    lunas_otomatis: '⚡ Lunas — Validasi Otomatis',
    lunas_manual: '✅ Lunas — Validasi Manual (Loket)',
    lunas: '✅ Lunas',
    pending: '⏳ Pending',
    pending_verification: '⏳ Pending',
    menunggu_bukti: '⏳ Pending',
    belum_bayar: '⏳ Pending',
    ditolak: '🚫 Ditolak',
    cicilan: '🔄 Cicilan'
  };
  return map[norm] || '⏳ Pending';
}

// Cek ketersediaan bukti pembayaran aktual hasil unggahan digital
function hasRealProofUploaded(p) {
  if (!p) return false;
  const bayar = p.pembayaran || {};
  const berkasBayar = p.berkas?.bukti_bayar || {};

  const fileDataUrl = bayar.file_data_url || berkasBayar.data_url;
  const fileName = bayar.file_bukti || berkasBayar.nama_file;

  // 1. Ada data URL Base64 yang valid
  if (fileDataUrl && typeof fileDataUrl === 'string' && fileDataUrl.startsWith('data:')) {
    return true;
  }

  // 2. Ada nama file bukti spesifik (bukan placeholder kosong)
  if (fileName && typeof fileName === 'string') {
    const clean = fileName.trim().toLowerCase();
    const invalidPlaceholders = ['bukti_bayar.png', 'bukti_transfer.jpg', 'null', 'undefined', '', 'none'];
    if (!invalidPlaceholders.includes(clean) && (clean.startsWith('bukti_bayar_') || clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.pdf'))) {
      return true;
    }
  }

  return false;
}

// ==========================================
// 2. AUDIT LOG SYSTEM (PERSISTENT IN LOCALSTORAGE)
// ==========================================

function getAuditLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading audit log:', e);
  }
  return [];
}

function recordAuditLog(idPendaftar, statusLama, statusBaru, jenisPerubahan, aktor, alasan) {
  const logs = getAuditLogs();
  const entry = {
    id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    id_pendaftar: idPendaftar,
    status_lama: statusLama,
    status_baru: statusBaru,
    jenis_perubahan: jenisPerubahan, // 'otomatis' | 'manual'
    aktor: aktor || (jenisPerubahan === 'otomatis' ? 'Sistem Otomatis' : 'Admin Keuangan'),
    waktu: new Date().toISOString(),
    alasan: alasan || '-'
  };
  logs.unshift(entry); // Baris terbaru selalu di posisi paling atas
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving audit log:', e);
  }
  return entry;
}

function initDefaultAuditLogsIfEmpty() {
  const currentLogs = getAuditLogs();
  if (currentLogs.length === 0) {
    const initialSeedLogs = [
      {
        id: 'LOG-INIT-001',
        id_pendaftar: 'REG-2026-001',
        status_lama: 'pending',
        status_baru: 'lunas_otomatis',
        jenis_perubahan: 'otomatis',
        aktor: 'Sistem Otomatis',
        waktu: '2026-10-05T08:05:00Z',
        alasan: 'Validasi administrasi bukti bayar berhasil via unggahan berkas digital'
      },
      {
        id: 'LOG-INIT-002',
        id_pendaftar: 'REG-2026-003',
        status_lama: 'pending',
        status_baru: 'lunas_otomatis',
        jenis_perubahan: 'otomatis',
        aktor: 'Sistem Otomatis',
        waktu: '2026-10-05T10:35:00Z',
        alasan: 'Validasi administrasi bukti bayar berhasil via unggahan berkas digital'
      },
      {
        id: 'LOG-INIT-003',
        id_pendaftar: 'REG-2026-004',
        status_lama: 'pending',
        status_baru: 'ditolak',
        jenis_perubahan: 'manual',
        aktor: 'Admin Keuangan (Bendahara SPMB)',
        waktu: '2026-10-06T14:30:00Z',
        alasan: 'Bukti transfer buram dan nominal tidak sesuai tarif formulir'
      }
    ];
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(initialSeedLogs));
  }
}

// ==========================================
// 3. IDEMPOTENT AUTO-VALIDATION ENGINE
// ==========================================

/**
 * Aturan Bisnis SPMB:
 * 1. Yang ada bukti bayarnya -> otomatis tervalidasi (lunas_otomatis)
 * 2. Yang belum ada buktinya -> status pending (tidak otomatis tervalidasi)
 * 3. Keputusan manual Admin Keuangan (lunas_manual dari loket sekolah) TIDAK PERNAH ditimpa
 */
function processAutoValidation(pendaftarList) {
  let changed = false;

  pendaftarList.forEach(p => {
    const pay = p.pembayaran || {};
    const norm = normalizeStatus(pay.status_pembayaran, pay);
    const hasProof = hasRealProofUploaded(p);

    // KASUS 1: BELUM ADA BUKTI PEMBAYARAN
    if (!hasProof) {
      // Jika status SUDAH divalidasi manual oleh admin (misal siswa bayar di loket sekolah):
      if (norm === 'lunas_manual') {
        // PERTAHANKAN! Ini sah sebagai pembayaran loket sekolah
        return;
      }

      // Jika sebelumnya berstatus selain ditolak dan belum pending, pastikan statusnya 'pending'
      if (norm !== 'ditolak' && norm !== 'pending') {
        p.status_pembayaran = 'BELUM';
        p.pembayaran = Object.assign({}, p.pembayaran, {
          status_pembayaran: 'pending',
          file_bukti: null,
          file_data_url: null,
          validated_at: null,
          validated_by: null,
          validation_method: null,
          validation_type: null,
          catatan_validasi: null,
          idempotency_token: null,
          email_preview_ready: false
        });
        changed = true;
      }
      // Pendaftar tanpa bukti bayar tidak diproses validasi otomatis
      return;
    }

    // KASUS 2: BUKTI BAYAR DIGITAL TERSEDIA (hasProof === true)
    // Bentuk idempotency token unik berdasarkan ID pendaftar, nama file, dan upload date
    const uploadIdentifier = pay.file_bukti || p.berkas?.bukti_bayar?.nama_file || 'bukti';
    const uploadTime = pay.uploaded_at || p.berkas?.bukti_bayar?.uploaded_at || p.created_at || '';
    const currentToken = `${p.id_pendaftar}_${uploadIdentifier}_${uploadTime}`;

    // Lewati jika sudah divalidasi dengan token yang sama (idempotent skip)
    if (pay.idempotency_token === currentToken) {
      return;
    }

    // Jangan menimpa status yang sudah ditolak atau diverifikasi manual oleh admin bendahara
    if (norm === 'ditolak' || norm === 'lunas_manual') {
      return;
    }

    // Jika statusnya pending atau menunggu bukti, jalankan auto-validasi
    if (norm === 'pending' || norm === 'pending_verification' || norm === 'menunggu_bukti' || !pay.status_pembayaran) {
      const oldStatus = norm || 'pending';
      const newStatus = 'lunas_otomatis';

      p.pembayaran = Object.assign({}, p.pembayaran, {
        status_pembayaran: newStatus,
        validated_at: new Date().toISOString(),
        validated_by: 'Sistem Otomatis',
        validation_method: 'automatic_upload',
        validation_type: 'otomatis',
        catatan_validasi: 'Validasi administrasi bukti bayar berhasil via unggahan berkas digital',
        idempotency_token: currentToken,
        email_preview_ready: true
      });

      // Status pendaftar utama di SSoT menjadi LUNAS agar Modul 04 Wawancara langsung membaca
      p.status_pembayaran = 'LUNAS';

      // Catat ke Audit Log persisten (1x saja)
      recordAuditLog(
        p.id_pendaftar,
        oldStatus,
        newStatus,
        'otomatis',
        'Sistem Otomatis',
        'Unggahan bukti pembayaran digital lolos administrasi'
      );

      changed = true;
    }
  });

  return changed;
}

// ==========================================
// 4. DATA PERSISTENCE & SSoT INTEGRATION
// ==========================================

function fetchMergedPendaftar() {
  initDefaultAuditLogsIfEmpty();

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

  const map = new Map();

  listSSoT.forEach(p => {
    const id = p.id || p.id_pendaftar;
    const existingBayar = p.pembayaran || {};

    map.set(id, {
      id_pendaftar: id,
      nama_lengkap: p.nama || p.nama_lengkap || 'Tanpa Nama',
      email: p.email || (id.toLowerCase().replace(/[^a-z0-9]/g, '') + '@spmb-m3.sch.id'),
      no_wa: p.no_wa || p.kontak?.no_wa || '081234567890',
      nisn: p.nisn || '-',
      status_akun: p.status_akun || 'active',
      created_at: p.created_at || new Date().toISOString(),
      biodata: {
        asal_sekolah: p.asal_sekolah || p.biodata?.asal_sekolah || '-',
        pilihan_jurusan: p.pilihan_jurusan || p.biodata?.pilihan_jurusan || 'MIPA',
        nama_orang_tua: p.biodata?.nama_orang_tua || '-'
      },
      berkas: p.berkas || {},
      status_pembayaran: p.status_pembayaran || (existingBayar.status_pembayaran === 'lunas' || existingBayar.status_pembayaran === 'lunas_otomatis' || existingBayar.status_pembayaran === 'lunas_manual' ? 'LUNAS' : 'BELUM'),
      pembayaran: {
        file_bukti: existingBayar.file_bukti || null,
        file_data_url: existingBayar.file_data_url || null,
        status_pembayaran: existingBayar.status_pembayaran || 'pending',
        validated_at: existingBayar.validated_at || null,
        validated_by: existingBayar.validated_by || null,
        validation_method: existingBayar.validation_method || null,
        validation_type: existingBayar.validation_type || null,
        idempotency_token: existingBayar.idempotency_token || null,
        alasan_penolakan: existingBayar.alasan_penolakan || null,
        tgl_bayar: existingBayar.tgl_bayar || null,
        metode_pembayaran: existingBayar.metode_pembayaran || 'Transfer Bank BSI',
        no_referensi: existingBayar.no_referensi || null,
        catatan: existingBayar.catatan || null
      }
    });
  });

  listModule01.forEach(p => {
    const id = p.id_pendaftar || p.id;
    if (!map.has(id)) {
      map.set(id, p);
    } else {
      const existing = map.get(id);
      if (p.pembayaran) {
        existing.pembayaran = Object.assign({}, existing.pembayaran, p.pembayaran);
      }
      if (p.berkas) {
        existing.berkas = Object.assign({}, existing.berkas, p.berkas);
      }
      map.set(id, existing);
    }
  });

  // Data Demo Terstruktur sesuai spesifikasi Poin I jika data kosong
  if (map.size === 0) {
    const mockBase64Img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const dummies = [
      {
        id_pendaftar: "REG-2026-001",
        nama_lengkap: "Ahmad Dahlan",
        email: "ahmad.dahlan@spmb-m3.sch.id",
        no_wa: "081234567891",
        nisn: "0051234567",
        status_akun: "active",
        created_at: "2026-10-05T08:00:00Z",
        biodata: { asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Kiai Suja" },
        status_pembayaran: "LUNAS",
        pembayaran: {
          file_bukti: "Bukti_Bayar_0051234567.png",
          file_data_url: mockBase64Img,
          status_pembayaran: "lunas_otomatis",
          validated_at: "2026-10-05T08:05:00Z",
          validated_by: "Sistem Otomatis",
          validation_method: "automatic_upload",
          validation_type: "otomatis",
          catatan_validasi: "Validasi administrasi bukti bayar berhasil via unggahan berkas digital",
          idempotency_token: "REG-2026-001_Bukti_Bayar_0051234567.png_2026-10-05T08:00:00Z",
          metode_pembayaran: "Transfer Bank BSI",
          no_referensi: "TRX-BSI-992101",
          email_preview_ready: true
        }
      },
      {
        id_pendaftar: "REG-2026-002",
        nama_lengkap: "Budi Santoso",
        email: "budi.santoso@spmb-m3.sch.id",
        no_wa: "081234567890",
        nisn: "1234567890",
        status_akun: "active",
        created_at: "2026-10-05T09:15:00Z",
        biodata: { asal_sekolah: "SMPN 1 Jakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Siti Aminah" },
        status_pembayaran: "BELUM",
        pembayaran: {
          file_bukti: null,
          file_data_url: null,
          status_pembayaran: "pending",
          metode_pembayaran: "Transfer Bank BSI"
        }
      },
      {
        id_pendaftar: "REG-2026-003",
        nama_lengkap: "Siti Nurhaliza",
        email: "siti.nurhaliza@spmb-m3.sch.id",
        no_wa: "082345678901",
        nisn: "2345678901",
        status_akun: "active",
        created_at: "2026-10-05T10:30:00Z",
        biodata: { asal_sekolah: "SMPN 2 Yogyakarta", pilihan_jurusan: "IPS", nama_orang_tua: "Eko Prasetyo" },
        status_pembayaran: "LUNAS",
        pembayaran: {
          file_bukti: "Bukti_Bayar_2345678901.jpg",
          file_data_url: mockBase64Img,
          status_pembayaran: "lunas_otomatis",
          validated_at: "2026-10-05T10:35:00Z",
          validated_by: "Sistem Otomatis",
          validation_method: "automatic_upload",
          validation_type: "otomatis",
          catatan_validasi: "Validasi administrasi bukti bayar berhasil via unggahan berkas digital",
          idempotency_token: "REG-2026-003_Bukti_Bayar_2345678901.jpg_2026-10-05T10:30:00Z",
          metode_pembayaran: "Transfer Bank Muamalat",
          no_referensi: "TRX-MUAMALAT-44812",
          email_preview_ready: true
        }
      },
      {
        id_pendaftar: "REG-2026-004",
        nama_lengkap: "Rizky Ramadhan",
        email: "rizky.ramadhan@spmb-m3.sch.id",
        no_wa: "083456789012",
        nisn: "3456789012",
        status_akun: "active",
        created_at: "2026-10-06T11:00:00Z",
        biodata: { asal_sekolah: "MTs Muallimin Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "H. Abdullah" },
        status_pembayaran: "DITOLAK",
        pembayaran: {
          file_bukti: "Bukti_Bayar_3456789012.png",
          file_data_url: mockBase64Img,
          status_pembayaran: "ditolak",
          rejected_at: "2026-10-06T14:30:00Z",
          alasan_penolakan: "Bukti transfer buram dan nominal tidak sesuai tarif formulir"
        }
      },
      {
        id_pendaftar: "REG-2026-005",
        nama_lengkap: "Annisa Maharani",
        email: "annisa.maharani@spmb-m3.sch.id",
        no_wa: "084567890123",
        nisn: "4567890123",
        status_akun: "active",
        created_at: "2026-10-07T08:20:00Z",
        biodata: { asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta", pilihan_jurusan: "IPS", nama_orang_tua: "Ir. Hendra" },
        status_pembayaran: "BELUM",
        pembayaran: {
          file_bukti: null,
          file_data_url: null,
          status_pembayaran: "pending"
        }
      }
    ];
    dummies.forEach(d => map.set(d.id_pendaftar, d));
  }

  const result = Array.from(map.values());

  // Jalankan pemrosesan validasi otomatis (idempoten)
  processAutoValidation(result);

  // Simpan hasil sinkronisasi
  saveMergedPendaftar(result);

  return result;
}

function saveMergedPendaftar(data) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to spmb_pendaftar_db:', e);
  }

  try {
    const dbObj = db.get() || { pendaftar: [], pengaturan: {} };
    data.forEach(item => {
      const idx = dbObj.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === item.id_pendaftar);
      const payStatus = item.pembayaran ? item.pembayaran.status_pembayaran : 'pending';
      const isLunas = payStatus === 'lunas' || payStatus === 'lunas_otomatis' || payStatus === 'lunas_manual';

      if (idx !== -1) {
        dbObj.pendaftar[idx].status_pembayaran = isLunas ? "LUNAS" : (payStatus ? payStatus.toUpperCase() : "BELUM");
        dbObj.pendaftar[idx].pembayaran = item.pembayaran;
        if (item.berkas) dbObj.pendaftar[idx].berkas = item.berkas;
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
          berkas: item.berkas || {},
          created_at: item.created_at
        });
      }
    });
    db.save(dbObj);
  } catch (e) {
    console.error('Error saving to SSoT db:', e);
  }
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

// ==========================================
// 5. MAIN RENDER FUNCTION FOR MODULE 03
// ==========================================

export function renderKeuangan(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <!-- Styling khusus Modul Keuangan (Anthropic + ProMax UI/UX Standards) -->
    <style>
      .keuangan-wrapper {
        background: #ffffff;
        border-radius: var(--radius, 16px);
        border: 1px solid var(--border, #e2e8f0);
        box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
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
        box-shadow: 0 4px 14px rgba(0, 104, 55, 0.2);
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
        border: 1px solid var(--border, #e2e8f0);
        border-radius: 12px;
        padding: 1.1rem 1.25rem;
        box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
        display: flex;
        align-items: center;
        gap: 14px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .stat-card-k:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
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
        color: var(--text-main, #0f172a);
      }
      .stat-lbl-k {
        font-size: 0.78rem;
        color: var(--text-muted, #64748b);
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
        border: 1.5px solid var(--border, #cbd5e1);
        background: #f8fafc;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--text-muted, #475569);
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
        box-shadow: 0 2px 8px rgba(0, 104, 55, 0.25);
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

      /* Badges */
      .badge-lunas-auto {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid #a7f3d0;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge-lunas {
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge-pending {
        background: #fefce8;
        color: #ca8a04;
        border: 1px solid #fef08a;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .badge-belum {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 600;
      }
      .badge-ditolak {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .badge-cicilan {
        background: #f5f3ff;
        color: #7c3aed;
        border: 1px solid #ddd6fe;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
      }

      /* Modal Styling */
      .modal-k-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 9999;
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
        box-shadow: 0 20px 35px rgba(0,0,0,0.25);
        width: 100%;
        max-width: 680px;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid var(--border, #e2e8f0);
        animation: modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes modalScaleUp {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .modal-k-header {
        padding: 1.1rem 1.5rem;
        border-bottom: 1px solid var(--border, #e2e8f0);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
      }
      .modal-k-title {
        font-weight: 700;
        color: #006837;
        font-size: 1.05rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .modal-k-body {
        padding: 1.5rem;
      }
      .modal-k-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border, #e2e8f0);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        background: #f8fafc;
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
      }
      .modal-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: #64748b;
        padding: 4px;
        border-radius: 6px;
        transition: color 0.15s;
      }
      .modal-close-btn:hover {
        color: #0f172a;
      }

      /* Notice boxes */
      .notice-admin {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 0.85rem;
        color: #1e40af;
        margin-bottom: 1rem;
        line-height: 1.5;
      }
      .notice-admin strong {
        color: #1d4ed8;
      }

      /* Email simulation preview card */
      .email-paper {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .email-paper-header {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 12px 16px;
        font-size: 0.84rem;
      }
      .email-paper-row {
        display: flex;
        margin-bottom: 4px;
      }
      .email-paper-row strong {
        width: 80px;
        color: #64748b;
      }
      .email-paper-body {
        padding: 1.5rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        line-height: 1.6;
        font-size: 0.92rem;
      }
    </style>

    <div class="keuangan-wrapper">
      <!-- Top Banner -->
      <div class="keuangan-banner">
        <div>
          <h2>💳 Modul Keuangan SPMB — Bendahara</h2>
          <p>Verifikasi pembayaran formulir otomatis & manual, audit log persisten, serta pencatatan pelunasan uang pangkal SSoT SMA Muhammadiyah 3 Yogyakarta.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-k-export-csv" style="font-size: 0.8rem; padding: 6px 14px; background: rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.4);">
            📥 Export CSV
          </button>
          <button class="btn btn-secondary" id="btn-k-refresh" style="font-size: 0.8rem; padding: 6px 14px; background: white; color: #006837; font-weight: 700;">
            🔄 Refresh Data
          </button>
        </div>
      </div>

      <!-- Alert Notification Area -->
      <div id="k-alert-area"></div>

      <!-- KPI Stats Grid -->
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
            <div class="stat-lbl-k">Status Pending</div>
          </div>
        </div>
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #ecfdf5; color: #059669;">⚡</div>
          <div>
            <div class="stat-val-k" id="k-stat-auto">0</div>
            <div class="stat-lbl-k">Lunas (Validasi Otomatis)</div>
          </div>
        </div>
        <div class="stat-card-k">
          <div class="stat-icon-k" style="background: #dcfce7; color: #16a34a;">✅</div>
          <div>
            <div class="stat-val-k" id="k-stat-lunas">0</div>
            <div class="stat-lbl-k">Total Pembayaran Lunas</div>
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
        <button class="tab-k-btn" id="tab-btn-audit">📜 Riwayat Audit Log</button>
      </div>

      <!-- Panel 1: Verifikasi Pembayaran Formulir -->
      <div id="panel-k-verifikasi" class="panel-k-section active">
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 class="card-title" style="margin:0;">📋 Data Pembayaran Formulir Pendaftaran (Rp 200.000)</h3>
              <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--text-muted, #64748b);">
                Siswa yang ada bukti bayar otomatis tervalidasi. Siswa tanpa bukti berstatus Pending, dan dapat disahkan manual oleh Admin jika bayar di loket sekolah.
              </p>
            </div>
            <span class="badge badge-info" style="font-size:0.75rem;">SSoT Terhubung &bull; Modul 01 & 04</span>
          </div>
          <div class="card-body">
            <!-- Banner Petunjuk Validasi Otomatis & Notifikasi Email -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 1.25rem; box-shadow: 0 2px 6px rgba(0,104,55,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div style="flex: 1; min-width: 280px;">
                  <div style="font-weight: 800; color: #006837; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    <span>⚡</span>
                    <span>Alur Validasi Otomatis, Contoh Email Wawancara, & Bantuan Admin Keuangan</span>
                  </div>
                  <ul style="margin: 6px 0 0 1.2rem; padding: 0; font-size: 0.82rem; color: #334155; line-height: 1.55;">
                    <li><strong>Validasi Otomatis:</strong> Calon siswa yang <strong>sudah mengirim bukti pembayaran</strong> otomatis tervalidasi (<code>⚡ Lunas — Validasi Otomatis</code>) dan berhak lanjut wawancara.</li>
                    <li><strong>Status Pending:</strong> Calon siswa yang <strong>belum mengirim bukti pembayaran</strong> berstatus <strong><code>⏳ Pending</code></strong>.</li>
                    <li><strong>Notifikasi Email Resmi:</strong> Calon siswa yang lunas menerima notifikasi email resmi untuk lanjut ke Tahap Wawancara menggunakan <strong>akun yang didaftarkan tadi</strong>. Klik tombol <strong style="color:#1d4ed8;">📧 Contoh Email</strong> pada baris siswa untuk melihat contoh tampilannya.</li>
                    <li><strong>Kendala Belum Dapat Email:</strong> Jika pembayaran telah berhasil tetapi siswa belum menerima notifikasi email atau belum bisa lanjut wawancara, calon siswa dapat <strong>menghubungi Admin Keuangan</strong>.</li>
                    <li><strong>Kewenangan Admin Keuangan:</strong> Admin Keuangan tetap memiliki wewenang penuh untuk melakukan <strong style="color:#006837;">✅ Validasi Manual</strong> (misal siswa membayar tunai di loket sekolah) serta <strong style="color:#1d4ed8;">✏️ Edit Data</strong> pembayaran secara manual.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="toolbar-k">
              <div class="search-box-w" style="flex: 1; min-width: 240px; position: relative;">
                <input type="text" id="k-search-formulir" class="form-control" placeholder="Cari nama, ID pendaftar, no WA...">
              </div>
              <select id="k-filter-formulir" class="form-control" style="width: auto; min-width: 220px;">
                <option value="">Semua Status Pembayaran</option>
                <option value="lunas_otomatis">⚡ Lunas — Validasi Otomatis</option>
                <option value="lunas_manual">✅ Lunas — Validasi Manual (Loket)</option>
                <option value="pending">⏳ Pending</option>
                <option value="ditolak">🚫 Ditolak</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table" style="width: 100%;">
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>ID Pendaftar</th>
                    <th>Nama Lengkap</th>
                    <th>No. WA</th>
                    <th>Jurusan</th>
                    <th>Bukti Upload</th>
                    <th>Status Pembayaran</th>
                    <th style="text-align: center; min-width: 280px;">Aksi Admin</th>
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
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 class="card-title">➕ Catat Pelunasan Uang Pangkal (Daftar Ulang)</h3>
            <button class="btn btn-secondary" id="btn-k-clear-up" style="font-size: 0.8rem;">🗑 Bersihkan Form</button>
          </div>
          <div class="card-body">
            <div id="k-form-up-alert"></div>
            <form id="form-k-uangpangkal" autocomplete="off">
              <div class="grid-2col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div class="form-group" style="position: relative;">
                  <label for="up-cari-input">Cari Siswa Lolos (ID / Nama) <span style="color:red">*</span></label>
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
                  <label for="up-tgl-val">Tanggal Bayar <span style="color:red">*</span></label>
                  <input type="date" id="up-tgl-val" class="form-control">
                </div>
                <div class="form-group">
                  <label for="up-metode-val">Metode Pembayaran <span style="color:red">*</span></label>
                  <select id="up-metode-val" class="form-control">
                    <option value="">-- Pilih Metode --</option>
                    <option value="Transfer Bank BPD DIY Syariah">Transfer Bank BPD DIY Syariah</option>
                    <option value="Transfer Bank BSI">Transfer Bank Syariah Indonesia (BSI)</option>
                    <option value="Transfer Bank Muamalat">Transfer Bank Muamalat</option>
                    <option value="Cash / Tunai Loket">Cash / Tunai Loket Sekolah</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="up-status-val">Status Pembayaran</label>
                  <select id="up-status-val" class="form-control">
                    <option value="lunas">✅ Lunas Penuh</option>
                    <option value="cicilan">🔄 Cicilan / Angsuran</option>
                  </select>
                </div>
              </div>

              <!-- Rincian Pos Biaya Daftar Ulang -->
              <div style="background: linear-gradient(135deg,#f0fdf4 0%,#eff6ff 100%); border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 1.25rem 1.5rem; margin-top: 1.25rem;">
                <div style="font-size:0.88rem;font-weight:700;color:#006837;margin-bottom:1rem; padding-bottom:0.6rem;border-bottom:1px dashed #bbf7d0; display:flex;align-items:center;gap:7px;">
                  🧾 Rincian Pos Biaya Daftar Ulang (Uang Pangkal)
                </div>

                <div style="display:grid;grid-template-columns:1fr;gap:0.65rem;">
                  <!-- Seragam -->
                  <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px; padding:8px 10px;background:rgba(255,255,255,0.75); border-radius:8px;border:1px solid rgba(187,247,208,0.6);">
                    <div style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:7px;">
                      <div style="width:26px;height:26px;border-radius:6px;background:#fef3c7;color:#d97706; display:flex;align-items:center;justify-content:center;font-size:0.85rem;">👔</div>
                      <div>
                        <div>Paket Seragam Sekolah (5 Stel)</div>
                        <div style="font-size:0.73rem;color:var(--text-muted);font-weight:400;">Standar putra/putri lengkap atribut HW & IPM</div>
                      </div>
                    </div>
                    <input type="number" id="up-pos-seragam" class="form-control" style="width:160px;text-align:right;" placeholder="Contoh: 1850000" min="0" oninput="window.keuanganHitungTotal()">
                  </div>

                  <!-- SPP Pertama -->
                  <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px; padding:8px 10px;background:rgba(255,255,255,0.75); border-radius:8px;border:1px solid rgba(187,247,208,0.6);">
                    <div style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:7px;">
                      <div style="width:26px;height:26px;border-radius:6px;background:#e0f2fe;color:#0284c7; display:flex;align-items:center;justify-content:center;font-size:0.85rem;">📅</div>
                      <div>
                        <div>SPP Bulan Pertama (Juli 2026)</div>
                        <div style="font-size:0.73rem;color:var(--text-muted);font-weight:400;">Biaya operasional pendidikan bulan pertama</div>
                      </div>
                    </div>
                    <input type="number" id="up-pos-spp" class="form-control" style="width:160px;text-align:right;" placeholder="Contoh: 750000" min="0" oninput="window.keuanganHitungTotal()">
                  </div>

                  <!-- Sarpras -->
                  <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px; padding:8px 10px;background:rgba(255,255,255,0.75); border-radius:8px;border:1px solid rgba(187,247,208,0.6);">
                    <div style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:7px;">
                      <div style="width:26px;height:26px;border-radius:6px;background:#dcfce7;color:#16a34a; display:flex;align-items:center;justify-content:center;font-size:0.85rem;">🏛</div>
                      <div>
                        <div>Infaq Pengembangan Sarana & Prasarana</div>
                        <div style="font-size:0.73rem;color:var(--text-muted);font-weight:400;">Laboratorium digital, AC kelas, dan sarana ibadah</div>
                      </div>
                    </div>
                    <input type="number" id="up-pos-sarpras" class="form-control" style="width:160px;text-align:right;" placeholder="Contoh: 4000000" min="0" oninput="window.keuanganHitungTotal()">
                  </div>

                  <!-- Kartu Pelajar & Asuransi -->
                  <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px; padding:8px 10px;background:rgba(255,255,255,0.75); border-radius:8px;border:1px solid rgba(187,247,208,0.6);">
                    <div style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:7px;">
                      <div style="width:26px;height:26px;border-radius:6px;background:#f5f3ff;color:#7c3aed; display:flex;align-items:center;justify-content:center;font-size:0.85rem;">💳</div>
                      <div>
                        <div>Kartu Pelajar RFID, Tes Bakat & Asuransi</div>
                        <div style="font-size:0.73rem;color:var(--text-muted);font-weight:400;">Smart card perpustakaan, tes psikologi, dan asuransi 1 tahun</div>
                      </div>
                    </div>
                    <input type="number" id="up-pos-kartu" class="form-control" style="width:160px;text-align:right;" placeholder="Contoh: 400000" min="0" oninput="window.keuanganHitungTotal()">
                  </div>
                </div>

                <!-- Total Kalkulasi -->
                <div style="display:flex;justify-content:space-between;align-items:center; margin-top:1rem;padding-top:0.85rem;border-top:1.5px solid #86efac;">
                  <span style="font-weight:700;font-size:0.92rem;color:#006837;">Total Uang Pangkal Dihitung:</span>
                  <span id="up-total-display" style="font-size:1.25rem;font-weight:800;color:#006837;">Rp 0</span>
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label for="up-catatan-val">Catatan / Keterangan Pembayaran</label>
                <input type="text" id="up-catatan-val" class="form-control" placeholder="Nomor resi, angsuran ke-1, dispensasi khusus...">
              </div>

              <div style="margin-top: 1.25rem; text-align: right;">
                <button type="submit" class="btn btn-primary" style="background: #006837; color: white; padding: 10px 24px; font-weight: 700;">
                  💾 Simpan Pembayaran Uang Pangkal
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Tabel Catatan Uang Pangkal -->
        <div class="card" style="margin-top: 1.5rem;">
          <div class="card-header">
            <h3 class="card-title">📜 Riwayat Penerimaan Uang Pangkal</h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID Pendaftar</th>
                    <th>Nama Siswa</th>
                    <th>Tanggal</th>
                    <th>Jumlah Dibayar</th>
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
            <h3 class="card-title">📊 Ringkasan & Rekapitulasi Keuangan SPMB</h3>
          </div>
          <div class="card-body">
            <div id="k-rekap-content"></div>
          </div>
        </div>
      </div>

      <!-- Panel 4: Riwayat Audit Log Persisten -->
      <div id="panel-k-audit" class="panel-k-section">
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 class="card-title" style="margin:0;">📜 Jejak Riwayat Perubahan (Audit Log)</h3>
              <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--text-muted, #64748b);">
                Mencatat kronologi setiap perubahan status otomatis maupun tindakan manual bendahara secara transparan & persisten.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="k-search-audit" class="form-control" placeholder="Cari ID / Aktor..." style="font-size:0.82rem; padding:4px 10px; width:180px;">
              <button class="btn btn-secondary" id="btn-k-refresh-audit" style="font-size:0.8rem; padding:4px 10px;">🔄 Refresh Log</button>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table" style="width: 100%;">
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>Waktu (WIB)</th>
                    <th>ID Pendaftar</th>
                    <th>Perubahan Status</th>
                    <th>Jenis</th>
                    <th>Aktor / Petugas</th>
                    <th>Alasan / Keterangan</th>
                  </tr>
                </thead>
                <tbody id="k-tbody-audit">
                  <!-- Rendered via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODALS SECTION                             -->
    <!-- ========================================== -->

    <!-- Modal Detail Pembayaran -->
    <div class="modal-k-overlay" id="modal-k-detail">
      <div class="modal-k-box">
        <div class="modal-k-header">
          <div class="modal-k-title" id="modal-k-detail-title">🔍 Detail Bukti Pembayaran</div>
          <button class="modal-close-btn" id="btn-close-detail">&times;</button>
        </div>
        <div class="modal-k-body" id="modal-k-detail-body"></div>
        <div class="modal-k-footer" id="modal-k-detail-footer">
          <button class="btn btn-secondary" id="btn-cancel-detail">Tutup</button>
          <button class="btn btn-secondary" id="btn-detail-preview-email" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
            📧 Preview Email
          </button>
          <button class="btn btn-primary" id="btn-validate-modal" style="background: #006837; color: white;">
            ✅ Validasi Manual
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Edit Pembayaran (Kewenangan Admin Keuangan) -->
    <div class="modal-k-overlay" id="modal-k-edit">
      <div class="modal-k-box">
        <div class="modal-k-header">
          <div class="modal-k-title">✏️ Koreksi & Edit Manual Data Pembayaran</div>
          <button class="modal-close-btn" id="btn-close-edit">&times;</button>
        </div>
        <div class="modal-k-body">
          <div class="notice-admin">
            <strong>🔒 Hak Akses Admin Keuangan:</strong> Perubahan manual akan dicatat ke dalam Audit Log sistem SPMB demi transparansi akuntabilitas keuangan sekolah.
          </div>
          <form id="form-k-edit" autocomplete="off">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label>ID Pendaftar (Terkunci)</label>
                <input type="text" id="edit-id" class="form-control" readonly style="background:#f1f5f9; font-weight:700;">
              </div>
              <div class="form-group">
                <label>Nama Calon Siswa (Terkunci)</label>
                <input type="text" id="edit-nama" class="form-control" readonly style="background:#f1f5f9; font-weight:700;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label for="edit-status">Status Pembayaran <span style="color:red">*</span></label>
                <select id="edit-status" class="form-control" required>
                  <option value="lunas_manual">✅ Lunas — Validasi Manual (Loket Sekolah)</option>
                  <option value="lunas_otomatis">⚡ Lunas — Validasi Otomatis (Bukti Digital)</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="belum_bayar">— Belum Bayar</option>
                  <option value="ditolak">🚫 Ditolak (Tidak Memenuhi Syarat)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-tgl">Tanggal Pembayaran</label>
                <input type="date" id="edit-tgl" class="form-control">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label for="edit-metode">Metode Pembayaran</label>
                <select id="edit-metode" class="form-control">
                  <option value="Cash / Tunai Loket Sekolah">Cash / Tunai Loket Sekolah</option>
                  <option value="Transfer Bank BSI">Transfer Bank BSI (Bank Syariah Indonesia)</option>
                  <option value="Transfer Bank BPD DIY Syariah">Transfer Bank BPD DIY Syariah</option>
                  <option value="Transfer Bank Muamalat">Transfer Bank Muamalat</option>
                  <option value="Lainnya">Lainnya / Saluran Pembayaran Lain</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-ref">No. Referensi / Kode Resi</label>
                <input type="text" id="edit-ref" class="form-control" placeholder="Contoh: TRX-LOKET-01 / TRX-BSI-982103">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="edit-catatan">Keterangan / Catatan Pembayaran</label>
              <textarea id="edit-catatan" class="form-control" rows="2" placeholder="Catatan transaksi atau dispensasi pembukuan..."></textarea>
            </div>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 8px;">
                <label for="edit-aktor">Nama Petugas / Aktor Pengubah <span style="color:red">*</span></label>
                <input type="text" id="edit-aktor" class="form-control" value="Admin Keuangan (Bendahara SPMB)" required>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="edit-alasan">Alasan Koreksi / Perubahan Data <span style="color:red">*</span></label>
                <input type="text" id="edit-alasan" class="form-control" placeholder="Contoh: Pembayaran tunai diverifikasi langsung di loket TU..." required>
              </div>
            </div>

            <div class="modal-k-footer" style="padding:0; background:none; border:none; margin-top:1rem;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-edit">Batal</button>
              <button type="submit" class="btn btn-primary" style="background:#006837; color:white;">
                💾 Simpan Perubahan & Catat Audit Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Preview Email Pemberitahuan (Non-SMTP) -->
    <div class="modal-k-overlay" id="modal-k-email-preview">
      <div class="modal-k-box" style="max-width: 640px;">
        <div class="modal-k-header" style="background:#f0fdf4; border-bottom:1px solid #bbf7d0;">
          <div class="modal-k-title" style="color:#006837;">
            📧 Contoh Tampilan & Pratinjau Email — Lanjut ke Tahap Wawancara
          </div>
          <button class="modal-close-btn" id="btn-close-email-preview">&times;</button>
        </div>
        <div class="modal-k-body">
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; margin-bottom:1rem; font-size:0.8rem; color:#92400e; display:flex; align-items:center; gap:8px;">
            <span>⚠️</span>
            <span><strong>Mode Prototipe (Non-SMTP):</strong> Tampilan ini adalah draf pratinjau pesan resmi untuk calon siswa. Tidak ada koneksi SMTP riil yang dikirimkan ke internet.</span>
          </div>

          <div class="email-paper">
            <div class="email-paper-header">
              <div class="email-paper-row">
                <strong>Pengirim:</strong>
                <span>Panitia SPMB SMA Muhammadiyah 3 Yogyakarta &lt;spmb@smamuh3jogja.sch.id&gt;</span>
              </div>
              <div class="email-paper-row">
                <strong>Kepada:</strong>
                <span id="prev-email-to">calon.siswa@email.com</span>
              </div>
              <div class="email-paper-row">
                <strong>Subjek:</strong>
                <span style="font-weight:700; color:#0f172a;" id="prev-email-subj">
                  Pembayaran Pendaftaran Berhasil Diproses — Silakan Lanjut ke Tahap Wawancara
                </span>
              </div>
            </div>
            <div class="email-paper-body" id="prev-email-body">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>
        <div class="modal-k-footer">
          <button class="btn btn-secondary" id="btn-copy-email-text" style="font-size:0.84rem;">📋 Salin Teks Email</button>
          <button class="btn btn-primary" id="btn-close-email-footer" style="background:#006837; color:white;">Tutup Pratinjau</button>
        </div>
      </div>
    </div>

    <!-- Modal Tolak Pembayaran -->
    <div class="modal-k-overlay" id="modal-k-tolak">
      <div class="modal-k-box" style="max-width: 440px;">
        <div class="modal-k-header">
          <div class="modal-k-title" style="color: #dc2626;">⚠️ Konfirmasi Penolakan Bukti</div>
          <button class="modal-close-btn" id="btn-close-tolak">&times;</button>
        </div>
        <div class="modal-k-body">
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Apakah Anda yakin ingin menolak berkas pembayaran pendaftar ini? Siswa harus mengunggah ulang bukti yang valid.
          </p>
          <div id="modal-k-tolak-info" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 700; color: #dc2626; font-size: 0.88rem;"></div>
          <div class="form-group" style="margin-top: 1rem;">
            <label for="alasan-k-tolak">Alasan Penolakan <span style="color:red">*</span></label>
            <textarea id="alasan-k-tolak" class="form-control" rows="2" placeholder="Bukti tidak terbaca / nominal tidak sesuai tarif..."></textarea>
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

  const tglInput = document.getElementById('up-tgl-val');
  if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];

  updateKeuanganStats();
  renderFormulirTable();
  renderUangPangkalTable();
  renderRekapContent();
  renderAuditTable();
  attachKeuanganEvents();
}

// ==========================================
// 6. STATS & TABLES RENDERING
// ==========================================

function updateKeuanganStats() {
  const elTotal = document.getElementById('k-stat-total');
  const elPending = document.getElementById('k-stat-pending');
  const elAuto = document.getElementById('k-stat-auto');
  const elLunas = document.getElementById('k-stat-lunas');
  const elUp = document.getElementById('k-stat-up');

  const countPending = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return st === 'pending' || st === 'pending_verification' || st === 'menunggu_bukti' || st === 'belum_bayar';
  }).length;

  const countAuto = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return st === 'lunas_otomatis' || p.pembayaran?.validation_method === 'automatic_upload';
  }).length;

  const countLunas = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return st === 'lunas' || st === 'lunas_otomatis' || st === 'lunas_manual';
  }).length;

  const countUp = allUangPangkal.filter(u => u.status === 'lunas').length;

  if (elTotal) elTotal.textContent = allPendaftar.length;
  if (elPending) elPending.textContent = countPending;
  if (elAuto) elAuto.textContent = countAuto;
  if (elLunas) elLunas.textContent = countLunas;
  if (elUp) elUp.textContent = countUp;
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

    const statusPay = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    let matchFilter = true;
    if (filterVal) {
      if (filterVal === 'pending') {
        matchFilter = (statusPay === 'pending' || statusPay === 'pending_verification' || statusPay === 'menunggu_bukti' || statusPay === 'belum_bayar');
      } else {
        matchFilter = (statusPay === filterVal);
      }
    }

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
    const pay = p.pembayaran || {};
    const status = normalizeStatus(pay.status_pembayaran, pay);
    const hasProof = hasRealProofUploaded(p);
    const isLunas = status === 'lunas_otomatis' || status === 'lunas_manual' || status === 'lunas';
    const isDitolak = status === 'ditolak';

    const proofBadge = hasProof
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:#15803d; font-weight:700; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 8px; border-radius:6px;">✓ Bukti Terkirim (Digital)</span>`
      : `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:#ca8a04; font-weight:700; background:#fefce8; border:1px solid #fef08a; padding:2px 8px; border-radius:6px;">⏳ Belum Upload (Pending)</span>`;

    // Admin Keuangan berwenang memvalidasi manual (misal bayar tunai/loket sekolah)
    // Tombol validasi hanya dinonaktifkan jika SUDAH LUNAS
    const disableValidasi = isLunas;
    const validTitle = isLunas
      ? 'Pembayaran sudah berstatus LUNAS'
      : (hasProof ? 'Validasi Pembayaran Manual' : 'Validasi Manual Pembayaran Loket Sekolah (Tunai/Fisik)');

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #006837;">${p.id_pendaftar}</code></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${p.nama_lengkap}</div>
          <div style="font-size:0.74rem; color:var(--text-muted);">${p.email || '-'}</div>
        </td>
        <td>${p.no_wa || '-'}</td>
        <td><span class="badge badge-info">${p.biodata?.pilihan_jurusan || 'MIPA'}</span></td>
        <td>${proofBadge}</td>
        <td>
          <span class="badge ${getBadgeClass(status)}">${getStatusLabel(status, pay)}</span>
          ${pay.validated_at ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${formatDate(pay.validated_at)}</div>` : ''}
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-k-view" data-id="${p.id_pendaftar}" title="Buka Detail Berkas" style="padding: 4px 7px; font-size: 0.76rem;">
              🔍 Detail
            </button>
            <button class="btn btn-secondary btn-k-edit" data-id="${p.id_pendaftar}" title="Edit Data Pembayaran" style="padding: 4px 7px; font-size: 0.76rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
              ✏️ Edit
            </button>
            <button class="btn btn-primary btn-k-valid" data-id="${p.id_pendaftar}" ${disableValidasi ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="${validTitle}" style="padding: 4px 7px; font-size: 0.76rem; background:#006837; color:white;">
              ✅ Validasi
            </button>
            <button class="btn btn-secondary btn-k-tolak" data-id="${p.id_pendaftar}" ${isDitolak ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Tolak Berkas" style="padding: 4px 7px; font-size: 0.76rem; background:#fef2f2; color:#dc2626; border:1px solid #fecaca;">
              🚫 Tolak
            </button>
            <button class="btn btn-secondary btn-k-preview-email" data-id="${p.id_pendaftar}" title="Lihat Contoh Notifikasi Email Lanjut Wawancara" style="padding: 4px 8px; font-size: 0.76rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
              📧 Contoh Email
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Re-attach event listeners on table buttons
  document.querySelectorAll('.btn-k-view').forEach(b => b.addEventListener('click', (e) => openDetailModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-edit').forEach(b => b.addEventListener('click', (e) => openEditModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-valid').forEach(b => b.addEventListener('click', (e) => validatePembayaran(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-tolak').forEach(b => b.addEventListener('click', (e) => openTolakModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-preview-email').forEach(b => b.addEventListener('click', (e) => openEmailPreviewModal(e.currentTarget.getAttribute('data-id'))));
}

function renderUangPangkalTable() {
  const tbody = document.getElementById('k-tbody-uangpangkal');
  if (!tbody) return;

  if (allUangPangkal.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Belum ada catatan penerimaan uang pangkal. Silakan catat pembayaran melalui formulir di atas.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allUangPangkal.map((u, idx) => {
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><code>${u.id_pendaftar}</code></td>
        <td><strong>${u.nama}</strong></td>
        <td>${formatDate(u.tgl_bayar)}</td>
        <td style="font-weight: 700; color: #006837;">${formatRupiah(u.jumlah)}</td>
        <td>${u.metode || '-'}</td>
        <td><span class="badge ${u.status === 'lunas' ? 'badge-lunas' : 'badge-cicilan'}">${u.status === 'lunas' ? '✅ Lunas' : '🔄 Cicilan'}</span></td>
        <td><small style="color:var(--text-muted);">${u.catatan || '-'}</small></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-k-del-up" data-id="${u.id}" style="padding: 3px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fecaca;">
            🗑 Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');

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

  const countAuto = allPendaftar.filter(p => normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran) === 'lunas_otomatis').length;
  const countManual = allPendaftar.filter(p => normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran) === 'lunas_manual').length;
  const countPending = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return st === 'pending' || st === 'pending_verification' || st === 'menunggu_bukti' || st === 'belum_bayar';
  }).length;
  const countBelum = allPendaftar.filter(p => normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran) === 'belum_bayar').length;
  const countDitolak = allPendaftar.filter(p => normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran) === 'ditolak').length;

  const totalLunasAll = countAuto + countManual;
  const totalDanaFormulir = totalLunasAll * 200000;
  const totalUP = allUangPangkal.reduce((acc, u) => acc + (parseFloat(u.jumlah) || 0), 0);

  el.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.25rem;">
        <h4 style="font-weight: 700; color: #006837; margin-bottom: 0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span>📋 Rekap Formulir Pendaftaran</span>
          <span style="font-size:0.75rem; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:6px;">@Rp 200.000</span>
        </h4>
        <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Total Pendaftar Terdaftar</td><td style="font-weight:700; text-align:right;">${allPendaftar.length} orang</td></tr>
          <tr><td style="padding:4px 0; color:#059669;">⚡ Lunas (Validasi Otomatis)</td><td style="font-weight:700; color:#059669; text-align:right;">${countAuto} orang</td></tr>
          <tr><td style="padding:4px 0; color:#15803d;">✅ Lunas (Validasi Manual Loket)</td><td style="font-weight:700; color:#15803d; text-align:right;">${countManual} orang</td></tr>
          <tr><td style="padding:4px 0; color:#ca8a04;">⏳ Status Pending</td><td style="font-weight:700; color:#ca8a04; text-align:right;">${countPending} orang</td></tr>
          <tr><td style="padding:4px 0; color:#64748b;">— Belum Bayar</td><td style="font-weight:700; color:#64748b; text-align:right;">${countBelum} orang</td></tr>
          <tr><td style="padding:4px 0; color:#dc2626;">🚫 Bukti Ditolak</td><td style="font-weight:700; color:#dc2626; text-align:right;">${countDitolak} orang</td></tr>
          <tr style="border-top:1px dashed #86efac;"><td style="padding:6px 0; font-weight:700; color:#006837;">Estimasi Omzet Formulir</td><td style="font-weight:800; color:#006837; text-align:right;">${formatRupiah(totalDanaFormulir)}</td></tr>
        </table>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.25rem;">
        <h4 style="font-weight: 700; color: #1d4ed8; margin-bottom: 0.75rem;">🏫 Rekap Penerimaan Uang Pangkal</h4>
        <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Total Catatan Transaksi</td><td style="font-weight:700; text-align:right;">${allUangPangkal.length} catatan</td></tr>
          <tr><td style="padding:4px 0;">Siswa Lunas Penuh</td><td style="font-weight:700; text-align:right;">${allUangPangkal.filter(u => u.status === 'lunas').length} siswa</td></tr>
          <tr><td style="padding:4px 0;">Siswa Masih Cicilan</td><td style="font-weight:700; text-align:right;">${allUangPangkal.filter(u => u.status === 'cicilan').length} siswa</td></tr>
          <tr style="border-top:1px dashed #93c5fd;"><td style="padding:6px 0; font-weight:700; color:#1d4ed8;">Total Dana Terkumpul</td><td style="font-weight:800; color:#1d4ed8; text-align:right;">${formatRupiah(totalUP)}</td></tr>
        </table>
      </div>
    </div>
  `;
}

function renderAuditTable() {
  const tbody = document.getElementById('k-tbody-audit');
  if (!tbody) return;

  const logs = getAuditLogs();
  const searchVal = (document.getElementById('k-search-audit')?.value || '').toLowerCase().trim();

  const filteredLogs = logs.filter(l => {
    if (!searchVal) return true;
    return (l.id_pendaftar || '').toLowerCase().includes(searchVal) ||
           (l.aktor || '').toLowerCase().includes(searchVal) ||
           (l.alasan || '').toLowerCase().includes(searchVal);
  });

  if (filteredLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Belum ada riwayat perubahan yang sesuai pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredLogs.map((log, idx) => {
    const isAuto = log.jenis_perubahan === 'otomatis';
    const typeBadge = isAuto
      ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">⚡ Otomatis</span>`
      : `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">👤 Manual</span>`;

    const statusBadgeLama = `<span class="badge ${getBadgeClass(log.status_lama)}" style="font-size:0.72rem;">${getStatusLabel(log.status_lama)}</span>`;
    const statusBadgeBaru = `<span class="badge ${getBadgeClass(log.status_baru)}" style="font-size:0.72rem;">${getStatusLabel(log.status_baru)}</span>`;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-size:0.8rem; color:#475569;">${formatDateTime(log.waktu)}</td>
        <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700;">${log.id_pendaftar}</code></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${statusBadgeLama} <span>→</span> ${statusBadgeBaru}
          </div>
        </td>
        <td>${typeBadge}</td>
        <td><strong>${log.aktor}</strong></td>
        <td><span style="font-size:0.82rem; color:#334155;">${log.alasan || '-'}</span></td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 7. ACTIONS: VALIDASI MANUAL, TOLAK, EDIT & PREVIEW
// ==========================================

function validatePembayaran(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  const currentStatus = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
  const isOfflineLoket = !hasRealProofUploaded(p);

  const confirmMsg = isOfflineLoket
    ? `Konfirmasi Validasi Manual Loket Sekolah:

Siswa: ${p.nama_lengkap} (${id})
Catatan: Calon siswa belum mengunggah bukti digital secara online.

Apakah pembayaran (Tunai / Pembayaran Langsung di Loket Sekolah) telah diterima sah oleh bendahara?

Status akan diubah menjadi: LUNAS — Validasi Manual (Loket).`
    : `Validasi pembayaran formulir untuk ${p.nama_lengkap} (${id})?

Status pembayaran akan disahkan secara MANUAL menjadi LUNAS oleh Bendahara SPMB.`;

  if (confirm(confirmMsg)) {
    const oldStatus = currentStatus;
    const newStatus = 'lunas_manual';

    p.pembayaran = Object.assign({}, p.pembayaran, {
      status_pembayaran: newStatus,
      validated_at: new Date().toISOString(),
      validated_by: 'Admin Keuangan (Bendahara Loket)',
      validation_method: isOfflineLoket ? 'manual_loket' : 'manual',
      validation_type: 'manual',
      metode_pembayaran: isOfflineLoket ? 'Cash / Tunai Loket Sekolah' : (p.pembayaran?.metode_pembayaran || 'Transfer Bank BSI'),
      catatan_validasi: isOfflineLoket ? 'Pembayaran tunai/manual disahkan langsung di loket sekolah' : 'Bukti fisik/transfer diverifikasi manual oleh Bendahara SPMB'
    });
    p.status_pembayaran = 'LUNAS';

    // Catat ke Audit Log persisten
    recordAuditLog(
      id,
      oldStatus,
      newStatus,
      'manual',
      'Admin Keuangan (Bendahara Loket)',
      isOfflineLoket ? 'Pembayaran tunai/manual di loket sekolah' : 'Verifikasi manual bendahara'
    );

    saveMergedPendaftar(allPendaftar);
    updateKeuanganStats();
    renderFormulirTable();
    renderRekapContent();
    renderAuditTable();
    closeModalK('modal-k-detail');
    showKeuanganAlert(`✅ Pembayaran ${p.nama_lengkap} berhasil disahkan secara MANUAL (LUNAS)!`);
  }
}

function openDetailModal(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  currentModalId = id;
  const pay = p.pembayaran || {};
  const status = normalizeStatus(pay.status_pembayaran, pay);
  const isLunas = status === 'lunas_otomatis' || status === 'lunas_manual' || status === 'lunas';
  const hasProof = hasRealProofUploaded(p);

  document.getElementById('modal-k-detail-title').textContent = `🔍 Detail Pembayaran — ${p.nama_lengkap}`;

  const bodyEl = document.getElementById('modal-k-detail-body');
  const fileImg = pay.file_data_url || p.berkas?.bukti_bayar?.data_url;
  const fileName = pay.file_bukti || p.berkas?.bukti_bayar?.nama_file || 'Belum ada bukti terunggah';

  bodyEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 1rem; font-size: 0.88rem; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
      <div><strong>ID Pendaftar:</strong> <code>${p.id_pendaftar}</code></div>
      <div><strong>Nama Lengkap:</strong> ${p.nama_lengkap}</div>
      <div><strong>No. WhatsApp:</strong> ${p.no_wa || '-'}</div>
      <div><strong>Email Terdaftar:</strong> ${p.email || '-'}</div>
      <div><strong>Pilihan Jurusan:</strong> <span class="badge badge-info">${p.biodata?.pilihan_jurusan || 'MIPA'}</span></div>
      <div><strong>Asal Sekolah:</strong> ${p.biodata?.asal_sekolah || '-'}</div>
    </div>

    <div style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <strong>Status Pembayaran:</strong>
        <span class="badge ${getBadgeClass(status)}">${getStatusLabel(status, pay)}</span>
      </div>
      <div>
        <strong>Nominal Formulir:</strong> <span style="font-weight:700; color:#006837;">Rp 200.000</span>
      </div>
    </div>

    <!-- Metadata Validasi Administrasi -->
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-bottom:1rem; font-size:0.82rem; line-height:1.5;">
      <div style="font-weight:700; color:#1d4ed8; margin-bottom:4px;">📋 Informasi Validasi Administrasi SPMB:</div>
      <div>• Metode Validasi: <strong>${pay.validation_method === 'automatic_upload' ? '⚡ Validasi Otomatis (Berkas Digital)' : (pay.validation_method?.startsWith('manual') ? '✅ Verifikasi Manual Bendahara Loket' : 'Belum Divalidasi (Status: Pending)')}</strong></div>
      <div>• Petugas / Aktor: <strong>${pay.validated_by || (hasProof ? 'Sistem Otomatis' : 'Admin Keuangan Loket')}</strong></div>
      <div>• Waktu Pengesahan: <strong>${pay.validated_at ? formatDateTime(pay.validated_at) : '-'}</strong></div>
      <div>• Metode Transaksi: <strong>${pay.metode_pembayaran || (hasProof ? 'Transfer Online' : 'Loket / Tunai')}</strong></div>
      <div>• Nomor Referensi / Resi: <strong>${pay.no_referensi || 'Belum diisi'}</strong></div>
    </div>

    ${
      !hasProof
        ? `<div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:10px 14px; margin-bottom:1rem; font-size:0.82rem; color:#854d0e; line-height:1.45;">
             💡 <strong>Status Pending (Belum Upload Online):</strong> Calon siswa belum mengunggah bukti via portal online. Jika calon siswa melakukan pembayaran langsung di loket sekolah, Admin Keuangan dapat mengklik tombol <strong>✅ Validasi Manual</strong> di bawah untuk mengesahkan pembayaran secara sah.
           </div>`
        : ''
    }

    <div style="margin-bottom: 0.5rem;">
      <strong>File Bukti Pembayaran Digital:</strong>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Nama Berkas: <code>${fileName}</code></div>
    </div>

    <div style="border: 1px dashed #cbd5e1; border-radius: 10px; padding: 1rem; text-align: center; background: #fafafa; min-height: 180px; display: flex; align-items: center; justify-content: center;">
      ${
        fileImg
          ? `<img src="${fileImg}" style="max-height: 260px; max-width: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" alt="Bukti Transfer">`
          : `<div style="color: var(--text-muted); font-size: 0.88rem;">
               <div style="font-size:2.5rem; margin-bottom:6px;">📄</div>
               <strong style="color:#64748b;">Belum Ada Berkas Bukti Digital Terunggah</strong>
               <p style="margin:4px 0 0 0; font-size:0.8rem; color:#94a3b8;">Calon siswa dapat membayar langsung via loket sekolah atau mengunggah bukti transfer.</p>
             </div>`
      }
    </div>
  `;

  // Update button states
  const btnValid = document.getElementById('btn-validate-modal');
  if (btnValid) {
    btnValid.disabled = isLunas;
    btnValid.style.opacity = isLunas ? '0.4' : '1';
    btnValid.style.cursor = isLunas ? 'not-allowed' : 'pointer';
    btnValid.title = isLunas ? 'Sudah Lunas' : (!hasProof ? 'Validasi Manual Pembayaran Loket' : 'Validasi Manual Bendahara');
    btnValid.onclick = () => validatePembayaran(id);
  }

  const btnPrev = document.getElementById('btn-detail-preview-email');
  if (btnPrev) {
    btnPrev.onclick = () => {
      closeModalK('modal-k-detail');
      openEmailPreviewModal(id);
    };
  }

  document.getElementById('modal-k-detail').classList.add('show');
}

function openEditModal(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  currentEditId = id;
  const pay = p.pembayaran || {};
  const status = normalizeStatus(pay.status_pembayaran, pay);

  document.getElementById('edit-id').value = p.id_pendaftar;
  document.getElementById('edit-nama').value = p.nama_lengkap;
  document.getElementById('edit-status').value = status;
  document.getElementById('edit-tgl').value = pay.tgl_bayar ? pay.tgl_bayar.slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('edit-metode').value = pay.metode_pembayaran || 'Cash / Tunai Loket Sekolah';
  document.getElementById('edit-ref').value = pay.no_referensi || '';
  document.getElementById('edit-catatan').value = pay.catatan || '';
  document.getElementById('edit-aktor').value = 'Admin Keuangan (Bendahara SPMB)';
  document.getElementById('edit-alasan').value = '';

  document.getElementById('modal-k-edit').classList.add('show');
}

function openEmailPreviewModal(id) {
  const p = allPendaftar.find(x => x.id_pendaftar === id);
  if (!p) return;

  const pay = p.pembayaran || {};
  const status = normalizeStatus(pay.status_pembayaran, pay);
  const isOtomatis = status === 'lunas_otomatis' || pay.validation_method === 'automatic_upload';
  const jenisValidasi = isOtomatis ? 'Validasi Otomatis (Berkas Digital)' : 'Validasi Manual (Loket Sekolah)';

  const toEmail = p.email || `${p.id_pendaftar.toLowerCase().replace(/[^a-z0-9]/g, '')}@spmb-m3.sch.id`;

  document.getElementById('prev-email-to').textContent = `${p.nama_lengkap} <${toEmail}>`;
  document.getElementById('prev-email-subj').textContent = `[SPMB SMA MUHI 3] Pembayaran Formulir Terverifikasi Otomatis — Lanjut ke Tahap Wawancara`;

  const emailBodyEl = document.getElementById('prev-email-body');
  emailBodyEl.innerHTML = `
    <!-- Header Resmi Email -->
    <div style="background: linear-gradient(135deg, #003d20 0%, #006837 100%); color:white; padding:16px 20px; border-radius:10px 10px 0 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-size:0.75rem; letter-spacing:1px; text-transform:uppercase; opacity:0.85; font-weight:600;">Pemberitahuan Resmi Sistem SPMB</div>
        <div style="font-size:1.15rem; font-weight:800; letter-spacing:0.3px;">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
        <div style="font-size:0.75rem; opacity:0.85;">Tahun Ajaran 2026/2027 &bull; Kampus Wirobrajan Yogyakarta</div>
      </div>
      <div style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700;">
        ⚡ Terverifikasi Otomatis
      </div>
    </div>

    <!-- Isi Surat Resmi -->
    <div style="padding:20px; background:#ffffff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 10px 10px;">
      <p style="margin-top:0; font-size:0.95rem;">Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
      <p style="font-size:0.9rem;">Yth. Calon Siswa Baru: <strong>${p.nama_lengkap}</strong>,</p>

      <p style="font-size:0.9rem; line-height:1.6; color:#334155;">
        Alhamdulillah, bukti pembayaran formulir pendaftaran SPMB Anda telah <strong>berhasil diverifikasi secara otomatis oleh sistem SPMB SMA Muhammadiyah 3 Yogyakarta</strong>. Status administrasi pembayaran Anda telah resmi disahkan menjadi <strong>LUNAS (Rp 200.000)</strong>.
      </p>

      <!-- Kotak Rincian Data Registrasi -->
      <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-left:5px solid #006837; padding:14px 16px; margin:1.25rem 0; border-radius:6px; font-size:0.88rem;">
        <div style="font-weight:800; color:#006837; margin-bottom:8px; font-size:0.82rem; letter-spacing:0.5px; text-transform:uppercase;">
          📋 INFORMASI DATA PENDAFTARAN RESMI:
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.86rem; line-height:1.8;">
          <tr>
            <td style="width:36%; color:#64748b; font-weight:600;">Nama Lengkap</td>
            <td style="font-weight:700; color:#0f172a;">: ${p.nama_lengkap}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">Nomor Registrasi</td>
            <td>: <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700; color:#006837;">${p.id_pendaftar}</code></td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">NISN</td>
            <td>: <strong>${p.nisn || '-'}</strong></td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">Pilihan Peminatan/Jurusan</td>
            <td>: <strong>${p.biodata?.pilihan_jurusan || 'MIPA'}</strong></td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">Metode Validasi</td>
            <td>: <span style="color:#15803d; font-weight:700;">${jenisValidasi}</span></td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">Status Tahapan</td>
            <td>: <span style="background:#dcfce7; color:#166534; font-weight:800; padding:2px 8px; border-radius:4px; font-size:0.82rem;">BERHAK MELANJUTKAN KE TAHAP 04 WAWANCARA</span></td>
          </tr>
        </table>
      </div>

      <!-- Instruksi Login Akun Pendaftaran untuk Wawancara -->
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1.5px solid #bfdbfe; border-radius:10px; padding:16px; margin:1.25rem 0;">
        <div style="font-weight:800; color:#1d4ed8; margin-bottom:6px; font-size:0.92rem; display:flex; align-items:center; gap:6px;">
          <span>🎯</span>
          <span>LANGKAH SELANJUTNYA: TAHAP PENILAIAN WAWANCARA</span>
        </div>
        <p style="font-size:0.88rem; color:#1e293b; margin:0 0 10px 0; line-height:1.55;">
          Calon siswa dipersilakan melanjutkan proses seleksi ke <strong>Tahap Penilaian Wawancara</strong> menggunakan <strong>akun yang telah Anda daftarkan tadi</strong>:
        </p>
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; font-size:0.85rem; line-height:1.7;">
          <div>🔑 <strong>Email Akun Terdaftar:</strong> <code style="color:#006837; font-weight:700;">${toEmail}</code></div>
          <div>🏷️ <strong>Nomor Registrasi:</strong> <code style="color:#006837; font-weight:700;">${p.id_pendaftar}</code></div>
          <div>🔒 <strong>Kata Sandi / Password:</strong> <em>Password yang Anda tentukan saat mengisi formulir pendaftaran</em></div>
        </div>
        <div style="text-align:center; margin-top:14px;">
          <a href="#/wawancara" onclick="if(window.loadModulWawancara){ window.loadModulWawancara(); } else { alert('Mengarahkan ke Modul 04 Wawancara dengan akun ${p.id_pendaftar}...'); } return false;" style="display:inline-block; background:#006837; color:#ffffff; font-weight:700; padding:11px 24px; border-radius:8px; text-decoration:none; box-shadow:0 3px 8px rgba(0,104,55,0.25); font-size:0.88rem;">
            👉 Masuk & Ikuti Tahap Wawancara Sekarang
          </a>
        </div>
      </div>

      <!-- CALLOUT PENTING: JIKA BELUM TERIMA NOTIFIKASI EMAIL (Sesuai Syarat User) -->
      <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:14px 16px; margin:1.25rem 0; font-size:0.84rem; line-height:1.55; color:#92400e;">
        <div style="font-weight:800; color:#b45309; margin-bottom:6px; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
          <span>⚠️</span>
          <span>KENDALA SISTEM / BELUM MENERIMA NOTIFIKASI EMAIL UNTUK WAWANCARA?</span>
        </div>
        <p style="margin:0 0 8px 0;">
          Apabila Anda merasa telah berhasil melakukan pembayaran formulir pendaftaran (via transfer bank atau pembayaran di loket sekolah) namun <strong>belum menerima notifikasi email resmi untuk lanjut ke tahap wawancara</strong>, Anda dapat segera <strong>menghubungi Admin Keuangan SPMB</strong> agar data Anda dapat dicek dan divalidasi secara manual:
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:6px; background:rgba(255,255,255,0.7); padding:8px 10px; border-radius:6px; border:1px solid #fef08a;">
          <div>💬 <strong>WhatsApp CS Keuangan:</strong> <a href="https://wa.me/6281234567890" target="_blank" style="color:#006837; font-weight:700; text-decoration:underline;">0812-3456-7890</a></div>
          <div>📞 <strong>Telepon Kantor:</strong> (0274) 375127</div>
          <div>✉️ <strong>Email Keuangan:</strong> keuangan.spmb@smamuh3jogja.sch.id</div>
          <div>🏛️ <strong>Loket Sekolah:</strong> TU Keuangan Kampus Wirobrajan</div>
        </div>
        <div style="margin-top:6px; font-size:0.78rem; color:#78350f;">
          *Harap siapkan Nomor Registrasi (<code>${p.id_pendaftar}</code>) dan foto struk/bukti transaksi untuk mempercepat proses validasi manual oleh bendahara.
        </div>
      </div>

      <p style="margin-bottom:0; font-size:0.88rem;">Wassalamu'alaikum Warahmatullahi Wabarakatuh.</p>
      <br>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:10px; border-top:1px dashed #cbd5e1; padding-top:10px;">
        <div>
          <div style="font-weight:800; color:#006837; font-size:0.88rem;">Panitia SPMB 2026/2027</div>
          <div style="font-size:0.82rem; color:#475569;">SMA Muhammadiyah 3 Yogyakarta</div>
          <div style="font-size:0.75rem; color:#64748b;">Jl. Kapten Piere Tendean No. 58, Wirobrajan, Yogyakarta 55252</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.72rem; color:#94a3b8;">Sistem Otomatisasi SPMB Terintegrasi</div>
          <div style="font-size:0.72rem; font-weight:700; color:#006837;">Sistem Informasi M3 SPMB v7.8</div>
        </div>
      </div>
    </div>
  `;

  // Tombol salin teks email
  const copyBtn = document.getElementById('btn-copy-email-text');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const plainText = `SUBJEK: [SPMB SMA MUHI 3] Pembayaran Formulir Terverifikasi Otomatis — Lanjut ke Tahap Wawancara

Assalamu'alaikum Wr. Wb.
Yth. Calon Siswa Baru: ${p.nama_lengkap},

Alhamdulillah, bukti pembayaran formulir pendaftaran SPMB Anda telah berhasil diverifikasi secara otomatis oleh sistem SPMB SMA Muhammadiyah 3 Yogyakarta. Status pembayaran formulir pendaftaran Anda resmi dinyatakan LUNAS.

INFORMASI PENDAFTARAN RESMI:
• Nama Lengkap: ${p.nama_lengkap}
• Nomor Registrasi: ${p.id_pendaftar}
• NISN: ${p.nisn || '-'}
• Pilihan Jurusan: ${p.biodata?.pilihan_jurusan || 'MIPA'}
• Status Pembayaran: LUNAS (${jenisValidasi})
• Status Tahapan: BERHAK MELANJUTKAN KE TAHAP 04 WAWANCARA

LANGKAH SELANJUTNYA - TAHAP PENILAIAN WAWANCARA:
Silakan masuk ke Portal SPMB menggunakan akun yang telah Anda daftarkan tadi:
• Email Akun: ${toEmail}
• Nomor Registrasi: ${p.id_pendaftar}
• Kata Sandi: Password yang Anda buat saat pendaftaran online

KENDALA SISTEM / BELUM MENERIMA NOTIFIKASI EMAIL?
Apabila pembayaran Anda telah berhasil tetapi belum menerima notifikasi email resmi untuk lanjut ke tahap wawancara, Anda dapat segera menghubungi Admin Keuangan SPMB:
• WhatsApp CS Keuangan: 0812-3456-7890
• Telepon Kantor: (0274) 375127
• Email Keuangan: keuangan.spmb@smamuh3jogja.sch.id
• Loket Sekolah: Ruang Keuangan / TU SMA Muhammadiyah 3 Yogyakarta

Wassalamu'alaikum Wr. Wb.
Panitia SPMB SMA Muhammadiyah 3 Yogyakarta`;
      navigator.clipboard.writeText(plainText).then(() => {
        showKeuanganAlert('📋 Contoh teks email berhasil disalin ke clipboard!', 'info');
      }).catch(() => {
        alert('Teks email siap disalin.');
      });
    };
  }

  document.getElementById('modal-k-email-preview').classList.add('show');
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
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

// ==========================================
// 8. EVENTS ATTACHMENT & TABS
// ==========================================

function attachKeuanganEvents() {
  // Tabs Navigation
  document.getElementById('tab-btn-verifikasi')?.addEventListener('click', () => switchKTab('verifikasi'));
  document.getElementById('tab-btn-uangpangkal')?.addEventListener('click', () => switchKTab('uangpangkal'));
  document.getElementById('tab-btn-rekap')?.addEventListener('click', () => switchKTab('rekap'));
  document.getElementById('tab-btn-audit')?.addEventListener('click', () => switchKTab('audit'));

  // Search & Filter
  document.getElementById('k-search-formulir')?.addEventListener('input', () => renderFormulirTable());
  document.getElementById('k-filter-formulir')?.addEventListener('change', () => renderFormulirTable());

  // Search audit
  document.getElementById('k-search-audit')?.addEventListener('input', () => renderAuditTable());
  document.getElementById('btn-k-refresh-audit')?.addEventListener('click', () => {
    renderAuditTable();
    showKeuanganAlert('🔄 Data riwayat audit log berhasil di-refresh!', 'info');
  });

  // Refresh Top
  document.getElementById('btn-k-refresh')?.addEventListener('click', () => {
    allPendaftar = fetchMergedPendaftar();
    allUangPangkal = fetchUangPangkal();
    updateKeuanganStats();
    renderFormulirTable();
    renderUangPangkalTable();
    renderRekapContent();
    renderAuditTable();
    showKeuanganAlert('🔄 Data berhasil di-refresh dan disinkronkan dari SSoT!', 'info');
  });

  // Modal Detail Close
  document.getElementById('btn-close-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));
  document.getElementById('btn-cancel-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));

  // Modal Edit Close
  document.getElementById('btn-close-edit')?.addEventListener('click', () => closeModalK('modal-k-edit'));
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => closeModalK('modal-k-edit'));

  // Modal Email Preview Close
  document.getElementById('btn-close-email-preview')?.addEventListener('click', () => closeModalK('modal-k-email-preview'));
  document.getElementById('btn-close-email-footer')?.addEventListener('click', () => closeModalK('modal-k-email-preview'));

  // Modal Tolak Close
  document.getElementById('btn-close-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));
  document.getElementById('btn-cancel-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));

  // Confirm Tolak Submit
  document.getElementById('btn-confirm-tolak')?.addEventListener('click', () => {
    if (!pendingTolakId) return;
    const p = allPendaftar.find(x => x.id_pendaftar === pendingTolakId);
    if (p) {
      const alasan = document.getElementById('alasan-k-tolak').value.trim();
      if (!alasan) {
        alert('Harap isi alasan penolakan bukti pembayaran!');
        return;
      }

      const oldStatus = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
      const newStatus = 'ditolak';

      p.pembayaran = Object.assign({}, p.pembayaran, {
        status_pembayaran: newStatus,
        rejected_at: new Date().toISOString(),
        alasan_penolakan: alasan
      });
      p.status_pembayaran = 'DITOLAK';

      // Catat ke Audit Log
      recordAuditLog(
        p.id_pendaftar,
        oldStatus,
        newStatus,
        'manual',
        'Admin Keuangan (Bendahara SPMB)',
        alasan
      );

      saveMergedPendaftar(allPendaftar);
      updateKeuanganStats();
      renderFormulirTable();
      renderRekapContent();
      renderAuditTable();
      closeModalK('modal-k-tolak');
      showKeuanganAlert(`🚫 Pembayaran ${p.nama_lengkap} telah ditolak dengan alasan: "${alasan}"`, 'error');
    }
  });

  // Submit Form Edit Manual
  document.getElementById('form-k-edit')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentEditId) return;

    const p = allPendaftar.find(x => x.id_pendaftar === currentEditId);
    if (!p) return;

    const oldStatus = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    const newStatus = document.getElementById('edit-status').value;
    const newTgl = document.getElementById('edit-tgl').value;
    const newMetode = document.getElementById('edit-metode').value;
    const newRef = document.getElementById('edit-ref').value.trim();
    const newCatatan = document.getElementById('edit-catatan').value.trim();
    const aktor = document.getElementById('edit-aktor').value.trim() || 'Admin Keuangan';
    const alasan = document.getElementById('edit-alasan').value.trim();

    if (!alasan) {
      alert('Harap isi alasan koreksi / perubahan data demi akuntabilitas audit log!');
      return;
    }

    p.pembayaran = Object.assign({}, p.pembayaran, {
      status_pembayaran: newStatus,
      tgl_bayar: newTgl,
      metode_pembayaran: newMetode,
      no_referensi: newRef,
      catatan: newCatatan,
      edited_at: new Date().toISOString(),
      edited_by: aktor,
      alasan_edit: alasan
    });

    if (newStatus === 'lunas_manual') {
      p.pembayaran.validated_at = new Date().toISOString();
      p.pembayaran.validated_by = aktor;
      p.pembayaran.validation_method = 'manual';
      p.status_pembayaran = 'LUNAS';
    } else if (newStatus === 'lunas_otomatis') {
      p.pembayaran.validated_at = p.pembayaran.validated_at || new Date().toISOString();
      p.pembayaran.validated_by = 'Sistem Otomatis';
      p.pembayaran.validation_method = 'automatic_upload';
      p.status_pembayaran = 'LUNAS';
    } else {
      p.status_pembayaran = newStatus.toUpperCase();
    }

    // Catat ke Audit Log jika status berubah atau ada koreksi manual
    recordAuditLog(
      p.id_pendaftar,
      oldStatus,
      newStatus,
      'manual',
      aktor,
      alasan
    );

    saveMergedPendaftar(allPendaftar);
    updateKeuanganStats();
    renderFormulirTable();
    renderRekapContent();
    renderAuditTable();
    closeModalK('modal-k-edit');
    showKeuanganAlert(`✏️ Perubahan pembayaran untuk ${p.nama_lengkap} berhasil disimpan dan dicatat ke audit log!`);
  });

  // Form Uang Pangkal Submit
  document.getElementById('form-k-uangpangkal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('up-id-val').value.trim();
    const nama = document.getElementById('up-nama-val').value.trim();
    const tgl = document.getElementById('up-tgl-val').value;
    const metode = document.getElementById('up-metode-val').value;
    const status = document.getElementById('up-status-val').value;
    const catatan = document.getElementById('up-catatan-val').value.trim();

    const posSeragam = parseFloat(document.getElementById('up-pos-seragam')?.value) || 0;
    const posSPP     = parseFloat(document.getElementById('up-pos-spp')?.value)     || 0;
    const posSarpras = parseFloat(document.getElementById('up-pos-sarpras')?.value) || 0;
    const posKartu   = parseFloat(document.getElementById('up-pos-kartu')?.value)   || 0;
    const totalPosBiaya = posSeragam + posSPP + posSarpras + posKartu;

    if (!id || !nama) {
      showKeuanganAlert('Pilih siswa melalui pencarian terlebih dahulu!', 'error');
      return;
    }
    if (totalPosBiaya <= 0) {
      showKeuanganAlert('Isi minimal satu pos biaya dengan nominal yang valid!', 'error');
      return;
    }

    const newRecord = {
      id: 'UP-' + Date.now(),
      id_pendaftar: id,
      nama: nama,
      jumlah: totalPosBiaya,
      rincian_biaya: {
        seragam_sekolah: posSeragam,
        spp_bulan_pertama: posSPP,
        pengembangan_sarpras: posSarpras,
        kartu_pelajar_asuransi: posKartu,
        total: totalPosBiaya
      },
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
    ['up-pos-seragam', 'up-pos-spp', 'up-pos-sarpras', 'up-pos-kartu'].forEach(pid => {
      const el = document.getElementById(pid);
      if (el) el.value = '';
    });
    const dispEl = document.getElementById('up-total-display');
    if (dispEl) dispEl.textContent = 'Rp 0';
    document.getElementById('up-catatan-val').value = '';

    showKeuanganAlert(`✅ Pelunasan daftar ulang ${nama} (Total: ${formatRupiah(totalPosBiaya)}) berhasil disimpan!`);
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

  // Clear Form Uang Pangkal
  document.getElementById('btn-k-clear-up')?.addEventListener('click', () => {
    document.getElementById('up-cari-input').value = '';
    document.getElementById('up-id-val').value = '';
    document.getElementById('up-nama-val').value = '';
    ['up-pos-seragam', 'up-pos-spp', 'up-pos-sarpras', 'up-pos-kartu'].forEach(pid => {
      const el = document.getElementById(pid);
      if (el) el.value = '';
    });
    const dispEl = document.getElementById('up-total-display');
    if (dispEl) dispEl.textContent = 'Rp 0';
    document.getElementById('up-catatan-val').value = '';
  });

  // Export CSV
  document.getElementById('btn-k-export-csv')?.addEventListener('click', () => {
    const rows = [['No', 'ID Pendaftar', 'Nama Lengkap', 'Status Pembayaran Formulir', 'Jenis Validasi', 'Tgl Validasi', 'Metode', 'Jurusan']];
    allPendaftar.forEach((p, i) => {
      const pay = p.pembayaran || {};
      const status = normalizeStatus(pay.status_pembayaran, pay);
      rows.push([
        i + 1,
        p.id_pendaftar,
        p.nama_lengkap,
        status,
        pay.validation_method || '-',
        pay.validated_at ? formatDate(pay.validated_at) : '-',
        pay.metode_pembayaran || '-',
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

function switchKTab(tab) {
  document.querySelectorAll('.tab-k-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel-k-section').forEach(p => p.classList.remove('active'));

  const btn = document.getElementById(`tab-btn-${tab}`);
  const panel = document.getElementById(`panel-k-${tab}`);

  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');

  if (tab === 'rekap') renderRekapContent();
  if (tab === 'audit') renderAuditTable();
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

/**
 * Global helper: Real-time sum pos biaya daftar ulang
 */
window.keuanganHitungTotal = function() {
  const seragam  = parseFloat(document.getElementById('up-pos-seragam')?.value)  || 0;
  const spp      = parseFloat(document.getElementById('up-pos-spp')?.value)      || 0;
  const sarpras  = parseFloat(document.getElementById('up-pos-sarpras')?.value)  || 0;
  const kartu    = parseFloat(document.getElementById('up-pos-kartu')?.value)    || 0;

  const total = seragam + spp + sarpras + kartu;

  const displayEl = document.getElementById('up-total-display');
  if (displayEl) displayEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
};

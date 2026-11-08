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
let pendingTolakUpId = null;
let currentEditId = null;
let currentEditUpId = null;

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

// Generator Struk / Bukti Transfer Bank Digital (SVG Data URL) untuk Contoh Validasi Otomatis
function generateBuktiTransferDataUrl({
  nama = 'Ahmad Dahlan',
  idPendaftar = 'REG-2026-001',
  nisn = '0051234567',
  bank = 'Transfer Bank BSI',
  noRef = 'TRX-BSI-20261005-992101',
  waktu = '05 Okt 2026, 08:04 WIB',
  nominal = 'Rp 200.000',
  isRejected = false
} = {}) {
  const safeNama = String(nama).replace(/[<>&"']/g, '');
  const safeId = String(idPendaftar).replace(/[<>&"']/g, '');
  const safeNisn = String(nisn).replace(/[<>&"']/g, '');
  const safeBank = String(bank).replace(/[<>&"']/g, '');
  const safeRef = String(noRef).replace(/[<>&"']/g, '');
  const safeWaktu = String(waktu).replace(/[<>&"']/g, '');
  const safeNominal = String(nominal).replace(/[<>&"']/g, '');

  const headerColor = isRejected ? '#b91c1c' : (safeBank.includes('Muamalat') ? '#581c87' : (safeBank.includes('BPD') ? '#0369a1' : '#006837'));
  const accentColor = isRejected ? '#ef4444' : '#10b981';
  const statusTitle = isRejected ? 'NOMINAL TIDAK SESUAI / BURAM' : 'TRANSAKSI TRANSFER BERHASIL';
  const stampText = isRejected ? 'DITOLAK VERIFIKASI' : 'VALIDASI OTOMATIS OK';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="620" viewBox="0 0 520 620">
    <defs>
      <linearGradient id="hdrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${headerColor}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="520" height="620" rx="18" fill="#f1f5f9"/>
    <rect x="16" y="16" width="488" height="588" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="16" y="16" width="488" height="108" rx="14" fill="url(#hdrGrad)"/>
    <text x="40" y="54" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeBank.toUpperCase()}</text>
    <text x="40" y="78" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Bukti Pembayaran Digital Formulir SPMB SMA Muh 3 Yogyakarta</text>
    <rect x="40" y="90" width="215" height="22" rx="11" fill="rgba(255,255,255,0.18)"/>
    <text x="52" y="105" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#a7f3d0">${statusTitle}</text>

    <rect x="40" y="144" width="440" height="82" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.5"/>
    <text x="60" y="170" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="600" fill="#15803d">TOTAL NOMINAL PEMBAYARAN FORMULIR</text>
    <text x="60" y="206" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="28" font-weight="800" fill="#006837">${safeNominal}</text>
    <rect x="330" y="164" width="130" height="34" rx="8" fill="${accentColor}"/>
    <text x="395" y="186" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11" font-weight="800" fill="#ffffff">${stampText}</text>

    <line x1="40" y1="248" x2="480" y2="248" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6,4"/>

    <text x="40" y="280" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">No. Referensi Bank</text>
    <text x="480" y="280" text-anchor="end" font-family="monospace" font-size="13" fill="#0f172a" font-weight="700">${safeRef}</text>

    <text x="40" y="314" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Waktu Transaksi</text>
    <text x="480" y="314" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12.5" fill="#0f172a" font-weight="700">${safeWaktu}</text>

    <text x="40" y="348" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Nama Calon Siswa</text>
    <text x="480" y="348" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" fill="#0f172a" font-weight="800">${safeNama}</text>

    <text x="40" y="382" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">ID Pendaftar / NISN</text>
    <text x="480" y="382" text-anchor="end" font-family="monospace" font-size="12.5" fill="#006837" font-weight="700">${safeId} / ${safeNisn}</text>

    <text x="40" y="416" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Rekening Tujuan</text>
    <text x="480" y="416" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12.5" fill="#0f172a" font-weight="700">Panitia SPMB SMA Muh 3 Yk</text>

    <text x="40" y="450" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">No. Rekening Tujuan</text>
    <text x="480" y="450" text-anchor="end" font-family="monospace" font-size="12.5" fill="#0f172a" font-weight="700">7192-8391-02 (VA SPMB M3)</text>

    <text x="40" y="484" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Berita Transfer</text>
    <text x="480" y="484" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155" font-weight="600">Formulir SPMB ${safeId}</text>

    <line x1="40" y1="510" x2="480" y2="510" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6,4"/>

    <rect x="40" y="528" width="440" height="54" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
    <text x="260" y="550" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11.5" font-weight="700" fill="#1d4ed8">⚡ Bukti Pembayaran Digital Terdeteksi &amp; Tervalidasi Otomatis</text>
    <text x="260" y="569" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="#475569">Sistem Informasi SPMB Terpadu — SMA Muhammadiyah 3 Yogyakarta</text>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Cek ketersediaan bukti pembayaran aktual hasil unggahan digital
function hasRealProofUploaded(p) {
  if (!p) return false;
  const bayar = p.pembayaran || {};
  const berkasBayar = p.berkas?.bukti_bayar || {};

  const fileDataUrl = bayar.file_data_url || berkasBayar.data_url;
  const fileName = bayar.file_bukti || berkasBayar.nama_file;

  // 1. Ada data URL Base64 / SVG yang valid
  if (fileDataUrl && typeof fileDataUrl === 'string' && fileDataUrl.startsWith('data:')) {
    return true;
  }

  // 2. Ada nama file bukti spesifik (bukan placeholder kosong)
  if (fileName && typeof fileName === 'string') {
    const clean = fileName.trim().toLowerCase();
    const invalidPlaceholders = ['bukti_bayar.png', 'bukti_transfer.jpg', 'null', 'undefined', '', 'none'];
    if (!invalidPlaceholders.includes(clean) && (clean.startsWith('bukti_') || clean.startsWith('struk_') || clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.pdf') || clean.endsWith('.svg'))) {
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
        alasan: 'Validasi otomatis berhasil: Bukti transfer Bank BSI (Bukti_Transfer_BSI_0051234567.svg) terverifikasi'
      },
      {
        id: 'LOG-INIT-002',
        id_pendaftar: 'REG-2026-003',
        status_lama: 'pending',
        status_baru: 'lunas_otomatis',
        jenis_perubahan: 'otomatis',
        aktor: 'Sistem Otomatis',
        waktu: '2026-10-05T10:35:00Z',
        alasan: 'Validasi otomatis berhasil: Bukti transfer Bank Muamalat (Bukti_Transfer_Muamalat_2345678901.svg) terverifikasi'
      },
      {
        id: 'LOG-INIT-003',
        id_pendaftar: 'REG-2026-006',
        status_lama: 'pending',
        status_baru: 'lunas_otomatis',
        jenis_perubahan: 'otomatis',
        aktor: 'Sistem Otomatis',
        waktu: '2026-10-05T12:05:00Z',
        alasan: 'Validasi otomatis berhasil: Bukti QRIS BPD DIY Syariah (Bukti_QRIS_BPD_DIY_0053456789.svg) terverifikasi'
      },
      {
        id: 'LOG-INIT-004',
        id_pendaftar: 'REG-2026-007',
        status_lama: 'pending',
        status_baru: 'lunas_manual',
        jenis_perubahan: 'manual',
        aktor: 'Admin Keuangan (Bendahara Loket)',
        waktu: '2026-10-06T09:20:00Z',
        alasan: 'Pembayaran tunai diterima langsung di loket sekolah'
      },
      {
        id: 'LOG-INIT-005',
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
    if (pay.idempotency_token === currentToken && norm === 'lunas_otomatis') {
      return;
    }

    // Jangan menimpa status yang sudah ditolak atau diverifikasi manual oleh admin bendahara
    if (norm === 'ditolak' || norm === 'lunas_manual') {
      return;
    }

    // Jika statusnya pending, menunggu bukti, atau belum lunas_otomatis, jalankan auto-validasi
    if (norm === 'pending' || norm === 'pending_verification' || norm === 'menunggu_bukti' || norm === 'belum_bayar' || norm === 'lunas_otomatis' || !pay.status_pembayaran) {
      const oldStatus = (norm === 'lunas_otomatis') ? 'pending' : (norm || 'pending');
      const newStatus = 'lunas_otomatis';

      p.pembayaran = Object.assign({}, p.pembayaran, {
        status_pembayaran: newStatus,
        validated_at: pay.validated_at || new Date().toISOString(),
        validated_by: 'Sistem Otomatis',
        validation_method: 'automatic_upload',
        validation_type: 'otomatis',
        catatan_validasi: pay.catatan_validasi || 'Validasi administrasi bukti bayar berhasil via unggahan berkas digital',
        idempotency_token: currentToken,
        email_preview_ready: true
      });

      // Status pendaftar utama di SSoT menjadi LUNAS agar Modul 04 Wawancara langsung membaca
      p.status_pembayaran = 'LUNAS';

      // Catat ke Audit Log persisten jika belum tercatat untuk pendaftar ini
      const existingLogs = getAuditLogs();
      if (!existingLogs.some(l => l.id_pendaftar === p.id_pendaftar && l.status_baru === 'lunas_otomatis')) {
        recordAuditLog(
          p.id_pendaftar,
          oldStatus,
          newStatus,
          'otomatis',
          'Sistem Otomatis',
          `Unggahan bukti pembayaran digital (${uploadIdentifier}) lolos verifikasi otomatis`
        );
      }

      changed = true;
    }
  });

  return changed;
}

// ==========================================
// 4. DATA PERSISTENCE & SSoT INTEGRATION
// ==========================================

function getSeedDemoPendaftar() {
  return [
    {
      id_pendaftar: "REG-2026-001",
      nama_lengkap: "Ahmad Dahlan",
      email: "ahmad.dahlan@gmail.com",
      no_wa: "081234567891",
      nisn: "0051234567",
      status_akun: "active",
      created_at: "2026-10-05T08:00:00Z",
      biodata: { asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Kiai Suja" },
      status_pembayaran: "LUNAS",
      pembayaran: {
        file_bukti: "Bukti_Transfer_BSI_0051234567.svg",
        file_data_url: generateBuktiTransferDataUrl({
          nama: "Ahmad Dahlan",
          idPendaftar: "REG-2026-001",
          nisn: "0051234567",
          bank: "Transfer Bank BSI (BSI Mobile)",
          noRef: "TRX-BSI-20261005-992101",
          waktu: "05 Okt 2026, 08:04 WIB",
          nominal: "Rp 200.000"
        }),
        status_pembayaran: "lunas_otomatis",
        uploaded_at: "2026-10-05T08:04:12Z",
        validated_at: "2026-10-05T08:05:00Z",
        validated_by: "Sistem Otomatis",
        validation_method: "automatic_upload",
        validation_type: "otomatis",
        tgl_bayar: "2026-10-05",
        catatan_validasi: "Validasi administrasi bukti bayar berhasil via unggahan berkas digital",
        idempotency_token: "REG-2026-001_Bukti_Transfer_BSI_0051234567.svg_2026-10-05T08:04:12Z",
        metode_pembayaran: "Transfer Bank BSI",
        no_referensi: "TRX-BSI-20261005-992101",
        email_preview_ready: true
      }
    },
    {
      id_pendaftar: "REG-2026-002",
      nama_lengkap: "Budi Santoso",
      email: "budi.santoso@gmail.com",
      no_wa: "081234567890",
      nisn: "1234567890",
      status_akun: "active",
      created_at: "2026-10-05T09:15:00Z",
      biodata: { asal_sekolah: "SMP Negeri 1 Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Siti Aminah" },
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
      email: "siti.nurhaliza@gmail.com",
      no_wa: "082345678901",
      nisn: "2345678901",
      status_akun: "active",
      created_at: "2026-10-05T10:30:00Z",
      biodata: { asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta", pilihan_jurusan: "IPS", nama_orang_tua: "Eko Prasetyo" },
      status_pembayaran: "LUNAS",
      pembayaran: {
        file_bukti: "Bukti_Transfer_Muamalat_2345678901.svg",
        file_data_url: generateBuktiTransferDataUrl({
          nama: "Siti Nurhaliza",
          idPendaftar: "REG-2026-003",
          nisn: "2345678901",
          bank: "Transfer Bank Muamalat (Muamalat DIN)",
          noRef: "TRX-BMI-20261005-448120",
          waktu: "05 Okt 2026, 10:33 WIB",
          nominal: "Rp 200.000"
        }),
        status_pembayaran: "lunas_otomatis",
        uploaded_at: "2026-10-05T10:33:20Z",
        validated_at: "2026-10-05T10:35:00Z",
        validated_by: "Sistem Otomatis",
        validation_method: "automatic_upload",
        validation_type: "otomatis",
        tgl_bayar: "2026-10-05",
        catatan_validasi: "Validasi administrasi bukti bayar berhasil via unggahan berkas digital",
        idempotency_token: "REG-2026-003_Bukti_Transfer_Muamalat_2345678901.svg_2026-10-05T10:33:20Z",
        metode_pembayaran: "Transfer Bank Muamalat",
        no_referensi: "TRX-BMI-20261005-448120",
        email_preview_ready: true
      }
    },
    {
      id_pendaftar: "REG-2026-004",
      nama_lengkap: "Rizky Ramadhan",
      email: "rizky.ramadhan@gmail.com",
      no_wa: "083456789012",
      nisn: "3456789012",
      status_akun: "active",
      created_at: "2026-10-06T11:00:00Z",
      biodata: { asal_sekolah: "MTs Muallimin Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "H. Abdullah" },
      status_pembayaran: "DITOLAK",
      pembayaran: {
        file_bukti: "Bukti_Bayar_3456789012_Buram.svg",
        file_data_url: generateBuktiTransferDataUrl({
          nama: "Rizky Ramadhan",
          idPendaftar: "REG-2026-004",
          nisn: "3456789012",
          bank: "Transfer Bank BSI",
          noRef: "TRX-BSI-20261006-11029",
          waktu: "06 Okt 2026, 11:05 WIB",
          nominal: "Rp 50.000 (Kurang Bayar)",
          isRejected: true
        }),
        status_pembayaran: "ditolak",
        rejected_at: "2026-10-06T14:30:00Z",
        alasan_penolakan: "Bukti transfer buram dan nominal tidak sesuai tarif formulir (Rp 200.000)"
      }
    },
    {
      id_pendaftar: "REG-2026-005",
      nama_lengkap: "Annisa Maharani",
      email: "annisa.maharani@gmail.com",
      no_wa: "084567890123",
      nisn: "4567890123",
      status_akun: "active",
      created_at: "2026-10-07T08:20:00Z",
      biodata: { asal_sekolah: "SMP Muhammadiyah 7 Yogyakarta", pilihan_jurusan: "IPS", nama_orang_tua: "Ir. Hendra" },
      status_pembayaran: "BELUM",
      pembayaran: {
        file_bukti: null,
        file_data_url: null,
        status_pembayaran: "pending"
      }
    },
    {
      id_pendaftar: "REG-2026-006",
      nama_lengkap: "Muhammad Farhan",
      email: "m.farhan@gmail.com",
      no_wa: "081287654321",
      nisn: "0053456789",
      status_akun: "active",
      created_at: "2026-10-05T12:00:00Z",
      biodata: { asal_sekolah: "SMP Negeri 8 Yogyakarta", pilihan_jurusan: "MIPA", nama_orang_tua: "Drs. Fauzi" },
      status_pembayaran: "LUNAS",
      pembayaran: {
        file_bukti: "Bukti_QRIS_BPD_DIY_0053456789.svg",
        file_data_url: generateBuktiTransferDataUrl({
          nama: "Muhammad Farhan",
          idPendaftar: "REG-2026-006",
          nisn: "0053456789",
          bank: "Transfer Bank BPD DIY Syariah (QRIS)",
          noRef: "TRX-BPD-20261005-773190",
          waktu: "05 Okt 2026, 12:03 WIB",
          nominal: "Rp 200.000"
        }),
        status_pembayaran: "lunas_otomatis",
        uploaded_at: "2026-10-05T12:03:40Z",
        validated_at: "2026-10-05T12:05:00Z",
        validated_by: "Sistem Otomatis",
        validation_method: "automatic_upload",
        validation_type: "otomatis",
        tgl_bayar: "2026-10-05",
        catatan_validasi: "Validasi administrasi bukti bayar berhasil via unggahan berkas digital",
        idempotency_token: "REG-2026-006_Bukti_QRIS_BPD_DIY_0053456789.svg_2026-10-05T12:03:40Z",
        metode_pembayaran: "Transfer Bank BPD DIY Syariah",
        no_referensi: "TRX-BPD-20261005-773190",
        email_preview_ready: true
      }
    },
    {
      id_pendaftar: "REG-2026-007",
      nama_lengkap: "Dewi Sartika",
      email: "dewi.sartika@gmail.com",
      no_wa: "087812345678",
      nisn: "0067654321",
      status_akun: "active",
      created_at: "2026-10-06T09:00:00Z",
      biodata: { asal_sekolah: "SMP Muhammadiyah 3 Depok", pilihan_jurusan: "IPS", nama_orang_tua: "Bpk. Sartono" },
      status_pembayaran: "LUNAS",
      pembayaran: {
        file_bukti: null,
        file_data_url: null,
        status_pembayaran: "lunas_manual",
        validated_at: "2026-10-06T09:20:00Z",
        validated_by: "Admin Keuangan (Bendahara Loket)",
        validation_method: "manual_loket",
        validation_type: "manual",
        tgl_bayar: "2026-10-06",
        metode_pembayaran: "Cash / Tunai Loket Sekolah",
        no_referensi: "KWITANSI-LOKET-2026-014",
        catatan_validasi: "Pembayaran tunai diterima langsung di loket sekolah"
      }
    }
  ];
}

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
    if (!id || p.is_bot_suspect || p.security_flag === 'BOT_SUSPECT') return;
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
    if (!id || p.is_bot_suspect || p.security_flag === 'BOT_SUSPECT') return;
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
      if (p.biodata) {
        existing.biodata = Object.assign({}, existing.biodata, p.biodata);
      }
      map.set(id, existing);
    }
  });

  // Pastikan seluruh data contoh (termasuk contoh validasi otomatis yang sudah ada bukti bayar) tersedia & ter-upgrade
  const seedDummies = getSeedDemoPendaftar();
  const isOnePixelPlaceholder = (url) => typeof url === 'string' && url.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB');

  seedDummies.forEach(seed => {
    // Cari baik berdasarkan ID (REG-2026-xxx / SPMB-2026-xxx) maupun nama lengkap agar tidak duplikat dan tetap ter-upgrade
    let matchKey = null;
    for (const [k, val] of map.entries()) {
      if (k === seed.id_pendaftar || (val.nama_lengkap && val.nama_lengkap.toLowerCase() === seed.nama_lengkap.toLowerCase())) {
        matchKey = k;
        break;
      }
    }

    if (!matchKey) {
      map.set(seed.id_pendaftar, seed);
    } else {
      const current = map.get(matchKey);
      const curPay = current.pembayaran || {};

      // Jika seed ini adalah contoh validasi otomatis (sudah ada bukti pembayaran) atau contoh ditolak/manual,
      // lengkapi bukti pembayarannya apabila di localStorage sebelumnya masih kosong atau masih 1x1 pixel
      if (seed.pembayaran?.status_pembayaran === 'lunas_otomatis') {
        const needsProofUpgrade = !hasRealProofUploaded(current) || isOnePixelPlaceholder(curPay.file_data_url) || curPay.file_bukti === 'bukti_bayar_002.png';
        if (needsProofUpgrade && curPay.status_pembayaran !== 'ditolak' && curPay.status_pembayaran !== 'lunas_manual') {
          current.pembayaran = Object.assign({}, seed.pembayaran, {
            file_data_url: generateBuktiTransferDataUrl({
              nama: current.nama_lengkap || seed.nama_lengkap,
              idPendaftar: current.id_pendaftar,
              nisn: current.nisn || seed.nisn,
              bank: seed.pembayaran.metode_pembayaran,
              noRef: seed.pembayaran.no_referensi,
              waktu: seed.pembayaran.uploaded_at ? '05 Okt 2026, 08:04 WIB' : '05 Okt 2026, 10:33 WIB',
              nominal: 'Rp 200.000'
            })
          });
          current.status_pembayaran = 'LUNAS';
        }
      } else if (seed.pembayaran?.status_pembayaran === 'ditolak' && (!curPay.status_pembayaran || curPay.status_pembayaran === 'pending' || isOnePixelPlaceholder(curPay.file_data_url))) {
        current.pembayaran = Object.assign({}, seed.pembayaran);
        current.status_pembayaran = 'DITOLAK';
      } else if (seed.pembayaran?.status_pembayaran === 'lunas_manual' && (!curPay.status_pembayaran || curPay.status_pembayaran === 'pending')) {
        current.pembayaran = Object.assign({}, seed.pembayaran);
        current.status_pembayaran = 'LUNAS';
      } else if (seed.id_pendaftar === 'REG-2026-002' && curPay.file_bukti === 'bukti_bayar_002.png') {
        // Pastikan Budi Santoso menjadi contoh Pending (belum upload bukti bayar) sesuai skenario
        current.pembayaran = {
          file_bukti: null,
          file_data_url: null,
          status_pembayaran: 'pending',
          metode_pembayaran: 'Transfer Bank BSI'
        };
        current.status_pembayaran = 'BELUM';
      }

      if (!current.biodata || current.biodata.asal_sekolah === '-') {
        current.biodata = Object.assign({}, seed.biodata, current.biodata || {});
      }
      map.set(matchKey, current);
    }
  });

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

// Generator Struk Bukti Pembayaran Uang Pangkal (Daftar Ulang) Digital (SVG Data URL)
function generateBuktiUangPangkalDataUrl({
  nama = 'Ahmad Dahlan',
  idPendaftar = 'REG-2026-001',
  nisn = '0051234567',
  bank = 'Transfer Bank BSI',
  noRef = 'TRX-UP-BSI-882101',
  waktu = '20 Okt 2026, 09:12 WIB',
  rincian = { seragam_sekolah: 1850000, spp_bulan_pertama: 750000, pengembangan_sarpras: 4000000, kartu_pelajar_asuransi: 400000 },
  total = 7000000,
  isRejected = false
} = {}) {
  const safeNama = String(nama).replace(/[<>&"']/g, '');
  const safeId = String(idPendaftar).replace(/[<>&"']/g, '');
  const safeNisn = String(nisn).replace(/[<>&"']/g, '');
  const safeBank = String(bank).replace(/[<>&"']/g, '');
  const safeRef = String(noRef).replace(/[<>&"']/g, '');
  const safeWaktu = String(waktu).replace(/[<>&"']/g, '');
  const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  const headerColor = isRejected ? '#b91c1c' : (safeBank.includes('BPD') ? '#0369a1' : (safeBank.includes('Muamalat') ? '#581c87' : '#006837'));
  const badgeColor = isRejected ? '#dc2626' : '#059669';
  const statusBannerText = isRejected ? 'BUKTI TIDAK SESUAI / KURANG BAYAR' : 'PELUNASAN DAFTAR ULANG BERHASIL';
  const stampLabel = isRejected ? 'DITOLAK VERIFIKASI' : 'LUNAS OTOMATIS';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="680" viewBox="0 0 540 680">
    <defs>
      <linearGradient id="upHdr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${headerColor}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="540" height="680" rx="18" fill="#f1f5f9"/>
    <rect x="16" y="16" width="508" height="648" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="16" y="16" width="508" height="110" rx="14" fill="url(#upHdr)"/>
    <text x="40" y="54" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="17" font-weight="800" fill="#ffffff">${safeBank.toUpperCase()}</text>
    <text x="40" y="77" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Bukti Pembayaran Uang Pangkal (Daftar Ulang) SMA Muh 3 Yk</text>
    <rect x="40" y="90" width="265" height="22" rx="11" fill="rgba(255,255,255,0.18)"/>
    <text x="52" y="105" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#a7f3d0">${statusBannerText}</text>

    <rect x="40" y="142" width="460" height="80" rx="10" fill="${isRejected ? '#fef2f2' : '#f0fdf4'}" stroke="${isRejected ? '#fecaca' : '#bbf7d0'}" stroke-width="1.5"/>
    <text x="58" y="168" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11.5" font-weight="700" fill="${isRejected ? '#b91c1c' : '#15803d'}">TOTAL UANG PANGKAL DIBAYARKAN</text>
    <text x="58" y="203" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="26" font-weight="800" fill="${isRejected ? '#b91c1c' : '#006837'}">${fmt(total)}</text>
    <rect x="342" y="162" width="140" height="34" rx="8" fill="${badgeColor}"/>
    <text x="412" y="184" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="800" fill="#ffffff">${stampLabel}</text>

    <text x="40" y="250" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">No. Referensi Transaksi</text>
    <text x="500" y="250" text-anchor="end" font-family="monospace" font-size="13" fill="#0f172a" font-weight="700">${safeRef}</text>

    <text x="40" y="280" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Waktu Pembayaran</text>
    <text x="500" y="280" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12.5" fill="#0f172a" font-weight="700">${safeWaktu}</text>

    <text x="40" y="310" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">Nama Siswa &amp; ID</text>
    <text x="500" y="310" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12.5" fill="#0f172a" font-weight="800">${safeNama} (${safeId})</text>

    <text x="40" y="340" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#64748b" font-weight="600">NISN Siswa</text>
    <text x="500" y="340" text-anchor="end" font-family="monospace" font-size="12.5" fill="#006837" font-weight="700">${safeNisn}</text>

    <line x1="40" y1="362" x2="500" y2="362" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="40" y="388" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="800" fill="#006837">RINCIAN POS BIAYA DAFTAR ULANG:</text>

    <text x="40" y="418" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155">1. Paket Seragam Sekolah (5 Stel Lengkap)</text>
    <text x="500" y="418" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${fmt(rincian.seragam_sekolah)}</text>

    <text x="40" y="448" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155">2. SPP Bulan Pertama (Juli 2026)</text>
    <text x="500" y="448" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${fmt(rincian.spp_bulan_pertama)}</text>

    <text x="40" y="478" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155">3. Infaq Pengembangan Sarana &amp; Prasarana</text>
    <text x="500" y="478" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${fmt(rincian.pengembangan_sarpras)}</text>

    <text x="40" y="508" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155">4. Kartu Pelajar RFID, Tes Bakat &amp; Asuransi</text>
    <text x="500" y="508" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${fmt(rincian.kartu_pelajar_asuransi)}</text>

    <line x1="40" y1="532" x2="500" y2="532" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="40" y="558" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12.5" font-weight="800" fill="#006837">Rekening Tujuan: Bendahara Daftar Ulang SMA Muh 3 Yk</text>

    <rect x="40" y="582" width="460" height="56" rx="10" fill="${isRejected ? '#fef2f2' : '#ecfdf5'}" stroke="${isRejected ? '#fecaca' : '#a7f3d0'}" stroke-width="1.2"/>
    <text x="270" y="605" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11.5" font-weight="800" fill="${isRejected ? '#b91c1c' : '#047857'}">${isRejected ? '🚫 Bukti Uang Pangkal Ditolak — Harap Unggah Ulang Sesuai Tagihan' : '⚡ Bukti Pembayaran Uang Pangkal Terverifikasi Otomatis oleh Sistem'}</text>
    <text x="270" y="624" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="${isRejected ? '#991b1b' : '#065f46'}">Terhubung langsung ke Modul 06 Verifikasi Loket &amp; Modul 08 Basis Data TU</text>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function hasUangPangkalProof(u) {
  if (!u) return false;
  if (u.file_data_url && typeof u.file_data_url === 'string' && u.file_data_url.startsWith('data:')) {
    return true;
  }
  if (u.file_bukti && typeof u.file_bukti === 'string' && u.file_bukti.trim() !== '') {
    return true;
  }
  return false;
}

function getSeedUangPangkal() {
  const stdRincian = {
    seragam_sekolah: 1850000,
    spp_bulan_pertama: 750000,
    pengembangan_sarpras: 4000000,
    kartu_pelajar_asuransi: 400000,
    total: 7000000
  };

  return [
    {
      id: "UP-2026-001",
      id_pendaftar: "REG-2026-001",
      nama: "Ahmad Dahlan",
      nisn: "0051234567",
      jumlah: 7000000,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: "2026-10-20",
      metode: "Transfer Bank BSI",
      no_referensi: "TRX-UP-BSI-882101",
      file_bukti: "Bukti_UangPangkal_BSI_0051234567.svg",
      file_data_url: generateBuktiUangPangkalDataUrl({
        nama: "Ahmad Dahlan",
        idPendaftar: "REG-2026-001",
        nisn: "0051234567",
        bank: "Transfer Bank BSI (BSI Mobile)",
        noRef: "TRX-UP-BSI-882101",
        waktu: "20 Okt 2026, 09:12 WIB",
        rincian: stdRincian,
        total: 7000000
      }),
      status: "lunas_otomatis",
      validation_type: "otomatis",
      validated_by: "Sistem Otomatis",
      validated_at: "2026-10-20T09:12:30Z",
      catatan: "Pelunasan penuh via transfer digital — otomatis tervalidasi karena sudah ada bukti bayar"
    },
    {
      id: "UP-2026-002",
      id_pendaftar: "REG-2026-003",
      nama: "Siti Nurhaliza",
      nisn: "2345678901",
      jumlah: 7000000,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: "2026-10-21",
      metode: "Transfer Bank BPD DIY Syariah",
      no_referensi: "TRX-UP-BPD-551920",
      file_bukti: "Bukti_UangPangkal_BPD_2345678901.svg",
      file_data_url: generateBuktiUangPangkalDataUrl({
        nama: "Siti Nurhaliza",
        idPendaftar: "REG-2026-003",
        nisn: "2345678901",
        bank: "Transfer Bank BPD DIY Syariah",
        noRef: "TRX-UP-BPD-551920",
        waktu: "21 Okt 2026, 10:40 WIB",
        rincian: stdRincian,
        total: 7000000
      }),
      status: "lunas_otomatis",
      validation_type: "otomatis",
      validated_by: "Sistem Otomatis",
      validated_at: "2026-10-21T10:41:00Z",
      catatan: "Unggahan bukti transfer BPD DIY Syariah Rp 7.000.000 — otomatis tervalidasi sistem"
    },
    {
      id: "UP-2026-003",
      id_pendaftar: "REG-2026-007",
      nama: "Dewi Sartika",
      nisn: "0067654321",
      jumlah: 7000000,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: "2026-10-22",
      metode: "Cash / Tunai Loket Sekolah",
      no_referensi: "KWITANSI-UP-LOKET-009",
      file_bukti: null,
      file_data_url: null,
      status: "lunas_manual",
      validation_type: "manual",
      validated_by: "Admin Keuangan (Bendahara Loket)",
      validated_at: "2026-10-22T11:15:00Z",
      catatan: "Pembayaran tunai daftar ulang diterima & disahkan manual di loket keuangan sekolah"
    },
    {
      id: "UP-2026-004",
      id_pendaftar: "REG-2026-006",
      nama: "Muhammad Farhan",
      nisn: "0053456789",
      jumlah: 0,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: null,
      metode: "Menunggu Pembayaran / Upload Bukti",
      no_referensi: null,
      file_bukti: null,
      file_data_url: null,
      status: "pending",
      validation_type: null,
      validated_by: null,
      validated_at: null,
      catatan: "Belum mengunggah bukti pembayaran uang pangkal (Status Pending)"
    },
    {
      id: "UP-2026-005",
      id_pendaftar: "REG-2026-002",
      nama: "Budi Santoso",
      nisn: "1234567890",
      jumlah: 0,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: null,
      metode: "Menunggu Pembayaran / Upload Bukti",
      no_referensi: null,
      file_bukti: null,
      file_data_url: null,
      status: "pending",
      validation_type: null,
      validated_by: null,
      validated_at: null,
      catatan: "Belum ada bukti bayar uang pangkal — menunggu upload bukti digital atau bayar di loket"
    },
    {
      id: "UP-2026-006",
      id_pendaftar: "REG-2026-005",
      nama: "Annisa Maharani",
      nisn: "4567890123",
      jumlah: 3500000,
      tagihan_total: 7000000,
      rincian_biaya: {
        seragam_sekolah: 1850000,
        spp_bulan_pertama: 750000,
        pengembangan_sarpras: 500000,
        kartu_pelajar_asuransi: 400000,
        total: 3500000
      },
      tgl_bayar: "2026-10-23",
      metode: "Cash / Tunai Loket Sekolah",
      no_referensi: "KWITANSI-UP-CICILAN-012",
      file_bukti: null,
      file_data_url: null,
      status: "cicilan",
      validation_type: "manual",
      validated_by: "Admin Keuangan (Bendahara Loket)",
      validated_at: "2026-10-23T13:20:00Z",
      catatan: "Angsuran ke-1 di loket sekolah (Rp 3.500.000 dari Rp 7.000.000) — disahkan manual bendahara"
    },
    {
      id: "UP-2026-007",
      id_pendaftar: "REG-2026-004",
      nama: "Rizky Ramadhan",
      nisn: "3456789012",
      jumlah: 0,
      tagihan_total: 7000000,
      rincian_biaya: { ...stdRincian },
      tgl_bayar: "2026-10-22",
      metode: "Transfer Bank BSI",
      no_referensi: "TRX-UP-BSI-11029",
      file_bukti: "Bukti_UangPangkal_3456789012_Buram.svg",
      file_data_url: generateBuktiUangPangkalDataUrl({
        nama: "Rizky Ramadhan",
        idPendaftar: "REG-2026-004",
        nisn: "3456789012",
        bank: "Transfer Bank BSI",
        noRef: "TRX-UP-BSI-11029",
        waktu: "22 Okt 2026, 14:10 WIB",
        rincian: {
          seragam_sekolah: 500000,
          spp_bulan_pertama: 0,
          pengembangan_sarpras: 0,
          kartu_pelajar_asuransi: 0,
          total: 500000
        },
        total: 500000,
        isRejected: true
      }),
      status: "ditolak",
      validation_type: "manual",
      validated_by: "Admin Keuangan (Bendahara SPMB)",
      rejected_at: "2026-10-22T15:00:00Z",
      alasan_penolakan: "Bukti transfer terpotong/buram dan nominal tidak sesuai rincian pos daftar ulang",
      catatan: "Ditolak: Bukti transfer terpotong/buram dan nominal tidak sesuai rincian pos daftar ulang"
    }
  ];
}

function processAutoValidationUangPangkal(upList) {
  let changed = false;
  upList.forEach(u => {
    const hasProof = hasUangPangkalProof(u);
    if (u.status === 'ditolak' || u.status === 'lunas_manual' || u.status === 'cicilan') {
      return;
    }
    if (hasProof && (u.status === 'pending' || u.status === 'lunas' || !u.status)) {
      u.status = 'lunas_otomatis';
      u.validation_type = 'otomatis';
      u.validated_by = 'Sistem Otomatis';
      u.validated_at = u.validated_at || new Date().toISOString();
      if (!u.jumlah || u.jumlah <= 0) {
        u.jumlah = u.tagihan_total || u.rincian_biaya?.total || 7000000;
      }
      changed = true;
    } else if (!hasProof && u.status === 'lunas') {
      u.status = 'lunas_manual';
      u.validation_type = 'manual';
      u.validated_by = u.validated_by || 'Admin Keuangan (Bendahara Loket)';
      changed = true;
    }
  });
  return changed;
}

function fetchUangPangkal() {
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UANG_PANGKAL);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    list = [];
  }

  // Pastikan seluruh contoh Uang Pangkal (Otomatis dengan bukti bayar, Manual Loket, Pending, Cicilan, Ditolak) tersedia
  const seeds = getSeedUangPangkal();
  let modified = false;

  seeds.forEach(seed => {
    const idx = list.findIndex(item => item.id === seed.id || item.id_pendaftar === seed.id_pendaftar);
    if (idx === -1) {
      list.push(seed);
      modified = true;
    } else {
      // Upgrade data lama jika belum memiliki properti bukti/status baru
      if (seed.status === 'lunas_otomatis' && !hasUangPangkalProof(list[idx])) {
        list[idx] = Object.assign({}, seed, list[idx], {
          file_bukti: seed.file_bukti,
          file_data_url: seed.file_data_url,
          status: 'lunas_otomatis',
          validation_type: 'otomatis',
          validated_by: 'Sistem Otomatis',
          validated_at: list[idx].validated_at || seed.validated_at,
          no_referensi: list[idx].no_referensi || seed.no_referensi
        });
        modified = true;
      }
    }
  });

  if (processAutoValidationUangPangkal(list)) {
    modified = true;
  }

  if (modified) {
    saveUangPangkal(list);
  }

  return list;
}

function saveUangPangkal(data) {
  try {
    localStorage.setItem(STORAGE_KEY_UANG_PANGKAL, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving spmb_uang_pangkal_db:', e);
  }

  // Sinkronisasi status Uang Pangkal ke SSoT (m3_spmb_tu_db) agar Modul 06 Loket & Modul 08 TU terhubung
  try {
    const dbObj = db.get();
    if (dbObj && Array.isArray(dbObj.pendaftar)) {
      let dbChanged = false;
      data.forEach(u => {
        const idx = dbObj.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === u.id_pendaftar);
        if (idx !== -1) {
          dbObj.pendaftar[idx].uang_pangkal = {
            id_transaksi: u.id,
            status: u.status,
            jumlah_dibayar: u.jumlah,
            tagihan_total: u.tagihan_total || 7000000,
            metode: u.metode,
            no_referensi: u.no_referensi,
            tgl_bayar: u.tgl_bayar,
            validated_by: u.validated_by,
            validated_at: u.validated_at,
            rincian_biaya: u.rincian_biaya
          };
          dbChanged = true;
        }
      });
      if (dbChanged) db.save(dbObj);
    }
  } catch (e) {
    console.error('Error syncing Uang Pangkal to SSoT:', e);
  }
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

            <!-- Showcase Interaktif: Contoh Validasi Otomatis (Sudah Ada Bukti Pembayaran) -->
            <div id="k-auto-validation-showcase" style="margin-bottom: 1.35rem;"></div>

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
        <!-- Showcase Contoh Validasi Uang Pangkal: Otomatis, Pending & Manual -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 class="card-title" style="margin:0;">🏫 Validasi & Kelola Uang Pangkal (Daftar Ulang — Standar Rp 7.000.000)</h3>
              <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--text-muted, #64748b);">
                Dapat dikelola penuh seperti Uang Administrasi: <strong>⚡ Validasi Otomatis</strong>, <strong>⏳ Pending</strong>, <strong>✅ Validasi Manual</strong>, <strong>✏️ Edit Pos Biaya & Status</strong>, <strong>🚫 Tolak Bukti</strong>, dan <strong>📧 Contoh Email</strong>.
              </p>
            </div>
            <span class="badge badge-info" style="font-size:0.75rem;">Terintegrasi Modul 06 Loket & Modul 08 TU</span>
          </div>
          <div class="card-body">
            <!-- Banner Petunjuk Kelola Uang Pangkal (Setara Uang Administrasi) -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 1.25rem; box-shadow: 0 2px 6px rgba(0,104,55,0.06);">
              <div style="font-weight: 800; color: #006837; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                <span>🏫</span>
                <span>Tata Kelola Uang Pangkal (Daftar Ulang): Otomatis, Manual, Edit Rincian Pos, Tolak & Email</span>
              </div>
              <ul style="margin: 6px 0 0 1.2rem; padding: 0; font-size: 0.82rem; color: #334155; line-height: 1.55;">
                <li><strong>Validasi Otomatis:</strong> Siswa yang sudah mengunggah bukti transfer daftar ulang otomatis disahkan menjadi <strong><code>⚡ Lunas — Validasi Otomatis</code></strong>.</li>
                <li><strong>Status Pending & Cicilan:</strong> Siswa yang belum mengunggah bukti berstatus <strong><code>⏳ Pending</code></strong>, dan siswa yang membayar bertahap berstatus <strong><code>🔄 Cicilan</code></strong>.</li>
                <li><strong>Kewenangan Kelola Penuh Admin Keuangan:</strong> Setiap baris dilengkapi aksi <strong style="color:#0f172a;">🔍 Detail</strong>, <strong style="color:#1d4ed8;">✏️ Edit</strong> (koreksi status, 4 pos biaya, metode & resi), <strong style="color:#006837;">✅ Validasi</strong> (pengesahan loket manual), <strong style="color:#dc2626;">🚫 Tolak</strong> (tolak bukti + alasan), serta <strong style="color:#1d4ed8;">📧 Contoh Email</strong> (bukti pelunasan daftar ulang & pengambilan seragam Modul 06).</li>
              </ul>
            </div>

            <!-- Showcase Kartu Contoh Uang Pangkal (Otomatis, Manual, Pending) -->
            <div id="k-up-showcase" style="margin-bottom: 1.25rem;"></div>

            <!-- Toolbar Search & Filter Uang Pangkal -->
            <div class="toolbar-k">
              <div style="flex: 1; min-width: 240px;">
                <input type="text" id="k-search-up" class="form-control" placeholder="Cari nama siswa, ID pendaftar, metode, atau no referensi...">
              </div>
              <select id="k-filter-up" class="form-control" style="width: auto; min-width: 240px;">
                <option value="">Semua Status Uang Pangkal</option>
                <option value="lunas_otomatis">⚡ Lunas — Validasi Otomatis (Ada Bukti)</option>
                <option value="lunas_manual">✅ Lunas — Validasi Manual (Loket)</option>
                <option value="pending">⏳ Pending (Belum Upload Bukti)</option>
                <option value="cicilan">🔄 Cicilan / Angsuran</option>
                <option value="ditolak">🚫 Ditolak</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table" style="width: 100%;">
                <thead>
                  <tr>
                    <th style="width: 36px;">#</th>
                    <th>ID Pendaftar</th>
                    <th>Nama Siswa</th>
                    <th>Tanggal</th>
                    <th>Jumlah Dibayar / Tagihan</th>
                    <th>Metode & Ref</th>
                    <th>Bukti Pembayaran</th>
                    <th>Status Validasi</th>
                    <th style="text-align: center; min-width: 295px;">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody id="k-tbody-uangpangkal">
                  <!-- Rendered via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Form Catat / Tambah Pelunasan Uang Pangkal Manual / Baru -->
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 class="card-title" style="margin:0;">➕ Input / Catat Pembayaran Uang Pangkal Baru</h3>
              <p style="margin:2px 0 0 0; font-size:0.78rem; color:var(--text-muted, #64748b);">
                Gunakan formulir ini untuk mencatat pembayaran loket manual, menambahkan data bukti digital otomatis, atau mendaftarkan tagihan pending.
              </p>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-secondary" id="btn-k-fill-std-up" style="font-size: 0.78rem; background:#f0fdf4; color:#006837; border:1px solid #bbf7d0; font-weight:700;">⚡ Isi Standar Rp 7.000.000</button>
              <button type="button" class="btn btn-secondary" id="btn-k-clear-up" style="font-size: 0.78rem;">🗑 Bersihkan Form</button>
            </div>
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
                    <option value="Cash / Tunai Loket Sekolah">Cash / Tunai Loket Sekolah</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="up-status-val">Jenis & Status Validasi</label>
                  <select id="up-status-val" class="form-control">
                    <option value="lunas_manual">✅ Lunas — Validasi Manual (Loket Sekolah)</option>
                    <option value="lunas_otomatis">⚡ Lunas — Validasi Otomatis (Ada Bukti Digital)</option>
                    <option value="pending">⏳ Pending (Belum Ada Bukti Pembayaran)</option>
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

    <!-- Modal Edit Uang Pangkal (Kewenangan Admin Keuangan) -->
    <div class="modal-k-overlay" id="modal-k-edit-up">
      <div class="modal-k-box" style="max-width: 720px;">
        <div class="modal-k-header">
          <div class="modal-k-title">✏️ Koreksi & Edit Manual Data Uang Pangkal (Daftar Ulang)</div>
          <button class="modal-close-btn" id="btn-close-edit-up">&times;</button>
        </div>
        <div class="modal-k-body">
          <div class="notice-admin">
            <strong>🔒 Hak Akses Admin Keuangan:</strong> Anda dapat mengelola penuh status, metode, nomor referensi, serta 4 rincian pos biaya Uang Pangkal. Seluruh perubahan dicatat ke Audit Log dan disinkronkan ke SSoT.
          </div>
          <form id="form-k-edit-up" autocomplete="off">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label>ID Pendaftar (Terkunci)</label>
                <input type="text" id="edit-up-id-pendaftar" class="form-control" readonly style="background:#f1f5f9; font-weight:700;">
              </div>
              <div class="form-group">
                <label>Nama Siswa (Terkunci)</label>
                <input type="text" id="edit-up-nama" class="form-control" readonly style="background:#f1f5f9; font-weight:700;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label for="edit-up-status">Status Uang Pangkal <span style="color:red">*</span></label>
                <select id="edit-up-status" class="form-control" required>
                  <option value="lunas_manual">✅ Lunas — Validasi Manual (Loket Sekolah)</option>
                  <option value="lunas_otomatis">⚡ Lunas — Validasi Otomatis (Bukti Digital)</option>
                  <option value="cicilan">🔄 Cicilan / Angsuran</option>
                  <option value="pending">⏳ Pending (Belum Upload Bukti)</option>
                  <option value="ditolak">🚫 Ditolak (Bukti Tidak Sesuai)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-up-tgl">Tanggal Pembayaran</label>
                <input type="date" id="edit-up-tgl" class="form-control">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label for="edit-up-metode">Metode Pembayaran</label>
                <select id="edit-up-metode" class="form-control">
                  <option value="Cash / Tunai Loket Sekolah">Cash / Tunai Loket Sekolah</option>
                  <option value="Transfer Bank BSI">Transfer Bank BSI (Bank Syariah Indonesia)</option>
                  <option value="Transfer Bank BPD DIY Syariah">Transfer Bank BPD DIY Syariah</option>
                  <option value="Transfer Bank Muamalat">Transfer Bank Muamalat</option>
                  <option value="Menunggu Pembayaran / Upload Bukti">Menunggu Pembayaran / Upload Bukti</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-up-ref">No. Referensi / Kwitansi Loket</label>
                <input type="text" id="edit-up-ref" class="form-control" placeholder="Contoh: KWITANSI-UP-LOKET-009 / TRX-UP-BSI-882101">
              </div>
            </div>

            <!-- Rincian 4 Pos Biaya Daftar Ulang di Modal Edit -->
            <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:12px 14px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <span style="font-size:0.84rem; font-weight:800; color:#006837;">🧾 Kelola Rincian 4 Pos Biaya Uang Pangkal:</span>
                <button type="button" class="btn btn-secondary" id="btn-edit-up-std" style="font-size:0.74rem; padding:3px 9px; background:#ffffff; color:#006837; border:1px solid #86efac; font-weight:700;">
                  ⚡ Set Standar Rp 7.000.000
                </button>
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:8px;">
                <div>
                  <label style="font-size:0.75rem; font-weight:600; color:#334155;">1. Paket Seragam Sekolah (5 Stel)</label>
                  <input type="number" id="edit-up-seragam" class="form-control" min="0" oninput="window.keuanganHitungEditUpTotal()">
                </div>
                <div>
                  <label style="font-size:0.75rem; font-weight:600; color:#334155;">2. SPP Bulan Pertama (Juli 2026)</label>
                  <input type="number" id="edit-up-spp" class="form-control" min="0" oninput="window.keuanganHitungEditUpTotal()">
                </div>
                <div>
                  <label style="font-size:0.75rem; font-weight:600; color:#334155;">3. Infaq Pengembangan Sarpras</label>
                  <input type="number" id="edit-up-sarpras" class="form-control" min="0" oninput="window.keuanganHitungEditUpTotal()">
                </div>
                <div>
                  <label style="font-size:0.75rem; font-weight:600; color:#334155;">4. Kartu Pelajar RFID & Asuransi</label>
                  <input type="number" id="edit-up-kartu" class="form-control" min="0" oninput="window.keuanganHitungEditUpTotal()">
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed #86efac;">
                <span style="font-size:0.84rem; font-weight:700; color:#006837;">Total Dibayar (Hasil Rincian Pos):</span>
                <span id="edit-up-total-display" style="font-size:1.1rem; font-weight:800; color:#006837;">Rp 0</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="edit-up-catatan">Keterangan / Catatan Pembayaran Uang Pangkal</label>
              <textarea id="edit-up-catatan" class="form-control" rows="2" placeholder="Catatan pelunasan, angsuran, atau dispensasi pembukuan..."></textarea>
            </div>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 8px;">
                <label for="edit-up-aktor">Nama Petugas / Aktor Pengubah <span style="color:red">*</span></label>
                <input type="text" id="edit-up-aktor" class="form-control" value="Admin Keuangan (Bendahara SPMB)" required>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="edit-up-alasan">Alasan Koreksi / Perubahan Data Uang Pangkal <span style="color:red">*</span></label>
                <input type="text" id="edit-up-alasan" class="form-control" placeholder="Contoh: Pelunasan angsuran di loket sekolah / koreksi rincian pos biaya..." required>
              </div>
            </div>

            <div class="modal-k-footer" style="padding:0; background:none; border:none; margin-top:1rem;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-edit-up">Batal</button>
              <button type="submit" class="btn btn-primary" style="background:#006837; color:white;">
                💾 Simpan Perubahan Uang Pangkal & Catat Audit Log
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
          <div class="modal-k-title" style="color:#006837;" id="prev-email-modal-title">
            📧 Contoh Tampilan & Pratinjau Email Resmi SPMB
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
  renderAutoValidationShowcase();
  renderFormulirTable();
  renderUangPangkalShowcase();
  renderUangPangkalTable();
  renderRekapContent();
  renderAuditTable();
  attachKeuanganEvents();
}

// ==========================================
// 6. STATS, AUTO-VALIDATION SHOWCASE & TABLES
// ==========================================

function renderAutoValidationShowcase() {
  const container = document.getElementById('k-auto-validation-showcase');
  if (!container) return;

  // Ambil daftar pendaftar yang berstatus lunas_otomatis & sudah memiliki bukti pembayaran
  const autoValidatedList = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return (st === 'lunas_otomatis' || p.pembayaran?.validation_method === 'automatic_upload') && hasRealProofUploaded(p);
  });

  // Ambil contoh siswa yang masih pending (belum upload bukti) untuk simulasi live
  const pendingList = allPendaftar.filter(p => {
    const st = normalizeStatus(p.pembayaran?.status_pembayaran, p.pembayaran);
    return (st === 'pending' || st === 'pending_verification' || st === 'menunggu_bukti' || st === 'belum_bayar') && !hasRealProofUploaded(p);
  });

  const cardsHtml = autoValidatedList.slice(0, 4).map(p => {
    const pay = p.pembayaran || {};
    const fileName = pay.file_bukti || p.berkas?.bukti_bayar?.nama_file || 'Bukti_Transfer.svg';
    const fileImg = pay.file_data_url || p.berkas?.bukti_bayar?.data_url || '';
    const metode = pay.metode_pembayaran || 'Transfer Bank BSI';
    const noRef = pay.no_referensi || 'TRX-SPMB-AUTO';
    const waktuValid = pay.validated_at ? formatDateTime(pay.validated_at) : 'Baru saja';

    return `
      <div style="background:#ffffff; border:1.5px solid #a7f3d0; border-radius:12px; padding:12px 14px; display:flex; gap:12px; align-items:flex-start; box-shadow:0 2px 8px rgba(5,150,105,0.06); transition:transform 0.18s;">
        <div class="btn-k-showcase-view" data-id="${p.id_pendaftar}" title="Klik untuk memperbesar Bukti Pembayaran" style="width:68px; height:84px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; overflow:hidden; flex-shrink:0; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center;">
          ${
            fileImg
              ? `<img src="${fileImg}" alt="Bukti Bayar ${p.nama_lengkap}" style="width:100%; height:100%; object-fit:cover;">`
              : `<span style="font-size:1.5rem;">🧾</span>`
          }
          <div style="position:absolute; bottom:0; inset-x:0; background:rgba(0,104,55,0.88); color:#fff; font-size:0.62rem; font-weight:700; text-align:center; padding:2px 0;">
            🔍 Struk
          </div>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:800; color:#0f172a; font-size:0.9rem; line-height:1.2;">${p.nama_lengkap}</div>
              <div style="font-size:0.74rem; color:#006837; font-weight:700; font-family:monospace; margin-top:2px;">${p.id_pendaftar} &bull; NISN: ${p.nisn || '-'}</div>
            </div>
            <span class="badge-lunas-auto" style="font-size:0.7rem; padding:2px 8px;">⚡ Lunas Otomatis</span>
          </div>

          <div style="margin-top:6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:5px 8px; font-size:0.74rem; color:#166534; line-height:1.45;">
            <div><strong>📎 Bukti Bayar:</strong> <code style="color:#065f46; font-weight:700;">${fileName}</code></div>
            <div><strong>🏦 Saluran & Ref:</strong> ${metode} (<code style="font-weight:700;">${noRef}</code>)</div>
            <div><strong>⏱️ Disahkan Sistem:</strong> ${waktuValid}</div>
          </div>

          <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-k-showcase-view" data-id="${p.id_pendaftar}" style="padding:4px 9px; font-size:0.74rem; background:#ecfdf5; color:#047857; border:1px solid #6ee7b7; font-weight:700;">
              🖼️ Lihat Bukti Pembayaran
            </button>
            <button type="button" class="btn btn-secondary btn-k-showcase-email" data-id="${p.id_pendaftar}" style="padding:4px 9px; font-size:0.74rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
              📧 Contoh Email Wawancara
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const simButtonHtml = pendingList.length > 0
    ? `<button type="button" id="btn-k-sim-auto-upload" class="btn btn-primary" style="background:#059669; color:#ffffff; font-size:0.78rem; padding:7px 13px; border-radius:8px; font-weight:700; border:none; cursor:pointer; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
         ⚡ Simulasikan Upload Bukti Bayar (${pendingList[0].nama_lengkap}) → Validasi Otomatis
       </button>`
    : `<button type="button" id="btn-k-reset-demo-auto" class="btn btn-secondary" style="font-size:0.76rem; padding:6px 12px; border-radius:8px; font-weight:700;">
         🔄 Reset Contoh Siswa Pending untuk Uji Simulasi
       </button>`;

  container.innerHTML = `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-left: 5px solid #059669; border-radius: 12px; padding: 14px 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
        <div>
          <div style="font-weight:800; color:#065f46; font-size:0.94rem; display:flex; align-items:center; gap:7px;">
            <span>🧾</span>
            <span>Contoh Tervalidasi Otomatis (Sudah Ada Bukti Pembayaran Digital — ${autoValidatedList.length} Siswa)</span>
          </div>
          <div style="font-size:0.79rem; color:#475569; margin-top:2px;">
            Calon siswa di bawah ini <strong>sudah mengunggah bukti pembayaran formulir (Rp 200.000)</strong> sehingga sistem langsung mengesahkan statusnya menjadi <strong>⚡ Lunas — Validasi Otomatis</strong> tanpa menunggu antrean manual.
          </div>
        </div>
        <div>
          ${simButtonHtml}
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap:10px;">
        ${cardsHtml}
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-k-showcase-view').forEach(btn => {
    btn.addEventListener('click', (e) => openDetailModal(e.currentTarget.getAttribute('data-id')));
  });
  container.querySelectorAll('.btn-k-showcase-email').forEach(btn => {
    btn.addEventListener('click', (e) => openEmailPreviewModal(e.currentTarget.getAttribute('data-id')));
  });

  const simBtn = document.getElementById('btn-k-sim-auto-upload');
  if (simBtn && pendingList.length > 0) {
    simBtn.addEventListener('click', () => simulateAutoValidationUpload(pendingList[0].id_pendaftar));
  }

  const resetBtn = document.getElementById('btn-k-reset-demo-auto');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const target = allPendaftar.find(x => x.id_pendaftar === 'REG-2026-002' || x.nama_lengkap === 'Budi Santoso');
      if (target) {
        target.status_pembayaran = 'BELUM';
        target.pembayaran = {
          file_bukti: null,
          file_data_url: null,
          status_pembayaran: 'pending',
          metode_pembayaran: 'Transfer Bank BSI'
        };
        saveMergedPendaftar(allPendaftar);
        updateKeuanganStats();
        renderAutoValidationShowcase();
        renderFormulirTable();
        renderRekapContent();
        showKeuanganAlert('🔄 Status Budi Santoso di-reset ke Pending (Belum Ada Bukti) untuk uji simulasi otomatis.', 'info');
      }
    });
  }
}

function simulateAutoValidationUpload(idPendaftar) {
  const p = allPendaftar.find(x => x.id_pendaftar === idPendaftar);
  if (!p) return;

  const nowIso = new Date().toISOString();
  const refCode = 'TRX-BSI-' + Date.now().toString().slice(-6);
  const fileName = `Bukti_Transfer_BSI_${p.nisn || p.id_pendaftar}.svg`;

  p.pembayaran = Object.assign({}, p.pembayaran, {
    file_bukti: fileName,
    file_data_url: generateBuktiTransferDataUrl({
      nama: p.nama_lengkap,
      idPendaftar: p.id_pendaftar,
      nisn: p.nisn || '1234567890',
      bank: 'Transfer Bank BSI (BSI Mobile)',
      noRef: refCode,
      waktu: formatDateTime(nowIso) + ' WIB',
      nominal: 'Rp 200.000'
    }),
    uploaded_at: nowIso,
    tgl_bayar: nowIso.slice(0, 10),
    metode_pembayaran: 'Transfer Bank BSI',
    no_referensi: refCode,
    status_pembayaran: 'pending'
  });

  // Jalankan engine validasi otomatis karena bukti pembayaran kini sudah ada
  processAutoValidation(allPendaftar);
  saveMergedPendaftar(allPendaftar);

  updateKeuanganStats();
  renderAutoValidationShowcase();
  renderFormulirTable();
  renderRekapContent();
  renderAuditTable();

  showKeuanganAlert(`⚡ Bukti pembayaran ${p.nama_lengkap} (${fileName}) terdeteksi! Status otomatis disahkan menjadi LUNAS — Validasi Otomatis.`);
  openDetailModal(p.id_pendaftar);
}

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

  const countUp = allUangPangkal.filter(u => u.status === 'lunas' || u.status === 'lunas_otomatis' || u.status === 'lunas_manual').length;

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
    const fileName = pay.file_bukti || p.berkas?.bukti_bayar?.nama_file || '';

    let proofBadge = '';
    if (hasProof) {
      proofBadge = `
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:3px;">
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; color:#15803d; font-weight:700; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 8px; border-radius:6px;">
            ✓ Sudah Ada Bukti Bayar
          </span>
          <div style="font-size:0.7rem; color:#475569; max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${fileName}">
            📎 <code>${fileName}</code>
          </div>
          <button type="button" class="btn-k-view-inline" data-id="${p.id_pendaftar}" style="background:none; border:none; padding:0; color:#0284c7; font-size:0.72rem; font-weight:700; cursor:pointer; text-decoration:underline;">
            🖼️ Lihat Struk Pembayaran
          </button>
        </div>
      `;
    } else if (status === 'lunas_manual') {
      proofBadge = `
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; color:#0369a1; font-weight:700; background:#e0f2fe; border:1px solid #bae6fd; padding:2px 8px; border-radius:6px;">
            🏛️ Bayar Tunai di Loket
          </span>
          <span style="font-size:0.7rem; color:#64748b;">Ref: ${pay.no_referensi || 'Kwitansi Loket'}</span>
        </div>
      `;
    } else {
      proofBadge = `
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:#ca8a04; font-weight:700; background:#fefce8; border:1px solid #fef08a; padding:2px 8px; border-radius:6px;">
          ⏳ Belum Upload (Pending)
        </span>
      `;
    }

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
          ${pay.validated_at ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Disahkan: ${formatDate(pay.validated_at)}</div>` : ''}
          ${pay.no_referensi ? `<div style="font-size:0.68rem; color:#006837; font-family:monospace;">Ref: ${pay.no_referensi}</div>` : ''}
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-k-view" data-id="${p.id_pendaftar}" title="Buka Detail & Struk Bukti Pembayaran" style="padding: 4px 7px; font-size: 0.76rem;">
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
  document.querySelectorAll('.btn-k-view, .btn-k-view-inline').forEach(b => b.addEventListener('click', (e) => openDetailModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-edit').forEach(b => b.addEventListener('click', (e) => openEditModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-valid').forEach(b => b.addEventListener('click', (e) => validatePembayaran(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-tolak').forEach(b => b.addEventListener('click', (e) => openTolakModal(e.currentTarget.getAttribute('data-id'))));
  document.querySelectorAll('.btn-k-preview-email').forEach(b => b.addEventListener('click', (e) => openEmailPreviewModal(e.currentTarget.getAttribute('data-id'))));
}

function renderUangPangkalShowcase() {
  const container = document.getElementById('k-up-showcase');
  if (!container) return;

  const autoList = allUangPangkal.filter(u => u.status === 'lunas_otomatis' && hasUangPangkalProof(u));
  const manualList = allUangPangkal.filter(u => u.status === 'lunas_manual' || u.status === 'lunas' || u.status === 'cicilan');
  const pendingList = allUangPangkal.filter(u => u.status === 'pending' && !hasUangPangkalProof(u));

  const autoCards = autoList.slice(0, 2).map(u => `
    <div style="background:#ffffff; border:1.5px solid #a7f3d0; border-radius:10px; padding:10px 12px; display:flex; gap:10px; align-items:flex-start;">
      <div class="btn-up-detail" data-id="${u.id}" title="Klik untuk melihat Struk Uang Pangkal" style="width:58px; height:72px; border-radius:6px; border:1px solid #cbd5e1; overflow:hidden; flex-shrink:0; cursor:pointer; position:relative; background:#f8fafc;">
        <img src="${u.file_data_url}" alt="Struk Uang Pangkal ${u.nama}" style="width:100%; height:100%; object-fit:cover;">
        <div style="position:absolute; bottom:0; inset-x:0; background:rgba(0,104,55,0.88); color:#fff; font-size:0.58rem; font-weight:700; text-align:center;">🔍 Struk</div>
      </div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
          <strong style="font-size:0.86rem; color:#0f172a;">${u.nama}</strong>
          <span class="badge-lunas-auto" style="font-size:0.68rem; padding:2px 7px;">⚡ Otomatis</span>
        </div>
        <div style="font-size:0.72rem; color:#006837; font-family:monospace; font-weight:700;">${u.id_pendaftar} &bull; ${formatRupiah(u.jumlah)}</div>
        <div style="font-size:0.71rem; color:#475569; margin-top:3px;">📎 <code>${u.file_bukti}</code> (${u.metode})</div>
        <button type="button" class="btn btn-secondary btn-up-detail" data-id="${u.id}" style="margin-top:5px; padding:3px 8px; font-size:0.71rem; background:#ecfdf5; color:#047857; border:1px solid #6ee7b7; font-weight:700;">
          🖼️ Lihat Bukti & Rincian Pos
        </button>
      </div>
    </div>
  `).join('');

  const manualCards = manualList.slice(0, 2).map(u => `
    <div style="background:#ffffff; border:1.5px solid #bfdbfe; border-radius:10px; padding:10px 12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
        <strong style="font-size:0.86rem; color:#0f172a;">${u.nama}</strong>
        <span class="badge ${u.status === 'cicilan' ? 'badge-cicilan' : 'badge-lunas'}" style="font-size:0.68rem; padding:2px 7px;">
          ${u.status === 'cicilan' ? '🔄 Cicilan (Manual)' : '✅ Manual (Loket)'}
        </span>
      </div>
      <div style="font-size:0.72rem; color:#1d4ed8; font-family:monospace; font-weight:700; margin-top:2px;">${u.id_pendaftar} &bull; Dibayar: ${formatRupiah(u.jumlah)}</div>
      <div style="font-size:0.71rem; color:#475569; margin-top:3px;">🏛️ ${u.metode} &bull; Ref: <code>${u.no_referensi || 'Kwitansi Loket'}</code></div>
      <button type="button" class="btn btn-secondary btn-up-detail" data-id="${u.id}" style="margin-top:5px; padding:3px 8px; font-size:0.71rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
        🔍 Detail Kwitansi & Rincian Pos
      </button>
    </div>
  `).join('');

  const pendingCards = pendingList.slice(0, 2).map(u => `
    <div style="background:#ffffff; border:1.5px solid #fde68a; border-radius:10px; padding:10px 12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
        <strong style="font-size:0.86rem; color:#0f172a;">${u.nama}</strong>
        <span class="badge-pending" style="font-size:0.68rem; padding:2px 7px;">⏳ Pending</span>
      </div>
      <div style="font-size:0.72rem; color:#b45309; font-family:monospace; font-weight:700; margin-top:2px;">${u.id_pendaftar} &bull; Tagihan: ${formatRupiah(u.tagihan_total || 7000000)}</div>
      <div style="font-size:0.71rem; color:#64748b; margin-top:3px;">⏳ Belum mengunggah bukti pembayaran uang pangkal</div>
      <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:6px;">
        <button type="button" class="btn btn-primary btn-up-sim-auto" data-id="${u.id}" style="padding:3px 8px; font-size:0.7rem; background:#059669; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">
          ⚡ Simulasi Upload Bukti (Auto)
        </button>
        <button type="button" class="btn btn-secondary btn-up-valid-manual" data-id="${u.id}" style="padding:3px 8px; font-size:0.7rem; background:#f0fdf4; color:#006837; border:1px solid #bbf7d0; font-weight:700;">
          ✅ Sahkan Manual Loket
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%); border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 14px 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div>
          <div style="font-weight:800; color:#0f172a; font-size:0.92rem; display:flex; align-items:center; gap:7px;">
            <span>🏫</span>
            <span>Contoh Kategori Validasi Uang Pangkal: Otomatis (Ada Bukti), Manual (Loket), & Pending</span>
          </div>
          <div style="font-size:0.78rem; color:#475569; margin-top:2px;">
            Klik <strong>🖼️ Lihat Bukti & Rincian Pos</strong> untuk melihat struk pembayaran digital, atau uji tombol <strong>⚡ Simulasi Upload Bukti</strong> maupun <strong>✅ Sahkan Manual Loket</strong> pada data Pending.
          </div>
        </div>
        <button type="button" id="btn-up-reset-demo" class="btn btn-secondary" style="font-size:0.74rem; padding:5px 10px;">
          🔄 Reset Data Contoh Uang Pangkal
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
        <!-- Kolom 1: Otomatis -->
        <div style="background:rgba(236,253,245,0.6); border:1px solid #a7f3d0; border-radius:10px; padding:10px;">
          <div style="font-size:0.78rem; font-weight:800; color:#047857; margin-bottom:8px; display:flex; justify-content:space-between;">
            <span>⚡ 1. Validasi Otomatis (Sudah Ada Bukti)</span>
            <span>${autoList.length} Siswa</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${autoCards || '<div style="font-size:0.75rem; color:#64748b;">Tidak ada data.</div>'}
          </div>
        </div>

        <!-- Kolom 2: Manual Loket -->
        <div style="background:rgba(239,246,255,0.6); border:1px solid #bfdbfe; border-radius:10px; padding:10px;">
          <div style="font-size:0.78rem; font-weight:800; color:#1d4ed8; margin-bottom:8px; display:flex; justify-content:space-between;">
            <span>✅ 2. Validasi Manual (Loket Sekolah)</span>
            <span>${manualList.length} Siswa</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${manualCards || '<div style="font-size:0.75rem; color:#64748b;">Tidak ada data.</div>'}
          </div>
        </div>

        <!-- Kolom 3: Pending -->
        <div style="background:rgba(254,252,232,0.7); border:1px solid #fde68a; border-radius:10px; padding:10px;">
          <div style="font-size:0.78rem; font-weight:800; color:#b45309; margin-bottom:8px; display:flex; justify-content:space-between;">
            <span>⏳ 3. Status Pending (Belum Ada Bukti)</span>
            <span>${pendingList.length} Siswa</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${pendingCards || '<div style="font-size:0.75rem; color:#64748b;">Semua siswa pending sudah divalidasi! Klik Reset di kanan atas untuk mengulang simulasi.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-up-detail').forEach(b => {
    b.addEventListener('click', (e) => openDetailUangPangkalModal(e.currentTarget.getAttribute('data-id')));
  });
  container.querySelectorAll('.btn-up-sim-auto').forEach(b => {
    b.addEventListener('click', (e) => simulateUangPangkalAutoUpload(e.currentTarget.getAttribute('data-id')));
  });
  container.querySelectorAll('.btn-up-valid-manual').forEach(b => {
    b.addEventListener('click', (e) => validateUangPangkalManual(e.currentTarget.getAttribute('data-id')));
  });

  document.getElementById('btn-up-reset-demo')?.addEventListener('click', () => {
    allUangPangkal = getSeedUangPangkal();
    saveUangPangkal(allUangPangkal);
    updateKeuanganStats();
    renderUangPangkalShowcase();
    renderUangPangkalTable();
    renderRekapContent();
    showKeuanganAlert('🔄 Data contoh Uang Pangkal (Otomatis, Manual, & Pending) berhasil di-reset ke kondisi awal!', 'info');
  });
}

function renderUangPangkalTable() {
  const tbody = document.getElementById('k-tbody-uangpangkal');
  if (!tbody) return;

  const searchVal = (document.getElementById('k-search-up')?.value || '').toLowerCase().trim();
  const filterVal = document.getElementById('k-filter-up')?.value || '';

  const filtered = allUangPangkal.filter(u => {
    const matchSearch = !searchVal ||
      (u.nama || '').toLowerCase().includes(searchVal) ||
      (u.id_pendaftar || '').toLowerCase().includes(searchVal) ||
      (u.metode || '').toLowerCase().includes(searchVal) ||
      (u.no_referensi || '').toLowerCase().includes(searchVal);

    let normStatus = u.status || 'pending';
    if (normStatus === 'lunas') {
      normStatus = hasUangPangkalProof(u) ? 'lunas_otomatis' : 'lunas_manual';
    }

    const matchFilter = !filterVal || normStatus === filterVal;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          🔍 Tidak ada catatan uang pangkal yang sesuai filter/pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((u, idx) => {
    const hasProof = hasUangPangkalProof(u);
    let normStatus = u.status || 'pending';
    if (normStatus === 'lunas') {
      normStatus = hasProof ? 'lunas_otomatis' : 'lunas_manual';
    }

    const isLunasPenuh = normStatus === 'lunas_otomatis' || normStatus === 'lunas_manual';
    const isPending = normStatus === 'pending';
    const isDitolak = normStatus === 'ditolak';

    let statusBadgeHtml = '';
    if (normStatus === 'lunas_otomatis') {
      statusBadgeHtml = `<span class="badge badge-lunas-auto">⚡ Lunas — Validasi Otomatis</span>`;
    } else if (normStatus === 'lunas_manual') {
      statusBadgeHtml = `<span class="badge badge-lunas">✅ Lunas — Validasi Manual (Loket)</span>`;
    } else if (normStatus === 'cicilan') {
      statusBadgeHtml = `<span class="badge badge-cicilan">🔄 Cicilan (${u.validation_type === 'otomatis' ? 'Otomatis' : 'Manual Loket'})</span>`;
    } else if (normStatus === 'ditolak') {
      statusBadgeHtml = `<span class="badge badge-ditolak">🚫 Ditolak</span>`;
    } else {
      statusBadgeHtml = `<span class="badge badge-pending">⏳ Pending (Belum Bayar)</span>`;
    }

    let proofHtml = '';
    if (hasProof) {
      proofHtml = `
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:3px;">
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.73rem; color:${isDitolak ? '#b91c1c' : '#15803d'}; font-weight:700; background:${isDitolak ? '#fef2f2' : '#f0fdf4'}; border:1px solid ${isDitolak ? '#fecaca' : '#bbf7d0'}; padding:2px 8px; border-radius:6px;">
            ${isDitolak ? '⚠️ Bukti Ditolak' : '✓ Sudah Ada Bukti Bayar'}
          </span>
          <div style="font-size:0.69rem; color:#475569; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${u.file_bukti || ''}">
            📎 <code>${u.file_bukti || 'Bukti_UangPangkal.svg'}</code>
          </div>
          <button type="button" class="btn-up-detail" data-id="${u.id}" style="background:none; border:none; padding:0; color:#0284c7; font-size:0.71rem; font-weight:700; cursor:pointer; text-decoration:underline;">
            🖼️ Lihat Struk Uang Pangkal
          </button>
        </div>
      `;
    } else if (normStatus === 'lunas_manual' || normStatus === 'cicilan') {
      proofHtml = `
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.73rem; color:#0369a1; font-weight:700; background:#e0f2fe; border:1px solid #bae6fd; padding:2px 8px; border-radius:6px;">
            🏛️ Kwitansi Tunai Loket
          </span>
          <span style="font-size:0.69rem; color:#64748b;">Oleh: ${u.validated_by || 'Bendahara Loket'}</span>
        </div>
      `;
    } else {
      proofHtml = `
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.73rem; color:#ca8a04; font-weight:700; background:#fefce8; border:1px solid #fef08a; padding:2px 8px; border-radius:6px;">
          ⏳ Belum Upload Bukti
        </span>
      `;
    }

    const tagihanTotal = u.tagihan_total || u.rincian_biaya?.total || 7000000;
    const jumlahDisplay = (isPending || isDitolak)
      ? `<div style="font-weight:700; color:${isDitolak ? '#dc2626' : '#ca8a04'};">Rp 0 <span style="font-size:0.72rem; color:#64748b; font-weight:500;">/ ${formatRupiah(tagihanTotal)}</span></div>`
      : `<div style="font-weight:800; color:#006837;">${formatRupiah(u.jumlah)}</div>
         ${normStatus === 'cicilan' ? `<div style="font-size:0.7rem; color:#7c3aed;">Sisa: ${formatRupiah(Math.max(0, tagihanTotal - u.jumlah))}</div>` : ''}`;

    const validTitle = isLunasPenuh
      ? 'Uang Pangkal sudah berstatus LUNAS PENUH'
      : 'Validasi Manual Pelunasan Uang Pangkal di Loket Sekolah';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700; color:#006837;">${u.id_pendaftar}</code></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${u.nama}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${u.alasan_penolakan ? `<span style="color:#dc2626;">Alasan tolak: ${u.alasan_penolakan}</span>` : (u.catatan || '-')}</div>
        </td>
        <td>${u.tgl_bayar ? formatDate(u.tgl_bayar) : '<span style="color:#94a3b8;">Belum bayar</span>'}</td>
        <td>${jumlahDisplay}</td>
        <td>
          <div style="font-size:0.8rem; font-weight:600; color:#1e293b;">${u.metode || '-'}</div>
          ${u.no_referensi ? `<div style="font-size:0.7rem; font-family:monospace; color:#006837;">Ref: ${u.no_referensi}</div>` : ''}
        </td>
        <td>${proofHtml}</td>
        <td>
          ${statusBadgeHtml}
          ${u.validated_at ? `<div style="font-size:0.69rem; color:var(--text-muted); margin-top:2px;">Disahkan: ${formatDate(u.validated_at)}</div>` : ''}
          ${u.rejected_at ? `<div style="font-size:0.69rem; color:#dc2626; margin-top:2px;">Ditolak: ${formatDate(u.rejected_at)}</div>` : ''}
        </td>
        <td style="text-align: center;">
          <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-up-detail" data-id="${u.id}" title="Buka Detail Rincian Pos & Struk Bukti Uang Pangkal" style="padding: 4px 7px; font-size: 0.74rem;">
              🔍 Detail
            </button>
            <button type="button" class="btn btn-secondary btn-up-edit" data-id="${u.id}" title="Edit Data & Rincian Pos Biaya Uang Pangkal" style="padding: 4px 7px; font-size: 0.74rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-primary btn-up-valid-manual" data-id="${u.id}" ${isLunasPenuh ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="${validTitle}" style="padding: 4px 7px; font-size: 0.74rem; background:#006837; color:white;">
              ✅ Validasi
            </button>
            <button type="button" class="btn btn-secondary btn-up-tolak" data-id="${u.id}" ${isDitolak ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Tolak Berkas Uang Pangkal" style="padding: 4px 7px; font-size: 0.74rem; background:#fef2f2; color:#dc2626; border:1px solid #fecaca;">
              🚫 Tolak
            </button>
            <button type="button" class="btn btn-secondary btn-up-email" data-id="${u.id}" title="Lihat Contoh Email Bukti Pelunasan Daftar Ulang & Pengambilan Seragam" style="padding: 4px 8px; font-size: 0.74rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
              📧 Contoh Email
            </button>
            ${
              (isPending || isDitolak)
                ? `<button type="button" class="btn btn-secondary btn-up-sim-auto" data-id="${u.id}" title="Simulasikan Siswa Upload Bukti Bayar Digital (Validasi Otomatis)" style="padding: 4px 7px; font-size: 0.73rem; background:#ecfdf5; color:#047857; border:1px solid #6ee7b7; font-weight:700;">
                     ⚡ Upload (Auto)
                   </button>`
                : ''
            }
            <button type="button" class="btn btn-secondary btn-k-del-up" data-id="${u.id}" title="Hapus Catatan" style="padding: 4px 7px; font-size: 0.74rem; color: #dc2626; border-color: #fecaca;">
              🗑
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-up-detail').forEach(b => {
    b.addEventListener('click', (e) => openDetailUangPangkalModal(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-up-edit').forEach(b => {
    b.addEventListener('click', (e) => openEditUangPangkalModal(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-up-valid-manual').forEach(b => {
    b.addEventListener('click', (e) => validateUangPangkalManual(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-up-tolak').forEach(b => {
    b.addEventListener('click', (e) => openTolakUangPangkalModal(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-up-email').forEach(b => {
    b.addEventListener('click', (e) => openEmailUangPangkalModal(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-up-sim-auto').forEach(b => {
    b.addEventListener('click', (e) => simulateUangPangkalAutoUpload(e.currentTarget.getAttribute('data-id')));
  });
  document.querySelectorAll('.btn-k-del-up').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Hapus catatan uang pangkal ini?')) {
        allUangPangkal = allUangPangkal.filter(u => u.id !== id);
        saveUangPangkal(allUangPangkal);
        updateKeuanganStats();
        renderUangPangkalShowcase();
        renderUangPangkalTable();
        renderRekapContent();
        showKeuanganAlert('🗑 Data uang pangkal berhasil dihapus', 'info');
      }
    });
  });
}

function validateUangPangkalManual(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  const tagihan = u.tagihan_total || u.rincian_biaya?.total || 7000000;
  if (!confirm(`Konfirmasi Validasi Manual Uang Pangkal (Loket Sekolah):\n\nSiswa: ${u.nama} (${u.id_pendaftar})\nNominal Pelunasan: ${formatRupiah(tagihan)}\n\nApakah pembayaran uang pangkal secara langsung/tunai di loket sekolah telah diterima sah oleh Bendahara?`)) {
    return;
  }

  const oldStatus = u.status || 'pending';
  const nowIso = new Date().toISOString();

  u.status = 'lunas_manual';
  u.validation_type = 'manual';
  u.validated_by = 'Admin Keuangan (Bendahara Loket)';
  u.validated_at = nowIso;
  u.rejected_at = null;
  u.alasan_penolakan = null;
  u.tgl_bayar = u.tgl_bayar || nowIso.slice(0, 10);
  u.jumlah = tagihan;
  u.metode = (!u.metode || u.metode.includes('Menunggu')) ? 'Cash / Tunai Loket Sekolah' : u.metode;
  u.no_referensi = u.no_referensi || ('KWITANSI-UP-LOKET-' + Date.now().toString().slice(-4));
  u.catatan = 'Pelunasan uang pangkal disahkan secara manual oleh Admin Keuangan di loket sekolah';
  if (u.rincian_biaya) {
    u.rincian_biaya = {
      seragam_sekolah: 1850000,
      spp_bulan_pertama: 750000,
      pengembangan_sarpras: 4000000,
      kartu_pelajar_asuransi: 400000,
      total: tagihan
    };
  }

  recordAuditLog(
    u.id_pendaftar,
    oldStatus,
    'lunas_manual',
    'manual',
    'Admin Keuangan (Bendahara Loket)',
    `[Uang Pangkal] Validasi manual pelunasan Uang Pangkal (${formatRupiah(tagihan)}) di loket sekolah`
  );

  saveUangPangkal(allUangPangkal);
  updateKeuanganStats();
  renderUangPangkalShowcase();
  renderUangPangkalTable();
  renderRekapContent();
  renderAuditTable();
  closeModalK('modal-k-detail');
  showKeuanganAlert(`✅ Uang Pangkal ${u.nama} (${formatRupiah(tagihan)}) berhasil disahkan secara MANUAL (Loket)!`);
}

function simulateUangPangkalAutoUpload(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  const nowIso = new Date().toISOString();
  const refCode = 'TRX-UP-BSI-' + Date.now().toString().slice(-6);
  const fileName = `Bukti_UangPangkal_BSI_${u.nisn || u.id_pendaftar}.svg`;
  const stdRincian = {
    seragam_sekolah: 1850000,
    spp_bulan_pertama: 750000,
    pengembangan_sarpras: 4000000,
    kartu_pelajar_asuransi: 400000,
    total: 7000000
  };

  const oldStatus = u.status || 'pending';

  u.file_bukti = fileName;
  u.file_data_url = generateBuktiUangPangkalDataUrl({
    nama: u.nama,
    idPendaftar: u.id_pendaftar,
    nisn: u.nisn || '0053456789',
    bank: 'Transfer Bank BSI (BSI Mobile)',
    noRef: refCode,
    waktu: formatDateTime(nowIso) + ' WIB',
    rincian: stdRincian,
    total: 7000000
  });
  u.status = 'pending';
  u.rejected_at = null;
  u.alasan_penolakan = null;
  u.tgl_bayar = nowIso.slice(0, 10);
  u.metode = 'Transfer Bank BSI';
  u.no_referensi = refCode;
  u.jumlah = 7000000;
  u.tagihan_total = 7000000;
  u.rincian_biaya = stdRincian;
  u.catatan = 'Unggahan bukti pembayaran uang pangkal digital — otomatis tervalidasi oleh sistem';

  // Jalankan auto-validation uang pangkal
  processAutoValidationUangPangkal(allUangPangkal);
  saveUangPangkal(allUangPangkal);

  recordAuditLog(
    u.id_pendaftar,
    oldStatus,
    'lunas_otomatis',
    'otomatis',
    'Sistem Otomatis',
    `[Uang Pangkal] Validasi otomatis Uang Pangkal Rp 7.000.000 via bukti digital (${fileName})`
  );

  updateKeuanganStats();
  renderUangPangkalShowcase();
  renderUangPangkalTable();
  renderRekapContent();
  renderAuditTable();

  showKeuanganAlert(`⚡ Bukti Uang Pangkal ${u.nama} (${fileName}) terdeteksi! Status otomatis disahkan menjadi LUNAS — Validasi Otomatis.`);
  openDetailUangPangkalModal(u.id);
}

function openEditUangPangkalModal(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  currentEditUpId = upId;
  const hasProof = hasUangPangkalProof(u);
  let normStatus = u.status || 'pending';
  if (normStatus === 'lunas') {
    normStatus = hasProof ? 'lunas_otomatis' : 'lunas_manual';
  }

  const rincian = u.rincian_biaya || {
    seragam_sekolah: 1850000,
    spp_bulan_pertama: 750000,
    pengembangan_sarpras: 4000000,
    kartu_pelajar_asuransi: 400000,
    total: 7000000
  };

  document.getElementById('edit-up-id-pendaftar').value = u.id_pendaftar;
  document.getElementById('edit-up-nama').value = u.nama;
  document.getElementById('edit-up-status').value = normStatus;
  document.getElementById('edit-up-tgl').value = u.tgl_bayar ? u.tgl_bayar.slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('edit-up-metode').value = u.metode || 'Cash / Tunai Loket Sekolah';
  document.getElementById('edit-up-ref').value = u.no_referensi || '';

  document.getElementById('edit-up-seragam').value = normStatus === 'pending' ? 0 : (rincian.seragam_sekolah ?? 1850000);
  document.getElementById('edit-up-spp').value = normStatus === 'pending' ? 0 : (rincian.spp_bulan_pertama ?? 750000);
  document.getElementById('edit-up-sarpras').value = normStatus === 'pending' ? 0 : (rincian.pengembangan_sarpras ?? 4000000);
  document.getElementById('edit-up-kartu').value = normStatus === 'pending' ? 0 : (rincian.kartu_pelajar_asuransi ?? 400000);
  if (window.keuanganHitungEditUpTotal) window.keuanganHitungEditUpTotal();

  document.getElementById('edit-up-catatan').value = u.catatan || '';
  document.getElementById('edit-up-aktor').value = 'Admin Keuangan (Bendahara SPMB)';
  document.getElementById('edit-up-alasan').value = '';

  document.getElementById('modal-k-edit-up').classList.add('show');
}

function openTolakUangPangkalModal(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  pendingTolakId = null;
  pendingTolakUpId = upId;
  document.getElementById('modal-k-tolak-info').textContent = `[UANG PANGKAL] ${u.nama} (${u.id_pendaftar})`;
  document.getElementById('alasan-k-tolak').value = u.alasan_penolakan || '';
  document.getElementById('modal-k-tolak').classList.add('show');
}

function openEmailUangPangkalModal(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  const p = allPendaftar.find(x => x.id_pendaftar === u.id_pendaftar) || {};
  const toEmail = p.email || `${u.id_pendaftar.toLowerCase().replace(/[^a-z0-9]/g, '')}@spmb-m3.sch.id`;
  const hasProof = hasUangPangkalProof(u);
  let normStatus = u.status || 'pending';
  if (normStatus === 'lunas') {
    normStatus = hasProof ? 'lunas_otomatis' : 'lunas_manual';
  }
  const jenisValidasi = normStatus === 'lunas_otomatis'
    ? '⚡ Validasi Otomatis (Bukti Digital Daftar Ulang)'
    : (normStatus === 'cicilan' ? '🔄 Validasi Cicilan / Angsuran Loket' : '✅ Validasi Manual (Loket Keuangan Sekolah)');

  const rincian = u.rincian_biaya || {
    seragam_sekolah: 1850000,
    spp_bulan_pertama: 750000,
    pengembangan_sarpras: 4000000,
    kartu_pelajar_asuransi: 400000,
    total: 7000000
  };

  const titleEl = document.getElementById('prev-email-modal-title');
  if (titleEl) {
    titleEl.textContent = '📧 Contoh Email — Bukti Pelunasan Uang Pangkal (Daftar Ulang) & Loket Seragam';
  }

  document.getElementById('prev-email-to').textContent = `${u.nama} <${toEmail}>`;
  document.getElementById('prev-email-subj').textContent = `[SPMB SMA MUHI 3] Konfirmasi Uang Pangkal (Daftar Ulang) — Silakan Ambil Paket Seragam di Loket (Modul 06)`;

  const emailBodyEl = document.getElementById('prev-email-body');
  emailBodyEl.innerHTML = `
    <div style="background: linear-gradient(135deg, #003d20 0%, #006837 100%); color:white; padding:16px 20px; border-radius:10px 10px 0 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-size:0.75rem; letter-spacing:1px; text-transform:uppercase; opacity:0.85; font-weight:600;">Tanda Terima Resmi Daftar Ulang (Uang Pangkal)</div>
        <div style="font-size:1.15rem; font-weight:800; letter-spacing:0.3px;">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
        <div style="font-size:0.75rem; opacity:0.85;">Tahun Ajaran 2026/2027 &bull; Terintegrasi Modul 06 Loket & Modul 08 TU</div>
      </div>
      <div style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700;">
        ${getStatusLabel(normStatus)}
      </div>
    </div>

    <div style="padding:20px; background:#ffffff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 10px 10px;">
      <p style="margin-top:0; font-size:0.95rem;">Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
      <p style="font-size:0.9rem;">Yth. Siswa Baru & Orang Tua/Wali dari: <strong>${u.nama}</strong> (<code>${u.id_pendaftar}</code>),</p>

      <p style="font-size:0.9rem; line-height:1.6; color:#334155;">
        Alhamdulillah, pembayaran <strong>Uang Pangkal (Daftar Ulang)</strong> Anda sebesar <strong>${formatRupiah(u.jumlah || 7000000)}</strong> melalui saluran <strong>${u.metode || 'Bank / Loket Sekolah'}</strong> telah tercatat dan disahkan dalam Sistem Keuangan SPMB SMA Muhammadiyah 3 Yogyakarta.
      </p>

      <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-left:5px solid #006837; padding:14px 16px; margin:1.15rem 0; border-radius:6px; font-size:0.85rem;">
        <div style="font-weight:800; color:#006837; margin-bottom:8px;">🧾 RINCIAN POS BIAYA DAFTAR ULANG (UANG PANGKAL):</div>
        <table style="width:100%; border-collapse:collapse; line-height:1.75;">
          <tr><td>1. Paket Seragam Sekolah (5 Stel Lengkap)</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.seragam_sekolah)}</td></tr>
          <tr><td>2. SPP Bulan Pertama (Juli 2026)</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.spp_bulan_pertama)}</td></tr>
          <tr><td>3. Infaq Pengembangan Sarana & Prasarana</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.pengembangan_sarpras)}</td></tr>
          <tr><td>4. Kartu Pelajar RFID, Tes Bakat & Asuransi</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.kartu_pelajar_asuransi)}</td></tr>
          <tr style="border-top:1px dashed #86efac;">
            <td style="font-weight:800; color:#006837; padding-top:4px;">Total Dibayarkan (${jenisValidasi})</td>
            <td style="text-align:right; font-weight:800; color:#006837; padding-top:4px;">${formatRupiah(u.jumlah || rincian.total)}</td>
          </tr>
        </table>
      </div>

      <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1.5px solid #bfdbfe; border-radius:10px; padding:14px 16px; margin:1.15rem 0;">
        <div style="font-weight:800; color:#1d4ed8; margin-bottom:6px; font-size:0.9rem;">
          🎒 LANGKAH SELANJUTNYA: VERIFIKASI BERKAS FISIK & PENGAMBILAN SERAGAM (MODUL 06)
        </div>
        <p style="font-size:0.85rem; color:#1e293b; margin:0; line-height:1.55;">
          Silakan tunjukkan email ini atau Nomor Referensi <code>${u.no_referensi || u.id}</code> kepada petugas <strong>Loket Daftar Ulang & Seragam (Modul 06)</strong> di Kampus SMA Muhammadiyah 3 Yogyakarta untuk pengambilan 5 stel bahan seragam, atribut IPM/HW, dan aktivasi Nomor Induk Siswa (NIS) di Basis Data TU (Modul 08).
        </p>
      </div>

      <p style="margin-bottom:0; font-size:0.88rem;">Wassalamu'alaikum Warahmatullahi Wabarakatuh.</p>
    </div>
  `;

  const copyBtn = document.getElementById('btn-copy-email-text');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const plainText = `SUBJEK: [SPMB SMA MUHI 3] Konfirmasi Uang Pangkal (Daftar Ulang) — ${u.nama} (${u.id_pendaftar})
Total Dibayar: ${formatRupiah(u.jumlah)} (${getStatusLabel(normStatus)})
No. Referensi: ${u.no_referensi || u.id}
Silakan lanjutkan ke Loket Daftar Ulang (Modul 06) untuk pengambilan paket seragam sekolah.`;
      navigator.clipboard.writeText(plainText).then(() => {
        showKeuanganAlert('📋 Teks email konfirmasi Uang Pangkal berhasil disalin!', 'info');
      });
    };
  }

  document.getElementById('modal-k-email-preview').classList.add('show');
}

function openDetailUangPangkalModal(upId) {
  const u = allUangPangkal.find(x => x.id === upId);
  if (!u) return;

  const hasProof = hasUangPangkalProof(u);
  let normStatus = u.status || 'pending';
  if (normStatus === 'lunas') {
    normStatus = hasProof ? 'lunas_otomatis' : 'lunas_manual';
  }
  const isLunas = normStatus === 'lunas_otomatis' || normStatus === 'lunas_manual';
  const rincian = u.rincian_biaya || {
    seragam_sekolah: 1850000,
    spp_bulan_pertama: 750000,
    pengembangan_sarpras: 4000000,
    kartu_pelajar_asuransi: 400000,
    total: 7000000
  };

  document.getElementById('modal-k-detail-title').textContent = `🏫 Detail Uang Pangkal — ${u.nama}`;
  const bodyEl = document.getElementById('modal-k-detail-body');

  bodyEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 1rem; font-size: 0.88rem; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
      <div><strong>ID Transaksi:</strong> <code>${u.id}</code></div>
      <div><strong>ID Pendaftar:</strong> <code>${u.id_pendaftar}</code></div>
      <div><strong>Nama Siswa:</strong> ${u.nama}</div>
      <div><strong>Tanggal Bayar:</strong> ${u.tgl_bayar ? formatDate(u.tgl_bayar) : 'Belum Bayar'}</div>
      <div><strong>Metode:</strong> ${u.metode || '-'}</div>
      <div><strong>No. Referensi:</strong> <code>${u.no_referensi || '-'}</code></div>
    </div>

    <div style="margin-bottom: 1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <strong>Status Uang Pangkal:</strong>
        <span class="badge ${getBadgeClass(normStatus)}">${getStatusLabel(normStatus)}</span>
      </div>
      <div>
        <strong>Nominal Dibayar:</strong> <span style="font-size:1.1rem; font-weight:800; color:#006837;">${formatRupiah(u.jumlah)}</span>
      </div>
    </div>

    <!-- Rincian 4 Pos Biaya Daftar Ulang -->
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 14px; margin-bottom:1rem; font-size:0.83rem;">
      <div style="font-weight:800; color:#006837; margin-bottom:6px;">🧾 Rincian Pos Biaya Daftar Ulang (Uang Pangkal):</div>
      <table style="width:100%; border-collapse:collapse; line-height:1.7;">
        <tr><td>1. Paket Seragam Sekolah (5 Stel)</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.seragam_sekolah)}</td></tr>
        <tr><td>2. SPP Bulan Pertama (Juli 2026)</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.spp_bulan_pertama)}</td></tr>
        <tr><td>3. Infaq Pengembangan Sarana & Prasarana</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.pengembangan_sarpras)}</td></tr>
        <tr><td>4. Kartu Pelajar RFID, Tes Bakat & Asuransi</td><td style="text-align:right; font-weight:700;">${formatRupiah(rincian.kartu_pelajar_asuransi)}</td></tr>
        <tr style="border-top:1px dashed #86efac;"><td style="font-weight:800; color:#006837; padding-top:4px;">Total Tagihan Standar</td><td style="text-align:right; font-weight:800; color:#006837; padding-top:4px;">${formatRupiah(rincian.total || 7000000)}</td></tr>
      </table>
    </div>

    <!-- Metadata Validasi -->
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-bottom:1rem; font-size:0.82rem; line-height:1.5;">
      <div style="font-weight:700; color:#1d4ed8; margin-bottom:4px;">📋 Informasi Validasi Uang Pangkal:</div>
      <div>• Jenis Validasi: <strong>${normStatus === 'lunas_otomatis' ? '⚡ Validasi Otomatis (Sudah Ada Bukti Pembayaran Digital)' : (normStatus === 'lunas_manual' || normStatus === 'cicilan' ? '✅ Validasi Manual Bendahara Loket' : (normStatus === 'ditolak' ? '🚫 Bukti Pembayaran Ditolak' : '⏳ Belum Divalidasi (Status: Pending)'))}</strong></div>
      <div>• Petugas / Aktor: <strong>${u.validated_by || '-'}</strong></div>
      <div>• Waktu Pengesahan: <strong>${u.validated_at ? formatDateTime(u.validated_at) : '-'}</strong></div>
      ${u.alasan_penolakan ? `<div style="color:#dc2626;">• Alasan Penolakan: <strong>${u.alasan_penolakan}</strong></div>` : ''}
      <div>• Catatan: <strong>${u.catatan || '-'}</strong></div>
    </div>

    <div style="margin-bottom: 0.5rem;">
      <strong>File Bukti Pembayaran Uang Pangkal:</strong>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Nama Berkas: <code>${u.file_bukti || 'Belum ada bukti digital terunggah'}</code></div>
    </div>

    <div style="border: 1px dashed #cbd5e1; border-radius: 10px; padding: 1rem; text-align: center; background: #fafafa; min-height: 160px; display: flex; align-items: center; justify-content: center;">
      ${
        u.file_data_url
          ? `<img src="${u.file_data_url}" style="max-height: 440px; max-width: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.12);" alt="Bukti Uang Pangkal">`
          : `<div style="color: var(--text-muted); font-size: 0.86rem;">
               <div style="font-size:2.2rem; margin-bottom:6px;">${normStatus === 'lunas_manual' || normStatus === 'cicilan' ? '🏛️' : '⏳'}</div>
               <strong style="color:#475569;">${normStatus === 'lunas_manual' || normStatus === 'cicilan' ? 'Pembayaran Langsung di Loket Keuangan Sekolah (Kwitansi Fisik)' : 'Belum Ada Bukti Pembayaran Uang Pangkal Terunggah'}</strong>
               <p style="margin:4px 0 0 0; font-size:0.79rem; color:#64748b;">
                 ${normStatus === 'pending' ? 'Klik tombol Validasi Manual di bawah jika siswa membayar di loket, atau gunakan tombol Upload (Auto) pada tabel untuk simulasi validasi otomatis.' : `Disahkan oleh ${u.validated_by || 'Bendahara'} dengan nomor referensi ${u.no_referensi || '-'}.`}
               </p>
             </div>`
      }
    </div>
  `;

  const btnValid = document.getElementById('btn-validate-modal');
  if (btnValid) {
    btnValid.disabled = isLunas;
    btnValid.style.opacity = isLunas ? '0.4' : '1';
    btnValid.style.cursor = isLunas ? 'not-allowed' : 'pointer';
    btnValid.onclick = () => validateUangPangkalManual(upId);
  }

  const btnPrev = document.getElementById('btn-detail-preview-email');
  if (btnPrev) {
    btnPrev.onclick = () => {
      closeModalK('modal-k-detail');
      openEmailUangPangkalModal(upId);
    };
  }

  document.getElementById('modal-k-detail').classList.add('show');
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

  const countUpAuto = allUangPangkal.filter(u => u.status === 'lunas_otomatis').length;
  const countUpManual = allUangPangkal.filter(u => u.status === 'lunas_manual' || u.status === 'lunas').length;
  const countUpPending = allUangPangkal.filter(u => u.status === 'pending').length;
  const countUpCicilan = allUangPangkal.filter(u => u.status === 'cicilan').length;
  const countUpDitolak = allUangPangkal.filter(u => u.status === 'ditolak').length;
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
        <h4 style="font-weight: 700; color: #1d4ed8; margin-bottom: 0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span>🏫 Rekap Penerimaan Uang Pangkal</span>
          <span style="font-size:0.75rem; background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:6px;">@Rp 7.000.000</span>
        </h4>
        <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Total Data Tagihan / Transaksi</td><td style="font-weight:700; text-align:right;">${allUangPangkal.length} siswa</td></tr>
          <tr><td style="padding:4px 0; color:#059669;">⚡ Lunas (Validasi Otomatis — Ada Bukti)</td><td style="font-weight:700; color:#059669; text-align:right;">${countUpAuto} siswa</td></tr>
          <tr><td style="padding:4px 0; color:#15803d;">✅ Lunas (Validasi Manual — Loket)</td><td style="font-weight:700; color:#15803d; text-align:right;">${countUpManual} siswa</td></tr>
          <tr><td style="padding:4px 0; color:#7c3aed;">🔄 Cicilan / Angsuran</td><td style="font-weight:700; color:#7c3aed; text-align:right;">${countUpCicilan} siswa</td></tr>
          <tr><td style="padding:4px 0; color:#ca8a04;">⏳ Status Pending (Belum Upload Bukti)</td><td style="font-weight:700; color:#ca8a04; text-align:right;">${countUpPending} siswa</td></tr>
          <tr><td style="padding:4px 0; color:#dc2626;">🚫 Bukti Ditolak</td><td style="font-weight:700; color:#dc2626; text-align:right;">${countUpDitolak} siswa</td></tr>
          <tr style="border-top:1px dashed #93c5fd;"><td style="padding:6px 0; font-weight:700; color:#1d4ed8;">Total Dana Uang Pangkal Masuk</td><td style="font-weight:800; color:#1d4ed8; text-align:right;">${formatRupiah(totalUP)}</td></tr>
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
    renderAutoValidationShowcase();
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
      <div>• Metode Validasi: <strong>${pay.validation_method === 'automatic_upload' ? '⚡ Validasi Otomatis (Sudah Ada Bukti Pembayaran Digital)' : (pay.validation_method?.startsWith('manual') ? '✅ Verifikasi Manual Bendahara Loket' : 'Belum Divalidasi (Status: Pending)')}</strong></div>
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
        : `<div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px 14px; margin-bottom:1rem; font-size:0.82rem; color:#065f46; line-height:1.45;">
             ⚡ <strong>Bukti Pembayaran Digital Terdeteksi:</strong> Berkas bukti transfer <code>${fileName}</code> telah diunggah oleh calon siswa dan otomatis divalidasi oleh sistem SPMB.
           </div>`
    }

    <div style="margin-bottom: 0.5rem;">
      <strong>File Bukti Pembayaran Digital:</strong>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Nama Berkas: <code>${fileName}</code></div>
    </div>

    <div style="border: 1px dashed #cbd5e1; border-radius: 10px; padding: 1rem; text-align: center; background: #fafafa; min-height: 180px; display: flex; align-items: center; justify-content: center;">
      ${
        fileImg
          ? `<img src="${fileImg}" style="max-height: 440px; max-width: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.12);" alt="Bukti Transfer">`
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

  const titleEl = document.getElementById('prev-email-modal-title');
  if (titleEl) {
    titleEl.textContent = '📧 Contoh Tampilan & Pratinjau Email — Lanjut ke Tahap Wawancara';
  }
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
  pendingTolakUpId = null;
  document.getElementById('modal-k-tolak-info').textContent = `[FORMULIR] ${p.nama_lengkap} (${p.id_pendaftar})`;
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

  // Search & Filter Formulir
  document.getElementById('k-search-formulir')?.addEventListener('input', () => renderFormulirTable());
  document.getElementById('k-filter-formulir')?.addEventListener('change', () => renderFormulirTable());

  // Search & Filter Uang Pangkal
  document.getElementById('k-search-up')?.addEventListener('input', () => renderUangPangkalTable());
  document.getElementById('k-filter-up')?.addEventListener('change', () => renderUangPangkalTable());

  // Isi Standar Rp 7.000.000 pada Form Uang Pangkal
  document.getElementById('btn-k-fill-std-up')?.addEventListener('click', () => {
    const elSeragam = document.getElementById('up-pos-seragam');
    const elSpp = document.getElementById('up-pos-spp');
    const elSarpras = document.getElementById('up-pos-sarpras');
    const elKartu = document.getElementById('up-pos-kartu');
    if (elSeragam) elSeragam.value = 1850000;
    if (elSpp) elSpp.value = 750000;
    if (elSarpras) elSarpras.value = 4000000;
    if (elKartu) elKartu.value = 400000;
    if (window.keuanganHitungTotal) window.keuanganHitungTotal();
  });

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
    renderAutoValidationShowcase();
    renderFormulirTable();
    renderUangPangkalShowcase();
    renderUangPangkalTable();
    renderRekapContent();
    renderAuditTable();
    showKeuanganAlert('🔄 Data berhasil di-refresh dan disinkronkan dari SSoT!', 'info');
  });

  // Modal Detail Close
  document.getElementById('btn-close-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));
  document.getElementById('btn-cancel-detail')?.addEventListener('click', () => closeModalK('modal-k-detail'));

  // Modal Edit Close (Formulir)
  document.getElementById('btn-close-edit')?.addEventListener('click', () => closeModalK('modal-k-edit'));
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => closeModalK('modal-k-edit'));

  // Modal Edit Close & Standar (Uang Pangkal)
  document.getElementById('btn-close-edit-up')?.addEventListener('click', () => closeModalK('modal-k-edit-up'));
  document.getElementById('btn-cancel-edit-up')?.addEventListener('click', () => closeModalK('modal-k-edit-up'));
  document.getElementById('btn-edit-up-std')?.addEventListener('click', () => {
    document.getElementById('edit-up-seragam').value = 1850000;
    document.getElementById('edit-up-spp').value = 750000;
    document.getElementById('edit-up-sarpras').value = 4000000;
    document.getElementById('edit-up-kartu').value = 400000;
    if (window.keuanganHitungEditUpTotal) window.keuanganHitungEditUpTotal();
  });

  // Modal Email Preview Close
  document.getElementById('btn-close-email-preview')?.addEventListener('click', () => closeModalK('modal-k-email-preview'));
  document.getElementById('btn-close-email-footer')?.addEventListener('click', () => closeModalK('modal-k-email-preview'));

  // Modal Tolak Close
  document.getElementById('btn-close-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));
  document.getElementById('btn-cancel-tolak')?.addEventListener('click', () => closeModalK('modal-k-tolak'));

  // Confirm Tolak Submit (Berlaku untuk Uang Administrasi & Uang Pangkal)
  document.getElementById('btn-confirm-tolak')?.addEventListener('click', () => {
    const alasan = document.getElementById('alasan-k-tolak').value.trim();
    if (!alasan) {
      alert('Harap isi alasan penolakan bukti pembayaran!');
      return;
    }

    // Jika Penolakan pada Uang Pangkal
    if (pendingTolakUpId) {
      const u = allUangPangkal.find(x => x.id === pendingTolakUpId);
      if (u) {
        const oldStatus = u.status || 'pending';
        u.status = 'ditolak';
        u.jumlah = 0;
        u.rejected_at = new Date().toISOString();
        u.alasan_penolakan = alasan;
        u.catatan = `Ditolak: ${alasan}`;
        u.validated_by = 'Admin Keuangan (Bendahara SPMB)';

        recordAuditLog(
          u.id_pendaftar,
          oldStatus,
          'ditolak',
          'manual',
          'Admin Keuangan (Bendahara SPMB)',
          `[Uang Pangkal] Ditolak: ${alasan}`
        );

        saveUangPangkal(allUangPangkal);
        updateKeuanganStats();
        renderUangPangkalShowcase();
        renderUangPangkalTable();
        renderRekapContent();
        renderAuditTable();
        closeModalK('modal-k-tolak');
        pendingTolakUpId = null;
        showKeuanganAlert(`🚫 Bukti Uang Pangkal ${u.nama} telah ditolak dengan alasan: "${alasan}"`, 'error');
      }
      return;
    }

    // Jika Penolakan pada Uang Administrasi (Formulir)
    if (!pendingTolakId) return;
    const p = allPendaftar.find(x => x.id_pendaftar === pendingTolakId);
    if (p) {
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
      renderAutoValidationShowcase();
      renderFormulirTable();
      renderRekapContent();
      renderAuditTable();
      closeModalK('modal-k-tolak');
      pendingTolakId = null;
      showKeuanganAlert(`🚫 Pembayaran ${p.nama_lengkap} telah ditolak dengan alasan: "${alasan}"`, 'error');
    }
  });

  // Submit Form Edit Manual Uang Pangkal
  document.getElementById('form-k-edit-up')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentEditUpId) return;

    const u = allUangPangkal.find(x => x.id === currentEditUpId);
    if (!u) return;

    const oldStatus = u.status || 'pending';
    const newStatus = document.getElementById('edit-up-status').value;
    const newTgl = document.getElementById('edit-up-tgl').value;
    const newMetode = document.getElementById('edit-up-metode').value;
    const newRef = document.getElementById('edit-up-ref').value.trim();
    const newCatatan = document.getElementById('edit-up-catatan').value.trim();
    const aktor = document.getElementById('edit-up-aktor').value.trim() || 'Admin Keuangan (Bendahara SPMB)';
    const alasan = document.getElementById('edit-up-alasan').value.trim();

    if (!alasan) {
      alert('Harap isi alasan koreksi / perubahan data Uang Pangkal demi akuntabilitas audit log!');
      return;
    }

    const posSeragam = parseFloat(document.getElementById('edit-up-seragam')?.value) || 0;
    const posSPP     = parseFloat(document.getElementById('edit-up-spp')?.value)     || 0;
    const posSarpras = parseFloat(document.getElementById('edit-up-sarpras')?.value) || 0;
    const posKartu   = parseFloat(document.getElementById('edit-up-kartu')?.value)   || 0;
    const totalPos   = posSeragam + posSPP + posSarpras + posKartu;

    const rincianBaru = {
      seragam_sekolah: posSeragam,
      spp_bulan_pertama: posSPP,
      pengembangan_sarpras: posSarpras,
      kartu_pelajar_asuransi: posKartu,
      total: Math.max(7000000, totalPos)
    };

    u.status = newStatus;
    u.tgl_bayar = (newStatus === 'pending') ? null : newTgl;
    u.metode = newMetode;
    u.no_referensi = newRef || u.no_referensi;
    u.rincian_biaya = rincianBaru;
    u.jumlah = (newStatus === 'pending' || newStatus === 'ditolak') ? 0 : totalPos;
    u.catatan = newCatatan || alasan;

    if (newStatus === 'lunas_otomatis') {
      u.validation_type = 'otomatis';
      u.validated_by = 'Sistem Otomatis';
      u.validated_at = u.validated_at || new Date().toISOString();
      u.rejected_at = null;
      u.alasan_penolakan = null;
      if (u.jumlah <= 0) u.jumlah = 7000000;
      if (!hasUangPangkalProof(u)) {
        u.file_bukti = `Bukti_UangPangkal_${u.nisn || u.id_pendaftar}.svg`;
        u.file_data_url = generateBuktiUangPangkalDataUrl({
          nama: u.nama,
          idPendaftar: u.id_pendaftar,
          nisn: u.nisn || u.id_pendaftar,
          bank: newMetode || 'Transfer Bank BSI',
          noRef: u.no_referensi || 'TRX-UP-AUTO',
          waktu: formatDate(newTgl || new Date().toISOString()),
          rincian: rincianBaru,
          total: u.jumlah
        });
      }
    } else if (newStatus === 'lunas_manual' || newStatus === 'cicilan') {
      u.validation_type = 'manual';
      u.validated_by = aktor;
      u.validated_at = new Date().toISOString();
      u.rejected_at = null;
      u.alasan_penolakan = null;
      if (newStatus === 'lunas_manual' && u.jumlah <= 0) u.jumlah = 7000000;
    } else if (newStatus === 'ditolak') {
      u.rejected_at = new Date().toISOString();
      u.alasan_penolakan = alasan;
      u.validated_by = aktor;
    } else {
      u.validation_type = null;
      u.validated_by = null;
      u.validated_at = null;
      u.file_bukti = null;
      u.file_data_url = null;
    }

    recordAuditLog(
      u.id_pendaftar,
      oldStatus,
      newStatus,
      'manual',
      aktor,
      `[Uang Pangkal] ${alasan}`
    );

    saveUangPangkal(allUangPangkal);
    updateKeuanganStats();
    renderUangPangkalShowcase();
    renderUangPangkalTable();
    renderRekapContent();
    renderAuditTable();
    closeModalK('modal-k-edit-up');
    showKeuanganAlert(`✏️ Data Uang Pangkal ${u.nama} (${getStatusLabel(newStatus)}) berhasil diperbarui & dicatat ke Audit Log!`);
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
      if (!hasRealProofUploaded(p)) {
        p.pembayaran.file_bukti = `Bukti_Transfer_${p.nisn || p.id_pendaftar}.svg`;
        p.pembayaran.file_data_url = generateBuktiTransferDataUrl({
          nama: p.nama_lengkap,
          idPendaftar: p.id_pendaftar,
          nisn: p.nisn || '-',
          bank: newMetode || 'Transfer Bank BSI',
          noRef: newRef || 'TRX-AUTO-MANUAL',
          waktu: formatDate(newTgl || new Date().toISOString()),
          nominal: 'Rp 200.000'
        });
      }
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
    renderAutoValidationShowcase();
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
    const metode = document.getElementById('up-metode-val').value || 'Transfer Bank BSI';
    const status = document.getElementById('up-status-val').value || 'lunas_manual';
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
    if (status !== 'pending' && totalPosBiaya <= 0) {
      showKeuanganAlert('Isi minimal satu pos biaya dengan nominal yang valid!', 'error');
      return;
    }

    const rincianObj = {
      seragam_sekolah: posSeragam || 1850000,
      spp_bulan_pertama: posSPP || 750000,
      pengembangan_sarpras: posSarpras || 4000000,
      kartu_pelajar_asuransi: posKartu || 400000,
      total: totalPosBiaya > 0 ? totalPosBiaya : 7000000
    };

    const isAuto = status === 'lunas_otomatis';
    const isPending = status === 'pending';
    const nowIso = new Date().toISOString();
    const refCode = isAuto
      ? ('TRX-UP-' + Date.now().toString().slice(-6))
      : (isPending ? null : ('KWITANSI-UP-' + Date.now().toString().slice(-5)));
    const fileName = isAuto ? `Bukti_UangPangkal_${id}.svg` : null;

    const newRecord = {
      id: 'UP-' + Date.now(),
      id_pendaftar: id,
      nama: nama,
      jumlah: isPending ? 0 : totalPosBiaya,
      tagihan_total: rincianObj.total,
      rincian_biaya: rincianObj,
      tgl_bayar: isPending ? null : tgl,
      metode: isPending ? 'Menunggu Pembayaran / Upload Bukti' : metode,
      no_referensi: refCode,
      file_bukti: fileName,
      file_data_url: isAuto
        ? generateBuktiUangPangkalDataUrl({
            nama: nama,
            idPendaftar: id,
            nisn: id,
            bank: metode,
            noRef: refCode,
            waktu: formatDateTime(nowIso) + ' WIB',
            rincian: rincianObj,
            total: totalPosBiaya
          })
        : null,
      status: status,
      validation_type: isAuto ? 'otomatis' : (isPending ? null : 'manual'),
      validated_by: isAuto ? 'Sistem Otomatis' : (isPending ? null : 'Admin Keuangan (Bendahara Loket)'),
      validated_at: isPending ? null : nowIso,
      catatan: catatan || (isAuto ? 'Validasi otomatis via bukti pembayaran uang pangkal digital' : (isPending ? 'Tagihan uang pangkal pending — belum upload bukti' : 'Disahkan manual oleh Admin Keuangan di loket sekolah'))
    };

    allUangPangkal.unshift(newRecord);
    saveUangPangkal(allUangPangkal);
    updateKeuanganStats();
    renderUangPangkalShowcase();
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

    showKeuanganAlert(`✅ Data Uang Pangkal ${nama} (${getStatusLabel(status)}) berhasil disimpan!`);
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

  // Export CSV (Formulir Administrasi & Uang Pangkal)
  document.getElementById('btn-k-export-csv')?.addEventListener('click', () => {
    const rows = [[
      'No', 'ID Pendaftar', 'Nama Lengkap', 'Jurusan',
      'Status Uang Administrasi', 'Metode Administrasi', 'Tgl Validasi Administrasi',
      'Status Uang Pangkal', 'Nominal Uang Pangkal Dibayar', 'Metode Uang Pangkal', 'Ref Uang Pangkal'
    ]];
    allPendaftar.forEach((p, i) => {
      const pay = p.pembayaran || {};
      const status = normalizeStatus(pay.status_pembayaran, pay);
      const up = allUangPangkal.find(u => u.id_pendaftar === p.id_pendaftar) || {};
      rows.push([
        i + 1,
        p.id_pendaftar,
        p.nama_lengkap,
        p.biodata?.pilihan_jurusan || '-',
        status,
        pay.metode_pembayaran || '-',
        pay.validated_at ? formatDate(pay.validated_at) : '-',
        up.status || 'belum_tercatat',
        up.jumlah || 0,
        up.metode || '-',
        up.no_referensi || '-'
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
    showKeuanganAlert('📥 File CSV rekap Uang Administrasi & Uang Pangkal berhasil diunduh!', 'info');
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

window.keuanganHitungEditUpTotal = function() {
  const seragam  = parseFloat(document.getElementById('edit-up-seragam')?.value)  || 0;
  const spp      = parseFloat(document.getElementById('edit-up-spp')?.value)      || 0;
  const sarpras  = parseFloat(document.getElementById('edit-up-sarpras')?.value)  || 0;
  const kartu    = parseFloat(document.getElementById('edit-up-kartu')?.value)    || 0;

  const total = seragam + spp + sarpras + kartu;

  const displayEl = document.getElementById('edit-up-total-display');
  if (displayEl) displayEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
};

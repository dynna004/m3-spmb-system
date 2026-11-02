/**
 * Modul 02: Admin & Monitoring Registrasi Otomatis SPMB
 * SMA Muhammadiyah 3 Yogyakarta
 *
 * Fitur Utama:
 * 1. Aktivasi Akun Otomatis dari Validasi Registrasi (bukan verifikasi berkas):
 *    - Pendaftar dengan NISN dan Email unik langsung Terverifikasi / Otomatis Aktif & menerima Email Login.
 *    - Menampilkan contoh akun yang sudah terverifikasi/teraktivasi beserta contoh tampilan Email Login di halaman.
 * 2. Identifikasi Bot di Halaman Admin:
 *    - Menampilkan deteksi indikasi Bot/Spam pada halaman Admin (tanpa mencampur duplikat karena duplikat ditolak langsung di halaman registrasi).
 * 3. Edit Data Akun Pendaftar (Perbaikan Laporan Typo):
 *    - Admin dapat mengedit Nama Lengkap, Email, NISN, dan No. WhatsApp jika ada laporan pengisi typo.
 * 4. Hapus Pendaftar:
 *    - Admin dapat menghapus akun bot atau pendaftar tertentu.
 */

import {
  getPendaftarList,
  savePendaftar,
  updatePendaftarAccount,
  deletePendaftar,
  escapeHTML
} from '../01_portal_spmb/utils.js';

import {
  formatRegNumber,
  computeActivationNotificationMetadata,
  generateActivationEmailMessage,
  generateActivationWhatsAppMessage,
  dispatchActivationNotification
} from './activationEmailService.js';

// Pastikan CSS Modul 02 terhubung
function ensureAdminStyles() {
  const cssId = 'admin-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/02_admin_spmb/');
    link.href = isStandalone ? './admin.css' : './modules/02_admin_spmb/admin.css';
    document.head.appendChild(link);
  }
}

// ====================================================
// GENERATOR MOCK SVG DOKUMEN FISIK (IJAZAH, KK, PASFOTO, KUITANSI)
// ====================================================
function getIjazahMockSVG(nama, nisn, sekolah) {
  const safeNama = escapeHTML((nama || 'CALON SISWA').toUpperCase());
  const safeNisn = escapeHTML(nisn || '0051234567');
  const safeSekolah = escapeHTML((sekolah && sekolah !== '-') ? sekolah.toUpperCase() : 'SMP NEGERI 1 YOGYAKARTA');
  return `
    <svg class="doc-svg-mock" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ijzBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fffef0" />
          <stop offset="100%" stop-color="#fef8dc" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill="url(#ijzBg)" rx="8" />
      <rect x="15" y="15" width="570" height="390" fill="none" stroke="#006837" stroke-width="4" stroke-dasharray="8,4" rx="6" />
      <rect x="22" y="22" width="556" height="376" fill="none" stroke="#d4af37" stroke-width="2" rx="4" />
      <circle cx="300" cy="65" r="24" fill="#006837" opacity="0.12" />
      <polygon points="300,48 308,62 322,62 311,71 315,85 300,76 285,85 289,71 278,62 292,62" fill="#d4af37" />
      <text x="300" y="105" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle" letter-spacing="1">KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</text>
      <text x="300" y="122" font-family="'Times New Roman', serif" font-size="11" fill="#475569" text-anchor="middle">REPUBLIK INDONESIA</text>
      <text x="300" y="150" font-family="'Times New Roman', serif" font-size="20" font-weight="bold" fill="#006837" text-anchor="middle" letter-spacing="2">IJAZAH SMP / MTS</text>
      <text x="300" y="168" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">TAHUN PELAJARAN 2025/2026 &bull; NOMOR: DN-04/DIK/26/012984</text>
      <text x="300" y="200" font-family="'Times New Roman', serif" font-size="12" fill="#334155" text-anchor="middle">Menerangkan dengan sesungguhnya bahwa:</text>
      <text x="300" y="230" font-family="sans-serif" font-size="17" font-weight="bold" fill="#0f172a" text-anchor="middle">${safeNama}</text>
      <text x="300" y="250" font-family="sans-serif" font-size="11" font-weight="600" fill="#0369a1" text-anchor="middle">NISN: ${safeNisn}</text>
      <text x="300" y="275" font-family="'Times New Roman', serif" font-size="12" fill="#334155" text-anchor="middle">telah lulus dari satuan pendidikan:</text>
      <text x="300" y="295" font-family="sans-serif" font-size="13" font-weight="bold" fill="#006837" text-anchor="middle">${safeSekolah}</text>
      <text x="440" y="335" font-family="sans-serif" font-size="9" fill="#475569" text-anchor="middle">Yogyakarta, 10 Juni 2026</text>
      <text x="440" y="348" font-family="sans-serif" font-size="9" fill="#475569" text-anchor="middle">Kepala Sekolah,</text>
      <circle cx="410" cy="370" r="20" fill="none" stroke="#dc2626" stroke-width="2" opacity="0.75" />
      <text x="410" y="373" font-family="sans-serif" font-size="6" font-weight="bold" fill="#dc2626" text-anchor="middle" opacity="0.85">TERLEGALISIR</text>
      <path d="M 420 370 Q 450 355 480 375" fill="none" stroke="#1e293b" stroke-width="2" />
      <text x="440" y="392" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">Dr. H. Sukardi, M.Pd.</text>
      <rect x="90" y="315" width="55" height="70" fill="#fee2e2" stroke="#991b1b" stroke-width="1.5" rx="2" />
      <text x="117" y="355" font-family="sans-serif" font-size="8" font-weight="bold" fill="#991b1b" text-anchor="middle">FOTO 3X4</text>
    </svg>
  `;
}

function getKKMockSVG(nama, nisn, alamat) {
  const safeNama = escapeHTML((nama || 'CALON SISWA').toUpperCase());
  const safeAlamat = escapeHTML((alamat && alamat !== '-') ? alamat : 'Kota Yogyakarta, D.I. Yogyakarta');
  return `
    <svg class="doc-svg-mock" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="420" fill="#f0f9ff" rx="8" />
      <rect x="15" y="15" width="570" height="390" fill="none" stroke="#0284c7" stroke-width="2.5" rx="6" />
      <rect x="15" y="15" width="570" height="60" fill="#0284c7" />
      <text x="300" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">REPUBLIK INDONESIA</text>
      <text x="300" y="60" font-family="sans-serif" font-size="16" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="2">KARTU KELUARGA</text>
      <text x="300" y="95" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">No. KK: 3471012309870001</text>
      <text x="40" y="125" font-family="sans-serif" font-size="10" font-weight="bold" fill="#475569">Nama Kepala Keluarga: Bpk. Siswanto</text>
      <text x="40" y="142" font-family="sans-serif" font-size="10" fill="#475569">Alamat: ${safeAlamat}</text>
      <rect x="35" y="228" width="530" height="24" fill="#ecfdf5" stroke="#a7f3d0" />
      <text x="50" y="244" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065f46">3</text>
      <text x="120" y="244" font-family="sans-serif" font-size="10" font-weight="bold" fill="#065f46">${safeNama} (Calon Siswa)</text>
      <text x="330" y="244" font-family="monospace" font-size="9" font-weight="bold" fill="#065f46">3471011204090003</text>
      <text x="460" y="244" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065f46">Anak Kandung</text>
    </svg>
  `;
}

function getPasfotoMockSVG() {
  return `
    <svg class="doc-svg-mock" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="400" fill="#dc2626" rx="6" />
      <ellipse cx="150" cy="140" rx="60" ry="75" fill="#1e293b" />
      <ellipse cx="150" cy="155" rx="48" ry="58" fill="#fcd34d" />
      <path d="M 90 280 L 150 260 L 210 280 L 230 400 L 70 400 Z" fill="#ffffff" />
      <rect x="0" y="360" width="300" height="40" fill="rgba(15, 23, 42, 0.75)" />
      <text x="150" y="385" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">PASFOTO 3x4 RESMI</text>
    </svg>
  `;
}

function getKuitansiMockSVG(nama, regNo, tgl) {
  const safeNama = escapeHTML(nama || 'CALON SISWA');
  const safeReg = escapeHTML(regNo || 'SPMB-2026-001');
  const safeTgl = escapeHTML(tgl || '05 Oktober 2026');
  return `
    <svg class="doc-svg-mock" viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="380" fill="#fdfbf7" rx="8" />
      <rect x="15" y="15" width="570" height="350" fill="none" stroke="#006837" stroke-width="2.5" rx="6" />
      <rect x="15" y="15" width="570" height="65" fill="#006837" />
      <text x="300" y="42" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">SMA MUHAMMADIYAH 3 YOGYAKARTA</text>
      <text x="300" y="62" font-family="sans-serif" font-size="15" font-weight="900" fill="#fcd34d" text-anchor="middle" letter-spacing="1">KUITANSI RESMI BUKTI BAYAR SPMB</text>
      <text x="40" y="145" font-family="sans-serif" font-size="11" fill="#64748b">Telah Diterima Dari</text>
      <text x="180" y="145" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">: ${safeNama}</text>
      <text x="40" y="172" font-family="sans-serif" font-size="11" fill="#64748b">No. Pendaftaran</text>
      <text x="180" y="172" font-family="monospace" font-size="12" font-weight="bold" fill="#0369a1">: ${safeReg}</text>
      <text x="40" y="200" font-family="sans-serif" font-size="11" fill="#64748b">Tanggal</text>
      <text x="180" y="200" font-family="sans-serif" font-size="11" fill="#334155">: ${safeTgl}</text>
      <rect x="40" y="225" width="280" height="45" fill="#f0fdf4" stroke="#86efac" stroke-width="2" rx="6" />
      <text x="55" y="254" font-family="monospace" font-size="18" font-weight="900" fill="#15803d">Rp 150.000,-</text>
    </svg>
  `;
}

// ====================================================
// DATA CONTOH PENDAFTAR:
// - 10 Contoh Pendaftar yang SUDAH TERVERIFIKASI / OTOMATIS TERAKTIVASI (NISN & Email Unik)
// - 2 Contoh Identifikasi Bot / Spam (Untuk demonstrasi fitur identifikasi & hapus bot oleh Admin)
// ====================================================
const SEED_INDONESIAN_STUDENTS = [
  {
    id_pendaftar: "SPMB-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    email: "ahmad.dahlan@gmail.com",
    no_wa: "081234567891",
    nisn: "0051234567",
    status_akun: "active",
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T08:00:05Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T09:15:04Z",
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
    status_akun: "active",
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T10:00:03Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T10:30:05Z",
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
    status_akun: "active",
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T11:15:02Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T12:00:05Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T13:20:04Z",
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
    status_akun: "active",
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T14:10:03Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T14:45:02Z",
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
    metode_aktivasi: "OTOMATIS_REGISTRASI",
    security_flag: "VERIFIED_UNIQUE",
    security_note: "Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)",
    activated_at: "2026-10-05T15:10:04Z",
    created_at: "2026-10-05T15:10:00Z",
    biodata: { asal_sekolah: "SMP Negeri 1 Sleman", pilihan_jurusan: "IPS", alamat: "Jl. Magelang KM 6, Mlati" },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-BOT1",
    nama_lengkap: "AutoBot_SpamScript_X99",
    email: "crawler.bot99@tempmail.org",
    no_wa: "080000000000",
    nisn: "9999999999",
    status_akun: "pending_activation",
    metode_aktivasi: "HOLD_BOT_DETECTION",
    is_bot_suspect: true,
    security_flag: "BOT_SUSPECT",
    security_note: "Teridentifikasi Bot: Honeypot terisi otomatis, waktu submit 180ms, pola NISN berulang (9999999999).",
    created_at: "2026-10-05T16:02:11Z",
    biodata: null,
    pembayaran: null
  }
];

/**
 * Mengambil data pendaftar terbaru dari local storage & memastikan akun non-bot sudah terverifikasi/aktif otomatis
 */
function fetchCurrentPendaftar() {
  try {
    let list = getPendaftarList();
    const raw = localStorage.getItem('spmb_pendaftar_db');
    let current = raw ? JSON.parse(raw) : [];
    const currentIds = new Set(current.map(i => i.id_pendaftar || i.id));
    let changed = false;

    SEED_INDONESIAN_STUDENTS.forEach(seed => {
      if (!currentIds.has(seed.id_pendaftar)) {
        if (seed.status_akun === 'active' && !seed.notifikasi_aktivasi) {
          dispatchActivationNotification(seed, 'Otomatis Saat Registrasi (NISN & Email Unik)');
        }
        current.push(seed);
        changed = true;
      }
    });

    // Pastikan seluruh akun siswa non-bot di storage berstatus Terverifikasi / Otomatis Aktif (tanpa flag duplikat di dashboard)
    current.forEach(item => {
      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');
      if (!isBot) {
        if (item.is_duplicate_flag || item.is_typo_reported || item.security_flag === 'DUPLICATE_CONFLICT' || item.status_akun !== 'active') {
          item.status_akun = 'active';
          item.metode_aktivasi = 'OTOMATIS_REGISTRASI';
          item.is_duplicate_flag = false;
          item.is_typo_reported = false;
          item.security_flag = 'VERIFIED_UNIQUE';
          if (item.nama_lengkap === 'Siti Nurhalizah (Typo Nama & Email)') {
            item.nama_lengkap = 'Siti Nurhaliza';
            item.email = 'siti.nurhaliza@gmail.com';
          }
          if (!item.security_note || item.security_note.includes('Typo') || item.security_note.includes('duplikat')) {
            item.security_note = 'Terverifikasi & Otomatis Aktif (NISN & Email Unik -> Email Login Terkirim)';
          }
          changed = true;
        }
        if (!item.notifikasi_aktivasi) {
          dispatchActivationNotification(item, 'Otomatis Saat Registrasi (NISN & Email Unik)');
          changed = true;
        }
      }
    });

    if (changed) {
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

  let activeSubView = 'accounts'; // 'accounts' | 'notifications'
  let searchQuery = '';
  let activeFilter = 'all'; // 'all' | 'verified' | 'bot'
  let notifSearchQuery = '';
  let notifStatusFilter = 'ALL'; // 'ALL' | 'SENT' | 'BLOCKED'
  let pendaftarList = fetchCurrentPendaftar();
  let currentPreviewStudentId = null;

  container.innerHTML = `
    <div class="admin-shell" id="admin-spmb-root">
      
      <!-- Top Context Banner -->
      <div style="background: #ffffff; padding: 0.75rem 1.75rem; border: 1px solid var(--admin-border); border-radius: var(--admin-radius-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--admin-primary); background: var(--admin-primary-light); padding: 4px 12px; border-radius: 9999px;">
            🛡️ Modul 02: Admin SPMB (Otomatisasi Aktivasi &amp; Identifikasi Bot)
          </span>
          <span style="font-size: 0.8rem; color: var(--admin-text-muted);">
            Akun Terverifikasi/Aktivasi Otomatis &bull; Identifikasi Bot &bull; Edit Data (Typo) &amp; Hapus Pendaftar
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #16a34a; font-weight: 600;">
          <span class="pulse-dot" style="display: inline-block;"></span>
          <span>Auto-Activation &amp; Anti-Bot Filter Aktif</span>
        </div>
      </div>

      <div class="admin-dashboard-layout">
        
        <!-- 1. HEADER MODUL -->
        <header class="admin-top-header">
          <div class="header-left">
            <div class="header-breadcrumb">
              <span>Administrasi SPMB</span>
              <span class="breadcrumb-separator">/</span>
              <span>Monitoring Akun Terverifikasi, Identifikasi Bot &amp; Edit Data</span>
            </div>
            <h1 class="header-title">
              <span>Pengelolaan Akun Terverifikasi &amp; Identifikasi Bot</span>
            </h1>
          </div>

          <div class="header-right">
            <div class="search-bar-wrapper">
              <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input 
                type="text" 
                id="admin-search-input" 
                class="search-input-field" 
                placeholder="Cari nama, no. pendaftaran, NISN, email..." 
                autocomplete="off"
              />
              <button type="button" id="admin-search-clear" class="search-clear-btn" title="Hapus pencarian">✕</button>
            </div>

            <!-- Tombol Switch ke Notifikasi Email -->
            <button type="button" class="header-action-btn" id="btn-admin-notif" title="Lihat Contoh & Log Notifikasi Email Aktivasi">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span class="notif-badge-pill" id="badge-notif-count">10</span>
            </button>

            <div class="admin-profile-pill" id="admin-profile-card" title="Profil Administrator">
              <div class="admin-avatar">AP</div>
              <div class="admin-profile-meta">
                <span class="admin-name">Admin SPMB</span>
                <span class="admin-role">Superadmin IT</span>
              </div>
            </div>
          </div>
        </header>

        <!-- 2. MENU NAVIGASI HORIZONTAL -->
        <aside class="admin-sidebar">
          <ul class="nav-menu-list">
            <li class="nav-menu-item">
              <ul class="nav-submenu-list">
                <li class="nav-submenu-item active" id="nav-tab-accounts">
                  <a href="javascript:void(0)" id="sub-pengelolaan-akun">
                    <span>👥 Daftar Akun Terverifikasi &amp; Identifikasi Bot</span>
                    <span class="sub-badge">Utama</span>
                  </a>
                </li>
                <li class="nav-submenu-item" id="nav-tab-notifications">
                  <a href="javascript:void(0)" id="sub-notifikasi-email">
                    <span>📧 Contoh &amp; Log Notifikasi Email Aktivasi</span>
                    <span class="sub-badge" style="background: #dcfce7; color: #166534;">Otomatis</span>
                  </a>
                </li>
              </ul>
            </li>

            <li class="nav-menu-item">
              <div class="nav-item-link" id="sidebar-shortcut-walkin" style="cursor: pointer;">
                <div class="nav-link-content">
                  <span>➕ Input Pendaftar Loket Walk-in</span>
                </div>
              </div>
            </li>
          </ul>

          <div class="sidebar-footer">
            <div class="system-status-box">
              <div class="status-indicator-row">
                <span class="pulse-dot"></span>
                <span>Aktivasi Otomatis Aktif</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- 3. MAIN AREA -->
        <main class="admin-main-area">
          <div class="admin-content-body">

            <!-- ==========================================================
                 SUB-VIEW 1: DAFTAR AKUN TERVERIFIKASI/AKTIVASI & IDENTIFIKASI BOT
                 ========================================================== -->
            <div id="admin-subview-accounts">

              <!-- 3 Summary Cards: Total, Terverifikasi/Aktivasi Otomatis, & Teridentifikasi Bot -->
              <section class="summary-cards-grid">
                <div class="summary-card card-total">
                  <div class="stat-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Total Pendaftar Masuk</span>
                    <span class="stat-value" id="stat-total-pendaftar">0</span>
                    <span class="stat-subtext">Terdata pada sistem SPMB</span>
                  </div>
                </div>

                <div class="summary-card card-active">
                  <div class="stat-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Sudah Terverifikasi / Aktivasi Otomatis</span>
                    <span class="stat-value" id="stat-akun-aktif" style="color: #15803d;">0</span>
                    <span class="stat-subtext"><span style="color: #15803d; font-weight: 700;">✓ Email Login Terkirim</span> (Siap Login)</span>
                  </div>
                </div>

                <div class="summary-card" style="border-left: 4px solid #dc2626;">
                  <div class="stat-icon-wrapper" style="background: #fef2f2; color: #dc2626;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="10" rx="2"/>
                      <circle cx="12" cy="5" r="2"/>
                      <path d="M12 7v4"/>
                    </svg>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Identifikasi Bot / Spam</span>
                    <span class="stat-value" id="stat-bot-detected" style="color: #dc2626;">0</span>
                    <span class="stat-subtext"><span style="color: #dc2626; font-weight: 700;">🤖 Ditahan Sistem</span> &bull; Dapat dihapus Admin</span>
                  </div>
                </div>
              </section>

              <!-- CONTOH YANG SUDAH TERVERIFIKASI / AKTIVASI DI HALAMAN ADMIN -->
              <section id="verified-showcase-section" style="background: #ffffff; border: 1.5px solid #86efac; border-left: 6px solid #006837; border-radius: var(--admin-radius-md); padding: 1.15rem 1.35rem; margin-bottom: 1.25rem; box-shadow: 0 4px 12px rgba(0, 104, 55, 0.05);">
                <!-- Diisi dinamis oleh renderVerifiedShowcase() -->
              </section>

              <!-- Panel Peringatan Cepat: Identifikasi Bot Saja -->
              <div id="bot-alert-panel" class="anomaly-monitor-card" style="display: none; border-color: #fecaca; border-left-color: #dc2626;">
                <!-- Diisi dinamis oleh renderBotMonitorPanel() -->
              </div>

              <!-- Tabel Data Pengelolaan Akun -->
              <section class="admin-table-card">
                <div class="table-toolbar">
                  <div class="toolbar-left">
                    <h2 class="table-card-title">
                      <span>Daftar Pendaftar (Terverifikasi/Aktivasi Otomatis &amp; Identifikasi Bot)</span>
                    </h2>
                    <span class="data-count-chip" id="data-count-badge">Memuat data...</span>
                  </div>

                  <div class="toolbar-right">
                    <button type="button" class="btn-walkin-add" id="btn-open-walkin" title="Pendaftaran calon siswa langsung di loket fisik (Walk-in)">
                      <span>➕ Input Pendaftar Loket</span>
                      <span class="badge-hot">Walk-in</span>
                    </button>

                    <div class="filter-btn-group">
                      <button type="button" class="filter-btn active" data-filter="all">Semua</button>
                      <button type="button" class="filter-btn" data-filter="verified">✓ Terverifikasi / Aktif</button>
                      <button type="button" class="filter-btn" data-filter="bot">🤖 Identifikasi Bot</button>
                    </div>

                    <button type="button" class="btn-refresh" id="btn-refresh-data" title="Muat ulang data terkini">
                      <span>🔄 Segarkan</span>
                    </button>
                  </div>
                </div>

                <div class="table-responsive-wrapper">
                  <table class="spmb-data-table" id="admin-pendaftar-table">
                    <thead>
                      <tr>
                        <th class="col-num">No</th>
                        <th>Nama Lengkap &amp; NISN</th>
                        <th>No. Pendaftaran</th>
                        <th>Email &amp; No. WhatsApp</th>
                        <th>Status Aktivasi / Identifikasi</th>
                        <th>Notifikasi Email Login</th>
                        <th style="text-align: right; padding-right: 20px;">Aksi Admin (Edit Typo / Email / Hapus)</th>
                      </tr>
                    </thead>
                    <tbody id="table-pendaftar-body">
                      <!-- Dynamic Rows -->
                    </tbody>
                  </table>
                </div>

                <div class="table-footer">
                  <div class="footer-info" id="table-footer-info">
                    Menampilkan data pendaftar terdaftar
                  </div>
                </div>
              </section>
            </div>

            <!-- ==========================================================
                 SUB-VIEW 2: CONTOH & LOG NOTIFIKASI EMAIL AKTIVASI
                 ========================================================== -->
            <div id="admin-subview-notifications" style="display: none;">
              <div class="activation-notif-banner">
                <div>
                  <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 999px; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                    ⚡ Sistem Pengiriman Email Otomatis Saat Registrasi
                  </span>
                  <h2 style="font-size: 1.4rem; font-weight: 800; margin: 8px 0 4px;">
                    📧 Contoh Tampilan &amp; Log Notifikasi Email Aktivasi Akun
                  </h2>
                  <p style="margin: 0; font-size: 0.85rem; opacity: 0.92;">
                    Setiap pendaftar yang terverifikasi unik langsung menerima email berisi kredensial &amp; tautan Login seperti contoh di bawah ini.
                  </p>
                </div>
                <button type="button" id="btn-back-to-accounts" style="background: #ffffff; color: #006837; border: none; border-radius: 8px; padding: 10px 16px; font-size: 0.82rem; font-weight: 800; cursor: pointer;">
                  &larr; Kembali ke Tabel Pengelolaan Akun
                </button>
              </div>

              <div class="activation-stat-grid">
                <div class="activation-stat-card" style="border-left: 4px solid #006837;">
                  <div style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Email Aktivasi Terkirim</div>
                  <div id="notif-stat-sent" style="font-size: 1.65rem; font-weight: 800; color: #15803d; margin-top: 4px;">0</div>
                  <div style="font-size: 0.74rem; color: #16a34a;">✓ Terkirim otomatis ke pendaftar terverifikasi</div>
                </div>
                <div class="activation-stat-card" style="border-left: 4px solid #dc2626;">
                  <div style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Diblokir Filter Anti-Bot</div>
                  <div id="notif-stat-bot" style="font-size: 1.65rem; font-weight: 800; color: #dc2626; margin-top: 4px;">0</div>
                  <div style="font-size: 0.74rem; color: #dc2626;">🤖 Tidak dikirimi email aktivasi</div>
                </div>
              </div>

              <section class="admin-table-card">
                <div class="table-toolbar">
                  <div class="toolbar-left">
                    <h2 class="table-card-title">
                      <span>Daftar Pengiriman &amp; Contoh Tampilan Email Aktivasi Login</span>
                    </h2>
                  </div>
                  <div class="toolbar-right">
                    <input type="text" id="notif-search-input" class="walkin-input" placeholder="Cari nama, NISN, atau email..." style="min-width: 220px;" />
                    <select id="notif-status-select" class="walkin-select">
                      <option value="ALL">Semua Status Email</option>
                      <option value="SENT">✅ Email Aktivasi Terkirim</option>
                      <option value="BLOCKED">🚫 Diblokir (Indikasi Bot)</option>
                    </select>
                  </div>
                </div>

                <div class="table-responsive-wrapper">
                  <table class="spmb-data-table">
                    <thead>
                      <tr>
                        <th class="col-num">No</th>
                        <th>Pendaftar &amp; No. Registrasi</th>
                        <th>Email &amp; No. WA Tujuan</th>
                        <th>Metode Aktivasi</th>
                        <th>Waktu Kirim Email</th>
                        <th>Status Pengiriman</th>
                        <th style="text-align: right; padding-right: 20px;">Aksi Pratinjau Email</th>
                      </tr>
                    </thead>
                    <tbody id="table-notif-email-body">
                      <!-- Populated dynamically -->
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

          </div>
        </main>

      </div>

      <!-- ==============================================
           MODAL 1: EDIT DATA PENDAFTAR (PERBAIKAN LAPORAN TYPO NAMA, EMAIL, NISN, NO. WA)
           ============================================== -->
      <div class="admin-modal-backdrop" id="admin-edit-modal">
        <div class="admin-modal-card" style="max-width: 600px;">
          <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); color: #ffffff;">
            <h3 class="modal-title" style="color: #ffffff;">
              <span>✏️ Edit Data Akun Pendaftar (Perbaikan Laporan Typo)</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-edit-modal" style="color: #ffffff;" title="Tutup">✕</button>
          </div>
          <div class="modal-body" id="modal-edit-body" style="padding: 1.25rem;">
            <div class="modal-notice-banner info" style="margin-bottom: 1rem;">
              <span style="font-size: 1.15rem;">🛠️</span>
              <div>
                <strong>Koreksi Kesalahan Ketik (Typo) Pendaftar:</strong><br>
                Gunakan formulir ini apabila pendaftar menghubungi Admin karena salah ketik pada <strong>Nama Lengkap, Email, NISN, atau No. WhatsApp</strong>.
              </div>
            </div>

            <div id="edit-form-alert" style="display: none; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 600;"></div>

            <input type="hidden" id="edit-pendaftar-id" />

            <div class="walkin-form-grid" style="gap: 0.9rem;">
              <div class="walkin-field-group">
                <label class="walkin-label" for="edit-nama">
                  <span>Nama Lengkap Siswa <span class="req">*</span></span>
                </label>
                <input type="text" id="edit-nama" class="walkin-input" placeholder="Nama lengkap sesuai Ijazah/KK" required />
              </div>

              <div class="walkin-fields-row">
                <div class="walkin-field-group">
                  <label class="walkin-label" for="edit-nisn">
                    <span>NISN (10 Digit Angka) <span class="req">*</span></span>
                  </label>
                  <input type="text" id="edit-nisn" class="walkin-input" maxlength="10" placeholder="10 digit NISN" required />
                </div>

                <div class="walkin-field-group">
                  <label class="walkin-label" for="edit-wa">
                    <span>No. WhatsApp Aktif <span class="req">*</span></span>
                  </label>
                  <input type="text" id="edit-wa" class="walkin-input" placeholder="081234567890" required />
                </div>
              </div>

              <div class="walkin-field-group">
                <label class="walkin-label" for="edit-email">
                  <span>Alamat Email Pendaftar <span class="req">*</span></span>
                </label>
                <input type="email" id="edit-email" class="walkin-input" placeholder="nama@gmail.com" required />
                <span class="walkin-helper-text">Notifikasi Email Aktivasi &amp; Login akan dikirim ulang ke email ini setelah disimpan.</span>
              </div>

              <div class="walkin-field-group">
                <label class="walkin-label" for="edit-catatan">
                  <span>Catatan Perbaikan Admin</span>
                </label>
                <input type="text" id="edit-catatan" class="walkin-input" placeholder="Contoh: Perbaikan typo penulisan nama/email sesuai laporan siswa" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-refresh" id="btn-cancel-edit-modal" style="padding: 8px 16px;">Batal</button>
            <button type="button" class="btn-action-activate" id="btn-save-edit-modal" style="padding: 8px 20px;">
              💾 Simpan Perubahan &amp; Kirim Ulang Email Login
            </button>
          </div>
        </div>
      </div>

      <!-- ==============================================
           MODAL 2: CONTOH TAMPILAN NOTIFIKASI EMAIL AKTIVASI & LOGIN
           ============================================== -->
      <div class="admin-modal-backdrop" id="admin-preview-email-modal">
        <div class="admin-modal-card modal-lg" style="max-width: 720px;">
          <div class="modal-header" style="background: linear-gradient(135deg, #064e3b 0%, #006837 100%); color: #ffffff;">
            <div>
              <h3 class="modal-title" style="color: #ffffff; margin: 0;">
                <span>📩 Contoh Tampilan Notifikasi Email Aktivasi Akun &amp; Login</span>
              </h3>
              <p style="margin: 2px 0 0; font-size: 0.76rem; opacity: 0.9;">
                Email ini diterima otomatis oleh siswa setelah akun terverifikasi/teraktivasi
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-preview-email" style="color: #ffffff;" title="Tutup">✕</button>
          </div>

          <div class="modal-body" style="padding: 1.25rem;">
            <!-- Metadata Pengiriman -->
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem;">
              <div>
                <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">Penerima &amp; No. Pendaftaran</div>
                <div id="preview-meta-nama" style="font-weight: 800; color: #0f172a; margin-top: 2px;">-</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">Kontak Tujuan</div>
                <div id="preview-meta-kontak" style="font-weight: 700; color: #0369a1; margin-top: 2px;">-</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">Metode Aktivasi</div>
                <div id="preview-meta-metode" style="font-weight: 700; color: #006837; margin-top: 2px;">Otomatis (NISN &amp; Email Unik)</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">Status &amp; Waktu Pengiriman</div>
                <div id="preview-meta-status" style="font-weight: 700; color: #16a34a; margin-top: 2px;">-</div>
              </div>
            </div>

            <!-- Tab Pilih Format: Email HTML vs WhatsApp -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px; background: #e2e8f0; padding: 5px; border-radius: 8px;">
              <button type="button" class="preview-tab-btn active" id="btn-tab-preview-email">
                <span>✉️ Email Resmi Aktivasi &amp; Login (HTML)</span>
              </button>
              <button type="button" class="preview-tab-btn" id="btn-tab-preview-wa">
                <span>💬 Pesan Pendamping WhatsApp</span>
              </button>
            </div>

            <!-- Kontainer Email HTML -->
            <div id="container-preview-email" class="email-preview-frame-wrapper">
              <div id="preview-email-html-box"></div>
            </div>

            <!-- Kontainer WhatsApp -->
            <div id="container-preview-wa" class="whatsapp-bubble-box" style="display: none;">
              <div id="preview-wa-text-box" class="whatsapp-chat-bubble"></div>
            </div>
          </div>

          <div class="modal-footer" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-refresh" id="btn-copy-email-html" style="padding: 8px 12px;">
                📋 Salin Teks Email
              </button>
              <button type="button" class="btn-refresh" id="btn-copy-wa-text" style="padding: 8px 12px;">
                📋 Salin Pesan WA
              </button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn-refresh" id="btn-close-preview-email-foot" style="padding: 8px 16px;">Tutup</button>
              <button type="button" class="btn-action-activate" id="btn-resend-email-modal" style="padding: 8px 16px;">
                🔄 Kirim Ulang Email Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           MODAL 3: DETAIL PESERTA & BERKAS FISIK
           ============================================== -->
      <div class="admin-modal-backdrop" id="admin-detail-modal">
        <div class="admin-modal-card modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📋 Detail Biodata &amp; Berkas Peserta SPMB</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-modal" title="Tutup">✕</button>
          </div>

          <div class="modal-tabs-bar">
            <button type="button" class="modal-tab-btn active" id="btn-tab-biodata" data-tab="biodata">
              <span>📋 1. Rincian Biodata &amp; Status Registrasi</span>
            </button>
            <button type="button" class="modal-tab-btn" id="btn-tab-documents" data-tab="documents">
              <span>📑 2. Pratinjau Berkas Fisik</span>
              <span class="tab-badge-pill" id="badge-doc-count">4 Berkas</span>
            </button>
          </div>

          <div class="modal-body" id="modal-detail-content" style="padding-top: 1rem;"></div>
          <div class="modal-footer" id="modal-footer-actions"></div>
        </div>
      </div>

      <!-- MODAL 4: INPUT PENDAFTAR LOKET WALK-IN -->
      <div class="admin-modal-backdrop" id="admin-walkin-modal">
        <div class="admin-modal-card modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>➕ Input Pendaftar Loket Offline (Walk-in)</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-walkin-modal" title="Tutup">✕</button>
          </div>
          <div class="modal-body" id="modal-walkin-body"></div>
          <div class="modal-footer" id="modal-walkin-footer">
            <button type="button" class="btn-refresh" id="btn-cancel-walkin" style="padding: 8px 16px;">Batal</button>
            <button type="button" class="btn-action-activate" id="btn-submit-walkin" style="padding: 8px 20px;">
              💾 Simpan &amp; Aktivasi Otomatis Walk-in
            </button>
          </div>
        </div>
      </div>

      <!-- LIGHTBOX PREVIEW DOKUMEN -->
      <div class="admin-lightbox-modal" id="admin-lightbox-modal">
        <div class="lightbox-window">
          <div class="lightbox-header">
            <span class="lightbox-title" id="lightbox-doc-title">📑 Pratinjau Dokumen Lampiran</span>
            <button type="button" class="btn-close-modal" style="color: #ffffff;" id="btn-close-lightbox" title="Tutup">✕</button>
          </div>
          <div class="lightbox-view-area" id="lightbox-display-area"></div>
          <div class="lightbox-footer">
            <span style="font-size: 0.8rem; color: var(--admin-text-muted);" id="lightbox-doc-meta">Status Berkas</span>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="doc-btn doc-btn-primary" id="btn-lightbox-close-foot">Tutup</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Feedback Container -->
      <div class="admin-toast-container" id="admin-toast-container"></div>

    </div>
  `;

  // Referensi Elemen DOM
  const searchInput = document.getElementById('admin-search-input');
  const searchClear = document.getElementById('admin-search-clear');
  const tableBody = document.getElementById('table-pendaftar-body');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const btnRefresh = document.getElementById('btn-refresh-data');
  const statTotal = document.getElementById('stat-total-pendaftar');
  const statAktif = document.getElementById('stat-akun-aktif');
  const statBot = document.getElementById('stat-bot-detected');
  const countBadge = document.getElementById('data-count-badge');
  const footerInfo = document.getElementById('table-footer-info');
  const botAlertPanel = document.getElementById('bot-alert-panel');
  const verifiedShowcaseSection = document.getElementById('verified-showcase-section');

  function showToast(title, message, type = 'success') {
    const toastContainer = document.getElementById('admin-toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type === 'success' ? 'toast-success' : 'toast-warning'}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</div>
      <div class="toast-message-box">
        <span class="toast-title">${escapeHTML(title)}</span>
        <span class="toast-desc">${escapeHTML(message)}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3800);
  }

  function getInitials(name) {
    if (!name) return 'SP';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Update Statistik, Showcase Akun Terverifikasi & Panel Identifikasi Bot
  function updateSummaryStats() {
    pendaftarList = fetchCurrentPendaftar();

    let totalCount = pendaftarList.length;
    let verifiedCount = 0;
    let botCount = 0;

    pendaftarList.forEach(item => {
      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');
      if (isBot) {
        botCount++;
      } else {
        verifiedCount++;
      }
    });

    if (statTotal) statTotal.textContent = totalCount.toLocaleString('id-ID');
    if (statAktif) statAktif.textContent = verifiedCount.toLocaleString('id-ID');
    if (statBot) statBot.textContent = botCount.toLocaleString('id-ID');

    const badgeNotif = document.getElementById('badge-notif-count');
    if (badgeNotif) badgeNotif.textContent = String(verifiedCount);

    const notifSentEl = document.getElementById('notif-stat-sent');
    const notifBotEl = document.getElementById('notif-stat-bot');
    if (notifSentEl) notifSentEl.textContent = String(verifiedCount);
    if (notifBotEl) notifBotEl.textContent = String(botCount);

    renderVerifiedShowcase();
    renderBotMonitorPanel(botCount);
  }

  // Render Contoh Pendaftar yang Sudah Terverifikasi / Aktivasi Otomatis di Halaman Admin
  function renderVerifiedShowcase() {
    if (!verifiedShowcaseSection) return;
    const sampleVerified = pendaftarList.find(i => !i.is_bot_suspect && i.security_flag !== 'BOT_SUSPECT') || SEED_INDONESIAN_STUDENTS[0];
    if (!sampleVerified) {
      verifiedShowcaseSection.style.display = 'none';
      return;
    }

    const regId = sampleVerified.id_pendaftar || sampleVerified.id;
    const regNo = formatRegNumber(regId);
    const nama = sampleVerified.nama_lengkap || sampleVerified.nama || 'Ahmad Dahlan';
    const nisn = sampleVerified.nisn || '0051234567';
    const email = sampleVerified.email || 'ahmad.dahlan@gmail.com';
    const noWa = sampleVerified.no_wa || '081234567891';
    const meta = computeActivationNotificationMetadata(sampleVerified);

    verifiedShowcaseSection.style.display = 'block';
    verifiedShowcaseSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div style="flex: 1; min-width: 280px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
            <span style="background: #dcfce7; color: #166534; border: 1px solid #86efac; font-size: 0.72rem; font-weight: 800; padding: 3px 10px; border-radius: 999px;">
              ✓ CONTOH AKUN SUDAH TERVERIFIKASI / OTOMATIS AKTIF
            </span>
            <span style="font-size: 0.75rem; color: #64748b;">
              (NISN &amp; Email Tidak Duplikat &rarr; Langsung Aktif &amp; Email Login Terkirim)
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-top: 8px; font-size: 0.8rem;">
            <div>
              <span style="color: #64748b; font-size: 0.7rem; display: block; font-weight: 700;">NAMA &amp; NO. PENDAFTARAN</span>
              <strong style="color: #0f172a;">${escapeHTML(nama)}</strong>
              <span style="display: block; font-family: monospace; color: #006837; font-weight: 800;">${escapeHTML(regNo)}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.7rem; display: block; font-weight: 700;">NISN &amp; NO. WHATSAPP</span>
              <strong style="color: #0369a1; font-family: monospace;">${escapeHTML(nisn)}</strong>
              <span style="display: block; color: #475569;">WA: ${escapeHTML(noWa)}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.7rem; display: block; font-weight: 700;">EMAIL PENERIMA LOGIN</span>
              <strong style="color: #0f172a;">${escapeHTML(email)}</strong>
              <span style="display: block; color: #16a34a; font-weight: 700;">📩 ${escapeHTML(meta.status_pengiriman)}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; justify-content: center;">
          <button type="button" id="btn-showcase-preview-email" class="btn-action-activate" style="padding: 9px 16px; font-size: 0.8rem;">
            📩 Lihat Contoh Tampilan Email Aktivasi (${escapeHTML(nama)})
          </button>
          <button type="button" id="btn-showcase-edit-sample" class="btn-action-edit" style="justify-content: center; padding: 7px 14px;">
            ✏️ Contoh Edit Data (Jika Laporan Typo)
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-showcase-preview-email')?.addEventListener('click', () => {
      openEmailPreviewModal(regId);
    });
    document.getElementById('btn-showcase-edit-sample')?.addEventListener('click', () => {
      openEditModal(regId);
    });
  }

  // Render Panel Identifikasi Bot Saja (Tanpa Duplikat)
  function renderBotMonitorPanel(botCount) {
    if (!botAlertPanel) return;
    const botItems = pendaftarList.filter(item => item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');

    if (botItems.length === 0) {
      botAlertPanel.style.display = 'none';
      return;
    }

    botAlertPanel.style.display = 'block';
    botAlertPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">🤖</span>
          <div>
            <strong style="color: #991b1b; font-size: 0.9rem;">Radar Identifikasi Bot / Spam (${botItems.length} Entri Terdeteksi)</strong>
            <div style="font-size: 0.76rem; color: #64748b;">
              Sistem menahan akun di bawah ini karena teridentifikasi pola bot otomatis. Admin dapat langsung menghapusnya.
            </div>
          </div>
        </div>
        <button type="button" id="btn-purge-all-bots" class="btn-action-delete" style="padding: 6px 12px;">
          🗑️ Hapus Semua Akun Bot (${botCount})
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${botItems.map(item => {
          const regId = item.id_pendaftar || item.id;
          const nama = escapeHTML(item.nama_lengkap || item.nama || '-');
          const nisn = escapeHTML(item.nisn || '-');
          const email = escapeHTML(item.email || '-');
          const note = escapeHTML(item.security_note || 'Indikasi Bot Otomatis');

          return `
            <div class="anomaly-item-row" style="background: #fff5f5; border-color: #fecaca;">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;">
                <span style="font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; background:#fee2e2; color:#991b1b;">
                  🤖 BOT TERDETEKSI
                </span>
                <div>
                  <strong style="color: #0f172a;">${nama}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">(NISN: <code>${nisn}</code> &bull; Email: <code>${email}</code>)</span>
                  <div style="font-size: 0.74rem; color: #dc2626;">${note}</div>
                </div>
              </div>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn-action-delete btn-quick-bot-delete" data-id="${escapeHTML(regId)}" data-name="${nama}">
                  🗑️ Hapus Pendaftar Bot
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('btn-purge-all-bots')?.addEventListener('click', () => {
      if (confirm(`Hapus permanen ${botItems.length} akun yang teridentifikasi sebagai Bot / Spam?`)) {
        botItems.forEach(b => deletePendaftar(b.id_pendaftar || b.id));
        updateSummaryStats();
        renderTableRows();
        renderNotificationTableRows();
        showToast('Akun Bot Dihapus', `${botItems.length} akun teridentifikasi bot berhasil dihapus.`, 'success');
      }
    });

    botAlertPanel.querySelectorAll('.btn-quick-bot-delete').forEach(btn => {
      btn.onclick = () => executeDeletePendaftar(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
    });
  }

  // Filter & Search Logic
  function getFilteredList() {
    const query = searchQuery.toLowerCase().trim();

    return pendaftarList.filter(item => {
      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');

      if (activeFilter === 'verified' && isBot) return false;
      if (activeFilter === 'bot' && !isBot) return false;

      if (!query) return true;
      const nama = (item.nama_lengkap || item.nama || '').toLowerCase();
      const id = (item.id_pendaftar || item.id || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const nisn = (item.nisn || '').toLowerCase();
      const wa = (item.no_wa || '').toLowerCase();

      return nama.includes(query) || id.includes(query) || email.includes(query) || nisn.includes(query) || wa.includes(query);
    });
  }

  // Render Baris Tabel Utama
  function renderTableRows() {
    const filtered = getFilteredList();

    if (countBadge) countBadge.textContent = `${filtered.length} dari ${pendaftarList.length} Pendaftar`;
    if (footerInfo) {
      footerInfo.textContent = `Menampilkan ${filtered.length} pendaftar (Sudah Terverifikasi/Aktivasi Otomatis & Identifikasi Bot)`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="table-empty-state">
              <div class="empty-state-icon">🔍</div>
              <div class="empty-state-text">Tidak ada data pendaftar yang cocok dengan filter</div>
              <div class="empty-state-subtext">Coba ubah kata kunci pencarian atau pilih tab filter Semua.</div>
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
      const email = item.email || '-';
      const nisn = item.nisn || '-';
      const noWa = item.no_wa || '-';

      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');
      const notifMeta = computeActivationNotificationMetadata(item);

      const statusBadgeHtml = isBot
        ? `
          <div>
            <span class="status-pill status-pill-bot">
              <span class="pill-dot"></span>
              <span>🤖 Teridentifikasi Bot</span>
            </span>
            <div class="security-subnote note-bot">${escapeHTML(item.security_note || 'Indikasi pengisian bot otomatis')}</div>
          </div>
        `
        : `
          <div>
            <span class="status-pill status-pill-active">
              <span class="pill-dot"></span>
              <span>✓ Terverifikasi &amp; Aktif</span>
            </span>
            <div class="security-subnote note-ok">Otomatis Aktif (NISN &amp; Email Unik)</div>
          </div>
        `;

      const emailBadgeHtml = isBot
        ? `
          <span class="notif-badge-waiting" style="background:#fee2f2; color:#991b1b; border-color:#fecaca;">
            🚫 Diblokir (Bot)
          </span>
        `
        : `
          <div style="display: flex; flex-direction: column; gap: 3px; align-items: flex-start;">
            <span class="notif-badge-sent">
              <span>📩 Email Login Terkirim</span>
            </span>
            <span style="font-size: 0.68rem; color: #64748b;">${escapeHTML(notifMeta.waktu_kirim_label)}</span>
          </div>
        `;

      return `
        <tr data-id="${escapeHTML(regId)}" style="${isBot ? 'background: #fffafa;' : ''}">
          <td class="col-num">${index + 1}</td>

          <!-- Nama & NISN -->
          <td>
            <div class="student-meta-cell">
              <div class="student-avatar" style="${isBot ? 'background:#fee2e2; color:#991b1b;' : ''}" title="${escapeHTML(nama)}">${escapeHTML(getInitials(nama))}</div>
              <div class="student-names-box">
                <span class="student-name-text">${escapeHTML(nama)}</span>
                <span class="student-nisn-badge">NISN: <strong>${escapeHTML(nisn)}</strong></span>
              </div>
            </div>
          </td>

          <!-- Nomor Pendaftaran -->
          <td>
            <span class="reg-number-badge">${escapeHTML(displayRegNo)}</span>
          </td>

          <!-- Email & No WA -->
          <td>
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <span style="font-size: 0.82rem; font-weight: 600; color: #0f172a;">✉️ ${escapeHTML(email)}</span>
              <span style="font-size: 0.74rem; color: #475569;">📱 WA: ${escapeHTML(noWa)}</span>
            </div>
          </td>

          <!-- Status Aktivasi / Identifikasi -->
          <td style="max-width: 240px;">
            ${statusBadgeHtml}
          </td>

          <!-- Status Email Login -->
          <td>
            ${emailBadgeHtml}
          </td>

          <!-- Aksi Admin: Contoh Email, Edit Data (Typo), Detail, Hapus -->
          <td style="text-align: right; padding-right: 16px;">
            <div class="action-buttons-group" style="justify-content: flex-end; flex-wrap: wrap; gap: 6px;">
              ${!isBot ? `
                <button
                  type="button"
                  class="btn-preview-email-row btn-trigger-preview-email"
                  data-id="${escapeHTML(regId)}"
                  title="Lihat contoh tampilan notifikasi email aktivasi untuk login"
                >
                  <span>✉️ Contoh Email</span>
                </button>
              ` : ''}

              <button
                type="button"
                class="btn-action-edit btn-trigger-edit"
                data-id="${escapeHTML(regId)}"
                title="Edit Nama, Email, NISN, atau No. WhatsApp jika ada laporan typo"
              >
                <span>✏️ Edit Data</span>
              </button>

              <button
                type="button"
                class="btn-action-detail btn-trigger-detail"
                data-id="${escapeHTML(regId)}"
                title="Lihat rincian biodata & pratinjau berkas"
              >
                <span>📋 Detail</span>
              </button>

              <button
                type="button"
                class="btn-action-delete btn-trigger-delete"
                data-id="${escapeHTML(regId)}"
                data-name="${escapeHTML(nama)}"
                title="Hapus pendaftar ini dari sistem"
              >
                <span>🗑️ Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableEvents();
  }

  function attachTableEvents() {
    document.querySelectorAll('.btn-trigger-preview-email').forEach(btn => {
      btn.onclick = (e) => openEmailPreviewModal(e.currentTarget.getAttribute('data-id'));
    });

    document.querySelectorAll('.btn-trigger-edit').forEach(btn => {
      btn.onclick = (e) => openEditModal(e.currentTarget.getAttribute('data-id'));
    });

    document.querySelectorAll('.btn-trigger-detail').forEach(btn => {
      btn.onclick = (e) => openDetailModal(e.currentTarget.getAttribute('data-id'));
    });

    document.querySelectorAll('.btn-trigger-delete').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        executeDeletePendaftar(id, name);
      };
    });
  }

  // ====================================================
  // RENDER TAB 2: TABEL LOG & CONTOH NOTIFIKASI EMAIL AKTIVASI
  // ====================================================
  function renderNotificationTableRows() {
    const tbody = document.getElementById('table-notif-email-body');
    if (!tbody) return;

    const q = notifSearchQuery.toLowerCase().trim();
    const filtered = pendaftarList.filter(item => {
      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');
      if (notifStatusFilter === 'SENT' && isBot) return false;
      if (notifStatusFilter === 'BLOCKED' && !isBot) return false;

      if (!q) return true;
      const nama = (item.nama_lengkap || item.nama || '').toLowerCase();
      const nisn = (item.nisn || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      return nama.includes(q) || nisn.includes(q) || email.includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
            Tidak ada data pengiriman email yang sesuai filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      const regId = item.id_pendaftar || item.id;
      const regNo = formatRegNumber(regId);
      const nama = item.nama_lengkap || item.nama || '-';
      const email = item.email || '-';
      const noWa = item.no_wa || '-';
      const isBot = Boolean(item.is_bot_suspect || item.security_flag === 'BOT_SUSPECT');
      const meta = computeActivationNotificationMetadata(item);

      return `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td>
            <div style="font-weight: 800; color: #0f172a;">${escapeHTML(nama)}</div>
            <div style="font-size: 0.75rem; color: #64748b;">No. Reg: <strong>${escapeHTML(regNo)}</strong> &bull; NISN: ${escapeHTML(item.nisn || '-')}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; font-weight: 600; color: #0369a1;">✉️ ${escapeHTML(email)}</div>
            <div style="font-size: 0.74rem; color: #475569;">📱 WA: ${escapeHTML(noWa)}</div>
          </td>
          <td>
            <span style="font-size: 0.76rem; font-weight: 700; color: ${isBot ? '#dc2626' : '#006837'};">
              ${escapeHTML(meta.metode_kirim)}
            </span>
          </td>
          <td style="font-size: 0.78rem; color: #334155;">
            ${escapeHTML(meta.waktu_kirim_label)}
          </td>
          <td>
            ${isBot
              ? `<span class="notif-badge-waiting" style="background:#fee2f2; color:#991b1b; border-color:#fecaca;">🚫 Diblokir Anti-Bot</span>`
              : `<span class="notif-badge-sent">✅ ${escapeHTML(meta.status_pengiriman)} (${meta.jumlah_kirim}x)</span>`
            }
          </td>
          <td style="text-align: right; padding-right: 16px;">
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" class="btn-preview-email-row btn-notif-preview" data-id="${escapeHTML(regId)}">
                👁️ Lihat Contoh Email
              </button>
              ${!isBot ? `
                <button type="button" class="btn-resend-email-row btn-notif-resend" data-id="${escapeHTML(regId)}">
                  🔄 Kirim Ulang
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-notif-preview').forEach(btn => {
      btn.onclick = () => openEmailPreviewModal(btn.getAttribute('data-id'));
    });

    tbody.querySelectorAll('.btn-notif-resend').forEach(btn => {
      btn.onclick = () => triggerResendActivationEmail(btn.getAttribute('data-id'));
    });
  }

  // ====================================================
  // MODAL PRATINJAU CONTOH EMAIL AKTIVASI & LOGIN
  // ====================================================
  const previewEmailModal = document.getElementById('admin-preview-email-modal');
  const btnClosePreviewEmail = document.getElementById('btn-close-preview-email');
  const btnClosePreviewEmailFoot = document.getElementById('btn-close-preview-email-foot');
  const btnTabPreviewEmail = document.getElementById('btn-tab-preview-email');
  const btnTabPreviewWa = document.getElementById('btn-tab-preview-wa');
  const containerPreviewEmail = document.getElementById('container-preview-email');
  const containerPreviewWa = document.getElementById('container-preview-wa');

  function openEmailPreviewModal(id) {
    const student = pendaftarList.find(i => (i.id_pendaftar === id || i.id === id));
    if (!student) return;

    currentPreviewStudentId = id;
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const nama = student.nama_lengkap || student.nama || '-';
    const meta = computeActivationNotificationMetadata(student);
    const emailObj = generateActivationEmailMessage(student);
    const waText = generateActivationWhatsAppMessage(student);

    document.getElementById('preview-meta-nama').textContent = `${nama} (${regNo} • NISN: ${student.nisn || '-'})`;
    document.getElementById('preview-meta-kontak').textContent = `${student.email || '-'} | WA: ${student.no_wa || '-'}`;
    document.getElementById('preview-meta-metode').textContent = meta.metode_kirim;
    document.getElementById('preview-meta-status').textContent = `${meta.status_pengiriman} • ${meta.waktu_kirim_label}`;

    document.getElementById('preview-email-html-box').innerHTML = emailObj.html;
    document.getElementById('preview-wa-text-box').textContent = waText;

    btnTabPreviewEmail.classList.add('active');
    btnTabPreviewWa.classList.remove('active');
    containerPreviewEmail.style.display = 'block';
    containerPreviewWa.style.display = 'none';

    previewEmailModal.classList.add('open');
  }

  function closeEmailPreviewModal() {
    previewEmailModal.classList.remove('open');
  }

  if (btnClosePreviewEmail) btnClosePreviewEmail.onclick = closeEmailPreviewModal;
  if (btnClosePreviewEmailFoot) btnClosePreviewEmailFoot.onclick = closeEmailPreviewModal;
  previewEmailModal.onclick = (e) => {
    if (e.target === previewEmailModal) closeEmailPreviewModal();
  };

  if (btnTabPreviewEmail) {
    btnTabPreviewEmail.onclick = () => {
      btnTabPreviewEmail.classList.add('active');
      btnTabPreviewWa.classList.remove('active');
      containerPreviewEmail.style.display = 'block';
      containerPreviewWa.style.display = 'none';
    };
  }

  if (btnTabPreviewWa) {
    btnTabPreviewWa.onclick = () => {
      btnTabPreviewWa.classList.add('active');
      btnTabPreviewEmail.classList.remove('active');
      containerPreviewWa.style.display = 'block';
      containerPreviewEmail.style.display = 'none';
    };
  }

  document.getElementById('btn-copy-email-html')?.addEventListener('click', () => {
    const student = pendaftarList.find(i => (i.id_pendaftar === currentPreviewStudentId || i.id === currentPreviewStudentId));
    if (!student) return;
    const emailObj = generateActivationEmailMessage(student);
    navigator.clipboard?.writeText(emailObj.plainText);
    showToast('Email Disalin', 'Isi surat elektronik aktivasi berhasil disalin ke clipboard.', 'success');
  });

  document.getElementById('btn-copy-wa-text')?.addEventListener('click', () => {
    const student = pendaftarList.find(i => (i.id_pendaftar === currentPreviewStudentId || i.id === currentPreviewStudentId));
    if (!student) return;
    const waText = generateActivationWhatsAppMessage(student);
    navigator.clipboard?.writeText(waText);
    showToast('Pesan WA Disalin', 'Teks pesan WhatsApp aktivasi berhasil disalin ke clipboard.', 'success');
  });

  document.getElementById('btn-resend-email-modal')?.addEventListener('click', () => {
    if (currentPreviewStudentId) {
      triggerResendActivationEmail(currentPreviewStudentId);
      openEmailPreviewModal(currentPreviewStudentId);
    }
  });

  function triggerResendActivationEmail(id) {
    const student = pendaftarList.find(i => (i.id_pendaftar === id || i.id === id));
    if (!student) return;
    dispatchActivationNotification(student, 'Kirim Ulang Notifikasi Email oleh Admin');
    savePendaftar(student);
    updateSummaryStats();
    renderTableRows();
    renderNotificationTableRows();
    showToast('Email Aktivasi Dikirim Ulang', `Notifikasi email login berhasil dikirim ulang ke ${student.email}.`, 'success');
  }

  // ====================================================
  // MODAL EDIT DATA PENDAFTAR (PERBAIKAN LAPORAN TYPO NAMA, EMAIL, NISN, NO. WA)
  // ====================================================
  const editModal = document.getElementById('admin-edit-modal');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
  const btnSaveEditModal = document.getElementById('btn-save-edit-modal');
  const editFormAlert = document.getElementById('edit-form-alert');

  function openEditModal(id) {
    const student = pendaftarList.find(i => (i.id_pendaftar === id || i.id === id));
    if (!student) return;

    document.getElementById('edit-pendaftar-id').value = student.id_pendaftar || student.id;
    document.getElementById('edit-nama').value = student.nama_lengkap || student.nama || '';
    document.getElementById('edit-nisn').value = student.nisn || '';
    document.getElementById('edit-email').value = student.email || '';
    document.getElementById('edit-wa').value = student.no_wa || '';
    document.getElementById('edit-catatan').value = '';

    if (editFormAlert) editFormAlert.style.display = 'none';
    editModal.classList.add('open');
  }

  function closeEditModal() {
    editModal.classList.remove('open');
  }

  if (btnCloseEditModal) btnCloseEditModal.onclick = closeEditModal;
  if (btnCancelEditModal) btnCancelEditModal.onclick = closeEditModal;
  editModal.onclick = (e) => {
    if (e.target === editModal) closeEditModal();
  };

  if (btnSaveEditModal) {
    btnSaveEditModal.onclick = () => {
      const id = document.getElementById('edit-pendaftar-id').value;
      const nama = document.getElementById('edit-nama').value.trim();
      const nisn = document.getElementById('edit-nisn').value.trim();
      const email = document.getElementById('edit-email').value.trim();
      const noWa = document.getElementById('edit-wa').value.trim();
      const catatan = document.getElementById('edit-catatan').value.trim();

      if (!nama || nama.length < 3) {
        showEditError('Nama Lengkap wajib diisi minimal 3 karakter.');
        return;
      }
      if (!/^[0-9]{10}$/.test(nisn)) {
        showEditError('NISN wajib tepat 10 digit angka.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showEditError('Format alamat Email tidak valid.');
        return;
      }
      if (!noWa || noWa.length < 9) {
        showEditError('Nomor WhatsApp wajib diisi dengan benar.');
        return;
      }

      const res = updatePendaftarAccount(id, {
        nama_lengkap: nama,
        nisn: nisn,
        email: email,
        no_wa: noWa,
        catatan_perbaikan: catatan || 'Terverifikasi & Otomatis Aktif (Data Diperbarui Admin)'
      });

      if (!res.success) {
        showEditError(res.message);
        return;
      }

      closeEditModal();
      updateSummaryStats();
      renderTableRows();
      renderNotificationTableRows();
      showToast(
        'Data Pendaftar Diperbarui!',
        `Perbaikan data ${nama} (NISN: ${nisn}, Email: ${email}) tersimpan & Email Aktivasi Login telah dikirim ulang.`,
        'success'
      );
    };
  }

  function showEditError(msg) {
    if (!editFormAlert) return;
    editFormAlert.style.display = 'block';
    editFormAlert.style.background = '#fef2f2';
    editFormAlert.style.color = '#991b1b';
    editFormAlert.style.border = '1px solid #fecaca';
    editFormAlert.textContent = `⚠️ ${msg}`;
  }

  // ====================================================
  // HAPUS PENDAFTAR (DELETE HANDLER)
  // ====================================================
  function executeDeletePendaftar(id, name) {
    if (!id) return;
    if (confirm(`Yakin ingin menghapus data pendaftar "${name}" (${formatRegNumber(id)}) secara permanen dari database SPMB?`)) {
      const deleted = deletePendaftar(id);
      if (deleted) {
        updateSummaryStats();
        renderTableRows();
        renderNotificationTableRows();
        showToast('Pendaftar Dihapus', `Data pendaftar ${name} berhasil dihapus dari sistem.`, 'warning');
      }
    }
  }

  // ====================================================
  // MODAL DETAIL PESERTA & PRATINJAU BERKAS FISIK
  // ====================================================
  const modalBackdrop = document.getElementById('admin-detail-modal');
  const modalContent = document.getElementById('modal-detail-content');
  const modalFooter = document.getElementById('modal-footer-actions');
  const btnCloseModal = document.getElementById('btn-close-modal');

  function getStudentDocuments(student) {
    const nisn = student.nisn || '0051234567';
    const nama = student.nama_lengkap || student.nama || 'Calon Siswa';
    const sekolah = (student.biodata && student.biodata.asal_sekolah) ? student.biodata.asal_sekolah : 'SMP Negeri 1 Yogyakarta';
    const alamat = (student.biodata && student.biodata.alamat) ? student.biodata.alamat : 'Yogyakarta';
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const existingBerkas = student.berkas || {};

    return [
      {
        id: 'ijazah',
        title: 'Scan Ijazah SMP / SKL',
        type: 'PDF',
        typeClass: 'pdf',
        fileName: existingBerkas.ijazah?.nama_file || `Ijazah_SMP_${nisn}.pdf`,
        fileSize: existingBerkas.ijazah?.size || '1.4 MB',
        mockSvg: getIjazahMockSVG(nama, nisn, sekolah)
      },
      {
        id: 'kk',
        title: 'Scan Kartu Keluarga (KK)',
        type: 'JPG',
        typeClass: 'jpg',
        fileName: existingBerkas.kk?.nama_file || `Kartu_Keluarga_${nisn}.jpg`,
        fileSize: existingBerkas.kk?.size || '920 KB',
        mockSvg: getKKMockSVG(nama, nisn, alamat)
      },
      {
        id: 'pasfoto',
        title: 'Pasfoto Resmi Calon Siswa (3x4)',
        type: 'JPG',
        typeClass: 'jpg',
        fileName: existingBerkas.pasfoto?.nama_file || `Pasfoto_3x4_${nisn}.jpg`,
        fileSize: existingBerkas.pasfoto?.size || '380 KB',
        mockSvg: getPasfotoMockSVG()
      },
      {
        id: 'bukti_bayar',
        title: 'Bukti Pembayaran / Kuitansi Loket',
        type: 'PDF',
        typeClass: 'pdf',
        fileName: existingBerkas.bukti_bayar?.nama_file || `Kuitansi_Bayar_${nisn}.pdf`,
        fileSize: existingBerkas.bukti_bayar?.size || '450 KB',
        mockSvg: getKuitansiMockSVG(nama, regNo, '05 Oktober 2026')
      }
    ];
  }

  function openDetailModal(id) {
    const student = pendaftarList.find(item => (item.id_pendaftar === id || item.id === id));
    if (!student) return;

    const nama = student.nama_lengkap || student.nama || '-';
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const nisn = student.nisn || '-';
    const email = student.email || '-';
    const noWa = student.no_wa || '-';
    const asalSekolah = student.biodata?.asal_sekolah || '-';
    const jurusan = student.biodata?.pilihan_jurusan || '-';
    const alamat = student.biodata?.alamat || '-';
    const isBot = Boolean(student.is_bot_suspect || student.security_flag === 'BOT_SUSPECT');
    const docs = getStudentDocuments(student);

    document.getElementById('btn-tab-biodata').classList.add('active');
    document.getElementById('btn-tab-documents').classList.remove('active');

    modalContent.innerHTML = `
      <div class="modal-tab-pane active" id="tab-pane-biodata">
        <div class="modal-student-hero" style="margin-bottom: 1rem;">
          <div class="modal-avatar">${escapeHTML(getInitials(nama))}</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--admin-text-title); margin: 0;">${escapeHTML(nama)}</h4>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span class="reg-number-badge">${escapeHTML(regNo)}</span>
              <span class="status-pill ${isBot ? 'status-pill-bot' : 'status-pill-active'}">
                <span class="pill-dot"></span>
                <span>${isBot ? 'Teridentifikasi Bot' : 'Terverifikasi & Otomatis Aktif'}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="modal-meta-grid">
          <div class="meta-field-box">
            <div class="meta-field-label">Nama Lengkap</div>
            <div class="meta-field-value">${escapeHTML(nama)}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Nomor Induk Siswa Nasional (NISN)</div>
            <div class="meta-field-value">${escapeHTML(nisn)}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Email Terdaftar</div>
            <div class="meta-field-value">${escapeHTML(email)}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">No. WhatsApp</div>
            <div class="meta-field-value">${escapeHTML(noWa)}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Asal Sekolah SMP / MTs</div>
            <div class="meta-field-value">${escapeHTML(asalSekolah)}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Pilihan Jurusan</div>
            <div class="meta-field-value" style="color: var(--admin-primary); font-weight: 800;">${escapeHTML(jurusan)}</div>
          </div>
          <div class="meta-field-box" style="grid-column: span 2;">
            <div class="meta-field-label">Alamat Domisili</div>
            <div class="meta-field-value">${escapeHTML(alamat)}</div>
          </div>
        </div>
      </div>

      <div class="modal-tab-pane" id="tab-pane-documents">
        <div class="doc-preview-grid">
          ${docs.map(doc => `
            <div class="doc-card">
              <div class="doc-card-header">
                <h5 class="doc-card-title"><span>${escapeHTML(doc.title)}</span></h5>
                <span class="doc-type-badge ${doc.typeClass}">${doc.type}</span>
              </div>
              <div class="doc-thumbnail-frame" data-doc-id="${doc.id}">
                ${doc.mockSvg}
                <div class="doc-overlay-zoom"><span>🔍 Preview Penuh</span></div>
              </div>
              <div class="doc-meta-row">
                <span>${escapeHTML(doc.fileName)} (${doc.fileSize})</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn-refresh" id="btn-modal-close-footer" style="padding: 8px 14px;">Tutup</button>
      ${!isBot ? `
        <button type="button" class="btn-preview-email-row" id="btn-modal-preview-email" style="padding: 8px 14px;">
          ✉️ Contoh Email Aktivasi
        </button>
      ` : ''}
      <button type="button" class="btn-action-edit" id="btn-modal-edit-student" style="padding: 8px 14px;">
        ✏️ Edit Nama / Email / NISN / WA
      </button>
      <button type="button" class="btn-action-delete" id="btn-modal-delete-student" style="padding: 8px 14px;">
        🗑️ Hapus Pendaftar
      </button>
    `;

    const tabBioBtn = document.getElementById('btn-tab-biodata');
    const tabDocsBtn = document.getElementById('btn-tab-documents');
    const paneBio = document.getElementById('tab-pane-biodata');
    const paneDocs = document.getElementById('tab-pane-documents');

    tabBioBtn.onclick = () => {
      tabBioBtn.classList.add('active');
      tabDocsBtn.classList.remove('active');
      paneBio.classList.add('active');
      paneDocs.classList.remove('active');
    };

    tabDocsBtn.onclick = () => {
      tabDocsBtn.classList.add('active');
      tabBioBtn.classList.remove('active');
      paneDocs.classList.add('active');
      paneBio.classList.remove('active');
    };

    modalContent.querySelectorAll('.doc-thumbnail-frame').forEach(el => {
      el.onclick = () => {
        const docId = el.getAttribute('data-doc-id');
        const selectedDoc = docs.find(d => d.id === docId);
        if (selectedDoc) {
          openLightbox(selectedDoc.title, selectedDoc.mockSvg, selectedDoc.fileName);
        }
      };
    });

    document.getElementById('btn-modal-close-footer').onclick = () => modalBackdrop.classList.remove('open');
    document.getElementById('btn-modal-preview-email')?.addEventListener('click', () => {
      modalBackdrop.classList.remove('open');
      openEmailPreviewModal(id);
    });
    document.getElementById('btn-modal-edit-student').onclick = () => {
      modalBackdrop.classList.remove('open');
      openEditModal(id);
    };
    document.getElementById('btn-modal-delete-student').onclick = () => {
      modalBackdrop.classList.remove('open');
      executeDeletePendaftar(id, nama);
    };

    modalBackdrop.classList.add('open');
  }

  btnCloseModal.onclick = () => modalBackdrop.classList.remove('open');
  modalBackdrop.onclick = (e) => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
  };

  // Lightbox Handler
  const lightboxModal = document.getElementById('admin-lightbox-modal');
  function openLightbox(title, contentHtml, fileName) {
    document.getElementById('lightbox-doc-title').innerHTML = `<span>📑 ${escapeHTML(title)}</span>`;
    document.getElementById('lightbox-display-area').innerHTML = contentHtml;
    document.getElementById('lightbox-doc-meta').textContent = `Nama Berkas: ${fileName}`;
    lightboxModal.classList.add('open');
  }
  document.getElementById('btn-close-lightbox').onclick = () => lightboxModal.classList.remove('open');
  document.getElementById('btn-lightbox-close-foot').onclick = () => lightboxModal.classList.remove('open');

  // ====================================================
  // MODAL FORM INPUT PENDAFTAR OFFLINE (LOKET WALK-IN)
  // ====================================================
  const walkinModal = document.getElementById('admin-walkin-modal');
  const walkinBody = document.getElementById('modal-walkin-body');
  const btnOpenWalkin = document.getElementById('btn-open-walkin');
  const btnCloseWalkin = document.getElementById('btn-close-walkin-modal');
  const btnCancelWalkin = document.getElementById('btn-cancel-walkin');
  const btnSubmitWalkin = document.getElementById('btn-submit-walkin');

  function openWalkinModal() {
    walkinBody.innerHTML = `
      <div class="walkin-form-grid">
        <div class="modal-notice-banner info">
          <span style="font-size: 1.1rem; flex-shrink: 0;">🏫</span>
          <div>
            <strong>Pendaftaran Langsung di Loket (Walk-in):</strong><br>
            Akun pendaftar otomatis aktif dan langsung menerima Notifikasi Email Login.
          </div>
        </div>

        <div class="walkin-section-card">
          <h4 class="walkin-section-title"><span>👤 Identitas Calon Siswa</span></h4>
          <div class="walkin-fields-row">
            <div class="walkin-field-group">
              <label class="walkin-label"><span>Nama Lengkap Siswa <span class="req">*</span></span></label>
              <input type="text" id="wlk-nama" class="walkin-input" placeholder="Sesuai Ijazah SMP/KK..." required />
            </div>
            <div class="walkin-field-group">
              <label class="walkin-label"><span>NISN (10 Digit) <span class="req">*</span></span></label>
              <input type="text" id="wlk-nisn" class="walkin-input" maxlength="10" placeholder="Contoh: 0061234567" required />
            </div>
            <div class="walkin-field-group">
              <label class="walkin-label"><span>Email Siswa <span class="req">*</span></span></label>
              <input type="email" id="wlk-email" class="walkin-input" placeholder="siswa@gmail.com" required />
            </div>
            <div class="walkin-field-group">
              <label class="walkin-label"><span>No. WhatsApp <span class="req">*</span></span></label>
              <input type="text" id="wlk-wa" class="walkin-input" placeholder="081234567890" required />
            </div>
            <div class="walkin-field-group">
              <label class="walkin-label"><span>Asal Sekolah SMP / MTs <span class="req">*</span></span></label>
              <input type="text" id="wlk-sekolah" class="walkin-input" placeholder="SMP Muhammadiyah 1 Yogyakarta" required />
            </div>
            <div class="walkin-field-group">
              <label class="walkin-label"><span>Pilihan Jurusan</span></label>
              <select id="wlk-jurusan" class="walkin-select">
                <option value="MIPA">MIPA</option>
                <option value="IPS">IPS</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
    walkinModal.classList.add('open');
  }

  if (btnOpenWalkin) btnOpenWalkin.onclick = openWalkinModal;
  if (btnCloseWalkin) btnCloseWalkin.onclick = () => walkinModal.classList.remove('open');
  if (btnCancelWalkin) btnCancelWalkin.onclick = () => walkinModal.classList.remove('open');
  document.getElementById('sidebar-shortcut-walkin')?.addEventListener('click', openWalkinModal);

  if (btnSubmitWalkin) {
    btnSubmitWalkin.onclick = () => {
      const nama = document.getElementById('wlk-nama')?.value.trim();
      const nisn = document.getElementById('wlk-nisn')?.value.trim();
      const email = document.getElementById('wlk-email')?.value.trim();
      const wa = document.getElementById('wlk-wa')?.value.trim();
      const sekolah = document.getElementById('wlk-sekolah')?.value.trim() || 'SMP Asal';
      const jurusan = document.getElementById('wlk-jurusan')?.value || 'MIPA';

      if (!nama || !/^[0-9]{10}$/.test(nisn) || !email || !wa) {
        alert('Harap lengkapi Nama, NISN (10 digit), Email, dan No. WhatsApp!');
        return;
      }

      const walkinSeq = Math.floor(100 + Math.random() * 900);
      const newRegId = `SPMB-2026-WLK-${walkinSeq}`;
      const nowIso = new Date().toISOString();

      const newStudent = {
        id_pendaftar: newRegId,
        nama_lengkap: nama,
        email: email,
        no_wa: wa,
        nisn: nisn,
        status_akun: 'active',
        metode_aktivasi: 'OTOMATIS_REGISTRASI',
        security_flag: 'VERIFIED_UNIQUE',
        security_note: 'Terverifikasi & Otomatis Aktif via Loket Walk-in',
        jalur_pendaftaran: 'offline_walkin',
        activated_at: nowIso,
        created_at: nowIso,
        biodata: { asal_sekolah: sekolah, pilihan_jurusan: jurusan }
      };

      dispatchActivationNotification(newStudent, 'Otomatis Saat Registrasi Walk-in');
      savePendaftar(newStudent);
      walkinModal.classList.remove('open');
      updateSummaryStats();
      renderTableRows();
      renderNotificationTableRows();
      showToast('Walk-in Terverifikasi & Aktif', `Akun ${nama} langsung aktif dan notifikasi email login telah dikirim.`, 'success');
    };
  }

  // ====================================================
  // NAVIGASI ANTAR SUB-TAB
  // ====================================================
  const subviewAccounts = document.getElementById('admin-subview-accounts');
  const subviewNotifs = document.getElementById('admin-subview-notifications');
  const navTabAccounts = document.getElementById('nav-tab-accounts');
  const navTabNotifs = document.getElementById('nav-tab-notifications');

  function switchSubView(view) {
    activeSubView = view;
    if (view === 'notifications') {
      subviewAccounts.style.display = 'none';
      subviewNotifs.style.display = 'block';
      navTabAccounts.classList.remove('active');
      navTabNotifs.classList.add('active');
      renderNotificationTableRows();
    } else {
      subviewNotifs.style.display = 'none';
      subviewAccounts.style.display = 'block';
      navTabNotifs.classList.remove('active');
      navTabAccounts.classList.add('active');
      renderTableRows();
    }
  }

  document.getElementById('sub-pengelolaan-akun')?.addEventListener('click', () => switchSubView('accounts'));
  document.getElementById('sub-notifikasi-email')?.addEventListener('click', () => switchSubView('notifications'));
  document.getElementById('btn-back-to-accounts')?.addEventListener('click', () => switchSubView('accounts'));
  document.getElementById('btn-admin-notif')?.addEventListener('click', () => switchSubView('notifications'));

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
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilter = e.currentTarget.getAttribute('data-filter');
      renderTableRows();
    });
  });

  document.getElementById('notif-search-input')?.addEventListener('input', (e) => {
    notifSearchQuery = e.target.value;
    renderNotificationTableRows();
  });

  document.getElementById('notif-status-select')?.addEventListener('change', (e) => {
    notifStatusFilter = e.target.value;
    renderNotificationTableRows();
  });

  btnRefresh.addEventListener('click', () => {
    updateSummaryStats();
    renderTableRows();
    renderNotificationTableRows();
    showToast('Data Disinkronkan', 'Daftar akun terverifikasi dan identifikasi bot telah diperbarui.', 'success');
  });

  const onDatabaseChange = () => {
    updateSummaryStats();
    renderTableRows();
    renderNotificationTableRows();
  };

  window.addEventListener('spmb_db_updated', onDatabaseChange);
  document.addEventListener('spmb_db_updated', onDatabaseChange);

  // Inisialisasi awal
  updateSummaryStats();
  renderTableRows();
  renderNotificationTableRows();
}

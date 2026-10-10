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

import { getPendaftarList, savePendaftar, updateStatusAkun, fileToDataURL, dispatchSPMBEvent } from '../01_portal_spmb/utils.js';

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

// ====================================================
// GENERATOR MOCK SVG DOKUMEN FISIK (IJAZAH, KK, PASFOTO, KUITANSI)
// ====================================================
function getIjazahMockSVG(nama, nisn, sekolah) {
  const safeNama = (nama || 'CALON SISWA').toUpperCase();
  const safeNisn = nisn || '0051234567';
  const safeSekolah = (sekolah && sekolah !== '-') ? sekolah.toUpperCase() : 'SMP NEGERI 1 YOGYAKARTA';
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
  const safeNama = (nama || 'CALON SISWA').toUpperCase();
  const safeAlamat = (alamat && alamat !== '-') ? alamat : 'Kota Yogyakarta, D.I. Yogyakarta';
  return `
    <svg class="doc-svg-mock" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f0f9ff" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill="url(#kkBg)" rx="8" />
      <rect x="15" y="15" width="570" height="390" fill="none" stroke="#0284c7" stroke-width="2.5" rx="6" />

      <rect x="15" y="15" width="570" height="60" fill="#0284c7" />
      <text x="300" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">REPUBLIK INDONESIA</text>
      <text x="300" y="60" font-family="sans-serif" font-size="16" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="2">KARTU KELUARGA</text>

      <text x="300" y="95" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">No. KK: 3471012309870001</text>
      <text x="40" y="125" font-family="sans-serif" font-size="10" font-weight="bold" fill="#475569">Nama Kepala Keluarga: Bpk. Siswanto</text>
      <text x="40" y="142" font-family="sans-serif" font-size="10" fill="#475569">Alamat: ${safeAlamat}</text>

      <rect x="35" y="160" width="530" height="24" fill="#e0f2fe" stroke="#cbd5e1" />
      <text x="50" y="176" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0369a1">No</text>
      <text x="120" y="176" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0369a1">Nama Lengkap Anggota</text>
      <text x="330" y="176" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0369a1">NIK</text>
      <text x="460" y="176" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0369a1">Hubungan</text>

      <rect x="35" y="184" width="530" height="22" fill="#ffffff" stroke="#e2e8f0" />
      <text x="50" y="199" font-family="sans-serif" font-size="9" fill="#334155">1</text>
      <text x="120" y="199" font-family="sans-serif" font-size="9" font-weight="600" fill="#0f172a">Siswanto</text>
      <text x="330" y="199" font-family="monospace" font-size="9" fill="#334155">3471010107720001</text>
      <text x="460" y="199" font-family="sans-serif" font-size="9" fill="#334155">Kepala Keluarga</text>

      <rect x="35" y="206" width="530" height="22" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="50" y="221" font-family="sans-serif" font-size="9" fill="#334155">2</text>
      <text x="120" y="221" font-family="sans-serif" font-size="9" font-weight="600" fill="#0f172a">Sri Wahyuni</text>
      <text x="330" y="221" font-family="monospace" font-size="9" fill="#334155">3471011508750002</text>
      <text x="460" y="221" font-family="sans-serif" font-size="9" fill="#334155">Istri</text>

      <rect x="35" y="228" width="530" height="24" fill="#ecfdf5" stroke="#a7f3d0" />
      <text x="50" y="244" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065f46">3</text>
      <text x="120" y="244" font-family="sans-serif" font-size="10" font-weight="bold" fill="#065f46">${safeNama} (Calon Siswa)</text>
      <text x="330" y="244" font-family="monospace" font-size="9" font-weight="bold" fill="#065f46">3471011204090003</text>
      <text x="460" y="244" font-family="sans-serif" font-size="9" font-weight="bold" fill="#065f46">Anak Kandung</text>

      <rect x="420" y="280" width="130" height="105" fill="#f8fafc" stroke="#e2e8f0" rx="4" />
      <text x="485" y="300" font-family="sans-serif" font-size="8" font-weight="bold" fill="#0284c7" text-anchor="middle">DISDUKCAPIL RESMI</text>
      <rect x="455" y="310" width="60" height="60" fill="#0f172a" />
      <rect x="460" y="315" width="20" height="20" fill="#ffffff" />
      <rect x="490" y="315" width="20" height="20" fill="#ffffff" />
      <rect x="460" y="345" width="20" height="20" fill="#ffffff" />
      <text x="485" y="380" font-family="sans-serif" font-size="7" fill="#64748b" text-anchor="middle">TTE Elektronik Sah</text>
    </svg>
  `;
}

function getPasfotoMockSVG(nama) {
  const safeNama = (nama || 'CALON SISWA');
  return `
    <svg class="doc-svg-mock" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fotoBgRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#b91c1c" />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill="url(#fotoBgRed)" rx="6" />

      <ellipse cx="150" cy="140" rx="60" ry="75" fill="#1e293b" />
      <ellipse cx="150" cy="155" rx="48" ry="58" fill="#fcd34d" />
      
      <path d="M 90 280 L 150 260 L 210 280 L 230 400 L 70 400 Z" fill="#ffffff" />
      <polygon points="144,262 156,262 153,360 147,360" fill="#1e3a8a" />
      <polygon points="142,260 158,260 154,285 146,285" fill="#1d4ed8" />
      <polygon points="120,265 150,290 135,260" fill="#e2e8f0" stroke="#cbd5e1" />
      <polygon points="180,265 150,290 165,260" fill="#e2e8f0" stroke="#cbd5e1" />

      <rect x="75" y="310" width="45" height="18" fill="#1e3a8a" rx="2" />
      <text x="97" y="323" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">OSIS</text>

      <rect x="0" y="360" width="300" height="40" fill="rgba(15, 23, 42, 0.75)" />
      <text x="150" y="385" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">PASFOTO 3x4 RESMI</text>
    </svg>
  `;
}

function getKuitansiMockSVG(nama, regNo, tgl, isVerified) {
  const safeNama = (nama || 'CALON SISWA');
  const safeReg = regNo || 'SPMB-2026-001';
  const safeTgl = tgl || '05 Oktober 2026';
  return `
    <svg class="doc-svg-mock" viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kwtBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#fdfbf7" />
        </linearGradient>
      </defs>
      <rect width="600" height="380" fill="url(#kwtBg)" rx="8" />
      <rect x="15" y="15" width="570" height="350" fill="none" stroke="#006837" stroke-width="2.5" rx="6" />

      <rect x="15" y="15" width="570" height="65" fill="#006837" />
      <text x="300" y="42" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">SMA MUHAMMADIYAH 3 YOGYAKARTA</text>
      <text x="300" y="62" font-family="sans-serif" font-size="15" font-weight="900" fill="#fcd34d" text-anchor="middle" letter-spacing="1">KUITANSI RESMI BUKTI BAYAR SPMB</text>

      <text x="40" y="110" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">No. Kuitansi: KWT-SPMB/2026/0481</text>
      <text x="420" y="110" font-family="sans-serif" font-size="11" fill="#475569">Tanggal: ${safeTgl}</text>
      <line x1="40" y1="120" x2="560" y2="120" stroke="#e2e8f0" stroke-width="1.5" />

      <text x="40" y="145" font-family="sans-serif" font-size="11" fill="#64748b">Telah Diterima Dari</text>
      <text x="180" y="145" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">: ${safeNama}</text>

      <text x="40" y="172" font-family="sans-serif" font-size="11" fill="#64748b">No. Pendaftaran</text>
      <text x="180" y="172" font-family="monospace" font-size="12" font-weight="bold" fill="#0369a1">: ${safeReg}</text>

      <text x="40" y="200" font-family="sans-serif" font-size="11" fill="#64748b">Untuk Pembayaran</text>
      <text x="180" y="200" font-family="sans-serif" font-size="11" fill="#334155">: Biaya Formulir Pendaftaran & Seleksi SPMB TA 2026/2027</text>

      <rect x="40" y="225" width="280" height="45" fill="#f0fdf4" stroke="#86efac" stroke-width="2" rx="6" />
      <text x="55" y="254" font-family="monospace" font-size="18" font-weight="900" fill="#15803d">Rp 150.000,-</text>

      <text x="40" y="295" font-family="'Times New Roman', serif" font-size="11" font-style="italic" fill="#64748b">Terbilang: Seratus Lima Puluh Ribu Rupiah</text>

      <circle cx="460" cy="255" r="42" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6,3" />
      <text x="460" y="250" font-family="sans-serif" font-size="12" font-weight="900" fill="#16a34a" text-anchor="middle">LUNAS</text>
      <text x="460" y="266" font-family="sans-serif" font-size="8" font-weight="bold" fill="#16a34a" text-anchor="middle">KASIR SPMB M3</text>
      <text x="460" y="335" font-family="sans-serif" font-size="9" fill="#64748b" text-anchor="middle">Petugas Administrasi Loket</text>
    </svg>
  `;
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
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #16a34a; font-weight: 600;">
          <span class="pulse-dot" style="display: inline-block;"></span>
          <span>Database Terhubung: spmb_pendaftar_db</span>
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
                  <!-- Shortcut Input Pendaftar Loket Offline (Walk-in) -->
                  <button type="button" class="btn-walkin-add" id="btn-open-walkin" title="Pendaftaran calon siswa langsung di loket fisik (Walk-in)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    <span>➕ Input Pendaftar Loket Offline</span>
                    <span class="badge-hot">Walk-in</span>
                  </button>

                  <!-- Filter Pills: Semua, Aktif, Belum Aktif -->
                  <div class="filter-btn-group">
                    <button type="button" class="filter-btn active" data-filter="all">Semua</button>
                    <button type="button" class="filter-btn" data-filter="active">Aktif</button>
                    <button type="button" class="filter-btn" data-filter="pending">Belum Aktif</button>
                  </div>

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

      <!-- Modal Detail Peserta (Dialog Pop-up dengan 2 Tab) -->
      <div class="admin-modal-backdrop" id="admin-detail-modal">
        <div class="admin-modal-card modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📋 Detail & Berkas Peserta SPMB</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-modal" title="Tutup">✕</button>
          </div>

          <!-- Tab Bar Navigasi Modal Detail -->
          <div class="modal-tabs-bar">
            <button type="button" class="modal-tab-btn active" id="btn-tab-biodata" data-tab="biodata">
              <span>📋 1. Rincian Biodata & Akun</span>
            </button>
            <button type="button" class="modal-tab-btn" id="btn-tab-documents" data-tab="documents">
              <span>📑 2. Pratinjau Berkas Fisik</span>
              <span class="tab-badge-pill" id="badge-doc-count">4 Berkas</span>
            </button>
          </div>

          <div class="modal-body" id="modal-detail-content" style="padding-top: 1rem;">
            <!-- Populated dynamically: Tab 1 & Tab 2 -->
          </div>
          <div class="modal-footer" id="modal-footer-actions">
            <!-- Buttons dynamically populated -->
          </div>
        </div>
      </div>

      <!-- Modal Input Pendaftar Loket Offline (Walk-in) -->
      <div class="admin-modal-backdrop" id="admin-walkin-modal">
        <div class="admin-modal-card modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>➕ Input Pendaftar Loket Offline (Walk-in)</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-walkin-modal" title="Tutup">✕</button>
          </div>
          <div class="modal-body" id="modal-walkin-body">
            <!-- Dynamic walk-in form -->
          </div>
          <div class="modal-footer" id="modal-walkin-footer">
            <button type="button" class="btn-refresh" id="btn-cancel-walkin" style="padding: 8px 16px;">Batal</button>
            <button type="button" class="btn-action-activate" id="btn-submit-walkin" style="padding: 8px 20px;">
              💾 Simpan & Terbitkan Registrasi Walk-in
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Tanda Terima Pendaftaran Walk-in (Print Slip) -->
      <div class="admin-modal-backdrop" id="admin-receipt-modal">
        <div class="admin-modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🖨️ Tanda Terima Pendaftaran Loket SPMB</span>
            </h3>
            <button type="button" class="btn-close-modal" id="btn-close-receipt-modal" title="Tutup">✕</button>
          </div>
          <div class="modal-body" id="modal-receipt-body" style="padding: 1.25rem;">
            <!-- Receipt Content -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-refresh" id="btn-close-receipt-btn" style="padding: 8px 16px;">Tutup</button>
            <button type="button" class="btn-action-activate" id="btn-print-receipt" style="padding: 8px 18px;">
              🖨️ Cetak / Print Struk
            </button>
          </div>
        </div>
      </div>

      <!-- Lightbox Modal untuk Preview Dokumen Penuh -->
      <div class="admin-lightbox-modal" id="admin-lightbox-modal">
        <div class="lightbox-window">
          <div class="lightbox-header">
            <span class="lightbox-title" id="lightbox-doc-title">📑 Pratinjau Dokumen Lampiran</span>
            <button type="button" class="btn-close-modal" style="color: #ffffff;" id="btn-close-lightbox" title="Tutup">✕</button>
          </div>
          <div class="lightbox-view-area" id="lightbox-display-area">
            <!-- Full document view -->
          </div>
          <div class="lightbox-footer">
            <span style="font-size: 0.8rem; color: var(--admin-text-muted);" id="lightbox-doc-meta">Status Berkas: Terverifikasi di Loket</span>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="doc-btn" id="btn-lightbox-download">📥 Unduh Berkas</button>
              <button type="button" class="doc-btn doc-btn-primary" id="btn-lightbox-close-foot">Tutup</button>
            </div>
          </div>
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

  // Helper Ekstraksi Dokumen Pendaftar (Aktual / Fallback Realistis)
  function getStudentDocuments(student) {
    const nisn = student.nisn || '0051234567';
    const nama = student.nama_lengkap || student.nama || 'Calon Siswa';
    const sekolah = (student.biodata && student.biodata.asal_sekolah) ? student.biodata.asal_sekolah : 'SMP Negeri 1 Yogyakarta';
    const alamat = (student.biodata && student.biodata.alamat) ? student.biodata.alamat : 'Yogyakarta';
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const isPaid = student.pembayaran && (student.pembayaran.status_pembayaran === 'verified' || student.pembayaran.status_pembayaran === 'LUNAS');
    const existingBerkas = student.berkas || {};

    return [
      {
        id: 'ijazah',
        title: 'Scan Ijazah SMP / SKL',
        type: 'PDF',
        typeClass: 'pdf',
        fileName: existingBerkas.ijazah?.nama_file || `Ijazah_SMP_${nisn}.pdf`,
        fileSize: existingBerkas.ijazah?.size || '1.4 MB',
        uploadDate: existingBerkas.ijazah?.tgl_unggah || '05 Okt 2026',
        status: existingBerkas.ijazah?.status || 'verified',
        dataUrl: existingBerkas.ijazah?.data_url || null,
        mockSvg: getIjazahMockSVG(nama, nisn, sekolah)
      },
      {
        id: 'kk',
        title: 'Scan Kartu Keluarga (KK)',
        type: 'JPG',
        typeClass: 'jpg',
        fileName: existingBerkas.kk?.nama_file || `Kartu_Keluarga_${nisn}.jpg`,
        fileSize: existingBerkas.kk?.size || '920 KB',
        uploadDate: existingBerkas.kk?.tgl_unggah || '05 Okt 2026',
        status: existingBerkas.kk?.status || 'verified',
        dataUrl: existingBerkas.kk?.data_url || null,
        mockSvg: getKKSMockSVG(nama, nisn, alamat)
      },
      {
        id: 'pasfoto',
        title: 'Pasfoto Resmi Calon Siswa (3x4)',
        type: 'JPG',
        typeClass: 'jpg',
        fileName: existingBerkas.pasfoto?.nama_file || `Pasfoto_3x4_${nisn}.jpg`,
        fileSize: existingBerkas.pasfoto?.size || '380 KB',
        uploadDate: existingBerkas.pasfoto?.tgl_unggah || '05 Okt 2026',
        status: existingBerkas.pasfoto?.status || 'verified',
        dataUrl: existingBerkas.pasfoto?.data_url || null,
        mockSvg: getPasfotoMockSVG(nama)
      },
      {
        id: 'bukti_bayar',
        title: 'Bukti Pembayaran / Kuitansi Loket',
        type: 'PDF',
        typeClass: 'pdf',
        fileName: existingBerkas.bukti_bayar?.nama_file || (student.pembayaran?.file_bukti || `Kuitansi_Bayar_${nisn}.pdf`),
        fileSize: existingBerkas.bukti_bayar?.size || '450 KB',
        uploadDate: existingBerkas.bukti_bayar?.tgl_unggah || '05 Okt 2026',
        status: isPaid ? 'verified' : (student.pembayaran ? 'pending' : 'missing'),
        dataUrl: student.pembayaran?.file_data_url || existingBerkas.bukti_bayar?.data_url || null,
        mockSvg: getKuitansiMockSVG(nama, regNo, '05 Oktober 2026', isPaid)
      }
    ];
  }

  // Alias helper getKKSMockSVG -> getKKMockSVG
  function getKKSMockSVG(nama, nisn, alamat) {
    return getKKMockSVG(nama, nisn, alamat);
  }

  // State Modal Detail Aktif
  let currentDetailStudentId = null;

  // Modal Detail Peserta (2 Tab: Biodata & Pratinjau Berkas Fisik)
  function openDetailModal(id) {
    const student = pendaftarList.find(item => (item.id_pendaftar === id || item.id === id));
    if (!student) return;

    currentDetailStudentId = id;
    const isActive = (student.status_akun === 'active' || student.status_akun === 'AKTIF');
    const nama = student.nama_lengkap || student.nama || '-';
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const nisn = student.nisn || '-';
    const nik = (student.biodata && student.biodata.nik) ? student.biodata.nik : '347101' + (nisn.slice(-10));
    const email = student.email || '-';
    const noWa = student.no_wa || '-';
    const asalSekolah = (student.biodata && student.biodata.asal_sekolah) ? student.biodata.asal_sekolah : '-';
    const jurusan = (student.biodata && student.biodata.pilihan_jurusan) ? student.biodata.pilihan_jurusan : '-';
    const alamat = (student.biodata && student.biodata.alamat) ? student.biodata.alamat : '-';
    const isWalkin = (student.jalur_pendaftaran === 'offline_walkin' || regNo.includes('WLK'));
    const isPaid = student.pembayaran && (student.pembayaran.status_pembayaran === 'verified' || student.pembayaran.status_pembayaran === 'LUNAS');
    const paymentStatusText = isPaid ? 'Lunas Terverifikasi' : (student.pembayaran ? 'Menunggu Verifikasi Keuangan' : 'Belum Melakukan Pembayaran');
    const tglDaftar = student.created_at ? new Date(student.created_at).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '05 Oktober 2026';

    const docs = getStudentDocuments(student);

    // Default tab button active state
    document.getElementById('btn-tab-biodata').classList.add('active');
    document.getElementById('btn-tab-documents').classList.remove('active');

    modalContent.innerHTML = `
      <!-- TAB PANE 1: RINCIAN BIODATA & AKUN -->
      <div class="modal-tab-pane active" id="tab-pane-biodata">
        <div class="modal-student-hero" style="margin-bottom: 1rem;">
          <div class="modal-avatar">${getInitials(nama)}</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--admin-text-title); margin: 0;">${nama}</h4>
              ${isWalkin 
                ? `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 12px;">🏫 Pendaftar Loket Walk-in</span>`
                : `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 12px;">🌐 Pendaftar Online</span>`
              }
            </div>
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
            <div class="meta-field-label">Nomor Induk Kependudukan (NIK)</div>
            <div class="meta-field-value">${nik}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">No. WhatsApp / HP Ortu</div>
            <div class="meta-field-value">${noWa}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Email Terdaftar</div>
            <div class="meta-field-value">${email}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Pilihan Jurusan</div>
            <div class="meta-field-value" style="color: var(--admin-primary); font-weight: 800;">${jurusan !== '-' ? jurusan : 'Belum Memilih'}</div>
          </div>
          <div class="meta-field-box">
            <div class="meta-field-label">Status Biaya Pendaftaran</div>
            <div class="meta-field-value">
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 700; color: ${isPaid ? '#15803d' : '#b45309'};">
                ${isPaid ? '✓' : '⚡'} ${paymentStatusText}
              </span>
            </div>
          </div>
          <div class="meta-field-box" style="grid-column: span 2;">
            <div class="meta-field-label">Asal Sekolah SMP / MTs</div>
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
      </div>

      <!-- TAB PANE 2: PRATINJAU BERKAS DOKUMEN FISIK -->
      <div class="modal-tab-pane" id="tab-pane-documents">
        <!-- Notice integrasi Modul 06 -->
        <div class="modal-notice-banner">
          <span style="font-size: 1.1rem; flex-shrink: 0;">📑</span>
          <div>
            <strong>Sinkronisasi Berkas Fisik & Dokumen Lampiran:</strong><br>
            Berkas fisik diverifikasi pada <strong>Modul 06 (Verifikasi Loket & Daftar Ulang)</strong>. Di bawah ini merupakan pratinjau scan dokumen asli siswa yang dapat ditinjau dan divalidasi langsung oleh Admin.
          </div>
        </div>

        <!-- Grid 4 Kartu Dokumen -->
        <div class="doc-preview-grid">
          ${docs.map(doc => {
            const isDocVerified = doc.status === 'verified';
            const isDocPending = doc.status === 'pending';
            const statusLabel = isDocVerified ? '✓ Terverifikasi Fisik' : (isDocPending ? '⏳ Menunggu Modul 06' : '⚠️ Belum Diserahkan');
            const statusClass = isDocVerified ? 'verified' : (isDocPending ? 'pending' : 'missing');

            return `
              <div class="doc-card" id="doc-card-${doc.id}">
                <div class="doc-card-header">
                  <h5 class="doc-card-title">
                    <span>${doc.title}</span>
                  </h5>
                  <span class="doc-type-badge ${doc.typeClass}">${doc.type}</span>
                </div>

                <!-- Frame Thumbnail Interaktif -->
                <div class="doc-thumbnail-frame" data-doc-id="${doc.id}" title="Klik untuk pratinjau penuh ${doc.title}">
                  ${doc.dataUrl && doc.dataUrl.startsWith('data:image') 
                    ? `<img src="${doc.dataUrl}" alt="${doc.title}">`
                    : doc.mockSvg
                  }
                  <div class="doc-overlay-zoom">
                    <span>🔍 Preview Penuh</span>
                  </div>
                </div>

                <!-- Meta & Status -->
                <div class="doc-meta-row">
                  <span>${doc.fileName} (${doc.fileSize})</span>
                  <span class="doc-status-badge ${statusClass}" id="badge-status-${doc.id}">${statusLabel}</span>
                </div>

                <!-- Aksi Dokumen -->
                <div class="doc-actions-row">
                  <button type="button" class="doc-btn doc-btn-primary btn-zoom-doc" data-doc-id="${doc.id}">
                    <span>🔍 Lihat Penuh</span>
                  </button>
                  <button type="button" class="doc-btn btn-toggle-verify-doc" data-doc-id="${doc.id}" data-current="${doc.status}">
                    <span>${isDocVerified ? 'Batal Valid' : '✓ Validkan'}</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
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

    // Pasang Event Switcher Tab Modal
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

    // Pasang Event Klik Thumbnail & Zoom Dokumen
    modalContent.querySelectorAll('.doc-thumbnail-frame, .btn-zoom-doc').forEach(el => {
      el.onclick = (e) => {
        const docId = el.getAttribute('data-doc-id');
        const selectedDoc = docs.find(d => d.id === docId);
        if (selectedDoc) {
          openLightbox(selectedDoc.title, selectedDoc.dataUrl ? `<img src="${selectedDoc.dataUrl}" style="max-height: 65vh; border-radius: 4px;" alt="${selectedDoc.title}">` : selectedDoc.mockSvg, selectedDoc.fileName, selectedDoc.status);
        }
      };
    });

    // Pasang Event Toggle Validasi Fisik Berkas
    modalContent.querySelectorAll('.btn-toggle-verify-doc').forEach(btn => {
      btn.onclick = (e) => {
        const docId = btn.getAttribute('data-doc-id');
        const currentStatus = btn.getAttribute('data-current');
        const newStatus = (currentStatus === 'verified') ? 'pending' : 'verified';

        // Update di objek student
        if (!student.berkas) student.berkas = {};
        if (!student.berkas[docId]) {
          const docItem = docs.find(d => d.id === docId);
          student.berkas[docId] = {
            nama_file: docItem?.fileName || `${docId}.pdf`,
            size: docItem?.fileSize || '1 MB',
            tgl_unggah: new Date().toISOString().split('T')[0],
            status: newStatus
          };
        } else {
          student.berkas[docId].status = newStatus;
        }

        savePendaftar(student);
        showToast('Status Berkas Diperbarui', `Berkas ${docId.toUpperCase()} ditandai sebagai: ${newStatus === 'verified' ? 'Valid & Terverifikasi Fisik' : 'Menunggu Loket Modul 06'}.`, 'success');
        openDetailModal(id); // Re-render modal to reflect changes
      };
    });

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

  // ====================================================
  // LIGHTBOX MODAL HANDLER
  // ====================================================
  const lightboxModal = document.getElementById('admin-lightbox-modal');
  const lightboxTitle = document.getElementById('lightbox-doc-title');
  const lightboxArea = document.getElementById('lightbox-display-area');
  const lightboxMeta = document.getElementById('lightbox-doc-meta');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const btnCloseLightboxFoot = document.getElementById('btn-lightbox-close-foot');
  const btnDownloadLightbox = document.getElementById('btn-lightbox-download');

  let currentLightboxDocName = 'dokumen_spmb.pdf';

  function openLightbox(title, contentHtml, fileName, status) {
    currentLightboxDocName = fileName || 'dokumen_spmb.pdf';
    lightboxTitle.innerHTML = `<span>📑 ${title}</span>`;
    lightboxArea.innerHTML = contentHtml;
    lightboxMeta.textContent = `Nama Berkas: ${currentLightboxDocName} • Status: ${status === 'verified' ? 'Valid Terverifikasi Fisik (Modul 06)' : 'Menunggu Verifikasi Loket'}`;
    lightboxModal.classList.add('open');
  }

  function closeLightbox() {
    lightboxModal.classList.remove('open');
  }

  btnCloseLightbox.onclick = closeLightbox;
  btnCloseLightboxFoot.onclick = closeLightbox;
  lightboxModal.onclick = (e) => {
    if (e.target === lightboxModal) closeLightbox();
  };

  btnDownloadLightbox.onclick = () => {
    showToast('Mengunduh Berkas', `Berkas ${currentLightboxDocName} berhasil disiapkan untuk diunduh.`, 'success');
  };

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
        
        <!-- Context Notice Banner -->
        <div class="modal-notice-banner info">
          <span style="font-size: 1.1rem; flex-shrink: 0;">🏫</span>
          <div>
            <strong>Pendaftaran Langsung di Tempat (Walk-in Loket SPMB):</strong><br>
            Gunakan form ini untuk calon peserta yang datang langsung ke meja loket SMA Muhammadiyah 3 Yogyakarta. Data otomatis terintegrasi ke <code>spmb_pendaftar_db</code> dan siap diterbitkan Tanda Terima Registrasi.
          </div>
        </div>

        <!-- Bagian 1: Identitas Calon Siswa -->
        <div class="walkin-section-card">
          <h4 class="walkin-section-title">
            <span>👤 1. Identitas Calon Siswa</span>
          </h4>
          <div class="walkin-fields-row">
            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>Nama Lengkap Siswa <span class="req">*</span></span>
              </label>
              <input type="text" id="wlk-nama" class="walkin-input" placeholder="Sesuai Ijazah SMP/KK..." required />
            </div>

            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>NISN (10 Digit) <span class="req">*</span></span>
              </label>
              <input type="text" id="wlk-nisn" class="walkin-input" maxlength="10" placeholder="Contoh: 0061234567" required />
            </div>

            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>NIK Siswa / KK (16 Digit)</span>
              </label>
              <input type="text" id="wlk-nik" class="walkin-input" maxlength="16" placeholder="Contoh: 3471012345670001" />
            </div>

            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>No. WhatsApp / HP Ortu <span class="req">*</span></span>
              </label>
              <input type="text" id="wlk-wa" class="walkin-input" placeholder="Contoh: 081234567890" required />
            </div>

            <div class="walkin-field-group" style="grid-column: span 2;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="walkin-label" style="margin: 0;">
                  <span>Email Siswa <span style="font-weight: 400; color: var(--admin-text-muted);">(Opsional)</span></span>
                </label>
                <button type="button" id="btn-auto-email" class="doc-btn doc-btn-primary" style="padding: 2px 8px; font-size: 0.72rem;">
                  ⚡ Buat Email Otomatis
                </button>
              </div>
              <input type="email" id="wlk-email" class="walkin-input" placeholder="siswa@gmail.com" />
            </div>
          </div>
        </div>

        <!-- Bagian 2: Pilihan Akademik & Asal Sekolah -->
        <div class="walkin-section-card">
          <h4 class="walkin-section-title">
            <span>🎓 2. Asal Sekolah & Pilihan Jurusan</span>
          </h4>
          <div class="walkin-fields-row">
            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>Asal Sekolah SMP / MTs <span class="req">*</span></span>
              </label>
              <input type="text" id="wlk-sekolah" class="walkin-input" placeholder="Contoh: SMP Muhammadiyah 1 Yogyakarta" required />
            </div>

            <div class="walkin-field-group">
              <label class="walkin-label">
                <span>Pilihan Jurusan <span class="req">*</span></span>
              </label>
              <select id="wlk-jurusan" class="walkin-select">
                <option value="MIPA">MIPA (Matematika & Ilmu Pengetahuan Alam)</option>
                <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                <option value="Bahasa & Budaya">Bahasa & Budaya</option>
              </select>
            </div>

            <div class="walkin-field-group" style="grid-column: span 2;">
              <label class="walkin-label">
                <span>Alamat Tempat Tinggal Lengkap</span>
              </label>
              <textarea id="wlk-alamat" class="walkin-textarea" placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten..."></textarea>
            </div>
          </div>
        </div>

        <!-- Bagian 3: Administrasi Loket Fisik -->
        <div class="walkin-section-card">
          <h4 class="walkin-section-title">
            <span>💼 3. Administrasi & Verifikasi Loket</span>
          </h4>

          <!-- Direct Activation -->
          <label class="walkin-choice-card selected" style="cursor: pointer; user-select: none;">
            <input type="checkbox" id="wlk-direct-activate" checked />
            <div class="walkin-choice-text">
              <span class="walkin-choice-title">✓ Langsung Aktifkan Akun Peserta</span>
              <span class="walkin-choice-desc">Identitas siswa telah ditinjau dan divalidasi langsung oleh petugas loket SPMB.</span>
            </div>
          </label>

          <!-- Pembayaran Loket -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label class="walkin-label">
              <span>Status Pembayaran Formulir di Loket</span>
            </label>
            <div class="walkin-radio-group">
              <label class="walkin-choice-card selected" id="opt-pay-cash">
                <input type="radio" name="wlk_pay_status" value="cash_paid" checked />
                <div class="walkin-choice-text">
                  <span class="walkin-choice-title">💵 Lunas Tunai di Loket</span>
                  <span class="walkin-choice-desc">Biaya Rp 150.000 telah diserahkan tunai ke kasir loket.</span>
                </div>
              </label>

              <label class="walkin-choice-card" id="opt-pay-pending">
                <input type="radio" name="wlk_pay_status" value="pending" />
                <div class="walkin-choice-text">
                  <span class="walkin-choice-title">⏳ Menunggu Pembayaran</span>
                  <span class="walkin-choice-desc">Siswa akan membayar via transfer atau kembali kemudian.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Checklist Berkas Fisik Diserahkan -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label class="walkin-label">
              <span>Checklist Berkas Fisik yang Diterima di Loket:</span>
            </label>
            <div class="berkas-checklist-grid">
              <label class="berkas-check-item">
                <input type="checkbox" id="chk-doc-ijazah" checked />
                <span>📑 Ijazah SMP Asli / SKL</span>
              </label>
              <label class="berkas-check-item">
                <input type="checkbox" id="chk-doc-kk" checked />
                <span>👨‍👩‍👧 Scan / Fotokopi Kartu Keluarga</span>
              </label>
              <label class="berkas-check-item">
                <input type="checkbox" id="chk-doc-foto" checked />
                <span>🖼️ Pasfoto 3x4 Berwarna (2 Lembar)</span>
              </label>
              <label class="berkas-check-item">
                <input type="checkbox" id="chk-doc-bayar" checked />
                <span>🧾 Kuitansi Pembayaran Tunai</span>
              </label>
            </div>
          </div>

        </div>

      </div>
    `;

    // Pasang Event Auto Generate Email
    const autoEmailBtn = document.getElementById('btn-auto-email');
    if (autoEmailBtn) {
      autoEmailBtn.onclick = () => {
        const nama = document.getElementById('wlk-nama').value.trim();
        const nisn = document.getElementById('wlk-nisn').value.trim();
        const cleanName = nama ? nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : 'siswa';
        const cleanNisn = nisn ? nisn.slice(-4) : Math.floor(1000 + Math.random() * 9000);
        document.getElementById('wlk-email').value = `${cleanName}.${cleanNisn}@spmb.muhi.sch.id`;
        showToast('Email Dibuat', 'Email pendaftar otomatis berhasil diformat.', 'success');
      };
    }

    walkinModal.classList.add('open');
  }

  function closeWalkinModal() {
    walkinModal.classList.remove('open');
  }

  if (btnOpenWalkin) btnOpenWalkin.onclick = openWalkinModal;
  if (btnCloseWalkin) btnCloseWalkin.onclick = closeWalkinModal;
  if (btnCancelWalkin) btnCancelWalkin.onclick = closeWalkinModal;
  walkinModal.onclick = (e) => {
    if (e.target === walkinModal) closeWalkinModal();
  };

  // Submit Handler Pendaftar Walk-in
  if (btnSubmitWalkin) {
    btnSubmitWalkin.onclick = () => {
      const nama = document.getElementById('wlk-nama')?.value.trim();
      const nisn = document.getElementById('wlk-nisn')?.value.trim();
      const wa = document.getElementById('wlk-wa')?.value.trim();
      const sekolah = document.getElementById('wlk-sekolah')?.value.trim();
      const jurusan = document.getElementById('wlk-jurusan')?.value || 'MIPA';
      const nik = document.getElementById('wlk-nik')?.value.trim() || ('347101' + (nisn ? nisn.slice(-10) : '0000000001'));
      const email = document.getElementById('wlk-email')?.value.trim() || `${nama.toLowerCase().replace(/[^a-z0-9]/g, '')}@spmb.muhi.sch.id`;
      const alamat = document.getElementById('wlk-alamat')?.value.trim() || 'Jl. Kapten Piere Tendean No. 56, Wirobrajan, Yogyakarta';
      const isDirectActive = document.getElementById('wlk-direct-activate')?.checked;
      const isCashPaid = document.querySelector('input[name="wlk_pay_status"]:checked')?.value === 'cash_paid';

      const chkIjazah = document.getElementById('chk-doc-ijazah')?.checked;
      const chkKK = document.getElementById('chk-doc-kk')?.checked;
      const chkFoto = document.getElementById('chk-doc-foto')?.checked;

      // Validasi form
      if (!nama) {
        alert('Harap isi Nama Lengkap Siswa!');
        document.getElementById('wlk-nama')?.focus();
        return;
      }
      if (!nisn || nisn.length < 8) {
        alert('Harap isi NISN yang valid (minimal 8-10 digit)!');
        document.getElementById('wlk-nisn')?.focus();
        return;
      }
      if (!wa) {
        alert('Harap isi Nomor WhatsApp / Kontak Orang Tua!');
        document.getElementById('wlk-wa')?.focus();
        return;
      }
      if (!sekolah) {
        alert('Harap isi Asal Sekolah SMP/MTs!');
        document.getElementById('wlk-sekolah')?.focus();
        return;
      }

      // Generate ID Registrasi Walk-in
      const walkinSeq = Math.floor(100 + Math.random() * 900);
      const newRegId = `SPMB-2026-WLK-${walkinSeq}`;

      const newStudent = {
        id_pendaftar: newRegId,
        nama_lengkap: nama,
        email: email,
        no_wa: wa,
        nisn: nisn,
        status_akun: isDirectActive ? 'active' : 'pending_activation',
        jalur_pendaftaran: 'offline_walkin',
        created_at: new Date().toISOString(),
        biodata: {
          nik: nik,
          asal_sekolah: sekolah,
          pilihan_jurusan: jurusan,
          alamat: alamat,
          nama_orang_tua: 'Orang Tua / Wali Siswa'
        },
        pembayaran: {
          status_pembayaran: isCashPaid ? 'verified' : 'pending_verification',
          metode: isCashPaid ? 'Tunai di Loket' : 'Transfer',
          nominal: 150000,
          no_kuitansi: `KWT-WLK-${Date.now().toString().slice(-6)}`,
          file_bukti: isCashPaid ? 'Kuitansi_Loket_Tunai.pdf' : null,
          tanggal_bayar: new Date().toISOString()
        },
        berkas: {
          ijazah: {
            nama_file: `Ijazah_SMP_${nisn}.pdf`,
            status: chkIjazah ? 'verified' : 'pending',
            size: '1.2 MB',
            tgl_unggah: new Date().toISOString().split('T')[0]
          },
          kk: {
            nama_file: `Kartu_Keluarga_${nisn}.jpg`,
            status: chkKK ? 'verified' : 'pending',
            size: '880 KB',
            tgl_unggah: new Date().toISOString().split('T')[0]
          },
          pasfoto: {
            nama_file: `Pasfoto_3x4_${nisn}.jpg`,
            status: chkFoto ? 'verified' : 'pending',
            size: '340 KB',
            tgl_unggah: new Date().toISOString().split('T')[0]
          },
          bukti_bayar: {
            nama_file: `Kuitansi_Loket_${nisn}.pdf`,
            status: isCashPaid ? 'verified' : 'pending',
            size: '420 KB',
            tgl_unggah: new Date().toISOString().split('T')[0]
          }
        }
      };

      // Simpan ke spmb_pendaftar_db
      savePendaftar(newStudent);
      closeWalkinModal();
      
      // Update data tabel & statistik
      pendaftarList = fetchCurrentPendaftar();
      updateSummaryStats();
      renderTableRows();

      showToast('Pendaftar Walk-in Berhasil!', `Siswa ${nama} berhasil didaftarkan langsung via Loket Offline (${newRegId}).`, 'success');

      // Tampilkan Tanda Terima Print Slip
      openReceiptModal(newStudent);
    };
  }

  // ====================================================
  // TANDA TERIMA PENDAFTARAN LOKET (Print Slip Modal)
  // ====================================================
  const receiptModal = document.getElementById('admin-receipt-modal');
  const receiptBody = document.getElementById('modal-receipt-body');
  const btnCloseReceipt = document.getElementById('btn-close-receipt-modal');
  const btnCloseReceiptBtn = document.getElementById('btn-close-receipt-btn');
  const btnPrintReceipt = document.getElementById('btn-print-receipt');

  function openReceiptModal(student) {
    const regNo = formatRegNumber(student.id_pendaftar || student.id);
    const nama = student.nama_lengkap || student.nama;
    const nisn = student.nisn || '-';
    const sekolah = (student.biodata && student.biodata.asal_sekolah) ? student.biodata.asal_sekolah : '-';
    const jurusan = (student.biodata && student.biodata.pilihan_jurusan) ? student.biodata.pilihan_jurusan : 'MIPA';
    const tglDaftar = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const isPaid = student.pembayaran && (student.pembayaran.status_pembayaran === 'verified' || student.pembayaran.status_pembayaran === 'LUNAS');

    receiptBody.innerHTML = `
      <div class="receipt-slip-card" id="printable-receipt-card">
        
        <div class="receipt-slip-header">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 2px;">MAJELIS PENDIDIKAN DASAR DAN MENENGAH MUHAMMADIYAH</div>
          <div class="receipt-school-name">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
          <div style="font-size: 0.72rem; color: #475569;">Jl. Kapten Piere Tendean No. 56, Wirobrajan, Yogyakarta &bull; Telp. (0274) 375127</div>
          <div class="receipt-doc-title">TANDA TERIMA PENDAFTARAN LOKET SPMB TA 2026/2027</div>
        </div>

        <div style="text-align: center; margin-bottom: 12px;">
          <span style="font-size: 0.7rem; color: var(--admin-text-muted); text-transform: uppercase; font-weight: 700;">Nomor Pendaftaran Resmi</span>
          <div style="font-family: monospace; font-size: 1.4rem; font-weight: 900; color: #006837; letter-spacing: 2px;">${regNo}</div>
        </div>

        <div class="receipt-meta-grid">
          <div class="receipt-meta-item">
            <span class="lbl">Nama Calon Siswa</span>
            <span class="val">${nama}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="lbl">Nomor Induk Siswa (NISN)</span>
            <span class="val">${nisn}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="lbl">Asal Sekolah SMP/MTs</span>
            <span class="val">${sekolah}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="lbl">Pilihan Jurusan</span>
            <span class="val" style="color: #006837;">${jurusan}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="lbl">Status Akun SPMB</span>
            <span class="val" style="color: #15803d;">✓ AKTIF (Terverifikasi di Tempat)</span>
          </div>
          <div class="receipt-meta-item">
            <span class="lbl">Biaya Formulir & Seleksi</span>
            <span class="val" style="color: ${isPaid ? '#15803d' : '#b45309'};">
              ${isPaid ? 'Rp 150.000 (LUNAS TUNAI LOKET)' : 'Rp 150.000 (MENUNGGU PEMBAYARAN)'}
            </span>
          </div>
        </div>

        <div class="receipt-barcode-row">
          <div>
            <div style="font-size: 0.7rem; color: #64748b;">Waktu Pendaftaran:</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #0f172a;">${tglDaftar} WIB</div>
            <div style="font-size: 0.68rem; color: #006837; font-weight: 700; margin-top: 4px;">Petugas Loket: Admin SPMB M3</div>
          </div>
          <div class="receipt-stamp-box">
            <span>LOKET SPMB<br>TERVERIFIKASI<br>M3 YGY</span>
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 0.7rem; color: #64748b; font-style: italic; text-align: center;">
          *Harap simpan struk ini sebagai bukti resmi pendaftaran fisik dan penyerahan berkas untuk tahap wawancara (Modul 04) & verifikasi loket (Modul 06).
        </div>

      </div>
    `;

    receiptModal.classList.add('open');
  }

  function closeReceiptModal() {
    receiptModal.classList.remove('open');
  }

  if (btnCloseReceipt) btnCloseReceipt.onclick = closeReceiptModal;
  if (btnCloseReceiptBtn) btnCloseReceiptBtn.onclick = closeReceiptModal;
  receiptModal.onclick = (e) => {
    if (e.target === receiptModal) closeReceiptModal();
  };

  if (btnPrintReceipt) {
    btnPrintReceipt.onclick = () => {
      window.print();
    };
  }

  // Pasang Sidebar Shortcut Walk-in jika ada
  const sidebarWalkinShortcut = document.getElementById('sidebar-shortcut-walkin');
  if (sidebarWalkinShortcut) {
    sidebarWalkinShortcut.onclick = openWalkinModal;
  }

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


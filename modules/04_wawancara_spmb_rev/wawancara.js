/**
 * Modul 04: Penilaian Wawancara & Pemetaan Jurusan
 * SPMB SMA Muhammadiyah 3 Yogyakarta
 * Terintegrasi Single Source of Truth (SSoT) via config/database.js
 * 
 * Fitur Utama:
 * 1. Jadwal Wawancara Divisi (Tabel Jadwal & Kalender Jadwal):
 *    - Tabel Jadwal Resmi Akademik & Kalender Jadwal Mingguan (senin-minggu).
 *    - Pewawancara Spesifik & Jelas: Yosa & Veli.
 *    - Filter Lengkap: Filter Pewawancara (Semua / Yosa / Veli), Filter Hari, Filter Jam, Filter Status.
 *    - Aturan Operasional: Weekday (Senin-Jumat) 08.00 - 15.00 WIB, Weekend (Sabtu-Minggu) 09.00 - 15.00 WIB.
 *    - Menampilkan lengkap nama calon siswa, jam sesi, no. registrasi, peminatan, ruangan, pewawancara, & status.
 *    - Dukungan Cetak / Print Tabel Jadwal resmi.
 * 2. Penilaian Wawancara & Pemetaan Bakat-Tahfidz:
 *    - Evaluasi siswa & wali murid, rekomendasi beasiswa tahfidz otomatis, dan penetapan kelaikan yudisium.
 */

import { db } from '../../config/database.js';
import {
  getHMinusOneDate,
  generateReminderIdempotencyKey,
  computeReminderMetadata,
  generateWhatsAppMessage,
  generateEmailMessage,
  generateReminderPayload,
  dispatchReminderToBackend,
  BACKEND_CONFIG
} from './reminderService.js?v=20261102_auto_h1';
import { generateAnekdotalRecordHTML } from './anekdotalService.js';


// State internal modul
const ROLE_KEY = 'spmb_wawancara_edit_mode';
let currentSearch = '';
let currentFilterStatus = 'ALL';
let activeCandidateId = null;
let activeContainerId = 'module-viewport';
let isEditMode = true;

// Subtab & Jadwal State
let activeSubTab = 'JADWAL'; // Default: 'JADWAL' | 'EVAL' | 'PEWAWANCARA'
let jadwalViewMode = 'TABLE'; // 'TABLE' (Tabel Jadwal) | 'CALENDAR' (Kalender Jadwal)
let jadwalFilterHari = 'ALL';
let jadwalFilterJam = 'ALL';
let jadwalFilterPewawancara = 'ALL'; // 'ALL' | [Nama Pewawancara]
let jadwalFilterMetode = 'ALL'; // 'ALL' | 'LURING' | 'DARING'
let jadwalFilterStatus = 'ALL';
let jadwalSearch = '';

// Pewawancara Management State
const PEWAWANCARA_STORAGE_KEY = 'm3_spmb_pewawancara_list';
const DEFAULT_PEWAWANCARA = [
  {
    id: "PEW-01",
    nama: "Yosa",
    nama_lengkap: "Ustadz Yosa, S.Pd",
    gelar: "S.Pd",
    peran: "Penguji 1 (Akademik & Minat Bakat)",
    ruang: "Ruang Wawancara 1 (Gedung Utama)",
    metode_default: "Luring",
    kontak: "0812-3456-7890",
    status: "AKTIF"
  },
  {
    id: "PEW-02",
    nama: "Veli",
    nama_lengkap: "Ustadzah Veli, M.Pd",
    gelar: "M.Pd",
    peran: "Penguji 2 (Tahfidz Al-Qur'an & Kepribadian)",
    ruang: "Ruang Tahfidz (Masjid M3)",
    metode_default: "Luring",
    kontak: "0813-9876-5432",
    status: "AKTIF"
  }
];

let pewawancaraSearch = '';
let pewawancaraFilterStatus = 'ALL'; // 'ALL' | 'AKTIF' | 'NONAKTIF'
let editingPewawancaraId = null; // null jika mode tambah, string ID jika mode edit

// Sidebar Navbar State (Bisa dibuka dan ditutup, tersimpan di localStorage)
const SIDEBAR_STATE_KEY = 'spmb_wawancara_sidebar_open';
let isSidebarOpen = true;
let activeNavSection = 'JADWAL'; // 'DASHBOARD' | 'JADWAL' | 'PENILAIAN' | 'PEWAWANCARA' | 'LAPORAN'

try {
  const savedSidebar = localStorage.getItem(SIDEBAR_STATE_KEY);
  if (savedSidebar !== null) {
    isSidebarOpen = savedSidebar === 'true';
  }
} catch (e) { }

try {
  const savedMode = localStorage.getItem(ROLE_KEY);
  if (savedMode !== null) {
    isEditMode = savedMode === 'true';
  }
} catch (e) { }

/**
 * Helper Mengambil Daftar Pewawancara dari LocalStorage / SSoT
 */
function getPewawancaraList() {
  try {
    const raw = localStorage.getItem(PEWAWANCARA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error membaca daftar pewawancara:', e);
  }
  try {
    localStorage.setItem(PEWAWANCARA_STORAGE_KEY, JSON.stringify(DEFAULT_PEWAWANCARA));
  } catch (e) { }
  return [...DEFAULT_PEWAWANCARA];
}

/**
 * Helper Menyimpan Daftar Pewawancara ke LocalStorage & SSoT
 */
function savePewawancaraList(list) {
  try {
    localStorage.setItem(PEWAWANCARA_STORAGE_KEY, JSON.stringify(list));
    try {
      const dbData = db.get();
      if (dbData) {
        dbData.pewawancara = list;
        db.save(dbData);
      }
    } catch (err) { }
  } catch (e) {
    console.error('Error menyimpan daftar pewawancara:', e);
  }
}

/**
 * Helper Mengambil Hanya Pewawancara yang Aktif
 */
function getActivePewawancaraList() {
  const list = getPewawancaraList();
  const active = list.filter(p => p.status === 'AKTIF');
  return active.length > 0 ? active : list;
}

/**
 * Helper Palet Warna Konsisten untuk Setiap Pewawancara
 */
function getPewawancaraPalette(name) {
  const palettes = [
    { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', avatarBg: '#0284c7' }, // Blue
    { bg: '#f5f3ff', color: '#6d28d9', border: '#c4b5fd', avatarBg: '#7c3aed' }, // Purple
    { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', avatarBg: '#059669' }, // Emerald
    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', avatarBg: '#ea580c' }, // Orange
    { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8', avatarBg: '#db2777' }, // Pink
    { bg: '#fefce8', color: '#a16207', border: '#fef08a', avatarBg: '#ca8a04' }, // Amber
    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', avatarBg: '#16a34a' }  // Green
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

/**
 * Helper Render Badge Pewawancara Cantik & Dinamis
 */
function renderPewawancaraBadge(name) {
  const pName = (name || 'Pewawancara').trim();
  const pal = getPewawancaraPalette(pName);
  const isFemale = pName.toLowerCase().includes('veli') || pName.toLowerCase().includes('fatimah') || pName.toLowerCase().includes('siti') || pName.toLowerCase().includes('zah') || pName.toLowerCase().includes('nur');
  const icon = isFemale ? '👩‍🏫' : '👨‍🏫';
  return `<span class="badge-pewawancara" style="background: ${pal.bg}; color: ${pal.color}; border: 1.5px solid ${pal.border}; padding: 3px 8px; font-size: 0.74rem;">${icon} ${pName}</span>`;
}

/**
 * Update active state tombol menu sidebar
 */
function updateSidebarNavActive(section) {
  activeNavSection = section;
  const navBtns = document.querySelectorAll('.sidebar-nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  if (section === 'DASHBOARD') {
    const el = document.getElementById('side-nav-dashboard');
    if (el) el.classList.add('active');
  } else if (section === 'JADWAL') {
    const el = document.getElementById('side-nav-jadwal');
    if (el) el.classList.add('active');
  } else if (section === 'PENILAIAN') {
    const el = document.getElementById('side-nav-penilaian');
    if (el) el.classList.add('active');
  } else if (section === 'PEWAWANCARA') {
    const el = document.getElementById('side-nav-pewawancara');
    if (el) el.classList.add('active');
  } else if (section === 'LAPORAN') {
    const el = document.getElementById('side-nav-laporan');
    if (el) el.classList.add('active');
  }
}

/**
 * Toggle buka dan tutup sidebar (expand / collapse)
 */
function toggleSidebarState() {
  isSidebarOpen = !isSidebarOpen;
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarOpen));
  } catch (e) { }

  const sidebar = document.getElementById('wawancara-sidebar');
  const wrapper = document.getElementById('wawancara-layout-wrapper');
  const triggerBar = document.getElementById('sidebar-trigger-bar');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const labelEl = document.querySelector('.sidebar-collapse-label');

  if (sidebar) {
    if (isSidebarOpen) {
      sidebar.classList.remove('collapsed');
      if (wrapper) wrapper.classList.remove('sidebar-collapsed');
      if (triggerBar) triggerBar.style.display = 'none';
      if (toggleBtn) toggleBtn.setAttribute('title', 'Tutup Sidebar');
      if (labelEl) labelEl.textContent = 'Tutup Menu';
      showToast('📂 Sidebar Navigasi dibuka');
    } else {
      sidebar.classList.add('collapsed');
      if (wrapper) wrapper.classList.add('sidebar-collapsed');
      if (triggerBar) triggerBar.style.display = 'flex';
      if (toggleBtn) toggleBtn.setAttribute('title', 'Buka Sidebar');
      if (labelEl) labelEl.textContent = '';
      showToast('📁 Sidebar Navigasi ditutup (Mode Layar Penuh)');
    }
  }
}

/**
 * Helper untuk memastikan setiap pendaftar memiliki jadwal wawancara yang valid
 * dengan pewawancara yang jelas dan metode (Daring atau Luring)
 * Sesuai aturan:
 * - Weekday (Senin - Jumat): 08.00 - 15.00 WIB
 * - Weekend (Sabtu - Minggu): 09.00 - 15.00 WIB
 */
function ensureCandidateJadwal(c, idx) {
  const activePew = getActivePewawancaraList();
  const pewPool = activePew.length > 0 ? activePew : DEFAULT_PEWAWANCARA;
  const assignedPewObj = pewPool[idx % pewPool.length];
  const assignedPew = assignedPewObj.nama;

  // Daftar template jadwal dengan pewawancara terdistribusi
  const defaultPool = [
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "08:00", jam_selesai: "09:00", sesi: "08.00 - 09.00 WIB", metode: "Luring", platform: "", link_meeting: "", ruang: assignedPewObj.ruang || "Ruang Wawancara 1 (Gedung Utama)", pewawancara: assignedPew },
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Daring", platform: "Google Meet", link_meeting: "https://meet.google.com/spm-bm3y-wwn", ruang: "Google Meet (Daring Online)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-20", hari: "Selasa", tipe_hari: "Weekday", jam: "10:00", jam_selesai: "11:00", sesi: "10.00 - 11.00 WIB", metode: "Luring", platform: "", link_meeting: "", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: assignedPew },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Daring", platform: "Zoom", link_meeting: "https://zoom.us/j/9876543210", ruang: "Zoom (Daring Online)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-25", hari: "Minggu", tipe_hari: "Weekend", jam: "11:00", jam_selesai: "12:00", sesi: "11.00 - 12.00 WIB", metode: "Daring", platform: "Google Meet", link_meeting: "", ruang: "Google Meet (Daring Online)", pewawancara: assignedPew },
    { tanggal: "2026-10-21", hari: "Rabu", tipe_hari: "Weekday", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", platform: "", link_meeting: "", ruang: "Ruang Wawancara 1 (Gedung Utama)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-22", hari: "Kamis", tipe_hari: "Weekday", jam: "14:00", jam_selesai: "15:00", sesi: "14.00 - 15.00 WIB", metode: "Daring", platform: "Google Meet", link_meeting: "https://meet.google.com/m3y-wwnc-spm", ruang: "Google Meet (Daring Online)", pewawancara: assignedPew },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", platform: "", link_meeting: "", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama }
  ];

  if (!c.jadwal_wawancara || !c.jadwal_wawancara.tanggal || !c.jadwal_wawancara.jam) {
    const assigned = defaultPool[idx % defaultPool.length];
    c.jadwal_wawancara = { ...assigned };
  }

  // Pastikan metode wawancara selalu ada (Luring atau Daring)
  if (!c.jadwal_wawancara.metode) {
    c.jadwal_wawancara.metode = (idx % 2 === 0) ? 'Luring' : 'Daring';
    if (c.jadwal_wawancara.metode === 'Daring' && (!c.jadwal_wawancara.ruang || c.jadwal_wawancara.ruang.includes('Gedung') || c.jadwal_wawancara.ruang.includes('Lab'))) {
      c.jadwal_wawancara.ruang = 'Google Meet / Zoom (Daring Online)';
    }
  }

  // Pastikan pewawancara valid
  const currentP = (c.jadwal_wawancara.pewawancara || '').trim();
  if (!currentP || currentP === 'Divisi Pewawancara SPMB' || currentP.includes('Tim') || currentP.includes('Drs.')) {
    c.jadwal_wawancara.pewawancara = assignedPew;
  }

  return c;
}

/**
 * Format tanggal ISO (YYYY-MM-DD) ke Bahasa Indonesia (Contoh: "Sabtu, 24 Oktober 2026")
 * Aman dari pergeseran tanggal akibat konversi timezone browser
 */
export function formatTanggalIndonesia(isoDateStr, hariNama = '') {
  if (!isoDateStr) return hariNama || '-';

  const parts = String(isoDateStr).trim().split('T')[0].split('-');
  if (parts.length < 3) return isoDateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  let hari = hariNama;
  if (!hari || hari === '-' || !namaHari.includes(hari)) {
    const d = new Date(parseInt(year, 10), monthIdx, day, 12, 0, 0);
    hari = namaHari[d.getDay()];
  }

  const bulan = namaBulan[monthIdx] || parts[1];
  return `${hari}, ${day} ${bulan} ${year}`;
}

/**
 * Validasi apakah URL tautan meeting merupakan URL valid
 */
export function isValidMeetingLink(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

/**
 * Helper mengambil nama hari bahasa Indonesia dari tanggal ISO
 */
export function getNamaHariFromDate(isoDateStr) {
  if (!isoDateStr) return 'Senin';
  const parts = String(isoDateStr).trim().split('T')[0].split('-');
  if (parts.length < 3) return 'Senin';
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return hariList[d.getDay()] || 'Senin';
}

/**
 * Sync & Fetch Data Pendaftar dari SSoT database & spmb_pendaftar_db
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

  // Jika data di SSoT kosong atau belum ada yang lunas, tambahkan mock data lengkap
  if (!data || data.length <= 1) {
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
        jadwal_wawancara: {
          tanggal: "2026-10-19",
          hari: "Senin",
          tipe_hari: "Weekday",
          jam: "08:00",
          jam_selesai: "09:00",
          sesi: "08.00 - 09.00 WIB",
          metode: "Luring",
          platform: "",
          link_meeting: "",
          ruang: "Ruang Wawancara 1 (Gedung Utama)",
          pewawancara: "Yosa"
        },
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
          aspek_penilaian: ["Bakat & Minat", "Sosial"],
          catatan_aspek: {
            "Bakat & Minat": "Minat kuat pada olimpiade sains & teknologi informasi.",
            "Sosial": "Aktif berorganisasi dan mudah beradaptasi dengan rekan sebaya."
          },
          peminatan_bakat: ["Bakat & Minat", "Sosial"],
          status_tes_quran: "Sudah Dites",
          hafalan_teruji: 3,
          hafalan_juz: 3,
          hafalan_dilaporkan: 3,
          rekomendasi_beasiswa: "Potongan SPP Rp1.000.000",
          rekomendasi_beasiswa_code: "POTONGAN_1000K",
          nominal_beasiswa: 1000000,
          is_beasiswa_final: true,
          rekomendasi_akhir: "LAYAK",
          tanggal_wawancara: "2026-10-06T10:00:00Z",
          pewawancara: "Veli"
        },
        jadwal_wawancara: {
          tanggal: "2026-10-19",
          hari: "Senin",
          tipe_hari: "Weekday",
          jam: "09:00",
          jam_selesai: "10:00",
          sesi: "09.00 - 10.00 WIB",
          metode: "Daring",
          platform: "Google Meet",
          link_meeting: "https://meet.google.com/spm-bm3y-wwn",
          ruang: "Google Meet (Daring Online)",
          pewawancara: "Veli"
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
        jadwal_wawancara: {
          tanggal: "2026-10-20",
          hari: "Selasa",
          tipe_hari: "Weekday",
          jam: "10:00",
          jam_selesai: "11:00",
          sesi: "10.00 - 11.00 WIB",
          metode: "Luring",
          ruang: "Ruang Wawancara 2 (Lab Komputer)",
          pewawancara: "Yosa"
        },
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
          aspek_penilaian: ["Kepribadian", "Bahasa & Komunikasi", "Bakat & Minat", "Ibadah"],
          catatan_aspek: {
            "Kepribadian": "Mandiri, santun, dan berkarakter islami yang matang.",
            "Bahasa & Komunikasi": "Fasih berbahasa Arab dan Inggris secara aktif.",
            "Bakat & Minat": "Potensi tinggi di bidang riset sains dan teknologi informasi.",
            "Ibadah": "Tahfidz 16 Juz mutqin, istiqomah sholat fardhu berjamaah."
          },
          peminatan_bakat: ["Kepribadian", "Bahasa & Komunikasi", "Bakat & Minat", "Ibadah"],
          status_tes_quran: "Sudah Dites",
          hafalan_teruji: 16,
          hafalan_juz: 16,
          hafalan_dilaporkan: 16,
          rekomendasi_beasiswa: "Perlu Konfirmasi Sekolah",
          rekomendasi_beasiswa_code: "KONFIRMASI_SEKOLAH",
          nominal_beasiswa: null,
          is_beasiswa_final: false,
          rekomendasi_akhir: "LAYAK",
          tanggal_wawancara: "2026-10-07T14:20:00Z",
          pewawancara: "Veli"
        },
        jadwal_wawancara: {
          tanggal: "2026-10-24",
          hari: "Sabtu",
          tipe_hari: "Weekend",
          jam: "09:00",
          jam_selesai: "10:00",
          sesi: "09.00 - 10.00 WIB",
          metode: "Daring",
          platform: "Zoom",
          link_meeting: "https://zoom.us/j/9876543210",
          ruang: "Zoom (Daring Online)",
          pewawancara: "Veli"
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
        status_pembayaran: "LUNAS",
        statusWawancara: "BELUM",
        jadwal_wawancara: {
          tanggal: "2026-10-25",
          hari: "Minggu",
          tipe_hari: "Weekend",
          jam: "11:00",
          jam_selesai: "12:00",
          sesi: "11.00 - 12.00 WIB",
          metode: "Daring",
          platform: "Google Meet",
          link_meeting: "",
          ruang: "Google Meet (Daring Online)",
          pewawancara: "Yosa"
        },
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

  // Sinkronkan data dari spmb_pendaftar_db (Portal) jika ada pendaftar baru
  try {
    const portalRaw = localStorage.getItem('spmb_pendaftar_db');
    if (portalRaw) {
      const portalList = JSON.parse(portalRaw);
      if (Array.isArray(portalList)) {
        portalList.forEach(p => {
          const pId = p.id_pendaftar || p.id;
          const match = data.find(d => (d.id === pId || d.id_pendaftar === pId || d.nisn === p.nisn));
          if (!match) {
            data.push({
              id: pId || `REG-2026-${String(data.length + 1).padStart(3, '0')}`,
              nama: p.nama_lengkap || p.nama || 'Pendaftar Baru',
              nisn: p.nisn || '',
              asal_sekolah: p.biodata?.asal_sekolah || 'SMP Muhammadiyah 1',
              pilihan_jurusan: p.biodata?.pilihan_jurusan || 'MIPA',
              status_akun: (p.status_akun === 'active' || p.status_akun === 'AKTIF') ? 'AKTIF' : 'MENUNGGU',
              status_pembayaran: 'LUNAS',
              statusWawancara: p.status_wawancara || 'BELUM',
              jadwal_wawancara: p.jadwal_wawancara || null,
              created_at: p.created_at || new Date().toISOString()
            });
          } else {
            if (p.jadwal_wawancara) {
              match.jadwal_wawancara = p.jadwal_wawancara;
            }
            if (p.pengingat_wawancara) {
              match.pengingat_wawancara = p.pengingat_wawancara;
            }
          }
        });
      }
    }
  } catch (err) { }

  // Pastikan seluruh data pendaftar memiliki jadwal terisi & pewawancara jelas (Yosa / Veli)
  data = data.map((item, idx) => ensureCandidateJadwal(item, idx));

  return data;
}

/**
 * Menghitung rekomendasi beasiswa otomatis berdasarkan hafalan Qur'an (Juz)
 */
export function calculateBeasiswaRecommendation(juz, statusTes = 'SUDAH_DITES') {
  const normStatus = (statusTes || '').toUpperCase();
  const isTested = normStatus === 'SUDAH_DITES' || normStatus === 'SUDAH DITES';

  // Jika Belum Dites: Tampilkan status "Menunggu Tes Al-Qur'an", jangan tetapkan beasiswa final
  if (!isTested) {
    return {
      code: 'MENUNGGU_TES',
      label: "Menunggu Tes Al-Qur'an",
      shortLabel: 'Menunggu Tes',
      nominal: 0,
      nominalFormatted: '-',
      badgeClass: 'badge-beasiswa-menunggu',
      icon: '⏳',
      isFinal: false
    };
  }

  // Jika Sudah Dites: Hitung rekomendasi sesuai aturan beasiswa sekolah
  const count = parseFloat(juz);
  if (isNaN(count) || count <= 0) {
    return {
      code: 'REGULER',
      label: 'Reguler',
      shortLabel: 'Reguler',
      nominal: 0,
      nominalFormatted: 'Rp0 (Reguler)',
      badgeClass: 'badge-beasiswa-reguler',
      icon: '📘',
      isFinal: true
    };
  } else if (count === 1) {
    return {
      code: 'POTONGAN_500K',
      label: 'Potongan SPP Rp500.000',
      shortLabel: 'Potongan 500rb',
      nominal: 500000,
      nominalFormatted: 'Rp500.000',
      badgeClass: 'badge-beasiswa-parsial',
      icon: '🌟',
      isFinal: true
    };
  } else if (count >= 2 && count <= 3) {
    return {
      code: 'POTONGAN_1000K',
      label: 'Potongan SPP Rp1.000.000',
      shortLabel: 'Potongan 1jt',
      nominal: 1000000,
      nominalFormatted: 'Rp1.000.000',
      badgeClass: 'badge-beasiswa-parsial',
      icon: '🌟',
      isFinal: true
    };
  } else {
    // Di atas 3 Juz (> 3) atau jumlah hafalan yang tidak termasuk ketentuan nominal yang diketahui
    return {
      code: 'KONFIRMASI_SEKOLAH',
      label: 'Perlu Konfirmasi Sekolah',
      shortLabel: 'Konfirmasi Sekolah',
      nominal: null,
      nominalFormatted: 'Perlu Konfirmasi Sekolah',
      badgeClass: 'badge-beasiswa-konfirmasi',
      icon: '⚠️',
      isFinal: false
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
  const pewawancaraList = getPewawancaraList();
  const activePewawancaraList = getActivePewawancaraList();
  const inactivePewawancaraList = pewawancaraList.filter(p => p.status !== 'AKTIF');

  // Hitung statistik
  const totalLunas = lunasCandidates.length;
  const sudahWawancara = lunasCandidates.filter(c => (c.statusWawancara || '').toUpperCase() === 'SELESAI').length;
  const belumWawancara = totalLunas - sudahWawancara;
  const layakCount = lunasCandidates.filter(c => c.dataWawancara?.rekomendasi_akhir === 'LAYAK').length;
  const countLuring = lunasCandidates.filter(c => (c.jadwal_wawancara?.metode || 'Luring').toUpperCase() === 'LURING').length;
  const countDaring = lunasCandidates.filter(c => (c.jadwal_wawancara?.metode || '').toUpperCase() === 'DARING').length;

  container.innerHTML = `
    <!-- Custom Style Injection untuk Modul 04 (Full-Width & No-Scroll) -->
    <style>
      /* Full-width container override agar seluruh tabel, kalender & modal tampil utuh tanpa scroll */
      main.container:has(.wawancara-layout-wrapper),
      .standalone-container {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 1rem !important;
        margin: 1rem auto !important;
      }
      .wawancara-layout-wrapper {
        gap: 1rem !important;
      }
      .wawancara-sidebar {
        width: 215px !important;
        min-width: 215px !important;
        padding: 1rem 0.85rem !important;
      }
      .wawancara-sidebar.collapsed {
        width: 64px !important;
        min-width: 64px !important;
        padding: 1rem 0.45rem !important;
      }
      /* Hilangkan scroll horizontal pada seluruh tabel & kalender */
      .jadwal-table-wrapper,
      .wawancara-main-area .table-responsive,
      .kalender-grid-wrapper {
        overflow-x: visible !important;
      }
      .jadwal-table {
        width: 100% !important;
        font-size: 0.78rem !important;
      }
      .jadwal-table th {
        padding: 8px 6px !important;
        font-size: 0.7rem !important;
        white-space: normal !important;
        line-height: 1.25 !important;
      }
      .jadwal-table td {
        padding: 8px 6px !important;
        white-space: normal !important;
      }
      .wawancara-main-area .table th,
      .wawancara-main-area .table td {
        padding: 8px 7px !important;
        font-size: 0.78rem !important;
        white-space: normal !important;
      }
      .jadwal-candidate-name {
        font-size: 0.84rem !important;
      }
      .jadwal-time-pill {
        font-size: 0.74rem !important;
        padding: 3px 7px !important;
      }
      .btn-gabung-meet,
      .badge-link-empty {
        white-space: normal !important;
        text-align: center;
      }
      .kalender-grid-wrapper {
        padding: 0.75rem !important;
      }
      .kalender-matrix-table {
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-spacing: 5px !important;
      }
      .kalender-matrix-table th {
        padding: 7px 4px !important;
        font-size: 0.74rem !important;
      }
      .kalender-time-header {
        width: 92px !important;
      }
      .kalender-cell {
        padding: 5px !important;
      }
      .kalender-cell-item {
        padding: 6px !important;
        font-size: 0.72rem !important;
        word-break: break-word !important;
      }
      /* Modal Form Penilaian Wawancara Full-View Tanpa Scroll Internal */
      .modal-wawancara-overlay {
        padding: 0.5rem 1rem !important;
        overflow-y: auto !important;
      }
      #modal-wawancara .modal-wawancara-content {
        max-width: 1320px !important;
        width: 97% !important;
        max-height: none !important;
        overflow: visible !important;
        border-radius: 14px !important;
      }
      #form-penilaian-wawancara {
        overflow: visible !important;
      }
      #modal-wawancara .modal-wawancara-header {
        padding: 0.65rem 1.15rem !important;
        border-radius: 14px 14px 0 0 !important;
      }
      #modal-wawancara .modal-wawancara-header h3 {
        font-size: 1rem !important;
      }
      #modal-wawancara .modal-wawancara-body {
        padding: 0.7rem 1.1rem !important;
        overflow: visible !important;
      }
      .modal-main-grid {
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 0.7rem;
        align-items: start;
      }
      .modal-col-left,
      .modal-col-right {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }
      .modal-section-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.55rem 0.75rem;
      }
      #modal-wawancara .form-section-title {
        font-size: 0.82rem !important;
        border-bottom: 1.5px solid #e2e8f0 !important;
        padding-bottom: 3px !important;
        margin-top: 0 !important;
        margin-bottom: 0.45rem !important;
      }
      #modal-wawancara .grid-2col {
        gap: 0.55rem !important;
      }
      #modal-wawancara .form-group {
        margin-bottom: 0 !important;
      }
      #modal-wawancara .form-group label {
        font-size: 0.76rem !important;
        margin-bottom: 2px !important;
      }
      #modal-wawancara .form-control {
        padding: 5px 8px !important;
        font-size: 0.8rem !important;
      }
      #modal-wawancara .aspek-penilaian-container {
        gap: 4px !important;
        margin-top: 2px !important;
      }
      #modal-wawancara .aspek-item {
        padding: 4px 8px !important;
        gap: 8px !important;
        border-radius: 7px !important;
      }
      #modal-wawancara .aspek-label-col {
        flex: 0 0 175px !important;
        max-width: 175px !important;
      }
      #modal-wawancara .aspek-checkbox-label {
        font-size: 0.78rem !important;
        gap: 6px !important;
      }
      #modal-wawancara .aspek-catatan-input {
        padding: 4px 8px !important;
        font-size: 0.78rem !important;
      }
      #modal-wawancara .beasiswa-preview-box {
        padding: 6px 10px !important;
        margin-top: 4px !important;
        font-size: 0.8rem !important;
      }
      #modal-wawancara .modal-wawancara-footer {
        position: static !important;
        padding: 0.6rem 1.15rem !important;
        border-radius: 0 0 14px 14px !important;
      }
      @media (max-width: 960px) {
        .modal-main-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
    <style>
      .wawancara-header {
        background: linear-gradient(135deg, #00562c 0%, #008349 100%);
        color: white;
        padding: 1.5rem;
        border-radius: var(--radius);
        margin-bottom: 1.25rem;
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
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1.25rem;
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
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .stat-val-w {
        font-size: 1.45rem;
        font-weight: 800;
        line-height: 1.2;
        color: var(--text-main);
      }
      .stat-lbl-w {
        font-size: 0.76rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      /* Subtabs Bar */
      .wawancara-subtabs {
        display: flex;
        gap: 8px;
        margin-bottom: 1.25rem;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
        flex-wrap: wrap;
      }
      .wawancara-subtab-btn {
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        padding: 9px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.88rem;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
      }
      .wawancara-subtab-btn:hover {
        border-color: #006837;
        color: #006837;
        background: #f0fdf4;
      }
      .wawancara-subtab-btn.active {
        background: #006837;
        color: #ffffff;
        border-color: #006837;
        box-shadow: 0 4px 10px rgba(0, 104, 55, 0.25);
      }

      /* Kartu Tabel Jadwal Wawancara Styling */
      .jadwal-card-container {
        background: #ffffff;
        border: 2px solid #006837;
        border-radius: 14px;
        box-shadow: 0 10px 28px rgba(0, 104, 55, 0.08);
        margin-bottom: 1.5rem;
        overflow: hidden;
      }
      .jadwal-header-band {
        background: linear-gradient(135deg, #004d28 0%, #006837 100%);
        color: #ffffff;
        padding: 1.25rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        border-bottom: 3.5px solid #f5a623;
      }
      .jadwal-badge-icon {
        width: 48px;
        height: 48px;
        background: #ffffff;
        color: #006837;
        font-weight: 800;
        font-size: 1.15rem;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      }
      .jadwal-rules-banner {
        background: #f0fdf4;
        border-bottom: 1.5px solid #bbf7d0;
        padding: 10px 1.5rem;
        font-size: 0.85rem;
        color: #166534;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill-rule-weekday {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
        padding: 3px 10px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.78rem;
      }
      .pill-rule-weekend {
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fde68a;
        padding: 3px 10px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.78rem;
      }
      .jadwal-controls-bar {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .jadwal-toggle-btn {
        background: #ffffff;
        border: none;
        padding: 7px 14px;
        font-size: 0.82rem;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .jadwal-toggle-btn.active {
        background: #006837;
        color: #ffffff;
      }
      .jadwal-table-wrapper {
        overflow-x: auto;
      }
      .jadwal-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.86rem;
      }
      .jadwal-table th {
        background: #f1f5f9;
        color: #0f172a;
        font-weight: 800;
        padding: 11px 12px;
        text-align: left;
        border-bottom: 2px solid #cbd5e1;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      .jadwal-table td {
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      .jadwal-table tbody tr:hover {
        background-color: #f8fafc;
      }
      .jadwal-footer-sheet {
        background: #f8fafc;
        border-top: 1.5px solid #e2e8f0;
        padding: 1.25rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.84rem;
      }
      .jadwal-slot-badge-day {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .jadwal-candidate-name {
        font-size: 0.95rem;
        font-weight: 800;
        color: #0f172a;
        display: block;
      }
      .jadwal-time-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 800;
        font-size: 0.82rem;
        background: #ecfdf5;
        color: #006837;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1px solid #a7f3d0;
      }

      /* Badge Pewawancara Khusus: Yosa & Veli */
      .badge-pewawancara {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 0.8rem;
        letter-spacing: 0.3px;
      }
      .badge-yosa {
        background: #e0f2fe;
        color: #0369a1;
        border: 1.5px solid #7dd3fc;
      }
      .badge-veli {
        background: #f5f3ff;
        color: #6d28d9;
        border: 1.5px solid #c4b5fd;
      }

      /* Badge Metode Wawancara: Daring vs Luring */
      .badge-metode {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.74rem;
        letter-spacing: 0.2px;
      }
      .badge-metode-luring {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      .badge-metode-daring {
        background: #f0f9ff;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }

      /* Pewawancara Management Styling */
      .pewawancara-avatar-badge {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.82rem;
        color: #ffffff;
        flex-shrink: 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.12);
      }
      .btn-pew-action {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .btn-pew-action:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      /* Kalender Jadwal Mingguan Styling */
      .kalender-grid-wrapper {
        padding: 1.25rem;
        overflow-x: auto;
      }
      .kalender-matrix-table {
        width: 100%;
        min-width: 960px;
        border-collapse: separate;
        border-spacing: 8px;
      }
      .kalender-matrix-table th {
        background: #006837;
        color: #ffffff;
        padding: 10px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 700;
        text-align: center;
      }
      .kalender-time-header {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        width: 120px;
        font-weight: 800;
        border: 1px solid #cbd5e1;
      }
      .kalender-cell {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        min-height: 80px;
        vertical-align: top;
        padding: 8px;
        transition: all 0.2s;
      }
      .kalender-cell.has-candidates {
        background: #ffffff;
        border: 1.5px solid #86efac;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      }
      .kalender-cell.weekend-closed {
        background: #f1f5f9;
        border-color: #e2e8f0;
        color: #94a3b8;
        text-align: center;
        font-size: 0.72rem;
        padding-top: 1.5rem;
        font-weight: 600;
      }
      .kalender-cell-item {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 8px;
        margin-bottom: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        font-size: 0.78rem;
      }
      .kalender-cell-item:last-child {
        margin-bottom: 0;
      }

      /* Filter bar evaluasi */
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
      .badge-beasiswa-menunggu {
        background: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge-beasiswa-konfirmasi {
        background: #fff7ed;
        color: #c2410c;
        border: 1px solid #fed7aa;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
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

      /* Aspek Penilaian Wawancara Styling */
      .aspek-penilaian-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 6px;
      }
      .aspek-item {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 8px 12px;
        transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      }
      .aspek-item:focus-within,
      .aspek-item.is-checked {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 1px 3px rgba(0, 104, 55, 0.08);
      }
      .aspek-label-col {
        flex: 0 0 215px;
        max-width: 215px;
      }
      .aspek-checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.86rem;
        font-weight: 700;
        color: #1e293b;
        user-select: none;
        width: 100%;
        margin-bottom: 0;
      }
      .aspek-checkbox {
        width: 17px;
        height: 17px;
        accent-color: #006837;
        cursor: pointer;
        margin: 0;
      }
      .aspek-input-col {
        flex: 1;
        min-width: 0;
      }
      .aspek-catatan-input {
        width: 100%;
        padding: 7px 12px;
        font-size: 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #334155;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .aspek-catatan-input:focus {
        border-color: #006837;
        outline: none;
        box-shadow: 0 0 0 2px rgba(0, 104, 55, 0.15);
      }
      .aspek-catatan-input:disabled {
        background: #f1f5f9;
        color: #64748b;
        cursor: not-allowed;
      }
      @media (max-width: 640px) {
        .aspek-item {
          flex-direction: column;
          align-items: stretch;
          gap: 6px;
        }
        .aspek-label-col {
          flex: auto;
          max-width: 100%;
        }
      }

      .beasiswa-preview-box {
        background: #f8fafc;
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        padding: 10px 14px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.88rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .beasiswa-box-menunggu_tes {
        background: #fffbeb;
        border-color: #fde68a;
        color: #92400e;
      }
      .beasiswa-box-reguler {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #334155;
      }
      .beasiswa-box-potongan_500k,
      .beasiswa-box-potongan_1000k {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
      }
      .beasiswa-box-konfirmasi_sekolah {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #9a3412;
      }

      /* Tautan Meeting & Jadwal Styling */
      .btn-gabung-meet {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #0284c7;
        color: #ffffff !important;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.76rem;
        font-weight: 700;
        text-decoration: none;
        border: none;
        box-shadow: 0 1px 3px rgba(2, 132, 199, 0.25);
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .btn-gabung-meet:hover {
        background: #0369a1;
        color: #ffffff !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
      }
      .badge-link-empty {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #fffbeb;
        color: #b45309;
        border: 1px solid #fde68a;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.74rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .kalender-cell-item.item-daring {
        border-left: 3.5px solid #0284c7;
        background: #f0f9ff;
      }
      .kalender-cell-item.item-luring {
        border-left: 3.5px solid #006837;
        background: #ffffff;
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

      /* Print Optimizations */
      @media print {
        .standalone-topbar, .wawancara-header, .stats-grid-wawancara, .wawancara-subtabs, .jadwal-controls-bar, .modal-wawancara-overlay, .toast-notification, nav.nav-tabs, #app-header-container, .btn-input-nilai, .btn-wawancara-action {
          display: none !important;
        }
        .jadwal-card-container {
          border: 1.5px solid #000 !important;
          box-shadow: none !important;
          margin: 0 !important;
        }
        .jadwal-header-band {
          background: #006837 !important;
          color: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          background: #fff !important;
        }
        .wawancara-sidebar, .sidebar-collapsed-trigger-bar {
          display: none !important;
        }
        .wawancara-layout-wrapper {
          display: block !important;
        }
      }

      /* =========================================================
         SIDEBAR NAVBAR LAYOUT UNTUK MODUL 04 (SESUAI WIREFRAME MOCKUP)
         ========================================================= */
      .wawancara-layout-wrapper {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
        position: relative;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        min-height: calc(100vh - 180px);
        transition: all 0.3s ease;
      }
      
      .wawancara-sidebar {
        width: 260px;
        min-width: 260px;
        background: #cbd5e1; /* Abu-abu rapi terstruktur sesuai gambar mockup */
        border: 1.5px solid #94a3b8;
        border-radius: 18px;
        padding: 1.25rem 1rem;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: sticky;
        top: 1rem;
        flex-shrink: 0;
        z-index: 50;
      }

      .wawancara-sidebar.collapsed {
        width: 68px;
        min-width: 68px;
        padding: 1.25rem 0.5rem;
      }

      /* Top Bar Sidebar (Hamburger) */
      .sidebar-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }

      .sidebar-hamburger-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: #0f172a;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px;
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      .sidebar-hamburger-btn:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
      }

      .sidebar-collapse-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Logo SMA Card (Kotak Rounded Gelap Sesuai Mockup) */
      .sidebar-brand-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        transition: opacity 0.25s ease;
      }

      .sidebar-logo-card {
        width: 105px;
        height: 105px;
        background: #2b3544; /* Charcoal gelap sesuai mockup */
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 0.75rem;
        margin-bottom: 1.1rem;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
        border: 2px solid rgba(255, 255, 255, 0.1);
      }

      .sidebar-logo-icon {
        font-size: 1.6rem;
      }

      .sidebar-logo-text {
        color: #ffffff;
        font-weight: 800;
        font-size: 0.85rem;
        letter-spacing: 0.5px;
        text-align: center;
      }

      /* Title & Subtitle */
      .sidebar-title-group {
        margin-bottom: 1.25rem;
      }

      .sidebar-portal-title {
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        line-height: 1.2;
        letter-spacing: -0.3px;
      }

      .sidebar-portal-subtitle {
        font-size: 0.82rem;
        color: #475569;
        margin: 4px 0 0 0;
        font-weight: 600;
        line-height: 1.35;
      }

      /* Navigation Menu List */
      .sidebar-nav-menu {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        margin-bottom: 1.5rem;
      }

      .sidebar-nav-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 18px;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.9rem;
        color: #334155;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        font-family: inherit;
        white-space: nowrap;
        position: relative;
      }

      .sidebar-nav-btn:hover {
        background: #f8fafc;
        border-color: #006837;
        color: #006837;
        transform: translateY(-1.5px);
        box-shadow: 0 4px 10px rgba(0, 104, 55, 0.12);
      }

      /* Active State (Tombol Gelap Sesuai Mockup 'Keuangan') */
      .sidebar-nav-btn.active {
        background: #2b3544; /* Charcoal gelap persis di gambar */
        color: #ffffff;
        border-color: #1e293b;
        box-shadow: 0 6px 16px rgba(43, 53, 68, 0.35);
      }

      .sidebar-nav-btn.active:hover {
        background: #1e293b;
        color: #ffffff;
        border-color: #0f172a;
      }

      .side-nav-icon {
        font-size: 1.15rem;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .side-nav-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Sidebar Collapsed State Rules */
      .wawancara-sidebar.collapsed .sidebar-brand-container,
      .wawancara-sidebar.collapsed .sidebar-team-info,
      .wawancara-sidebar.collapsed .side-nav-text,
      .wawancara-sidebar.collapsed .sidebar-collapse-label {
        display: none !important;
      }

      .wawancara-sidebar.collapsed .sidebar-nav-btn {
        justify-content: center;
        padding: 12px 0;
        border-radius: 10px;
      }

      .wawancara-sidebar.collapsed .sidebar-top-bar {
        justify-content: center;
      }

      /* Sidebar Team Info Footer */
      .sidebar-team-info {
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }

      .team-info-badge {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 8px 12px;
      }

      /* Main Workspace Area */
      .wawancara-main-area {
        flex: 1;
        min-width: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        transition: all 0.3s ease;
      }

      /* Reopen Quick Bar */
      .sidebar-collapsed-trigger-bar {
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        padding: 8px 16px;
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        animation: fadeInQuick 0.25s ease-out;
      }

      .btn-reopen-pill {
        background: #006837;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 7px 15px;
        font-weight: 700;
        font-size: 0.85rem;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 104, 55, 0.25);
        transition: all 0.2s;
        font-family: inherit;
      }

      .btn-reopen-pill:hover {
        background: #004d28;
        transform: translateY(-1px);
      }

      @keyframes fadeInQuick {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Responsive Rules */
      /* ==========================================================================
         REVISI TAHAP 6: OPTIMALISASI RESPONSIVE DESIGN MODUL 04 SPMB
         Mendukung Viewport: 360px, 390px, 430px, 768px, 1366px, 1920px
         ========================================================================== */

      /* Base Mobile Topbar & Backdrop (Disembunyikan di Desktop) */
      .wawancara-mobile-topbar {
        display: none;
      }
      .wawancara-sidebar-backdrop {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        z-index: 10004;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .wawancara-sidebar-backdrop.show {
        display: block;
        opacity: 1;
      }
      .btn-close-mobile-sidebar {
        display: none;
      }

      /* Breakpoint Tablet & Smartphone (<= 960px) */
      @media (max-width: 960px) {
        .wawancara-layout-wrapper {
          flex-direction: column !important;
          gap: 0 !important;
          width: 100% !important;
          min-height: auto !important;
        }

        /* Mobile Topbar Modul 04 */
        .wawancara-mobile-topbar {
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0.5rem;
          z-index: 40;
        }
        .btn-mobile-hamburger {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          color: #006837;
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .btn-mobile-hamburger:hover {
          background: #dcfce7;
        }
        .mobile-topbar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #0f172a;
        }
        .mobile-tab-pill {
          background: #006837;
          color: #ffffff;
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }

        /* Sidebar Navigasi Berubah Menjadi Off-Canvas Drawer */
        .wawancara-sidebar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;
          width: 290px !important;
          max-width: 86vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          border-radius: 0 18px 18px 0 !important;
          z-index: 10005 !important;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: none;
        }
        .wawancara-sidebar.mobile-drawer-open {
          transform: translateX(0) !important;
          box-shadow: 10px 0 35px rgba(0, 0, 0, 0.28) !important;
        }
        .wawancara-sidebar.collapsed {
          width: 290px !important;
          min-width: 290px !important;
          padding: 1.25rem 1rem !important;
        }
        /* Selalu tampilkan label teks di mobile drawer */
        .wawancara-sidebar.collapsed .sidebar-brand-container,
        .wawancara-sidebar.collapsed .sidebar-team-info,
        .wawancara-sidebar.collapsed .side-nav-text,
        .wawancara-sidebar.collapsed .sidebar-collapse-label {
          display: flex !important;
        }
        .wawancara-sidebar.collapsed .side-nav-text {
          display: inline !important;
        }
        .wawancara-sidebar.collapsed .sidebar-nav-btn {
          justify-content: flex-start !important;
          padding: 10px 14px !important;
        }

        /* Tombol Tutup Khusus Mobile Drawer */
        .btn-close-mobile-sidebar {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
        }
        .sidebar-top-bar {
          justify-content: space-between !important;
          margin-bottom: 10px;
        }
        .sidebar-hamburger-btn {
          display: none !important;
        }
        .sidebar-collapse-label {
          font-weight: 800;
          color: #006837;
          font-size: 0.85rem;
        }

        /* Trigger Bar Desktop disembunyikan di mobile */
        .sidebar-collapsed-trigger-bar {
          display: none !important;
        }
      }

      /* Breakpoint Tablet (<= 768px) */
      @media (max-width: 768px) {
        /* Container Mobile Padding Adjustment */
        .container {
          padding: 0 8px !important;
          margin: 0.75rem auto !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        /* Subtabs Navigasi: Horizontal Scrollable */
        .wawancara-subtabs {
          display: flex !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          gap: 6px !important;
          padding-bottom: 6px !important;
          margin-bottom: 1rem !important;
          scrollbar-width: none;
        }
        .wawancara-subtabs::-webkit-scrollbar {
          display: none;
        }
        .wawancara-subtab-btn {
          flex-shrink: 0 !important;
          white-space: nowrap !important;
          padding: 7px 12px !important;
          font-size: 0.82rem !important;
        }

        /* Stats Grid Tablet */
        .stats-grid-wawancara {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
        }

        /* Jadwal Controls Stack */
        .jadwal-filter-row {
          flex-direction: column !important;
          gap: 8px !important;
        }
        .jadwal-filter-row > div,
        .jadwal-filter-row input,
        .jadwal-filter-row select {
          width: 100% !important;
        }

        /* Kalender Grid Wrapper */
        .jadwal-calendar-wrapper {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        .jadwal-calendar-grid {
          min-width: 740px !important;
        }
      }

      /* Breakpoint Smartphone (<= 640px) */
      @media (max-width: 640px) {
        /* Header Banner Modul */
        .wawancara-header {
          padding: 1rem 1.15rem !important;
          border-radius: 12px !important;
        }
        .wawancara-header h2 {
          font-size: 1.15rem !important;
          line-height: 1.35 !important;
        }
        .wawancara-header p {
          font-size: 0.78rem !important;
          margin-top: 4px !important;
        }
        .wawancara-header > div > div {
          min-width: 100% !important;
          width: 100% !important;
        }

        /* Stats Grid Smartphone */
        .stats-grid-wawancara {
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
        }
        .stat-card-w {
          padding: 0.75rem 0.65rem !important;
          gap: 8px !important;
        }
        .stat-icon-w {
          width: 32px !important;
          height: 32px !important;
          font-size: 1rem !important;
        }
        .stat-val-w {
          font-size: 1.2rem !important;
        }
        .stat-lbl-w {
          font-size: 0.68rem !important;
        }

        /* FORM PENILAIAN WAWANCARA MODAL (FULL SHEET MOBILE) */
        .modal-wawancara-overlay {
          padding: 0 !important;
          align-items: flex-end !important;
        }
        .modal-wawancara-content {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 94vh !important;
          max-height: 94vh !important;
          border-radius: 18px 18px 0 0 !important;
          margin: 0 !important;
        }
        .modal-wawancara-header {
          padding: 12px 14px !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 30 !important;
        }
        .modal-wawancara-body {
          padding: 12px 14px 18px 14px !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        .modal-wawancara-footer {
          position: sticky !important;
          bottom: 0 !important;
          z-index: 30 !important;
          background: #ffffff !important;
          border-top: 1.5px solid #e2e8f0 !important;
          padding: 10px 14px !important;
          display: flex !important;
          flex-direction: column-reverse !important;
          gap: 8px !important;
          box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08) !important;
        }
        .modal-wawancara-footer button {
          width: 100% !important;
          justify-content: center !important;
          padding: 11px 16px !important;
          font-size: 0.9rem !important;
          min-height: 44px !important;
        }

        /* 5 Aspek Penilaian: Susun Vertikal Tanpa Tumpang Tindih */
        .aspek-item {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 8px !important;
          padding: 10px 12px !important;
        }
        .aspek-label-col {
          flex: 0 0 100% !important;
          max-width: 100% !important;
          width: 100% !important;
        }
        .aspek-checkbox-label {
          font-size: 0.92rem !important;
          padding: 2px 0 !important;
        }
        .aspek-input-col {
          width: 100% !important;
        }
        .aspek-catatan-input {
          width: 100% !important;
          font-size: 16px !important;
          padding: 8px 12px !important;
        }

        /* Grid Kolom Form: 1 Kolom di Smartphone */
        .grid-2col {
          grid-template-columns: 1fr !important;
          gap: 0.75rem !important;
        }

        /* Font input form mobile agar tidak auto-zoom di iOS/Android */
        .modal-wawancara-body input,
        .modal-wawancara-body select,
        .modal-wawancara-body textarea {
          font-size: 16px !important;
        }

        /* MODAL PREVIEW ANEKDOTAL RECORD SMARTPHONE */
        #modal-cetak-anekdotal .modal-wawancara-content {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 95vh !important;
          max-height: 95vh !important;
          border-radius: 18px 18px 0 0 !important;
          margin: 0 !important;
        }
        #modal-cetak-anekdotal .modal-wawancara-body {
          padding: 6px !important;
          overflow: auto !important;
          -webkit-overflow-scrolling: touch;
          background: #64748b !important;
        }
        #anekdotal-modal-preview-wrapper {
          max-width: none !important;
          width: max-content !important;
          margin: 0 auto !important;
        }
        .anekdotal-paper-sheet {
          min-width: 580px !important;
          padding: 10mm 8mm !important;
        }
      }

      /* Breakpoint Smartphone Kecil (360px - 400px) */
      @media (max-width: 400px) {
        .stats-grid-wawancara {
          grid-template-columns: 1fr !important;
        }
        .wawancara-header h2 {
          font-size: 1.05rem !important;
        }
      }
    
      /* Styling Dokumen Anekdotal Record (A4 Portrait) */
      .anekdotal-paper-sheet {
        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
        color: #111827;
        background: #ffffff;
        padding: 20mm 18mm 18mm 18mm;
        box-sizing: border-box;
        line-height: 1.4;
        font-size: 10pt;
      }
      .anekdotal-kop {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 6px;
      }
      .kop-emblem-box {
        flex: 0 0 65px;
        text-align: center;
      }
      .kop-logo-symbol {
        font-size: 2.8rem;
        line-height: 1;
        color: #006837;
      }
      .kop-text-box {
        flex: 1;
        text-align: center;
      }
      .kop-line-1 {
        font-size: 8.5pt;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0f172a;
      }
      .kop-line-2 {
        font-size: 9pt;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0f172a;
      }
      .kop-line-sekolah {
        font-size: 15pt;
        font-weight: 900;
        color: #006837;
        letter-spacing: 1px;
        margin: 2px 0;
      }
      .kop-line-akreditasi {
        font-size: 8pt;
        font-weight: 800;
        color: #334155;
      }
      .kop-line-alamat {
        font-size: 7.5pt;
        color: #475569;
        margin-top: 1px;
      }
      .kop-line-kontak {
        font-size: 7.5pt;
        color: #0284c7;
      }
      .kop-border-double {
        border-top: 2.5px solid #006837;
        border-bottom: 1px solid #006837;
        height: 3px;
        margin-bottom: 12px;
      }
      .anekdotal-title-box {
        text-align: center;
        margin-bottom: 12px;
      }
      .anekdotal-main-title {
        font-size: 13pt;
        font-weight: 900;
        letter-spacing: 1px;
        color: #0f172a;
        margin: 0;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .anekdotal-sub-title {
        font-size: 8pt;
        font-weight: 700;
        color: #475569;
        margin-top: 3px;
        letter-spacing: 0.5px;
      }
      .anekdotal-doc-id {
        font-size: 7pt;
        font-family: monospace;
        color: #64748b;
        margin-top: 2px;
      }
      .anekdotal-section {
        margin-bottom: 9px;
      }
      .section-heading {
        font-size: 8.5pt;
        font-weight: 800;
        color: #006837;
        background: #f0fdf4;
        border-left: 3.5px solid #006837;
        padding: 3px 8px;
        margin-bottom: 5px;
        letter-spacing: 0.3px;
      }
      .anekdotal-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8.5pt;
      }
      .anekdotal-table td {
        padding: 2.5px 6px;
        vertical-align: top;
      }
      .col-label {
        color: #334155;
        font-weight: 600;
      }
      .col-sep {
        width: 10px;
        text-align: center;
      }
      .col-val {
        color: #0f172a;
      }
      .anekdotal-badge-metode, .anekdotal-badge-tes {
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 7.5pt;
        font-weight: 700;
      }
      .badge-daring { background: #e0f2fe; color: #0369a1; }
      .badge-luring { background: #dcfce7; color: #15803d; }
      .badge-tes-sudah { background: #dcfce7; color: #15803d; }
      .badge-tes-belum { background: #fef3c7; color: #b45309; }
      .anekdotal-table-grid {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
        margin-top: 3px;
      }
      .anekdotal-table-grid th,
      .anekdotal-table-grid td {
        border: 1px solid #cbd5e1;
        padding: 4px 8px;
        vertical-align: top;
      }
      .anekdotal-table-grid th {
        background: #f8fafc;
        font-weight: 800;
        color: #0f172a;
      }
      .badge-aspek-teramati {
        background: #dcfce7;
        color: #166534;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
        font-size: 7pt;
      }
      .badge-aspek-belum {
        background: #f1f5f9;
        color: #64748b;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 7pt;
        font-style: italic;
      }
      .rekomendasi-container {
        display: flex;
        gap: 10px;
        align-items: stretch;
      }
      .rekomendasi-badge-box {
        flex: 0 0 185px;
        padding: 8px 12px;
        border-radius: 6px;
        text-align: center;
      }
      .badge-rec-layak {
        background: #dcfce7;
        color: #15803d;
        border: 1.5px solid #86efac;
      }
      .badge-rec-cadangan {
        background: #fef3c7;
        color: #b45309;
        border: 1.5px solid #fde68a;
      }
      .badge-rec-tidak-layak {
        background: #fee2e2;
        color: #b91c1c;
        border: 1.5px solid #fca5a5;
      }
      .rekomendasi-note-box {
        flex: 1;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 8pt;
      }
      .pendampingan-box {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 12px;
        min-height: 44px;
      }
      .formal-ruled-line {
        border-bottom: 1px dotted #94a3b8;
        height: 16px;
      }
      .tanda-tangan-table {
        width: 100%;
        border-collapse: collapse;
      }
      .ttd-jabatan {
        font-size: 8pt;
        color: #334155;
        min-height: 24px;
      }
      .ttd-space {
        height: 48px;
      }
      .ttd-nama {
        font-size: 8.5pt;
        color: #0f172a;
        text-decoration: underline;
      }
      .ttd-nip {
        font-size: 7pt;
        color: #64748b;
        margin-top: 1px;
      }
      .anekdotal-doc-footer {
        margin-top: 8px;
        padding-top: 5px;
        border-top: 1px solid #cbd5e1;
        font-size: 6.8pt;
        color: #64748b;
        display: flex;
        justify-content: space-between;
      }

      /* CSS Khusus Cetak A4 Portrait @media print */
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm 14mm 10mm 14mm;
        }
        body * {
          visibility: hidden !important;
        }
        #anekdotal-print-mount,
        #anekdotal-print-mount * {
          visibility: visible !important;
        }
        #anekdotal-print-mount {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          z-index: 99999999 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .anekdotal-paper-sheet {
          padding: 0 !important;
          width: 100% !important;
        }
        .no-print {
          display: none !important;
        }
      }

    </style>

    <div class="wawancara-layout-wrapper ${isSidebarOpen ? '' : 'sidebar-collapsed'}" id="wawancara-layout-wrapper">
      <!-- Mobile Backdrop untuk Drawer Smartphone -->
      <div class="wawancara-sidebar-backdrop" id="wawancara-sidebar-backdrop"></div>

      <!-- 1. SIDEBAR NAVBAR (DESKTOP FIXED & SMARTPHONE OFF-CANVAS DRAWER) -->
      <aside class="wawancara-sidebar ${isSidebarOpen ? '' : 'collapsed'}" id="wawancara-sidebar">
        <!-- Top Bar Toggle & Mobile Close Button -->
        <div class="sidebar-top-bar">
          <button type="button" id="btn-toggle-sidebar" class="sidebar-hamburger-btn" title="${isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}" aria-label="Toggle Sidebar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span class="sidebar-collapse-label">${isSidebarOpen ? 'Tutup Menu' : ''}</span>
          <button type="button" id="btn-close-mobile-sidebar" class="btn-close-mobile-sidebar" aria-label="Tutup Menu Mobile">&times;</button>
        </div>

        <!-- Logo SMA Card (Kotak Rounded Gelap Sesuai Mockup) -->
        <div class="sidebar-brand-container">
          <div class="sidebar-logo-card">
            <div class="sidebar-logo-icon">🏫</div>
            <div class="sidebar-logo-text">Logo SMA</div>
          </div>
          <div class="sidebar-title-group">
            <h3 class="sidebar-portal-title">Portal SPMB</h3>
            <p class="sidebar-portal-subtitle">Dashboard Wawancara Pendaftaran</p>
          </div>
        </div>

        <!-- Menu Navigasi Vertikal (Pill Buttons Sesuai Mockup) -->
        <nav class="sidebar-nav-menu">
          <button type="button" class="sidebar-nav-btn ${activeNavSection === 'DASHBOARD' ? 'active' : ''}" id="side-nav-dashboard" title="Dashboard Ringkasan">
            <span class="side-nav-icon">📊</span>
            <span class="side-nav-text">Dashboard</span>
          </button>
          <button type="button" class="sidebar-nav-btn ${activeNavSection === 'JADWAL' ? 'active' : ''}" id="side-nav-jadwal" title="Jadwal Wawancara">
            <span class="side-nav-icon">📅</span>
            <span class="side-nav-text">Jadwal Wawancara</span>
          </button>
          <button type="button" class="sidebar-nav-btn ${activeNavSection === 'PENILAIAN' ? 'active' : ''}" id="side-nav-penilaian" title="Penilaian & Rekapitulasi">
            <span class="side-nav-icon">📋</span>
            <span class="side-nav-text">Penilaian</span>
          </button>
          <button type="button" class="sidebar-nav-btn ${activeNavSection === 'PEWAWANCARA' ? 'active' : ''}" id="side-nav-pewawancara" title="Kelola Tim Pewawancara">
            <span class="side-nav-icon">👥</span>
            <span class="side-nav-text">Kelola Pewawancara</span>
          </button>
          <button class="side-nav-item ${activeSubTab === 'PENGINGAT' ? 'active' : ''}" id="side-nav-pengingat" title="Pengingat Wawancara H-1">
            <span class="side-nav-icon">📢</span>
            <span class="side-nav-text">Pengingat H-1</span>
          </button>
          <button type="button" class="sidebar-nav-btn ${activeNavSection === 'LAPORAN' ? 'active' : ''}" id="side-nav-laporan" title="Laporan & Cetak">
            <span class="side-nav-icon">🖨️</span>
            <span class="side-nav-text">Laporan</span>
          </button>
        </nav>

        <!-- Sidebar Footer / Info Tim Penguji -->
        <div class="sidebar-team-info">
          <div class="team-info-badge">
            <div style="font-size: 0.72rem; color: #475569; font-weight: 700; text-transform: uppercase;">Pewawancara Bertugas</div>
            <div style="font-weight: 800; font-size: 0.82rem; color: #006837; margin-top: 2px;">
              ${activePewawancaraList.map(p => p.nama).join(' &bull; ')}
            </div>
          </div>
        </div>
      </aside>

      <!-- 2. MAIN WORKSPACE CONTENT AREA -->
      <main class="wawancara-main-area" id="wawancara-main-area">
        <!-- Mobile Topbar Header (Tampil di Layar Smartphone & Tablet <= 960px) -->
        <div class="wawancara-mobile-topbar" id="wawancara-mobile-topbar">
          <button type="button" id="btn-mobile-hamburger" class="btn-mobile-hamburger" aria-label="Buka Menu Navigasi Modul 04">
            <span style="font-size: 1.25rem; line-height: 1;">☰</span>
            <span style="font-size: 0.85rem; font-weight: 700;">Menu</span>
          </button>
          <div class="mobile-topbar-title">
            <strong style="color: #006837;">Modul 04 SPMB</strong>
            <span class="mobile-tab-pill" id="mobile-tab-indicator">Jadwal</span>
          </div>
          <div class="mobile-topbar-actions">
            <span class="badge ${isEditMode ? 'badge-success' : 'badge-secondary'}" style="font-size: 0.72rem; font-weight: 800;">
              ${isEditMode ? 'Editor' : 'Viewer'}
            </span>
          </div>
        </div>

        <!-- Reopen Bar (Tampil saat sidebar ditutup / collapse di Desktop) -->
        <div class="sidebar-collapsed-trigger-bar" id="sidebar-trigger-bar" style="display: ${isSidebarOpen ? 'none' : 'flex'};">
          <button type="button" id="btn-reopen-sidebar" class="btn-reopen-pill" title="Buka Sidebar Navigasi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>Buka Menu Sidebar</span>
          </button>
          <span style="font-size: 0.82rem; font-weight: 700; color: #006837;">SMA Muhammadiyah 3 Yogyakarta &bull; Modul 04 Wawancara</span>
        </div>

        <!-- Banner Modul -->
        <div class="wawancara-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
        <div style="flex: 1; min-width: 280px;">
          <h2>🗣️ Modul 04: Penilaian Wawancara & Pemetaan Jurusan</h2>
          <p>Sistem jadwal mewawancarai calon siswa (Tabel Jadwal & Kalender Jadwal), penugasan pewawancara (Yosa & Veli), evaluasi nilai, dan pemetaan peminatan SSoT SPMB SMA Muhammadiyah 3 Yogyakarta.</p>
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
          🔒 <strong>Mode Akses Terbatas (Non-Editing / Read-Only):</strong> Anda sedang melihat modul sebagai Viewer. Pengisian nilai wawancara dinonaktifkan.
        </div>
      ` : ''}
    </div>

    <!-- Sub-Navigasi Tab Modul 04 -->
    <div class="wawancara-subtabs">
      <button id="btn-subtab-jadwal" class="wawancara-subtab-btn ${activeSubTab === 'JADWAL' ? 'active' : ''}">
        📅 1. Jadwal Wawancara (Tabel Jadwal & Kalender)
      </button>
      <button id="btn-subtab-eval" class="wawancara-subtab-btn ${activeSubTab === 'EVAL' ? 'active' : ''}">
        📋 2. Penilaian & Rekapitulasi Wawancara
      </button>
      <button id="btn-subtab-pewawancara" class="wawancara-subtab-btn ${activeSubTab === 'PEWAWANCARA' ? 'active' : ''}">
        👥 3. Kelola Pewawancara ${isEditMode ? '<span style="background: #dcfce7; color: #166534; font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; margin-left: 6px; font-weight: 800;">Mode Editor</span>' : '<span style="background: #f1f5f9; color: #64748b; font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; margin-left: 6px;">Viewer</span>'}
      </button>
      <button id="btn-subtab-pengingat" class="wawancara-subtab-btn ${activeSubTab === 'PENGINGAT' ? 'active' : ''}">
        📢 4. Pengingat H-1 Wawancara
      </button>
    </div>

    <!-- TAMPILAN TAB 1: TABEL JADWAL & KALENDER JADWAL WAWANCARA -->
    <div id="view-container-jadwal" style="display: ${activeSubTab === 'JADWAL' ? 'block' : 'none'};">
      <div class="jadwal-card-container" id="jadwal-printable-area">
        <!-- Header Resmi Tabel Jadwal -->
        <div class="jadwal-header-band">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="jadwal-badge-icon">M3</div>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.5px;">TABEL JADWAL WAWANCARA CALON SISWA</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.82rem; opacity: 0.95;">
                SMA Muhammadiyah 3 Yogyakarta &bull; SPMB T.A 2026/2027 &bull; Tim Pewawancara Resmi: <strong>${activePewawancaraList.map(p => p.nama).join('</strong> & <strong>')}</strong>
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button id="btn-print-jadwal" class="btn" style="background: #ffffff; color: #004d28; font-weight: 700; font-size: 0.82rem; border: none; padding: 7px 15px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              🖨️ Cetak Tabel Jadwal
            </button>
            <button id="btn-jadwal-refresh" class="btn" style="background: rgba(255,255,255,0.2); color: #ffffff; font-weight: 700; font-size: 0.82rem; border: 1px solid rgba(255,255,255,0.4); padding: 7px 12px; border-radius: 8px; cursor: pointer;">
              ⚡ Sync SSoT
            </button>
          </div>
        </div>

        <!-- Aturan Jam Layanan Banner & Tim Penguji -->
        <div class="jadwal-rules-banner">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 1.15rem;">⏱️</span>
            <div>
              <strong>Jam Layanan & Tim Pewawancara:</strong>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; align-items: center;">
                <span class="pill-rule-weekday">🟢 <strong>Hari Kerja:</strong> 08.00 - 15.00 WIB</span>
                <span class="pill-rule-weekend">🔵 <strong>Akhir Pekan:</strong> 09.00 - 15.00 WIB</span>
                ${activePewawancaraList.map(p => {
    const pCount = lunasCandidates.filter(c => (c.dataWawancara?.pewawancara || c.jadwal_wawancara?.pewawancara || '').toLowerCase().includes(p.nama.toLowerCase())).length;
    return renderPewawancaraBadge(p.nama) + `<span style="font-size:0.75rem; font-weight:700; color:#475569; margin-left:-2px; margin-right:4px;">(${pCount} Siswa)</span>`;
  }).join('')}
                <span class="badge-metode badge-metode-luring" style="padding: 2px 8px; font-size: 0.75rem;">🏢 Luring (${countLuring})</span>
                <span class="badge-metode badge-metode-daring" style="padding: 2px 8px; font-size: 0.75rem;">🌐 Daring (${countDaring})</span>
                <button id="btn-quick-manage-pewawancara" type="button" class="btn" style="background: #ffffff; color: #006837; font-weight: 800; font-size: 0.74rem; padding: 2px 9px; border-radius: 6px; border: 1.5px solid #006837; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                  ⚙️ Kelola Tim Pewawancara
                </button>
              </div>
            </div>
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #006837;">
            Total Terjadwal: ${totalLunas} Calon Siswa
          </div>
        </div>

        <!-- Controls & Filter Tabel Jadwal -->
        <div class="jadwal-controls-bar">
          <div class="search-box-w" style="max-width: 240px;">
            <span class="search-icon-w">🔍</span>
            <input type="text" id="jadwal-search" placeholder="Cari nama calon siswa..." value="${jadwalSearch}">
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <!-- Filter Pewawancara Dinamis -->
            <select id="jadwal-filter-pewawancara" class="form-control" style="width: auto; font-size: 0.82rem; font-weight: 700; border-color: #006837;">
              <option value="ALL" ${jadwalFilterPewawancara === 'ALL' ? 'selected' : ''}>👥 Semua Pewawancara</option>
              ${pewawancaraList.map(p => `
                <option value="${p.nama}" ${jadwalFilterPewawancara === p.nama ? 'selected' : ''}>
                  ${p.status === 'AKTIF' ? '👤' : '⚪'} Pewawancara: ${p.nama} (${p.gelar || p.peran || ''})
                </option>
              `).join('')}
            </select>

            <!-- Filter Metode (Luring / Daring) -->
            <select id="jadwal-filter-metode" class="form-control" style="width: auto; font-size: 0.82rem; font-weight: 700; border-color: #0284c7;">
              <option value="ALL" ${jadwalFilterMetode === 'ALL' ? 'selected' : ''}>🌐 Semua Metode (Luring & Daring)</option>
              <option value="LURING" ${jadwalFilterMetode === 'LURING' ? 'selected' : ''}>🏢 Wawancara Luring (Tatap Muka)</option>
              <option value="DARING" ${jadwalFilterMetode === 'DARING' ? 'selected' : ''}>🌐 Wawancara Daring (Online)</option>
            </select>

            <!-- Filter Hari -->
            <select id="jadwal-filter-hari" class="form-control" style="width: auto; font-size: 0.82rem;">
              <option value="ALL" ${jadwalFilterHari === 'ALL' ? 'selected' : ''}>Semua Hari (Senin - Minggu)</option>
              <option value="WEEKDAY" ${jadwalFilterHari === 'WEEKDAY' ? 'selected' : ''}>📅 Weekday (Senin - Jumat: 08.00-15.00)</option>
              <option value="WEEKEND" ${jadwalFilterHari === 'WEEKEND' ? 'selected' : ''}>🏖️ Weekend (Sabtu - Minggu: 09.00-15.00)</option>
              <option value="Senin" ${jadwalFilterHari === 'Senin' ? 'selected' : ''}>Senin</option>
              <option value="Selasa" ${jadwalFilterHari === 'Selasa' ? 'selected' : ''}>Selasa</option>
              <option value="Rabu" ${jadwalFilterHari === 'Rabu' ? 'selected' : ''}>Rabu</option>
              <option value="Kamis" ${jadwalFilterHari === 'Kamis' ? 'selected' : ''}>Kamis</option>
              <option value="Jumat" ${jadwalFilterHari === 'Jumat' ? 'selected' : ''}>Jumat</option>
              <option value="Sabtu" ${jadwalFilterHari === 'Sabtu' ? 'selected' : ''}>Sabtu</option>
              <option value="Minggu" ${jadwalFilterHari === 'Minggu' ? 'selected' : ''}>Minggu</option>
            </select>

            <!-- Filter Jam -->
            <select id="jadwal-filter-jam" class="form-control" style="width: auto; font-size: 0.82rem;">
              <option value="ALL" ${jadwalFilterJam === 'ALL' ? 'selected' : ''}>Semua Jam Sesi</option>
              <option value="08:00" ${jadwalFilterJam === '08:00' ? 'selected' : ''}>08.00 - 09.00 WIB (Weekday)</option>
              <option value="09:00" ${jadwalFilterJam === '09:00' ? 'selected' : ''}>09.00 - 10.00 WIB</option>
              <option value="10:00" ${jadwalFilterJam === '10:00' ? 'selected' : ''}>10.00 - 11.00 WIB</option>
              <option value="11:00" ${jadwalFilterJam === '11:00' ? 'selected' : ''}>11.00 - 12.00 WIB</option>
              <option value="13:00" ${jadwalFilterJam === '13:00' ? 'selected' : ''}>13.00 - 14.00 WIB</option>
              <option value="14:00" ${jadwalFilterJam === '14:00' ? 'selected' : ''}>14.00 - 15.00 WIB</option>
            </select>

            <!-- Filter Status -->
            <select id="jadwal-filter-status" class="form-control" style="width: auto; font-size: 0.82rem;">
              <option value="ALL" ${jadwalFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
              <option value="BELUM" ${jadwalFilterStatus === 'BELUM' ? 'selected' : ''}>⏳ Belum Wawancara</option>
              <option value="SELESAI" ${jadwalFilterStatus === 'SELESAI' ? 'selected' : ''}>✅ Sudah Selesai</option>
            </select>

            <!-- Switch Mode: Tabel Jadwal vs Kalender Jadwal -->
            <div style="display: inline-flex; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
              <button id="btn-jadwal-mode-table" class="jadwal-toggle-btn ${jadwalViewMode === 'TABLE' ? 'active' : ''}">📋 Tabel Jadwal</button>
              <button id="btn-jadwal-mode-grid" class="jadwal-toggle-btn ${jadwalViewMode === 'CALENDAR' ? 'active' : ''}">🗓️ Kalender Jadwal</button>
            </div>
          </div>
        </div>

        <!-- Viewport Tabel Jadwal / Kalender Jadwal Body -->
        <div id="jadwal-content-viewport">
          <!-- Diisi via renderJadwalViewport() -->
        </div>

        <!-- Footer Pengesahan Tabel Jadwal -->
        <div class="jadwal-footer-sheet">
          <div>
            <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase;">Divisi Penguji & Pewawancara Bertugas:</div>
            <strong style="color: #0f172a;">${activePewawancaraList.map(p => p.nama_lengkap || p.nama).join(' & ')} (SPMB SMA Muhammadiyah 3 Yogyakarta)</strong>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase;">Status Dokumen:</div>
            <strong style="color: #006837;">RESMI &bull; TERINTEGRASI SSoT KELULUSAN</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- TAMPILAN TAB 2: PENILAIAN & REKAPITULASI WAWANCARA (TABEL LENGKAP) -->
    <div id="view-container-eval" style="display: ${activeSubTab === 'EVAL' ? 'block' : 'none'};">
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

      <!-- Main Evaluation Table Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 Rekapitulasi Skor & Evaluasi Wawancara Peserta</h3>
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
                  <th>Nama Calon Siswa</th>
                  <th>Asal Sekolah</th>
                  <th>Jalur / Jurusan</th>
                  <th>Metode</th>
                  <th>Pewawancara</th>
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
    </div>

    <!-- TAMPILAN TAB 3: KELOLA PEWAWANCARA (EDITOR) -->
    <div id="view-container-pewawancara" style="display: ${activeSubTab === 'PEWAWANCARA' ? 'block' : 'none'};">
      <!-- Header Banner Manajemen Pewawancara -->
      <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; margin-bottom: 1.25rem; box-shadow: 0 4px 14px rgba(6, 78, 59, 0.15); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div style="flex: 1; min-width: 280px;">
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            👥 Manajemen Tim Pewawancara & Penguji SPMB
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.92;">
            Daftar resmi penguji wawancara SMA Muhammadiyah 3 Yogyakarta. Penambahan atau pengeditan pewawancara langsung otomatis tersinkronisasi ke Tabel Jadwal, Kalender, Filter, dan Form Penilaian Siswa.
          </p>
        </div>
        <div>
          ${isEditMode ? `
            <button id="btn-open-modal-tambah-pewawancara" type="button" class="btn" style="background: #ffffff; color: #064e3b; font-weight: 800; font-size: 0.88rem; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
              ➕ Tambah Pewawancara Baru
            </button>
          ` : `
            <div style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); padding: 8px 16px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              🔒 Mode Viewer (Ganti ke Mode Editor untuk Menambah/Mengedit)
            </div>
          `}
        </div>
      </div>

      <!-- Notice Akses Editor jika Viewer -->
      ${!isEditMode ? `
        <div style="background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          🔒 <strong>Mode Viewer (Read-Only):</strong> Anda sedang melihat data pewawancara sebagai peninjau. Untuk menambah atau mengedit nama pewawancara, silakan pilih <strong>"✏️ Pewawancara (Mode Editor)"</strong> pada bilah mode hak akses di kanan atas.
        </div>
      ` : `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 14px; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          ✏️ <strong>Mode Editor Aktif:</strong> Anda dapat menambah pewawancara baru, mengubah nama/gelar, mengedit spesialisasi peran dan ruangan default, atau mengaktifkan/menonaktifkan penguji.
        </div>
      `}

      <!-- Stats Grid Pewawancara -->
      <div class="stats-grid-wawancara">
        <div class="stat-card-w">
          <div class="stat-icon-w" style="background: #e0f2fe; color: #0284c7;">👥</div>
          <div>
            <div class="stat-val-w" id="stat-total-pewawancara">${pewawancaraList.length}</div>
            <div class="stat-lbl-w">Total Pewawancara Terdaftar</div>
          </div>
        </div>
        <div class="stat-card-w">
          <div class="stat-icon-w" style="background: #dcfce7; color: #16a34a;">🟢</div>
          <div>
            <div class="stat-val-w" id="stat-aktif-pewawancara">${activePewawancaraList.length}</div>
            <div class="stat-lbl-w">Pewawancara Aktif Bertugas</div>
          </div>
        </div>
        <div class="stat-card-w">
          <div class="stat-icon-w" style="background: #f1f5f9; color: #64748b;">⚪</div>
          <div>
            <div class="stat-val-w" id="stat-nonaktif-pewawancara">${inactivePewawancaraList.length}</div>
            <div class="stat-lbl-w">Pewawancara Nonaktif</div>
          </div>
        </div>
        <div class="stat-card-w">
          <div class="stat-icon-w" style="background: #fef3c7; color: #d97706;">🎓</div>
          <div>
            <div class="stat-val-w">${totalLunas}</div>
            <div class="stat-lbl-w">Total Calon Siswa Terjadwal</div>
          </div>
        </div>
      </div>

      <!-- Card Table Pewawancara -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 class="card-title">📋 Daftar Tim Pewawancara & Penguji SPMB</h3>
            <span style="font-size: 0.8rem; color: #64748b;">Data tersimpan di LocalStorage & tersinkronisasi SSoT SPMB SMA Muhammadiyah 3</span>
          </div>
          <span class="badge badge-info" id="badge-siap-bertugas">${activePewawancaraList.length} Penguji Aktif Siap</span>
        </div>
        <div class="card-body">
          <!-- Toolbar Filter Pewawancara -->
          <div class="filter-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1rem;">
            <div class="search-box-w" style="max-width: 320px;">
              <span class="search-icon-w">🔍</span>
              <input type="text" id="pewawancara-search" placeholder="Cari nama, gelar, peran, atau ruangan..." value="${pewawancaraSearch}">
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select id="pewawancara-filter-status" class="form-control" style="width: auto; font-size: 0.85rem; font-weight: 700;">
                <option value="ALL" ${pewawancaraFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status (Aktif & Nonaktif)</option>
                <option value="AKTIF" ${pewawancaraFilterStatus === 'AKTIF' ? 'selected' : ''}>🟢 Hanya Aktif</option>
                <option value="NONAKTIF" ${pewawancaraFilterStatus === 'NONAKTIF' ? 'selected' : ''}>⚪ Hanya Nonaktif</option>
              </select>
            </div>
          </div>

          <!-- Tabel Pewawancara -->
          <div class="table-responsive">
            <table class="table" id="table-pewawancara">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">No</th>
                  <th>Pewawancara (Nama & Gelar)</th>
                  <th>Nama Panggilan & ID</th>
                  <th>Peran / Bidang Penguji</th>
                  <th>Ruang & Lokasi Default</th>
                  <th style="text-align: center;">Siswa Terjadwal</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: center; width: 200px;">Aksi</th>
                </tr>
              </thead>
              <tbody id="pewawancara-tbody">
                <!-- Diisi via renderPewawancaraTable() -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  
    <!-- TAMPILAN TAB 4: PENGINGAT OTOMATIS H-1 JADWAL WAWANCARA -->
    <div id="view-container-pengingat" style="display: ${activeSubTab === 'PENGINGAT' ? 'block' : 'none'};">
      <!-- Header Banner Pengingat H-1 -->
      <div style="background: linear-gradient(135deg, #064e3b 0%, #006837 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; margin-bottom: 1.25rem; box-shadow: 0 4px 14px rgba(6, 78, 59, 0.15); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div style="flex: 1; min-width: 280px;">
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            📢 Sistem Pengingat Otomatis H-1 Jadwal Wawancara
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.92;">
            Mengingatkan calon siswa dan orang tua/wali 1 hari sebelum wawancara (pukul 08:00 WIB, Asia/Jakarta) via WhatsApp & Email.
          </p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700;">
            🤖 Otomatis H-1 (08:00 WIB): Aktif
          </span>
          <span style="background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 800;">
            ✅ WhatsApp & Email: Aktif
          </span>
        </div>
      </div>

      <!-- Info Box Transparansi Sistem -->
      <div style="background: #f0fdf4; border-left: 4px solid #006837; border-radius: 6px; padding: 12px 16px; margin-bottom: 1.25rem; font-size: 0.84rem; color: #166534; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 1.25rem; line-height: 1;">ℹ️</span>
        <div style="flex: 1;">
          <strong>Alur Pengiriman Pengingat H-1 Otomatis & Manual:</strong>
          Pesan pengingat jadwal wawancara dikirimkan secara <strong>otomatis pada H-1 pukul 08:00 WIB</strong> melalui WhatsApp dan Email kepada calon siswa beserta orang tua/wali. Admin juga dapat melihat <em>Preview Pesan</em> atau menekan tombol <strong>Kirim Ulang</strong> untuk mengirim ulang pengingat secara manual kapan saja.
        </div>
      </div>

      <!-- Stat Cards Pengingat -->
      <div id="reminder-stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
        <!-- Diisi dinamis via renderPengingatViewport() -->
      </div>

      <!-- Main Reminder Card -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
              📋 Antrean & Rekapitulasi Pengingat Wawancara H-1
            </h3>
            <span style="font-size: 0.78rem; color: #64748b;">Terintegrasi dengan jadwal wawancara Single Source of Truth</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-refresh-reminders" class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 12px; font-weight: 700;">
              🔄 Sinkronkan Data
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Filter Bar Pengingat -->
          <div class="filter-bar" style="margin-bottom: 1rem; display: flex; gap: 10px; flex-wrap: wrap;">
            <div class="search-box-w" style="flex: 1; min-width: 240px;">
              <span class="search-icon-w">🔍</span>
              <input type="text" id="reminder-search" placeholder="Cari nama atau No. Registrasi..." value="${reminderSearch}">
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <select id="reminder-filter-status" class="form-control" style="width: auto; font-size: 0.84rem;">
                <option value="ALL" ${reminderFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status Pengingat</option>
                <option value="MENUNGGU" ${reminderFilterStatus === 'MENUNGGU' ? 'selected' : ''}>⏳ Menunggu Pengiriman</option>
                <option value="BERHASIL" ${reminderFilterStatus === 'BERHASIL' ? 'selected' : ''}>✅ Berhasil Dikirim</option>
                <option value="GAGAL" ${reminderFilterStatus === 'GAGAL' ? 'selected' : ''}>❌ Gagal Dikirim</option>
                <option value="DIBATALKAN" ${reminderFilterStatus === 'DIBATALKAN' ? 'selected' : ''}>🚫 Dibatalkan / Selesai</option>
              </select>
              <select id="reminder-filter-media" class="form-control" style="width: auto; font-size: 0.84rem;">
                <option value="ALL" ${reminderFilterMedia === 'ALL' ? 'selected' : ''}>Semua Media (WA & Email)</option>
                <option value="WA" ${reminderFilterMedia === 'WA' ? 'selected' : ''}>💬 WhatsApp</option>
                <option value="EMAIL" ${reminderFilterMedia === 'EMAIL' ? 'selected' : ''}>✉️ Email</option>
              </select>
            </div>
          </div>

          <!-- Viewport Tabel Pengingat -->
          <div id="reminder-content-viewport">
            <!-- Diisi via renderPengingatViewport() -->
          </div>
        </div>
      </div>
    </div>

  </main>
</div> <!-- end .wawancara-layout-wrapper -->

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
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 12px; margin-bottom: 0.55rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">NAMA CALON SISWA</div>
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
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">METODE & RUANG</div>
                <div id="modal-candidate-metode-ruang" style="font-weight: 700; font-size: 0.85rem; margin-top: 2px;">-</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">PEWAWANCARA BERTUGAS</div>
                <select id="modal-candidate-pewawancara" class="form-control" style="font-weight: 800; font-size: 0.85rem; padding: 3px 8px; width: auto; color: #006837;">
                  <option value="Yosa">👨‍🏫 Yosa</option>
                  <option value="Veli">👩‍🏫 Veli</option>
                </select>
              </div>
            </div>

            <div class="modal-main-grid"><div class="modal-col-left"><div class="modal-section-card"><!-- Section 1: Nilai Wawancara Siswa -->
            <div class="form-section-title">👤 1. Penilaian Wawancara Siswa</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-nilai-siswa">Nilai Wawancara Siswa (0-100) <span style="color:red">*</span></label>
                <input type="number" id="wawancara-nilai-siswa" class="form-control" min="0" max="100" placeholder="Contoh: 85" required>
              </div>
              <div class="form-group">
                <label for="wawancara-catatan-siswa">Catatan & Profil Siswa</label>
                <textarea id="wawancara-catatan-siswa" class="form-control" rows="1" placeholder="Catatan keaktifan, kepribadian, kepemimpinan..."></textarea>
              </div>
            </div>

            </div><div class="modal-section-card"><!-- Section 2: Nilai Wawancara Orang Tua / Wali -->
            <div class="form-section-title">👨‍👩‍👧 2. Penilaian Wawancara Orang Tua / Wali</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-nilai-wali">Nilai Wawancara Wali (0-100) <span style="color:red">*</span></label>
                <input type="number" id="wawancara-nilai-wali" class="form-control" min="0" max="100" placeholder="Contoh: 88" required>
              </div>
              <div class="form-group">
                <label for="wawancara-catatan-wali">Catatan & Kesiapan Wali</label>
                <textarea id="wawancara-catatan-wali" class="form-control" rows="1" placeholder="Dukungan orang tua, komitmen tata tertib..."></textarea>
              </div>
            </div>

            </div><div class="modal-section-card"><!-- Section 3: Aspek Penilaian Wawancara -->
            <div class="form-section-title">📋 3. Aspek Penilaian Wawancara</div>
            <div class="form-group">
              <label style="display: block; font-size: 0.84rem; color: #475569; font-weight: 600; margin-bottom: 8px;">Centang aspek yang dinilai dan berikan catatan hasil observasi untuk masing-masing aspek (bisa memilih lebih dari satu):</label>
              <div class="aspek-penilaian-container">
                <!-- 1. Kepribadian -->
                <div class="aspek-item" id="aspek-item-kepribadian">
                  <div class="aspek-label-col">
                    <label class="aspek-checkbox-label" for="aspek-cb-kepribadian">
                      <input type="checkbox" name="aspek_penilaian" class="aspek-checkbox" id="aspek-cb-kepribadian" value="Kepribadian">
                      <span>🧠 Kepribadian</span>
                    </label>
                  </div>
                  <div class="aspek-input-col">
                    <input type="text" class="form-control aspek-catatan-input" id="aspek-catatan-kepribadian" data-aspek="Kepribadian" placeholder="Catatan sikap, kedisiplinan, motivasi, & kemandirian siswa...">
                  </div>
                </div>

                <!-- 2. Bahasa & Komunikasi -->
                <div class="aspek-item" id="aspek-item-bahasa">
                  <div class="aspek-label-col">
                    <label class="aspek-checkbox-label" for="aspek-cb-bahasa">
                      <input type="checkbox" name="aspek_penilaian" class="aspek-checkbox" id="aspek-cb-bahasa" value="Bahasa & Komunikasi">
                      <span>🗣️ Bahasa & Komunikasi</span>
                    </label>
                  </div>
                  <div class="aspek-input-col">
                    <input type="text" class="form-control aspek-catatan-input" id="aspek-catatan-bahasa" data-aspek="Bahasa & Komunikasi" placeholder="Catatan kelancaran, tata bahasa, artikulasi, & daya tangkap...">
                  </div>
                </div>

                <!-- 3. Sosial -->
                <div class="aspek-item" id="aspek-item-sosial">
                  <div class="aspek-label-col">
                    <label class="aspek-checkbox-label" for="aspek-cb-sosial">
                      <input type="checkbox" name="aspek_penilaian" class="aspek-checkbox" id="aspek-cb-sosial" value="Sosial">
                      <span>🤝 Sosial</span>
                    </label>
                  </div>
                  <div class="aspek-input-col">
                    <input type="text" class="form-control aspek-catatan-input" id="aspek-catatan-sosial" data-aspek="Sosial" placeholder="Catatan adaptasi, empati, interaksi lingkungan, & kerja sama...">
                  </div>
                </div>

                <!-- 4. Bakat & Minat -->
                <div class="aspek-item" id="aspek-item-bakat-minat">
                  <div class="aspek-label-col">
                    <label class="aspek-checkbox-label" for="aspek-cb-bakat-minat">
                      <input type="checkbox" name="aspek_penilaian" class="aspek-checkbox" id="aspek-cb-bakat-minat" value="Bakat & Minat">
                      <span>🎨 Bakat & Minat</span>
                    </label>
                  </div>
                  <div class="aspek-input-col">
                    <input type="text" class="form-control aspek-catatan-input" id="aspek-catatan-bakat-minat" data-aspek="Bakat & Minat" placeholder="Catatan potensi akademik, seni, IT, olahraga, & minat studi...">
                  </div>
                </div>

                <!-- 5. Ibadah -->
                <div class="aspek-item" id="aspek-item-ibadah">
                  <div class="aspek-label-col">
                    <label class="aspek-checkbox-label" for="aspek-cb-ibadah">
                      <input type="checkbox" name="aspek_penilaian" class="aspek-checkbox" id="aspek-cb-ibadah" value="Ibadah">
                      <span>🕌 Ibadah</span>
                    </label>
                  </div>
                  <div class="aspek-input-col">
                    <input type="text" class="form-control aspek-catatan-input" id="aspek-catatan-ibadah" data-aspek="Ibadah" placeholder="Catatan kebiasaan ibadah sholat, baca Al-Qur'an, & komitmen keislaman...">
                  </div>
                </div>
              </div>
            </div>

            </div></div><div class="modal-col-right"><div class="modal-section-card"><!-- Section 4: Hafalan Qur'an & Rekomendasi Beasiswa Tahfidz -->
            <div class="form-section-title">📖 4. Tes Al-Qur'an & Rekomendasi Beasiswa Tahfidz</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-status-tes-quran">Status Tes Al-Qur'an <span style="color:red">*</span></label>
                <select id="wawancara-status-tes-quran" class="form-control" style="font-weight: 700;">
                  <option value="Belum Dites">⏳ Belum Dites</option>
                  <option value="Sudah Dites">✅ Sudah Dites</option>
                </select>
                <div style="font-size: 0.78rem; color: #64748b; margin-top: 6px; background: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px dashed #cbd5e1; display: inline-flex; align-items: center; gap: 6px;">
                  <span>📄 Hafalan dilaporkan pendaftar:</span>
                  <strong id="modal-hafalan-dilaporkan" style="color: #0284c7;">-</strong>
                </div>
              </div>
              <div class="form-group">
                <label for="wawancara-hafalan-teruji">Jumlah Hafalan yang Diuji (Juz) <span style="color: #64748b; font-weight: normal; font-size: 0.78rem;">(Hasil Tes Langsung)</span></label>
                <input type="number" id="wawancara-hafalan-teruji" class="form-control" min="0" max="30" step="0.5" value="0" placeholder="0 - 30 Juz" style="font-weight: 700;">
                <input type="hidden" id="wawancara-hafalan-juz" value="0">
                <small id="hafalan-input-hint" style="display: block; font-size: 0.73rem; color: #64748b; margin-top: 4px;">ℹ️ Ubah status menjadi "Sudah Dites" setelah selesai menguji calon siswa</small>
              </div>
            </div>
            <div class="form-group" style="margin-top: 10px;">
              <label>Rekomendasi Beasiswa Tahfidz (Dihitung Berdasarkan Hasil Tes):</label>
              <div class="beasiswa-preview-box beasiswa-box-menunggu_tes" id="beasiswa-preview-container">
                <span id="beasiswa-preview-icon" style="font-size: 1.3rem;">⏳</span>
                <div style="flex: 1;">
                  <div id="beasiswa-preview-text" style="font-weight: 700; font-size: 0.95rem;">Menunggu Tes Al-Qur'an</div>
                  <div id="beasiswa-preview-nominal" style="margin-top: 2px;">
                    <span style="color: #b45309; font-size: 0.78rem;">⏳ Hasil tes belum diuji. Rekomendasi beasiswa belum ditetapkan.</span>
                  </div>
                </div>
              </div>
            </div>

            </div><div class="modal-section-card"><!-- Section 5: Pelaksanaan Wawancara & Rekomendasi Kelulusan -->
            <div class="form-section-title">🎯 5. Pelaksanaan Wawancara & Rekomendasi Kelulusan</div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="wawancara-rekomendasi-akhir">Rekomendasi Wawancara untuk Modul Kelulusan <span style="color:red">*</span></label>
                <select id="wawancara-rekomendasi-akhir" class="form-control" required style="font-weight: 700; color: #006837;">
                  <option value="LAYAK">✅ LAYAK (Sangat Direkomendasikan Diterima)</option>
                  <option value="CADANGAN">⚠️ CADANGAN (Dipertimbangkan / Antrean Cadangan)</option>
                  <option value="TIDAK_LAYAK">❌ TIDAK LAYAK (Tidak Direkomendasikan)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="wawancara-metode-pelaksanaan">Metode Pelaksanaan Wawancara</label>
                <select id="wawancara-metode-pelaksanaan" class="form-control" style="font-weight: 700;">
                  <option value="Luring">🏢 Luring (Tatap Muka di Sekolah)</option>
                  <option value="Daring">🌐 Daring (Virtual Meet / Online)</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label for="wawancara-catatan-pendampingan">Catatan Pendampingan Siswa (Tindak Lanjut Guru BK & Wali Kelas)</label>
              <textarea id="wawancara-catatan-pendampingan" class="form-control" rows="1" placeholder="Catatan observasi kebutuhan pendampingan karakter, potensi akademik, peminatan bakat, atau konseling siswa..."></textarea>
            </div>

            <!-- Tautan Meeting & Ruangan Dinamis -->
            <div id="wrapper-metode-daring" style="display: none; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 10px; padding: 12px; margin-top: 10px;">
              <div class="grid-2col">
                <div class="form-group">
                  <label for="wawancara-platform">Platform Wawancara Daring</label>
                  <select id="wawancara-platform" class="form-control" style="font-weight: 700;">
                    <option value="Google Meet">📹 Google Meet</option>
                    <option value="Zoom">📹 Zoom Meeting</option>
                    <option value="Microsoft Teams">📹 Microsoft Teams</option>
                    <option value="Lainnya">🌐 Platform Online Lainnya</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="wawancara-link-meeting">Tautan / Link Meeting Wawancara</label>
                  <input type="url" id="wawancara-link-meeting" class="form-control" placeholder="https://meet.google.com/... atau https://zoom.us/j/...">
                  <small style="font-size: 0.72rem; color: #64748b; margin-top: 3px; display: block;">Kosongkan jika belum tersedia. Jangan membuat tautan palsu.</small>
                </div>
              </div>
            </div>

            <div id="wrapper-metode-luring" style="display: block; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 10px;">
              <div class="form-group">
                <label for="wawancara-ruang">Ruang & Lokasi Wawancara (Luring)</label>
                <input type="text" id="wawancara-ruang" class="form-control" placeholder="Contoh: Ruang Wawancara 1 (Gedung Utama)">
              </div>
            </div>

            <div class="grid-2col" style="margin-top: 10px;">
              <div class="form-group">
                <label for="wawancara-jadwal-tanggal">Tanggal Wawancara</label>
                <input type="date" id="wawancara-jadwal-tanggal" class="form-control" style="font-weight: 600;">
              </div>
              <div class="form-group">
                <label for="wawancara-jadwal-jam">Jam Sesi Wawancara</label>
                <input type="time" id="wawancara-jadwal-jam" class="form-control" style="font-weight: 600;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label for="wawancara-nama-pewawancara">Pewawancara yang Mengesahkan</label>
              <select id="wawancara-nama-pewawancara" class="form-control" style="font-weight: 700;">
                <option value="Yosa">👨‍🏫 Yosa, S.Pd</option>
                <option value="Veli">👩‍🏫 Veli, M.Pd</option>
              </select>
            </div>

          </div>

            </div></div></div>
          <div class="modal-footer modal-wawancara-footer" style="position: static; background: #ffffff; border-top: 2px solid #e2e8f0; padding: 0.65rem 1.25rem; display: flex; justify-content: flex-end; gap: 10px; z-index: 20;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal" style="background: #f1f5f9; color: #475569; padding: 10px 20px; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;">Tutup</button>
            <button type="button" class="btn btn-secondary" id="btn-modal-cetak-anekdotal" onclick="const cid = window.activeCandidateId || document.getElementById('modal-candidate-id')?.textContent?.trim(); if (cid) { window.openModalCetakAnekdotal(cid); } else { alert('Pilih calon siswa terlebih dahulu'); }" style="background: #f0fdf4; color: #166534; padding: 10px 16px; font-weight: 700; border: 1.5px solid #bbf7d0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              🖨️ Cetak Anekdotal Record
            </button>
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

    <!-- Modal Form Atur Jadwal & Tautan Wawancara -->
    <div class="modal-wawancara-overlay" id="modal-edit-jadwal" style="display: none;">
      <div class="modal-wawancara-content" style="max-width: 580px;">
        <div class="modal-wawancara-header" style="background: linear-gradient(135deg, #00562c 0%, #008344 100%);">
          <h3 id="modal-jadwal-title" style="margin: 0; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <span>📅</span> Atur Jadwal & Tautan Wawancara
          </h3>
          <button type="button" class="modal-close-btn" id="modal-jadwal-close" style="color: white; font-size: 1.5rem; background: transparent; border: none; cursor: pointer;">&times;</button>
        </div>
        <form id="form-edit-jadwal">
          <div class="modal-wawancara-body" style="padding: 1.25rem 1.4rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 1rem;">
              <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">CALON SISWA:</div>
              <strong id="modal-jadwal-candidate-name" style="font-size: 1rem; color: #006837;">-</strong>
              <div style="font-size: 0.78rem; color: #64748b;" id="modal-jadwal-candidate-info">-</div>
            </div>

            <div class="grid-2col">
              <div class="form-group">
                <label for="jadwal-edit-tanggal">Tanggal Wawancara <span style="color:red">*</span></label>
                <input type="date" id="jadwal-edit-tanggal" class="form-control" required style="font-weight: 700;">
              </div>
              <div class="form-group">
                <label for="jadwal-edit-jam">Jam Sesi Mulai <span style="color:red">*</span></label>
                <input type="time" id="jadwal-edit-jam" class="form-control" required style="font-weight: 700;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label for="jadwal-edit-metode">Metode Wawancara <span style="color:red">*</span></label>
              <select id="jadwal-edit-metode" class="form-control" style="font-weight: 700;">
                <option value="Luring">🏢 Luring (Tatap Muka di Sekolah)</option>
                <option value="Daring">🌐 Daring (Virtual Online)</option>
              </select>
            </div>

            <div id="jadwal-edit-daring-wrapper" style="display: none; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px; margin-top: 10px;">
              <div class="form-group">
                <label for="jadwal-edit-platform">Platform Wawancara Daring</label>
                <select id="jadwal-edit-platform" class="form-control" style="font-weight: 700;">
                  <option value="Google Meet">📹 Google Meet</option>
                  <option value="Zoom">📹 Zoom Meeting</option>
                  <option value="Microsoft Teams">📹 Microsoft Teams</option>
                  <option value="Lainnya">🌐 Platform Online Lainnya</option>
                </select>
              </div>
              <div class="form-group" style="margin-top: 10px;">
                <label for="jadwal-edit-link">Tautan / Link Meeting</label>
                <input type="url" id="jadwal-edit-link" class="form-control" placeholder="https://meet.google.com/... atau https://zoom.us/j/...">
                <small style="font-size: 0.72rem; color: #64748b; margin-top: 3px; display: block;">Kosongkan jika belum tersedia. Jangan membuat tautan palsu.</small>
              </div>
            </div>

            <div id="jadwal-edit-luring-wrapper" style="display: block; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 10px;">
              <div class="form-group">
                <label for="jadwal-edit-ruang">Ruang & Lokasi Wawancara (Luring)</label>
                <input type="text" id="jadwal-edit-ruang" class="form-control" placeholder="Ruang Wawancara 1 (Gedung Utama)">
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label for="jadwal-edit-pewawancara">Pewawancara Bertugas</label>
              <select id="jadwal-edit-pewawancara" class="form-control" style="font-weight: 700;">
              </select>
            </div>
          </div>

          <div class="modal-footer" style="padding: 1rem 1.4rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal-jadwal" style="padding: 8px 16px; border-radius: 6px;">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-jadwal-submit" style="padding: 8px 20px; background: #006837; color: #fff; font-weight: 700; border-radius: 6px; border: none; cursor: pointer;">💾 Simpan Jadwal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Preview Template Pesan Pengingat H-1 -->
    <div class="modal-wawancara-overlay" id="modal-preview-reminder" style="display: none;">
      <div class="modal-wawancara-content" style="max-width: 780px; max-height: none; overflow: visible; display: flex; flex-direction: column;">
        <div class="modal-wawancara-header" style="background: linear-gradient(135deg, #064e3b 0%, #006837 100%);">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
              📢 Preview Pesan Pengingat Jadwal Wawancara (H-1)
            </h3>
            <span id="preview-reminder-candidate-info" style="font-size: 0.78rem; opacity: 0.9; display: block; margin-top: 3px;">
              Memuat data calon siswa...
            </span>
          </div>
          <button type="button" class="modal-close-btn" id="modal-preview-reminder-close">&times;</button>
        </div>

        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0 16px; display: flex; gap: 8px;">
          <button type="button" id="tab-btn-preview-wa" class="preview-tab-btn active">
            💬 Pesan WhatsApp
          </button>
          <button type="button" id="tab-btn-preview-email" class="preview-tab-btn">
            ✉️ Email Resmi (HTML)
          </button>
        </div>

        <div class="modal-wawancara-body" style="padding: 1.25rem; overflow-y: auto; flex: 1;">
          <!-- Metadata Bar -->
          <div style="background: #f1f5f9; border-radius: 6px; padding: 10px 14px; margin-bottom: 1rem; font-size: 0.78rem; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Waktu Jadwal Kirim:</strong> <span id="preview-meta-jadwal-kirim">-</span></div>
            <div><strong>Status Pengingat:</strong> <span id="preview-meta-status">-</span></div>
            <div><strong>Metode Pengiriman:</strong> <span id="preview-meta-idempotency" style="font-weight: 700; color: #006837;">-</span></div>
            <div><strong>Target Kontak:</strong> <span id="preview-meta-kontak">-</span></div>
          </div>

          <!-- View Tab WhatsApp -->
          <div id="preview-body-wa" style="display: block;">
            <div class="whatsapp-bubble-box">
              <div style="font-size: 0.72rem; color: #54656f; margin-bottom: 6px; text-align: center;">
                Pesan WhatsApp Otomatis (Format Resmi SMA Muhammadiyah 3 Yogyakarta)
              </div>
              <div id="preview-wa-text" class="whatsapp-chat-bubble">
                <!-- Diisi via JS -->
              </div>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
              <button type="button" id="btn-copy-wa-text" class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 12px; font-weight: 700;">
                📋 Salin Teks WhatsApp
              </button>
            </div>
          </div>

          <!-- View Tab Email -->
          <div id="preview-body-email" style="display: none;">
            <div style="margin-bottom: 8px; font-size: 0.82rem; color: #475569;">
              <strong>Subjek Email:</strong> <span id="preview-email-subject" style="color: #0f172a; font-weight: 700;">-</span>
            </div>
            <div id="preview-email-html-container" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">
              <!-- Diisi via JS -->
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
              <button type="button" id="btn-copy-email-html" class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 12px; font-weight: 700;">
                📋 Salin HTML Email
              </button>
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.76rem; color: #64748b;">
            💡 Pesan terkirim otomatis pada H-1 pukul 08:00 WIB. Admin dapat kirim ulang manual kapan saja.
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-secondary" id="btn-resend-from-preview" onclick="if (window.activePreviewReminderCandidateId) window.handleTestReminderApi(window.activePreviewReminderCandidateId);" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700; background: #f0fdf4; color: #166534; border: 1.5px solid #bbf7d0; cursor: pointer;">
              🔄 Kirim Ulang Manual
            </button>
            <button type="button" class="btn btn-secondary" id="btn-close-modal-preview" style="font-size: 0.84rem; padding: 6px 16px; font-weight: 700;">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Cetak Dokumen Anekdotal Record Siswa -->
    <div class="modal-wawancara-overlay" id="modal-cetak-anekdotal" style="display: none; z-index: 10001;">
      <div class="modal-wawancara-content" style="max-width: 920px; max-height: none; overflow: visible; display: flex; flex-direction: column;">
        <div class="modal-wawancara-header" style="background: linear-gradient(135deg, #064e3b 0%, #006837 100%);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">📄</span>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800;">
                Anekdotal Record Siswa &mdash; SMA Muhammadiyah 3 Yogyakarta
              </h3>
              <span id="modal-anekdotal-candidate-title" style="font-size: 0.78rem; opacity: 0.92; display: block; margin-top: 2px;">
                Dokumen Resmi Hasil Wawancara & Observasi Guru BK
              </span>
            </div>
          </div>
          <button type="button" class="modal-close-btn no-print" id="modal-cetak-anekdotal-close" onclick="window.closeModalCetakAnekdotal()">&times;</button>
        </div>

        <!-- Toolbar Atas Modal (Tombol Print & Status) -->
        <div class="no-print" style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 0.82rem; color: #475569; display: flex; align-items: center; gap: 6px;">
            <span>💡</span> Dokumen otomatis diformat standar <strong>A4 Portrait</strong> untuk dicetak atau disimpan ke PDF.
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-do-print-anekdotal" onclick="window.printCurrentAnekdotal()" class="btn btn-primary" style="background: #006837; color: white; font-weight: 800; font-size: 0.85rem; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0, 104, 55, 0.25);">
              🖨️ Cetak Dokumen (Print / PDF)
            </button>
            <button type="button" id="btn-close-modal-anekdotal-top" class="btn btn-secondary" style="font-size: 0.85rem; padding: 8px 14px; font-weight: 700;">
              Tutup
            </button>
          </div>
        </div>

        <!-- Body Modal: Preview Dokumen A4 -->
        <div class="modal-wawancara-body" style="padding: 1rem; overflow: visible; flex: 1; background: #cbd5e1;">
          <div id="anekdotal-modal-preview-wrapper" style="background: #ffffff; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 4px; max-width: 210mm;">
            <!-- Dokumen HTML dimasukkan ke sini -->
          </div>
        </div>

        <!-- Footer Modal -->
        <div class="no-print" style="background: #ffffff; border-top: 1.5px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.76rem; color: #64748b;">
            Arsip Bimbingan Konseling (BK) & Tata Usaha SMA Muhammadiyah 3 Yogyakarta
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-close-modal-anekdotal-bottom" onclick="window.closeModalCetakAnekdotal()" class="btn btn-secondary" style="padding: 8px 18px; font-weight: 700; font-size: 0.85rem;">
              Tutup
            </button>
            <button type="button" id="btn-do-print-anekdotal-bottom" onclick="window.printCurrentAnekdotal()" class="btn btn-primary" style="background: #006837; color: #fff; padding: 8px 18px; font-weight: 800; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;">
              🖨️ Cetak Dokumen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mount Print Dedicated untuk window.print() -->
    <div id="anekdotal-print-mount"></div>



    <!-- Modal Form Tambah / Edit Pewawancara -->
    <div class="modal-wawancara-overlay" id="modal-pewawancara" style="display: none;">
      <div class="modal-wawancara-content" style="max-width: 620px;">
        <div class="modal-wawancara-header" style="background: linear-gradient(135deg, #00562c 0%, #008349 100%); color: white; padding: 1.1rem 1.4rem;">
          <h3 id="modal-pewawancara-title" style="margin: 0; font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            ➕ Tambah Pewawancara Baru
          </h3>
          <button type="button" class="modal-close-btn" id="modal-pewawancara-close" style="color: white; font-size: 1.5rem; background: none; border: none; cursor: pointer;">&times;</button>
        </div>

        <form id="form-pewawancara">
          <div class="modal-wawancara-body" style="padding: 1.25rem 1.4rem;">
            <input type="hidden" id="pewawancara-edit-id" value="">

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 1rem; font-size: 0.82rem; color: #475569;">
              💡 <em>Sebagai Editor, masukkan nama dan profil pewawancara. Nama panggilan akan digunakan pada badge jadwal, filter pencarian, dan penugasan formulir penilaian.</em>
            </div>

            <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label for="pewawancara-input-nama" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Nama Panggilan / Singkat <span style="color: red;">*</span>
                </label>
                <input type="text" id="pewawancara-input-nama" class="form-control" placeholder="Contoh: Yosa / Veli / Bambang" required style="font-weight: 700;">
                <small style="font-size: 0.72rem; color: #64748b;">Digunakan pada label badge tabel jadwal & kalender</small>
              </div>

              <div class="form-group">
                <label for="pewawancara-input-gelar" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Gelar Akademik <span style="color: red;">*</span>
                </label>
                <input type="text" id="pewawancara-input-gelar" class="form-control" placeholder="Contoh: S.Pd / M.Pd / S.Ag" required>
                <small style="font-size: 0.72rem; color: #64748b;">Gelar kesarjanaan penguji</small>
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label for="pewawancara-input-nama-lengkap" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                Nama Lengkap & Sapaan Resmi <span style="color: red;">*</span>
              </label>
              <input type="text" id="pewawancara-input-nama-lengkap" class="form-control" placeholder="Contoh: Ustadz H. Bambang Irawan, M.Pd" required style="font-weight: 600;">
              <small style="font-size: 0.72rem; color: #64748b;">Nama lengkap yang tercantum pada lembar pengesahan & cetak dokumen</small>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label for="pewawancara-input-peran" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                Peran / Bidang Penguji
              </label>
              <input type="text" id="pewawancara-input-peran" class="form-control" list="list-peran-pewawancara" placeholder="Pilih atau ketik peran penguji...">
              <datalist id="list-peran-pewawancara">
                <option value="Penguji 1 (Akademik & Minat Bakat)">
                <option value="Penguji 2 (Tahfidz Al-Qur'an & Kepribadian)">
                <option value="Penguji 3 (Bakat Khusus & Prestasi Siswa)">
                <option value="Penguji 4 (Wawancara Orang Tua / Komitmen Wali)">
                <option value="Penguji Khusus Pemetaan Peminatan Jurusan">
              </datalist>
            </div>

            <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
              <div class="form-group">
                <label for="pewawancara-input-ruang" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Ruangan / Lokasi Default
                </label>
                <input type="text" id="pewawancara-input-ruang" class="form-control" list="list-ruang-pewawancara" placeholder="Pilih atau ketik ruangan...">
                <datalist id="list-ruang-pewawancara">
                  <option value="Ruang Wawancara 1 (Gedung Utama)">
                  <option value="Ruang Wawancara 2 (Lab Komputer)">
                  <option value="Ruang Wawancara 3 (Gedung Timur)">
                  <option value="Ruang Tahfidz (Masjid M3)">
                  <option value="Ruang BK & Konseling">
                  <option value="Google Meet / Zoom (Daring Online)">
                </datalist>
              </div>

              <div class="form-group">
                <label for="pewawancara-input-metode" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Metode Wawancara Default
                </label>
                <select id="pewawancara-input-metode" class="form-control" style="font-weight: 600;">
                  <option value="Luring">🏢 Luring (Tatap Muka di Sekolah)</option>
                  <option value="Daring">🌐 Daring (Virtual Meet / Zoom)</option>
                </select>
              </div>
            </div>

            <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
              <div class="form-group">
                <label for="pewawancara-input-kontak" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Nomor Kontak / WhatsApp (Opsional)
                </label>
                <input type="text" id="pewawancara-input-kontak" class="form-control" placeholder="Contoh: 0812-3456-7890">
              </div>

              <div class="form-group">
                <label for="pewawancara-input-status" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: block;">
                  Status Penguji
                </label>
                <select id="pewawancara-input-status" class="form-control" style="font-weight: 700;">
                  <option value="AKTIF">🟢 AKTIF (Siap Bertugas & Muncul di Jadwal)</option>
                  <option value="NONAKTIF">⚪ NONAKTIF (Sementara Tidak Ditugaskan)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="padding: 1rem 1.4rem; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal-pewawancara" style="background: #f1f5f9; color: #475569; padding: 9px 18px; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" style="background: #006837; color: #ffffff; padding: 9px 22px; font-weight: 700; font-size: 0.9rem; border-radius: 8px; border: none; box-shadow: 0 4px 10px rgba(0, 104, 55, 0.3); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              💾 Simpan Pewawancara
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast-notification" id="wawancara-toast"></div>
  `;

  // Render Sub-Views
  renderJadwalViewport();
  renderTableRows();
  renderPewawancaraTable();

  // Attach All Event Listeners
  attachTableEventListeners();
}

/**
 * Filter data pendaftar khusus untuk tampilan Tabel Jadwal & Kalender Jadwal
 */
function getFilteredJadwalCandidates() {
  const candidates = getLunasCandidates();

  const filtered = candidates.filter(item => {
    const sLower = jadwalSearch.toLowerCase().trim();
    const matchSearch = !sLower ||
      (item.nama || item.nama_lengkap || '').toLowerCase().includes(sLower) ||
      (item.id || item.id_pendaftar || '').toLowerCase().includes(sLower) ||
      (item.asal_sekolah || item.biodata?.asal_sekolah || '').toLowerCase().includes(sLower);

    const jw = item.jadwal_wawancara || {};
    const hari = jw.hari || '';
    const tipeHari = jw.tipe_hari || '';
    const pewawancara = jw.pewawancara || '';

    // Filter Pewawancara (Yosa / Veli)
    let matchPewawancara = true;
    if (jadwalFilterPewawancara !== 'ALL') {
      matchPewawancara = pewawancara.toLowerCase().includes(jadwalFilterPewawancara.toLowerCase());
    }

    // Filter Metode (Luring / Daring)
    let matchMetode = true;
    if (jadwalFilterMetode !== 'ALL') {
      const itemMetode = (jw.metode || 'Luring').toUpperCase();
      matchMetode = itemMetode === jadwalFilterMetode;
    }

    // Filter Hari
    let matchHari = true;
    if (jadwalFilterHari === 'WEEKDAY') {
      matchHari = tipeHari === 'Weekday' || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].includes(hari);
    } else if (jadwalFilterHari === 'WEEKEND') {
      matchHari = tipeHari === 'Weekend' || ['Sabtu', 'Minggu'].includes(hari);
    } else if (jadwalFilterHari !== 'ALL') {
      matchHari = hari === jadwalFilterHari;
    }

    // Filter Jam Sesi
    let matchJam = true;
    if (jadwalFilterJam !== 'ALL') {
      const itemJam = jw.jam || jw.jam_mulai || '';
      matchJam = itemJam.startsWith(jadwalFilterJam);
    }

    // Filter Status Wawancara
    let matchStatus = true;
    const statusW = (item.statusWawancara || 'BELUM').toUpperCase();
    if (jadwalFilterStatus !== 'ALL') {
      matchStatus = statusW === jadwalFilterStatus;
    }

    return matchSearch && matchPewawancara && matchMetode && matchHari && matchJam && matchStatus;
  });

  // Pengurutan Jadwal Otomatis:
  // 1. Berdasarkan tanggal paling awal (ASC)
  // 2. Jika tanggal sama, urutkan berdasarkan jam mulai (ASC)
  return filtered.sort((a, b) => {
    const jwA = a.jadwal_wawancara || {};
    const jwB = b.jadwal_wawancara || {};

    const tglA = (jwA.tanggal || '9999-99-99').trim();
    const tglB = (jwB.tanggal || '9999-99-99').trim();

    if (tglA !== tglB) {
      return tglA.localeCompare(tglB);
    }

    const jamA = (jwA.jam || jwA.jam_mulai || '99:99').trim();
    const jamB = (jwB.jam || jwB.jam_mulai || '99:99').trim();
    return jamA.localeCompare(jamB);
  });
}

/**
 * Render Viewport Jadwal (Tabel Jadwal Resmi vs Kalender Jadwal Mingguan)
 */
function renderJadwalViewport() {
  const viewport = document.getElementById('jadwal-content-viewport');
  if (!viewport) return;

  const candidates = getFilteredJadwalCandidates();

  if (jadwalViewMode === 'TABLE') {
    // Mode 1: Format Tabel Jadwal Resmi
    if (candidates.length === 0) {
      viewport.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: #64748b;">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">🔍</span>
          <strong>Tidak ada calon siswa pada Tabel Jadwal yang sesuai dengan filter.</strong>
          <p style="font-size: 0.85rem; margin-top: 4px;">Coba ubah filter pewawancara (Yosa / Veli), hari, jam sesi, atau kata kunci pencarian.</p>
        </div>
      `;
      return;
    }

    viewport.innerHTML = `
      <div class="jadwal-table-wrapper">
        <table class="jadwal-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">No.</th>
              <th>No. Registrasi</th>
              <th>Nama Calon Siswa</th>
              <th>Hari & Tanggal</th>
              <th>Jam Wawancara</th>
              <th>Metode</th>
              <th>Platform / Lokasi Ruangan</th>
              <th>Tautan Meeting (Daring)</th>
              <th>Pewawancara</th>
              <th>Status Wawancara</th>
              <th style="text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody id="jadwal-table-body">
            ${candidates.map((c, index) => {
      const jw = c.jadwal_wawancara || {};
      const isWeekend = jw.tipe_hari === 'Weekend' || ['Sabtu', 'Minggu'].includes(jw.hari);
      const isSelesai = (c.statusWawancara || '').toUpperCase() === 'SELESAI';
      const candidateId = c.id || c.id_pendaftar || '-';
      const candidateName = c.nama || c.nama_lengkap || 'Tanpa Nama';
      const asalSekolah = c.asal_sekolah || c.biodata?.asal_sekolah || '-';
      const jurusan = c.pilihan_jurusan || c.biodata?.pilihan_jurusan || 'MIPA';
      const ruang = jw.ruang ? jw.ruang.split('(')[0].trim() : 'Ruang Wawancara 1';
      const pewawancara = jw.pewawancara || 'Yosa';
      const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
      const hasValidLink = isDaring && isValidMeetingLink(jw.link_meeting);

      return `
                <tr>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
                  <td><strong style="color: #006837;">${candidateId}</strong></td>
                  <td>
                    <span class="jadwal-candidate-name">${candidateName}</span>
                    <span style="font-size: 0.74rem; color: #64748b; display: block;">${asalSekolah} &bull; <strong style="color: #0284c7;">${jurusan}</strong></span>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.88rem;">${formatTanggalIndonesia(jw.tanggal, jw.hari)}</div>
                    <span class="jadwal-slot-badge-day" style="background: ${isWeekend ? '#fef3c7' : '#e0f2fe'}; color: ${isWeekend ? '#b45309' : '#0369a1'}; margin-top: 3px;">
                      ${isWeekend ? '🏖️ Weekend (09-15)' : '📅 Weekday (08-15)'}
                    </span>
                  </td>
                  <td>
                    <div class="jadwal-time-pill">
                      <span>⏰</span> <strong>${jw.sesi || (jw.jam ? jw.jam + ' WIB' : '-')}</strong>
                    </div>
                  </td>
                  <td>
                    <span class="badge-metode ${isDaring ? 'badge-metode-daring' : 'badge-metode-luring'}">
                      ${isDaring ? '🌐 Daring' : '🏢 Luring'}
                    </span>
                  </td>
                  <td>
                    ${isDaring
          ? `<div style="font-weight: 700; color: #0284c7; font-size: 0.82rem; display: flex; align-items: center; gap: 4px;">
                           <span>📹</span> ${jw.platform || 'Google Meet'}
                         </div>
                         <div style="font-size: 0.72rem; color: #64748b;">Virtual Online</div>`
          : `<div style="font-weight: 700; color: #334155; font-size: 0.82rem; display: flex; align-items: center; gap: 4px;">
                           <span>🏢</span> ${ruang}
                         </div>
                         <div style="font-size: 0.72rem; color: #64748b;">${jw.ruang && jw.ruang.includes('(') ? '(' + jw.ruang.split('(')[1] : '(Kampus Gedung Utama)'}</div>`}
                  </td>
                  <td>
                    ${isDaring
          ? (hasValidLink
            ? `<a href="${jw.link_meeting}" target="_blank" rel="noopener noreferrer" class="btn-gabung-meet" title="Buka tautan ${jw.platform || 'Meeting'}">
                               🎥 Gabung Wawancara
                             </a>`
            : `<span class="badge-link-empty" title="Tautan belum diset">
                               ⚠️ Tautan belum tersedia
                             </span>`)
          : `<span style="font-size: 0.74rem; color: #94a3b8; font-style: italic;">— (Tatap Muka di Sekolah)</span>`}
                  </td>
                  <td>
                    ${renderPewawancaraBadge(pewawancara)}
                  </td>
                  <td>
                    ${isSelesai
          ? `<span class="badge-status-selesai">✅ Selesai (Skor: ${c.nilai_wawancara || 88})</span>`
          : `<span class="badge-status-belum">⏳ Belum Wawancara</span>`}
                  </td>
                  <td style="text-align: center;">
                    <div style="display: inline-flex; gap: 4px; align-items: center;">
                      <button class="btn btn-primary btn-input-nilai" data-id="${candidateId}" style="padding: 5px 10px; font-size: 0.76rem; font-weight: 700; background: ${isSelesai ? '#0284c7' : '#006837'}; color: #fff; border-radius: 6px; border: none; cursor: pointer;">
                        ${isSelesai ? '✏️ Skor' : '🎤 Nilai'}
                      </button>
                      <button class="btn btn-secondary btn-cetak-anekdotal" data-id="${candidateId}" onclick="window.openModalCetakAnekdotal('${candidateId}')" title="Cetak Dokumen Anekdotal Record Siswa" style="padding: 5px 8px; font-size: 0.74rem; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
                        🖨️ Cetak
                      </button>
                      <button class="btn btn-secondary btn-edit-jadwal" data-id="${candidateId}" title="Atur tanggal, jam & tautan meeting" style="padding: 5px 8px; font-size: 0.76rem; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;">
                        📅
                      </button>
                    </div>
                  </td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Mode 2: Kalender Jadwal Mingguan
    const days = [
      { name: 'Senin', isWeekend: false, label: 'Senin (08-15)' },
      { name: 'Selasa', isWeekend: false, label: 'Selasa (08-15)' },
      { name: 'Rabu', isWeekend: false, label: 'Rabu (08-15)' },
      { name: 'Kamis', isWeekend: false, label: 'Kamis (08-15)' },
      { name: 'Jumat', isWeekend: false, label: 'Jumat (08-15)' },
      { name: 'Sabtu', isWeekend: true, label: 'Sabtu (09-15)' },
      { name: 'Minggu', isWeekend: true, label: 'Minggu (09-15)' }
    ];

    const timeSlots = [
      { jam: '08:00', label: '08.00 - 09.00', weekdayOnly: true },
      { jam: '09:00', label: '09.00 - 10.00', weekdayOnly: false },
      { jam: '10:00', label: '10.00 - 11.00', weekdayOnly: false },
      { jam: '11:00', label: '11.00 - 12.00', weekdayOnly: false },
      { jam: '13:00', label: '13.00 - 14.00', weekdayOnly: false },
      { jam: '14:00', label: '14.00 - 15.00', weekdayOnly: false }
    ];

    viewport.innerHTML = `
      <div class="kalender-grid-wrapper">
        <table class="kalender-matrix-table">
          <thead>
            <tr>
              <th class="kalender-time-header">Jam Sesi</th>
              ${days.map(d => `<th>${d.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${timeSlots.map(slot => {
      return `
                <tr>
                  <td class="kalender-time-header" style="text-align: center; vertical-align: middle;">
                    <strong style="font-size: 0.82rem; color: #006837;">${slot.label}</strong>
                    <div style="font-size: 0.68rem; color: #64748b;">${slot.weekdayOnly ? 'Khusus Weekday' : 'Weekday & Weekend'}</div>
                  </td>
                  ${days.map(d => {
        if (slot.weekdayOnly && d.isWeekend) {
          return `
                        <td class="kalender-cell weekend-closed">
                          🏖️ Libur Layanan Weekend<br><span style="font-size: 0.68rem;">(Operasional Weekend 09.00-15.00)</span>
                        </td>
                      `;
        }

        // Temukan calon siswa pada slot hari & jam ini
        const slotCandidates = candidates.filter(c => {
          const jw = c.jadwal_wawancara || {};
          return jw.hari === d.name && (jw.jam === slot.jam || jw.jam_mulai === slot.jam);
        });

        return `
                      <td class="kalender-cell ${slotCandidates.length > 0 ? 'has-candidates' : ''}">
                        ${slotCandidates.length === 0
            ? `<span style="font-size: 0.72rem; color: #94a3b8; display: block; text-align: center; padding: 1.25rem 0;">(Kosong)</span>`
            : slotCandidates.map(sc => {
              const isSelesai = (sc.statusWawancara || '').toUpperCase() === 'SELESAI';
              const cId = sc.id || sc.id_pendaftar;
              const cName = sc.nama || sc.nama_lengkap;
              const pew = sc.jadwal_wawancara?.pewawancara || 'Yosa';
              const isDar = (sc.jadwal_wawancara?.metode || '').toUpperCase() === 'DARING';
              const jwC = sc.jadwal_wawancara || {};
              const hasLinkC = isDar && isValidMeetingLink(jwC.link_meeting);
              return `
                                <div class="kalender-cell-item ${isDar ? 'item-daring' : 'item-luring'}">
                                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                                    <strong style="color: #006837; font-size: 0.74rem;">${cId}</strong>
                                    <span style="font-size: 0.68rem; font-weight: 700; color: ${isSelesai ? '#15803d' : '#b45309'};">
                                      ${isSelesai ? '✅ Selesai' : '⏳ Belum'}
                                    </span>
                                  </div>
                                  <div style="font-weight: 800; font-size: 0.82rem; color: #0f172a; margin-bottom: 2px;">
                                    ${cName}
                                  </div>
                                  <div style="font-size: 0.68rem; color: #475569; margin-bottom: 3px;">
                                    📅 ${formatTanggalIndonesia(jwC.tanggal, jwC.hari)} &bull; ⏰ ${jwC.jam || slot.jam} WIB
                                  </div>
                                  <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                                    <span class="badge-metode ${isDar ? 'badge-metode-daring' : 'badge-metode-luring'}" style="padding: 2px 6px; font-size: 0.68rem;">
                                      ${isDar ? '🌐 ' + (jwC.platform || 'Daring') : '🏢 Luring'}
                                    </span>
                                    ${renderPewawancaraBadge(pew)}
                                  </div>
                                  <div style="font-size: 0.72rem; color: #64748b; margin-bottom: 6px;">
                                    ${isDar
                  ? (hasLinkC
                    ? `<a href="${jwC.link_meeting}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 700; font-size: 0.72rem; text-decoration: underline;">🎥 Gabung Meet</a>`
                    : `<span style="color: #b45309; font-style: italic; font-size: 0.7rem;">⚠️ Belum ada tautan</span>`)
                  : `🏢 ${jwC.ruang ? jwC.ruang.split('(')[0].trim() : 'R. Wawancara 1'}`}
                                  </div>
                                  <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-primary btn-input-nilai" data-id="${cId}" style="flex: 1; padding: 4px 6px; font-size: 0.72rem; font-weight: 700; background: ${isSelesai ? '#0284c7' : '#006837'}; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                      ${isSelesai ? '✏️ Skor' : '🎤 Nilai'}
                                    </button>
                                    <button class="btn btn-secondary btn-edit-jadwal" data-id="${cId}" title="Atur Jadwal & Tautan" style="padding: 4px 6px; font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">
                                      📅
                                    </button>
                                  </div>
                                </div>
                              `;
            }).join('')}
                      </td>
                    `;
      }).join('')}
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Re-bind click event buttons di dalam viewport Jadwal
  viewport.querySelectorAll('.btn-input-nilai').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalPenilaian(id);
    });
  });

  viewport.querySelectorAll('.btn-edit-jadwal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalEditJadwal(id);
    });
  });

  viewport.querySelectorAll('.btn-cetak-anekdotal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      openModalCetakAnekdotal(id);
    });
  });
}

/**
 * Render isi tabel evaluasi & rekapitulasi penilaian wawancara
 */
function renderTableRows() {
  const tbody = document.getElementById('wawancara-tbody');
  if (!tbody) return;

  const lunasCandidates = getLunasCandidates();

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
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
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
    const pewawancara = item.dataWawancara?.pewawancara || item.jadwal_wawancara?.pewawancara || 'Yosa';

    const isSelesai = statusW === 'SELESAI';
    const badgeStatus = isSelesai
      ? `<span class="badge-status-selesai">✅ Sudah Wawancara</span>`
      : `<span class="badge-status-belum">⏳ Belum Wawancara</span>`;

    // Skor rata-rata
    const scoreVal = item.nilai_wawancara !== undefined && item.nilai_wawancara !== null
      ? item.nilai_wawancara
      : (item.dataWawancara ? Math.round(((parseFloat(item.dataWawancara.nilai_siswa) || 0) + (parseFloat(item.dataWawancara.nilai_wali) || 0)) / 2) : '-');

    // Rekomendasi beasiswa & kelulusan
    let recBadge = '-';
    if (isSelesai && item.dataWawancara) {
      const recAkhir = item.dataWawancara.rekomendasi_akhir || 'LAYAK';
      const statusTes = item.dataWawancara.status_tes_quran || (item.dataWawancara.hafalan_teruji !== undefined ? 'Sudah Dites' : 'Belum Dites');
      const countTeruji = item.dataWawancara.hafalan_teruji !== undefined
        ? item.dataWawancara.hafalan_teruji
        : (statusTes === 'Sudah Dites' ? (item.dataWawancara.hafalan_juz || 0) : 0);

      const beasiswaCode = calculateBeasiswaRecommendation(countTeruji, statusTes);

      let colorTag = '#16a34a';
      if (recAkhir === 'CADANGAN') colorTag = '#d97706';
      if (recAkhir === 'TIDAK_LAYAK') colorTag = '#dc2626';

      recBadge = `
        <div style="font-weight: 700; color: ${colorTag}; font-size: 0.82rem;">${recAkhir}</div>
        <div style="margin-top:2px;">
          <span class="${beasiswaCode.badgeClass}" title="${beasiswaCode.label}">${beasiswaCode.icon} ${beasiswaCode.label}</span>
        </div>
      `;
    }

    const isDar = (item.jadwal_wawancara?.metode || '').toUpperCase() === 'DARING';

    return `
      <tr>
        <td><strong style="color: #006837;">${candidateId}</strong></td>
        <td><strong>${candidateName}</strong></td>
        <td>${asalSekolah}</td>
        <td><span class="badge badge-info">${jurusan}</span></td>
        <td>
          <span class="badge-metode ${isDar ? 'badge-metode-daring' : 'badge-metode-luring'}" style="padding: 2px 7px; font-size: 0.72rem;">
            ${isDar ? '🌐 Daring' : '🏢 Luring'}
          </span>
        </td>
        <td>
          ${renderPewawancaraBadge(pewawancara)}
        </td>
        <td>${badgeStatus}</td>
        <td><strong style="font-size: 0.95rem;">${scoreVal}</strong></td>
        <td>${recBadge}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
            <button class="btn btn-primary btn-input-nilai" data-id="${candidateId}" style="padding: 6px 12px; font-size: 0.8rem; background: ${!isEditMode ? '#eff6ff' : (isSelesai ? '#0284c7' : '#006837')}; color: ${!isEditMode ? '#1d4ed8' : '#ffffff'}; border: ${!isEditMode ? '1px solid #bfdbfe' : 'none'}; font-weight: 700;">
              ${!isEditMode ? '👁️ Detail' : (isSelesai ? '✏️ Nilai' : '📝 Nilai')}
            </button>
            <button class="btn btn-secondary btn-cetak-anekdotal" data-id="${candidateId}" onclick="window.openModalCetakAnekdotal('${candidateId}')" title="Cetak Dokumen Anekdotal Record Siswa" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              🖨️ Cetak
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Re-bind click event buttons
  tbody.querySelectorAll('.btn-input-nilai').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalPenilaian(id);
    });
  });

  tbody.querySelectorAll('.btn-cetak-anekdotal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalCetakAnekdotal(id);
    });
  });
}

/**
 * Render Tabel Pewawancara di dalam Tab 3 (Kelola Pewawancara)
 */
function renderPewawancaraTable() {
  const tbody = document.getElementById('pewawancara-tbody');
  if (!tbody) return;

  const allPew = getPewawancaraList();
  const lunasCandidates = getLunasCandidates();

  // Filter berdasarkan search & status
  const sLower = (pewawancaraSearch || '').toLowerCase().trim();
  const filtered = allPew.filter(item => {
    const matchSearch = !sLower ||
      (item.nama || '').toLowerCase().includes(sLower) ||
      (item.nama_lengkap || '').toLowerCase().includes(sLower) ||
      (item.gelar || '').toLowerCase().includes(sLower) ||
      (item.peran || '').toLowerCase().includes(sLower) ||
      (item.ruang || '').toLowerCase().includes(sLower);

    const matchStatus = pewawancaraFilterStatus === 'ALL' || item.status === pewawancaraFilterStatus;
    return matchSearch && matchStatus;
  });

  // Update summary badge jika elemen tersedia
  const statTotal = document.getElementById('stat-total-pewawancara');
  const statAktif = document.getElementById('stat-aktif-pewawancara');
  const statNonaktif = document.getElementById('stat-nonaktif-pewawancara');
  const badgeSiap = document.getElementById('badge-siap-bertugas');

  const activeCount = allPew.filter(p => p.status === 'AKTIF').length;
  const nonactiveCount = allPew.filter(p => p.status !== 'AKTIF').length;

  if (statTotal) statTotal.textContent = allPew.length;
  if (statAktif) statAktif.textContent = activeCount;
  if (statNonaktif) statNonaktif.textContent = nonactiveCount;
  if (badgeSiap) badgeSiap.textContent = `${activeCount} Penguji Aktif Siap`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
          <div style="font-size: 2rem; margin-bottom: 6px;">👥</div>
          <div style="font-weight: 700; color: #1e293b;">Tidak ada data pewawancara yang cocok</div>
          <p style="font-size: 0.85rem; margin-top: 4px;">Coba sesuaikan kata kunci pencarian atau ubah filter status.</p>
          ${isEditMode ? `
            <button id="btn-empty-tambah-pewawancara" class="btn btn-primary" style="margin-top: 10px; background: #006837; color: white; padding: 7px 16px; font-weight: 700; font-size: 0.85rem; border-radius: 6px; border: none; cursor: pointer;">
              ➕ Tambah Pewawancara Sekarang
            </button>
          ` : ''}
        </td>
      </tr>
    `;

    const btnEmptyTambah = document.getElementById('btn-empty-tambah-pewawancara');
    if (btnEmptyTambah) {
      btnEmptyTambah.addEventListener('click', () => openModalPewawancara(null));
    }
    return;
  }

  tbody.innerHTML = filtered.map((item, index) => {
    const pal = getPewawancaraPalette(item.nama);
    const initials = (item.nama || 'P').substring(0, 2).toUpperCase();
    const isAktif = item.status === 'AKTIF';

    // Hitung berapa calon siswa yang saat ini ditugaskan ke pewawancara ini
    const assignedCount = lunasCandidates.filter(c => {
      const p = (c.dataWawancara?.pewawancara || c.jadwal_wawancara?.pewawancara || '').toLowerCase();
      return p.includes(item.nama.toLowerCase());
    }).length;

    const isDaring = (item.metode_default || '').toUpperCase() === 'DARING';

    return `
      <tr style="${!isAktif ? 'opacity: 0.65; background: #f8fafc;' : ''}">
        <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="pewawancara-avatar-badge" style="background: ${pal.avatarBg};">
              ${initials}
            </div>
            <div>
              <div style="font-weight: 800; color: #0f172a; font-size: 0.95rem;">${item.nama_lengkap || item.nama}</div>
              <div style="font-size: 0.74rem; color: #64748b;">
                ${item.kontak ? `📱 ${item.kontak}` : 'SMA Muhammadiyah 3'}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            ${renderPewawancaraBadge(item.nama)}
            <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">ID: ${item.id}</span>
          </div>
        </td>
        <td>
          <span style="font-weight: 600; font-size: 0.85rem; color: #334155;">
            ${item.peran || 'Penguji Wawancara SPMB'}
          </span>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.82rem; color: #0f172a;">
            📍 ${item.ruang || 'Ruang Wawancara 1'}
          </div>
          <span class="badge-metode ${isDaring ? 'badge-metode-daring' : 'badge-metode-luring'}" style="margin-top: 3px; font-size: 0.7rem; padding: 1px 6px;">
            ${isDaring ? '🌐 Daring' : '🏢 Luring'}
          </span>
        </td>
        <td style="text-align: center;">
          <span style="display: inline-flex; align-items: center; gap: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 800; font-size: 0.78rem; padding: 3px 9px; border-radius: 6px;">
            🎓 ${assignedCount} Siswa
          </span>
        </td>
        <td style="text-align: center;">
          ${isAktif
        ? `<span class="badge-status-selesai" style="font-size: 0.75rem; padding: 3px 8px;">🟢 Aktif</span>`
        : `<span style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px;">⚪ Nonaktif</span>`}
        </td>
        <td style="text-align: center;">
          <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: wrap;">
            ${isEditMode ? `
              <button type="button" class="btn btn-pew-action btn-edit-pewawancara" data-id="${item.id}" style="padding: 5px 9px; font-size: 0.76rem; font-weight: 700; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;" title="Edit Data Pewawancara">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-pew-action btn-toggle-status-pew" data-id="${item.id}" style="padding: 5px 8px; font-size: 0.74rem; font-weight: 600; background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;" title="Ubah status Aktif/Nonaktif">
                ${isAktif ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button type="button" class="btn btn-pew-action btn-hapus-pewawancara" data-id="${item.id}" data-nama="${item.nama}" style="padding: 5px 8px; font-size: 0.76rem; font-weight: 700; background: #ef4444; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;" title="Hapus Pewawancara">
                🗑️
              </button>
            ` : `
              <span style="font-size: 0.75rem; color: #94a3b8; font-style: italic;">
                🔒 Read-Only
              </span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event listener ke tombol-tombol di dalam tabel
  tbody.querySelectorAll('.btn-edit-pewawancara').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalPewawancara(id);
    });
  });

  tbody.querySelectorAll('.btn-toggle-status-pew').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleToggleStatusPewawancara(id);
    });
  });

  tbody.querySelectorAll('.btn-hapus-pewawancara').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const nama = e.currentTarget.getAttribute('data-nama');
      handleDeletePewawancara(id, nama);
    });
  });
}

/**
 * Buka Modal Tambah atau Edit Pewawancara
 */
function openModalPewawancara(id = null) {
  if (!isEditMode) {
    showToast('🔒 Anda dalam Mode Viewer. Ubah ke "Mode Editor" di kanan atas untuk menambah atau mengedit pewawancara.', 'warning');
    return;
  }

  const modal = document.getElementById('modal-pewawancara');
  const titleEl = document.getElementById('modal-pewawancara-title');
  if (!modal) return;

  editingPewawancaraId = id;

  if (id) {
    // Mode Edit
    const list = getPewawancaraList();
    const item = list.find(p => p.id === id);
    if (!item) return;

    if (titleEl) titleEl.innerHTML = `✏️ Edit Data Pewawancara: <strong>${item.nama}</strong>`;
    document.getElementById('pewawancara-edit-id').value = item.id;
    document.getElementById('pewawancara-input-nama').value = item.nama || '';
    document.getElementById('pewawancara-input-nama-lengkap').value = item.nama_lengkap || '';
    document.getElementById('pewawancara-input-gelar').value = item.gelar || '';
    document.getElementById('pewawancara-input-peran').value = item.peran || '';
    document.getElementById('pewawancara-input-ruang').value = item.ruang || '';
    document.getElementById('pewawancara-input-metode').value = item.metode_default || 'Luring';
    document.getElementById('pewawancara-input-kontak').value = item.kontak || '';
    document.getElementById('pewawancara-input-status').value = item.status || 'AKTIF';
  } else {
    // Mode Tambah
    if (titleEl) titleEl.innerHTML = `➕ Tambah Pewawancara Baru (Editor)`;
    document.getElementById('pewawancara-edit-id').value = '';
    document.getElementById('pewawancara-input-nama').value = '';
    document.getElementById('pewawancara-input-nama-lengkap').value = '';
    document.getElementById('pewawancara-input-gelar').value = '';
    document.getElementById('pewawancara-input-peran').value = 'Penguji 1 (Akademik & Minat Bakat)';
    document.getElementById('pewawancara-input-ruang').value = 'Ruang Wawancara 1 (Gedung Utama)';
    document.getElementById('pewawancara-input-metode').value = 'Luring';
    document.getElementById('pewawancara-input-kontak').value = '';
    document.getElementById('pewawancara-input-status').value = 'AKTIF';
  }

  modal.style.display = 'flex';
}

/**
 * Tutup Modal Pewawancara
 */
function closeModalPewawancara() {
  const modal = document.getElementById('modal-pewawancara');
  if (modal) modal.style.display = 'none';
  editingPewawancaraId = null;
}

/**
 * Simpan Data Tambah / Edit Pewawancara
 */
function handleSavePewawancara(e) {
  if (e) e.preventDefault();
  if (!isEditMode) {
    showToast('🔒 Pengeditan dinonaktifkan dalam Mode Viewer.', 'warning');
    return;
  }

  const id = document.getElementById('pewawancara-edit-id')?.value;
  const nama = document.getElementById('pewawancara-input-nama')?.value.trim();
  const namaLengkap = document.getElementById('pewawancara-input-nama-lengkap')?.value.trim();
  const gelar = document.getElementById('pewawancara-input-gelar')?.value.trim();
  const peran = document.getElementById('pewawancara-input-peran')?.value.trim() || 'Penguji Wawancara';
  const ruang = document.getElementById('pewawancara-input-ruang')?.value.trim() || 'Ruang Wawancara 1';
  const metode = document.getElementById('pewawancara-input-metode')?.value || 'Luring';
  const kontak = document.getElementById('pewawancara-input-kontak')?.value.trim();
  const status = document.getElementById('pewawancara-input-status')?.value || 'AKTIF';

  if (!nama || !namaLengkap) {
    showToast('⚠️ Nama panggilan dan nama lengkap wajib diisi!', 'warning');
    return;
  }

  const list = getPewawancaraList();

  if (id) {
    // Mode Update
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      const oldNama = list[idx].nama;
      list[idx] = {
        ...list[idx],
        nama,
        nama_lengkap: namaLengkap,
        gelar,
        peran,
        ruang,
        metode_default: metode,
        kontak,
        status
      };

      // Jika nama berubah, update pendaftar yang ditugaskan ke nama lama
      if (oldNama !== nama) {
        try {
          const dbData = db.get();
          if (dbData && Array.isArray(dbData.pendaftar)) {
            let updatedCount = 0;
            dbData.pendaftar.forEach(p => {
              if (p.jadwal_wawancara?.pewawancara === oldNama) {
                p.jadwal_wawancara.pewawancara = nama;
                updatedCount++;
              }
              if (p.dataWawancara?.pewawancara === oldNama) {
                p.dataWawancara.pewawancara = nama;
              }
            });
            if (updatedCount > 0) {
              db.save(dbData);
            }
          }
        } catch (err) { }
      }

      savePewawancaraList(list);
      showToast(`✓ Data pewawancara "${nama}" berhasil diperbarui!`);
    }
  } else {
    // Mode Tambah Baru
    const newId = `PEW-${String(list.length + 1).padStart(2, '0')}`;
    const newItem = {
      id: newId,
      nama,
      nama_lengkap: namaLengkap,
      gelar,
      peran,
      ruang,
      metode_default: metode,
      kontak,
      status
    };
    list.push(newItem);
    savePewawancaraList(list);
    showToast(`✓ Pewawancara "${nama}" (${gelar}) berhasil ditambahkan ke tim!`);
  }

  closeModalPewawancara();
  renderWawancara(activeContainerId);
}

/**
 * Toggle Status Aktif / Nonaktif Pewawancara
 */
function handleToggleStatusPewawancara(id) {
  if (!isEditMode) return;
  const list = getPewawancaraList();
  const target = list.find(p => p.id === id);
  if (!target) return;

  target.status = target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
  savePewawancaraList(list);
  showToast(`Status pewawancara ${target.nama} diubah menjadi: ${target.status === 'AKTIF' ? '🟢 AKTIF' : '⚪ NONAKTIF'}`);
  renderWawancara(activeContainerId);
}

/**
 * Hapus Pewawancara
 */
function handleDeletePewawancara(id, nama) {
  if (!isEditMode) return;
  const list = getPewawancaraList();
  if (list.length <= 1) {
    showToast('⚠️ Minimal harus ada 1 pewawancara di dalam sistem SPMB!', 'warning');
    return;
  }

  const lunas = getLunasCandidates();
  const assigned = lunas.filter(c => {
    const p = (c.dataWawancara?.pewawancara || c.jadwal_wawancara?.pewawancara || '').toLowerCase();
    return p.includes(nama.toLowerCase());
  });

  const confirmMsg = assigned.length > 0
    ? `Pewawancara "${nama}" saat ini memiliki ${assigned.length} siswa terjadwal. Jika dihapus, siswa akan otomatis dialihkan ke pewawancara lain. Lanjutkan hapus?`
    : `Apakah Anda yakin ingin menghapus pewawancara "${nama}" dari tim penguji SPMB?`;

  if (!confirm(confirmMsg)) return;

  const remaining = list.filter(p => p.id !== id);
  const fallbackPew = remaining.find(p => p.status === 'AKTIF')?.nama || remaining[0].nama;

  // Alihkan calon siswa
  try {
    const dbData = db.get();
    if (dbData && Array.isArray(dbData.pendaftar)) {
      dbData.pendaftar.forEach(p => {
        if (p.jadwal_wawancara?.pewawancara === nama) {
          p.jadwal_wawancara.pewawancara = fallbackPew;
        }
        if (p.dataWawancara?.pewawancara === nama) {
          p.dataWawancara.pewawancara = fallbackPew;
        }
      });
      db.save(dbData);
    }
  } catch (err) { }

  savePewawancaraList(remaining);
  showToast(`✓ Pewawancara "${nama}" berhasil dihapus.`);
  renderWawancara(activeContainerId);
}

/**
 * Attach Event Listeners untuk Subtabs, Filter, dan Modal
 */
function attachTableEventListeners() {
  // Sidebar Toggle Buttons (Hamburger Button & Reopen Pill)
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnReopenSidebar = document.getElementById('btn-reopen-sidebar');
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', toggleSidebarState);
  }
  if (btnReopenSidebar) {
    btnReopenSidebar.addEventListener('click', toggleSidebarState);
  }

  // Subtabs & Views Switcher
  const btnSubtabJadwal = document.getElementById('btn-subtab-jadwal');
  const btnSubtabEval = document.getElementById('btn-subtab-eval');
  const btnSubtabPewawancara = document.getElementById('btn-subtab-pewawancara');
  const btnSubtabPengingat = document.getElementById('btn-subtab-pengingat');
  const viewJadwal = document.getElementById('view-container-jadwal');
  const viewEval = document.getElementById('view-container-eval');
  const viewPewawancara = document.getElementById('view-container-pewawancara');
  const viewPengingat = document.getElementById('view-container-pengingat');

  // Mobile Drawer Handlers (Tahap 6)
  const mobileHamburger = document.getElementById('btn-mobile-hamburger');
  const closeMobileSidebar = document.getElementById('btn-close-mobile-sidebar');
  const sidebarBackdrop = document.getElementById('wawancara-sidebar-backdrop');
  const mobileTabIndicator = document.getElementById('mobile-tab-indicator');

  function openMobileDrawer() {
    const sb = document.getElementById('wawancara-sidebar');
    const bd = document.getElementById('wawancara-sidebar-backdrop');
    if (sb) sb.classList.add('mobile-drawer-open');
    if (bd) bd.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    const sb = document.getElementById('wawancara-sidebar');
    const bd = document.getElementById('wawancara-sidebar-backdrop');
    if (sb) sb.classList.remove('mobile-drawer-open');
    if (bd) bd.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (mobileHamburger) mobileHamburger.addEventListener('click', openMobileDrawer);
  if (closeMobileSidebar) closeMobileSidebar.addEventListener('click', closeMobileDrawer);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileDrawer);

  function switchToTab(tabName) {
    activeSubTab = tabName;
    if (btnSubtabJadwal) btnSubtabJadwal.classList.toggle('active', tabName === 'JADWAL');
    if (btnSubtabEval) btnSubtabEval.classList.toggle('active', tabName === 'EVAL');
    if (btnSubtabPewawancara) btnSubtabPewawancara.classList.toggle('active', tabName === 'PEWAWANCARA');
    if (btnSubtabPengingat) btnSubtabPengingat.classList.toggle('active', tabName === 'PENGINGAT');

    if (viewJadwal) viewJadwal.style.display = tabName === 'JADWAL' ? 'block' : 'none';
    if (viewEval) viewEval.style.display = tabName === 'EVAL' ? 'block' : 'none';
    if (viewPewawancara) viewPewawancara.style.display = tabName === 'PEWAWANCARA' ? 'block' : 'none';
    if (viewPengingat) viewPengingat.style.display = tabName === 'PENGINGAT' ? 'block' : 'none';

    if (mobileTabIndicator) {
      const tabNames = {
        'JADWAL': 'Jadwal',
        'EVAL': 'Penilaian',
        'PEWAWANCARA': 'Pewawancara',
        'PENGINGAT': 'Pengingat H-1'
      };
      mobileTabIndicator.textContent = tabNames[tabName] || tabName;
    }
    if (window.innerWidth <= 960) {
      closeMobileDrawer();
    }

    if (tabName === 'JADWAL') {
      updateSidebarNavActive('JADWAL');
      renderJadwalViewport();
    } else if (tabName === 'EVAL') {
      updateSidebarNavActive('PENILAIAN');
      renderTableRows();
    } else if (tabName === 'PEWAWANCARA') {
      updateSidebarNavActive('PEWAWANCARA');
      renderPewawancaraTable();
    } else if (tabName === 'PENGINGAT') {
      updateSidebarNavActive('PENGINGAT');
      renderPengingatViewport();
    }
  }

  if (btnSubtabJadwal) {
    btnSubtabJadwal.addEventListener('click', () => switchToTab('JADWAL'));
  }
  if (btnSubtabEval) {
    btnSubtabEval.addEventListener('click', () => switchToTab('EVAL'));
  }
  if (btnSubtabPewawancara) {
    btnSubtabPewawancara.addEventListener('click', () => switchToTab('PEWAWANCARA'));
  }
  if (btnSubtabPengingat) {
    btnSubtabPengingat.addEventListener('click', () => switchToTab('PENGINGAT'));
  }

  // Sidebar Menu Items Navigation
  const sideNavDashboard = document.getElementById('side-nav-dashboard');
  const sideNavJadwal = document.getElementById('side-nav-jadwal');
  const sideNavPenilaian = document.getElementById('side-nav-penilaian');
  const sideNavPewawancara = document.getElementById('side-nav-pewawancara');
  const sideNavLaporan = document.getElementById('side-nav-laporan');

  if (sideNavDashboard) {
    sideNavDashboard.addEventListener('click', () => {
      switchToTab('EVAL');
      updateSidebarNavActive('DASHBOARD');
      const statsEl = document.querySelector('.stats-grid-wawancara');
      if (statsEl) statsEl.scrollIntoView({ behavior: 'smooth' });
      showToast('📊 Menampilkan Dashboard & Statistik Wawancara');
    });
  }

  if (sideNavJadwal) {
    sideNavJadwal.addEventListener('click', () => {
      switchToTab('JADWAL');
      const jCard = document.querySelector('.jadwal-card-container');
      if (jCard) jCard.scrollIntoView({ behavior: 'smooth' });
      showToast('📅 Menampilkan Tabel Jadwal Wawancara');
    });
  }

  if (sideNavPenilaian) {
    sideNavPenilaian.addEventListener('click', () => {
      switchToTab('EVAL');
      const evalTable = document.getElementById('table-wawancara');
      if (evalTable) evalTable.scrollIntoView({ behavior: 'smooth' });
      showToast('📋 Menampilkan Lembar Penilaian & Rekapitulasi Wawancara');
    });
  }

  if (sideNavPewawancara) {
    sideNavPewawancara.addEventListener('click', () => {
      switchToTab('PEWAWANCARA');
      showToast('👥 Menampilkan Menu Kelola Tim Pewawancara (Editor)');
    });
  }

  
  // Auto-close mobile drawer saat menu sidebar diklik di smartphone
  const sideNavButtons = document.querySelectorAll('.sidebar-nav-btn, .side-nav-item');
  sideNavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        closeMobileDrawer();
      }
    });
  });

  if (sideNavLaporan) {
    sideNavLaporan.addEventListener('click', () => {
      updateSidebarNavActive('LAPORAN');
      showToast('🖨️ Membuka jendela Cetak Dokumen Resmi Wawancara SPMB...');
      setTimeout(() => {
        window.print();
      }, 300);
    });
  }

  const btnQuickManage = document.getElementById('btn-quick-manage-pewawancara');
  if (btnQuickManage) {
    btnQuickManage.addEventListener('click', () => {
      switchToTab('PEWAWANCARA');
      showToast('👥 Membuka Menu Kelola Pewawancara');
    });
  }

  // Filter & Search Jadwal
  const jadwalSearchInput = document.getElementById('jadwal-search');
  if (jadwalSearchInput) {
    jadwalSearchInput.addEventListener('input', (e) => {
      jadwalSearch = e.target.value;
      renderJadwalViewport();
    });
  }

  const jadwalFilterPewawancaraSelect = document.getElementById('jadwal-filter-pewawancara');
  if (jadwalFilterPewawancaraSelect) {
    jadwalFilterPewawancaraSelect.addEventListener('change', (e) => {
      jadwalFilterPewawancara = e.target.value;
      renderJadwalViewport();
    });
  }

  const jadwalFilterMetodeSelect = document.getElementById('jadwal-filter-metode');
  if (jadwalFilterMetodeSelect) {
    jadwalFilterMetodeSelect.addEventListener('change', (e) => {
      jadwalFilterMetode = e.target.value;
      renderJadwalViewport();
    });
  }

  const jadwalFilterHariSelect = document.getElementById('jadwal-filter-hari');
  if (jadwalFilterHariSelect) {
    jadwalFilterHariSelect.addEventListener('change', (e) => {
      jadwalFilterHari = e.target.value;
      renderJadwalViewport();
    });
  }

  const jadwalFilterJamSelect = document.getElementById('jadwal-filter-jam');
  if (jadwalFilterJamSelect) {
    jadwalFilterJamSelect.addEventListener('change', (e) => {
      jadwalFilterJam = e.target.value;
      renderJadwalViewport();
    });
  }

  const jadwalFilterStatusSelect = document.getElementById('jadwal-filter-status');
  if (jadwalFilterStatusSelect) {
    jadwalFilterStatusSelect.addEventListener('change', (e) => {
      jadwalFilterStatus = e.target.value;
      renderJadwalViewport();
    });
  }

  // Mode Switcher: Tabel Jadwal vs Kalender Jadwal
  const btnModeTable = document.getElementById('btn-jadwal-mode-table');
  const btnModeGrid = document.getElementById('btn-jadwal-mode-grid');
  if (btnModeTable && btnModeGrid) {
    btnModeTable.addEventListener('click', () => {
      jadwalViewMode = 'TABLE';
      btnModeTable.classList.add('active');
      btnModeGrid.classList.remove('active');
      renderJadwalViewport();
    });

    btnModeGrid.addEventListener('click', () => {
      jadwalViewMode = 'CALENDAR';
      btnModeGrid.classList.add('active');
      btnModeTable.classList.remove('active');
      renderJadwalViewport();
    });
  }

  // Print Tabel Jadwal Button
  const btnPrintJadwal = document.getElementById('btn-print-jadwal');
  if (btnPrintJadwal) {
    btnPrintJadwal.addEventListener('click', () => {
      window.print();
    });
  }

  // Sync SSoT Button
  const btnSync = document.getElementById('btn-jadwal-refresh');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      renderWawancara(activeContainerId);
      showToast('✓ Data Tabel Jadwal & Pewawancara berhasil disinkronkan dengan basis data SSoT!');
    });
  }

  // Search & Filter Evaluasi
  const searchInput = document.getElementById('wawancara-search');
  const filterStatus = document.getElementById('wawancara-filter-status');
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

  // Modal Handlers
  const modalCloseBtn = document.getElementById('modal-wawancara-close');
  const modalCancelBtn = document.getElementById('btn-cancel-modal');
  const hafalanInput = document.getElementById('wawancara-hafalan-juz');
  const formModal = document.getElementById('form-penilaian-wawancara');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModalPenilaian);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModalPenilaian);

  const roleSelect = document.getElementById('wawancara-role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      isEditMode = e.target.value === 'EDITING';
      try {
        localStorage.setItem(ROLE_KEY, isEditMode ? 'true' : 'false');
      } catch (err) { }
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

  const statusTesSelect = document.getElementById('wawancara-status-tes-quran');
  const hafalanTerujiInput = document.getElementById('wawancara-hafalan-teruji');

  if (statusTesSelect) {
    statusTesSelect.addEventListener('change', () => {
      const hVal = hafalanTerujiInput ? hafalanTerujiInput.value : 0;
      updateBeasiswaPreview(hVal, statusTesSelect.value);
    });
  }

  if (hafalanTerujiInput) {
    hafalanTerujiInput.addEventListener('input', () => {
      if (hafalanInput) hafalanInput.value = hafalanTerujiInput.value;
      const stVal = statusTesSelect ? statusTesSelect.value : 'Belum Dites';
      updateBeasiswaPreview(hafalanTerujiInput.value, stVal);
    });
  }

  if (hafalanInput) {
    hafalanInput.addEventListener('input', (e) => {
      if (hafalanTerujiInput) hafalanTerujiInput.value = e.target.value;
      const stVal = statusTesSelect ? statusTesSelect.value : 'Belum Dites';
      updateBeasiswaPreview(e.target.value, stVal);
    });
  }

  if (formModal) {
    formModal.addEventListener('submit', handleSaveWawancara);

    // Interaktivitas aspek checkbox & highlight kartu
    formModal.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('aspek-checkbox')) {
        const itemCard = e.target.closest('.aspek-item');
        if (itemCard) {
          if (e.target.checked) itemCard.classList.add('is-checked');
          else itemCard.classList.remove('is-checked');
        }
      }
    });

    // Otomatis centang aspek jika pewawancara mengisi catatan
    formModal.addEventListener('input', (e) => {
      if (e.target && e.target.classList.contains('aspek-catatan-input')) {
        const itemCard = e.target.closest('.aspek-item');
        if (itemCard) {
          const cb = itemCard.querySelector('.aspek-checkbox');
          if (cb && e.target.value.trim().length > 0 && !cb.checked) {
            cb.checked = true;
            itemCard.classList.add('is-checked');
          }
        }
      }
    });
  }

  // Controls & Modal Pewawancara Event Handlers
  const pewSearchInput = document.getElementById('pewawancara-search');
  if (pewSearchInput) {
    pewSearchInput.addEventListener('input', (e) => {
      pewawancaraSearch = e.target.value;
      renderPewawancaraTable();
    });
  }

  const pewFilterStatusSelect = document.getElementById('pewawancara-filter-status');
  if (pewFilterStatusSelect) {
    pewFilterStatusSelect.addEventListener('change', (e) => {
      pewawancaraFilterStatus = e.target.value;
      renderPewawancaraTable();
    });
  }

  const btnOpenTambahPew = document.getElementById('btn-open-modal-tambah-pewawancara');
  if (btnOpenTambahPew) {
    btnOpenTambahPew.addEventListener('click', () => openModalPewawancara(null));
  }

  const modalPewClose = document.getElementById('modal-pewawancara-close');
  const btnCancelModalPew = document.getElementById('btn-cancel-modal-pewawancara');
  const modalPewOverlay = document.getElementById('modal-pewawancara');
  const formPew = document.getElementById('form-pewawancara');

  if (modalPewClose) modalPewClose.addEventListener('click', closeModalPewawancara);
  if (btnCancelModalPew) btnCancelModalPew.addEventListener('click', closeModalPewawancara);
  if (modalPewOverlay) {
    modalPewOverlay.addEventListener('click', (e) => {
      if (e.target === modalPewOverlay) closeModalPewawancara();
    });
  }
  if (formPew) {
    formPew.addEventListener('submit', handleSavePewawancara);
  }

  // Filter & Search Pengingat H-1
  const searchReminderInput = document.getElementById('reminder-search');
  const filterReminderStatus = document.getElementById('reminder-filter-status');
  const filterReminderMedia = document.getElementById('reminder-filter-media');
  const btnRefreshReminders = document.getElementById('btn-refresh-reminders');

  if (searchReminderInput) {
    searchReminderInput.addEventListener('input', (e) => {
      reminderSearch = e.target.value;
      renderPengingatViewport();
    });
  }

  if (filterReminderStatus) {
    filterReminderStatus.addEventListener('change', (e) => {
      reminderFilterStatus = e.target.value;
      renderPengingatViewport();
    });
  }

  if (filterReminderMedia) {
    filterReminderMedia.addEventListener('change', (e) => {
      reminderFilterMedia = e.target.value;
      renderPengingatViewport();
    });
  }

  if (btnRefreshReminders) {
    btnRefreshReminders.addEventListener('click', () => {
      renderPengingatViewport();
      showToast('🔄 Antrean pengingat H-1 berhasil disinkronkan!');
    });
  }

  // Modal Preview Reminder Event Handlers
  const modalPreviewClose = document.getElementById('modal-preview-reminder-close');
  const btnCloseModalPreview = document.getElementById('btn-close-modal-preview');
  const modalPreviewOverlay = document.getElementById('modal-preview-reminder');
  const tabBtnPreviewWa = document.getElementById('tab-btn-preview-wa');
  const tabBtnPreviewEmail = document.getElementById('tab-btn-preview-email');
  const bodyPreviewWa = document.getElementById('preview-body-wa');
  const bodyPreviewEmail = document.getElementById('preview-body-email');
  const btnCopyWa = document.getElementById('btn-copy-wa-text');
  const btnCopyEmail = document.getElementById('btn-copy-email-html');

  if (modalPreviewClose) modalPreviewClose.addEventListener('click', closeModalPreviewReminder);
  if (btnCloseModalPreview) btnCloseModalPreview.addEventListener('click', closeModalPreviewReminder);
  if (modalPreviewOverlay) {
    modalPreviewOverlay.addEventListener('click', (e) => {
      if (e.target === modalPreviewOverlay) closeModalPreviewReminder();
    });
  }

  if (tabBtnPreviewWa && tabBtnPreviewEmail) {
    tabBtnPreviewWa.addEventListener('click', () => {
      activePreviewReminderTab = 'WHATSAPP';
      tabBtnPreviewWa.classList.add('active');
      tabBtnPreviewEmail.classList.remove('active');
      if (bodyPreviewWa) bodyPreviewWa.style.display = 'block';
      if (bodyPreviewEmail) bodyPreviewEmail.style.display = 'none';
    });

    tabBtnPreviewEmail.addEventListener('click', () => {
      activePreviewReminderTab = 'EMAIL';
      tabBtnPreviewEmail.classList.add('active');
      tabBtnPreviewWa.classList.remove('active');
      if (bodyPreviewWa) bodyPreviewWa.style.display = 'none';
      if (bodyPreviewEmail) bodyPreviewEmail.style.display = 'block';
    });
  }

  if (btnCopyWa) {
    btnCopyWa.addEventListener('click', () => {
      const waText = document.getElementById('preview-wa-text')?.textContent || '';
      if (navigator.clipboard && waText) {
        navigator.clipboard.writeText(waText).then(() => {
          showToast('📋 Teks template WhatsApp berhasil disalin!');
        });
      } else {
        showToast('📋 Teks template WhatsApp disalin.');
      }
    });
  }

  if (btnCopyEmail) {
    btnCopyEmail.addEventListener('click', () => {
      const emailHtml = document.getElementById('preview-email-html-container')?.innerHTML || '';
      if (navigator.clipboard && emailHtml) {
        navigator.clipboard.writeText(emailHtml).then(() => {
          showToast('📋 Format HTML Email berhasil disalin!');
        });
      } else {
        showToast('📋 Format HTML Email disalin.');
      }
    });
  }

  // Sync pewawancara select in evaluation modal
  const selectPewTop = document.getElementById('modal-candidate-pewawancara');
  const selectPewBottom = document.getElementById('wawancara-nama-pewawancara');
  if (selectPewTop && selectPewBottom) {
    selectPewTop.addEventListener('change', (e) => {
      selectPewBottom.value = e.target.value;
    });
    selectPewBottom.addEventListener('change', (e) => {
      selectPewTop.value = e.target.value;
    });
  }

  // Toggle Metode Daring vs Luring di Modal Wawancara
  const selectMetodeWawancara = document.getElementById('wawancara-metode-pelaksanaan');
  if (selectMetodeWawancara) {
    selectMetodeWawancara.addEventListener('change', (e) => {
      const isDar = e.target.value === 'Daring';
      const wrapDar = document.getElementById('wrapper-metode-daring');
      const wrapLur = document.getElementById('wrapper-metode-luring');
      if (wrapDar) wrapDar.style.display = isDar ? 'block' : 'none';
      if (wrapLur) wrapLur.style.display = isDar ? 'none' : 'block';
    });
  }

  // Event Handlers untuk Modal Atur Jadwal
  const modalJadwalClose = document.getElementById('modal-jadwal-close');
  const btnCancelJadwal = document.getElementById('btn-cancel-modal-jadwal');
  const modalJadwalOverlay = document.getElementById('modal-edit-jadwal');
  const formJadwal = document.getElementById('form-edit-jadwal');
  const selectJadwalMetode = document.getElementById('jadwal-edit-metode');

  if (modalJadwalClose) modalJadwalClose.addEventListener('click', closeModalEditJadwal);
  if (btnCancelJadwal) btnCancelJadwal.addEventListener('click', closeModalEditJadwal);
  if (modalJadwalOverlay) {
    modalJadwalOverlay.addEventListener('click', (e) => {
      if (e.target === modalJadwalOverlay) closeModalEditJadwal();
    });
  }
  if (formJadwal) {
    formJadwal.addEventListener('submit', handleSaveEditJadwal);
  }
  if (selectJadwalMetode) {
    selectJadwalMetode.addEventListener('change', (e) => {
      const isDar = e.target.value === 'Daring';
      const wrapDar = document.getElementById('jadwal-edit-daring-wrapper');
      const wrapLur = document.getElementById('jadwal-edit-luring-wrapper');
      if (wrapDar) wrapDar.style.display = isDar ? 'block' : 'none';
      if (wrapLur) wrapLur.style.display = isDar ? 'none' : 'block';
    });
  }

  // ========================================================
  // Event Handlers Modal Cetak Anekdotal Record (Tahap 5)
  // ========================================================
  const modalCetakClose = document.getElementById('modal-cetak-anekdotal-close');
  const btnCloseAnekdotalTop = document.getElementById('btn-close-modal-anekdotal-top');
  const btnCloseAnekdotalBottom = document.getElementById('btn-close-modal-anekdotal-bottom');
  const modalCetakOverlay = document.getElementById('modal-cetak-anekdotal');
  const btnPrintAnekdotalTop = document.getElementById('btn-do-print-anekdotal');
  const btnPrintAnekdotalBottom = document.getElementById('btn-do-print-anekdotal-bottom');
  const btnModalCetakPenilaian = document.getElementById('btn-modal-cetak-anekdotal');

  if (modalCetakClose) modalCetakClose.addEventListener('click', closeModalCetakAnekdotal);
  if (btnCloseAnekdotalTop) btnCloseAnekdotalTop.addEventListener('click', closeModalCetakAnekdotal);
  if (btnCloseAnekdotalBottom) btnCloseAnekdotalBottom.addEventListener('click', closeModalCetakAnekdotal);
  if (modalCetakOverlay) {
    modalCetakOverlay.addEventListener('click', (e) => {
      if (e.target === modalCetakOverlay) closeModalCetakAnekdotal();
    });
  }

  if (btnPrintAnekdotalTop) btnPrintAnekdotalTop.addEventListener('click', printCurrentAnekdotal);
  if (btnPrintAnekdotalBottom) btnPrintAnekdotalBottom.addEventListener('click', printCurrentAnekdotal);

  if (btnModalCetakPenilaian) {
    btnModalCetakPenilaian.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = activeCandidateId || e.currentTarget.getAttribute('data-id') || document.getElementById('modal-candidate-id')?.textContent?.trim();
      if (targetId) {
        openModalCetakAnekdotal(targetId);
      } else {
        showToast('Pilih calon siswa terlebih dahulu!', 'error');
      }
    });
  }
}

/**
 * Update Tampilan Preview Rekomendasi Beasiswa pada Form Modal secara Realtime
 */
function updateBeasiswaPreview(juzVal, statusTesVal) {
  const statusInput = document.getElementById('wawancara-status-tes-quran');
  const terujiInput = document.getElementById('wawancara-hafalan-teruji');
  const legacyInput = document.getElementById('wawancara-hafalan-juz');

  const status = statusTesVal !== undefined ? statusTesVal : (statusInput ? statusInput.value : 'Belum Dites');
  const count = juzVal !== undefined ? juzVal : (terujiInput ? terujiInput.value : (legacyInput ? legacyInput.value : 0));

  const rec = calculateBeasiswaRecommendation(count, status);
  const iconEl = document.getElementById('beasiswa-preview-icon');
  const textEl = document.getElementById('beasiswa-preview-text');
  const nominalEl = document.getElementById('beasiswa-preview-nominal');
  const container = document.getElementById('beasiswa-preview-container');

  if (iconEl && textEl) {
    iconEl.textContent = rec.icon;
    textEl.textContent = rec.label;
  }

  if (nominalEl) {
    if (rec.code === 'MENUNGGU_TES') {
      nominalEl.innerHTML = `<span style="color: #b45309; font-size: 0.78rem;">⏳ Hasil tes belum diuji. Rekomendasi beasiswa belum ditetapkan.</span>`;
    } else if (rec.nominal !== null && rec.nominal > 0) {
      nominalEl.innerHTML = `<span style="color: #15803d; font-size: 0.8rem; font-weight: 700;">💰 Potongan SPP: Rp ${rec.nominal.toLocaleString('id-ID')}</span>`;
    } else if (rec.code === 'REGULER') {
      nominalEl.innerHTML = `<span style="color: #475569; font-size: 0.78rem;">SPP reguler standar (tidak ada potongan beasiswa tahfidz)</span>`;
    } else if (rec.code === 'KONFIRMASI_SEKOLAH') {
      nominalEl.innerHTML = `<span style="color: #c2410c; font-size: 0.78rem; font-weight: 700;">⚠️ Kuota & nominal tahfidz > 3 juz memerlukan konfirmasi Kepala Sekolah / Komite</span>`;
    }
  }

  if (container) {
    container.className = `beasiswa-preview-box beasiswa-box-${rec.code.toLowerCase()}`;
  }

  // Update hint & visual feedback
  const hintEl = document.getElementById('hafalan-input-hint');
  if (hintEl) {
    const isSudah = status === 'Sudah Dites';
    hintEl.textContent = isSudah
      ? '✓ Masukkan jumlah juz yang sudah diuji langsung oleh penguji'
      : 'ℹ️ Ubah status menjadi "Sudah Dites" setelah selesai menguji calon siswa';
    hintEl.style.color = isSudah ? '#15803d' : '#64748b';
  }
}

/**
 * Buka Modal Penilaian & Populate Data jika sudah ada
 */

/**
 * State & Handlers Pengelolaan Jadwal (modal-edit-jadwal)
 */
let activeJadwalCandidateId = null;


/**
 * State & Handlers Pengingat H-1 Wawancara
 */
let reminderFilterStatus = 'ALL';
let reminderFilterMedia = 'ALL';
let reminderSearch = '';
let activePreviewReminderCandidateId = null;
let activePreviewReminderTab = 'WHATSAPP';

export function getFilteredReminderCandidates() {
  const allCandidates = getLunasCandidates();

  return allCandidates.filter(c => {
    const sLower = reminderSearch.toLowerCase().trim();
    const matchSearch = !sLower ||
      (c.nama || c.nama_lengkap || '').toLowerCase().includes(sLower) ||
      (c.id || c.id_pendaftar || '').toLowerCase().includes(sLower);

    const rem = computeReminderMetadata(c);

    let matchStatus = true;
    if (reminderFilterStatus !== 'ALL') {
      if (reminderFilterStatus === 'MENUNGGU') matchStatus = rem.status === 'Menunggu Pengiriman';
      else if (reminderFilterStatus === 'BERHASIL') matchStatus = rem.status === 'Berhasil Dikirim';
      else if (reminderFilterStatus === 'GAGAL') matchStatus = rem.status === 'Gagal Dikirim';
      else if (reminderFilterStatus === 'DIBATALKAN') matchStatus = rem.status === 'Dibatalkan';
    }

    let matchMedia = true;
    if (reminderFilterMedia !== 'ALL') {
      const m = (rem.media || '').toUpperCase();
      matchMedia = m.includes(reminderFilterMedia);
    }

    return matchSearch && matchStatus && matchMedia;
  });
}

export function renderPengingatViewport() {
  const viewport = document.getElementById('reminder-content-viewport');
  const statsContainer = document.getElementById('reminder-stats-container');
  if (!viewport) return;

  const allCandidates = getLunasCandidates();
  const filtered = getFilteredReminderCandidates();

  // Hitung statistik
  let totalJadwal = 0;
  let menungguKirim = 0;
  let berhasilKirim = 0;
  let dibatalkan = 0;

  allCandidates.forEach(c => {
    const jw = c.jadwal_wawancara || {};
    if (jw.tanggal) totalJadwal++;
    const rem = computeReminderMetadata(c);
    if (rem.status === 'Menunggu Pengiriman') menungguKirim++;
    else if (rem.status === 'Berhasil Dikirim') berhasilKirim++;
    else if (rem.status === 'Dibatalkan') dibatalkan++;
  });

  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #e0f2fe; color: #0284c7;">📅</div>
        <div>
          <div class="stat-val-w">${totalJadwal}</div>
          <div class="stat-lbl-w">Total Calon Terjadwal</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #fef3c7; color: #d97706;">⏳</div>
        <div>
          <div class="stat-val-w">${menungguKirim}</div>
          <div class="stat-lbl-w">Menunggu Pengiriman H-1</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #dcfce7; color: #16a34a;">✅</div>
        <div>
          <div class="stat-val-w">${berhasilKirim}</div>
          <div class="stat-lbl-w">Berhasil Terkirim</div>
        </div>
      </div>
      <div class="stat-card-w">
        <div class="stat-icon-w" style="background: #f1f5f9; color: #64748b;">🚫</div>
        <div>
          <div class="stat-val-w">${dibatalkan}</div>
          <div class="stat-lbl-w">Dibatalkan / Selesai</div>
        </div>
      </div>
    `;
  }

  if (filtered.length === 0) {
    viewport.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.5rem; color: #64748b;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">🔍</span>
        <strong>Tidak ada data antrean pengingat yang sesuai dengan filter.</strong>
        <p style="font-size: 0.85rem; margin-top: 4px;">Coba ubah filter status, media pengiriman, atau kata kunci pencarian.</p>
      </div>
    `;
    return;
  }

  viewport.innerHTML = `
    <div class="jadwal-table-wrapper">
      <table class="jadwal-table">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">No.</th>
            <th>No. Registrasi</th>
            <th>Nama Calon Siswa</th>
            <th>Hari & Tanggal Wawancara</th>
            <th>Jadwal Pengingat H-1</th>
            <th>Metode & Sesi Wawancara</th>
            <th>Media Pengiriman</th>
            <th>Status Pengingat</th>
            <th style="text-align: center; width: 170px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="reminder-table-body">
          ${filtered.map((c, index) => {
    const jw = c.jadwal_wawancara || {};
    const cId = c.id || c.id_pendaftar || '-';
    const cName = c.nama || c.nama_lengkap || 'Tanpa Nama';
    const asalSekolah = c.asal_sekolah || c.biodata?.asal_sekolah || '-';
    const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
    const rem = computeReminderMetadata(c);
    const tglH1Indo = formatTanggalIndonesia(rem.tanggal_pengingat_h1);

    return `
              <tr>
                <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
                <td><strong style="color: #006837;">${cId}</strong></td>
                <td>
                  <span class="jadwal-candidate-name">${cName}</span>
                  <span style="font-size: 0.74rem; color: #64748b; display: block;">${asalSekolah}</span>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a; font-size: 0.86rem;">${formatTanggalIndonesia(jw.tanggal, jw.hari)}</div>
                  <div class="jadwal-time-pill" style="margin-top: 3px; font-size: 0.74rem;">
                    <span>⏰</span> <strong>${jw.sesi || (jw.jam ? jw.jam + ' WIB' : '08:00 WIB')}</strong>
                  </div>
                </td>
                <td>
                  <div style="font-weight: 800; color: #006837; font-size: 0.86rem;">${tglH1Indo}</div>
                  <span style="font-size: 0.72rem; color: #64748b; display: block;">Pukul 08:00 WIB (Asia/Jakarta)</span>
                </td>
                <td>
                  <span class="badge-metode ${isDaring ? 'badge-metode-daring' : 'badge-metode-luring'}" style="margin-bottom: 3px;">
                    ${isDaring ? '🌐 Daring' : '🏢 Luring'}
                  </span>
                  <div style="font-size: 0.74rem; color: #475569; font-weight: 600;">
                    ${isDaring ? (jw.platform || 'Google Meet') : (jw.ruang ? jw.ruang.split('(')[0].trim() : 'Ruang Wawancara 1')}
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">💬 WA</span>
                    <span style="background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">✉️ Email</span>
                  </div>
                </td>
                <td>
                  <span class="${rem.status_badge_class}" title="${rem.alasan}">
                    ${rem.status === 'Menunggu Pengiriman' ? '⏳ Menunggu H-1' :
        rem.status === 'Berhasil Dikirim' ? ((rem.metode_kirim && rem.metode_kirim.includes('Manual')) ? '✅ Terkirim Ulang (Manual)' : '✅ Terkirim Otomatis (H-1)') :
          rem.status === 'Gagal Dikirim' ? '❌ Gagal Dikirim' :
            rem.status === 'Dibatalkan' ? '🚫 Dibatalkan' :
              'Belum Dijadwalkan'}
                  </span>
                  ${rem.waktu_aktual_kirim ? `<span style="font-size: 0.7rem; color: #15803d; display: block; margin-top: 2px;">Terkirim: ${rem.waktu_aktual_kirim.slice(0, 16).replace('T', ' ')} WIB${rem.jumlah_kirim > 1 ? ` (${rem.jumlah_kirim}x)` : ''}</span>` : ''}
                  ${rem.status === 'Gagal Dikirim' && rem.error_log ? `<span style="font-size: 0.68rem; color: #b91c1c; display: block; margin-top: 2px;">${rem.error_log}</span>` : ''}
                </td>
                <td style="text-align: center;">
                  <div style="display: flex; gap: 4px; justify-content: center;">
                    <button class="btn btn-secondary btn-preview-reminder" data-id="${cId}" title="Lihat template pesan WhatsApp & Email" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;">
                      👁️ Preview
                    </button>
                    <button class="btn btn-secondary btn-test-reminder-api" data-id="${cId}" title="Kirim ulang pengingat jadwal wawancara secara manual via WhatsApp & Email" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700; background: #f0fdf4; color: #166534; border-color: #bbf7d0; cursor: pointer;">
                      ${rem.status === 'Berhasil Dikirim' ? '🔄 Kirim Ulang' : '📨 Kirim Manual'}
                    </button>
                  </div>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Pasang event listener preview dan test API
  viewport.querySelectorAll('.btn-preview-reminder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openModalPreviewReminder(id);
    });
  });

  viewport.querySelectorAll('.btn-test-reminder-api').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleTestReminderApi(id);
    });
  });
}


/**
 * State & Handlers Cetak Anekdotal Record Siswa
 */
let activeAnekdotalCandidateId = null;

export function openModalCetakAnekdotal(candidateId) {
  if (!candidateId) {
    showToast('Pilih calon siswa terlebih dahulu!', 'error');
    return;
  }
  activeAnekdotalCandidateId = candidateId;
  if (typeof window !== 'undefined') window.activeAnekdotalCandidateId = candidateId;

  let c = null;
  const allCandidates = typeof getPendaftarSSoT === 'function' ? getPendaftarSSoT() : [];
  c = allCandidates.find(item => (item.id || item.id_pendaftar) === candidateId);

  if (!c) {
    try {
      const raw = localStorage.getItem('spmb_pendaftar_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        c = parsed.find(item => (item.id || item.id_pendaftar) === candidateId);
      }
    } catch (e) {}
  }

  if (!c) {
    showToast(`Data calon siswa (${candidateId}) tidak ditemukan!`, 'error');
    return;
  }

  const cName = c.nama || c.nama_lengkap || '-';
  const cId = c.id || c.id_pendaftar || '-';

  const titleEl = document.getElementById('modal-anekdotal-candidate-title');
  if (titleEl) {
    titleEl.textContent = `Calon Siswa: ${cName} (${cId}) | Dokumen Observasi BK & Wawancara`;
  }

  // Generate Dokumen HTML A4
  const docHtml = generateAnekdotalRecordHTML(c);

  const previewWrapper = document.getElementById('anekdotal-modal-preview-wrapper');
  if (previewWrapper) {
    previewWrapper.innerHTML = docHtml;
  }

  // Mount ke elemen khusus cetak
  const printMount = document.getElementById('anekdotal-print-mount');
  if (printMount) {
    printMount.innerHTML = docHtml;
  }

  const modal = document.getElementById('modal-cetak-anekdotal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
  }
}

export function closeModalCetakAnekdotal() {
  const modal = document.getElementById('modal-cetak-anekdotal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
  activeAnekdotalCandidateId = null;
  if (typeof window !== 'undefined') window.activeAnekdotalCandidateId = null;
}

export function printCurrentAnekdotal() {
  if (!activeAnekdotalCandidateId) {
    showToast('Pilih calon siswa terlebih dahulu!', 'error');
    return;
  }
  // Panggil browser window.print()
  window.print();
}

// Window global exposure
if (typeof window !== 'undefined') {
  window.openModalCetakAnekdotal = openModalCetakAnekdotal;
  window.closeModalCetakAnekdotal = closeModalCetakAnekdotal;
  window.printCurrentAnekdotal = printCurrentAnekdotal;
}

export function openModalPreviewReminder(candidateId) {
  activePreviewReminderCandidateId = candidateId;
  if (typeof window !== 'undefined') window.activePreviewReminderCandidateId = candidateId;
  const allCandidates = getPendaftarSSoT();
  const c = allCandidates.find(item => (item.id || item.id_pendaftar) === candidateId);
  if (!c) {
    showToast('Data calon siswa tidak ditemukan!', 'error');
    return;
  }

  const jw = c.jadwal_wawancara || {};
  const cName = c.nama || c.nama_lengkap || '-';
  const cId = c.id || c.id_pendaftar || '-';
  const rem = computeReminderMetadata(c);

  const infoEl = document.getElementById('preview-reminder-candidate-info');
  if (infoEl) infoEl.textContent = `Calon Siswa: ${cName} (${cId}) | Jadwal: ${formatTanggalIndonesia(jw.tanggal, jw.hari)} ${jw.jam || '08:00'} WIB`;

  const metaJadwal = document.getElementById('preview-meta-jadwal-kirim');
  if (metaJadwal) metaJadwal.textContent = `${formatTanggalIndonesia(rem.tanggal_pengingat_h1)} pukul 08:00 WIB (Asia/Jakarta)`;

  const metaStatus = document.getElementById('preview-meta-status');
  if (metaStatus) metaStatus.innerHTML = `<span class="${rem.status_badge_class}">${rem.status === 'Berhasil Dikirim' ? ((rem.metode_kirim && rem.metode_kirim.includes('Manual')) ? '✅ Terkirim Ulang (Manual)' : '✅ Terkirim Otomatis (H-1)') : rem.status}</span>`;

  const metaIdem = document.getElementById('preview-meta-idempotency');
  if (metaIdem) metaIdem.textContent = `${rem.metode_kirim || 'Otomatis H-1'}${rem.jumlah_kirim > 1 ? ` (${rem.jumlah_kirim}x dikirim)` : ''}`;

  const metaKontak = document.getElementById('preview-meta-kontak');
  if (metaKontak) {
    const noWa = c.telepon || c.biodata?.no_hp || c.kontak?.no_wa || '08xxxxxxxxxx';
    const email = c.email || c.biodata?.email || 'siswa@example.com';
    metaKontak.textContent = `WA: ${noWa} | Email: ${email}`;
  }

  // Teks WhatsApp
  const waText = generateWhatsAppMessage(c);
  const waEl = document.getElementById('preview-wa-text');
  if (waEl) waEl.textContent = waText;

  // Email HTML
  const emailObj = generateEmailMessage(c);
  const emailSubjEl = document.getElementById('preview-email-subject');
  if (emailSubjEl) emailSubjEl.textContent = emailObj.subject;
  const emailHtmlEl = document.getElementById('preview-email-html-container');
  if (emailHtmlEl) emailHtmlEl.innerHTML = emailObj.htmlBody;

  // Set default tab WhatsApp
  activePreviewReminderTab = 'WHATSAPP';
  const tabWa = document.getElementById('tab-btn-preview-wa');
  const tabEmail = document.getElementById('tab-btn-preview-email');
  const bodyWa = document.getElementById('preview-body-wa');
  const bodyEmail = document.getElementById('preview-body-email');
  if (tabWa) tabWa.classList.add('active');
  if (tabEmail) tabEmail.classList.remove('active');
  if (bodyWa) bodyWa.style.display = 'block';
  if (bodyEmail) bodyEmail.style.display = 'none';

  const modal = document.getElementById('modal-preview-reminder');
  if (modal) modal.style.display = 'flex';
}

export function closeModalPreviewReminder() {
  const modal = document.getElementById('modal-preview-reminder');
  if (modal) modal.style.display = 'none';
  activePreviewReminderCandidateId = null;
}

export async function handleTestReminderApi(candidateId) {
  const allCandidates = getPendaftarSSoT();
  const c = allCandidates.find(item => (item.id || item.id_pendaftar) === candidateId);
  if (!c) {
    showToast('Data calon siswa tidak ditemukan!', 'error');
    return;
  }

  const cName = c.nama || c.nama_lengkap || candidateId;
  const currentRem = computeReminderMetadata(c);
  const result = await dispatchReminderToBackend(c);

  if (result.success) {
    const nextCount = (currentRem.status === 'Berhasil Dikirim' ? (currentRem.jumlah_kirim || 1) + 1 : 1);
    const metodeLabel = nextCount > 1 ? 'Kirim Ulang Manual (Admin)' : 'Kirim Manual (Admin)';

    // Simpan status sukses ke SSoT
    const dbData = db.get() || { pendaftar: [] };
    const idx = dbData.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === candidateId);
    if (idx !== -1) {
      if (!dbData.pendaftar[idx].pengingat_wawancara) dbData.pendaftar[idx].pengingat_wawancara = {};
      dbData.pendaftar[idx].pengingat_wawancara.status = 'Berhasil Dikirim';
      dbData.pendaftar[idx].pengingat_wawancara.metode_kirim = metodeLabel;
      dbData.pendaftar[idx].pengingat_wawancara.jumlah_kirim = nextCount;
      dbData.pendaftar[idx].pengingat_wawancara.waktu_aktual_kirim = result.timestamp;
      dbData.pendaftar[idx].pengingat_wawancara.external_message_id = result.external_message_id;
      db.save(dbData);
    }

    // Sinkronkan juga ke spmb_pendaftar_db jika ada
    try {
      const pRaw = localStorage.getItem('spmb_pendaftar_db');
      if (pRaw) {
        const pList = JSON.parse(pRaw);
        const pIdx = pList.findIndex(p => (p.id_pendaftar === candidateId || p.id === candidateId));
        if (pIdx !== -1) {
          if (!pList[pIdx].pengingat_wawancara) pList[pIdx].pengingat_wawancara = {};
          pList[pIdx].pengingat_wawancara.status = 'Berhasil Dikirim';
          pList[pIdx].pengingat_wawancara.metode_kirim = metodeLabel;
          pList[pIdx].pengingat_wawancara.jumlah_kirim = nextCount;
          pList[pIdx].pengingat_wawancara.waktu_aktual_kirim = result.timestamp;
          localStorage.setItem('spmb_pendaftar_db', JSON.stringify(pList));
        }
      }
    } catch (e) {}

    renderPengingatViewport();

    // Perbarui metadata di modal preview jika sedang terbuka
    if (activePreviewReminderCandidateId === candidateId) {
      const metaStatus = document.getElementById('preview-meta-status');
      if (metaStatus) metaStatus.innerHTML = `<span class="badge-status-success">✅ Terkirim Ulang (Manual)</span>`;
      const metaIdem = document.getElementById('preview-meta-idempotency');
      if (metaIdem) metaIdem.textContent = `${metodeLabel} (${nextCount}x dikirim)`;
    }

    showToast(`✅ Pengingat wawancara untuk ${cName} berhasil dikirim ulang secara manual via WhatsApp & Email!`);
  } else {
    showToast(`❌ Gagal mengirim pengingat: ${result.error}`, 'error');
  }
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.openModalPreviewReminder = openModalPreviewReminder;
  window.closeModalPreviewReminder = closeModalPreviewReminder;
  window.handleTestReminderApi = handleTestReminderApi;
}

export function openModalEditJadwal(candidateId) {
  activeJadwalCandidateId = candidateId;
  const allCandidates = getPendaftarSSoT();
  const c = allCandidates.find(item => (item.id || item.id_pendaftar) === candidateId);
  if (!c) {
    showToast('Data calon siswa tidak ditemukan!', 'error');
    return;
  }

  const jw = c.jadwal_wawancara || {};
  const cName = c.nama || c.nama_lengkap || '-';
  const cId = c.id || c.id_pendaftar || '-';
  const cJurusan = c.pilihan_jurusan || c.biodata?.pilihan_jurusan || 'MIPA';

  const nameEl = document.getElementById('modal-jadwal-candidate-name');
  if (nameEl) nameEl.textContent = cName;
  const infoEl = document.getElementById('modal-jadwal-candidate-info');
  if (infoEl) infoEl.textContent = `No. Registrasi: ${cId} | Peminatan: ${cJurusan}`;

  const tglInput = document.getElementById('jadwal-edit-tanggal');
  if (tglInput) tglInput.value = jw.tanggal || '';
  const jamInput = document.getElementById('jadwal-edit-jam');
  if (jamInput) jamInput.value = jw.jam || '08:00';

  const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
  const selectMetode = document.getElementById('jadwal-edit-metode');
  if (selectMetode) selectMetode.value = isDaring ? 'Daring' : 'Luring';

  const selectPlatform = document.getElementById('jadwal-edit-platform');
  if (selectPlatform) selectPlatform.value = jw.platform || 'Google Meet';

  const inputLink = document.getElementById('jadwal-edit-link');
  if (inputLink) inputLink.value = jw.link_meeting || '';

  const inputRuang = document.getElementById('jadwal-edit-ruang');
  if (inputRuang) inputRuang.value = jw.ruang || 'Ruang Wawancara 1 (Gedung Utama)';

  // Populate pewawancara
  const pewList = getActivePewawancaraList();
  const selectPew = document.getElementById('jadwal-edit-pewawancara');
  if (selectPew) {
    selectPew.innerHTML = pewList.map(p => `
      <option value="${p.nama}" ${(jw.pewawancara || '').toLowerCase().includes(p.nama.toLowerCase()) ? 'selected' : ''}>
        ${p.nama} (${p.peran || p.gelar || ''})
      </option>
    `).join('');
  }

  // Toggle daring vs luring in jadwal edit modal
  const wrapDar = document.getElementById('jadwal-edit-daring-wrapper');
  const wrapLur = document.getElementById('jadwal-edit-luring-wrapper');
  if (wrapDar) wrapDar.style.display = isDaring ? 'block' : 'none';
  if (wrapLur) wrapLur.style.display = isDaring ? 'none' : 'block';

  const modal = document.getElementById('modal-edit-jadwal');
  if (modal) modal.style.display = 'flex';
}

export function closeModalEditJadwal() {
  const modal = document.getElementById('modal-edit-jadwal');
  if (modal) modal.style.display = 'none';
  activeJadwalCandidateId = null;
}

export function handleSaveEditJadwal(e) {
  e.preventDefault();
  if (!activeJadwalCandidateId) return;

  const tanggal = document.getElementById('jadwal-edit-tanggal').value;
  const jam = document.getElementById('jadwal-edit-jam').value;
  const metode = document.getElementById('jadwal-edit-metode').value;
  const platform = document.getElementById('jadwal-edit-platform').value;
  const linkMeeting = (document.getElementById('jadwal-edit-link').value || '').trim();
  const ruang = (document.getElementById('jadwal-edit-ruang').value || '').trim();
  const pewawancara = document.getElementById('jadwal-edit-pewawancara').value;

  const hariNama = getNamaHariFromDate(tanggal);
  const isWeekend = ['Sabtu', 'Minggu'].includes(hariNama);

  // Update ke basis data terpusat SSoT
  const dbData = db.get() || { pendaftar: [] };
  const targetIndex = dbData.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === activeJadwalCandidateId);

  if (targetIndex !== -1) {
    if (!dbData.pendaftar[targetIndex].jadwal_wawancara) {
      dbData.pendaftar[targetIndex].jadwal_wawancara = {};
    }

    const jwObj = dbData.pendaftar[targetIndex].jadwal_wawancara;
    jwObj.tanggal = tanggal;
    jwObj.jam = jam;
    jwObj.sesi = `${jam} WIB`;
    jwObj.hari = hariNama;
    jwObj.tipe_hari = isWeekend ? 'Weekend' : 'Weekday';
    jwObj.metode = metode;
    jwObj.pewawancara = pewawancara;
    if (metode === 'Daring') {
      jwObj.platform = platform || 'Google Meet';
      jwObj.link_meeting = linkMeeting;
      jwObj.ruang = `${platform || 'Google Meet'} (Daring Online)`;
    } else {
      jwObj.platform = '';
      jwObj.link_meeting = '';
      jwObj.ruang = ruang || 'Ruang Wawancara 1 (Gedung Utama)';
    }

    // Sinkronisasi Reaktif Pengingat H-1 di SSoT
    const h1Date = getHMinusOneDate(tanggal);
    if (!dbData.pendaftar[targetIndex].pengingat_wawancara) {
      dbData.pendaftar[targetIndex].pengingat_wawancara = {};
    }
    const remObj = dbData.pendaftar[targetIndex].pengingat_wawancara;
    remObj.tanggal_jadwal = tanggal;
    remObj.jam_jadwal = jam;
    remObj.tanggal_pengingat_h1 = h1Date;
    remObj.waktu_jadwal_kirim = `${h1Date}T08:00:00+07:00`;
    remObj.id_pengingat = generateReminderIdempotencyKey(activeJadwalCandidateId, tanggal);
    remObj.media = remObj.media || 'WhatsApp & Email';
    // Jika tanggal diubah, reset status pengingat ke Menunggu Pengiriman jika sebelumnya belum terkirim
    if (remObj.status !== 'Berhasil Dikirim') {
      remObj.status = 'Menunggu Pengiriman';
    }

    db.save(dbData);
  }

  // Sinkronkan ke spmb_pendaftar_db
  try {
    const pRaw = localStorage.getItem('spmb_pendaftar_db');
    if (pRaw) {
      const pList = JSON.parse(pRaw);
      const pIdx = pList.findIndex(p => (p.id_pendaftar === activeJadwalCandidateId || p.id === activeJadwalCandidateId));
      if (pIdx !== -1) {
        if (!pList[pIdx].jadwal_wawancara) pList[pIdx].jadwal_wawancara = {};
        pList[pIdx].jadwal_wawancara.tanggal = tanggal;
        pList[pIdx].jadwal_wawancara.jam = jam;
        pList[pIdx].jadwal_wawancara.hari = hariNama;
        pList[pIdx].jadwal_wawancara.metode = metode;
        pList[pIdx].jadwal_wawancara.pewawancara = pewawancara;
        if (metode === 'Daring') {
          pList[pIdx].jadwal_wawancara.platform = platform || 'Google Meet';
          pList[pIdx].jadwal_wawancara.link_meeting = linkMeeting;
        }
        localStorage.setItem('spmb_pendaftar_db', JSON.stringify(pList));
      }
    }
  } catch (err) { }

  closeModalEditJadwal();
  renderWawancara(activeContainerId);
  showToast(`✅ Jadwal wawancara untuk ${activeJadwalCandidateId} berhasil diperbarui di SSoT!`);
}

// Make accessible to window if needed
if (typeof window !== 'undefined') {
  window.openModalEditJadwal = openModalEditJadwal;
  window.closeModalEditJadwal = closeModalEditJadwal;
}

export function openModalPenilaian(candidateId) {
  activeCandidateId = candidateId;
  if (typeof window !== 'undefined') window.activeCandidateId = candidateId;
  const allCandidates = getPendaftarSSoT();
  const candidate = allCandidates.find(c => (c.id || c.id_pendaftar) === candidateId);

  if (!candidate) {
    showToast('Data calon siswa tidak ditemukan!', 'error');
    return;
  }

  // Set Modal Info Header
  document.getElementById('modal-candidate-name').textContent = candidate.nama || candidate.nama_lengkap || '-';
  document.getElementById('modal-candidate-id').textContent = candidate.id || candidate.id_pendaftar || '-';
  document.getElementById('modal-candidate-jurusan').textContent = candidate.pilihan_jurusan || candidate.biodata?.pilihan_jurusan || 'MIPA';

  const existingW = candidate.dataWawancara || {};
  const currentPewawancara = existingW.pewawancara || candidate.jadwal_wawancara?.pewawancara || 'Yosa';

  // Dynamic Pewawancara Options in Modal
  const pewList = getPewawancaraList();
  const selectPewawancaraTop = document.getElementById('modal-candidate-pewawancara');
  if (selectPewawancaraTop) {
    selectPewawancaraTop.innerHTML = pewList.map(p => `
      <option value="${p.nama}" ${currentPewawancara.toLowerCase().includes(p.nama.toLowerCase()) ? 'selected' : ''}>
        ${(p.nama.toLowerCase().includes('veli') || p.nama.toLowerCase().includes('fatimah')) ? '👩‍🏫' : '👨‍🏫'} ${p.nama} (${p.gelar || ''})
      </option>
    `).join('');
    if (!pewList.some(p => currentPewawancara.toLowerCase().includes(p.nama.toLowerCase())) && pewList.length > 0) {
      selectPewawancaraTop.value = pewList[0].nama;
    }
  }

  const selectPewawancaraBottom = document.getElementById('wawancara-nama-pewawancara');
  if (selectPewawancaraBottom) {
    selectPewawancaraBottom.innerHTML = pewList.map(p => `
      <option value="${p.nama}" ${currentPewawancara.toLowerCase().includes(p.nama.toLowerCase()) ? 'selected' : ''}>
        ${(p.nama.toLowerCase().includes('veli') || p.nama.toLowerCase().includes('fatimah')) ? '👩‍🏫' : '👨‍🏫'} ${p.nama_lengkap || p.nama}
      </option>
    `).join('');
    if (!pewList.some(p => currentPewawancara.toLowerCase().includes(p.nama.toLowerCase())) && pewList.length > 0) {
      selectPewawancaraBottom.value = pewList[0].nama;
    }
  }

  // Tampilkan Metode & Ruang di Modal Header
  const jw = candidate.jadwal_wawancara || {};
  const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
  const metodeRuangEl = document.getElementById('modal-candidate-metode-ruang');
  if (metodeRuangEl) {
    metodeRuangEl.innerHTML = `
      <span class="badge-metode ${isDaring ? 'badge-metode-daring' : 'badge-metode-luring'}" style="padding: 2px 7px; font-size: 0.72rem;">
        ${isDaring ? '🌐 Daring' : '🏢 Luring'}
      </span>
      <span style="font-size: 0.78rem; color: #475569; margin-left: 4px;">${jw.ruang ? jw.ruang.split('(')[0].trim() : '-'}</span>
    `;
  }

  const selectMetode = document.getElementById('wawancara-metode-pelaksanaan');
  if (selectMetode) {
    selectMetode.value = isDaring ? 'Daring' : 'Luring';
  }

  // Populate Platform, Link Meeting, Ruangan, Tanggal, Jam
  const selectPlatform = document.getElementById('wawancara-platform');
  if (selectPlatform) {
    selectPlatform.value = jw.platform || 'Google Meet';
  }
  const inputLinkMeet = document.getElementById('wawancara-link-meeting');
  if (inputLinkMeet) {
    inputLinkMeet.value = jw.link_meeting || '';
  }
  const inputRuang = document.getElementById('wawancara-ruang');
  if (inputRuang) {
    inputRuang.value = jw.ruang || 'Ruang Wawancara 1 (Gedung Utama)';
  }
  const inputTanggal = document.getElementById('wawancara-jadwal-tanggal');
  if (inputTanggal) {
    inputTanggal.value = jw.tanggal || '';
  }
  const inputJam = document.getElementById('wawancara-jadwal-jam');
  if (inputJam) {
    inputJam.value = jw.jam || '08:00';
  }

  // Toggle Daring vs Luring wrappers in modal
  const wrapDaring = document.getElementById('wrapper-metode-daring');
  const wrapLuring = document.getElementById('wrapper-metode-luring');
  if (wrapDaring) wrapDaring.style.display = isDaring ? 'block' : 'none';
  if (wrapLuring) wrapLuring.style.display = isDaring ? 'none' : 'block';

  // Populate fields
  document.getElementById('wawancara-nilai-siswa').value = existingW.nilai_siswa !== undefined ? existingW.nilai_siswa : '';
  document.getElementById('wawancara-catatan-siswa').value = existingW.catatan_siswa || '';
  document.getElementById('wawancara-nilai-wali').value = existingW.nilai_wali !== undefined ? existingW.nilai_wali : '';
  document.getElementById('wawancara-catatan-wali').value = existingW.catatan_wali || '';

  // Aspek Penilaian Wawancara & Catatan per Aspek
  const rawAspek = existingW.aspek_penilaian || existingW.peminatan_bakat || [];
  const catatanAspek = existingW.catatan_aspek || {};

  // Normalisasi & kompatibilitas data penilaian lama:
  // Kategori lama: "Sains", "Bahasa", "Sosial", "IT", "Seni", "Olahraga"
  // Kategori baru: "Kepribadian", "Bahasa & Komunikasi", "Sosial", "Bakat & Minat", "Ibadah"
  const normalizedAspek = [];
  rawAspek.forEach(item => {
    if (item === 'Bahasa') {
      if (!normalizedAspek.includes('Bahasa & Komunikasi')) normalizedAspek.push('Bahasa & Komunikasi');
    } else if (item === 'Sains' || item === 'IT' || item === 'Seni' || item === 'Olahraga') {
      if (!normalizedAspek.includes('Bakat & Minat')) normalizedAspek.push('Bakat & Minat');
    } else {
      if (!normalizedAspek.includes(item)) normalizedAspek.push(item);
    }
  });

  // Populate checkboxes aspek penilaian
  document.querySelectorAll('.aspek-checkbox').forEach(cb => {
    const isChecked = normalizedAspek.includes(cb.value);
    cb.checked = isChecked;
    const itemCard = cb.closest('.aspek-item');
    if (itemCard) {
      if (isChecked) itemCard.classList.add('is-checked');
      else itemCard.classList.remove('is-checked');
    }
  });

  // Populate catatan masing-masing aspek
  document.querySelectorAll('.aspek-catatan-input').forEach(input => {
    const aspekKey = input.getAttribute('data-aspek');
    input.value = (aspekKey && catatanAspek[aspekKey]) ? catatanAspek[aspekKey] : '';
  });

  // Status Tes Al-Qur'an & Hafalan Teruji
  // Jangan otomatis menganggap jumlah hafalan pada data lama sudah melalui tes Al-Qur'an.
  const statusTesQuran = existingW.status_tes_quran || 'Belum Dites';
  const selectStatusTes = document.getElementById('wawancara-status-tes-quran');
  if (selectStatusTes) {
    selectStatusTes.value = statusTesQuran;
  }

  // Hafalan yang diuji (hasil tes langsung) vs Hafalan dilaporkan
  const hafalanTeruji = existingW.hafalan_teruji !== undefined
    ? existingW.hafalan_teruji
    : (existingW.status_tes_quran === 'Sudah Dites' ? (existingW.hafalan_juz || 0) : 0);

  const inputTeruji = document.getElementById('wawancara-hafalan-teruji');
  if (inputTeruji) {
    inputTeruji.value = hafalanTeruji;
  }
  const inputHafalanLegacy = document.getElementById('wawancara-hafalan-juz');
  if (inputHafalanLegacy) {
    inputHafalanLegacy.value = hafalanTeruji;
  }

  // Tampilkan informasi hafalan yang dilaporkan pendaftar saat registrasi
  const hafalanDilaporkan = candidate.hafalan_dilaporkan !== undefined
    ? candidate.hafalan_dilaporkan
    : (candidate.hafalan_juz !== undefined
      ? candidate.hafalan_juz
      : (existingW.hafalan_dilaporkan !== undefined
        ? existingW.hafalan_dilaporkan
        : (existingW.hafalan_juz || 0)));

  const reportedEl = document.getElementById('modal-hafalan-dilaporkan');
  if (reportedEl) {
    reportedEl.textContent = `${hafalanDilaporkan} Juz`;
  }

  updateBeasiswaPreview(hafalanTeruji, statusTesQuran);

  // Rekomendasi Akhir
  document.getElementById('wawancara-rekomendasi-akhir').value = existingW.rekomendasi_akhir || 'LAYAK';
  const cpEl = document.getElementById('wawancara-catatan-pendampingan');
  if (cpEl) cpEl.value = existingW.catatan_pendampingan || '';

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
export function closeModalPenilaian() {
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

  // Pewawancara yang ditugaskan (Yosa / Veli)
  const pewawancaraVal = document.getElementById('wawancara-nama-pewawancara')?.value || document.getElementById('modal-candidate-pewawancara')?.value || 'Yosa';

  // Metode pelaksanaan wawancara
  const metodeVal = document.getElementById('wawancara-metode-pelaksanaan')?.value || 'Luring';

  // Aspek penilaian yang dipilih (checkboxes, bisa lebih dari satu)
  const aspekSelected = [];
  document.querySelectorAll('.aspek-checkbox:checked').forEach(cb => {
    if (!aspekSelected.includes(cb.value)) {
      aspekSelected.push(cb.value);
    }
  });

  // Catatan untuk masing-masing aspek
  const catatanAspek = {};
  document.querySelectorAll('.aspek-catatan-input').forEach(input => {
    const aspekKey = input.getAttribute('data-aspek');
    if (aspekKey) {
      catatanAspek[aspekKey] = input.value.trim();
    }
  });

  const statusTesVal = document.getElementById('wawancara-status-tes-quran')?.value || 'Belum Dites';
  const hafalanTerujiVal = parseFloat(document.getElementById('wawancara-hafalan-teruji')?.value || document.getElementById('wawancara-hafalan-juz')?.value) || 0;

  const beasiswaObj = calculateBeasiswaRecommendation(hafalanTerujiVal, statusTesVal);
  const rekomendasiAkhir = document.getElementById('wawancara-rekomendasi-akhir').value;
  const catatanPendampingan = (document.getElementById('wawancara-catatan-pendampingan')?.value || '').trim();

  // Hitung nilai akhir wawancara (rata-rata nilai siswa dan wali)
  const avgNilaiWawancara = Math.round((nilaiSiswa + nilaiWali) / 2);

  // Update ke database terpusat SSoT
  const dbData = db.get() || { pendaftar: [] };
  const targetIndex = dbData.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === activeCandidateId);

  const targetCandidate = targetIndex !== -1 ? dbData.pendaftar[targetIndex] : null;
  const hafalanDilaporkanVal = targetCandidate?.hafalan_dilaporkan !== undefined
    ? targetCandidate.hafalan_dilaporkan
    : (targetCandidate?.hafalan_juz !== undefined ? targetCandidate.hafalan_juz : (targetCandidate?.dataWawancara?.hafalan_dilaporkan || targetCandidate?.dataWawancara?.hafalan_juz || 0));

  const wawancaraPayload = {
    nilai_siswa: nilaiSiswa,
    catatan_siswa: catatanSiswa,
    nilai_wali: nilaiWali,
    catatan_wali: catatanWali,
    aspek_penilaian: aspekSelected,
    catatan_aspek: catatanAspek,
    peminatan_bakat: aspekSelected, // Kompatibilitas data penilaian lama
    status_tes_quran: statusTesVal,
    hafalan_teruji: hafalanTerujiVal,
    hafalan_juz: statusTesVal === 'Sudah Dites' ? hafalanTerujiVal : (targetCandidate?.dataWawancara?.hafalan_juz || 0), // Kompatibilitas legacy
    hafalan_dilaporkan: hafalanDilaporkanVal,
    rekomendasi_beasiswa: beasiswaObj.label,
    rekomendasi_beasiswa_code: beasiswaObj.code,
    nominal_beasiswa: beasiswaObj.nominal,
    is_beasiswa_final: beasiswaObj.isFinal,
    rekomendasi_akhir: rekomendasiAkhir,
    catatan_pendampingan: catatanPendampingan,
    pewawancara: pewawancaraVal,
    metode: metodeVal,
    tanggal_wawancara: new Date().toISOString()
  };

  if (targetIndex !== -1) {
    dbData.pendaftar[targetIndex].statusWawancara = "SELESAI";
    dbData.pendaftar[targetIndex].status_wawancara = "SELESAI";
    dbData.pendaftar[targetIndex].nilai_wawancara = avgNilaiWawancara;
    dbData.pendaftar[targetIndex].dataWawancara = wawancaraPayload;

    if (!dbData.pendaftar[targetIndex].jadwal_wawancara) {
      dbData.pendaftar[targetIndex].jadwal_wawancara = {};
    }
    const platformVal = document.getElementById('wawancara-platform')?.value || (metodeVal === 'Daring' ? 'Google Meet' : '');
    const linkMeetingVal = (document.getElementById('wawancara-link-meeting')?.value || '').trim();
    const ruangInputVal = (document.getElementById('wawancara-ruang')?.value || '').trim();
    const tanggalInputVal = document.getElementById('wawancara-jadwal-tanggal')?.value;
    const jamInputVal = document.getElementById('wawancara-jadwal-jam')?.value;

    dbData.pendaftar[targetIndex].jadwal_wawancara.pewawancara = pewawancaraVal;
    dbData.pendaftar[targetIndex].jadwal_wawancara.metode = metodeVal;
    if (metodeVal === 'Daring') {
      dbData.pendaftar[targetIndex].jadwal_wawancara.platform = platformVal || 'Google Meet';
      dbData.pendaftar[targetIndex].jadwal_wawancara.link_meeting = linkMeetingVal;
      dbData.pendaftar[targetIndex].jadwal_wawancara.ruang = `${platformVal || 'Google Meet'} (Daring Online)`;
    } else {
      dbData.pendaftar[targetIndex].jadwal_wawancara.platform = '';
      dbData.pendaftar[targetIndex].jadwal_wawancara.link_meeting = '';
      dbData.pendaftar[targetIndex].jadwal_wawancara.ruang = ruangInputVal || 'Ruang Wawancara 1 (Gedung Utama)';
    }

    if (tanggalInputVal) {
      dbData.pendaftar[targetIndex].jadwal_wawancara.tanggal = tanggalInputVal;
      dbData.pendaftar[targetIndex].jadwal_wawancara.hari = getNamaHariFromDate(tanggalInputVal);
      dbData.pendaftar[targetIndex].jadwal_wawancara.tipe_hari = ['Sabtu', 'Minggu'].includes(dbData.pendaftar[targetIndex].jadwal_wawancara.hari) ? 'Weekend' : 'Weekday';
    }
    if (jamInputVal) {
      dbData.pendaftar[targetIndex].jadwal_wawancara.jam = jamInputVal;
      dbData.pendaftar[targetIndex].jadwal_wawancara.sesi = `${jamInputVal} WIB`;
    }

    // Save SSoT
    db.save(dbData);
  }

  // Sinkronkan juga ke spmb_pendaftar_db agar Modul 01 Portal ikut ter-update
  try {
    const pRaw = localStorage.getItem('spmb_pendaftar_db');
    if (pRaw) {
      const pList = JSON.parse(pRaw);
      const pIdx = pList.findIndex(p => (p.id_pendaftar === activeCandidateId || p.id === activeCandidateId));
      if (pIdx !== -1) {
        pList[pIdx].status_wawancara = "SELESAI";
        pList[pIdx].nilai_wawancara = avgNilaiWawancara;
        pList[pIdx].dataWawancara = wawancaraPayload;
        if (pList[pIdx].jadwal_wawancara) {
          pList[pIdx].jadwal_wawancara.pewawancara = pewawancaraVal;
          pList[pIdx].jadwal_wawancara.metode = metodeVal;
          if (metodeVal === 'Daring') {
            pList[pIdx].jadwal_wawancara.ruang = 'Google Meet / Zoom (Daring Online)';
          }
        }
        localStorage.setItem('spmb_pendaftar_db', JSON.stringify(pList));
      }
    }
  } catch (err) { }

  // Trigger Custom Event untuk komunikasi ke Modul 05 (Kelulusan)
  window.dispatchEvent(new CustomEvent('spmb_wawancara_updated', {
    detail: {
      id: activeCandidateId,
      nilai_wawancara: avgNilaiWawancara,
      rekomendasi_akhir: rekomendasiAkhir,
      rekomendasi_beasiswa: beasiswaObj.label,
      rekomendasi_beasiswa_code: beasiswaObj.code,
      nominal_beasiswa: beasiswaObj.nominal,
      status_tes_quran: statusTesVal,
      hafalan_teruji: hafalanTerujiVal,
      pewawancara: pewawancaraVal,
      aspek_penilaian: aspekSelected,
      catatan_aspek: catatanAspek
    }
  }));

  window.dispatchEvent(new CustomEvent('spmb_db_updated', {
    detail: { type: 'wawancara_saved', id: activeCandidateId }
  }));

  closeModalPenilaian();
  renderWawancara(activeContainerId); // Re-render modul view
  showToast(`✅ Penilaian wawancara ${activeCandidateId} oleh ${pewawancaraVal} berhasil disimpan ke SSoT!`);
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


// Re-export reminder functions for external module / test suite access
export {
  generateAnekdotalRecordHTML,
  getHMinusOneDate,
  generateReminderIdempotencyKey,
  computeReminderMetadata,
  generateWhatsAppMessage,
  generateEmailMessage,
  generateReminderPayload,
  dispatchReminderToBackend
};

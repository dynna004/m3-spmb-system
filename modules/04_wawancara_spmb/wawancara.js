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
} catch (e) {}

try {
  const savedMode = localStorage.getItem(ROLE_KEY);
  if (savedMode !== null) {
    isEditMode = savedMode === 'true';
  }
} catch (e) {}

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
  } catch (e) {}
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
    } catch (err) {}
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
  } catch (e) {}

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
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "08:00", jam_selesai: "09:00", sesi: "08.00 - 09.00 WIB", metode: "Luring", ruang: assignedPewObj.ruang || "Ruang Wawancara 1 (Gedung Utama)", pewawancara: assignedPew },
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-20", hari: "Selasa", tipe_hari: "Weekday", jam: "10:00", jam_selesai: "11:00", sesi: "10.00 - 11.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: assignedPew },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Luring", ruang: "Ruang Tahfidz (Masjid M3)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-25", hari: "Minggu", tipe_hari: "Weekend", jam: "11:00", jam_selesai: "12:00", sesi: "11.00 - 12.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: assignedPew },
    { tanggal: "2026-10-21", hari: "Rabu", tipe_hari: "Weekday", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 1 (Gedung Utama)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama },
    { tanggal: "2026-10-22", hari: "Kamis", tipe_hari: "Weekday", jam: "14:00", jam_selesai: "15:00", sesi: "14.00 - 15.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: assignedPew },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: pewPool[(idx + 1) % pewPool.length].nama }
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
        jadwal_wawancara: {
          tanggal: "2026-10-19",
          hari: "Senin",
          tipe_hari: "Weekday",
          jam: "08:00",
          jam_selesai: "09:00",
          sesi: "08.00 - 09.00 WIB",
          metode: "Luring",
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
          peminatan_bakat: ["Sains", "IT"],
          hafalan_juz: 3,
          rekomendasi_beasiswa: "Potongan SPP (Beasiswa Tahfidz Parsial)",
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
          ruang: "Google Meet / Zoom (Daring Online)",
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
          peminatan_bakat: ["Sains", "Bahasa", "IT"],
          hafalan_juz: 16,
          rekomendasi_beasiswa: "Bebas SPP (Beasiswa Tahfidz Full)",
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
          ruang: "Google Meet / Zoom (Daring Online)",
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
          metode: "Luring",
          ruang: "Ruang Wawancara 2 (Lab Komputer)",
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
          }
        });
      }
    }
  } catch (err) {}

  // Pastikan seluruh data pendaftar memiliki jadwal terisi & pewawancara jelas (Yosa / Veli)
  data = data.map((item, idx) => ensureCandidateJadwal(item, idx));

  return data;
}

/**
 * Menghitung rekomendasi beasiswa otomatis berdasarkan hafalan Qur'an (Juz)
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
    <!-- Custom Style Injection untuk Modul 04 -->
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
      @media (max-width: 960px) {
        .wawancara-layout-wrapper {
          flex-direction: column;
        }
        .wawancara-sidebar {
          width: 100% !important;
          min-width: 100% !important;
          position: static;
        }
        .wawancara-sidebar.collapsed {
          display: none !important;
        }
      }
    </style>

    <div class="wawancara-layout-wrapper ${isSidebarOpen ? '' : 'sidebar-collapsed'}" id="wawancara-layout-wrapper">
      <!-- 1. SIDEBAR NAVBAR (SESUAI WIREFRAME MOCKUP) -->
      <aside class="wawancara-sidebar ${isSidebarOpen ? '' : 'collapsed'}" id="wawancara-sidebar">
        <!-- Top Bar Toggle (Hamburger Button) -->
        <div class="sidebar-top-bar">
          <button type="button" id="btn-toggle-sidebar" class="sidebar-hamburger-btn" title="${isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}" aria-label="Toggle Sidebar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span class="sidebar-collapse-label">${isSidebarOpen ? 'Tutup Menu' : ''}</span>
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
        <!-- Reopen Bar (Tampil saat sidebar ditutup / collapse) -->
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
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 1rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
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

            <!-- Section 5: Rekomendasi Akhir Kelulusan & Metode -->
            <div class="form-section-title">🎯 5. Rekomendasi Akhir Kelulusan & Konfirmasi Metode</div>
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
            <div class="form-group" style="margin-top: 10px;">
              <label for="wawancara-nama-pewawancara">Pewawancara yang Mengesahkan</label>
              <select id="wawancara-nama-pewawancara" class="form-control" style="font-weight: 700;">
                <option value="Yosa">👨‍🏫 Yosa, S.Pd</option>
                <option value="Veli">👩‍🏫 Veli, M.Pd</option>
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

  return candidates.filter(item => {
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
              <th>Hari & Tanggal</th>
              <th>Jam Sesi Wawancara</th>
              <th>Metode & Platform</th>
              <th>No. Registrasi</th>
              <th>Nama Lengkap Calon Siswa</th>
              <th>Asal Sekolah</th>
              <th>Minat</th>
              <th>Pewawancara Bertugas</th>
              <th>Status Wawancara</th>
              <th style="text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map((c, index) => {
              const jw = c.jadwal_wawancara || {};
              const isWeekend = jw.tipe_hari === 'Weekend' || ['Sabtu', 'Minggu'].includes(jw.hari);
              const isSelesai = (c.statusWawancara || '').toUpperCase() === 'SELESAI';
              const candidateId = c.id || c.id_pendaftar || '-';
              const candidateName = c.nama || c.nama_lengkap || 'Tanpa Nama';
              const asalSekolah = c.asal_sekolah || c.biodata?.asal_sekolah || '-';
              const jurusan = c.pilihan_jurusan || c.biodata?.pilihan_jurusan || 'MIPA';
              const ruang = jw.ruang ? jw.ruang.split('(')[0].trim() : 'R. Wawancara 1';
              const pewawancara = jw.pewawancara || 'Yosa';
              const isDaring = (jw.metode || '').toUpperCase() === 'DARING';

              return `
                <tr>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
                  <td>
                    <div style="font-weight: 700; color: #0f172a;">${jw.hari || '-'}, ${jw.tanggal || '-'}</div>
                    <span class="jadwal-slot-badge-day" style="background: ${isWeekend ? '#fef3c7' : '#e0f2fe'}; color: ${isWeekend ? '#b45309' : '#0369a1'};">
                      ${isWeekend ? '🏖️ Weekend (09-15)' : '📅 Weekday (08-15)'}
                    </span>
                  </td>
                  <td>
                    <div class="jadwal-time-pill">
                      <span>⏰</span> <strong>${jw.sesi || (jw.jam ? jw.jam + ' WIB' : '-')}</strong>
                    </div>
                  </td>
                  <td>
                    <div style="margin-bottom: 4px;">
                      <span class="badge-metode ${isDaring ? 'badge-metode-daring' : 'badge-metode-luring'}">
                        ${isDaring ? '🌐 Daring' : '🏢 Luring'}
                      </span>
                    </div>
                    <div style="font-weight: 600; font-size: 0.78rem; color: #334155;">
                      ${ruang}
                    </div>
                  </td>
                  <td><strong style="color: #006837;">${candidateId}</strong></td>
                  <td>
                    <span class="jadwal-candidate-name">${candidateName}</span>
                    <span style="font-size: 0.75rem; color: #64748b;">NISN: ${c.nisn || '-'}</span>
                  </td>
                  <td>${asalSekolah}</td>
                  <td><span class="badge badge-info">${jurusan}</span></td>
                  <td>
                    ${renderPewawancaraBadge(pewawancara)}
                  </td>
                  <td>
                    ${isSelesai 
                      ? `<span class="badge-status-selesai">✅ Selesai (Skor: ${c.nilai_wawancara || 88})</span>` 
                      : `<span class="badge-status-belum">⏳ Belum Wawancara</span>`}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-primary btn-input-nilai" data-id="${candidateId}" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700; background: ${isSelesai ? '#0284c7' : '#006837'}; color: #fff; border-radius: 6px; border: none; cursor: pointer; white-space: nowrap;">
                      ${isSelesai ? '✏️ Edit Skor' : '🎤 Mulai Wawancara'}
                    </button>
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
                              return `
                                <div class="kalender-cell-item">
                                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                                    <strong style="color: #006837; font-size: 0.74rem;">${cId}</strong>
                                    <span style="font-size: 0.68rem; font-weight: 700; color: ${isSelesai ? '#15803d' : '#b45309'};">
                                      ${isSelesai ? '✅ Selesai' : '⏳ Belum'}
                                    </span>
                                  </div>
                                  <div style="font-weight: 800; font-size: 0.82rem; color: #0f172a; margin-bottom: 2px;">
                                    ${cName}
                                  </div>
                                  <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                                    <span class="badge-metode ${isDar ? 'badge-metode-daring' : 'badge-metode-luring'}" style="padding: 2px 6px; font-size: 0.68rem;">
                                      ${isDar ? '🌐 Daring' : '🏢 Luring'}
                                    </span>
                                    ${renderPewawancaraBadge(pew)}
                                  </div>
                                  <div style="font-size: 0.72rem; color: #64748b; margin-bottom: 6px;">
                                    ${sc.pilihan_jurusan || 'MIPA'} &bull; ${sc.jadwal_wawancara?.ruang ? sc.jadwal_wawancara.ruang.split('(')[0].trim() : 'R. Wawancara 1'}
                                  </div>
                                  <button class="btn btn-primary btn-input-nilai" data-id="${cId}" style="width: 100%; padding: 4px 6px; font-size: 0.72rem; font-weight: 700; background: ${isSelesai ? '#0284c7' : '#006837'}; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                    ${isSelesai ? '✏️ Edit Skor' : '🎤 Wawancarai'}
                                  </button>
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
          <button class="btn btn-primary btn-input-nilai" data-id="${candidateId}" style="padding: 6px 14px; font-size: 0.8rem; background: ${!isEditMode ? '#eff6ff' : (isSelesai ? '#0284c7' : '#006837')}; color: ${!isEditMode ? '#1d4ed8' : '#ffffff'}; border: ${!isEditMode ? '1px solid #bfdbfe' : 'none'}; font-weight: 700;">
            ${!isEditMode ? '👁️ Lihat Detail' : (isSelesai ? '✏️ Edit Nilai' : '📝 Input Nilai')}
          </button>
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
        } catch (err) {}
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
  } catch (err) {}

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
  const viewJadwal = document.getElementById('view-container-jadwal');
  const viewEval = document.getElementById('view-container-eval');
  const viewPewawancara = document.getElementById('view-container-pewawancara');

  function switchToTab(tabName) {
    activeSubTab = tabName;
    if (btnSubtabJadwal) btnSubtabJadwal.classList.toggle('active', tabName === 'JADWAL');
    if (btnSubtabEval) btnSubtabEval.classList.toggle('active', tabName === 'EVAL');
    if (btnSubtabPewawancara) btnSubtabPewawancara.classList.toggle('active', tabName === 'PEWAWANCARA');

    if (viewJadwal) viewJadwal.style.display = tabName === 'JADWAL' ? 'block' : 'none';
    if (viewEval) viewEval.style.display = tabName === 'EVAL' ? 'block' : 'none';
    if (viewPewawancara) viewPewawancara.style.display = tabName === 'PEWAWANCARA' ? 'block' : 'none';

    if (tabName === 'JADWAL') {
      updateSidebarNavActive('JADWAL');
      renderJadwalViewport();
    } else if (tabName === 'EVAL') {
      updateSidebarNavActive('PENILAIAN');
      renderTableRows();
    } else if (tabName === 'PEWAWANCARA') {
      updateSidebarNavActive('PEWAWANCARA');
      renderPewawancaraTable();
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

  if (hafalanInput) {
    hafalanInput.addEventListener('input', (e) => {
      updateBeasiswaPreview(e.target.value);
    });
  }

  if (formModal) {
    formModal.addEventListener('submit', handleSaveWawancara);
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

  // Pewawancara yang ditugaskan (Yosa / Veli)
  const pewawancaraVal = document.getElementById('wawancara-nama-pewawancara')?.value || document.getElementById('modal-candidate-pewawancara')?.value || 'Yosa';

  // Metode pelaksanaan wawancara
  const metodeVal = document.getElementById('wawancara-metode-pelaksanaan')?.value || 'Luring';

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

  // Update ke database terpusat SSoT
  const dbData = db.get() || { pendaftar: [] };
  const targetIndex = dbData.pendaftar.findIndex(p => (p.id || p.id_pendaftar) === activeCandidateId);

  const wawancaraPayload = {
    nilai_siswa: nilaiSiswa,
    catatan_siswa: catatanSiswa,
    nilai_wali: nilaiWali,
    catatan_wali: catatanWali,
    peminatan_bakat: bakatSelected,
    hafalan_juz: hafalanJuz,
    rekomendasi_beasiswa: beasiswaObj.label,
    rekomendasi_beasiswa_code: beasiswaObj.code,
    rekomendasi_akhir: rekomendasiAkhir,
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
    dbData.pendaftar[targetIndex].jadwal_wawancara.pewawancara = pewawancaraVal;
    dbData.pendaftar[targetIndex].jadwal_wawancara.metode = metodeVal;
    if (metodeVal === 'Daring' && (!dbData.pendaftar[targetIndex].jadwal_wawancara.ruang || !dbData.pendaftar[targetIndex].jadwal_wawancara.ruang.includes('Daring'))) {
      dbData.pendaftar[targetIndex].jadwal_wawancara.ruang = 'Google Meet / Zoom (Daring Online)';
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
  } catch (err) {}

  // Trigger Custom Event untuk komunikasi ke Modul 05 (Kelulusan)
  window.dispatchEvent(new CustomEvent('spmb_wawancara_updated', {
    detail: {
      id: activeCandidateId,
      nilai_wawancara: avgNilaiWawancara,
      rekomendasi_akhir: rekomendasiAkhir,
      rekomendasi_beasiswa: beasiswaObj.label,
      pewawancara: pewawancaraVal
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

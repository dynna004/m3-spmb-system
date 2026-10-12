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
let activeSubTab = 'JADWAL'; // Default: 'JADWAL' | 'EVAL'
let jadwalViewMode = 'TABLE'; // 'TABLE' (Tabel Jadwal) | 'CALENDAR' (Kalender Jadwal)
let jadwalFilterHari = 'ALL';
let jadwalFilterJam = 'ALL';
let jadwalFilterPewawancara = 'ALL'; // 'ALL' | 'Yosa' | 'Veli'
let jadwalFilterMetode = 'ALL'; // 'ALL' | 'LURING' | 'DARING'
let jadwalFilterStatus = 'ALL';
let jadwalSearch = '';

try {
  const savedMode = localStorage.getItem(ROLE_KEY);
  if (savedMode !== null) {
    isEditMode = savedMode === 'true';
  }
} catch (e) {}

/**
 * Helper untuk memastikan setiap pendaftar memiliki jadwal wawancara yang valid
 * dengan pewawancara yang jelas (Yosa atau Veli) dan metode (Daring atau Luring)
 * Sesuai aturan:
 * - Weekday (Senin - Jumat): 08.00 - 15.00 WIB
 * - Weekend (Sabtu - Minggu): 09.00 - 15.00 WIB
 */
function ensureCandidateJadwal(c, idx) {
  // Daftar template jadwal dengan pewawancara jelas: Yosa & Veli serta metode Daring/Luring
  const defaultPool = [
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "08:00", jam_selesai: "09:00", sesi: "08.00 - 09.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 1 (Gedung Utama)", pewawancara: "Yosa" },
    { tanggal: "2026-10-19", hari: "Senin", tipe_hari: "Weekday", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: "Veli" },
    { tanggal: "2026-10-20", hari: "Selasa", tipe_hari: "Weekday", jam: "10:00", jam_selesai: "11:00", sesi: "10.00 - 11.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: "Yosa" },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "09:00", jam_selesai: "10:00", sesi: "09.00 - 10.00 WIB", metode: "Luring", ruang: "Ruang Tahfidz (Masjid M3)", pewawancara: "Veli" },
    { tanggal: "2026-10-25", hari: "Minggu", tipe_hari: "Weekend", jam: "11:00", jam_selesai: "12:00", sesi: "11.00 - 12.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: "Yosa" },
    { tanggal: "2026-10-21", hari: "Rabu", tipe_hari: "Weekday", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 1 (Gedung Utama)", pewawancara: "Veli" },
    { tanggal: "2026-10-22", hari: "Kamis", tipe_hari: "Weekday", jam: "14:00", jam_selesai: "15:00", sesi: "14.00 - 15.00 WIB", metode: "Daring", ruang: "Google Meet / Zoom (Daring Online)", pewawancara: "Yosa" },
    { tanggal: "2026-10-24", hari: "Sabtu", tipe_hari: "Weekend", jam: "13:00", jam_selesai: "14:00", sesi: "13.00 - 14.00 WIB", metode: "Luring", ruang: "Ruang Wawancara 2 (Lab Komputer)", pewawancara: "Veli" }
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

  // Pastikan pewawancara selalu Yosa atau Veli
  const currentP = (c.jadwal_wawancara.pewawancara || '').trim();
  if (!currentP || currentP === 'Divisi Pewawancara SPMB' || currentP.includes('Tim') || currentP.includes('Ustadz') || currentP.includes('Drs.')) {
    c.jadwal_wawancara.pewawancara = (idx % 2 === 0) ? 'Yosa' : 'Veli';
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

  // Hitung statistik
  const totalLunas = lunasCandidates.length;
  const sudahWawancara = lunasCandidates.filter(c => (c.statusWawancara || '').toUpperCase() === 'SELESAI').length;
  const belumWawancara = totalLunas - sudahWawancara;
  const layakCount = lunasCandidates.filter(c => c.dataWawancara?.rekomendasi_akhir === 'LAYAK').length;
  const countYosa = lunasCandidates.filter(c => (c.jadwal_wawancara?.pewawancara || '').includes('Yosa')).length;
  const countVeli = lunasCandidates.filter(c => (c.jadwal_wawancara?.pewawancara || '').includes('Veli')).length;
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
      }
    </style>

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
                SMA Muhammadiyah 3 Yogyakarta &bull; SPMB T.A 2026/2027 &bull; Tim Pewawancara Resmi: <strong>Yosa</strong> & <strong>Veli</strong>
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
              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 3px;">
                <span class="pill-rule-weekday">🟢 <strong>Hari Kerja (Weekday):</strong> 08.00 - 15.00 WIB</span>
                <span class="pill-rule-weekend">🔵 <strong>Akhir Pekan (Weekend):</strong> 09.00 - 15.00 WIB</span>
                <span class="badge-pewawancara badge-yosa" style="padding: 2px 8px; font-size: 0.75rem;">👨‍🏫 Yosa (${countYosa} Siswa)</span>
                <span class="badge-pewawancara badge-veli" style="padding: 2px 8px; font-size: 0.75rem;">👩‍🏫 Veli (${countVeli} Siswa)</span>
                <span class="badge-metode badge-metode-luring" style="padding: 2px 8px; font-size: 0.75rem;">🏢 Luring (${countLuring})</span>
                <span class="badge-metode badge-metode-daring" style="padding: 2px 8px; font-size: 0.75rem;">🌐 Daring (${countDaring})</span>
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
            <!-- Filter Pewawancara (Yosa / Veli) -->
            <select id="jadwal-filter-pewawancara" class="form-control" style="width: auto; font-size: 0.82rem; font-weight: 700; border-color: #006837;">
              <option value="ALL" ${jadwalFilterPewawancara === 'ALL' ? 'selected' : ''}>👥 Semua Pewawancara (Yosa & Veli)</option>
              <option value="Yosa" ${jadwalFilterPewawancara === 'Yosa' ? 'selected' : ''}>👨‍🏫 Pewawancara: Yosa</option>
              <option value="Veli" ${jadwalFilterPewawancara === 'Veli' ? 'selected' : ''}>👩‍🏫 Pewawancara: Veli</option>
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
            <strong style="color: #0f172a;">Yosa, S.Pd & Veli, M.Pd (SPMB SMA Muhammadiyah 3 Yogyakarta)</strong>
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

    <!-- Toast Notification -->
    <div class="toast-notification" id="wawancara-toast"></div>
  `;

  // Render Sub-Views
  renderJadwalViewport();
  renderTableRows();

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
              const pewawancara = jw.pewawancara || (index % 2 === 0 ? 'Yosa' : 'Veli');
              const isYosa = pewawancara.includes('Yosa');
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
                    <span class="badge-pewawancara ${isYosa ? 'badge-yosa' : 'badge-veli'}">
                      ${isYosa ? '👨‍🏫 Yosa' : '👩‍🏫 Veli'}
                    </span>
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
                              const isY = pew.includes('Yosa');
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
                                    <span class="badge-pewawancara ${isY ? 'badge-yosa' : 'badge-veli'}" style="padding: 2px 6px; font-size: 0.68rem;">
                                      ${isY ? '👨‍🏫 Yosa' : '👩‍🏫 Veli'}
                                    </span>
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
    const isY = pewawancara.includes('Yosa');

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
          <span class="badge-pewawancara ${isY ? 'badge-yosa' : 'badge-veli'}" style="padding: 3px 8px; font-size: 0.74rem;">
            ${isY ? '👨‍🏫 Yosa' : '👩‍🏫 Veli'}
          </span>
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
 * Attach Event Listeners untuk Subtabs, Filter, dan Modal
 */
function attachTableEventListeners() {
  // Subtabs Switchers
  const btnSubtabJadwal = document.getElementById('btn-subtab-jadwal');
  const btnSubtabEval = document.getElementById('btn-subtab-eval');
  const viewJadwal = document.getElementById('view-container-jadwal');
  const viewEval = document.getElementById('view-container-eval');

  if (btnSubtabJadwal && btnSubtabEval) {
    btnSubtabJadwal.addEventListener('click', () => {
      activeSubTab = 'JADWAL';
      btnSubtabJadwal.classList.add('active');
      btnSubtabEval.classList.remove('active');
      if (viewJadwal) viewJadwal.style.display = 'block';
      if (viewEval) viewEval.style.display = 'none';
      renderJadwalViewport();
    });

    btnSubtabEval.addEventListener('click', () => {
      activeSubTab = 'EVAL';
      btnSubtabEval.classList.add('active');
      btnSubtabJadwal.classList.remove('active');
      if (viewEval) viewEval.style.display = 'block';
      if (viewJadwal) viewJadwal.style.display = 'none';
      renderTableRows();
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

  const selectPewawancaraTop = document.getElementById('modal-candidate-pewawancara');
  if (selectPewawancaraTop) {
    selectPewawancaraTop.value = currentPewawancara.includes('Veli') ? 'Veli' : 'Yosa';
  }

  const selectPewawancaraBottom = document.getElementById('wawancara-nama-pewawancara');
  if (selectPewawancaraBottom) {
    selectPewawancaraBottom.value = currentPewawancara.includes('Veli') ? 'Veli' : 'Yosa';
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

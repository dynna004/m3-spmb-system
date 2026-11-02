/**
 * ============================================================================
 * MODUL 05: PENETAPAN & KELULUSAN SPMB (kelulusan.js)
 * Sistem Penerimaan Murid Baru (SPMB) — SMA Muhammadiyah 3 Yogyakarta
 *
 * Fitur Utama:
 * 1. Pengaturan Kuota yang Bisa Diedit Admin:
 *    - Input Kuota Lulus Otomatis (Default: 80 Besar) -> Bisa diedit angkanya
 *    - Input Kuota Cadangan Otomatis (Default: 10 Cadangan) -> Bisa diedit angkanya
 *    - Sisanya (Peringkat > Kuota Lulus + Kuota Cadangan) -> Otomatis Gagal & Bisa Coba di Gelombang Selanjutnya
 * 2. Perankingan & Kelulusan Otomatis + Tetap Bisa Edit Status Kelulusan Manual:
 *    - Saat tombol Perankingan Otomatis dijalankan atau angka kuota diubah, sistem otomatis
 *      mengurutkan Nilai Akhir dan menetapkan status LULUS (1..80), CADANGAN (81..90), dan TIDAK LULUS (91+).
 *    - Setiap baris tabel juga memiliki dropdown Status Kelulusan (<select class="status-select-control">)
 *      sehingga Admin tetap bisa mengedit/mengubah status kelulusan siswa secara langsung.
 * ============================================================================
 */

const STORAGE_KEY_KELULUSAN = 'spmb_kelulusan_data_v3';
const STORAGE_KEY_CONFIG = 'spmb_kelulusan_config_v3';
const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';

const DEFAULT_CONFIG = {
  kuotaLulus: 80,
  kuotaCadangan: 10,
  bobotRapor: 60,
  bobotWawancara: 40,
  gelombangSaatIni: 'Gelombang 1 (Reguler)',
  gelombangSelanjutnya: 'Gelombang 2 (20 Mei – 30 Juni 2026)',
  isPublished: true,
  publishedAt: '15 Mei 2026, 09:30 WIB',
  nomorSK: 'SK/048/SPMB-M3/V/2026'
};

const SEED_CORE_STUDENTS = [
  {
    id: 'SPMB-2026-0001',
    no_pendaftaran: 'SPMB-2026-0001',
    nisn: '0098451234',
    nama_lengkap: 'Aisyah Putri Rahmawati',
    asal_sekolah: 'SMP Muhammadiyah 1 Yogyakarta',
    pilihan_jurusan: 'MIPA',
    jalur_pendaftaran: 'Prestasi Akademik',
    nilai_rapor: 94.8,
    nilai_wawancara: 95.5,
    no_hp_ortu: '081234567890'
  },
  {
    id: 'SPMB-2026-0002',
    no_pendaftaran: 'SPMB-2026-0002',
    nisn: '0091122334',
    nama_lengkap: 'Muhammad Rizky Pratama',
    asal_sekolah: 'SMP Negeri 5 Yogyakarta',
    pilihan_jurusan: 'MIPA',
    jalur_pendaftaran: 'Reguler',
    nilai_rapor: 93.6,
    nilai_wawancara: 94.0,
    no_hp_ortu: '081398765432'
  },
  {
    id: 'SPMB-2026-0003',
    no_pendaftaran: 'SPMB-2026-0003',
    nisn: '0095566778',
    nama_lengkap: 'Nabila Syakieb Al-Faruq',
    asal_sekolah: 'SMP Islam Al-Azhar 26 Yogyakarta',
    pilihan_jurusan: 'IPS',
    jalur_pendaftaran: 'Prestasi Non-Akademik',
    nilai_rapor: 93.2,
    nilai_wawancara: 93.5,
    no_hp_ortu: '081511223344'
  },
  {
    id: 'SPMB-2026-0004',
    no_pendaftaran: 'SPMB-2026-0004',
    nisn: '0093344556',
    nama_lengkap: 'Fauzan Azima Hidayatullah',
    asal_sekolah: 'MTs Negeri 1 Yogyakarta',
    pilihan_jurusan: 'MIPA',
    jalur_pendaftaran: 'Muhammadiyah / Kader',
    nilai_rapor: 92.8,
    nilai_wawancara: 92.5,
    no_hp_ortu: '085788990011'
  },
  {
    id: 'SPMB-2026-0005',
    no_pendaftaran: 'SPMB-2026-0005',
    nisn: '0097788990',
    nama_lengkap: 'Zahra Amalia Khairunnisa',
    asal_sekolah: 'SMP Negeri 8 Yogyakarta',
    pilihan_jurusan: 'MIPA',
    jalur_pendaftaran: 'Reguler',
    nilai_rapor: 92.4,
    nilai_wawancara: 92.0,
    no_hp_ortu: '081299887766'
  }
];

const FIRST_NAMES = [
  'Aditya', 'Ahmad', 'Akbar', 'Aldi', 'Alif', 'Amira', 'Ananda', 'Andika', 'Angga', 'Annisa',
  'Arif', 'Arya', 'Aufa', 'Aulia', 'Azka', 'Bagas', 'Bayu', 'Bima', 'Citra', 'Daffa',
  'Danu', 'Davin', 'Dewi', 'Dian', 'Dimas', 'Dinda', 'Dzaki', 'Eka', 'Erlangga', 'Fadhil',
  'Fajar', 'Farhan', 'Faris', 'Fathir', 'Fatimah', 'Fikri', 'Galih', 'Gilang', 'Hafizh', 'Haikal',
  'Hana', 'Hanif', 'Hasna', 'Ilham', 'Indira', 'Intan', 'Irfan', 'Jasmine', 'Kayla', 'Keisya',
  'Kevin', 'Khansa', 'Kirana', 'Luthfi', 'Mahira', 'Maulana', 'Mutiara', 'Nadhif', 'Nadia', 'Naufal',
  'Intan', 'Nayla', 'Nizam', 'Putra', 'Putri', 'Qonita', 'Rafa', 'Affan', 'Rafi', 'Rahma',
  'Raihan', 'Raka', 'Rama', 'Rania', 'Rasya', 'Rayhan', 'Reza', 'Rifqi', 'Rizwan', 'Salma',
  'Salsabila', 'Satria', 'Shafira', 'Siti', 'Syifa', 'Taufik', 'Tiara', 'Umar', 'Vania', 'Wildan',
  'Yasmin', 'Yusuf', 'Zaidan', 'Zaki', 'Zalfa', 'Zaskia', 'Zidan', 'Zulfa', 'Arkan', 'Najwa'
];

const LAST_NAMES = [
  'Pratama', 'Saputra', 'Wijaya', 'Hidayat', 'Ramadhan', 'Kusuma', 'Nugroho', 'Santoso', 'Setiawan', 'Permana',
  'Hakim', 'Firmansyah', 'Mahendra', 'Fadillah', 'Mulyani', 'Lestari', 'Maharani', 'Azzahra', 'Syahputra', 'Al-Fatih',
  'Kurniawan', 'Siregar', 'Nasution', 'Lubis', 'Harahap', 'Purnomo', 'Wibowo', 'Gunawan', 'Hermawan', 'Adriansyah'
];

const SCHOOLS = [
  'SMP Muhammadiyah 1 Yogyakarta',
  'SMP Muhammadiyah 2 Yogyakarta',
  'SMP Muhammadiyah 3 Yogyakarta',
  'SMP Negeri 5 Yogyakarta',
  'SMP Negeri 8 Yogyakarta',
  'SMP Negeri 1 Yogyakarta',
  'MTs Negeri 1 Yogyakarta',
  'MTs Muallimaat Muhammadiyah',
  'SMP Islam Al-Azhar 26 Yogyakarta',
  'SMP Negeri 2 Yogyakarta',
  'SMPIT Abu Bakar Yogyakarta',
  'SMP Negeri 4 Pakem'
];

const JALUR_LIST = [
  'Reguler',
  'Prestasi Akademik',
  'Muhammadiyah / Kader',
  'Prestasi Non-Akademik',
  'Tahfidz Al-Qur\'an'
];

const state = {
  activeContainerId: 'module-viewport',
  config: { ...DEFAULT_CONFIG },
  students: [],
  currentFilter: 'ALL', // 'ALL' | 'CUTOFF_HIGHLIGHT' | 'LULUS' | 'CADANGAN' | 'TIDAK_LULUS'
  searchQuery: '',
  selectedStudentForSkl: null
};

function ensureKelulusanStyles() {
  const cssId = 'kelulusan-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/05_kelulusan_spmb/');
    link.href = isStandalone ? './kelulusan.css?v=20261102_full' : './modules/05_kelulusan_spmb/kelulusan.css?v=20261102_full';
    document.head.appendChild(link);
  }
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  if (!name) return 'SM';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatScore(num) {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return '0.00';
  return parsed.toFixed(2);
}

function computeFinalScore(rapor, wawancara, bobotRapor, bobotWawancara) {
  const r = parseFloat(rapor) || 0;
  const w = parseFloat(wawancara) || 0;
  const br = (parseFloat(bobotRapor) || 60) / 100;
  const bw = (parseFloat(bobotWawancara) || 40) / 100;
  return Number(((r * br) + (w * bw)).toFixed(2));
}

function buildCohort105Students() {
  const TOTAL_COHORT = 105;
  const combined = [];
  const usedNisn = new Set();

  SEED_CORE_STUDENTS.forEach((s) => {
    usedNisn.add(s.nisn);
    combined.push({ ...s });
  });

  try {
    const rawDb = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (rawDb) {
      const parsedDb = JSON.parse(rawDb);
      if (Array.isArray(parsedDb)) {
        parsedDb.forEach((p, idx) => {
          if (!p || p.is_bot || p.is_bot_suspect || p.terdeteksi_bot) return;
          const nisn = String(p.nisn || '').trim();
          if (!nisn || usedNisn.has(nisn)) return;
          usedNisn.add(nisn);

          let rapor = parseFloat(p.nilai_rapor || p.rata_rata_rapor);
          let wawancara = parseFloat(p.nilai_wawancara || p.skor_wawancara);
          if (isNaN(rapor) || rapor <= 0) {
            if (idx % 5 === 3) {
              rapor = 79.4;
              wawancara = 78.8;
            } else if (idx % 5 === 4) {
              rapor = 74.2;
              wawancara = 73.5;
            } else {
              rapor = Number((89.5 - (idx * 0.6)).toFixed(1));
              wawancara = Number((90.0 - (idx * 0.5)).toFixed(1));
            }
          }
          if (isNaN(wawancara) || wawancara <= 0) {
            wawancara = Number((rapor + 0.5).toFixed(1));
          }

          combined.push({
            id: p.no_pendaftaran || p.id_pendaftar || p.id || `SPMB-2026-${String(combined.length + 1).padStart(4, '0')}`,
            no_pendaftaran: p.no_pendaftaran || p.id_pendaftar || p.id || `SPMB-2026-${String(combined.length + 1).padStart(4, '0')}`,
            nisn: nisn,
            nama_lengkap: p.nama_lengkap || p.nama || 'Peserta SPMB',
            asal_sekolah: p.asal_sekolah || p.biodata?.asal_sekolah || 'SMP Negeri Yogyakarta',
            pilihan_jurusan: (p.pilihan_jurusan || p.biodata?.pilihan_jurusan || 'MIPA').toUpperCase().includes('IPS') ? 'IPS' : 'MIPA',
            jalur_pendaftaran: p.jalur_pendaftaran || p.jalur || 'Reguler',
            nilai_rapor: rapor,
            nilai_wawancara: wawancara,
            no_hp_ortu: p.no_wa || p.no_whatsapp || p.no_hp_ortu || '081280009000'
          });
        });
      }
    }
  } catch (err) {
    console.warn('[Modul 05] Gagal membaca spmb_pendaftar_db:', err);
  }

  let genIndex = 0;
  while (combined.length < TOTAL_COHORT) {
    const rankTarget = combined.length + 1;
    const firstName = FIRST_NAMES[genIndex % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(genIndex * 3 + 7) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;

    const nisnCandidate = `009${String(2000000 + rankTarget * 137).slice(0, 7)}`;
    const regNo = `SPMB-2026-${String(rankTarget).padStart(4, '0')}`;

    let baseRapor;
    let baseWawancara;

    if (rankTarget <= 80) {
      const progress = (rankTarget - 5) / 75;
      baseRapor = Number((92.1 - progress * 11.8).toFixed(1));
      baseWawancara = Number((91.8 - progress * 11.5).toFixed(1));
    } else if (rankTarget <= 90) {
      const cadIdx = rankTarget - 80;
      baseRapor = Number((80.0 - cadIdx * 0.24).toFixed(1));
      baseWawancara = Number((79.6 - cadIdx * 0.22).toFixed(1));
    } else {
      const failIdx = rankTarget - 90;
      baseRapor = Number((77.1 - failIdx * 0.38).toFixed(1));
      baseWawancara = Number((76.6 - failIdx * 0.36).toFixed(1));
    }

    combined.push({
      id: regNo,
      no_pendaftaran: regNo,
      nisn: nisnCandidate,
      nama_lengkap: fullName,
      asal_sekolah: SCHOOLS[genIndex % SCHOOLS.length],
      pilihan_jurusan: genIndex % 3 === 0 ? 'IPS' : 'MIPA',
      jalur_pendaftaran: JALUR_LIST[genIndex % JALUR_LIST.length],
      nilai_rapor: baseRapor,
      nilai_wawancara: baseWawancara,
      no_hp_ortu: `0812${String(81000000 + rankTarget * 91).slice(0, 8)}`
    });

    genIndex++;
  }

  return combined;
}

/**
 * Mengisi metadata keterangan berdasarkan status_kelulusan & peringkat
 */
function applyStudentStatusMetadata(student, kuotaLulus, kuotaCadangan) {
  const rank = student.peringkat_global;
  if (student.status_kelulusan === 'LULUS') {
    student.urutan_cadangan = null;
    student.keterangan_kelulusan = student.manual_override
      ? `Ditetapkan Lulus oleh Admin (Peringkat #${rank})`
      : `Lulus Otomatis (${kuotaLulus} Besar — Peringkat #${rank})`;
    student.tindak_lanjut = 'Lanjut Daftar Ulang (Modul 06)';
    student.bisa_gelombang_selanjutnya = false;
  } else if (student.status_kelulusan === 'CADANGAN') {
    const noCad = rank > kuotaLulus && rank <= (kuotaLulus + kuotaCadangan)
      ? (rank - kuotaLulus)
      : (student.urutan_cadangan || 1);
    student.urutan_cadangan = noCad;
    student.keterangan_kelulusan = student.manual_override
      ? `Ditetapkan Cadangan oleh Admin (Peringkat #${rank})`
      : `Cadangan Otomatis #${noCad} dari ${kuotaCadangan} (Peringkat #${rank})`;
    student.tindak_lanjut = 'Menunggu Kuota Kosong Daftar Ulang';
    student.bisa_gelombang_selanjutnya = true;
  } else {
    student.status_kelulusan = 'TIDAK LULUS';
    student.urutan_cadangan = null;
    student.keterangan_kelulusan = student.manual_override
      ? `Ditetapkan Tidak Lulus oleh Admin (Peringkat #${rank})`
      : `Gagal Seleksi Gelombang Ini (Peringkat #${rank} dari ${state.students.length})`;
    student.tindak_lanjut = `Dapat Mencoba Kembali di ${state.config.gelombangSelanjutnya}`;
    student.bisa_gelombang_selanjutnya = true;
  }
}

/**
 * Menjalankan Perankingan & Kelulusan Otomatis Berdasarkan Kuota Lulus & Kuota Cadangan
 */
function runAutomaticRankingAndGraduation(resetManualOverrides = true) {
  const kuotaLulus = Math.max(1, parseInt(state.config.kuotaLulus, 10) || 80);
  const kuotaCadangan = Math.max(0, parseInt(state.config.kuotaCadangan, 10) || 10);
  const batasCadangan = kuotaLulus + kuotaCadangan;

  state.students.forEach((student) => {
    student.nilai_akhir = computeFinalScore(
      student.nilai_rapor,
      student.nilai_wawancara,
      state.config.bobotRapor,
      state.config.bobotWawancara
    );
  });

  state.students.sort((a, b) => {
    if (b.nilai_akhir !== a.nilai_akhir) return b.nilai_akhir - a.nilai_akhir;
    if (b.nilai_wawancara !== a.nilai_wawancara) return b.nilai_wawancara - a.nilai_wawancara;
    return b.nilai_rapor - a.nilai_rapor;
  });

  state.students.forEach((student, index) => {
    const rank = index + 1;
    student.peringkat_global = rank;
    student.peringkat_jurusan = rank;

    if (resetManualOverrides || !student.manual_override) {
      student.manual_override = false;
      if (rank <= kuotaLulus) {
        student.status_kelulusan = 'LULUS';
      } else if (rank <= batasCadangan) {
        student.status_kelulusan = 'CADANGAN';
      } else {
        student.status_kelulusan = 'TIDAK LULUS';
      }
    }

    applyStudentStatusMetadata(student, kuotaLulus, kuotaCadangan);
  });

  saveStateToStorage();
}

function loadInitialState() {
  try {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      state.config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        kuotaLulus: parseInt(parsed.kuotaLulus, 10) || DEFAULT_CONFIG.kuotaLulus,
        kuotaCadangan: parseInt(parsed.kuotaCadangan, 10) >= 0 ? parseInt(parsed.kuotaCadangan, 10) : DEFAULT_CONFIG.kuotaCadangan
      };
    }
  } catch (e) {
    console.warn('[Modul 05] Gagal memuat config:', e);
  }

  let loadedSavedStudents = null;
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_KELULUSAN);
    if (rawSaved) {
      const parsedStudents = JSON.parse(rawSaved);
      if (Array.isArray(parsedStudents) && parsedStudents.length >= 100) {
        loadedSavedStudents = parsedStudents;
      }
    }
  } catch (e) {}

  if (loadedSavedStudents) {
    state.students = loadedSavedStudents;
    runAutomaticRankingAndGraduation(false);
  } else {
    state.students = buildCohort105Students();
    runAutomaticRankingAndGraduation(true);
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(state.config));
    localStorage.setItem(STORAGE_KEY_KELULUSAN, JSON.stringify(state.students));
    localStorage.setItem('spmb_kelulusan_data_v1', JSON.stringify(state.students));
    localStorage.setItem('spmb_kelulusan_config_v1', JSON.stringify(state.config));

    const rawPendaftar = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (rawPendaftar) {
      const pendaftarList = JSON.parse(rawPendaftar);
      if (Array.isArray(pendaftarList)) {
        const mapByNisn = new Map();
        state.students.forEach((s) => mapByNisn.set(String(s.nisn), s));

        pendaftarList.forEach((p) => {
          const match = mapByNisn.get(String(p.nisn));
          if (match) {
            p.nilai_akhir = match.nilai_akhir;
            p.peringkat = match.peringkat_global;
            p.status_kelulusan = match.status_kelulusan;
            p.urutan_cadangan = match.urutan_cadangan;
            p.keterangan_kelulusan = match.keterangan_kelulusan;
            p.tindak_lanjut = match.tindak_lanjut;
            p.bisa_gelombang_selanjutnya = match.bisa_gelombang_selanjutnya;
          }
        });
        localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(pendaftarList));
      }
    }
  } catch (e) {
    console.warn('[Modul 05] Gagal menyimpan ke localStorage:', e);
  }
}

function computeSummaryStats() {
  const total = state.students.length;
  const lulusList = state.students.filter((s) => s.status_kelulusan === 'LULUS');
  const cadanganList = state.students.filter((s) => s.status_kelulusan === 'CADANGAN');
  const gagalList = state.students.filter((s) => s.status_kelulusan === 'TIDAK LULUS');

  const minScoreLulus = lulusList.length > 0 ? lulusList[lulusList.length - 1].nilai_akhir : 0;
  const maxScoreLulus = lulusList.length > 0 ? lulusList[0].nilai_akhir : 0;

  const minScoreCadangan = cadanganList.length > 0 ? cadanganList[cadanganList.length - 1].nilai_akhir : 0;
  const maxScoreCadangan = cadanganList.length > 0 ? cadanganList[0].nilai_akhir : 0;

  return {
    total,
    lulusCount: lulusList.length,
    cadanganCount: cadanganList.length,
    gagalCount: gagalList.length,
    minScoreLulus,
    maxScoreLulus,
    minScoreCadangan,
    maxScoreCadangan
  };
}

function getFilteredStudents() {
  const kuotaLulus = parseInt(state.config.kuotaLulus, 10) || 80;
  const kuotaCadangan = parseInt(state.config.kuotaCadangan, 10) >= 0 ? parseInt(state.config.kuotaCadangan, 10) : 10;
  const batasCadangan = kuotaLulus + kuotaCadangan;

  return state.students.filter((s) => {
    if (state.currentFilter === 'LULUS' && s.status_kelulusan !== 'LULUS') return false;
    if (state.currentFilter === 'CADANGAN' && s.status_kelulusan !== 'CADANGAN') return false;
    if (state.currentFilter === 'TIDAK_LULUS' && s.status_kelulusan !== 'TIDAK LULUS') return false;
    if (state.currentFilter === 'CUTOFF_HIGHLIGHT') {
      const r = s.peringkat_global;
      const inTop3 = r <= 3;
      const inBorderLulus = r >= Math.max(1, kuotaLulus - 2) && r <= kuotaLulus;
      const inCadangan = r > kuotaLulus && r <= batasCadangan;
      const inSampleGagal = r > batasCadangan && r <= batasCadangan + 6;
      if (!inTop3 && !inBorderLulus && !inCadangan && !inSampleGagal) return false;
    }

    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      const matchNama = s.nama_lengkap.toLowerCase().includes(q);
      const matchNisn = s.nisn.toLowerCase().includes(q);
      const matchNoReg = s.no_pendaftaran.toLowerCase().includes(q);
      const matchSekolah = s.asal_sekolah.toLowerCase().includes(q);
      const matchRank = `#${s.peringkat_global}` === q || String(s.peringkat_global) === q;
      return matchNama || matchNisn || matchNoReg || matchSekolah || matchRank;
    }

    return true;
  });
}

function showToast(title, message, type = 'success') {
  const container = document.getElementById('kel-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `kel-toast toast-${type}`;
  const icon = type === 'success' ? '✅' : '⚡';

  toast.innerHTML = `
    <div style="font-size: 1.35rem; line-height: 1;">${icon}</div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-size: 0.84rem; font-weight: 800; color: #0f172a;">${escapeHTML(title)}</div>
      <div style="font-size: 0.76rem; color: #475569; line-height: 1.35;">${escapeHTML(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

function renderApp() {
  const root = document.getElementById('kelulusan-app-root');
  if (!root) return;

  const stats = computeSummaryStats();
  const filteredStudents = getFilteredStudents();
  const kuotaLulus = parseInt(state.config.kuotaLulus, 10) || 80;
  const kuotaCadangan = parseInt(state.config.kuotaCadangan, 10) >= 0 ? parseInt(state.config.kuotaCadangan, 10) : 10;
  const batasCadangan = kuotaLulus + kuotaCadangan;
  const isStandalone = window.location.pathname.includes('/05_kelulusan_spmb/');
  const pengumumanHref = isStandalone
    ? '../01_portal_spmb/pengumuman.html'
    : 'modules/01_portal_spmb/pengumuman.html';

  root.innerHTML = `
    <div class="kelulusan-shell">
      <div class="kelulusan-dashboard-layout">

        <!-- 1. TOP HEADER HIJAU SOLID (#006837) SESUAI KELULUSAN.CSS -->
        <header class="kelulusan-top-header">
          <div class="header-left-box">
            <div class="header-breadcrumbs">
              <span>SPMB 2026/2027</span>
              <span>&bull;</span>
              <span>Modul 05: Perankingan &amp; Kelulusan Otomatis</span>
            </div>
            <h1 class="header-main-title">
              <span>🏆 Penetapan &amp; Perankingan Kelulusan SPMB</span>
              <span class="header-pub-badge ${state.config.isPublished ? 'published' : 'draft'}">
                <span class="dot"></span>
                <span>${state.config.isPublished ? 'TERPUBLIKASI KE PORTAL' : 'DRAF INTERNAL'}</span>
              </span>
            </h1>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.9); margin-top: 2px;">
              Peringkat #1–#${kuotaLulus} Otomatis <strong>Lulus (${kuotaLulus} Besar)</strong> &bull;
              Peringkat #${kuotaLulus + 1}–#${batasCadangan} Otomatis <strong>Cadangan (${kuotaCadangan} Kuota)</strong> &bull;
              Peringkat #${batasCadangan + 1}+ <strong>Gagal &amp; Bisa Coba di Gelombang Selanjutnya</strong>
            </div>
          </div>

          <div class="header-right-box" style="flex-wrap: wrap;">
            <div class="header-search-wrap">
              <span class="header-search-icon">🔍</span>
              <input
                type="search"
                id="input-search-kelulusan"
                class="header-search-input"
                placeholder="Cari Nama, NISN, atau #Ranking..."
                value="${escapeHTML(state.searchQuery)}"
                aria-label="Cari peserta seleksi"
              />
            </div>

            <a
              href="${pengumumanHref}"
              target="_blank"
              style="background: #f5a623; color: #0f172a; font-weight: 800; font-size: 0.78rem; padding: 9px 14px; border-radius: 9999px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
            >
              🎓 Simulasi Pengumuman Siswa &rarr;
            </a>
          </div>
        </header>

        <div class="kelulusan-content-body">

          <!-- 2. PENGATURAN KUOTA LULUS & CADANGAN (BISA DIEDIT ADMIN) -->
          <section class="quota-control-card" aria-label="Pengaturan Kuota Perankingan Otomatis">
            <div class="quota-card-header">
              <div>
                <h2 class="quota-card-title">
                  <span>⚙️ Pengaturan Kuota Kelulusan &amp; Cadangan Otomatis (Bisa Diedit)</span>
                </h2>
                <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: #64748b;">
                  Ubah angka <strong>Kuota Lulus Utama</strong> maupun <strong>Kuota Cadangan</strong> di bawah ini untuk mengatur batas kelulusan otomatis berdasarkan <strong>Nilai Akhir (${state.config.bobotRapor}% Rapor + ${state.config.bobotWawancara}% Wawancara)</strong>. Anda juga tetap bisa mengubah status kelulusan per siswa langsung pada tabel.
                </p>
              </div>
              <span style="font-size: 0.75rem; font-weight: 700; color: #006837; background: #eaf6ee; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 9999px;">
                No. SK: ${escapeHTML(state.config.nomorSK)}
              </span>
            </div>

            <div class="quota-grid-row">
              <!-- Input 1: Kuota Lulus (Default: 80 Besar - Bisa Diedit) -->
              <div class="quota-input-box" style="border-left: 4px solid #16a34a;">
                <div class="quota-label-row">
                  <span>🏆 Kuota Lulus Utama (Ranking Teratas)</span>
                  <span class="quota-badge-pill" style="background: #dcfce7; color: #15803d;">BISA DIEDIT</span>
                </div>
                <div class="quota-input-control" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px;">
                  <input
                    type="number"
                    id="input-kuota-lulus"
                    class="quota-number-input"
                    value="${kuotaLulus}"
                    min="1"
                    max="${stats.total}"
                    aria-label="Edit Kuota Lulus Utama"
                  />
                  <span style="font-size: 0.78rem; font-weight: 800; color: #475569; white-space: nowrap;">Besar (Lulus)</span>
                </div>
                <div class="quota-sub-info">
                  Otomatis meluluskan <strong>Peringkat #1 s/d #${kuotaLulus}</strong> (Skor: ${formatScore(stats.minScoreLulus)} – ${formatScore(stats.maxScoreLulus)})
                </div>
              </div>

              <!-- Input 2: Kuota Cadangan (Default: 10 Cadangan - Bisa Diedit) -->
              <div class="quota-input-box" style="border-left: 4px solid #f59e0b;">
                <div class="quota-label-row">
                  <span>⏳ Kuota Cadangan (Daftar Tunggu)</span>
                  <span class="quota-badge-pill quota-badge-ips">BISA DIEDIT</span>
                </div>
                <div class="quota-input-control" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px;">
                  <input
                    type="number"
                    id="input-kuota-cadangan"
                    class="quota-number-input"
                    style="color: #b45309;"
                    value="${kuotaCadangan}"
                    min="0"
                    max="100"
                    aria-label="Edit Kuota Cadangan"
                  />
                  <span style="font-size: 0.78rem; font-weight: 800; color: #475569; white-space: nowrap;">Siswa Cadangan</span>
                </div>
                <div class="quota-sub-info">
                  Otomatis menetapkan <strong>Peringkat #${kuotaLulus + 1} s/d #${batasCadangan}</strong> sebagai Cadangan, dan <strong>#${batasCadangan + 1}+ Gagal (Gelombang 2)</strong>
                </div>
              </div>

              <!-- Tombol Aksi Terapkan Perankingan Otomatis -->
              <div class="quota-action-box" style="display: flex; flex-direction: column; gap: 6px;">
                <button type="button" id="btn-run-auto-ranking" class="btn-run-ranking">
                  <span>⚡ Terapkan Kuota &amp; Ranking Otomatis</span>
                </button>
                <span style="font-size: 0.7rem; color: #64748b; text-align: center;">
                  Reset ke batas kuota otomatis (${kuotaLulus} Lulus, ${kuotaCadangan} Cadangan)
                </span>
              </div>
            </div>
          </section>

          <!-- 3. 4 KARTU RINGKASAN STATISTIK (SESUAI KELULUSAN.CSS) -->
          <section class="kelulusan-summary-grid" aria-label="Ringkasan Statistik Kelulusan">
            <div class="summary-stat-card card-total">
              <div class="stat-icon-wrapper-kel">👥</div>
              <div class="stat-info-col">
                <span class="stat-label-text">Total Peserta Diranking</span>
                <span class="stat-number-text">${stats.total}</span>
                <span class="stat-sub-text">Diurutkan berdasarkan Nilai Akhir</span>
              </div>
            </div>

            <div class="summary-stat-card card-lulus">
              <div class="stat-icon-wrapper-kel">🎉</div>
              <div class="stat-info-col">
                <span class="stat-label-text">Lulus (${kuotaLulus} Besar)</span>
                <span class="stat-number-text" style="color: #15803d;">${stats.lulusCount}</span>
                <span class="stat-sub-text">Peringkat #1 – #${kuotaLulus} &bull; Lanjut Daftar Ulang</span>
              </div>
            </div>

            <div class="summary-stat-card card-cadangan">
              <div class="stat-icon-wrapper-kel">⏳</div>
              <div class="stat-info-col">
                <span class="stat-label-text">Cadangan (${kuotaCadangan} Kuota)</span>
                <span class="stat-number-text" style="color: #b45309;">${stats.cadanganCount}</span>
                <span class="stat-sub-text">Peringkat #${kuotaLulus + 1} – #${batasCadangan} &bull; Daftar Tunggu</span>
              </div>
            </div>

            <div class="summary-stat-card card-tidak-lulus">
              <div class="stat-icon-wrapper-kel">🔄</div>
              <div class="stat-info-col">
                <span class="stat-label-text">Gagal (Coba Gelombang 2)</span>
                <span class="stat-number-text" style="color: #dc2626;">${stats.gagalCount}</span>
                <span class="stat-sub-text">Peringkat #${batasCadangan + 1} – #${stats.total} &bull; Gelombang Selanjutnya</span>
              </div>
            </div>
          </section>

          <!-- 4. TABEL DATA PERANKINGAN & EDIT STATUS KELULUSAN -->
          <section class="kelulusan-table-card" aria-label="Tabel Perankingan & Status Kelulusan">
            <div class="table-action-toolbar">
              <div class="toolbar-left-group">
                <h3 class="table-section-title">📋 Daftar Peringkat Nilai Akhir &amp; Status Kelulusan</h3>
                <div class="table-filter-pills" role="tablist">
                  <button
                    type="button"
                    class="filter-pill-btn ${state.currentFilter === 'ALL' ? 'active' : ''}"
                    data-filter="ALL"
                  >
                    Semua (${stats.total})
                  </button>
                  <button
                    type="button"
                    class="filter-pill-btn ${state.currentFilter === 'CUTOFF_HIGHLIGHT' ? 'active' : ''}"
                    data-filter="CUTOFF_HIGHLIGHT"
                  >
                    ⚡ Sorotan Perbatasan (#1–3, #${Math.max(1, kuotaLulus - 2)}–#${batasCadangan + 5})
                  </button>
                  <button
                    type="button"
                    class="filter-pill-btn ${state.currentFilter === 'LULUS' ? 'active' : ''}"
                    data-filter="LULUS"
                  >
                    🏆 Lulus (${stats.lulusCount})
                  </button>
                  <button
                    type="button"
                    class="filter-pill-btn ${state.currentFilter === 'CADANGAN' ? 'active' : ''}"
                    data-filter="CADANGAN"
                  >
                    ⏳ Cadangan (${stats.cadanganCount})
                  </button>
                  <button
                    type="button"
                    class="filter-pill-btn ${state.currentFilter === 'TIDAK_LULUS' ? 'active' : ''}"
                    data-filter="TIDAK_LULUS"
                  >
                    🔄 Gagal / Gel. Selanjutnya (${stats.gagalCount})
                  </button>
                </div>
              </div>

              <div class="toolbar-right-actions">
                <button type="button" id="btn-open-draft-pdf" class="btn-draft-pdf">
                  <span>📄 Berita Acara &amp; Rekap SK</span>
                </button>
                <button
                  type="button"
                  id="btn-open-publish-modal"
                  class="btn-publish-portal ${state.config.isPublished ? 'is-published' : ''}"
                >
                  <span>${state.config.isPublished ? '✅ Terpublikasi ke Portal' : '🚀 Publikasikan ke Portal'}</span>
                </button>
              </div>
            </div>

            <!-- Bar Navigasi Cepat Lompat ke Zona Ranking -->
            <div class="quick-jump-bar">
              <div style="font-size: 0.76rem; color: #334155; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>🎯 <strong>Zona Kuota Saat Ini:</strong></span>
                <span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:6px;">#1 – #${kuotaLulus}: Otomatis Lulus (${kuotaLulus} Besar)</span>
                <span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:6px;">#${kuotaLulus + 1} – #${batasCadangan}: Otomatis Cadangan (${kuotaCadangan} Kuota)</span>
                <span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:6px;">#${batasCadangan + 1}+: Gagal (Bisa Coba Gelombang Selanjutnya)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="quick-jump-btn" data-jump-rank="1">⬆️ Lompat ke #1</button>
                <button type="button" class="quick-jump-btn" data-jump-rank="${kuotaLulus + 1}">⏳ Lompat ke #${kuotaLulus + 1} (Cadangan)</button>
                <button type="button" class="quick-jump-btn" data-jump-rank="${batasCadangan + 1}">🔄 Lompat ke #${batasCadangan + 1} (Gagal)</button>
              </div>
            </div>

            <!-- Tabel Data Peserta -->
            <div class="table-scroll-container">
              <table class="kelulusan-table" aria-label="Daftar Perankingan Nilai Akhir Peserta SPMB">
                <thead>
                  <tr>
                    <th style="width: 85px;">Peringkat</th>
                    <th>Identitas Peserta &amp; NISN</th>
                    <th>Asal Sekolah &amp; Jurusan</th>
                    <th>Rincian Nilai</th>
                    <th>Nilai Akhir</th>
                    <th>Status Kelulusan (Bisa Diedit)</th>
                    <th>Keterangan &amp; Tindak Lanjut</th>
                    <th style="text-align: right;">Surat Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderTableRowsWithZoneDividers(filteredStudents, kuotaLulus, batasCadangan)}
                </tbody>
              </table>
            </div>

            <div class="kelulusan-table-footer">
              <div>
                Menampilkan <strong>${filteredStudents.length}</strong> dari <strong>${stats.total}</strong> peserta.
              </div>
              <div>
                💡 <strong>Tips:</strong> Status kelulusan otomatis mengikuti kuota peringkat, namun Anda tetap dapat <strong>mengubah langsung melalui dropdown Status Kelulusan</strong> di setiap baris.
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  `;

  bindEvents();
}

function renderTableRowsWithZoneDividers(students, kuotaLulus, batasCadangan) {
  if (students.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: #64748b;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔎</div>
          <div style="font-weight: 800; color: #0f172a; font-size: 0.95rem;">Tidak Ada Peserta yang Cocok dengan Pencarian</div>
          <div style="font-size: 0.8rem; margin-top: 4px;">Silakan ubah kata kunci pencarian atau pilih filter Semua.</div>
        </td>
      </tr>
    `;
  }

  let html = '';
  let shownZoneLulus = false;
  let shownZoneCadangan = false;
  let shownZoneGagal = false;

  students.forEach((student) => {
    const rank = student.peringkat_global;

    if (rank <= kuotaLulus && !shownZoneLulus) {
      shownZoneLulus = true;
      html += `
        <tr class="cutoff-divider-row zone-lulus">
          <td colspan="8">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:900; font-size:0.78rem; letter-spacing:0.02em;">
                🏆 ZONA 1 — PERINGKAT #1 S.D. #${kuotaLulus} (KUOTA LULUS UTAMA: ${kuotaLulus} BESAR NILAI AKHIR TERATAS)
              </span>
              <span style="font-size:0.74rem; font-weight:700;">
                Otomatis Lulus &bull; Lanjut Daftar Ulang (Modul 06)
              </span>
            </div>
          </td>
        </tr>
      `;
    } else if (rank > kuotaLulus && rank <= batasCadangan && !shownZoneCadangan) {
      shownZoneCadangan = true;
      html += `
        <tr class="cutoff-divider-row zone-cadangan">
          <td colspan="8">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:900; font-size:0.78rem; letter-spacing:0.02em;">
                ⏳ BATAS KUOTA ${kuotaLulus} BESAR &bull; ZONA 2 — PERINGKAT #${kuotaLulus + 1} S.D. #${batasCadangan} (${batasCadangan - kuotaLulus} KUOTA CADANGAN OTOMATIS)
              </span>
              <span style="font-size:0.74rem; font-weight:700;">
                Otomatis Cadangan &bull; Naik jika kuota ${kuotaLulus} Besar kosong
              </span>
            </div>
          </td>
        </tr>
      `;
    } else if (rank > batasCadangan && !shownZoneGagal) {
      shownZoneGagal = true;
      html += `
        <tr class="cutoff-divider-row zone-gagal">
          <td colspan="8">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:900; font-size:0.78rem; letter-spacing:0.02em;">
                🔄 BATAS KUOTA CADANGAN (#${batasCadangan}) &bull; ZONA 3 — PERINGKAT #${batasCadangan + 1} KE BAWAH: GAGAL &amp; BISA COBA DI GELOMBANG SELANJUTNYA
              </span>
              <span style="font-size:0.74rem; font-weight:700;">
                Otomatis diarahkan ke ${escapeHTML(state.config.gelombangSelanjutnya)}
              </span>
            </div>
          </td>
        </tr>
      `;
    }

    html += renderSingleStudentRow(student, kuotaLulus, batasCadangan);
  });

  return html;
}

function renderSingleStudentRow(student, kuotaLulus, batasCadangan) {
  const rank = student.peringkat_global;
  let rankBadgeClass = '';
  if (rank === 1) rankBadgeClass = 'top-1';
  else if (rank <= 3) rankBadgeClass = 'top-3';

  const majorClass = student.pilihan_jurusan === 'MIPA' ? 'mipa' : 'ips';

  let statusClass = 'status-tidak-lulus';
  if (student.status_kelulusan === 'LULUS') statusClass = 'status-lulus';
  else if (student.status_kelulusan === 'CADANGAN') statusClass = 'status-cadangan';

  let keteranganHtml = '';
  if (student.status_kelulusan === 'LULUS') {
    keteranganHtml = `
      <div style="font-size: 0.76rem; font-weight: 700; color: #15803d;">
        ${student.manual_override ? '✏️ Diubah Manual: Lulus' : `✓ Otomatis Lulus (${kuotaLulus} Besar — Rank #${rank})`}
      </div>
      <div style="font-size: 0.7rem; color: #475569; margin-top: 2px;">
        Lanjut Daftar Ulang (Modul 06)
      </div>
    `;
  } else if (student.status_kelulusan === 'CADANGAN') {
    const noCad = student.urutan_cadangan || Math.max(1, rank - kuotaLulus);
    keteranganHtml = `
      <div style="font-size: 0.76rem; font-weight: 700; color: #b45309;">
        ${student.manual_override ? '✏️ Diubah Manual: Cadangan' : `⏳ Otomatis Cadangan #${noCad} (Rank #${rank})`}
      </div>
      <div style="font-size: 0.7rem; color: #475569; margin-top: 2px;">
        Menunggu Kuota Kosong Daftar Ulang
      </div>
    `;
  } else {
    keteranganHtml = `
      <div style="font-size: 0.75rem; font-weight: 700; color: #b91c1c;">
        ${student.manual_override ? '✏️ Diubah Manual: Gagal' : `✕ Di luar kuota #1–#${batasCadangan} (Rank #${rank})`}
      </div>
      <div class="next-wave-pill">
        🔄 Bisa Coba di ${escapeHTML(state.config.gelombangSelanjutnya)}
      </div>
    `;
  }

  return `
    <tr id="row-rank-${rank}" data-student-id="${escapeHTML(student.id)}">
      <td>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="col-rank-badge ${rankBadgeClass}" title="Peringkat Nilai Akhir #${rank}">
            #${rank}
          </span>
          <span style="font-size: 0.7rem; color: #64748b; font-weight: 700;">
            /${state.students.length}
          </span>
        </div>
      </td>

      <td>
        <div class="student-meta-group">
          <div class="student-avatar-badge">${escapeHTML(getInitials(student.nama_lengkap))}</div>
          <div class="student-name-col">
            <span class="student-fullname">${escapeHTML(student.nama_lengkap)}</span>
            <span class="student-reg-nisn">${escapeHTML(student.no_pendaftaran)} • NISN: ${escapeHTML(student.nisn)}</span>
          </div>
        </div>
      </td>

      <td>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: 600; color: #334155; font-size: 0.8rem;">${escapeHTML(student.asal_sekolah)}</span>
          <div>
            <span class="major-badge-pill ${majorClass}">${escapeHTML(student.pilihan_jurusan)}</span>
            <span style="font-size: 0.7rem; color: #64748b; margin-left: 4px;">${escapeHTML(student.jalur_pendaftaran)}</span>
          </div>
        </div>
      </td>

      <td>
        <div style="font-size: 0.76rem; color: #334155; line-height: 1.4;">
          <div>📘 Rapor: <strong>${formatScore(student.nilai_rapor)}</strong></div>
          <div>🎙️ Wawancara: <strong>${formatScore(student.nilai_wawancara)}</strong></div>
        </div>
      </td>

      <td>
        <div class="score-cell-box">
          <span class="score-final-value">${formatScore(student.nilai_akhir)}</span>
          <span class="score-breakdown-sub">Ranking #${rank}</span>
        </div>
      </td>

      <td>
        <select
          class="status-select-control ${statusClass}"
          data-action="change-status"
          data-id="${escapeHTML(student.id)}"
          aria-label="Edit Status Kelulusan ${escapeHTML(student.nama_lengkap)}"
        >
          <option value="LULUS" ${student.status_kelulusan === 'LULUS' ? 'selected' : ''}>✓ LULUS (${kuotaLulus} Besar)</option>
          <option value="CADANGAN" ${student.status_kelulusan === 'CADANGAN' ? 'selected' : ''}>⏳ CADANGAN (${batasCadangan - kuotaLulus} Kuota)</option>
          <option value="TIDAK LULUS" ${student.status_kelulusan === 'TIDAK LULUS' ? 'selected' : ''}>✕ GAGAL (Coba Gel. 2)</option>
        </select>
      </td>

      <td>
        ${keteranganHtml}
      </td>

      <td style="text-align: right;">
        <button
          type="button"
          class="btn-print-skl"
          data-action="print-skl"
          data-id="${escapeHTML(student.id)}"
          title="Cetak Surat Keterangan Hasil Seleksi"
        >
          <span>🖨️ Surat Hasil</span>
        </button>
      </td>
    </tr>
  `;
}

function bindEvents() {
  // 1. Tombol Terapkan Kuota & Perankingan Otomatis
  const btnAutoRank = document.getElementById('btn-run-auto-ranking');
  if (btnAutoRank) {
    btnAutoRank.addEventListener('click', () => {
      const inputLulus = document.getElementById('input-kuota-lulus');
      const inputCadangan = document.getElementById('input-kuota-cadangan');

      if (inputLulus) state.config.kuotaLulus = Math.max(1, parseInt(inputLulus.value, 10) || 80);
      if (inputCadangan) {
        const parsedCad = parseInt(inputCadangan.value, 10);
        state.config.kuotaCadangan = !isNaN(parsedCad) && parsedCad >= 0 ? parsedCad : 10;
      }

      runAutomaticRankingAndGraduation(true);
      renderApp();

      const stats = computeSummaryStats();
      showToast(
        'Kuota & Perankingan Otomatis Diterapkan!',
        `Kuota Lulus: ${state.config.kuotaLulus} Besar (${stats.lulusCount} siswa), Cadangan: ${state.config.kuotaCadangan} (${stats.cadanganCount} siswa), Gagal/Gelombang Selanjutnya: ${stats.gagalCount} siswa.`,
        'success'
      );
    });
  }

  // 2. Perubahan langsung pada Input Kuota Lulus & Input Kuota Cadangan
  const inputLulusEl = document.getElementById('input-kuota-lulus');
  const inputCadanganEl = document.getElementById('input-kuota-cadangan');
  [inputLulusEl, inputCadanganEl].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      state.config.kuotaLulus = Math.max(1, parseInt(inputLulusEl.value, 10) || 80);
      const parsedCad = parseInt(inputCadanganEl.value, 10);
      state.config.kuotaCadangan = !isNaN(parsedCad) && parsedCad >= 0 ? parsedCad : 10;
      runAutomaticRankingAndGraduation(true);
      renderApp();
      showToast(
        'Pengaturan Kuota Diperbarui',
        `Batas otomatis disesuaikan menjadi ${state.config.kuotaLulus} Besar Lulus dan ${state.config.kuotaCadangan} Cadangan.`,
        'success'
      );
    });
  });

  // 3. Edit Status Kelulusan per Siswa melalui Dropdown (<select>)
  const statusSelects = document.querySelectorAll('[data-action="change-status"]');
  statusSelects.forEach((selectEl) => {
    selectEl.addEventListener('change', (e) => {
      const studentId = selectEl.getAttribute('data-id');
      const newStatus = e.target.value;
      const student = state.students.find((s) => s.id === studentId);
      if (!student) return;

      student.status_kelulusan = newStatus;
      student.manual_override = true;
      applyStudentStatusMetadata(student, state.config.kuotaLulus, state.config.kuotaCadangan);
      saveStateToStorage();
      renderApp();

      showToast(
        'Status Kelulusan Diperbarui',
        `Status ${student.nama_lengkap} (Peringkat #${student.peringkat_global}) diubah menjadi ${newStatus}.`,
        'success'
      );
    });
  });

  // 4. Input Pencarian
  const searchInput = document.getElementById('input-search-kelulusan');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      const cursorPos = e.target.selectionStart;
      renderApp();
      const newSearchInput = document.getElementById('input-search-kelulusan');
      if (newSearchInput) {
        newSearchInput.focus();
        try {
          newSearchInput.setSelectionRange(cursorPos, cursorPos);
        } catch (_) {}
      }
    });
  }

  // 5. Filter Pills
  const filterButtons = document.querySelectorAll('.filter-pill-btn');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentFilter = btn.getAttribute('data-filter') || 'ALL';
      renderApp();
    });
  });

  // 6. Tombol Quick Jump ke Peringkat #1, #81, #91
  const jumpButtons = document.querySelectorAll('[data-jump-rank]');
  jumpButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetRank = parseInt(btn.getAttribute('data-jump-rank'), 10) || 1;
      if (state.currentFilter !== 'ALL') {
        state.currentFilter = 'ALL';
        state.searchQuery = '';
        renderApp();
      }
      setTimeout(() => {
        const targetRow = document.getElementById(`row-rank-${targetRank}`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRow.style.transition = 'background-color 0.4s ease';
          targetRow.style.backgroundColor = '#fef9c3';
          setTimeout(() => {
            targetRow.style.backgroundColor = '';
          }, 1800);
        }
      }, 60);
    });
  });

  // 7. Tombol Cetak SKL per baris
  const printSklButtons = document.querySelectorAll('[data-action="print-skl"]');
  printSklButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const studentId = btn.getAttribute('data-id');
      openSklModal(studentId);
    });
  });

  // 8. Tombol Berita Acara & Rekap SK
  const btnOpenDraft = document.getElementById('btn-open-draft-pdf');
  if (btnOpenDraft) {
    btnOpenDraft.addEventListener('click', () => openDraftSkModal());
  }

  // 9. Tombol Publikasikan ke Portal
  const btnOpenPublish = document.getElementById('btn-open-publish-modal');
  if (btnOpenPublish) {
    btnOpenPublish.addEventListener('click', () => openPublishModal());
  }
}

function openSklModal(studentId) {
  const student = state.students.find((s) => s.id === studentId);
  if (!student) return;

  state.selectedStudentForSkl = student;
  const modalRoot = document.getElementById('kel-modal-root');
  if (!modalRoot) return;

  const kuotaLulus = state.config.kuotaLulus;
  const kuotaCadangan = state.config.kuotaCadangan;

  let decisionBannerStyle = 'background: #f0fdf4; border-color: #16a34a;';
  let decisionColor = '#15803d';
  let decisionText = `DITERIMA / LULUS SELEKSI (${kuotaLulus} BESAR)`;
  let subNoteText = `Terpilih pada Peringkat #${student.peringkat_global} dari ${state.students.length} peserta (${kuotaLulus} Besar Nilai Akhir Teratas). Silakan melakukan Daftar Ulang pada Modul 06.`;

  if (student.status_kelulusan === 'CADANGAN') {
    decisionBannerStyle = 'background: #fffbeb; border-color: #f59e0b;';
    decisionColor = '#b45309';
    decisionText = `CADANGAN (URUTAN CADANGAN #${student.urutan_cadangan || 1} DARI ${kuotaCadangan})`;
    subNoteText = `Berada pada Peringkat #${student.peringkat_global}. Apabila terdapat peserta ${kuotaLulus} Besar yang mengundurkan diri hingga batas daftar ulang, sistem otomatis menaikkan status Anda menjadi LULUS.`;
  } else if (student.status_kelulusan === 'TIDAK LULUS') {
    decisionBannerStyle = 'background: #fef2f2; border-color: #ef4444;';
    decisionColor = '#dc2626';
    decisionText = 'BELUM LULUS PADA GELOMBANG INI';
    subNoteText = `Berada pada Peringkat #${student.peringkat_global} (di luar kuota ${kuotaLulus} Besar & ${kuotaCadangan} Cadangan). Jangan berkecil hati — Anda DAPAT MENCOBA KEMBALI di ${state.config.gelombangSelanjutnya} tanpa membuat akun baru.`;
  }

  modalRoot.innerHTML = `
    <div class="kel-modal-backdrop open" id="skl-modal-backdrop" role="dialog" aria-modal="true">
      <div class="kel-modal-card modal-large">
        <div class="kel-modal-header">
          <h3 class="kel-modal-title">🖨️ Surat Keterangan Hasil Perankingan SPMB</h3>
          <button type="button" class="kel-btn-close" id="btn-close-skl-modal" aria-label="Tutup">&times;</button>
        </div>

        <div class="kel-modal-body">
          <div class="skl-doc-container">
            <div class="skl-header-kop">
              <div class="skl-org-name">MAJELIS PENDIDIKAN DASAR DAN MENENGAH PIMPINAN DAERAH MUHAMMADIYAH KOTA YOGYAKARTA</div>
              <div class="skl-school-title">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
              <div class="skl-school-address">Jl. Kapten Piere Tendean No. 58 Wirobrajan, Yogyakarta 55252 • Telp. (0274) 373850 • Terakreditasi A (Unggul)</div>
            </div>

            <div class="skl-doc-number-box">
              <div class="skl-main-heading">SURAT KETERANGAN HASIL SELEKSI &amp; PERANKINGAN SPMB</div>
              <div class="skl-number-text">Nomor: ${escapeHTML(state.config.nomorSK)}/${escapeHTML(student.no_pendaftaran.split('-').pop())}</div>
            </div>

            <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 12px;">
              Berdasarkan hasil perankingan Nilai Akhir Sistem Penerimaan Murid Baru (SPMB) SMA Muhammadiyah 3 Yogyakarta Tahun Ajaran 2026/2027 (${escapeHTML(state.config.gelombangSaatIni)}), Panitia menetapkan bahwa:
            </p>

            <table class="skl-meta-table">
              <tbody>
                <tr>
                  <td style="width: 190px; font-weight: 700;">Nomor Pendaftaran</td>
                  <td style="width: 15px;">:</td>
                  <td style="font-weight: 800;">${escapeHTML(student.no_pendaftaran)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 700;">Nama Lengkap</td>
                  <td>:</td>
                  <td style="font-weight: 800;">${escapeHTML(student.nama_lengkap)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 700;">NISN &amp; Asal Sekolah</td>
                  <td>:</td>
                  <td>${escapeHTML(student.nisn)} — ${escapeHTML(student.asal_sekolah)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 700;">Nilai Akhir &amp; Peringkat</td>
                  <td>:</td>
                  <td>
                    <strong>${formatScore(student.nilai_akhir)}</strong>
                    (Peringkat <strong>#${student.peringkat_global}</strong> dari <strong>${state.students.length} Peserta</strong>)
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="skl-decision-banner" style="${decisionBannerStyle}">
              <div style="font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 4px;">KEPUTUSAN HASIL SELEKSI:</div>
              <div class="skl-decision-tag" style="color: ${decisionColor};">${decisionText}</div>
              <div class="skl-decision-major">PEMINATAN: ${escapeHTML(student.pilihan_jurusan)}</div>
            </div>

            <p style="font-size: 0.82rem; line-height: 1.5; color: #334155;">
              <strong>Keterangan Tindak Lanjut:</strong> ${escapeHTML(subNoteText)}
            </p>
          </div>
        </div>

        <div class="kel-modal-footer">
          <button type="button" class="btn-draft-pdf" id="btn-cancel-skl-modal">Tutup</button>
          <button type="button" class="btn-publish-portal" id="btn-trigger-print-skl">
            <span>🖨️ Cetak Surat Hasil</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => {
    modalRoot.innerHTML = '';
  };

  document.getElementById('btn-close-skl-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-skl-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-trigger-print-skl')?.addEventListener('click', () => window.print());
}

function openDraftSkModal() {
  const modalRoot = document.getElementById('kel-modal-root');
  if (!modalRoot) return;

  const stats = computeSummaryStats();
  const kuotaLulus = state.config.kuotaLulus;
  const kuotaCadangan = state.config.kuotaCadangan;
  const batasCadangan = kuotaLulus + kuotaCadangan;

  modalRoot.innerHTML = `
    <div class="kel-modal-backdrop open" role="dialog" aria-modal="true">
      <div class="kel-modal-card modal-large">
        <div class="kel-modal-header">
          <h3 class="kel-modal-title">📄 Berita Acara Perankingan &amp; Kelulusan SPMB</h3>
          <button type="button" class="kel-btn-close" id="btn-close-draft-modal">&times;</button>
        </div>

        <div class="kel-modal-body">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 1.25rem;">
            <h4 style="margin: 0 0 8px 0; color: #006837;">Rekapitulasi Keputusan Seleksi (${escapeHTML(state.config.nomorSK)})</h4>
            <p style="margin: 0 0 12px 0; font-size: 0.82rem; color: #475569;">
              Berdasarkan pemeringkatan Nilai Akhir terhadap <strong>${stats.total} peserta</strong>:
            </p>
            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.84rem; line-height: 1.7; color: #1e293b;">
              <li>
                <strong>Kuota Lulus Utama (Peringkat #1 s.d. #${kuotaLulus})</strong>:
                Sebanyak <strong>${stats.lulusCount} siswa</strong> dinyatakan <strong style="color:#15803d;">LULUS</strong> (Nilai Akhir: ${formatScore(stats.minScoreLulus)} – ${formatScore(stats.maxScoreLulus)}).
              </li>
              <li>
                <strong>Kuota Cadangan (Peringkat #${kuotaLulus + 1} s.d. #${batasCadangan})</strong>:
                Sebanyak <strong>${stats.cadanganCount} siswa</strong> ditetapkan sebagai <strong style="color:#b45309;">CADANGAN</strong>.
              </li>
              <li>
                <strong>Di Luar Kuota (Peringkat #${batasCadangan + 1} s.d. #${stats.total})</strong>:
                Sebanyak <strong>${stats.gagalCount} siswa</strong> dinyatakan <strong style="color:#dc2626;">GAGAL SELEKSI GELOMBANG INI</strong> dan dapat mencoba kembali di <strong>${escapeHTML(state.config.gelombangSelanjutnya)}</strong>.
              </li>
            </ul>
          </div>
        </div>

        <div class="kel-modal-footer">
          <button type="button" class="btn-draft-pdf" id="btn-cancel-draft-modal">Tutup</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => {
    modalRoot.innerHTML = '';
  };
  document.getElementById('btn-close-draft-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-draft-modal')?.addEventListener('click', closeModal);
}

function openPublishModal() {
  const stats = computeSummaryStats();
  state.config.isPublished = true;
  saveStateToStorage();
  renderApp();
  showToast(
    'Hasil Kelulusan Dipublikasikan!',
    `${stats.lulusCount} Lulus (${state.config.kuotaLulus} Besar), ${stats.cadanganCount} Cadangan, dan ${stats.gagalCount} Gagal (Bisa Coba Gelombang Selanjutnya) telah tersinkron ke Portal Siswa.`,
    'success'
  );
}

export function renderKelulusan(containerId = 'kelulusan-viewport') {
  ensureKelulusanStyles();
  state.activeContainerId = containerId;

  const container =
    document.getElementById(containerId) ||
    document.getElementById('kelulusan-viewport') ||
    document.getElementById('module-viewport');

  if (!container) return;

  container.innerHTML = `
    <div id="kelulusan-app-root" class="kelulusan-module-wrapper"></div>
    <div id="kel-modal-root"></div>
    <div id="kel-toast-container" class="kel-toast-container" aria-live="polite"></div>
  `;

  loadInitialState();
  renderApp();
}

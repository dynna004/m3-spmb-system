/**
 * =========================================================================================
 * MODUL 06: VERIFIKASI LOKET & DAFTAR ULANG
 * SMA Muhammadiyah 3 Yogyakarta - SPMB System
 * =========================================================================================
 * Strategi Arsitektur: HYBRID (Dapat berjalan standalone di PC Loket Fisik atau embedded di Main App)
 * 
 * Modul ini menangani:
 * 1. Pencarian & Pemanggilan Antrean Siswa Datang (No. Registrasi / Nama / NISN)
 * 2. [SIMULASI INTEGRASI MODUL 05 - KELULUSAN]: Validasi status kelulusan seleksi ("LULUS")
 * 3. [SIMULASI INTEGRASI MODUL 03 - KEUANGAN]: Validasi status pembayaran uang pangkal ("LUNAS")
 * 4. Pengecekan Berkas Fisik (Checklist Dokumen Asli/Fotokopi yang diserahkan wali/siswa)
 * 5. [INTEGRASI DENGAN MODUL 07 - PENGELOLAAN & LOCK DATA]:
 *    Pengesahan keabsahan dokumen fisik (status_daftar_ulang = "TERVERIFIKASI") sehingga siap dikunci di Modul 07
 * 6. Cetak Bukti Tanda Terima Fisik Berkas & Berita Acara Daftar Ulang
 * =========================================================================================
 */

// Konstanta Key LocalStorage Terpusat
const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';
const STORAGE_KEY_SSOT_TU   = 'm3_spmb_tu_db';
const STORAGE_KEY_KEUANGAN  = 'spmb_uang_pangkal_db';

// Daftar Dokumen Fisik Wajib & Pendukung yang harus diperiksa di Meja Loket
export const DAFTAR_DOKUMEN_FISIK = [
  { id: 'doc_kk', label: 'Fotokopi Kartu Keluarga (KK) & Dokumen Asli Ditunjukkan', wajib: true },
  { id: 'doc_akta', label: 'Fotokopi Akta Kelahiran & Dokumen Asli Ditunjukkan', wajib: true },
  { id: 'doc_ijazah', label: 'Ijazah SMP / Surat Keterangan Lulus (SKL) Asli / Legalisir', wajib: true },
  { id: 'doc_foto', label: 'Pas Foto Terbaru Ukuran 3x4 Berwarna (2 Lembar)', wajib: true },
  { id: 'doc_pernyataan', label: 'Surat Pernyataan Calon Siswa & Tata Tertib Bermaterai', wajib: true },
  { id: 'doc_kartu_daftar', label: 'Cetak Lembar Tanda Peserta / Formulir Pendaftaran Online', wajib: false }
];

// Seed Data Komprehensif (Menjamin ada data uji untuk semua variasi kondisi loket)
const SEED_LOKET_STUDENTS = [
  {
    id_pendaftar: "SPMB-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    nisn: "0051234567",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta",
    no_wa: "081234567891",
    email: "ahmad@spmb.id",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "MENUNGGU_VERIFIKASI",
    is_locked: false,
    dokumen_terverifikasi: [],
    catatan_loket: ""
  },
  {
    id_pendaftar: "SPMB-2026-002",
    nama_lengkap: "Budi Santoso",
    nisn: "1234567890",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 1 Yogyakarta",
    no_wa: "081234567890",
    email: "budi@spmb.id",
    status_kelulusan: "LULUS",
    status_pembayaran: "BELUM_LUNAS", // Menguji kondisi Incomplete Keuangan
    status_daftar_ulang: "MENUNGGU_PEMBAYARAN",
    is_locked: false,
    dokumen_terverifikasi: [],
    catatan_loket: "Menunggu pelunasan cicilan kedua di loket keuangan."
  },
  {
    id_pendaftar: "SPMB-2026-003",
    nama_lengkap: "Siti Nurhaliza",
    nisn: "0062345671",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta",
    no_wa: "081398765432",
    email: "siti@spmb.id",
    status_kelulusan: "TIDAK LULUS", // Menguji kondisi Incomplete Kelulusan
    status_pembayaran: "BELUM_LUNAS",
    status_daftar_ulang: "TIDAK_MEMENUHI_SYARAT",
    is_locked: false,
    dokumen_terverifikasi: [],
    catatan_loket: "Tidak lolos tahap seleksi akademik & wawancara."
  },
  {
    id_pendaftar: "SPMB-2026-004",
    nama_lengkap: "Rizky Ramadhan",
    nisn: "0058765432",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 5 Yogyakarta",
    no_wa: "081299887766",
    email: "rizky@spmb.id",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "TERVERIFIKASI", // Menguji kondisi Locked / Completed
    is_locked: true,
    tgl_verifikasi: "2026-10-10T09:30:00Z",
    petugas_verifikasi: "Petugas Loket 1 (Admin SPMB)",
    dokumen_terverifikasi: ['doc_kk', 'doc_akta', 'doc_ijazah', 'doc_foto', 'doc_pernyataan', 'doc_kartu_daftar'],
    catatan_loket: "Dokumen asli lengkap dan sah. Siap generate NIS TU."
  }
];

/**
 * State Lokal Komponen Loket
 */
let loketState = {
  students: [],
  selectedStudentId: null,
  activeFilter: 'all', // 'all', 'ready', 'unpaid', 'unqualified', 'locked'
  searchQuery: '',
  checkedDocs: new Set(),
  officerNotes: '',
  isLoading: false,
  notification: null
};

// =========================================================================================
// [SIMULASI INTEGRASI ANTAR-MODUL: DATA LOADER & SINKRONISASI LOCALSTORAGE]
// =========================================================================================

/**
 * Mengambil dan mensinkronkan data pendaftar dari berbagai modul:
 * 1. spmb_pendaftar_db (Modul 01 Portal & Modul 02 Admin)
 * 2. m3_spmb_tu_db (SSoT Modul 08 Basis Data TU)
 * 3. spmb_uang_pangkal_db (Modul 03 Keuangan)
 */
export function getMergedLoketStudents() {
  let list = [];

  // 1. Ambil dari database utama Portal / SPMB
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.map(p => normalizeStudent(p));
      }
    }
  } catch (err) {
    console.warn('[Loket] Gagal membaca spmb_pendaftar_db:', err);
  }

  // Jika belum ada data di localStorage, inisialisasi dengan data seed standar
  if (list.length === 0) {
    list = SEED_LOKET_STUDENTS.map(p => ({ ...p }));
    saveToPrimaryStorage(list);
  }

  // 2. [SIMULASI INTEGRASI MODUL 03 - KEUANGAN]: Cross-check status pembayaran
  try {
    const rawUangPangkal = localStorage.getItem(STORAGE_KEY_KEUANGAN);
    if (rawUangPangkal) {
      const upDb = JSON.parse(rawUangPangkal);
      if (Array.isArray(upDb)) {
        upDb.forEach(item => {
          const s = list.find(x => x.id_pendaftar === item.id_pendaftar || x.nisn === item.nisn);
          if (s && item.status_pembayaran) {
            s.status_pembayaran = (item.status_pembayaran === 'lunas' || item.status_pembayaran === 'LUNAS') ? 'LUNAS' : 'BELUM_LUNAS';
          }
        });
      }
    }
  } catch (e) {
    console.warn('[Loket] Sync keuangan failed:', e);
  }

  // 3. [SIMULASI INTEGRASI MODUL 08 - SSoT TU]: Sinkronkan flag is_locked
  try {
    const rawSSoT = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    if (rawSSoT) {
      const ssot = JSON.parse(rawSSoT);
      if (Array.isArray(ssot.pendaftar)) {
        ssot.pendaftar.forEach(tuItem => {
          const s = list.find(x => x.id_pendaftar === (tuItem.id || tuItem.id_pendaftar) || x.nisn === tuItem.nisn);
          if (s) {
            if (tuItem.is_locked !== undefined) s.is_locked = tuItem.is_locked;
            if (tuItem.status_daftar_ulang) s.status_daftar_ulang = tuItem.status_daftar_ulang;
          }
        });
      }
    }
  } catch (e) {
    console.warn('[Loket] Sync SSoT failed:', e);
  }

  return list;
}

/**
 * Normalisasi objek siswa dari berbagai schema modul
 */
function normalizeStudent(raw) {
  const id = raw.id_pendaftar || raw.id || 'REG-UNKNOWN';
  const nama = raw.nama_lengkap || raw.nama || 'Tanpa Nama';
  const nisn = raw.nisn || '-';
  const jurusan = raw.pilihan_jurusan || raw.biodata?.pilihan_jurusan || 'MIPA';
  const sekolah = raw.asal_sekolah || raw.biodata?.asal_sekolah || 'SMP Muhammadiyah 1 Yogyakarta';
  
  // Status kelulusan (Modul 05)
  let statusLulus = raw.status_kelulusan;
  if (!statusLulus) {
    // Default fallback cerdas berdasarkan kelulusan
    statusLulus = (raw.nilai_akhir && raw.nilai_akhir >= 75) ? 'LULUS' : 'LULUS';
  }

  // Status pembayaran (Modul 03)
  let statusBayar = 'BELUM_LUNAS';
  if (raw.status_pembayaran === 'LUNAS' || raw.pembayaran?.status_pembayaran === 'lunas') {
    statusBayar = 'LUNAS';
  } else if (raw.status_pembayaran === 'lunas') {
    statusBayar = 'LUNAS';
  }

  return {
    id_pendaftar: id,
    nama_lengkap: nama,
    nisn: nisn,
    pilihan_jurusan: jurusan,
    asal_sekolah: sekolah,
    no_wa: raw.no_wa || raw.telepon || '081234567890',
    email: raw.email || `${nama.toLowerCase().replace(/\s+/g, '')}@spmb.id`,
    status_kelulusan: statusLulus.toUpperCase(),
    status_pembayaran: statusBayar,
    status_daftar_ulang: raw.status_daftar_ulang || (raw.is_locked ? 'TERVERIFIKASI' : 'MENUNGGU_VERIFIKASI'),
    is_locked: !!raw.is_locked,
    tgl_verifikasi: raw.tgl_verifikasi || null,
    petugas_verifikasi: raw.petugas_verifikasi || null,
    dokumen_terverifikasi: Array.isArray(raw.dokumen_terverifikasi) ? raw.dokumen_terverifikasi : [],
    catatan_loket: raw.catatan_loket || ''
  };
}

/**
 * Menyimpan data pembaruan loket ke penyimpanan primer dan sekunder
 */
function saveToPrimaryStorage(studentsList) {
  try {
    // Simpan ke spmb_pendaftar_db
    localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(studentsList));

    // Sinkronkan juga ke SSoT m3_spmb_tu_db (Modul 07 / 08)
    const ssotRaw = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    let ssotData = ssotRaw ? JSON.parse(ssotRaw) : { pendaftar: [] };
    if (!Array.isArray(ssotData.pendaftar)) ssotData.pendaftar = [];

    studentsList.forEach(item => {
      const idx = ssotData.pendaftar.findIndex(x => (x.id || x.id_pendaftar) === item.id_pendaftar || x.nisn === item.nisn);
      const ssotObj = {
        id: item.id_pendaftar,
        nama: item.nama_lengkap,
        nisn: item.nisn,
        pilihan_jurusan: item.pilihan_jurusan,
        status_kelulusan: item.status_kelulusan,
        status_pembayaran: item.status_pembayaran,
        status_daftar_ulang: item.status_daftar_ulang,
        is_locked: item.is_locked,
        tgl_verifikasi: item.tgl_verifikasi,
        catatan_loket: item.catatan_loket
      };

      if (idx !== -1) {
        ssotData.pendaftar[idx] = { ...ssotData.pendaftar[idx], ...ssotObj };
      } else {
        ssotData.pendaftar.push(ssotObj);
      }
    });

    localStorage.setItem(STORAGE_KEY_SSOT_TU, JSON.stringify(ssotData));

    // [REAL-TIME EVENT DISPATCHER]: Kabarkan ke modul lain (Modul 07 Lock Data & Modul 08 Schema TU)
    const event = new CustomEvent('spmb_db_updated', { 
      detail: { source: 'modul_06_verifikasi_loket', timestamp: new Date().toISOString() } 
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  } catch (err) {
    console.error('[Loket] Gagal menyimpan data:', err);
  }
}

// =========================================================================================
// [LOGIKA VERIFIKASI & PENGUNCIAN DATA SISWA (AKSI AKHIR)]
// =========================================================================================

/**
 * Menyelesaikan proses verifikasi dokumen fisik dan mengunci data siswa
 */
export function completeVerification(studentId) {
  const student = loketState.students.find(s => s.id_pendaftar === studentId);
  if (!student) return { success: false, message: 'Data siswa tidak ditemukan.' };

  // 1. Validasi Prasyarat Kelulusan (Modul 05)
  if (student.status_kelulusan !== 'LULUS') {
    return { success: false, message: 'Gagal: Siswa tidak berstatus LULUS pada Modul Penetapan Kelulusan.' };
  }

  // 2. Validasi Prasyarat Keuangan (Modul 03)
  if (student.status_pembayaran !== 'LUNAS') {
    return { success: false, message: 'Gagal: Pembayaran Uang Pangkal siswa belum LUNAS pada Modul Keuangan.' };
  }

  // 3. Validasi Dokumen Wajib Fisik
  const missingRequiredDocs = DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib && !loketState.checkedDocs.has(d.id));
  if (missingRequiredDocs.length > 0) {
    return { 
      success: false, 
      message: `Gagal: Ada ${missingRequiredDocs.length} dokumen wajib fisik yang belum dicentang oleh petugas loket.` 
    };
  }

  // 4. [INTEGRASI DENGAN MODUL 07 - LOCK DATA]: Update status verifikasi berkas fisik
  student.is_locked = false; // Belum dikunci permanen, menunggu otorisasi final di Modul 07
  student.status_daftar_ulang = 'TERVERIFIKASI';
  student.tgl_verifikasi = new Date().toISOString();
  student.petugas_verifikasi = 'Petugas Loket 1 - SMA Muhammadiyah 3';
  student.catatan_loket = loketState.officerNotes.trim() || 'Semua dokumen fisik asli telah diverifikasi & diserahkan lengkap.';
  student.dokumen_terverifikasi = Array.from(loketState.checkedDocs);

  // Simpan ke localStorage
  saveToPrimaryStorage(loketState.students);

  return { 
    success: true, 
    message: `Berkas fisik siswa ${student.nama_lengkap} (${student.id_pendaftar}) berhasil diverifikasi sah! Data kini Siap Dikunci di Modul 07 (Lock Data).`,
    student: student
  };
}

/**
 * Buka Kunci Siswa (Fungsi Bantuan Khusus Admin / Pengujian Praktikum)
 */
export function unlockStudent(studentId) {
  const student = loketState.students.find(s => s.id_pendaftar === studentId);
  if (!student) return;

  student.is_locked = false;
  student.status_daftar_ulang = 'MENUNGGU_VERIFIKASI';
  student.tgl_verifikasi = null;
  saveToPrimaryStorage(loketState.students);
  refreshLoketUI();
}

// =========================================================================================
// [SIMULASI PENGUJIAN INSTAN - 1-CLICK PRESET TESTER]
// =========================================================================================

/**
 * Mengubah cepat status siswa untuk pengujian praktikum (Demo Testbed)
 */
export function applySimulationPreset(scenarioType) {
  if (!loketState.selectedStudentId) {
    // Jika belum pilih siswa, pilih siswa pertama
    loketState.selectedStudentId = loketState.students[0]?.id_pendaftar;
  }
  
  const student = loketState.students.find(s => s.id_pendaftar === loketState.selectedStudentId);
  if (!student) return;

  switch (scenarioType) {
    case 'ready':
      // Skenario 1: Lulus & Lunas (Siap Verifikasi Dokumen)
      student.status_kelulusan = 'LULUS';
      student.status_pembayaran = 'LUNAS';
      student.is_locked = false;
      student.status_daftar_ulang = 'MENUNGGU_VERIFIKASI';
      loketState.checkedDocs.clear();
      DAFTAR_DOKUMEN_FISIK.forEach(d => loketState.checkedDocs.add(d.id));
      showToast('Skenario diterapkan: Siswa berstatus Lulus & Lunas (Dokumen Tercentang Lengkap)', 'success');
      break;

    case 'unpaid':
      // Skenario 2: Belum Lunas
      student.status_kelulusan = 'LULUS';
      student.status_pembayaran = 'BELUM_LUNAS';
      student.is_locked = false;
      student.status_daftar_ulang = 'MENUNGGU_PEMBAYARAN';
      showToast('Skenario diterapkan: Siswa Lulus tapi Pembayaran BELUM LUNAS', 'warning');
      break;

    case 'unqualified':
      // Skenario 3: Tidak Lulus
      student.status_kelulusan = 'TIDAK LULUS';
      student.status_pembayaran = 'BELUM_LUNAS';
      student.is_locked = false;
      student.status_daftar_ulang = 'TIDAK_MEMENUHI_SYARAT';
      showToast('Skenario diterapkan: Siswa TIDAK LULUS seleksi', 'danger');
      break;

    case 'locked':
      // Skenario 4: Sudah Terverifikasi & Terkunci
      student.status_kelulusan = 'LULUS';
      student.status_pembayaran = 'LUNAS';
      student.is_locked = true;
      student.status_daftar_ulang = 'TERVERIFIKASI';
      student.tgl_verifikasi = new Date().toISOString();
      student.dokumen_terverifikasi = DAFTAR_DOKUMEN_FISIK.map(d => d.id);
      showToast('Skenario diterapkan: Siswa TERVERIFIKASI & TERKUNCI', 'info');
      break;
  }

  saveToPrimaryStorage(loketState.students);
  refreshLoketUI();
}

// =========================================================================================
// [RENDERING INTERFACE PENGGUNA (DASHBOARD LOKET PETUGAS)]
// =========================================================================================

/**
 * Memastikan stylesheet CSS Modul 06 di-load ke document
 */
function ensureLoketStyles() {
  const cssId = 'loket-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/06_verifikasi_loket/');
    link.href = isStandalone ? './verifikasi.css' : './modules/06_verifikasi_loket/verifikasi.css';
    document.head.appendChild(link);
  }
}

/**
 * Entry Point Utama: Merender Modul Verifikasi Loket ke Container ID yang ditentukan
 */
export function renderVerifikasiLoket(containerId = 'module-viewport') {
  ensureLoketStyles();

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[Loket] Container dengan ID #${containerId} tidak ditemukan.`);
    return;
  }

  // Load data terbaru
  loketState.students = getMergedLoketStudents();

  // Jika belum ada siswa yang dipilih, otomatis pilih siswa pertama yang siap verifikasi
  if (!loketState.selectedStudentId && loketState.students.length > 0) {
    const readyStudent = loketState.students.find(s => s.status_kelulusan === 'LULUS' && s.status_pembayaran === 'LUNAS' && !s.is_locked);
    loketState.selectedStudentId = (readyStudent || loketState.students[0]).id_pendaftar;
  }

  // Set initial checklist jika siswa yang dipilih sudah punya dokumen terverifikasi
  syncCheckedDocsFromSelectedStudent();

  container.innerHTML = `
    <div class="loket-wrapper">
      
      <!-- Top Banner: Info Loket & Waktu Operasional -->
      <header class="loket-top-bar">
        <div class="loket-title-group">
          <h1>
            <span>📋</span> Meja Loket 01 &bull; Verifikasi Berkas Fisik & Daftar Ulang
          </h1>
          <p>Sistem Informasi Manajemen SPMB &mdash; SMA Muhammadiyah 3 Yogyakarta TA 2026/2027</p>
        </div>
        <div class="loket-meta-group">
          <div class="loket-chip">
            <span class="loket-status-dot"></span>
            <span>Loket Aktif: Petugas 1</span>
          </div>
          <div class="loket-chip" id="loket-clock">
            🕒 ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
          </div>
          <button class="btn-tester" id="btn-refresh-loket" title="Refresh sinkronisasi data antar-modul" style="padding: 6px 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);">
            🔄 Sync Data
          </button>
        </div>
      </header>

      <!-- Stat Counters Bento Row -->
      <div class="loket-stats-row" id="loket-stats-container">
        ${renderStatsHTML()}
      </div>

      <!-- Simulator Testbed Banner (Praktikum Helper) -->
      <div class="loket-tester-bar">
        <div class="loket-tester-label">
          <span>🧪 <strong>Simulasi Skenario Integrasi (1-Click Testbed):</strong></span>
          <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">Uji langsung alur responsif loket untuk siswa terpilih</span>
        </div>
        <div class="loket-tester-actions">
          <button class="btn-tester" onclick="window.loketApp.applyPreset('ready')">✅ Lulus & Lunas (Siap Verifikasi)</button>
          <button class="btn-tester" onclick="window.loketApp.applyPreset('unpaid')">⚠️ Belum Lunas (Modul 03)</button>
          <button class="btn-tester" onclick="window.loketApp.applyPreset('unqualified')">❌ Belum Lulus (Modul 05)</button>
          <button class="btn-tester" onclick="window.loketApp.applyPreset('locked')">🔒 Terverifikasi & Terkunci</button>
        </div>
      </div>

      <!-- Main Two-Column Bento Layout -->
      <div class="loket-main-grid">
        
        <!-- KOLOM KIRI: Pencarian & Antrean Siswa -->
        <aside class="loket-sidebar-panel">
          
          <div class="loket-search-box">
            <div class="loket-input-group">
              <span class="loket-search-icon">🔍</span>
              <input 
                type="text" 
                id="loket-search-input" 
                class="loket-search-input" 
                placeholder="Cari No. Registrasi, Nama, atau NISN..." 
                value="${escapeHtml(loketState.searchQuery)}"
                autocomplete="off"
              >
              ${loketState.searchQuery ? `
                <button id="btn-clear-search" class="btn-tester" style="padding: 0 10px;" title="Reset pencarian">&times;</button>
              ` : ''}
            </div>
          </div>

          <!-- Filter Tab Status Antrean -->
          <div class="loket-filter-tabs">
            <button class="btn-filter ${loketState.activeFilter === 'all' ? 'active' : ''}" onclick="window.loketApp.setFilter('all')">Semua (${loketState.students.length})</button>
            <button class="btn-filter ${loketState.activeFilter === 'ready' ? 'active' : ''}" onclick="window.loketApp.setFilter('ready')">Siap Verifikasi</button>
            <button class="btn-filter ${loketState.activeFilter === 'unpaid' ? 'active' : ''}" onclick="window.loketApp.setFilter('unpaid')">Belum Lunas</button>
            <button class="btn-filter ${loketState.activeFilter === 'locked' ? 'active' : ''}" onclick="window.loketApp.setFilter('locked')">Berkas Sah / Terkunci</button>
          </div>

          <!-- List Antrean Siswa -->
          <div class="loket-queue-list" id="loket-queue-list">
            ${renderQueueListHTML()}
          </div>
        </aside>

        <!-- KOLOM KANAN: Meja Kerja Verifikasi Petugas (Workbench) -->
        <main class="loket-workbench" id="loket-workbench">
          ${renderWorkbenchHTML()}
        </main>

      </div>

      <!-- Modal Container untuk Tanda Bukti Penyerahan Berkas -->
      <div id="loket-modal-root"></div>

    </div>
  `;

  // Attach Event Handlers
  bindEvents();
}

/**
 * Render Quick Stat Cards
 */
function renderStatsHTML() {
  const total = loketState.students.length;
  const ready = loketState.students.filter(s => s.status_kelulusan === 'LULUS' && s.status_pembayaran === 'LUNAS' && !s.is_locked).length;
  const verified = loketState.students.filter(s => s.is_locked || s.status_daftar_ulang === 'TERVERIFIKASI').length;
  const pending = loketState.students.filter(s => !s.is_locked && s.status_daftar_ulang !== 'TERVERIFIKASI' && (s.status_pembayaran !== 'LUNAS' || s.status_kelulusan !== 'LULUS')).length;

  return `
    <div class="loket-stat-card">
      <div class="loket-stat-icon total">👥</div>
      <div>
        <div class="loket-stat-val">${total}</div>
        <div class="loket-stat-label">Total Pendaftar</div>
      </div>
    </div>
    <div class="loket-stat-card">
      <div class="loket-stat-icon ready">📋</div>
      <div>
        <div class="loket-stat-val">${ready}</div>
        <div class="loket-stat-label">Siap Verifikasi</div>
      </div>
    </div>
    <div class="loket-stat-card">
      <div class="loket-stat-icon verified">🔒</div>
      <div>
        <div class="loket-stat-val">${verified}</div>
        <div class="loket-stat-label">Berkas Terverifikasi</div>
      </div>
    </div>
    <div class="loket-stat-card">
      <div class="loket-stat-icon pending">⚠️</div>
      <div>
        <div class="loket-stat-val">${pending}</div>
        <div class="loket-stat-label">Tertunda / Bersyarat</div>
      </div>
    </div>
  `;
}

/**
 * Render List Antrean Siswa (Sisi Kiri)
 */
function renderQueueListHTML() {
  let filtered = loketState.students;

  // Filter Status
  if (loketState.activeFilter === 'ready') {
    filtered = filtered.filter(s => s.status_kelulusan === 'LULUS' && s.status_pembayaran === 'LUNAS' && !s.is_locked);
  } else if (loketState.activeFilter === 'unpaid') {
    filtered = filtered.filter(s => s.status_pembayaran !== 'LUNAS');
  } else if (loketState.activeFilter === 'locked') {
    filtered = filtered.filter(s => s.is_locked || s.status_daftar_ulang === 'TERVERIFIKASI');
  }

  // Filter Search
  if (loketState.searchQuery.trim()) {
    const q = loketState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(s => 
      s.nama_lengkap.toLowerCase().includes(q) ||
      s.id_pendaftar.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.includes(q))
    );
  }

  // [UI STATE: EMPTY STATE] Jika tidak ada data yang cocok
  if (filtered.length === 0) {
    return `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
        <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
        <p style="font-size: 0.85rem; font-weight: 600; color: #475569; margin: 0;">Tidak ada siswa yang sesuai</p>
        <p style="font-size: 0.75rem; margin: 4px 0 0 0;">Coba ubah kata kunci pencarian atau tab filter.</p>
      </div>
    `;
  }

  return filtered.map(student => {
    const isSelected = student.id_pendaftar === loketState.selectedStudentId;
    
    // Status visual
    let badgeKelulusan = student.status_kelulusan === 'LULUS' 
      ? `<span class="badge-tag lulus">Lulus</span>` 
      : `<span class="badge-tag tidak-lulus">Gagal</span>`;

    let badgeKeuangan = student.status_pembayaran === 'LUNAS'
      ? `<span class="badge-tag lunas">Lunas</span>`
      : `<span class="badge-tag belum-lunas">Belum Bayar</span>`;

    const isBerkasSah = student.status_daftar_ulang === 'TERVERIFIKASI' || student.status_daftar_ulang === 'VERIFIED_LOCKED';
    let badgeStatusLock = student.is_locked
      ? `<span class="badge-tag verified">🔒 Terkunci TU</span>`
      : isBerkasSah
        ? `<span class="badge-tag ready">⭐ Berkas Sah</span>`
        : (student.status_kelulusan === 'LULUS' && student.status_pembayaran === 'LUNAS')
          ? `<span class="badge-tag ready">📋 Siap Loket</span>`
          : `<span class="badge-tag blocked">Pending</span>`;

    return `
      <div 
        class="loket-queue-card ${isSelected ? 'selected' : ''}" 
        onclick="window.loketApp.selectStudent('${student.id_pendaftar}')"
        tabindex="0"
        role="button"
        aria-label="Pilih siswa ${student.nama_lengkap}"
      >
        <div class="loket-queue-header">
          <span class="loket-reg-id">${student.id_pendaftar}</span>
          <span style="font-size: 0.75rem; font-weight: 700; color: #64748b;">${student.pilihan_jurusan}</span>
        </div>
        <div class="loket-queue-name">${escapeHtml(student.nama_lengkap)}</div>
        <div class="loket-queue-sub">
          <span>NISN: ${escapeHtml(student.nisn)}</span>
          <span>&bull;</span>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${escapeHtml(student.asal_sekolah)}</span>
        </div>
        <div class="loket-queue-badges">
          ${badgeKelulusan}
          ${badgeKeuangan}
          ${badgeStatusLock}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Meja Kerja Verifikasi Siswa (Sisi Kanan)
 */
function renderWorkbenchHTML() {
  // [UI STATE: LOADING STATE]
  if (loketState.isLoading) {
    return `
      <div class="loket-skeleton-state">
        <div class="skeleton-box" style="height: 40px; width: 60%;"></div>
        <div class="skeleton-box" style="height: 120px; width: 100%;"></div>
        <div class="skeleton-box" style="height: 200px; width: 100%;"></div>
        <div class="skeleton-box" style="height: 50px; width: 40%;"></div>
      </div>
    `;
  }

  // [UI STATE: EMPTY STATE] Jika belum ada siswa yang dipilih
  if (!loketState.selectedStudentId) {
    return `
      <div class="loket-empty-state">
        <div class="loket-empty-icon">🪪</div>
        <div class="loket-empty-title">Meja Loket Siap Menerima Siswa</div>
        <div class="loket-empty-desc">
          Silakan pilih nama siswa dari daftar antrean di sebelah kiri atau ketik Nomor Registrasi / Nama pada kolom pencarian untuk memulai pemeriksaan berkas.
        </div>
      </div>
    `;
  }

  const student = loketState.students.find(s => s.id_pendaftar === loketState.selectedStudentId);
  if (!student) {
    return `
      <div class="loket-empty-state">
        <div class="loket-empty-icon" style="color: #ef4444;">⚠️</div>
        <div class="loket-empty-title">Siswa Tidak Ditemukan</div>
        <div class="loket-empty-desc">
          Data siswa dengan ID tersebut tidak ditemukan dalam database.
        </div>
      </div>
    `;
  }

  const isLulus = student.status_kelulusan === 'LULUS';
  const isLunas = student.status_pembayaran === 'LUNAS';
  const isLocked = student.is_locked;
  const isBerkasVerified = student.status_daftar_ulang === 'TERVERIFIKASI' || student.status_daftar_ulang === 'VERIFIED_LOCKED' || isLocked;
  const canVerify = isLulus && isLunas && !isBerkasVerified && !isLocked;

  // Hitung jumlah checklist dokumen
  const totalWajib = DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib).length;
  const checkedWajib = DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib && loketState.checkedDocs.has(d.id)).length;
  const isAllDocsComplete = checkedWajib === totalWajib;

  return `
    <div>
      
      <!-- Banner Jika Data Sudah Terkunci ke TU -->
      ${isLocked ? `
        <div class="locked-banner">
          <div>
            <div class="locked-title">
              <span>🔒</span> DATA SISWA TELAH TERVERIFIKASI & TERKUNCI RESMI (MODUL 07 & TU)
            </div>
            <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px;">
              Diverifikasi pada: <strong>${formatDate(student.tgl_verifikasi)}</strong> oleh <strong>${escapeHtml(student.petugas_verifikasi || 'Petugas Loket')}</strong>.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="window.loketApp.openReceiptModal('${student.id_pendaftar}')" style="padding: 8px 16px; font-size: 0.82rem; font-weight: 700;">
              🖨️ Cetak Bukti Ulang
            </button>
            <button class="btn btn-tester" onclick="window.loketApp.unlockStudent('${student.id_pendaftar}')" title="Buka kunci untuk pengujian ulang" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border-color: #64748b; font-size: 0.75rem;">
              🔓 Buka Kunci (Admin)
            </button>
          </div>
        </div>
      ` : (isBerkasVerified ? `
        <div class="locked-banner" style="background: linear-gradient(135deg, #065f46 0%, #047857 100%);">
          <div>
            <div class="locked-title">
              <span>⭐</span> BERKAS FISIK TELAH DIVERIFIKASI SAH DI LOKET
            </div>
            <div style="font-size: 0.8rem; color: #d1fae5; margin-top: 4px;">
              Dokumen fisik lengkap. Status kini <strong>Siap Dikunci</strong> oleh Koordinator SPMB di <strong>Modul 07 (Lock Data)</strong> sebelum dialirkan ke TU.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="window.loketApp.openReceiptModal('${student.id_pendaftar}')" style="padding: 8px 16px; font-size: 0.82rem; font-weight: 700;">
              🖨️ Cetak Tanda Terima
            </button>
            <button class="btn btn-tester" onclick="window.switchModule('07')" style="background: rgba(255,255,255,0.15); color: #ffffff; border-color: rgba(255,255,255,0.3); font-size: 0.75rem; font-weight: 700;">
              🔒 Buka Modul 07 →
            </button>
          </div>
        </div>
      ` : '')}

      <!-- Section 1: Profil & Identitas Siswa -->
      <div class="wb-section">
        <div class="wb-header">
          <div>
            <div class="wb-student-name">
              <span>${escapeHtml(student.nama_lengkap)}</span>
              <span class="loket-reg-id">${student.id_pendaftar}</span>
            </div>
            <div class="wb-student-meta">
              <span>🏫 Asal: <strong>${escapeHtml(student.asal_sekolah)}</strong></span>
              <span>🎯 Jurusan: <strong>${escapeHtml(student.pilihan_jurusan)}</strong></span>
              <span>🆔 NISN: <strong>${escapeHtml(student.nisn)}</strong></span>
              <span>📱 WA: <strong>${escapeHtml(student.no_wa)}</strong></span>
            </div>
          </div>
          <div>
            <span class="badge ${isLocked ? 'badge-success' : (isBerkasVerified ? 'badge-info' : 'badge-warning')}" style="font-size: 0.82rem; padding: 6px 14px;">
              ${isLocked 
                ? 'STATUS: TERKUNCI KE TU 🔒' 
                : (isBerkasVerified ? 'STATUS: BERKAS FISIK SAH (SIAP KUNCI M07) ⭐' : 'STATUS: MENUNGGU VERIFIKASI LOKET ⏳')}
            </span>
          </div>
        </div>
      </div>

      <!-- Section 2: Integrasi Status Kelulusan & Keuangan (Prasyarat Verifikasi) -->
      <div class="wb-section">
        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 6px;">
          <span>🔗</span> Hasil Pengecekan Integrasi Antar-Modul (Prasyarat Wajib)
        </h3>
        <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 0.75rem 0;">
          Siswa wajib memenuhi kelulusan seleksi dan pelunasan uang pangkal sebelum dokumen fisik dapat disahkan.
        </p>

        <div class="pre-conditions-grid">
          
          <!-- [SIMULASI INTEGRASI MODUL 05 - KELULUSAN] -->
          <div class="condition-card ${isLulus ? 'passed' : 'failed'}">
            <div class="condition-card-header">
              <span class="condition-title">Modul 05 &bull; Status Kelulusan</span>
              <span class="badge-tag ${isLulus ? 'lulus' : 'tidak-lulus'}">${student.status_kelulusan}</span>
            </div>
            <div class="condition-status-row" style="color: ${isLulus ? '#15803d' : '#b91c1c'};">
              <span>${isLulus ? '✅ LULUS SELEKSI SPMB' : '❌ TIDAK MEMENUHI SYARAT KELULUSAN'}</span>
            </div>
            <div class="condition-desc">
              ${isLulus 
                ? 'Siswa dinyatakan lulus seleksi administrasi, rapor, dan wawancara oleh Panitia Penetapan Kelulusan.' 
                : 'Siswa belum ditetapkan lulus atau berstatus cadangan. Arahkan siswa ke Ruang Panitia SPMB.'}
            </div>
          </div>

          <!-- [SIMULASI INTEGRASI MODUL 03 - KEUANGAN] -->
          <div class="condition-card ${isLunas ? 'passed' : 'failed'}">
            <div class="condition-card-header">
              <span class="condition-title">Modul 03 &bull; Status Keuangan</span>
              <span class="badge-tag ${isLunas ? 'lunas' : 'belum-lunas'}">${student.status_pembayaran}</span>
            </div>
            <div class="condition-status-row" style="color: ${isLunas ? '#1d4ed8' : '#c2410c'};">
              <span>${isLunas ? '✅ UANG PANGKAL LUNAS' : '⚠️ BELUM LUNAS / MENUNGGU PEMBAYARAN'}</span>
            </div>
            <div class="condition-desc">
              ${isLunas 
                ? 'Kewajiban pembayaran uang pangkal dan formulir telah tervalidasi lunas oleh Bagian Keuangan.' 
                : 'Uang pangkal belum lunas. Siswa harus melunasi administrasi terlebih dahulu di Loket Keuangan SPMB.'}
            </div>
          </div>

        </div>
      </div>

      <!-- Section 3: Pengecekan Berkas Fisik (Checklist Dokumen) -->
      <div class="wb-section">
        <div class="doc-checklist-container">
          
          <div class="doc-checklist-header">
            <h3>
              <span>📁</span> Pengecekan Dokumen Fisik di Loket Pendaftaran
            </h3>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 0.8rem; font-weight: 700; color: ${isAllDocsComplete ? '#15803d' : '#d97706'};">
                Kelengkapan Wajib: ${checkedWajib}/${totalWajib} Dokumen
              </span>
              ${!isLocked && canVerify ? `
                <button 
                  type="button" 
                  class="btn-tester" 
                  onclick="window.loketApp.toggleAllDocs()" 
                  style="font-size: 0.75rem;"
                >
                  ${isAllDocsComplete ? 'Batal Centang Semua' : '✓ Centang Semua Berkas'}
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Alert jika status belum memenuhi prasyarat -->
          ${!canVerify && !isLocked ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; font-size: 0.83rem; color: #92400e; display: flex; align-items: flex-start; gap: 8px;">
              <span>⚠️</span>
              <div>
                <strong>Pemeriksaan Berkas Ditangguhkan:</strong> Siswa ini belum memenuhi seluruh prasyarat integrasi 
                (${!isLulus ? 'Kelulusan Belum Lulus' : ''} ${!isLunas ? 'Pembayaran Uang Pangkal Belum Lunas' : ''}). 
                Selesaikan administrasi terkait sebelum melanjutkan verifikasi berkas fisik.
              </div>
            </div>
          ` : ''}

          <!-- Checklist Rows -->
          <div class="doc-checklist-items">
            ${DAFTAR_DOKUMEN_FISIK.map(doc => {
              const isChecked = (isLocked || isBerkasVerified) 
                ? (student.dokumen_terverifikasi || []).includes(doc.id) 
                : loketState.checkedDocs.has(doc.id);
              const isDisabled = isLocked || isBerkasVerified || !canVerify;

              return `
                <div 
                  class="doc-item-row ${isChecked ? 'checked' : ''}" 
                  onclick="${isDisabled ? '' : `window.loketApp.toggleDoc('${doc.id}')`}"
                  style="${isDisabled ? 'cursor: default; opacity: 0.85;' : ''}"
                >
                  <div class="doc-label-group">
                    <div class="custom-checkbox">
                      ${isChecked ? '✓' : ''}
                    </div>
                    <div>
                      <div class="doc-name">${escapeHtml(doc.label)}</div>
                    </div>
                  </div>
                  <div>
                    ${doc.wajib 
                      ? `<span class="doc-tag-req">Wajib Fisik</span>` 
                      : `<span class="doc-tag-opt">Pendukung</span>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Catatan Khusus Petugas Loket -->
          <div class="officer-notes-area">
            <label for="loket-notes-input">Catatan Petugas Loket / Tanda Terima Berkas:</label>
            <textarea 
              id="loket-notes-input" 
              rows="2" 
              placeholder="Contoh: Dokumen KK dan SKL asli telah dicocokkan, diserahkan langsung oleh wali murid..." 
              ${(isLocked || isBerkasVerified) ? 'readonly' : ''}
              onchange="window.loketApp.updateNotes(this.value)"
            >${escapeHtml((isLocked || isBerkasVerified) ? (student.catatan_loket || '-') : loketState.officerNotes)}</textarea>
          </div>

        </div>
      </div>

      <!-- Section 4: Aksi Verifikasi Akhir (Action Bar) -->
      <div class="wb-action-bar">
        <div class="wb-action-status-info">
          ${isLocked ? `
            <span>🔒 Data terkunci resmi ke TU. Berkas fisik lengkap & sah.</span>
          ` : isBerkasVerified ? `
            <span style="color: #15803d; font-weight: 700;">
              ⭐ Berkas fisik telah diverifikasi sah! Silakan cetak tanda terima fisik untuk pendaftar.
            </span>
          ` : (canVerify && isAllDocsComplete) ? `
            <span style="color: #15803d; font-weight: 700;">
              ✨ Seluruh dokumen fisik lengkap! Siap untuk pengesahan berkas di loket.
            </span>
          ` : `
            <span style="color: #b45309;">
              ⏳ Tombol pengesahan akan aktif jika Status Lulus, Uang Pangkal Lunas, dan semua dokumen fisik wajib tercentang.
            </span>
          `}
        </div>

        <div>
          ${(isLocked || isBerkasVerified) ? `
            <button 
              type="button" 
              class="btn btn-primary" 
              onclick="window.loketApp.openReceiptModal('${student.id_pendaftar}')"
              style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;"
            >
              <span>📄</span> Cetak Bukti Tanda Terima Berkas
            </button>
          ` : `
            <button 
              type="button" 
              class="btn-complete-verification" 
              id="btn-submit-verification"
              ${(!canVerify || !isAllDocsComplete) ? 'disabled' : ''}
              onclick="window.loketApp.handleSubmitVerification('${student.id_pendaftar}')"
            >
              <span>✅</span> Sahkan Verifikasi Berkas Fisik
            </button>
          `}
        </div>
      </div>

    </div>
  `;
}

/**
 * Sinkronkan dokumen tercentang saat berpindah siswa
 */
function syncCheckedDocsFromSelectedStudent() {
  loketState.checkedDocs.clear();
  loketState.officerNotes = '';

  const student = loketState.students.find(s => s.id_pendaftar === loketState.selectedStudentId);
  if (!student) return;

  if ((student.is_locked || student.status_daftar_ulang === 'TERVERIFIKASI') && Array.isArray(student.dokumen_terverifikasi)) {
    student.dokumen_terverifikasi.forEach(id => loketState.checkedDocs.add(id));
    loketState.officerNotes = student.catatan_loket || '';
  } else if (student.status_kelulusan === 'LULUS' && student.status_pembayaran === 'LUNAS') {
    // Default centang semua dokumen wajib untuk mempermudah petugas loket
    DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib).forEach(d => loketState.checkedDocs.add(d.id));
  }
}

/**
 * Render Modal Cetak Bukti Tanda Terima Berkas Fisik
 */
export function openReceiptModal(studentId) {
  const student = loketState.students.find(s => s.id_pendaftar === studentId);
  if (!student) return;

  const modalRoot = document.getElementById('loket-modal-root');
  if (!modalRoot) return;

  const tglVerif = student.tgl_verifikasi ? new Date(student.tgl_verifikasi) : new Date();
  const formatTgl = tglVerif.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  modalRoot.innerHTML = `
    <div class="loket-modal-overlay" id="modal-receipt-overlay" onclick="window.loketApp.closeModal(event)">
      <div class="loket-modal-card" onclick="event.stopPropagation()">
        
        <div class="loket-modal-header">
          <h2>📄 Tanda Terima Penyerahan Berkas Daftar Ulang</h2>
          <button class="btn-tester" onclick="window.loketApp.closeModal()" style="font-size: 1.1rem; padding: 2px 8px;">&times;</button>
        </div>

        <div class="loket-modal-body">
          <div class="receipt-sheet" id="printable-receipt">
            
            <div class="receipt-header">
              <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">MAJELIS PENDIDIKAN DASAR DAN MENENGAH MUHAMMADIYAH</div>
              <div class="receipt-title">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
              <div class="receipt-sub">Jl. Kapten Piere Tendean No. 58, Wirobrajan, Kota Yogyakarta &bull; Telp. (0274) 375629</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">SURAT BUKTI DAFTAR ULANG & PENYERAHAN DOKUMEN FISIK SPMB 2026/2027</div>
            </div>

            <table class="receipt-table">
              <tr>
                <td>No. Pendaftaran</td>
                <td>:</td>
                <td><span style="font-family: monospace; color: #006837; font-size: 0.95rem;">${student.id_pendaftar}</span></td>
              </tr>
              <tr>
                <td>Nama Lengkap Siswa</td>
                <td>:</td>
                <td>${escapeHtml(student.nama_lengkap)}</td>
              </tr>
              <tr>
                <td>NISN / Asal Sekolah</td>
                <td>:</td>
                <td>${escapeHtml(student.nisn)} / ${escapeHtml(student.asal_sekolah)}</td>
              </tr>
              <tr>
                <td>Pilihan Program / Jurusan</td>
                <td>:</td>
                <td>Kelas X &bull; ${escapeHtml(student.pilihan_jurusan)}</td>
              </tr>
              <tr>
                <td>Status Kelulusan</td>
                <td>:</td>
                <td><span style="color: #15803d;">LULUS SELEKSI</span></td>
              </tr>
              <tr>
                <td>Status Keuangan</td>
                <td>:</td>
                <td><span style="color: #1d4ed8;">LUNAS UANG PANGKAL</span></td>
              </tr>
              <tr>
                <td>Waktu Pengesahan Loket</td>
                <td>:</td>
                <td>${formatTgl}</td>
              </tr>
            </table>

            <div class="receipt-docs-box">
              <strong style="color: #006837;">Daftar Dokumen Fisik yang Telah Diterima dan Diverifikasi Sah:</strong>
              <ul>
                ${DAFTAR_DOKUMEN_FISIK
                  .filter(d => (student.dokumen_terverifikasi || []).includes(d.id))
                  .map(d => `<li>${escapeHtml(d.label)} &mdash; <span style="color: #15803d; font-weight: bold;">[SAH]</span></li>`)
                  .join('')}
              </ul>
              <div style="margin-top: 8px; font-size: 0.75rem; color: #475569;">
                <em>Catatan Loket: ${escapeHtml(student.catatan_loket || 'Berkas fisik asli telah diperiksa sesuai ketentuan pendaftaran.')}</em>
              </div>
            </div>

            <div class="receipt-sign-grid">
              <div>
                Calon Siswa / Orang Tua Wali,
                <div class="receipt-sign-box">
                  (${escapeHtml(student.nama_lengkap)})
                </div>
              </div>
              <div>
                Yogyakarta, ${formatTgl}<br>
                Petugas Verifikasi Loket,
                <div class="receipt-sign-box">
                  (${escapeHtml(student.petugas_verifikasi || 'Petugas Loket 1 SPMB')})
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="loket-modal-footer">
          <button class="btn btn-secondary" onclick="window.print()">
            🖨️ Cetak Bukti (Print)
          </button>
          <button class="btn btn-primary" onclick="window.loketApp.closeModal()">
            Selesai
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * Tutup Modal
 */
export function closeModal() {
  const modalRoot = document.getElementById('loket-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
}

/**
 * Menampilkan Toast Notifikasi Elegan
 */
function showToast(message, type = 'info') {
  const existing = document.getElementById('loket-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'loket-toast';
  const bgColor = type === 'success' ? '#16a34a' : type === 'warning' ? '#ea580c' : type === 'danger' ? '#dc2626' : '#0284c7';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 10px 25px -3px rgba(0,0,0,0.25);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideUpToast 0.25s ease-out;
  `;
  toast.innerHTML = `<span>🔔</span> <span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Refresh Tampilan UI Loket (Partial Re-render)
 */
function refreshLoketUI() {
  const statsContainer = document.getElementById('loket-stats-container');
  if (statsContainer) statsContainer.innerHTML = renderStatsHTML();

  const queueContainer = document.getElementById('loket-queue-list');
  if (queueContainer) queueContainer.innerHTML = renderQueueListHTML();

  const workbenchContainer = document.getElementById('loket-workbench');
  if (workbenchContainer) workbenchContainer.innerHTML = renderWorkbenchHTML();
}

/**
 * Mengikat event listener (Search input, filter, shortcut)
 */
function bindEvents() {
  const searchInput = document.getElementById('loket-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loketState.searchQuery = e.target.value;
      const queueContainer = document.getElementById('loket-queue-list');
      if (queueContainer) queueContainer.innerHTML = renderQueueListHTML();
    });
  }

  const btnClear = document.getElementById('btn-clear-search');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      loketState.searchQuery = '';
      if (searchInput) searchInput.value = '';
      refreshLoketUI();
    });
  }

  const btnRefresh = document.getElementById('btn-refresh-loket');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loketState.students = getMergedLoketStudents();
      refreshLoketUI();
      showToast('Data berhasil disinkronkan dari database modul lain!', 'info');
    });
  }
}

// =========================================================================================
// [GLOBAL CONTROLLER OBJECT / WINDOW SCOPE]
// =========================================================================================

window.loketApp = {
  selectStudent: (id) => {
    loketState.selectedStudentId = id;
    syncCheckedDocsFromSelectedStudent();
    refreshLoketUI();
  },

  setFilter: (filterKey) => {
    loketState.activeFilter = filterKey;
    const filterTabs = document.querySelectorAll('.btn-filter');
    filterTabs.forEach(b => b.classList.remove('active'));
    refreshLoketUI();
  },

  toggleDoc: (docId) => {
    if (loketState.checkedDocs.has(docId)) {
      loketState.checkedDocs.delete(docId);
    } else {
      loketState.checkedDocs.add(docId);
    }
    const wb = document.getElementById('loket-workbench');
    if (wb) wb.innerHTML = renderWorkbenchHTML();
  },

  toggleAllDocs: () => {
    const totalWajib = DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib).length;
    const checkedWajib = DAFTAR_DOKUMEN_FISIK.filter(d => d.wajib && loketState.checkedDocs.has(d.id)).length;

    if (checkedWajib === totalWajib) {
      loketState.checkedDocs.clear();
    } else {
      DAFTAR_DOKUMEN_FISIK.forEach(d => loketState.checkedDocs.add(d.id));
    }
    const wb = document.getElementById('loket-workbench');
    if (wb) wb.innerHTML = renderWorkbenchHTML();
  },

  updateNotes: (val) => {
    loketState.officerNotes = val;
  },

  handleSubmitVerification: (studentId) => {
    const res = completeVerification(studentId);
    if (res.success) {
      showToast(res.message, 'success');
      refreshLoketUI();
      // Otomatis buka modal cetak tanda terima
      openReceiptModal(studentId);
    } else {
      alert(res.message);
    }
  },

  unlockStudent: (studentId) => {
    if (confirm('Buka kembali status verifikasi siswa ini untuk simulasi pengujian?')) {
      unlockStudent(studentId);
      showToast('Status kunci data berhasil dibuka.', 'info');
    }
  },

  applyPreset: (scenario) => {
    applySimulationPreset(scenario);
  },

  openReceiptModal: (studentId) => {
    openReceiptModal(studentId);
  },

  closeModal: (event) => {
    closeModal();
  }
};

/**
 * Re-export alias agar kompatibel penuh dengan pemanggilan dari index.html
 */
export function renderLoketDaftarUlang(containerId) {
  renderVerifikasiLoket(containerId);
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

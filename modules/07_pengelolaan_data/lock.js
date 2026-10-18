/**
 * =========================================================================================
 * MODUL 07: PENGELOLAAN & PENGUNCIAN DATA FINAL SPMB (DATA LOCKING ENGINE)
 * SMA Muhammadiyah 3 Yogyakarta - Sistem Integrasi SPMB & TU
 * Penanggung Jawab / Developer: Yosa
 * =========================================================================================
 * Alur Terkait: Alur 14 (Validasi & Lock Data Siswa ke Basis Data SSoT TU)
 * Strategi: Waterfall | Layer: Application / Business Logic Layer
 * 
 * Modul ini berfungsi sebagai:
 * 1. Gerbang Otorisasi Final (Gatekeeper) sebelum data SPMB diserahkan resmi ke Tata Usaha (TU).
 * 2. Audit Pra-Kunci Tripartit:
 *    - Syarat 1: Status Kelulusan Seleksi (Modul 05) = "LULUS"
 *    - Syarat 2: Status Pembayaran Uang Pangkal (Modul 03) = "LUNAS"
 *    - Syarat 3: Verifikasi Berkas Fisik Loket (Modul 06) = "TERVERIFIKASI" / "BERKAS_LENGKAP"
 * 3. Eksekusi Pembekuan Data (Data Locking Engine):
 *    - Mengubah flag `is_locked: true` dan status `VERIFIED_LOCKED`.
 *    - Mencegah perubahan data sepihak (Solusi Masalah Resistensi M2 di Laporan 6).
 *    - Mengalirkan data siswa secara otomatis ke Modul 08 (Basis Data TU) & Modul 09 (Dashboard TU).
 * 4. Audit Trail & Log Transparansi: Mencatat riwayat tanggal, waktu, dan petugas pengunci.
 * =========================================================================================
 */

import { db } from '../../config/database.js';

// Konstanta Key LocalStorage Terpusat
const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';
const STORAGE_KEY_SSOT_TU   = 'm3_spmb_tu_db';
const STORAGE_KEY_AUDIT_LOG = 'spmb_audit_lock_logs';

// Seed Data Default jika sistem pertama kali dibuka
const SEED_LOCK_STUDENTS = [
  {
    id_pendaftar: "SPMB-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    nisn: "0051234567",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "TERVERIFIKASI", // Berkas fisik loket lengkap
    is_locked: false, // SIAP KUNCI
    tgl_verifikasi: "2026-10-18T10:15:00Z",
    petugas_verifikasi: "Petugas Loket 1 (Admin SPMB)",
    catatan_loket: "Dokumen asli fisik KK, Akta, dan Ijazah sudah valid & sah."
  },
  {
    id_pendaftar: "SPMB-2026-004",
    nama_lengkap: "Rizky Ramadhan",
    nisn: "0058765432",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 5 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true, // SUDAH TERKUNCI (Active in TU)
    tgl_verifikasi: "2026-10-15T09:30:00Z",
    tgl_locked: "2026-10-16T11:00:00Z",
    locked_by: "Koordinator SPMB (Yosa)",
    petugas_verifikasi: "Petugas Loket 1 (Admin SPMB)",
    catatan_loket: "Dokumen fisik lengkap dan sah. Data telah dibekukan ke TU."
  },
  {
    id_pendaftar: "SPMB-2026-005",
    nama_lengkap: "Dewi Sartika",
    nisn: "0053456789",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 3 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "TERVERIFIKASI",
    is_locked: false, // SIAP KUNCI
    tgl_verifikasi: "2026-10-18T11:45:00Z",
    petugas_verifikasi: "Petugas Loket 2 (Admin SPMB)",
    catatan_loket: "Semua berkas fisik asli telah diperiksa dan lengkap."
  },
  {
    id_pendaftar: "SPMB-2026-002",
    nama_lengkap: "Budi Santoso",
    nisn: "1234567890",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "BELUM_LUNAS", // Incomplete: Keuangan belum lunas
    status_daftar_ulang: "MENUNGGU_PEMBAYARAN",
    is_locked: false,
    catatan_loket: "Menunggu pembayaran cicilan uang pangkal."
  },
  {
    id_pendaftar: "SPMB-2026-003",
    nama_lengkap: "Siti Nurhaliza",
    nisn: "0062345671",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta",
    status_kelulusan: "TIDAK LULUS", // Incomplete: Seleksi gagal
    status_pembayaran: "BELUM_LUNAS",
    status_daftar_ulang: "TIDAK_MEMENUHI_SYARAT",
    is_locked: false,
    catatan_loket: "Tidak memenuhi syarat kelulusan seleksi."
  }
];

/**
 * State Lokal Modul 07
 */
let lockState = {
  students: [],
  activeTab: 'all', // 'all', 'ready', 'locked', 'incomplete'
  searchQuery: '',
  selectedStudent: null,
  isProcessing: false,
  containerId: 'module-viewport'
};

/**
 * Pastikan stylesheet lock.css terpasang di document head
 */
function ensureLockStyles() {
  const cssId = 'lock-spmb-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/07_pengelolaan_data/');
    link.href = isStandalone ? './lock.css' : './modules/07_pengelolaan_data/lock.css';
    document.head.appendChild(link);
  }
}

/**
 * Helper sanitasi string untuk pencegahan XSS
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Menghitung kelayakan audit tripartit untuk pendaftar
 */
function evaluateAuditCriteria(student) {
  // Syarat 1: Seleksi Lulus
  const isLulus = String(student.status_kelulusan).toUpperCase() === 'LULUS';
  
  // Syarat 2: Uang Pangkal Lunas
  const isLunas = String(student.status_pembayaran).toUpperCase() === 'LUNAS';
  
  // Syarat 3: Berkas Fisik Loket Valid
  const rawDaftarUlang = String(student.status_daftar_ulang || '').toUpperCase();
  const isBerkasValid = rawDaftarUlang === 'TERVERIFIKASI' || 
                        rawDaftarUlang === 'VERIFIED_LOCKED' || 
                        rawDaftarUlang === 'BERKAS_LENGKAP' ||
                        (Array.isArray(student.dokumen_terverifikasi) && student.dokumen_terverifikasi.length >= 5);

  const isEligible = isLulus && isLunas && isBerkasValid;
  const isLocked = !!student.is_locked;

  return {
    isLulus,
    isLunas,
    isBerkasValid,
    isEligible,
    isLocked,
    statusText: isLocked 
      ? 'VERIFIED_LOCKED' 
      : (isEligible ? 'SIAP_KUNCI' : 'BELUM_LENGKAP')
  };
}

/**
 * Sinkronisasi data dari LocalStorage
 */
function loadStudentsData() {
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.warn('[Lock Modul] Gagal membaca storage primer:', err);
  }

  // Jika data belum ada, gunakan seed data lengkap
  if (list.length === 0) {
    list = SEED_LOCK_STUDENTS.map(s => ({ ...s }));
    saveToPrimaryStorage(list);
  }

  // Cek juga sinkronisasi flag is_locked dari database SSoT TU
  try {
    const rawSSoT = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    if (rawSSoT) {
      const ssot = JSON.parse(rawSSoT);
      if (Array.isArray(ssot.pendaftar)) {
        ssot.pendaftar.forEach(tuItem => {
          const s = list.find(x => (x.id_pendaftar || x.id) === (tuItem.id_pendaftar || tuItem.id) || x.nisn === tuItem.nisn);
          if (s) {
            if (tuItem.is_locked !== undefined) s.is_locked = tuItem.is_locked;
            if (tuItem.status_daftar_ulang) s.status_daftar_ulang = tuItem.status_daftar_ulang;
            if (tuItem.tgl_locked) s.tgl_locked = tuItem.tgl_locked;
            if (tuItem.locked_by) s.locked_by = tuItem.locked_by;
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Lock Modul] Gagal cross-sync SSoT:', err);
  }

  lockState.students = list;
}

/**
 * Menyimpan data pembaruan ke storage SPMB dan SSoT TU secara atomik
 */
function saveToPrimaryStorage(studentsList) {
  try {
    // 1. Simpan ke spmb_pendaftar_db
    localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(studentsList));

    // 2. Sinkronkan ke database SSoT TU (m3_spmb_tu_db)
    const ssotRaw = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    let ssotData = ssotRaw ? JSON.parse(ssotRaw) : { pendaftar: [] };
    if (!Array.isArray(ssotData.pendaftar)) ssotData.pendaftar = [];

    studentsList.forEach(item => {
      const studentId = item.id_pendaftar || item.id;
      const idx = ssotData.pendaftar.findIndex(x => (x.id || x.id_pendaftar) === studentId || x.nisn === item.nisn);
      
      const ssotObj = {
        id: studentId,
        nama: item.nama_lengkap || item.nama,
        nisn: item.nisn,
        pilihan_jurusan: item.pilihan_jurusan,
        status_kelulusan: item.status_kelulusan,
        status_pembayaran: item.status_pembayaran,
        status_daftar_ulang: item.status_daftar_ulang,
        is_locked: !!item.is_locked,
        tgl_locked: item.tgl_locked || null,
        locked_by: item.locked_by || null,
        catatan_kunci: item.catatan_kunci || ''
      };

      if (idx !== -1) {
        ssotData.pendaftar[idx] = { ...ssotData.pendaftar[idx], ...ssotObj };
      } else {
        ssotData.pendaftar.push(ssotObj);
      }
    });

    localStorage.setItem(STORAGE_KEY_SSOT_TU, JSON.stringify(ssotData));

    // 3. Dispatch real-time events agar Modul 09 (TU) & Modul 06 (Loket) ter-update langsung
    const detailPayload = { source: 'modul_07_pengelolaan_data', timestamp: new Date().toISOString() };
    window.dispatchEvent(new CustomEvent('spmb_db_updated', { detail: detailPayload }));
    document.dispatchEvent(new CustomEvent('spmb_db_updated', { detail: detailPayload }));
    window.dispatchEvent(new Event('db_updated'));
  } catch (err) {
    console.error('[Lock Modul] Gagal simpan storage:', err);
  }
}

/**
 * Mencatat riwayat ke log audit tersimpan
 */
function recordAuditLog(description, studentId = null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    const logs = raw ? JSON.parse(raw) : [];
    const entry = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      description,
      studentId,
      actor: 'Koordinator SPMB'
    };
    logs.unshift(entry);
    // Simpan maksimal 30 log terakhir
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(logs.slice(0, 30)));
  } catch (e) {
    console.warn('[Lock Modul] Gagal catat audit log:', e);
  }
}

/**
 * Mengambil daftar log audit
 */
function getAuditLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  
  // Log bawaan awal
  return [
    {
      id: 'LOG-INIT-1',
      displayTime: '08:00:15',
      description: 'Sistem integrasi Data Locking Engine SPMB–TU diaktifkan.',
      actor: 'Sistem'
    },
    {
      id: 'LOG-INIT-2',
      displayTime: '09:30:40',
      description: 'Data Rizky Ramadhan (SPMB-2026-004) dikunci permanen ke TU.',
      actor: 'Koordinator SPMB'
    }
  ];
}

/**
 * Menampilkan Toast Notifikasi
 */
function showToast(message, type = 'success') {
  const existing = document.getElementById('lock-toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'lock-toast-notification';
  toast.className = `lock-toast ${type}`;
  
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3500);
}

// =========================================================================================
// AKSI BISNIS: PENGUNCIAN & PEMBUKAAN DATA (DATA LOCKING ENGINE)
// =========================================================================================

/**
 * Mengunci data 1 siswa yang telah memenuhi syarat audit
 */
function lockStudent(studentId) {
  loadStudentsData();
  const student = lockState.students.find(s => (s.id_pendaftar || s.id) === studentId || s.nisn === studentId);
  if (!student) {
    showToast('Data siswa tidak ditemukan.', 'error');
    return;
  }

  const audit = evaluateAuditCriteria(student);
  if (!audit.isEligible) {
    showToast(`Gagal: Calon siswa belum memenuhi 3 syarat audit lengkap.`, 'error');
    return;
  }

  // Eksekusi penguncian (Alur 14)
  student.is_locked = true;
  student.status_daftar_ulang = 'VERIFIED_LOCKED';
  student.tgl_locked = new Date().toISOString();
  student.locked_by = 'Koordinator SPMB (Yosa)';
  student.catatan_kunci = 'Data divalidasi dan dikunci resmi ke Single Source of Truth TU.';

  saveToPrimaryStorage(lockState.students);
  recordAuditLog(`Data ${student.nama_lengkap || student.nama} (${studentId}) dikunci resmi ke TU.`, studentId);
  
  showToast(`Berhasil! Data ${student.nama_lengkap || student.nama} telah dikunci dan dialirkan ke TU.`, 'success');
  renderModuleUI();
}

/**
 * Kunci massal (Batch Lock) seluruh siswa yang telah siap kunci
 */
function batchLockEligible() {
  loadStudentsData();
  const readyStudents = lockState.students.filter(s => {
    const audit = evaluateAuditCriteria(s);
    return audit.isEligible && !audit.isLocked;
  });

  if (readyStudents.length === 0) {
    showToast('Tidak ada siswa berstatus Siap Kunci yang perlu dikunci.', 'info');
    return;
  }

  readyStudents.forEach(s => {
    s.is_locked = true;
    s.status_daftar_ulang = 'VERIFIED_LOCKED';
    s.tgl_locked = new Date().toISOString();
    s.locked_by = 'Koordinator SPMB (Yosa)';
    s.catatan_kunci = 'Batch Lock: Data divalidasi dan dikunci massal ke SSoT TU.';
  });

  saveToPrimaryStorage(lockState.students);
  recordAuditLog(`Batch Lock: ${readyStudents.length} calon siswa berhasil dikunci permanen ke TU.`);
  
  showToast(`Sukses! ${readyStudents.length} siswa siap kunci berhasil dibekukan ke TU.`, 'success');
  renderModuleUI();
}

/**
 * Buka Kunci Siswa (Khusus Fitur Admin Override / Kebutuhan Demonstrasi Penguji)
 */
function unlockStudent(studentId) {
  loadStudentsData();
  const student = lockState.students.find(s => (s.id_pendaftar || s.id) === studentId || s.nisn === studentId);
  if (!student) return;

  student.is_locked = false;
  student.status_daftar_ulang = 'TERVERIFIKASI';
  student.tgl_locked = null;
  student.locked_by = null;

  saveToPrimaryStorage(lockState.students);
  recordAuditLog(`[ADMIN OVERRIDE] Kunci data ${student.nama_lengkap || student.nama} dibuka untuk peninjauan.`, studentId);
  
  showToast(`Kunci data siswa ${student.nama_lengkap || student.nama} telah dibuka kembali.`, 'info');
  renderModuleUI();
}

/**
 * Reset / Set Skenario Simulasi Khusus Pengujian Dosen
 */
function applySimulationScenario(type) {
  if (type === 'reset_all') {
    // Reset ke kondisi seed bawaan
    const fresh = SEED_LOCK_STUDENTS.map(s => ({ ...s }));
    saveToPrimaryStorage(fresh);
    recordAuditLog('Reset Skenario: Data uji dikembalikan ke kondisi awal demonstrasi.');
    showToast('Data berhasil di-reset ke kondisi uji bawaan.', 'success');
  } else if (type === 'make_all_ready') {
    // Buat semua lulus & lunas agar siap dikunci
    loadStudentsData();
    lockState.students.forEach(s => {
      s.status_kelulusan = 'LULUS';
      s.status_pembayaran = 'LUNAS';
      s.status_daftar_ulang = 'TERVERIFIKASI';
      s.is_locked = false;
    });
    saveToPrimaryStorage(lockState.students);
    recordAuditLog('Simulasi Uji: Semua siswa diset Lulus, Lunas, dan Terverifikasi Berkas.');
    showToast('Semua siswa kini berstatus "Siap Kunci"!', 'success');
  }
  renderModuleUI();
}

// =========================================================================================
// ANTARMUKA PENGGUNA (UI RENDERING)
// =========================================================================================

/**
 * Render Antarmuka Modul 07
 */
function renderModuleUI() {
  loadStudentsData();
  const container = document.getElementById(lockState.containerId);
  if (!container) return;

  // Evaluasi metrik
  let totalCount = lockState.students.length;
  let readyCount = 0;
  let lockedCount = 0;
  let incompleteCount = 0;

  const evaluatedStudents = lockState.students.map(s => {
    const audit = evaluateAuditCriteria(s);
    if (audit.isLocked) lockedCount++;
    else if (audit.isEligible) readyCount++;
    else incompleteCount++;
    return { ...s, audit };
  });

  // Filter Data Sesuai Tab & Pencarian
  let filtered = evaluatedStudents;
  if (lockState.activeTab === 'ready') {
    filtered = filtered.filter(s => s.audit.isEligible && !s.audit.isLocked);
  } else if (lockState.activeTab === 'locked') {
    filtered = filtered.filter(s => s.audit.isLocked);
  } else if (lockState.activeTab === 'incomplete') {
    filtered = filtered.filter(s => !s.audit.isEligible && !s.audit.isLocked);
  }

  if (lockState.searchQuery.trim()) {
    const q = lockState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.nama_lengkap || s.nama || '').toLowerCase().includes(q) ||
      (s.id_pendaftar || s.id || '').toLowerCase().includes(q) ||
      (s.nisn && s.nisn.includes(q))
    );
  }

  // Generate Baris Tabel
  let tableRowsHtml = '';
  if (filtered.length === 0) {
    // 5 UI States: Empty State
    tableRowsHtml = `
      <tr>
        <td colspan="7">
          <div class="lock-state-box">
            <div class="lock-state-icon">📭</div>
            <h4 class="lock-state-title">Tidak Ada Data Pendaftar</h4>
            <p class="lock-state-text">Tidak ada calon siswa pada kategori "${escapeHtml(lockState.activeTab)}" atau kata kunci pencarian tersebut.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    tableRowsHtml = filtered.map(student => {
      const { audit } = student;
      const studentId = student.id_pendaftar || student.id;
      const nama = student.nama_lengkap || student.nama;
      const jurusan = student.pilihan_jurusan || 'MIPA';
      const nisn = student.nisn || '-';

      // Badge Syarat 1: Seleksi
      const badgeSeleksi = audit.isLulus 
        ? `<span class="lock-criteria-badge pass">✔ Lulus Seleksi</span>` 
        : `<span class="lock-criteria-badge fail">✖ Tidak Lolos</span>`;

      // Badge Syarat 2: Keuangan
      const badgeKeuangan = audit.isLunas
        ? `<span class="lock-criteria-badge pass">✔ Uang Pangkal Lunas</span>`
        : `<span class="lock-criteria-badge pending">⏳ Belum Lunas</span>`;

      // Badge Syarat 3: Berkas Fisik Loket
      const badgeBerkas = audit.isBerkasValid
        ? `<span class="lock-criteria-badge pass">✔ Berkas Fisik Sah</span>`
        : `<span class="lock-criteria-badge pending">⏳ Menunggu Loket</span>`;

      // Status Pill
      let statusPill = '';
      let actionButtons = '';

      if (audit.isLocked) {
        statusPill = `<span class="lock-status-pill locked">🔒 VERIFIED_LOCKED</span>`;
        actionButtons = `
          <button class="lock-btn-action locked-done" title="Data telah dibekukan ke TU">
            ✔ Terkunci ke TU
          </button>
          <button class="lock-btn-action btn-unlock" onclick="window.lockApp.unlockStudent('${studentId}')" title="Admin Override untuk Pengujian Ulang">
            Buka Kunci
          </button>
        `;
      } else if (audit.isEligible) {
        statusPill = `<span class="lock-status-pill ready">⭐ SIAP KUNCI</span>`;
        actionButtons = `
          <button class="lock-btn-action lock-now" onclick="window.lockApp.lockStudent('${studentId}')">
            🔒 Kunci Data
          </button>
          <button class="lock-btn-action btn-detail" onclick="window.lockApp.showAuditModal('${studentId}')">
            Detail
          </button>
        `;
      } else {
        statusPill = `<span class="lock-status-pill incomplete">⚠️ SYARAT KURANG</span>`;
        actionButtons = `
          <button class="lock-btn-action btn-detail" onclick="window.lockApp.showAuditModal('${studentId}')">
            Periksa Syarat
          </button>
        `;
      }

      return `
        <tr>
          <td>
            <div class="lock-student-info">
              <span class="lock-student-name">${escapeHtml(nama)}</span>
              <div class="lock-student-sub">
                <strong>${escapeHtml(studentId)}</strong>
                <span class="lock-student-nisn">NISN: ${escapeHtml(nisn)}</span>
              </div>
            </div>
          </td>
          <td><span class="badge badge-info">${escapeHtml(jurusan)}</span></td>
          <td>${badgeSeleksi}</td>
          <td>${badgeKeuangan}</td>
          <td>${badgeBerkas}</td>
          <td>${statusPill}</td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Generate Log Riwayat
  const logs = getAuditLogs();
  const logRowsHtml = logs.map(l => `
    <div class="lock-log-item">
      <span class="lock-log-time">${escapeHtml(l.displayTime)}</span>
      <span class="lock-log-desc">${escapeHtml(l.description)}</span>
      <span style="font-size: 0.7rem; color: #006837; font-weight: 700; background: #e6f4ea; padding: 2px 6px; border-radius: 4px;">
        ${escapeHtml(l.actor || 'SPMB')}
      </span>
    </div>
  `).join('');

  // Masukkan struktur HTML lengkap ke viewport
  container.innerHTML = `
    <div class="lock-module-container">

      <!-- 1. Header Banner -->
      <div class="lock-header-card">
        <div class="lock-header-top">
          <h1 class="lock-header-title">
            <span>🔒</span> Modul 07: Pengelolaan & Penguncian Data Final SPMB
          </h1>
          <span class="lock-role-badge">
            <span>🛡️</span> Role: Koordinator SPMB (Otorisator)
          </span>
        </div>
        <p class="lock-header-desc">
          Gerbang otorisasi final (Alur 14) untuk membekukan data calon peserta didik yang telah memenuhi syarat 
          seleksi, pelunasan uang pangkal, dan verifikasi fisik di loket. Menghilangkan celah perubahan data sepihak 
          sebelum dialirkan ke Basis Data Tata Usaha (SSoT).
        </p>
      </div>

      <!-- Security Notice Box -->
      <div class="lock-notice-box">
        <div class="lock-notice-icon">🛡️</div>
        <div class="lock-notice-text">
          <strong>Prinsip Integritas Single Source of Truth (SSoT):</strong>
          Siswa yang berstatus <code>VERIFIED_LOCKED</code> akan otomatis terkunci dari pengeditan di portal SPMB 
          dan langsung dapat diakses oleh Bagian Tata Usaha (Modul 09) untuk pembagian rombel dan penerbitan Buku Induk Siswa.
        </div>
      </div>

      <!-- 2. Stat Cards Grid -->
      <div class="lock-stats-grid">
        <div class="lock-stat-card">
          <div class="lock-stat-icon-wrapper total">👥</div>
          <div>
            <div class="lock-stat-number">${totalCount}</div>
            <div class="lock-stat-label">Total Pendaftar</div>
          </div>
        </div>

        <div class="lock-stat-card">
          <div class="lock-stat-icon-wrapper ready">⭐</div>
          <div>
            <div class="lock-stat-number">${readyCount}</div>
            <div class="lock-stat-label">Lolos Audit & Siap Kunci</div>
          </div>
        </div>

        <div class="lock-stat-card">
          <div class="lock-stat-icon-wrapper locked">🔒</div>
          <div>
            <div class="lock-stat-number">${lockedCount}</div>
            <div class="lock-stat-label">Terkunci Resmi (SSoT TU)</div>
          </div>
        </div>

        <div class="lock-stat-card">
          <div class="lock-stat-icon-wrapper incomplete">⏳</div>
          <div>
            <div class="lock-stat-number">${incompleteCount}</div>
            <div class="lock-stat-label">Syarat Belum Lengkap</div>
          </div>
        </div>
      </div>

      <!-- 3. Controls & Filter Bar -->
      <div class="lock-controls-card">
        <div class="lock-tabs">
          <button 
            class="lock-tab-btn ${lockState.activeTab === 'all' ? 'active' : ''}" 
            onclick="window.lockApp.switchTab('all')"
          >
            Semua Pendaftar <span class="lock-tab-count">${totalCount}</span>
          </button>
          <button 
            class="lock-tab-btn ${lockState.activeTab === 'ready' ? 'active' : ''}" 
            onclick="window.lockApp.switchTab('ready')"
          >
            ⭐ Siap Kunci <span class="lock-tab-count">${readyCount}</span>
          </button>
          <button 
            class="lock-tab-btn ${lockState.activeTab === 'locked' ? 'active' : ''}" 
            onclick="window.lockApp.switchTab('locked')"
          >
            🔒 Terkunci TU <span class="lock-tab-count">${lockedCount}</span>
          </button>
          <button 
            class="lock-tab-btn ${lockState.activeTab === 'incomplete' ? 'active' : ''}" 
            onclick="window.lockApp.switchTab('incomplete')"
          >
            ⚠️ Belum Lengkap <span class="lock-tab-count">${incompleteCount}</span>
          </button>
        </div>

        <div class="lock-actions-group">
          <input 
            type="text" 
            class="lock-search-input" 
            placeholder="Cari nama / No. Reg / NISN..." 
            value="${escapeHtml(lockState.searchQuery)}"
            oninput="window.lockApp.handleSearch(this.value)"
          />

          <button 
            class="lock-btn-batch" 
            onclick="window.lockApp.batchLockEligible()"
            ${readyCount === 0 ? 'disabled' : ''}
            title="Kunci seluruh pendaftar yang telah memenuhi 3 syarat"
          >
            <span>🔒</span> Kunci Semua (${readyCount})
          </button>

          <!-- Dropdown Preset Simulasi Pengujian Praktikum -->
          <button 
            class="lock-btn-demo-preset" 
            onclick="window.lockApp.togglePresetMenu()"
            title="Pintasan Skenario Pengujian Praktikum"
          >
            ⚙️ Simulasi Demo ▾
          </button>
        </div>
      </div>

      <!-- 4. Table Card -->
      <div class="lock-table-card">
        <div class="lock-table-header">
          <h2 class="lock-table-title">
            <span>📋</span> Matriks Audit Kelayakan & Penguncian Data Final
          </h2>
          <span style="font-size: 0.8rem; color: #64748b;">
            Menampilkan <strong>${filtered.length}</strong> siswa
          </span>
        </div>

        <div class="table-responsive">
          <table class="lock-table">
            <thead>
              <tr>
                <th>Calon Siswa / No. Reg</th>
                <th>Jurusan</th>
                <th>1. Hasil Seleksi (M05)</th>
                <th>2. Uang Pangkal (M03)</th>
                <th>3. Berkas Loket (M06)</th>
                <th>Status Kunci</th>
                <th>Aksi Otorisasi</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 5. Audit Trail / Activity Log -->
      <div class="lock-log-card">
        <div class="lock-log-header">
          <h3 class="lock-log-title">
            <span>📜</span> Log Transparansi & Riwayat Penguncian (Audit Trail)
          </h3>
          <span style="font-size: 0.75rem; color: #64748b;">Sinkronisasi Real-time ke SSoT TU</span>
        </div>
        <div class="lock-log-list">
          ${logRowsHtml || '<p style="font-size:0.8rem; color:#94a3b8; text-align:center;">Belum ada riwayat aktivitas.</p>'}
        </div>
      </div>

    </div>

    <!-- Modal Container -->
    <div id="lock-modal-root"></div>
  `;
}

/**
 * Menampilkan Modal Detail Audit Siswa
 */
function showAuditModal(studentId) {
  loadStudentsData();
  const student = lockState.students.find(s => (s.id_pendaftar || s.id) === studentId || s.nisn === studentId);
  if (!student) return;

  const audit = evaluateAuditCriteria(student);
  const modalRoot = document.getElementById('lock-modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="lock-modal-backdrop" onclick="window.lockApp.closeModal(event)">
      <div class="lock-modal-card" onclick="event.stopPropagation()">
        <div class="lock-modal-header">
          <h3 class="lock-modal-title">
            <span>🔍</span> Audit Pra-Kunci: ${escapeHtml(student.nama_lengkap || student.nama)}
          </h3>
          <button class="lock-modal-close" onclick="window.lockApp.closeModal()">✕</button>
        </div>
        
        <div class="lock-modal-body">
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #e2e8f0; font-size: 0.85rem;">
            <div><strong>No. Registrasi:</strong> ${escapeHtml(student.id_pendaftar || student.id)}</div>
            <div><strong>NISN:</strong> ${escapeHtml(student.nisn || '-')} | <strong>Jurusan:</strong> ${escapeHtml(student.pilihan_jurusan || 'MIPA')}</div>
            <div><strong>Asal Sekolah:</strong> ${escapeHtml(student.asal_sekolah || '-')}</div>
          </div>

          <h4 style="font-size: 0.9rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">3 Syarat Mutlak Penguncian Data:</h4>
          
          <div class="lock-audit-checklist">
            <!-- Syarat 1 -->
            <div class="lock-audit-item">
              <span class="lock-audit-check-icon">${audit.isLulus ? '✅' : '❌'}</span>
              <div class="lock-audit-item-content">
                <div class="lock-audit-item-title">1. Kelulusan Seleksi Akademik & Wawancara (Modul 05)</div>
                <div class="lock-audit-item-desc">
                  Status: <strong>${escapeHtml(student.status_kelulusan || 'BELUM DITETAPKAN')}</strong>. 
                  Calon siswa harus berstatus resmi LULUS dari tim panitia seleksi.
                </div>
              </div>
            </div>

            <!-- Syarat 2 -->
            <div class="lock-audit-item">
              <span class="lock-audit-check-icon">${audit.isLunas ? '✅' : '⚠️'}</span>
              <div class="lock-audit-item-content">
                <div class="lock-audit-item-title">2. Pelunasan Biaya Masuk & Uang Pangkal (Modul 03)</div>
                <div class="lock-audit-item-desc">
                  Status: <strong>${escapeHtml(student.status_pembayaran || 'BELUM LUNAS')}</strong>. 
                  Bukti setoran keuangan harus diverifikasi lunas oleh bendahara SPMB.
                </div>
              </div>
            </div>

            <!-- Syarat 3 -->
            <div class="lock-audit-item">
              <span class="lock-audit-check-icon">${audit.isBerkasValid ? '✅' : '⏳'}</span>
              <div class="lock-audit-item-content">
                <div class="lock-audit-item-title">3. Verifikasi Berkas Fisik di Meja Loket (Modul 06)</div>
                <div class="lock-audit-item-desc">
                  Status: <strong>${escapeHtml(student.status_daftar_ulang || 'MENUNGGU VERIFIKASI')}</strong>. 
                  Dokumen fisik asli (KK, Akta Kelahiran, Ijazah/SKL, Pas Foto) telah ditunjukkan di loket daftar ulang.
                  ${student.catatan_loket ? `<br><em>Catatan: "${escapeHtml(student.catatan_loket)}"</em>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Status Kunci Saat Ini -->
          <div style="margin-top: 1rem; padding: 10px; border-radius: 8px; font-size: 0.8rem; background: ${audit.isLocked ? '#f0fdf4' : (audit.isEligible ? '#eff6ff' : '#fffbeb')}; border: 1px solid ${audit.isLocked ? '#bbf7d0' : (audit.isEligible ? '#bfdbfe' : '#fde68a')};">
            <strong>Kesimpulan Audit:</strong> ${
              audit.isLocked 
                ? 'Data siswa sudah dibekukan secara permanen (VERIFIED_LOCKED) dan telah aktif di Sistem Tata Usaha.' 
                : (audit.isEligible 
                    ? 'Semua syarat terpenuhi 100%! Data siap dikunci resmi oleh Koordinator SPMB.' 
                    : 'Belum memenuhi syarat penguncian data. Selesaikan kekurangan di atas sebelum mengunci.')
            }
          </div>
        </div>

        <div class="lock-modal-footer">
          <button class="lock-btn-action btn-detail" onclick="window.lockApp.closeModal()">Tutup</button>
          ${!audit.isLocked && audit.isEligible ? `
            <button class="lock-btn-action lock-now" onclick="window.lockApp.lockStudent('${studentId}'); window.lockApp.closeModal();">
              🔒 Eksekusi Kunci Data Sekarang
            </button>
          ` : ''}
          ${audit.isLocked ? `
            <button class="lock-btn-action btn-unlock" onclick="window.lockApp.unlockStudent('${studentId}'); window.lockApp.closeModal();">
              Buka Kunci (Admin Override)
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Tutup modal
 */
function closeModal(e) {
  const modalRoot = document.getElementById('lock-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
}

/**
 * Menu Dropdown Preset Simulasi Pengujian
 */
function togglePresetMenu() {
  const existing = document.getElementById('lock-preset-modal');
  if (existing) {
    existing.remove();
    return;
  }

  const modalRoot = document.getElementById('lock-modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="lock-modal-backdrop" id="lock-preset-modal" onclick="window.lockApp.closeModal(event)">
      <div class="lock-modal-card" style="max-width: 440px;" onclick="event.stopPropagation()">
        <div class="lock-modal-header">
          <h3 class="lock-modal-title">⚙️ Skenario Pengujian Praktikum</h3>
          <button class="lock-modal-close" onclick="window.lockApp.closeModal()">✕</button>
        </div>
        <div class="lock-modal-body">
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 0;">
            Gunakan pintasan ini untuk memudahkan pengujian atau demonstrasi di hadapan dosen penguji tanpa harus input manual dari awal:
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" style="font-size: 0.85rem;" onclick="window.lockApp.applySimulationScenario('make_all_ready'); window.lockApp.closeModal();">
              ⭐ Buat Semua Siswa Lulus & Lunas (Siap Kunci)
            </button>
            <button class="btn btn-secondary" style="font-size: 0.85rem;" onclick="window.lockApp.batchLockEligible(); window.lockApp.closeModal();">
              🔒 Eksekusi Batch Lock ke TU Langsung
            </button>
            <button class="btn" style="font-size: 0.85rem; background: #f1f5f9; color: #475569;" onclick="window.lockApp.applySimulationScenario('reset_all'); window.lockApp.closeModal();">
              🔄 Reset ke Data Awal Praktikum
            </button>
          </div>
        </div>
        <div class="lock-modal-footer">
          <button class="lock-btn-action btn-detail" onclick="window.lockApp.closeModal()">Batal</button>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================================
// ENTRY POINT PUBLIK (EXPORT FUNCTION)
// =========================================================================================

/**
 * Entry Point Utama: Render Modul 07 Pengelolaan & Lock Data ke Container
 */
export function renderLockValidasi(containerId = 'module-viewport') {
  ensureLockStyles();
  lockState.containerId = containerId;

  // Pasang window handler global untuk interaksi DOM
  window.lockApp = {
    switchTab: (tab) => {
      lockState.activeTab = tab;
      renderModuleUI();
    },
    handleSearch: (val) => {
      lockState.searchQuery = val;
      renderModuleUI();
    },
    lockStudent: (id) => lockStudent(id),
    batchLockEligible: () => batchLockEligible(),
    unlockStudent: (id) => unlockStudent(id),
    showAuditModal: (id) => showAuditModal(id),
    closeModal: () => closeModal(),
    togglePresetMenu: () => togglePresetMenu(),
    applySimulationScenario: (type) => applySimulationScenario(type)
  };

  // Render awal
  renderModuleUI();

  // Dengarkan pembaruan real-time jika ada perubahan dari Modul 01, 03, 05, atau 06
  const handleExternalUpdate = () => {
    loadStudentsData();
    renderModuleUI();
  };

  window.removeEventListener('spmb_db_updated', handleExternalUpdate);
  window.addEventListener('spmb_db_updated', handleExternalUpdate);
  window.addEventListener('db_updated', handleExternalUpdate);
}

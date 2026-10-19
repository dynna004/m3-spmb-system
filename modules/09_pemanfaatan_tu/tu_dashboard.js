/**
 * =========================================================================================
 * MODUL 09: PEMANFAATAN DATA TATA USAHA (TU DASHBOARD) - CORE ENGINE
 * SMA Muhammadiyah 3 Yogyakarta - Sistem Integrasi SPMB & TU
 * Penanggung Jawab / Developer: Raudhatul Audyna (Didukung Novelia untuk UI Dashboard)
 * =========================================================================================
 * Alur Terkait: Alur 15 (TU Mengakses Data Siswa Baru Langsung Tanpa Input Ulang)
 * Strategi: Agile | Layer: Presentation & Application Layer
 * Solusi Masalah Utama: Eliminasi Silo Data (M2) & Target Zero Data Re-entry (>= 90%)
 * =========================================================================================
 */

import { db } from '../../config/database.js';

// Kunci Storage Terintegrasi (Single Source of Truth)
const STORAGE_KEY_SSOT_TU   = 'm3_spmb_tu_db';
const STORAGE_KEY_PENDAFTAR = 'spmb_pendaftar_db';

// Daftar Rombongan Belajar Resmi SMA Muhammadiyah 3 Yogyakarta
const DAFTAR_ROMBEL = [
  { kode: 'X-MIPA-1', jurusan: 'MIPA', kapasitas: 36, wali_kelas: 'Drs. H. Sukirman, M.Pd.', ruang: 'Gedung A R.101' },
  { kode: 'X-MIPA-2', jurusan: 'MIPA', kapasitas: 36, wali_kelas: 'Siti Aminah, S.Si., M.Sc.', ruang: 'Gedung A R.102' },
  { kode: 'X-MIPA-3', jurusan: 'MIPA', kapasitas: 36, wali_kelas: 'Bambang Sutrisno, M.Pd.', ruang: 'Gedung A R.103' },
  { kode: 'X-IPS-1',  jurusan: 'IPS',  kapasitas: 36, wali_kelas: 'Dra. Hj. Nurul Hidayah', ruang: 'Gedung B R.201' },
  { kode: 'X-IPS-2',  jurusan: 'IPS',  kapasitas: 36, wali_kelas: 'Agus Wardoyo, S.Pd.', ruang: 'Gedung B R.202' }
];

// Opsi Ekstrakurikuler Pilihan Khas SMA Muhammadiyah 3
const DAFTAR_EKSKUL = [
  'Hizbul Wathan (Wajib)',
  'Tapak Suci Putera Muhammadiyah',
  'Robotik & Coding M3',
  'Palang Merah Remaja (PMR)',
  'English Club & Debate',
  'Qiroah & Tahfidz Quran',
  'Futsal & Basket',
  'Karya Ilmiah Remaja (KIR)'
];

/**
 * Dataset Master Default (17 Siswa Baru Terpadu SMA Muhammadiyah 3 Yogyakarta)
 * Mewakili beragam asal SMP, sebaran kelas MIPA & IPS, kontak wali, dan minat ekskul.
 */
const DEFAULT_TU_STUDENTS = [
  {
    id: "SPMB-2026-001",
    nama: "Ahmad Dahlan",
    nisn: "0051234567",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:15:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0001",
      kelas_terpilih: "X-MIPA-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "K.H. Abu Bakar",
        nomor_telepon: "081223456781",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Juara 2 Olimpiade Sains Muhammadiyah tingkat Kota Yogyakarta."
    }
  },
  {
    id: "SPMB-2026-002",
    nama: "Siti Walidah",
    nisn: "0052345678",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 3 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:20:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0002",
      kelas_terpilih: "X-MIPA-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Ny. Hj. Fadhilah",
        nomor_telepon: "081398765432",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Qiroah & Tahfidz Quran"],
      catatan_tu: "Hafalan Al-Quran 3 Juz (Juz 30, 29, 28)."
    }
  },
  {
    id: "SPMB-2026-003",
    nama: "Rizky Ramadhan",
    nisn: "0058765432",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 5 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-16T11:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0003",
      kelas_terpilih: "X-MIPA-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Ir. H. Ramadhan",
        nomor_telepon: "085712345678",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Peminat riset Internet of Things (IoT) dan mikrokontroler."
    }
  },
  {
    id: "SPMB-2026-004",
    nama: "Dewi Sartika",
    nisn: "0053456789",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:45:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0004",
      kelas_terpilih: "X-IPS-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Raden Somanagara",
        nomor_telepon: "081234567894",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "English Club & Debate"],
      catatan_tu: "Juara Debat Bahasa Inggris tingkat Provinsi DIY."
    }
  },
  {
    id: "SPMB-2026-005",
    nama: "Budi Santoso",
    nisn: "0054567890",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-17T09:10:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0005",
      kelas_terpilih: "X-MIPA-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Drs. Santoso, M.Si.",
        nomor_telepon: "081567890123",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Palang Merah Remaja (PMR)"],
      catatan_tu: "Aktif kepanduan dan relawan PMR Madya."
    }
  },
  {
    id: "SPMB-2026-006",
    nama: "Anisa Rahmawati",
    nisn: "0061234561",
    pilihan_jurusan: "IPS",
    asal_sekolah: "MTs Mu'allimat Muhammadiyah",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T13:20:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0006",
      kelas_terpilih: "X-IPS-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Hj. Nurjanah",
        nomor_telepon: "081823456789",
        hubungan: "Ibu Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Karya Ilmiah Remaja (KIR)"],
      catatan_tu: "Minat kuat pada bidang sosiologi & ekonomi syariah."
    }
  },
  {
    id: "SPMB-2026-007",
    nama: "Farhan Maulana",
    nisn: "0062345672",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 4 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T14:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0007",
      kelas_terpilih: "X-MIPA-3",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "H. Maulana Yusuf",
        nomor_telepon: "081334567890",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Tapak Suci Putera Muhammadiyah"],
      catatan_tu: "Atlet Tapak Suci tingkat kabupaten/kota."
    }
  },
  {
    id: "SPMB-2026-008",
    nama: "Nabila Khairunnisa",
    nisn: "0063456783",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 8 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T14:15:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0008",
      kelas_terpilih: "X-MIPA-3",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Dr. Hendra K., Sp.A",
        nomor_telepon: "085643219876",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Peminat olimpiade Biologi dan Kedokteran."
    }
  },
  {
    id: "SPMB-2026-009",
    nama: "Muhammad Ilham",
    nisn: "0064567894",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 7 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T15:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0009",
      kelas_terpilih: "X-IPS-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Bpk. Syamsuddin",
        nomor_telepon: "081287654321",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Futsal & Basket"],
      catatan_tu: "Kapten tim futsal SMP Muhammadiyah 7."
    }
  },
  {
    id: "SPMB-2026-010",
    nama: "Aisyah Putri",
    nisn: "0065678905",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Negeri 6 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T15:30:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0010",
      kelas_terpilih: "X-IPS-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Ibu Maryati",
        nomor_telepon: "081765432109",
        hubungan: "Ibu Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Tapak Suci Putera Muhammadiyah"],
      catatan_tu: "Peminat seni bela diri dan kepemimpinan IPM."
    }
  },
  {
    id: "SPMB-2026-011",
    nama: "Zikri Firmansyah",
    nisn: "0066789016",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP IT Abu Bakar Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T16:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0011",
      kelas_terpilih: "X-MIPA-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "H. Firmansyah, S.T.",
        nomor_telepon: "081321098765",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Berpengalaman dalam kompetisi perakitan robot Line Follower."
    }
  },
  {
    id: "SPMB-2026-012",
    nama: "Fatimah Zahra",
    nisn: "0067890127",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "MTs Negeri 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T16:20:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0012",
      kelas_terpilih: "X-MIPA-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Ustadz Lukman Hakim",
        nomor_telepon: "085298765432",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Qiroah & Tahfidz Quran"],
      catatan_tu: "Juara 1 MTQ Pelajar tingkat Kota Yogyakarta."
    }
  },
  {
    id: "SPMB-2026-013",
    nama: "Daffa Pratama",
    nisn: "0068901238",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T16:40:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0013",
      kelas_terpilih: "X-IPS-1",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Bpk. Joko Pratomo",
        nomor_telepon: "081901234567",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Futsal & Basket"],
      catatan_tu: "Peminat bidang jurnalistik dan komunikasi digital."
    }
  },
  {
    id: "SPMB-2026-014",
    nama: "Zahra Amelia",
    nisn: "0069012349",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 2 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T17:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0014",
      kelas_terpilih: "", // Belum ditempatkan untuk uji coba tombol distribusi otomatis
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Ny. Ratna Sari",
        nomor_telepon: "081212345678",
        hubungan: "Ibu Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "English Club & Debate"],
      catatan_tu: "Menunggu penentuan kelas resmi dari hasil wawancara MIPA."
    }
  },
  {
    id: "SPMB-2026-015",
    nama: "Haidar Ali",
    nisn: "0060123450",
    pilihan_jurusan: "IPS",
    asal_sekolah: "MTs Mu'allimin Muhammadiyah",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T17:15:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0015",
      kelas_terpilih: "", // Belum ditempatkan untuk uji coba tombol distribusi otomatis
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "H. Mustofa Kamal",
        nomor_telepon: "081345678901",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Tapak Suci Putera Muhammadiyah"],
      catatan_tu: "Kader persyarikatan IPM, minat studi Hubungan Internasional."
    }
  },
  {
    id: "SPMB-2026-016",
    nama: "Yusuf Mansur",
    nisn: "0061122334",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah Piyungan",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T17:30:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0016",
      kelas_terpilih: "X-MIPA-3",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "H. Mansur Hidayat",
        nomor_telepon: "085611223344",
        hubungan: "Orang Tua Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Qiroah & Tahfidz Quran"],
      catatan_tu: "Peminat olimpiade Fisika dan Astronomi."
    }
  },
  {
    id: "SPMB-2026-017",
    nama: "Khadijah Al-Kubro",
    nisn: "0062233445",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Negeri 9 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T17:45:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0017",
      kelas_terpilih: "X-IPS-2",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: "Dra. Siti Maryam",
        nomor_telepon: "081299887766",
        hubungan: "Ibu Kandung",
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Palang Merah Remaja (PMR)"],
      catatan_tu: "Memiliki sertifikasi pertolongan pertama PMR Madya DIY."
    }
  }
];

/**
 * State Terpusat Modul 09
 */
let tuState = {
  activeTab: 'buku_induk', // 'buku_induk', 'rombel', 'darurat', 'dapodik'
  searchQuery: '',
  filterJurusan: 'ALL',
  filterStatusRombel: 'ALL',
  selectedStudent: null,
  containerId: 'module-viewport'
};

/**
 * Pastikan Stylesheet Modul 09 terpasang di Head
 */
function ensureTUStyles() {
  const cssId = 'tu-dashboard-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/09_pemanfaatan_tu/');
    link.href = isStandalone ? './tu_dashboard.css' : './modules/09_pemanfaatan_tu/tu_dashboard.css';
    document.head.appendChild(link);
  }
}

/**
 * Sanitasi string untuk pencegahan XSS
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
 * Menampilkan Toast Notifikasi
 */
function showToast(message, type = 'success') {
  const existing = document.getElementById('tu-toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'tu-toast-notification';
  toast.className = 'tu-toast';
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3500);
}

/**
 * Membaca Data Siswa Terpadu dari SSoT Database
 * Menggabungkan pendaftar dari SPMB dan melengkapinya dengan 17 data siswa master TU
 */
function loadAllStudents() {
  let list = [];
  try {
    const rawSSoT = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    if (rawSSoT) {
      const parsed = JSON.parse(rawSSoT);
      if (Array.isArray(parsed.pendaftar) && parsed.pendaftar.length > 0) {
        list = parsed.pendaftar;
      }
    }
  } catch (err) {
    console.warn('[TU Modul] Gagal membaca storage SSoT:', err);
  }

  // Cross-check dari spmb_pendaftar_db jika ada data terverifikasi
  try {
    const rawSPMB = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (rawSPMB) {
      const spmbList = JSON.parse(rawSPMB);
      if (Array.isArray(spmbList)) {
        spmbList.forEach(spmbItem => {
          const sId = spmbItem.id_pendaftar || spmbItem.id;
          const existing = list.find(x => (x.id || x.id_pendaftar) === sId || x.nisn === spmbItem.nisn);
          if (existing) {
            if (spmbItem.is_locked !== undefined) existing.is_locked = spmbItem.is_locked;
            if (spmbItem.status_daftar_ulang) existing.status_daftar_ulang = spmbItem.status_daftar_ulang;
            if (spmbItem.asal_sekolah && !existing.asal_sekolah) existing.asal_sekolah = spmbItem.asal_sekolah;
          } else {
            list.push({
              id: sId,
              nama: spmbItem.nama_lengkap || spmbItem.nama,
              nisn: spmbItem.nisn,
              pilihan_jurusan: spmbItem.pilihan_jurusan,
              asal_sekolah: spmbItem.asal_sekolah,
              status_kelulusan: spmbItem.status_kelulusan,
              status_pembayaran: spmbItem.status_pembayaran,
              status_daftar_ulang: spmbItem.status_daftar_ulang || 'VERIFIED_LOCKED',
              is_locked: spmbItem.is_locked !== undefined ? spmbItem.is_locked : true,
              tgl_locked: spmbItem.tgl_locked || new Date().toISOString(),
              locked_by: spmbItem.locked_by || 'Koordinator SPMB'
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[TU Modul] Gagal cross-check SPMB:', err);
  }

  // Integrasikan dataset siswa master default TU agar data selalu kaya & lengkap (17+ siswa)
  let needsSave = false;
  DEFAULT_TU_STUDENTS.forEach(defStudent => {
    const sId = defStudent.id;
    const existing = list.find(x => (x.id || x.id_pendaftar) === sId || x.nisn === defStudent.nisn);
    if (!existing) {
      list.push({ ...defStudent });
      needsSave = true;
    } else {
      if (!existing.data_tu || Object.keys(existing.data_tu).length === 0) {
        existing.data_tu = { ...defStudent.data_tu };
        needsSave = true;
      }
      if (!existing.asal_sekolah) {
        existing.asal_sekolah = defStudent.asal_sekolah;
        needsSave = true;
      }
      if (existing.is_locked === undefined) {
        existing.is_locked = true;
        needsSave = true;
      }
    }
  });

  // Normalisasi objek data_tu pada setiap record siswa
  list.forEach((item, index) => {
    if (!item.data_tu || typeof item.data_tu !== 'object') {
      const paddedNum = String(index + 1).padStart(4, '0');
      const isMipa = (item.pilihan_jurusan || 'MIPA').toUpperCase() === 'MIPA';
      
      item.data_tu = {
        kelas_terpilih: isMipa ? 'X-MIPA-1' : 'X-IPS-1',
        buku_induk_nomor: `M3-2026-${paddedNum}`,
        status_dapodik: 'SIAP_SINKRON',
        kontak_darurat: {
          nama_kontak: `Wali dari ${item.nama || 'Siswa'}`,
          nomor_telepon: '0812' + Math.floor(10000000 + Math.random() * 90000000),
          hubungan: 'Orang Tua Kandung',
          status_validasi: 'TERVERIFIKASI'
        },
        peminatan_ekskul: ['Hizbul Wathan (Wajib)', isMipa ? 'Robotik & Coding M3' : 'Karya Ilmiah Remaja (KIR)'],
        catatan_tu: 'Data terintegrasi otomatis dari SPMB. Siap disinkronkan ke Dapodik.'
      };
      needsSave = true;
    }
  });

  if (needsSave) {
    saveStudentsData(list, false);
  }

  return list;
}

/**
 * Menyimpan Pembaruan Data TU secara Atomik ke SSoT Storage
 */
function saveStudentsData(studentsList, dispatchNotify = true) {
  try {
    // 1. Simpan ke m3_spmb_tu_db
    const rawSSoT = localStorage.getItem(STORAGE_KEY_SSOT_TU);
    let ssotData = rawSSoT ? JSON.parse(rawSSoT) : { pendaftar: [] };
    ssotData.pendaftar = studentsList;
    localStorage.setItem(STORAGE_KEY_SSOT_TU, JSON.stringify(ssotData));

    // 2. Cross-sync atribut data_tu ke spmb_pendaftar_db
    const rawSPMB = localStorage.getItem(STORAGE_KEY_PENDAFTAR);
    if (rawSPMB) {
      let spmbList = JSON.parse(rawSPMB);
      if (Array.isArray(spmbList)) {
        studentsList.forEach(tuItem => {
          const sId = tuItem.id || tuItem.id_pendaftar;
          const target = spmbList.find(x => (x.id_pendaftar || x.id) === sId || x.nisn === tuItem.nisn);
          if (target) {
            target.data_tu = tuItem.data_tu;
            target.is_locked = true;
          }
        });
        localStorage.setItem(STORAGE_KEY_PENDAFTAR, JSON.stringify(spmbList));
      }
    }

    if (dispatchNotify) {
      const detailPayload = { source: 'modul_09_pemanfaatan_tu', timestamp: new Date().toISOString() };
      window.dispatchEvent(new CustomEvent('spmb_db_updated', { detail: detailPayload }));
      document.dispatchEvent(new CustomEvent('spmb_db_updated', { detail: detailPayload }));
      window.dispatchEvent(new Event('db_updated'));
    }
  } catch (err) {
    console.error('[TU Modul] Gagal simpan data TU:', err);
    showToast('Gagal menyimpan perubahan ke basis data terpadu.', 'error');
  }
}

/**
 * Filter Siswa berdasarkan Tab, Pencarian, dan Dropdown
 */
function getFilteredStudents() {
  const all = loadAllStudents();
  let filtered = all;

  // Filter: Jurusan
  if (tuState.filterJurusan !== 'ALL') {
    filtered = filtered.filter(s => (s.pilihan_jurusan || '').toUpperCase() === tuState.filterJurusan);
  }

  // Filter: Status Penempatan Rombel
  if (tuState.filterStatusRombel === 'ASSIGNED') {
    filtered = filtered.filter(s => s.data_tu && s.data_tu.kelas_terpilih);
  } else if (tuState.filterStatusRombel === 'UNASSIGNED') {
    filtered = filtered.filter(s => !s.data_tu || !s.data_tu.kelas_terpilih);
  }

  // Filter: Kata Kunci Pencarian
  if (tuState.searchQuery.trim()) {
    const q = tuState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.nama || s.nama_lengkap || '').toLowerCase().includes(q) ||
      (s.id || s.id_pendaftar || '').toLowerCase().includes(q) ||
      (s.nisn && s.nisn.includes(q)) ||
      (s.asal_sekolah && s.asal_sekolah.toLowerCase().includes(q)) ||
      (s.data_tu?.buku_induk_nomor && s.data_tu.buku_induk_nomor.toLowerCase().includes(q)) ||
      (s.data_tu?.kelas_terpilih && s.data_tu.kelas_terpilih.toLowerCase().includes(q))
    );
  }

  return filtered;
}

// =========================================================================================
// AKSI BISNIS & OTOMATISASI TATA USAHA
// =========================================================================================

/**
 * Generate Nomor Buku Induk Otomatis untuk Semua Siswa yang Belum Memiliki
 */
function autoGenerateBukuIndukAll() {
  const all = loadAllStudents();
  let generatedCount = 0;

  all.forEach((item, index) => {
    if (!item.data_tu) item.data_tu = {};
    if (!item.data_tu.buku_induk_nomor) {
      const paddedNum = String(index + 1).padStart(4, '0');
      item.data_tu.buku_induk_nomor = `M3-2026-${paddedNum}`;
      item.data_tu.status_dapodik = 'SIAP_SINKRON';
      generatedCount++;
    }
  });

  saveStudentsData(all);
  showToast(`Berhasil menerbitkan ${generatedCount} Nomor Buku Induk Siswa baru!`, 'success');
  renderModuleUI();
}

/**
 * Distribusi Rombel Otomatis Berdasarkan Pilihan Jurusan & Kuota
 */
function autoDistributeRombel() {
  const all = loadAllStudents();
  let assignedCount = 0;

  // Hitung jumlah saat ini per kelas
  const countPerClass = {};
  DAFTAR_ROMBEL.forEach(r => countPerClass[r.kode] = 0);

  all.forEach(s => {
    if (s.data_tu?.kelas_terpilih && countPerClass[s.data_tu.kelas_terpilih] !== undefined) {
      countPerClass[s.data_tu.kelas_terpilih]++;
    }
  });

  // Assign siswa yang belum memiliki kelas
  all.forEach(s => {
    if (!s.data_tu) s.data_tu = {};
    if (!s.data_tu.kelas_terpilih) {
      const jur = (s.pilihan_jurusan || 'MIPA').toUpperCase();
      const eligibleClasses = DAFTAR_ROMBEL.filter(r => r.jurusan === jur);
      
      // Pilih kelas dengan keterisian terendah
      eligibleClasses.sort((a, b) => countPerClass[a.kode] - countPerClass[b.kode]);
      const chosen = eligibleClasses[0];

      if (chosen) {
        s.data_tu.kelas_terpilih = chosen.kode;
        countPerClass[chosen.kode]++;
        assignedCount++;
      }
    }
  });

  saveStudentsData(all);
  showToast(`Otomatisasi Rombel selesai! ${assignedCount} siswa ditempatkan di kelas.`, 'success');
  renderModuleUI();
}

/**
 * Ekspor Data Dapodik ke CSV
 */
function exportDapodikCSV() {
  const students = getFilteredStudents();
  if (students.length === 0) {
    showToast('Tidak ada data siswa untuk diekspor.', 'error');
    return;
  }

  const headers = [
    'No Registrasi',
    'Nama Peserta Didik',
    'NISN',
    'Asal Sekolah',
    'Jurusan',
    'Rombongan Belajar (Kelas)',
    'Nomor Buku Induk (NIS)',
    'Nama Wali / Kontak Darurat',
    'No Telepon Darurat',
    'Hubungan',
    'Peminatan Ekskul',
    'Status Sinkronisasi Dapodik'
  ];

  const rows = students.map(s => [
    `"${s.id || s.id_pendaftar || ''}"`,
    `"${s.nama || s.nama_lengkap || ''}"`,
    `"${s.nisn || ''}"`,
    `"${s.asal_sekolah || 'SMP Muhammadiyah'}"`,
    `"${s.pilihan_jurusan || ''}"`,
    `"${s.data_tu?.kelas_terpilih || 'Belum Ditetapkan'}"`,
    `"${s.data_tu?.buku_induk_nomor || '-'}"`,
    `"${s.data_tu?.kontak_darurat?.nama_kontak || '-'}"`,
    `"${s.data_tu?.kontak_darurat?.nomor_telepon || '-'}"`,
    `"${s.data_tu?.kontak_darurat?.hubungan || '-'}"`,
    `"${(s.data_tu?.peminatan_ekskul || []).join('; ')}"`,
    `"${s.data_tu?.status_dapodik || 'SIAP_SINKRON'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DAPODIK_SMA_M3_JOGJA_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();

  showToast('File CSV Format Dapodik berhasil diunduh!', 'success');
}

/**
 * Reset / Muat Ulang 17 Siswa Lengkap
 */
function resetSeedStudents() {
  const fresh = DEFAULT_TU_STUDENTS.map(s => JSON.parse(JSON.stringify(s)));
  saveStudentsData(fresh);
  showToast('17 Data Siswa Master TU berhasil dimuat ulang ke sistem!', 'success');
  renderModuleUI();
}

/**
 * Tarik / Sinkronkan Ulang Data dari SPMB
 */
function syncWithSPMBData() {
  loadAllStudents();
  showToast('Sinkronisasi SSoT Sukses! Data pendaftar terbaru telah dimuat.', 'success');
  renderModuleUI();
}

// =========================================================================================
// RENDER SUB-PANEL: 1. BUKU INDUK & DATA PESERTA DIDIK (TAB 1)
// =========================================================================================
function renderBukuIndukTab(students) {
  if (students.length === 0) {
    return `
      <div class="tu-card-panel">
        <div class="tu-empty-state">
          <div class="tu-empty-icon">📭</div>
          <h3 class="tu-empty-title">Tidak Ada Data Siswa yang Cocok</h3>
          <p class="tu-empty-desc">
            Silakan sesuaikan kata kunci pencarian atau muat 17 siswa master TU.
          </p>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="tu-btn-action primary" onclick="window.tuApp.resetSeedStudents()">
              🌱 Muat 17 Siswa Master TU
            </button>
            <button class="tu-btn-action secondary" onclick="window.tuApp.openAddStudentModal()">
              ➕ Tambah Siswa Manual
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const rowsHtml = students.map((s, index) => {
    const sId = s.id || s.id_pendaftar || '-';
    const nama = s.nama || s.nama_lengkap || '-';
    const nisn = s.nisn || '-';
    const asal = s.asal_sekolah || 'SMP Muhammadiyah';
    const jurusan = s.pilihan_jurusan || 'MIPA';
    const bukuInduk = s.data_tu?.buku_induk_nomor;
    const kelas = s.data_tu?.kelas_terpilih;
    const kontak = s.data_tu?.kontak_darurat;

    return `
      <tr>
        <td style="text-align: center; color: var(--tu-slate-600); font-weight: 700; width: 40px;">
          ${index + 1}
        </td>
        <td>
          <div class="tu-student-cell">
            <span class="tu-student-name">${escapeHtml(nama)}</span>
            <div class="tu-student-sub">
              <span class="tu-reg-badge">${escapeHtml(sId)}</span>
              <span>NISN: <strong>${escapeHtml(nisn)}</strong></span>
            </div>
            <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px;">
              🏫 ${escapeHtml(asal)}
            </div>
          </div>
        </td>
        <td>
          <span class="tu-badge ${jurusan.toLowerCase() === 'mipa' ? 'mipa' : 'ips'}">
            ${escapeHtml(jurusan)}
          </span>
        </td>
        <td>
          ${bukuInduk 
            ? `<span class="tu-buku-induk-code">${escapeHtml(bukuInduk)}</span>` 
            : `<span class="tu-buku-induk-empty">Belum terbit</span>`}
        </td>
        <td>
          ${kelas 
            ? `<span class="tu-badge assigned">🏫 ${escapeHtml(kelas)}</span>` 
            : `<span class="tu-badge unassigned">Belum Ditempatkan</span>`}
        </td>
        <td>
          <div class="tu-emergency-cell">
            <div class="tu-emergency-name">${escapeHtml(kontak?.nama_kontak || '-')}</div>
            <div class="tu-emergency-phone">📞 ${escapeHtml(kontak?.nomor_telepon || '-')}</div>
          </div>
        </td>
        <td>
          <span class="tu-badge dapodik-ready">
            <span>✔</span> Siap Sinkron
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="tu-btn-table primary" onclick="window.tuApp.openEditModal('${escapeHtml(sId)}')">
              ✏️ Atur TU
            </button>
            <button class="tu-btn-table" onclick="window.tuApp.openPrintModal('${escapeHtml(sId)}')">
              🖨️ Cetak
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="tu-card-panel">
      <div class="tu-card-panel-header">
        <div>
          <h2 class="tu-panel-title">
            <span>📋</span> Buku Induk Siswa Baru & Integrasi Tata Usaha (${students.length} Siswa)
          </h2>
          <p class="tu-panel-subtitle">
            Seluruh data peserta didik di bawah dapat dikelola langsung tanpa perlu pencatatan ulang fisik.
          </p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="tu-btn-action gold" onclick="window.tuApp.openAddStudentModal()" title="Tambah siswa baru langsung ke Buku Induk TU">
            ➕ Tambah Siswa TU
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.autoBukuInduk()" title="Terbitkan Nomor Buku Induk untuk siswa yang belum memiliki">
            ⚡ Generate Buku Induk
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.exportCSV()" title="Ekspor data ke format spreadsheet Dapodik">
            📥 Ekspor Dapodik (.CSV)
          </button>
        </div>
      </div>

      <div class="tu-table-container">
        <table class="tu-data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Identitas Siswa & Asal Sekolah</th>
              <th>Jurusan</th>
              <th>No. Buku Induk (NIS)</th>
              <th>Penempatan Rombel</th>
              <th>Kontak Darurat (Wali)</th>
              <th>Status Dapodik</th>
              <th>Aksi Pengelolaan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER SUB-PANEL: 2. MANAJEMEN ROMBONGAN BELAJAR / KELAS (TAB 2)
// =========================================================================================
function renderRombelTab(students) {
  const unassignedStudents = students.filter(s => !s.data_tu?.kelas_terpilih);

  const rombelCardsHtml = DAFTAR_ROMBEL.map(rombel => {
    const classStudents = students.filter(s => s.data_tu?.kelas_terpilih === rombel.kode);
    const count = classStudents.length;
    const percent = Math.min(100, Math.round((count / rombel.kapasitas) * 100));

    const studentListHtml = classStudents.map((cs, idx) => `
      <div class="tu-rombel-student-item">
        <span><strong>${idx + 1}.</strong> ${escapeHtml(cs.nama || cs.nama_lengkap)}</span>
        <span class="tu-buku-induk-code" style="font-size:0.7rem;">${escapeHtml(cs.data_tu?.buku_induk_nomor || cs.id)}</span>
      </div>
    `).join('');

    return `
      <div class="tu-rombel-card">
        <div class="tu-rombel-header">
          <div>
            <div class="tu-rombel-title">${escapeHtml(rombel.kode)}</div>
            <div style="font-size:0.75rem; color:var(--tu-slate-600); margin-top:2px;">
              Wali: <strong>${escapeHtml(rombel.wali_kelas)}</strong>
            </div>
          </div>
          <span class="tu-rombel-jurusan-tag ${rombel.jurusan.toLowerCase()}">
            ${escapeHtml(rombel.jurusan)}
          </span>
        </div>

        <div class="tu-progress-wrapper">
          <div class="tu-progress-label">
            <span>Keterisian Rombel</span>
            <span><strong>${count}</strong> / ${rombel.kapasitas} Siswa (${percent}%)</span>
          </div>
          <div class="tu-progress-bar-bg">
            <div class="tu-progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div style="font-size:0.75rem; color:var(--tu-slate-600); display:flex; justify-content:space-between;">
          <span>📍 Ruang: ${escapeHtml(rombel.ruang)}</span>
          <span style="color:#059669; font-weight:700;">${rombel.kapasitas - count} Kursi Tersedia</span>
        </div>

        <div class="tu-rombel-students-list">
          ${studentListHtml || '<div style="text-align:center; color:#94a3b8; font-size:0.75rem; padding:1rem;">Belum ada siswa di kelas ini.</div>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="tu-card-panel">
      <div class="tu-card-panel-header">
        <div>
          <h2 class="tu-panel-title">
            <span>🏫</span> Distribusi Rombongan Belajar (Rombel Kelas X)
          </h2>
          <p class="tu-panel-subtitle">
            Kapasitas ideal kelas di SMA Muhammadiyah 3 Yogyakarta adalah 36 siswa per rombongan belajar.
            ${unassignedStudents.length > 0 ? `<strong style="color:#d97706;"> (Ada ${unassignedStudents.length} siswa belum ditentukan kelasnya)</strong>` : ''}
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="tu-btn-action primary" onclick="window.tuApp.autoRombel()">
            ⚡ Distribusi Rombel Otomatis (${unassignedStudents.length} Siswa)
          </button>
        </div>
      </div>

      <div class="tu-rombel-grid">
        ${rombelCardsHtml}
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER SUB-PANEL: 3. KONTAK DARURAT & PEMINATAN EKSKUL (TAB 3)
// =========================================================================================
function renderDaruratTab(students) {
  const rows = students.map((s, index) => {
    const sId = s.id || s.id_pendaftar || '-';
    const nama = s.nama || s.nama_lengkap || '-';
    const kontak = s.data_tu?.kontak_darurat;
    const ekskul = s.data_tu?.peminatan_ekskul || [];

    const ekskulTagsHtml = ekskul.map(e => `
      <span style="display:inline-block; font-size:0.725rem; background:#f1f5f9; color:#1e293b; padding:2px 6px; border-radius:4px; margin:2px;">
        ${escapeHtml(e)}
      </span>
    `).join('');

    return `
      <tr>
        <td style="text-align:center; color:var(--tu-slate-600); font-weight:700; width:40px;">${index + 1}</td>
        <td>
          <div class="tu-student-cell">
            <span class="tu-student-name">${escapeHtml(nama)}</span>
            <span style="font-size:0.75rem; color:var(--tu-slate-600);">${escapeHtml(sId)}</span>
          </div>
        </td>
        <td>
          <strong>${escapeHtml(kontak?.nama_kontak || '-')}</strong>
          <div style="font-size:0.75rem; color:var(--tu-slate-600);">${escapeHtml(kontak?.hubungan || 'Orang Tua')}</div>
        </td>
        <td>
          <a href="tel:${escapeHtml(kontak?.nomor_telepon)}" style="font-family:monospace; font-weight:700; color:#0284c7; text-decoration:none;">
            📞 ${escapeHtml(kontak?.nomor_telepon || '-')}
          </a>
        </td>
        <td>
          <span class="tu-badge" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">
            ✔ ${escapeHtml(kontak?.status_validasi || 'TERVERIFIKASI')}
          </span>
        </td>
        <td>
          <div style="max-width: 320px;">
            ${ekskulTagsHtml || '<span style="color:#94a3b8; font-size:0.75rem;">Belum memilih</span>'}
          </div>
        </td>
        <td>
          <button class="tu-btn-table primary" onclick="window.tuApp.openEditModal('${escapeHtml(sId)}')">
            ✏️ Perbarui
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="tu-card-panel">
      <div class="tu-card-panel-header">
        <div>
          <h2 class="tu-panel-title">
            <span>📞</span> Manajemen Kontak Darurat & Peminatan Bakat Siswa (${students.length} Siswa)
          </h2>
          <p class="tu-panel-subtitle">
            Pencatatan kontak wali darurat dan ekstrakurikuler kepanduan Hizbul Wathan / Tapak Suci / Robotik.
          </p>
        </div>
      </div>

      <div class="tu-table-container">
        <table class="tu-data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Nama Siswa & No. Reg</th>
              <th>Nama Kontak Darurat</th>
              <th>Nomor Telepon Wali</th>
              <th>Validasi Kontak</th>
              <th>Peminatan Ekstrakurikuler</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" style="text-align:center; padding:2rem;">Tidak ada data kontak darurat.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER SUB-PANEL: 4. SINKRONISASI DAPODIK KEMDIKBUDRISTEK (TAB 4)
// =========================================================================================
function renderDapodikTab(students) {
  const readyCount = students.filter(s => s.data_tu?.status_dapodik === 'SIAP_SINKRON').length;
  const percentReady = students.length > 0 ? Math.round((readyCount / students.length) * 100) : 0;

  return `
    <div class="tu-card-panel" style="padding: 1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:1.5rem;">
        <div>
          <h2 class="tu-panel-title">
            <span>🔄</span> Gerbang Integrasi & Sinkronisasi Dapodik Kemdikbudristek
          </h2>
          <p class="tu-panel-subtitle">
            Validasi kepatuhan data sebelum diunggah ke aplikasi resmi Dapodik Dasmen Dikdasmen Muhammadiyah.
          </p>
        </div>
        <button class="tu-btn-action primary" onclick="window.tuApp.exportCSV()">
          📥 Unduh Template Sinkronisasi (.CSV)
        </button>
      </div>

      <!-- Kesiapan Sinkronisasi Metrics -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Tingkat Kesiapan SSoT</div>
          <div style="font-size:1.75rem; font-weight:800; color:#059669; margin:4px 0;">${percentReady}%</div>
          <div style="font-size:0.75rem; color:#10b981;">100% Zero Manual Re-entry</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Siswa Siap Sinkron</div>
          <div style="font-size:1.75rem; font-weight:800; color:#0284c7; margin:4px 0;">${readyCount} Siswa</div>
          <div style="font-size:0.75rem; color:#64748b;">Memiliki NISN & Data Valid</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Konektor Basis Data</div>
          <div style="font-size:1.75rem; font-weight:800; color:#1e293b; margin:4px 0;">SSoT Live</div>
          <div style="font-size:0.75rem; color:#059669;">Terhubung ke Modul 08</div>
        </div>
      </div>

      <!-- Preview Snapshot Tabel Dapodik -->
      <div style="background:#f1f5f9; border-radius:8px; padding:1rem; border:1px solid #cbd5e1;">
        <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:8px; color:#1e293b;">
          Preview Atribut Kolom Standar Dapodik yang Terpetakan Otomatis:
        </h4>
        <ul style="font-size:0.825rem; color:#475569; line-height:1.7; margin-left:1.25rem;">
          <li><strong>Nomor Induk Siswa Nasional (NISN):</strong> 10 Digit tervalidasi dari registrasi SPMB (Modul 01).</li>
          <li><strong>Nomor Induk Siswa (NIS):</strong> Diterbitkan dari generator Buku Induk TU format <code>M3-2026-XXXX</code>.</li>
          <li><strong>Rombongan Belajar:</strong> Terpetakan ke <code>X-MIPA-1 s/d X-IPS-2</code> berdasarkan seleksi minat (Modul 04).</li>
          <li><strong>Kontak Orang Tua / Wali:</strong> Tervalidasi langsung tanpa input ulang kertas formulir.</li>
        </ul>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER UTAMA MODUL 09
// =========================================================================================
function renderModuleUI() {
  const container = document.getElementById(tuState.containerId);
  if (!container) return;

  const allStudents = loadAllStudents();
  const filteredStudents = getFilteredStudents();

  // Hitung Metrik Dashboard
  const totalStudents = allStudents.length;
  const assignedCount = allStudents.filter(s => s.data_tu?.kelas_terpilih).length;
  const bukuIndukCount = allStudents.filter(s => s.data_tu?.buku_induk_nomor).length;
  const readyDapodikCount = allStudents.filter(s => s.data_tu?.status_dapodik === 'SIAP_SINKRON').length;

  // Render Sub-Panel berdasarkan tab
  let contentHtml = '';
  if (tuState.activeTab === 'buku_induk') contentHtml = renderBukuIndukTab(filteredStudents);
  else if (tuState.activeTab === 'rombel') contentHtml = renderRombelTab(allStudents);
  else if (tuState.activeTab === 'darurat') contentHtml = renderDaruratTab(filteredStudents);
  else if (tuState.activeTab === 'dapodik') contentHtml = renderDapodikTab(allStudents);

  container.innerHTML = `
    <div class="tu-module-container">

      <!-- 1. Header Banner -->
      <div class="tu-header-card">
        <div class="tu-header-top">
          <h1 class="tu-header-title">
            <span>🏢</span> Modul 09: Pemanfaatan Data Tata Usaha (TU Dashboard)
          </h1>
          <div class="tu-header-badges">
            <span class="tu-badge-pill gold">
              <span>👤</span> Developer: Raudhatul Audyna
            </span>
            <span class="tu-badge-pill zero-reentry">
              <span>⚡</span> Zero Manual Re-entry
            </span>
            <span class="tu-badge-pill">
              <span>🏷️</span> Total: ${totalStudents} Siswa
            </span>
          </div>
        </div>
        <p class="tu-header-desc">
          Antarmuka terpadu bagian Tata Usaha (TU) untuk memanfaatkan data peserta didik baru hasil SPMB secara langsung 
          tanpa pencatatan ulang manual (<strong>Solusi Masalah M2 - Eliminasi Silo Data</strong>). Digunakan untuk penerbitan Buku Induk Siswa, 
          penempatan rombongan belajar (rombel), verifikasi kontak darurat wali, dan integrasi Dapodik.
        </p>
      </div>

      <!-- SSoT Notice Callout -->
      <div class="tu-callout-ssot">
        <div class="tu-callout-icon">⚡</div>
        <div class="tu-callout-text">
          <strong>Integrasi Basis Data Tata Usaha Aktif:</strong>
          Data siswa terhubung langsung dan tersimpan pada basis data terpadu <span class="tu-callout-badge">SSoT TU</span>.
          Staf administrasi TU dapat mengelola kelas, buku induk, serta kontak darurat tanpa pengisian formulir manual berulang.
        </div>
      </div>

      <!-- 2. Bento Stats Grid -->
      <div class="tu-stats-grid">
        <div class="tu-stat-card">
          <div class="tu-stat-icon fetch">👥</div>
          <div>
            <div class="tu-stat-number">${totalStudents} Siswa</div>
            <div class="tu-stat-label">Total Siswa di Sistem TU</div>
          </div>
        </div>

        <div class="tu-stat-card">
          <div class="tu-stat-icon rombel">🏫</div>
          <div>
            <div class="tu-stat-number">${assignedCount} / ${totalStudents}</div>
            <div class="tu-stat-label">Telah Ditempatkan di Kelas</div>
          </div>
        </div>

        <div class="tu-stat-card">
          <div class="tu-stat-icon buku">📖</div>
          <div>
            <div class="tu-stat-number">${bukuIndukCount} Siswa</div>
            <div class="tu-stat-label">Memiliki No. Buku Induk</div>
          </div>
        </div>

        <div class="tu-stat-card">
          <div class="tu-stat-icon dapodik">🔄</div>
          <div>
            <div class="tu-stat-number">${readyDapodikCount} Siswa</div>
            <div class="tu-stat-label">Siap Sinkron ke Dapodik</div>
          </div>
        </div>
      </div>

      <!-- 3. Sub-Navigation Tabs -->
      <div class="tu-nav-tabs">
        <button 
          class="tu-tab-btn ${tuState.activeTab === 'buku_induk' ? 'active' : ''}" 
          onclick="window.tuApp.switchTab('buku_induk')"
        >
          <span>📋</span> Buku Induk & Siswa Baru <span class="tu-tab-badge">${totalStudents}</span>
        </button>
        <button 
          class="tu-tab-btn ${tuState.activeTab === 'rombel' ? 'active' : ''}" 
          onclick="window.tuApp.switchTab('rombel')"
        >
          <span>🏫</span> Pembagian Rombel (Kelas) <span class="tu-tab-badge">${DAFTAR_ROMBEL.length} Kelas</span>
        </button>
        <button 
          class="tu-tab-btn ${tuState.activeTab === 'darurat' ? 'active' : ''}" 
          onclick="window.tuApp.switchTab('darurat')"
        >
          <span>📞</span> Kontak Darurat & Ekskul
        </button>
        <button 
          class="tu-tab-btn ${tuState.activeTab === 'dapodik' ? 'active' : ''}" 
          onclick="window.tuApp.switchTab('dapodik')"
        >
          <span>🔄</span> Integrasi Dapodik
        </button>
      </div>

      <!-- 4. Controls & Filter Bar -->
      <div class="tu-filter-card">
        <div class="tu-filter-group">
          <input 
            type="text" 
            class="tu-search-input" 
            placeholder="Cari nama siswa / NISN / Buku Induk..." 
            value="${escapeHtml(tuState.searchQuery)}"
            oninput="window.tuApp.handleSearch(this.value)"
          />

          <select class="tu-select-filter" onchange="window.tuApp.filterJurusan(this.value)">
            <option value="ALL" ${tuState.filterJurusan === 'ALL' ? 'selected' : ''}>Semua Jurusan</option>
            <option value="MIPA" ${tuState.filterJurusan === 'MIPA' ? 'selected' : ''}>MIPA</option>
            <option value="IPS" ${tuState.filterJurusan === 'IPS' ? 'selected' : ''}>IPS</option>
          </select>

          <select class="tu-select-filter" onchange="window.tuApp.filterRombel(this.value)">
            <option value="ALL" ${tuState.filterStatusRombel === 'ALL' ? 'selected' : ''}>Status Penempatan Kelas</option>
            <option value="ASSIGNED" ${tuState.filterStatusRombel === 'ASSIGNED' ? 'selected' : ''}>Sudah Ditempatkan</option>
            <option value="UNASSIGNED" ${tuState.filterStatusRombel === 'UNASSIGNED' ? 'selected' : ''}>Belum Ditempatkan</option>
          </select>
        </div>

        <div class="tu-filter-group">
          <button class="tu-btn-action gold" onclick="window.tuApp.openAddStudentModal()" title="Input siswa baru langsung di bagian Tata Usaha">
            ➕ Tambah Siswa TU
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.resetSeedStudents()" title="Muat ulang 17 data siswa master SMA Muhammadiyah 3">
            🌱 Muat 17 Siswa
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.syncData()" title="Segarkan dan sinkronkan data langsung dari SSoT SPMB">
            🔄 Tarik Data SPMB
          </button>
        </div>
      </div>

      <!-- 5. Content Viewport -->
      <div id="tu-main-viewport">
        ${contentHtml}
      </div>

    </div>

    <!-- Modal Root Container -->
    <div id="tu-modal-root"></div>
  `;
}

// =========================================================================================
// MODAL DIALOGS: EDIT TU, TAMBAH SISWA, & CETAK BUKU INDUK
// =========================================================================================

/**
 * Membuka Modal Tambah Siswa Baru Langsung dari TU (Tidak harus bergantung dari alur modul sebelumnya)
 */
function openAddStudentModal() {
  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  const all = loadAllStudents();
  const nextNum = all.length + 1;
  const nextPadded = String(nextNum).padStart(3, '0');
  const nextRegId = `SPMB-2026-${nextPadded}`;
  const nextBukuInduk = `M3-2026-${String(nextNum).padStart(4, '0')}`;

  const classOptionsHtml = DAFTAR_ROMBEL.map(r => `
    <option value="${r.kode}">
      ${r.kode} (${r.jurusan}) - Wali: ${r.wali_kelas}
    </option>
  `).join('');

  const ekskulCheckboxesHtml = DAFTAR_EKSKUL.map(e => `
    <label style="display:flex; align-items:center; gap:8px; font-size:0.825rem; color:var(--tu-slate-800); cursor:pointer;">
      <input 
        type="checkbox" 
        name="tu_new_ekskul_choice" 
        value="${escapeHtml(e)}" 
        ${e.includes('Hizbul Wathan') ? 'checked' : ''}
      />
      ${escapeHtml(e)}
    </label>
  `).join('');

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-dialog" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <h3 class="tu-modal-title">
            <span>➕</span> Tambah Siswa Baru (Entri Langsung Bagian TU)
          </h3>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <form id="tu-add-student-form" onsubmit="window.tuApp.saveNewStudent(event)">
          <div class="tu-modal-body">
            <!-- Info Pendaftaran & Sekolah Asal -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="tu-form-group">
                <label class="tu-form-label">Nomor Registrasi Siswa</label>
                <input 
                  type="text" 
                  class="tu-form-input" 
                  id="tu_add_id" 
                  value="${escapeHtml(nextRegId)}" 
                  required
                />
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">NISN (10 Digit Resmi)</label>
                <input 
                  type="text" 
                  class="tu-form-input" 
                  id="tu_add_nisn" 
                  placeholder="0061234567" 
                  pattern="[0-9]{10}"
                  title="NISN harus 10 digit angka"
                  required
                />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="tu-form-group">
                <label class="tu-form-label">Nama Lengkap Siswa</label>
                <input 
                  type="text" 
                  class="tu-form-input" 
                  id="tu_add_nama" 
                  placeholder="Nama calon siswa" 
                  required
                />
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Asal Sekolah (SMP / MTs)</label>
                <input 
                  type="text" 
                  class="tu-form-input" 
                  id="tu_add_asal" 
                  placeholder="SMP Muhammadiyah / Negeri" 
                  required
                />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="tu-form-group">
                <label class="tu-form-label">Peminatan Jurusan</label>
                <select class="tu-form-select" id="tu_add_jurusan" required>
                  <option value="MIPA">MIPA (Matematika & IPA)</option>
                  <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                </select>
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Penempatan Rombel (Kelas)</label>
                <select class="tu-form-select" id="tu_add_kelas">
                  <option value="">-- Belum Ditempatkan --</option>
                  ${classOptionsHtml}
                </select>
              </div>
            </div>

            <div class="tu-form-group">
              <label class="tu-form-label">Nomor Buku Induk Siswa (NIS)</label>
              <input 
                type="text" 
                class="tu-form-input" 
                id="tu_add_buku_induk" 
                value="${escapeHtml(nextBukuInduk)}" 
                required
              />
            </div>

            <!-- Kontak Darurat Wali -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--tu-slate-900);">
                📞 Informasi Kontak Darurat Wali Siswa
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div class="tu-form-group">
                  <label class="tu-form-label">Nama Lengkap Wali</label>
                  <input 
                    type="text" 
                    class="tu-form-input" 
                    id="tu_add_nama_wali" 
                    placeholder="Nama Orang Tua / Wali" 
                    required
                  />
                </div>
                <div class="tu-form-group">
                  <label class="tu-form-label">Nomor HP / WhatsApp Aktif</label>
                  <input 
                    type="text" 
                    class="tu-form-input" 
                    id="tu_add_telp_wali" 
                    placeholder="081234567890" 
                    required
                  />
                </div>
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Hubungan Kekeluargaan</label>
                <select class="tu-form-select" id="tu_add_hubungan">
                  <option value="Orang Tua Kandung">Orang Tua Kandung</option>
                  <option value="Kakek / Nenek">Kakek / Nenek</option>
                  <option value="Paman / Bibi">Paman / Bibi</option>
                  <option value="Wali Resmi">Wali Resmi</option>
                </select>
              </div>
            </div>

            <!-- Peminatan Ekstrakurikuler -->
            <div class="tu-form-group">
              <label class="tu-form-label">Peminatan Ekstrakurikuler Siswa</label>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:#fafafa; border:1px solid #e2e8f0; padding:10px; border-radius:8px;">
                ${ekskulCheckboxesHtml}
              </div>
            </div>

            <!-- Catatan TU -->
            <div class="tu-form-group">
              <label class="tu-form-label">Catatan Administrasi Tata Usaha</label>
              <textarea 
                class="tu-form-textarea" 
                id="tu_add_catatan" 
                rows="2" 
                placeholder="Catatan prestasi, beasiswa, atau kebutuhan khusus siswa..."
              >Siswa baru terdaftar resmi di sistem Tata Usaha.</textarea>
            </div>
          </div>

          <div class="tu-modal-footer">
            <button type="button" class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Batal</button>
            <button type="submit" class="tu-btn-action primary">💾 Simpan Siswa Baru</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Menyimpan Form Tambah Siswa Baru
 */
function handleSaveNewStudent(event) {
  event.preventDefault();
  const all = loadAllStudents();

  const id = document.getElementById('tu_add_id').value.trim();
  const nisn = document.getElementById('tu_add_nisn').value.trim();
  const nama = document.getElementById('tu_add_nama').value.trim();
  const asal = document.getElementById('tu_add_asal').value.trim();
  const jurusan = document.getElementById('tu_add_jurusan').value;
  const kelas = document.getElementById('tu_add_kelas').value;
  const bukuInduk = document.getElementById('tu_add_buku_induk').value.trim();
  const namaWali = document.getElementById('tu_add_nama_wali').value.trim();
  const telpWali = document.getElementById('tu_add_telp_wali').value.trim();
  const hubungan = document.getElementById('tu_add_hubungan').value;
  const catatan = document.getElementById('tu_add_catatan').value.trim();

  // Ambil pilihan checkbox ekskul
  const checkedBoxes = document.querySelectorAll('input[name="tu_new_ekskul_choice"]:checked');
  const selectedEkskul = Array.from(checkedBoxes).map(cb => cb.value);

  // Buat objek record siswa baru yang langsung valid untuk TU
  const newStudent = {
    id: id,
    nama: nama,
    nisn: nisn,
    asal_sekolah: asal,
    pilihan_jurusan: jurusan,
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: new Date().toISOString(),
    locked_by: "Bagian Tata Usaha",
    data_tu: {
      buku_induk_nomor: bukuInduk,
      kelas_terpilih: kelas,
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: {
        nama_kontak: namaWali,
        nomor_telepon: telpWali,
        hubungan: hubungan,
        status_validasi: "TERVERIFIKASI"
      },
      peminatan_ekskul: selectedEkskul.length > 0 ? selectedEkskul : ["Hizbul Wathan (Wajib)"],
      catatan_tu: catatan
    }
  };

  all.unshift(newStudent);
  saveStudentsData(all);
  showToast(`Siswa baru ${nama} berhasil ditambahkan ke Buku Induk TU!`, 'success');
  closeModal();
  renderModuleUI();
}

/**
 * Membuka Modal Form Edit Penempatan Siswa di TU
 */
function openEditModal(studentId) {
  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === studentId || s.nisn === studentId);
  if (!student) return;

  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  const sId = student.id || student.id_pendaftar;
  const nama = student.nama || student.nama_lengkap;
  const dataTu = student.data_tu || {};
  const kontak = dataTu.kontak_darurat || {};
  const currentEkskul = dataTu.peminatan_ekskul || [];

  const classOptionsHtml = DAFTAR_ROMBEL.map(r => `
    <option value="${r.kode}" ${dataTu.kelas_terpilih === r.kode ? 'selected' : ''}>
      ${r.kode} (${r.jurusan}) - Wali: ${r.wali_kelas}
    </option>
  `).join('');

  const ekskulCheckboxesHtml = DAFTAR_EKSKUL.map(e => `
    <label style="display:flex; align-items:center; gap:8px; font-size:0.825rem; color:var(--tu-slate-800); cursor:pointer;">
      <input 
        type="checkbox" 
        name="tu_ekskul_choice" 
        value="${escapeHtml(e)}" 
        ${currentEkskul.includes(e) ? 'checked' : ''}
      />
      ${escapeHtml(e)}
    </label>
  `).join('');

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-dialog" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <h3 class="tu-modal-title">
            <span>✏️</span> Pengelolaan Administrasi TU: ${escapeHtml(nama)}
          </h3>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <form id="tu-edit-form" onsubmit="window.tuApp.saveEditStudent(event, '${escapeHtml(sId)}')">
          <div class="tu-modal-body">
            <!-- Rombel & Buku Induk -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="tu-form-group">
                <label class="tu-form-label">Nomor Buku Induk Siswa (NIS)</label>
                <input 
                  type="text" 
                  class="tu-form-input" 
                  id="tu_input_buku_induk" 
                  value="${escapeHtml(dataTu.buku_induk_nomor || '')}" 
                  placeholder="M3-2026-XXXX" 
                  required
                />
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Penempatan Rombongan Belajar (Kelas)</label>
                <select class="tu-form-select" id="tu_input_kelas">
                  <option value="">-- Belum Ditempatkan --</option>
                  ${classOptionsHtml}
                </select>
              </div>
            </div>

            <!-- Kontak Darurat Wali -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--tu-slate-900);">
                📞 Informasi Kontak Darurat Wali Siswa
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div class="tu-form-group">
                  <label class="tu-form-label">Nama Lengkap Wali</label>
                  <input 
                    type="text" 
                    class="tu-form-input" 
                    id="tu_input_nama_wali" 
                    value="${escapeHtml(kontak.nama_kontak || '')}" 
                    required
                  />
                </div>
                <div class="tu-form-group">
                  <label class="tu-form-label">Nomor HP / WhatsApp Aktif</label>
                  <input 
                    type="text" 
                    class="tu-form-input" 
                    id="tu_input_telp_wali" 
                    value="${escapeHtml(kontak.nomor_telepon || '')}" 
                    required
                  />
                </div>
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Hubungan Kekeluargaan</label>
                <select class="tu-form-select" id="tu_input_hubungan">
                  <option value="Orang Tua Kandung" ${kontak.hubungan === 'Orang Tua Kandung' ? 'selected' : ''}>Orang Tua Kandung</option>
                  <option value="Ibu Kandung" ${kontak.hubungan === 'Ibu Kandung' ? 'selected' : ''}>Ibu Kandung</option>
                  <option value="Kakek / Nenek" ${kontak.hubungan === 'Kakek / Nenek' ? 'selected' : ''}>Kakek / Nenek</option>
                  <option value="Paman / Bibi" ${kontak.hubungan === 'Paman / Bibi' ? 'selected' : ''}>Paman / Bibi</option>
                  <option value="Wali Resmi" ${kontak.hubungan === 'Wali Resmi' ? 'selected' : ''}>Wali Resmi</option>
                </select>
              </div>
            </div>

            <!-- Peminatan Ekstrakurikuler -->
            <div class="tu-form-group">
              <label class="tu-form-label">Peminatan Ekstrakurikuler Siswa</label>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:#fafafa; border:1px solid #e2e8f0; padding:10px; border-radius:8px;">
                ${ekskulCheckboxesHtml}
              </div>
            </div>

            <!-- Catatan TU -->
            <div class="tu-form-group">
              <label class="tu-form-label">Catatan Administrasi Tata Usaha</label>
              <textarea 
                class="tu-form-textarea" 
                id="tu_input_catatan" 
                rows="2" 
                placeholder="Catatan berkas, beasiswa, atau kebutuhan khusus siswa..."
              >${escapeHtml(dataTu.catatan_tu || '')}</textarea>
            </div>
          </div>

          <div class="tu-modal-footer">
            <button type="button" class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Batal</button>
            <button type="submit" class="tu-btn-action primary">💾 Simpan ke SSoT TU</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Menyimpan Form Edit Siswa ke SSoT
 */
function handleSaveEditStudent(event, studentId) {
  event.preventDefault();
  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === studentId || s.nisn === studentId);
  if (!student) return;

  const bukuInduk = document.getElementById('tu_input_buku_induk').value.trim();
  const kelas = document.getElementById('tu_input_kelas').value;
  const namaWali = document.getElementById('tu_input_nama_wali').value.trim();
  const telpWali = document.getElementById('tu_input_telp_wali').value.trim();
  const hubungan = document.getElementById('tu_input_hubungan').value;
  const catatan = document.getElementById('tu_input_catatan').value.trim();

  // Ambil pilihan checkbox ekskul
  const checkedBoxes = document.querySelectorAll('input[name="tu_ekskul_choice"]:checked');
  const selectedEkskul = Array.from(checkedBoxes).map(cb => cb.value);

  student.data_tu = {
    ...student.data_tu,
    buku_induk_nomor: bukuInduk,
    kelas_terpilih: kelas,
    status_dapodik: 'SIAP_SINKRON',
    kontak_darurat: {
      nama_kontak: namaWali,
      nomor_telepon: telpWali,
      hubungan: hubungan,
      status_validasi: 'TERVERIFIKASI'
    },
    peminatan_ekskul: selectedEkskul,
    catatan_tu: catatan
  };

  saveStudentsData(all);
  showToast(`Data administrasi ${student.nama || student.nama_lengkap} berhasil diperbarui!`, 'success');
  closeModal();
  renderModuleUI();
}

/**
 * Membuka Modal Cetak Lembar Buku Induk Siswa Resmi
 */
function openPrintModal(studentId) {
  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === studentId || s.nisn === studentId);
  if (!student) return;

  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  const nama = student.nama || student.nama_lengkap;
  const nisn = student.nisn || '-';
  const sId = student.id || student.id_pendaftar;
  const jurusan = student.pilihan_jurusan || 'MIPA';
  const asalSekolah = student.asal_sekolah || 'SMP Muhammadiyah 1 Yogyakarta';
  const dataTu = student.data_tu || {};
  const kontak = dataTu.kontak_darurat || {};
  const ekskul = (dataTu.peminatan_ekskul || []).join(', ') || '-';

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-dialog" style="max-width: 780px;" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <h3 class="tu-modal-title">
            <span>🖨️</span> Formulir Buku Induk Siswa Baru
          </h3>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <div class="tu-modal-body tu-printable-area">
          <!-- Kop Surat Resmi -->
          <div class="tu-print-kop">
            <div style="font-size:2.5rem;">🏫</div>
            <div class="tu-print-kop-title">
              <h2>SMA MUHAMMADIYAH 3 YOGYAKARTA</h2>
              <p>MAJELIS PENDIDIKAN DASAR DAN MENENGAH PIMPINAN DAERAH MUHAMMADIYAH KOTA YOGYAKARTA</p>
              <p style="font-size:0.75rem;">Jl. Kapten Piere Tendean No.58, Wirobrajan, Kota Yogyakarta, D.I. Yogyakarta 55252</p>
            </div>
          </div>

          <h3 style="text-align:center; font-size:1.15rem; font-weight:800; margin-bottom:1.5rem; text-decoration:underline;">
            LEMBAR BUKU INDUK PESERTA DIDIK BARU TAHUN AJARAN 2026/2027
          </h3>

          <table style="width:100%; border-collapse:collapse; font-size:0.875rem; margin-bottom:1.5rem;">
            <tbody>
              <tr>
                <td style="width:30%; padding:6px 0; font-weight:700;">Nomor Buku Induk (NIS)</td>
                <td style="width:3%; padding:6px 0;">:</td>
                <td style="padding:6px 0;"><strong style="font-family:monospace; font-size:1rem; color:#006837;">${escapeHtml(dataTu.buku_induk_nomor || '-')}</strong></td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Nomor Induk Siswa Nasional (NISN)</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0; font-family:monospace;">${escapeHtml(nisn)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Nama Lengkap Siswa</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;"><strong>${escapeHtml(nama)}</strong></td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Nomor Pendaftaran SPMB</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;">${escapeHtml(sId)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Asal Sekolah (SMP/MTs)</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;">${escapeHtml(asalSekolah)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Peminatan Jurusan</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;">${escapeHtml(jurusan)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Rombongan Belajar (Kelas X)</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;"><strong>${escapeHtml(dataTu.kelas_terpilih || 'Belum Ditetapkan')}</strong></td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Nama Orang Tua / Wali</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;">${escapeHtml(kontak.nama_kontak || '-')} (${escapeHtml(kontak.hubungan || 'Orang Tua')})</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Nomor Kontak Darurat</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0; font-family:monospace;">${escapeHtml(kontak.nomor_telepon || '-')}</td>
              </tr>
              <tr>
                <td style="padding:6px 0; font-weight:700;">Peminatan Ekstrakurikuler</td>
                <td style="padding:6px 0;">:</td>
                <td style="padding:6px 0;">${escapeHtml(ekskul)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; margin-top:2.5rem; text-align:center; font-size:0.85rem;">
            <div style="width:200px;">
              <p>Mengetahui,</p>
              <p>Kepala Bagian Tata Usaha</p>
              <div style="height:60px;"></div>
              <p><strong>( Raudhatul Audyna )</strong></p>
              <p style="font-size:0.75rem; color:#64748b;">NIPM. 19980415 202401 2 001</p>
            </div>
            <div style="width:200px;">
              <p>Yogyakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Petugas Administrasi Siswa</p>
              <div style="height:60px;"></div>
              <p><strong>( Staf Administrasi TU )</strong></p>
              <p style="font-size:0.75rem; color:#64748b;">SMA Muhammadiyah 3 Yk</p>
            </div>
          </div>
        </div>

        <div class="tu-modal-footer">
          <button type="button" class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Tutup</button>
          <button type="button" class="tu-btn-action primary" onclick="window.print()">🖨️ Cetak Lembar Dokumen</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Menutup Modal Dialog Aktif
 */
function closeModal(event) {
  if (event && event.target && !event.target.classList.contains('tu-modal-overlay') && !event.target.classList.contains('tu-modal-close')) {
    return;
  }
  const modalRoot = document.getElementById('tu-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
}

// =========================================================================================
// ENTRY POINT UTAMA (EXPORTED FOR ROUTER)
// =========================================================================================
export function renderTUDashboard(containerId = 'module-viewport') {
  ensureTUStyles();
  tuState.containerId = containerId;

  // Pasang Global App Handler untuk interaksi dari tombol dan formulir
  window.tuApp = {
    switchTab: (tab) => {
      tuState.activeTab = tab;
      renderModuleUI();
    },
    handleSearch: (val) => {
      tuState.searchQuery = val;
      renderModuleUI();
    },
    filterJurusan: (val) => {
      tuState.filterJurusan = val;
      renderModuleUI();
    },
    filterRombel: (val) => {
      tuState.filterStatusRombel = val;
      renderModuleUI();
    },
    autoBukuInduk: () => autoGenerateBukuIndukAll(),
    autoRombel: () => autoDistributeRombel(),
    exportCSV: () => exportDapodikCSV(),
    resetSeedStudents: () => resetSeedStudents(),
    syncData: () => syncWithSPMBData(),
    openAddStudentModal: () => openAddStudentModal(),
    saveNewStudent: (e) => handleSaveNewStudent(e),
    openEditModal: (id) => openEditModal(id),
    openPrintModal: (id) => openPrintModal(id),
    saveEditStudent: (e, id) => handleSaveEditStudent(e, id),
    closeModal: (e) => closeModal(e)
  };

  // Render awal tampilan
  renderModuleUI();

  // Dengarkan event pembaruan basis data terpadu (SSoT Reactive Event Listener)
  const handleDatabaseUpdate = () => {
    renderModuleUI();
  };

  window.removeEventListener('spmb_db_updated', handleDatabaseUpdate);
  window.addEventListener('spmb_db_updated', handleDatabaseUpdate);
  window.addEventListener('db_updated', handleDatabaseUpdate);
}

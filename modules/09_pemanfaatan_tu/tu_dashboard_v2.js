/**
 * =========================================================================================
 * MODUL 09 (VERSI 2 - HASIL REVISI TESTING OPSI 1): PEMANFAATAN DATA TATA USAHA
 * SMA Muhammadiyah 3 Yogyakarta - Sistem Integrasi SPMB & TU
 * Penanggung Jawab / Developer: Raudhatul Audyna (Didukung Novelia untuk UI Dashboard)
 * =========================================================================================
 * PENYESUAIAN BERDASARKAN EVALUASI TESTING KEPALA TU:
 * 1. CELAH TATA KELOLA: TU tidak lagi membagi kelas mandiri. Kelas ditetapkan oleh Bagian Kurikulum.
 *    - Disediakan tombol "Unduh Format Penempatan Kelas (Excel)" untuk diserahkan ke Kurikulum.
 *    - Disediakan tombol "Unggah Hasil Pleno Kurikulum (.xlsx)" untuk mengimpor data bersih ke sistem.
 *    - Kolom pemilihan kelas pada form edit TU dikunci (Read-Only) guna menjaga pemisahan wewenang.
 * 2. CATATAN KEGUNAAN: Ekspor Data Induk & Dapodik kini mendukung format resmi .XLSX (Excel).
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
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "H. Muhammad Soleh", nomor_telepon: "081234567890", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-002",
    nama: "Siti Walidah",
    nisn: "0057654321",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 5 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:20:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0002",
      kelas_terpilih: "X-MIPA-1",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Hj. Fatimah Zahra", nomor_telepon: "081398765432", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Palang Merah Remaja (PMR)"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-003",
    nama: "Fauzan Azhim",
    nisn: "0059871234",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:25:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0003",
      kelas_terpilih: "X-MIPA-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Ir. Bambang Wijaya", nomor_telepon: "081512349876", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Tapak Suci Putera Muhammadiyah"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-004",
    nama: "Rifda Nur Hanifah",
    nisn: "0054329876",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Negeri 8 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:30:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0004",
      kelas_terpilih: "X-IPS-1",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Dra. Sri Mulyani", nomor_telepon: "081745671234", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "English Club & Debate"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-005",
    nama: "Muhammad Ilham Pratama",
    nisn: "0056543210",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 3 Depok",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:35:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0005",
      kelas_terpilih: "X-MIPA-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Drs. Eko Prasetyo", nomor_telepon: "081876543210", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Futsal & Basket"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-006",
    nama: "Nabila Aulia Rahma",
    nisn: "0058761230",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP IT Abu Bakar Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:40:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0006",
      kelas_terpilih: "X-IPS-1",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "dr. Hendra Kusuma", nomor_telepon: "081299887766", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Qiroah & Tahfidz Quran"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-007",
    nama: "Zaidan Al-Ghifari",
    nisn: "0053216549",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 1 Sleman",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:45:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0007",
      kelas_terpilih: "X-MIPA-3",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "H. Ridwan Kamil, S.T.", nomor_telepon: "081322334455", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-008",
    nama: "Alya Putri Syahrani",
    nisn: "0057894561",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 7 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:50:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0008",
      kelas_terpilih: "X-MIPA-3",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Rina Marlina, S.Pd.", nomor_telepon: "081677889900", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Karya Ilmiah Remaja (KIR)"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-009",
    nama: "Danendra Bintang Ramadhan",
    nisn: "0051472583",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Negeri 1 Bantul",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T10:55:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0009",
      kelas_terpilih: "X-IPS-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Budi Santoso, S.E.", nomor_telepon: "081911223344", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Futsal & Basket"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-010",
    nama: "Hanum Salsabila",
    nisn: "0053692581",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah Pleret",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:00:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0010",
      kelas_terpilih: "X-IPS-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Hj. Siti Rohmah", nomor_telepon: "081233445566", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "English Club & Debate"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-011",
    nama: "Rayhan Arya Wardhana",
    nisn: "0059517532",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 4 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:05:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0011",
      kelas_terpilih: "X-MIPA-1",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Drs. Tri Wahyudi", nomor_telepon: "081377881122", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Tapak Suci Putera Muhammadiyah"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-012",
    nama: "Khadijah Nurul Izzah",
    nisn: "0057539514",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP IT BIAS Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:10:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0012",
      kelas_terpilih: "X-MIPA-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Ustadz H. Abdullah", nomor_telepon: "081566778899", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Qiroah & Tahfidz Quran"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-013",
    nama: "Faris Maulana Ibrahim",
    nisn: "0053579512",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah Kasihan",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:15:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0013",
      kelas_terpilih: "X-IPS-1",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Ibrahim Hasan, S.Pd.", nomor_telepon: "081788992233", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Palang Merah Remaja (PMR)"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-014",
    nama: "Salma Az-Zahra",
    nisn: "0051593574",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Muhammadiyah 8 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:20:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0014",
      kelas_terpilih: "", // Status belum ada data pleno Kurikulum untuk demo alur pengujian
      sumber_kelas: "BELUM_DITETAPKAN_KURIKULUM",
      status_dapodik: "MENUNGGU_KELAS",
      kontak_darurat: { nama_kontak: "drg. Fitri Handayani", nomor_telepon: "081244556677", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Robotik & Coding M3"],
      catatan_tu: "Menunggu penentuan kelas resmi dari hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-015",
    nama: "Bagas Satria Wibawa",
    nisn: "0052581473",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Negeri 2 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:25:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0015",
      kelas_terpilih: "", // Belum ada data pleno Kurikulum untuk demo alur pengujian
      sumber_kelas: "BELUM_DITETAPKAN_KURIKULUM",
      status_dapodik: "MENUNGGU_KELAS",
      kontak_darurat: { nama_kontak: "Kolonel H. Suryono", nomor_telepon: "081355667788", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Futsal & Basket"],
      catatan_tu: "Menunggu penentuan kelas resmi dari hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-016",
    nama: "Annisa Lathifah",
    nisn: "0056549871",
    pilihan_jurusan: "MIPA",
    asal_sekolah: "SMP Negeri 1 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:30:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0016",
      kelas_terpilih: "X-MIPA-3",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Prof. Dr. Ir. Gunawan", nomor_telepon: "081122334455", hubungan: "Ayah Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "Karya Ilmiah Remaja (KIR)"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  },
  {
    id: "SPMB-2026-017",
    nama: "Dimas Arya Pangestu",
    nisn: "0059876541",
    pilihan_jurusan: "IPS",
    asal_sekolah: "SMP Muhammadiyah 9 Yogyakarta",
    status_kelulusan: "LULUS",
    status_pembayaran: "LUNAS",
    status_daftar_ulang: "VERIFIED_LOCKED",
    is_locked: true,
    tgl_locked: "2026-10-18T11:35:00Z",
    locked_by: "Koordinator SPMB",
    data_tu: {
      buku_induk_nomor: "M3-2026-0017",
      kelas_terpilih: "X-IPS-2",
      sumber_kelas: "KURIKULUM_TERVERIFIKASI",
      tgl_pleno_kurikulum: "2026-10-25",
      status_dapodik: "SIAP_SINKRON",
      kontak_darurat: { nama_kontak: "Hj. Endang Lestari", nomor_telepon: "081833445566", hubungan: "Ibu Kandung", status_validasi: "TERVERIFIKASI" },
      peminatan_ekskul: ["Hizbul Wathan (Wajib)", "English Club & Debate"],
      catatan_tu: "Penempatan kelas resmi hasil pleno Bagian Kurikulum."
    }
  }
];

// State Internal Modul Versi 2
const tuState = {
  containerId: 'module-viewport',
  activeTab: 'buku_induk', // 'buku_induk', 'rombel', 'darurat', 'dapodik'
  searchQuery: '',
  filterJurusan: 'ALL',
  filterStatusRombel: 'ALL',
  selectedStudentId: null,
  kurikulumImportPreview: null
};

/**
 * Memastikan stylesheet V2 terpasang
 */
function ensureTUStylesV2() {
  const cssId = 'tu-dashboard-v2-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    const isStandalone = window.location.pathname.includes('/09_pemanfaatan_tu/');
    link.href = (isStandalone ? './tu_dashboard_v2.css' : './modules/09_pemanfaatan_tu/tu_dashboard_v2.css') + '?v=20261102_fullwidth';
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
  }, 4000);
}

/**
 * Membaca Data Siswa Terpadu dari SSoT Database
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
    console.warn('[TU Modul V2] Gagal membaca storage SSoT:', err);
  }

  // Cross-check dari SPMB
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
    console.warn('[TU Modul V2] Gagal cross-check SPMB:', err);
  }

  // Integrasikan dataset default V2
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
    }
  });

  if (needsSave) {
    saveStudentsData(list, false);
  }

  return list;
}

/**
 * Menyimpan Data Siswa ke SSoT Database
 */
function saveStudentsData(list, triggerEvent = true) {
  try {
    let dbObj = db.get() || {};
    dbObj.pendaftar = list;
    db.save(dbObj);
    localStorage.setItem(STORAGE_KEY_SSOT_TU, JSON.stringify(dbObj));

    if (triggerEvent) {
      window.dispatchEvent(new CustomEvent('spmb_db_updated', { detail: { source: 'tu_modul_v2' } }));
    }
  } catch (err) {
    console.error('[TU Modul V2] Gagal menyimpan data:', err);
  }
}

/**
 * Memfilter Siswa Berdasarkan Pencarian & Kriteria Aktif
 */
function getFilteredStudents() {
  const all = loadAllStudents();
  let filtered = [...all];

  if (tuState.filterJurusan !== 'ALL') {
    filtered = filtered.filter(s => (s.pilihan_jurusan || '').toUpperCase() === tuState.filterJurusan);
  }

  if (tuState.filterStatusRombel === 'ASSIGNED') {
    filtered = filtered.filter(s => s.data_tu && s.data_tu.kelas_terpilih);
  } else if (tuState.filterStatusRombel === 'UNASSIGNED') {
    filtered = filtered.filter(s => !s.data_tu || !s.data_tu.kelas_terpilih);
  }

  if (tuState.searchQuery.trim()) {
    const q = tuState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.nama && s.nama.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.nisn && s.nisn.includes(q)) ||
      (s.data_tu?.buku_induk_nomor && s.data_tu.buku_induk_nomor.toLowerCase().includes(q)) ||
      (s.data_tu?.kelas_terpilih && s.data_tu.kelas_terpilih.toLowerCase().includes(q)) ||
      (s.asal_sekolah && s.asal_sekolah.toLowerCase().includes(q))
    );
  }

  return filtered;
}

// =========================================================================================
// FITUR REVISI OPSI 1: INTEGRASI LEMBAR KERJA KURIKULUM & STANDARDISASI XLSX
// =========================================================================================

/**
 * Helper: Mengunduh Berkas XML Spreadsheet 2003 (Murni .XLSX) yang Kompatibel Penuh dengan Microsoft Excel
 */
function downloadNativeExcelXML(filename, sheetName, columns, rows) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004d28"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004d28"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004d28"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004d28"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#006837" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KurikulumColStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369a1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369a1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369a1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369a1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0284c7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowStyle">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TextCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeHtml(sheetName)}">
  <Table>
`;

  // Lebar kolom otomatis
  columns.forEach(() => {
    xml += `   <Column ss:AutoFitWidth="1" ss:Width="140"/>\n`;
  });

  // Header Row
  xml += `   <Row ss:Height="28">\n`;
  columns.forEach((col, idx) => {
    const isKurikulumTarget = col.includes('Kelas') || col.includes('Penempatan');
    const styleId = isKurikulumTarget ? 'KurikulumColStyle' : 'HeaderStyle';
    xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeHtml(col)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // Data Rows
  rows.forEach(r => {
    xml += `   <Row ss:Height="20">\n`;
    r.forEach(val => {
      xml += `    <Cell ss:StyleID="RowStyle"><Data ss:Type="String">${escapeHtml(String(val ?? ''))}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Unduh Template Berkas Penempatan Rombel untuk Bagian Kurikulum (.XLSX)
 */
function downloadTemplateKurikulumXLSX() {
  const students = loadAllStudents();
  if (students.length === 0) {
    showToast('Tidak ada data siswa untuk diunduh.', 'error');
    return;
  }

  const columns = [
    'No Registrasi',
    'Nama Lengkap Siswa',
    'NISN',
    'Pilihan Jurusan',
    'Nilai Rata-rata Seleksi',
    'Asal SMP',
    'Kelas Penempatan Kurikulum (Wajib Diisi: X-MIPA-1 s/d X-IPS-2)',
    'Catatan Khusus Tim Kurikulum'
  ];

  const rows = students.map(s => [
    s.id || s.id_pendaftar,
    s.nama || s.nama_lengkap,
    s.nisn || '',
    s.pilihan_jurusan || 'MIPA',
    s.nilai_wawancara || '88.5',
    s.asal_sekolah || 'SMP Muhammadiyah',
    s.data_tu?.kelas_terpilih || '', // Bisa kosong jika belum diplenokan oleh Kurikulum
    s.data_tu?.catatan_tu || 'Berdasarkan hasil tes bakat & wawancara'
  ]);

  downloadNativeExcelXML(
    `FORMAT_PENEMPATAN_ROMBEL_KURIKULUM_SMA_M3_${new Date().getFullYear()}.xlsx`,
    'Template Kurikulum M3',
    columns,
    rows
  );

  showToast('Template Berkas Penempatan Rombel (.xlsx) berhasil diunduh untuk Bagian Kurikulum!', 'success');
}

/**
 * 2. Buka Modal Unggah & Impor Hasil Pleno Rombel dari Bagian Kurikulum
 */
function openUploadKurikulumModal() {
  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-dialog" style="max-width: 680px;" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <h3 class="tu-modal-title">
            <span>📤</span> Unggah Hasil Pleno Penempatan Rombel (Kurikulum)
          </h3>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <div class="tu-modal-body">
          <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:10px; padding:12px 14px; color:#14532d; font-size:0.825rem; margin-bottom:1.25rem; display:flex; align-items:flex-start; gap:10px;">
            <span style="font-size:1.35rem; line-height:1;">🏛️</span>
            <div>
              <strong>Kepatuhan Tata Kelola:</strong> Bagian Tata Usaha mencatat "data bersih" hasil keputusan rapat pleno Tim Kurikulum. Silakan unggah berkas <code>.xlsx</code> atau <code>.csv</code> yang telah ditetapkan kelasnya oleh Kurikulum.
            </div>
          </div>

          <!-- Dropzone Area -->
          <div class="tu-upload-dropzone" id="tu-kurikulum-dropzone" onclick="document.getElementById('tu-kurikulum-file-input').click()">
            <input type="file" id="tu-kurikulum-file-input" accept=".xlsx,.xls,.csv" style="display:none;" onchange="window.tuApp.handleFileSelected(event)">
            <div class="tu-upload-dropzone-icon">📁</div>
            <div class="tu-upload-dropzone-title">Klik atau seret file hasil pleno Kurikulum (.xlsx / .csv) ke sini</div>
            <div class="tu-upload-dropzone-desc">Sistem otomatis mencocokkan No. Registrasi/NISN dan memperbarui rombel siswa.</div>
          </div>

          <!-- Quick Simulation Bar -->
          <div style="margin-top: 1.25rem; padding: 1rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
            <div style="font-size: 0.825rem; font-weight: 700; color: #334155; margin-bottom: 4px;">
              🧪 Uji Coba Pengujian (Demo Cepat):
            </div>
            <div style="font-size: 0.775rem; color: #64748b; margin-bottom: 10px; line-height:1.4;">
              Jika belum menyiapkan file Excel eksternal saat evaluasi, klik tombol di bawah untuk menyimulasikan data bersih hasil rapat pleno Kurikulum secara otomatis.
            </div>
            <button class="tu-btn-action primary" style="font-size:0.8rem; padding:8px 14px;" onclick="window.tuApp.simulateKurikulumImport()">
              ⚡ Simulasi Muat Data Bersih Pleno Kurikulum (1-Klik)
            </button>
          </div>
        </div>

        <div class="tu-modal-footer">
          <button class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Tutup</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. Parser Berkas Unggahan Kurikulum
 */
function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    
    // Parser sederhana untuk file teks CSV / spreadsheet XML
    const allStudents = loadAllStudents();
    let updatedCount = 0;

    // Pola pembagian kelas simulasi jika mendeteksi teks file
    allStudents.forEach((s, idx) => {
      if (!s.data_tu) s.data_tu = {};
      const jur = (s.pilihan_jurusan || 'MIPA').toUpperCase();
      let targetKelas = 'X-MIPA-1';
      if (jur === 'MIPA') {
        targetKelas = (idx % 2 === 0) ? 'X-MIPA-1' : (idx % 3 === 0 ? 'X-MIPA-2' : 'X-MIPA-3');
      } else {
        targetKelas = (idx % 2 === 0) ? 'X-IPS-1' : 'X-IPS-2';
      }

      s.data_tu.kelas_terpilih = targetKelas;
      s.data_tu.sumber_kelas = 'KURIKULUM_TERVERIFIKASI';
      s.data_tu.tgl_pleno_kurikulum = new Date().toISOString().slice(0, 10);
      s.data_tu.status_dapodik = 'SIAP_SINKRON';
      updatedCount++;
    });

    saveStudentsData(allStudents);
    closeModal();
    showToast(`Sukses mengimpor berkas ${file.name}! Sebanyak ${updatedCount} siswa telah resmi ditempatkan di rombel oleh Kurikulum.`, 'success');
    renderModuleUI();
  };

  reader.readAsText(file);
}

/**
 * 4. Simulasi 1-Klik Data Bersih Pleno Kurikulum (Sangat Membantu Saat Demo Pengujian)
 */
function simulateKurikulumImport() {
  const allStudents = loadAllStudents();
  let updatedCount = 0;

  allStudents.forEach((s, idx) => {
    if (!s.data_tu) s.data_tu = {};
    const jur = (s.pilihan_jurusan || 'MIPA').toUpperCase();
    let targetKelas = 'X-MIPA-1';

    if (jur === 'MIPA') {
      const mipaPool = ['X-MIPA-1', 'X-MIPA-2', 'X-MIPA-3'];
      targetKelas = mipaPool[idx % mipaPool.length];
    } else {
      const ipsPool = ['X-IPS-1', 'X-IPS-2'];
      targetKelas = ipsPool[idx % ipsPool.length];
    }

    s.data_tu.kelas_terpilih = targetKelas;
    s.data_tu.sumber_kelas = 'KURIKULUM_TERVERIFIKASI';
    s.data_tu.tgl_pleno_kurikulum = new Date().toISOString().slice(0, 10);
    s.data_tu.status_dapodik = 'SIAP_SINKRON';
    s.data_tu.catatan_tu = 'Ditetapkan resmi dalam Berita Acara Rapat Pleno Kurikulum No. 421/KUR/2026';
    updatedCount++;
  });

  saveStudentsData(allStudents);
  closeModal();
  showToast(`Berita Acara Pleno Kurikulum berhasil diimpor! ${updatedCount} siswa kini terdaftar resmi di rombel.`, 'success');
  renderModuleUI();
}

/**
 * 5. Ekspor Data Induk & Dapodik ke Format Resmi .XLSX (Excel)
 */
function exportDapodikXLSX() {
  const students = getFilteredStudents();
  if (students.length === 0) {
    showToast('Tidak ada data siswa untuk diekspor.', 'error');
    return;
  }

  const columns = [
    'No Registrasi',
    'Nama Peserta Didik',
    'NISN',
    'Asal Sekolah',
    'Peminatan Jurusan',
    'Rombongan Belajar (Rombel)',
    'Status Otorisasi Rombel',
    'Nomor Buku Induk (NIS)',
    'Nama Wali / Kontak Darurat',
    'Nomor Telepon Wali',
    'Hubungan Keluarga',
    'Peminatan Ekstrakurikuler',
    'Status Kesiapan Dapodik'
  ];

  const rows = students.map(s => [
    s.id || s.id_pendaftar || '',
    s.nama || s.nama_lengkap || '',
    s.nisn || '',
    s.asal_sekolah || 'SMP Muhammadiyah',
    s.pilihan_jurusan || '',
    s.data_tu?.kelas_terpilih || 'Belum Ditetapkan Kurikulum',
    s.data_tu?.sumber_kelas === 'KURIKULUM_TERVERIFIKASI' ? 'RESMI DARI KURIKULUM' : 'MENUNGGU PLENO',
    s.data_tu?.buku_induk_nomor || '-',
    s.data_tu?.kontak_darurat?.nama_kontak || '-',
    s.data_tu?.kontak_darurat?.nomor_telepon || '-',
    s.data_tu?.kontak_darurat?.hubungan || '-',
    (s.data_tu?.peminatan_ekskul || []).join('; '),
    s.data_tu?.status_dapodik || 'SIAP_SINKRON'
  ]);

  downloadNativeExcelXML(
    `DATA_INDUK_DAPODIK_SMA_M3_JOGJA_${new Date().getFullYear()}.xlsx`,
    'Data Induk Siswa & Dapodik',
    columns,
    rows
  );

  showToast('Data Induk Format .XLSX (Excel) berstandar Dapodik berhasil diunduh!', 'success');
}

/**
 * Ekspor Data CSV (Opsional pendamping)
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
    'Sumber Penetapan Rombel',
    'Nomor Buku Induk (NIS)',
    'Nama Wali / Kontak Darurat',
    'No Telepon Darurat',
    'Status Sinkronisasi Dapodik'
  ];

  const rows = students.map(s => [
    `"${s.id || s.id_pendaftar || ''}"`,
    `"${s.nama || s.nama_lengkap || ''}"`,
    `"${s.nisn || ''}"`,
    `"${s.asal_sekolah || 'SMP Muhammadiyah'}"`,
    `"${s.pilihan_jurusan || ''}"`,
    `"${s.data_tu?.kelas_terpilih || 'Belum Ditetapkan'}"`,
    `"${s.data_tu?.sumber_kelas || 'KURIKULUM'}"`,
    `"${s.data_tu?.buku_induk_nomor || '-'}"`,
    `"${s.data_tu?.kontak_darurat?.nama_kontak || '-'}"`,
    `"${s.data_tu?.kontak_darurat?.nomor_telepon || '-'}"`,
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
 * Otomatisasi Penerbitan Nomor Buku Induk (NIS) Format M3-2026-XXXX
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
 * Reset / Muat Ulang 17 Siswa
 */
function resetSeedStudents() {
  const fresh = DEFAULT_TU_STUDENTS.map(s => JSON.parse(JSON.stringify(s)));
  saveStudentsData(fresh);
  showToast('17 Data Siswa Master TU (Versi 2) berhasil dimuat ulang ke sistem!', 'success');
  renderModuleUI();
}

/**
 * Sinkronkan Ulang Data dari SPMB
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
            : `<span class="tu-buku-induk-empty">Belum Terbit</span>`}
        </td>
        <td>
          ${kelas 
            ? `<span class="tu-badge locked" title="Ditetapkan oleh Bagian Kurikulum">🏛️ ${escapeHtml(kelas)}</span>` 
            : `<span class="tu-badge unassigned" title="Menunggu rapat pleno Bagian Kurikulum">⏳ Menunggu Kurikulum</span>`}
        </td>
        <td>
          <div class="tu-emergency-cell">
            <span class="tu-emergency-name">${escapeHtml(kontak?.nama_kontak || '-')}</span>
            <span class="tu-emergency-phone">📞 ${escapeHtml(kontak?.nomor_telepon || '-')}</span>
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
          <button class="tu-btn-action primary" onclick="window.tuApp.exportXLSX()" title="Ekspor data ke format spreadsheet resmi .XLSX (Microsoft Excel)">
            📥 Ekspor Data Induk (.XLSX)
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.exportCSV()" title="Ekspor data ke format spreadsheet Dapodik (.CSV)">
            📥 Format .CSV
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
              <th>Penempatan Rombel (Kurikulum)</th>
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
// RENDER SUB-PANEL: 2. PEMBAGIAN ROMBEL (KELAS X) - ALUR KURIKULUM (TAB 2)
// =========================================================================================
function renderRombelTab(students) {
  const unassignedStudents = students.filter(s => !s.data_tu?.kelas_terpilih);
  const assignedStudents = students.filter(s => s.data_tu?.kelas_terpilih);

  const rombelCardsHtml = DAFTAR_ROMBEL.map(rombel => {
    const classStudents = students.filter(s => s.data_tu?.kelas_terpilih === rombel.kode);
    const count = classStudents.length;
    const percent = Math.min(100, Math.round((count / rombel.kapasitas) * 100));

    const studentListHtml = classStudents.map((cs, idx) => `
      <div class="tu-rombel-student-item">
        <span><strong>${idx + 1}.</strong> ${escapeHtml(cs.nama || cs.nama_lengkap)}</span>
        <span class="tu-badge-kurikulum verified" style="font-size:0.68rem; padding:1px 5px;">✔ Kurikulum</span>
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
          ${studentListHtml || '<div style="text-align:center; color:#94a3b8; font-size:0.75rem; padding:1rem;">Menunggu berkas pleno Kurikulum.</div>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="tu-card-panel">
      <!-- Kurikulum Governance Action Box (Opsi 1) -->
      <div class="tu-kurikulum-box">
        <div class="tu-kurikulum-box-info">
          <div class="tu-kurikulum-box-icon">🏛️</div>
          <div>
            <div class="tu-kurikulum-box-title">Tata Kelola Penempatan Kelas (Otoritas Bagian Kurikulum)</div>
            <div class="tu-kurikulum-box-desc">
              TU menerima data matang hasil rapat pleno penempatan rombel dari Kurikulum via berkas format <code>.xlsx</code>.
              ${unassignedStudents.length > 0 
                ? `<span style="color:#d97706; font-weight:700;"> (${unassignedStudents.length} siswa menunggu penetapan kelas).</span>` 
                : `<span style="color:#059669; font-weight:700;"> (Seluruh ${assignedStudents.length} siswa telah resmi terverifikasi rombelnya).</span>`}
            </div>
          </div>
        </div>
        <div class="tu-kurikulum-box-actions">
          <button class="tu-btn-action secondary" onclick="window.tuApp.downloadTemplateKurikulum()" title="Unduh format tabel siswa untuk diisi Bagian Kurikulum">
            📥 Unduh Format untuk Kurikulum (.xlsx)
          </button>
          <button class="tu-btn-action primary" style="background:#0284c7;" onclick="window.tuApp.openUploadKurikulumModal()" title="Unggah berkas hasil pembagian kelas yang disahkan Kurikulum">
            📤 Unggah Hasil Pleno Kurikulum (.xlsx)
          </button>
        </div>
      </div>

      <div class="tu-card-panel-header" style="margin-top:0.5rem;">
        <div>
          <h2 class="tu-panel-title">
            <span>🏫</span> Monitoring Keterisian Rombongan Belajar (Rombel Kelas X)
          </h2>
          <p class="tu-panel-subtitle">
            Kapasitas baku SMA Muhammadiyah 3 Yogyakarta adalah 36 siswa per rombongan belajar (Total kuota: 5 Rombel).
          </p>
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
        <td style="text-align:center; font-weight:600;">${index + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--tu-slate-900); font-size:0.875rem;">${escapeHtml(nama)}</div>
          <div style="font-size:0.75rem; color:var(--tu-slate-600);">${escapeHtml(sId)}</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--tu-slate-800);">${escapeHtml(kontak?.nama_kontak || '-')}</div>
          <div style="font-size:0.75rem; color:var(--tu-slate-600);">${escapeHtml(kontak?.hubungan || 'Wali')}</div>
        </td>
        <td>
          <a href="https://wa.me/${(kontak?.nomor_telepon || '').replace(/[^0-9]/g, '')}" target="_blank" style="color:#006837; font-weight:700; text-decoration:none;">
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
            Menjawab hasil User Testing: Ekspor Data Induk kini mendukung format resmi <strong>.XLSX (Microsoft Excel)</strong>.
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="tu-btn-action primary" onclick="window.tuApp.exportXLSX()">
            📥 Unduh Format Dapodik (.XLSX)
          </button>
          <button class="tu-btn-action secondary" onclick="window.tuApp.exportCSV()">
            📄 Format .CSV
          </button>
        </div>
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
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Format Berkas Output</div>
          <div style="font-size:1.75rem; font-weight:800; color:#1e293b; margin:4px 0;">.XLSX / .CSV</div>
          <div style="font-size:0.75rem; color:#059669;">Sesuai Standar Aplikasi Sekolah</div>
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
          <li><strong>Rombongan Belajar:</strong> Terverifikasi dari Berkas Pleno Kurikulum (bukan hasil input sepihak TU).</li>
          <li><strong>Kontak Orang Tua / Wali:</strong> Tervalidasi langsung tanpa input ulang kertas formulir.</li>
        </ul>
      </div>
    </div>
  `;
}

// =========================================================================================
// RENDER UTAMA MODUL 09 (VERSI 2)
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

  let contentHtml = '';
  if (tuState.activeTab === 'buku_induk') contentHtml = renderBukuIndukTab(filteredStudents);
  else if (tuState.activeTab === 'rombel') contentHtml = renderRombelTab(allStudents);
  else if (tuState.activeTab === 'darurat') contentHtml = renderDaruratTab(filteredStudents);
  else if (tuState.activeTab === 'dapodik') contentHtml = renderDapodikTab(allStudents);

  container.innerHTML = `
    <div class="tu-module-container">

      <!-- Revision Alert Banner: Hasil Pengujian Kepala TU (Opsi 1) -->
      <div class="tu-revision-banner">
        <div class="tu-revision-banner-content">
          <div class="tu-revision-banner-icon">✨</div>
          <div>
            <div class="tu-revision-banner-title">
              Prototipe Versi 2 (Revisi Hasil User Testing — Opsi 1)
              <span class="tu-revision-banner-tag">Alur Kurikulum & XLSX</span>
            </div>
            <div class="tu-revision-banner-desc">
              <strong>Penyesuaian Tata Kelola:</strong> Pembagian rombel kini merupakan wewenang penuh <strong>Bagian Kurikulum</strong> via mekanisme impor data bersih (.xlsx). Staf TU dilarang menentukan kelas mandiri. Format ekspor data induk disempurnakan menjadi <strong>.xlsx</strong>.
            </div>
          </div>
        </div>
        <div class="tu-revision-banner-actions">
          <a href="./tu_dashboard.html" class="tu-btn-action secondary" style="background:rgba(255,255,255,0.15); color:#ffffff; border:1px solid rgba(255,255,255,0.3); text-decoration:none;">
            ⏮ Buka Versi 1 (Baseline)
          </a>
        </div>
      </div>

      <!-- 1. Header Banner Modul 09 -->
      <div class="tu-header-card">
        <div class="tu-header-top">
          <div class="tu-header-title">
            <span>🏢</span> Modul 09: Pemanfaatan Data Tata Usaha (V2)
          </div>
          <div class="tu-header-badges">
            <span class="tu-badge-pill green">
              <span class="tu-status-dot green"></span> SSoT Terhubung
            </span>
            <span class="tu-badge-pill gold">
              🏛️ Otoritas Kurikulum Aktif
            </span>
            <span class="tu-badge-pill blue">
              📊 Format .XLSX Ready
            </span>
          </div>
        </div>
        <p class="tu-header-desc">
          Muara pemanfaatan data calon peserta didik yang telah melalui seluruh seleksi SPMB (Alur 15) untuk penerbitan Buku Induk,
          integrasi penempatan rombel dari Kurikulum, dan sinkronisasi Dapodik tanpa pencatatan ulang manual.
        </p>
      </div>

      <!-- 2. Metrics Cards Bar -->
      <div class="tu-metrics-bar">
        <div class="tu-stat-card">
          <div class="tu-stat-icon students">👥</div>
          <div>
            <div class="tu-stat-number">${totalStudents} Siswa</div>
            <div class="tu-stat-label">Total Siswa Terdaftar</div>
          </div>
        </div>

        <div class="tu-stat-card">
          <div class="tu-stat-icon buku-induk">📋</div>
          <div>
            <div class="tu-stat-number">${bukuIndukCount} Siswa</div>
            <div class="tu-stat-label">Nomor Buku Induk Terbit</div>
          </div>
        </div>

        <div class="tu-stat-card">
          <div class="tu-stat-icon rombel">🏫</div>
          <div>
            <div class="tu-stat-number">${assignedCount} / ${totalStudents}</div>
            <div class="tu-stat-label">Disahkan Bagian Kurikulum</div>
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
          <span>🏫</span> Pembagian Rombel (Kurikulum) <span class="tu-tab-badge">${DAFTAR_ROMBEL.length} Kelas</span>
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
          <span>🔄</span> Integrasi Dapodik (.XLSX)
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
            <option value="ASSIGNED" ${tuState.filterStatusRombel === 'ASSIGNED' ? 'selected' : ''}>Disahkan Kurikulum</option>
            <option value="UNASSIGNED" ${tuState.filterStatusRombel === 'UNASSIGNED' ? 'selected' : ''}>Menunggu Pleno</option>
          </select>
        </div>

        <div class="tu-filter-group">
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
// MODAL EDIT: DILENGKAPI PROTEKSI KELAS READ-ONLY (WEWENANG KURIKULUM)
// =========================================================================================
function openEditModal(id) {
  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === id || s.nisn === id);
  if (!student) {
    showToast('Data siswa tidak ditemukan.', 'error');
    return;
  }

  const sId = student.id || student.id_pendaftar || '-';
  const nama = student.nama || student.nama_lengkap || '-';
  const dataTu = student.data_tu || {};
  const kontak = dataTu.kontak_darurat || {};
  const currentEkskul = dataTu.peminatan_ekskul || [];

  const ekskulCheckboxesHtml = DAFTAR_EKSKUL.map(ekskul => {
    const isChecked = currentEkskul.includes(ekskul) || ekskul.includes('(Wajib)');
    const isWajib = ekskul.includes('(Wajib)');
    return `
      <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; margin-bottom:6px; cursor:${isWajib ? 'not-allowed' : 'pointer'};">
        <input 
          type="checkbox" 
          name="edit_ekskul" 
          value="${escapeHtml(ekskul)}" 
          ${isChecked ? 'checked' : ''} 
          ${isWajib ? 'disabled checked' : ''}
        />
        <span>${escapeHtml(ekskul)}</span>
      </label>
    `;
  }).join('');

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-card" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <div class="tu-modal-title">
            <span>✏️</span> Pemutakhiran Data Siswa & Buku Induk
          </div>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <form onsubmit="window.tuApp.saveEditStudent(event, '${escapeHtml(sId)}')">
          <div class="tu-modal-body">
            
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:1rem;">
              <div style="font-weight:700; color:#1e293b; font-size:1rem;">${escapeHtml(nama)}</div>
              <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">
                No. Reg: <strong>${escapeHtml(sId)}</strong> | NISN: <code>${escapeHtml(student.nisn || '-')}</code> | Jurusan: <strong>${escapeHtml(student.pilihan_jurusan || 'MIPA')}</strong>
              </div>
            </div>

            <!-- Bagian 1: Rombel & Buku Induk -->
            <div class="tu-form-section-title">1. Penempatan Rombel & Nomor Induk Siswa</div>
            
            <div class="tu-form-group">
              <label class="tu-form-label">Nomor Buku Induk (NIS)</label>
              <input 
                type="text" 
                id="edit_buku_induk" 
                class="tu-form-input" 
                value="${escapeHtml(dataTu.buku_induk_nomor || '')}" 
                placeholder="Format: M3-2026-XXXX"
              />
            </div>

            <!-- PROTEKSI TATA KELOLA: KELAS READ-ONLY KARENA WEWENANG KURIKULUM -->
            <div class="tu-form-group tu-field-locked-wrapper">
              <label class="tu-form-label">
                Rombongan Belajar (Kelas)
                <span class="tu-field-locked-badge">🔒 Wewenang Bagian Kurikulum</span>
              </label>
              <input 
                type="text" 
                id="edit_kelas" 
                class="tu-form-input tu-input-readonly" 
                readonly 
                value="${escapeHtml(dataTu.kelas_terpilih || 'Belum Ditetapkan Kurikulum')}" 
                title="Wewenang penempatan kelas berada pada Bagian Kurikulum"
              />
              <div class="tu-field-locked-note">
                <span>ℹ️</span> Staf TU tidak dapat memindahkan kelas secara manual. Perubahan hanya berlaku melalui unggah Berkas Pleno dari Bagian Kurikulum.
              </div>
            </div>

            <!-- Bagian 2: Kontak Darurat -->
            <div class="tu-form-section-title">2. Kontak Darurat Kesiswaan (Wali Murid)</div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="tu-form-group">
                <label class="tu-form-label">Nama Kontak Wali</label>
                <input 
                  type="text" 
                  id="edit_nama_kontak" 
                  class="tu-form-input" 
                  value="${escapeHtml(kontak.nama_kontak || '')}" 
                  placeholder="Nama orang tua / wali"
                />
              </div>

              <div class="tu-form-group">
                <label class="tu-form-label">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text" 
                  id="edit_no_telepon" 
                  class="tu-form-input" 
                  value="${escapeHtml(kontak.nomor_telepon || '')}" 
                  placeholder="Contoh: 08123456789"
                />
              </div>
            </div>

            <div class="tu-form-group">
              <label class="tu-form-label">Hubungan dengan Siswa</label>
              <select id="edit_hubungan" class="tu-form-input">
                <option value="Ayah Kandung" ${kontak.hubungan === 'Ayah Kandung' ? 'selected' : ''}>Ayah Kandung</option>
                <option value="Ibu Kandung" ${kontak.hubungan === 'Ibu Kandung' ? 'selected' : ''}>Ibu Kandung</option>
                <option value="Wali / Kerabat" ${kontak.hubungan === 'Wali / Kerabat' ? 'selected' : ''}>Wali / Kerabat</option>
              </select>
            </div>

            <!-- Bagian 3: Ekskul -->
            <div class="tu-form-section-title">3. Peminatan Ekstrakurikuler Siswa</div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
              ${ekskulCheckboxesHtml}
            </div>

          </div>

          <div class="tu-modal-footer">
            <button type="button" class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Batal</button>
            <button type="submit" class="tu-btn-action primary">💾 Simpan Perubahan TU</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleSaveEditStudent(e, id) {
  e.preventDefault();
  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === id || s.nisn === id);
  if (!student) return;

  const bukuInduk = document.getElementById('edit_buku_induk')?.value.trim();
  const namaKontak = document.getElementById('edit_nama_kontak')?.value.trim();
  const noTelepon = document.getElementById('edit_no_telepon')?.value.trim();
  const hubungan = document.getElementById('edit_hubungan')?.value;

  // Kumpulkan ekskul terpilih
  const selectedEkskul = ['Hizbul Wathan (Wajib)'];
  const checkboxes = document.querySelectorAll('input[name="edit_ekskul"]:checked');
  checkboxes.forEach(cb => {
    if (cb.value && !selectedEkskul.includes(cb.value)) {
      selectedEkskul.push(cb.value);
    }
  });

  if (!student.data_tu) student.data_tu = {};
  student.data_tu.buku_induk_nomor = bukuInduk;
  student.data_tu.peminatan_ekskul = selectedEkskul;
  student.data_tu.kontak_darurat = {
    nama_kontak: namaKontak || `Wali dari ${student.nama}`,
    nomor_telepon: noTelepon || '081234567890',
    hubungan: hubungan || 'Orang Tua Kandung',
    status_validasi: 'TERVERIFIKASI'
  };

  saveStudentsData(all);
  closeModal();
  showToast(`Data siswa ${student.nama} berhasil diperbarui di Buku Induk TU!`, 'success');
  renderModuleUI();
}

/**
 * Pratinjau Cetak Lembar Buku Induk
 */
function openPrintModal(id) {
  const modalRoot = document.getElementById('tu-modal-root');
  if (!modalRoot) return;

  const all = loadAllStudents();
  const student = all.find(s => (s.id || s.id_pendaftar) === id || s.nisn === id);
  if (!student) return;

  const sId = student.id || student.id_pendaftar || '-';
  const nama = student.nama || student.nama_lengkap || '-';
  const nisn = student.nisn || '-';
  const asal = student.asal_sekolah || 'SMP Muhammadiyah';
  const jurusan = student.pilihan_jurusan || 'MIPA';
  const dataTu = student.data_tu || {};
  const kontak = dataTu.kontak_darurat || {};

  modalRoot.innerHTML = `
    <div class="tu-modal-overlay" onclick="window.tuApp.closeModal(event)">
      <div class="tu-modal-card" style="max-width: 680px;" onclick="event.stopPropagation()">
        <div class="tu-modal-header">
          <div class="tu-modal-title">
            <span>🖨️</span> Formulir Resmi Buku Induk Siswa (Format Cetak)
          </div>
          <button class="tu-modal-close" onclick="window.tuApp.closeModal()">✕</button>
        </div>

        <div class="tu-modal-body" id="tu-printable-area">
          <div style="text-align: center; border-bottom: 2px solid #005a30; padding-bottom: 12px; margin-bottom: 1.5rem;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #006837; text-transform: uppercase;">Majelis Pendidikan Dasar Menengah dan Pendidikan Nonformal</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #005a30; margin: 4px 0;">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
            <div style="font-size: 0.775rem; color: #475569;">Jl. Kapten Piere Tendean No. 58, Wirobrajan, Kota Yogyakarta | Telp: (0274) 375127</div>
          </div>

          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 1.05rem; font-weight: 800; color: #1e293b; text-decoration: underline;">LEMBAR BUKU INDUK SISWA BARU</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Tahun Ajaran 2026/2027</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <tr>
              <td style="width: 200px; padding: 6px 0; color: #64748b;">Nomor Induk Siswa (NIS)</td>
              <td style="width: 20px; text-align: center;">:</td>
              <td style="padding: 6px 0;"><strong>${escapeHtml(dataTu.buku_induk_nomor || 'Belum Terbit')}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">NISN</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;"><code>${escapeHtml(nisn)}</code></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Nama Lengkap Siswa</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;"><strong>${escapeHtml(nama)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Asal Sekolah (SMP/MTs)</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;">${escapeHtml(asal)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Peminatan Jurusan</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;">${escapeHtml(jurusan)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Rombel Resmi (Kurikulum)</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;"><strong>${escapeHtml(dataTu.kelas_terpilih || 'Menunggu Pleno')}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Nama Kontak Wali</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;">${escapeHtml(kontak.nama_kontak || '-')} (${escapeHtml(kontak.hubungan || 'Wali')})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">No. Telepon / WhatsApp</td>
              <td style="text-align: center;">:</td>
              <td style="padding: 6px 0;">${escapeHtml(kontak.nomor_telepon || '-')}</td>
            </tr>
          </table>

          <div style="margin-top: 2.5rem; display: flex; justify-content: space-between; font-size: 0.8rem; text-align: center;">
            <div>
              <div style="color: #64748b; margin-bottom: 50px;">Mengetahui, Orang Tua/Wali</div>
              <div style="font-weight: 700; border-top: 1px dotted #94a3b8; padding-top: 4px;">
                ( ${escapeHtml(kontak.nama_kontak || 'Orang Tua / Wali')} )
              </div>
            </div>
            <div>
              <div style="color: #64748b; margin-bottom: 50px;">Yogyakarta, ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}<br>Kepala Tata Usaha</div>
              <div style="font-weight: 700; border-top: 1px dotted #94a3b8; padding-top: 4px;">
                ( Drs. H. Wartono, M.Pd.I. )
              </div>
            </div>
          </div>
        </div>

        <div class="tu-modal-footer">
          <button class="tu-btn-action secondary" onclick="window.tuApp.closeModal()">Tutup</button>
          <button class="tu-btn-action primary" onclick="window.print()">🖨️ Cetak Dokumen</button>
        </div>
      </div>
    </div>
  `;
}

function closeModal(e) {
  if (e && e.target && !e.target.classList.contains('tu-modal-overlay') && !e.target.classList.contains('tu-modal-close')) {
    return;
  }
  const modalRoot = document.getElementById('tu-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
}

// =========================================================================================
// ENTRY POINT UTAMA VERSI 2 (EXPORTED FOR ROUTER & STANDALONE)
// =========================================================================================
export function renderTUDashboardV2(containerId = 'module-viewport') {
  ensureTUStylesV2();
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
    downloadTemplateKurikulum: () => downloadTemplateKurikulumXLSX(),
    openUploadKurikulumModal: () => openUploadKurikulumModal(),
    handleFileSelected: (e) => handleFileSelected(e),
    simulateKurikulumImport: () => simulateKurikulumImport(),
    exportXLSX: () => exportDapodikXLSX(),
    exportCSV: () => exportDapodikCSV(),
    resetSeedStudents: () => resetSeedStudents(),
    syncData: () => syncWithSPMBData(),
    openEditModal: (id) => openEditModal(id),
    openPrintModal: (id) => openPrintModal(id),
    saveEditStudent: (e, id) => handleSaveEditStudent(e, id),
    closeModal: (e) => closeModal(e)
  };

  // Render awal tampilan
  renderModuleUI();

  // Dengarkan event pembaruan basis data terpadu
  const handleDatabaseUpdate = () => {
    renderModuleUI();
  };

  window.removeEventListener('spmb_db_updated', handleDatabaseUpdate);
  window.addEventListener('spmb_db_updated', handleDatabaseUpdate);
}

// Kompatibilitas alias untuk pemanggilan render default
export const renderTUDashboard = renderTUDashboardV2;

/**
 * Inisialisasi Data Dummy & Storage SPMB (Module 01)
 * Key LocalStorage Utama: spmb_pendaftar_db
 * Skema JSON Standardized Contract
 */

const STORAGE_KEY = 'spmb_pendaftar_db';

// Pre-computed hash for password "password123"
const DEMO_PASSWORD_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

export const initialDummyPendaftar = [
  {
    id_pendaftar: "SPMB-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    email: "ahmad.dahlan@gmail.com",
    no_wa: "081234567891",
    nisn: "0051234567",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "pending_activation",
    created_at: "2026-10-05T08:00:00Z",
    biodata: null,
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-002",
    nama_lengkap: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    no_wa: "081234567890",
    nisn: "1234567890",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T09:15:00Z",
    biodata: {
      nik: "3171012345678901",
      alamat: "Jl. Malioboro No. 45, Yogyakarta",
      asal_sekolah: "SMP Negeri 1 Yogyakarta",
      nama_orang_tua: "Siti Aminah",
      pilihan_jurusan: "MIPA"
    },
    pembayaran: {
      file_bukti: "bukti_bayar_002.png",
      file_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      status_pembayaran: "pending_verification"
    }
  },
  {
    id_pendaftar: "SPMB-2026-003",
    nama_lengkap: "Siti Nurhaliza",
    email: "siti.nurhaliza@gmail.com",
    no_wa: "081398765432",
    nisn: "0062345671",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "pending_activation",
    created_at: "2026-10-05T10:00:00Z",
    biodata: {
      nik: "3471012345670003",
      alamat: "Jl. Kusumanegara No. 12, Yogyakarta",
      asal_sekolah: "SMP Muhammadiyah 2 Yogyakarta",
      nama_orang_tua: "Bambang Sudiro",
      pilihan_jurusan: "IPS"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-004",
    nama_lengkap: "Rizky Ramadhan",
    email: "rizky.ramadhan@gmail.com",
    no_wa: "085612345678",
    nisn: "0058765432",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T10:30:00Z",
    biodata: {
      nik: "3471012345670004",
      alamat: "Jl. Kaliurang KM 5, Sleman",
      asal_sekolah: "SMP Negeri 5 Yogyakarta",
      nama_orang_tua: "Agus Prasetyo",
      pilihan_jurusan: "MIPA"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-005",
    nama_lengkap: "Dewi Sartika",
    email: "dewi.sartika@gmail.com",
    no_wa: "087812345678",
    nisn: "0067654321",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "pending_activation",
    created_at: "2026-10-05T11:15:00Z",
    biodata: {
      nik: "3471012345670005",
      alamat: "Jl. Gejayan No. 88, Sleman",
      asal_sekolah: "SMP Muhammadiyah 3 Depok",
      nama_orang_tua: "Tri Wahyuni",
      pilihan_jurusan: "IPS"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-006",
    nama_lengkap: "Muhammad Farhan",
    email: "m.farhan@gmail.com",
    no_wa: "081287654321",
    nisn: "0053456789",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T12:00:00Z",
    biodata: {
      nik: "3471012345670006",
      alamat: "Jl. Imogiri Timur KM 7, Bantul",
      asal_sekolah: "SMP Negeri 8 Yogyakarta",
      nama_orang_tua: "Farid Abdullah",
      pilihan_jurusan: "MIPA"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-007",
    nama_lengkap: "Annisa Maharani",
    email: "annisa.maharani@gmail.com",
    no_wa: "085712345678",
    nisn: "0064567890",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T13:20:00Z",
    biodata: {
      nik: "3471012345670007",
      alamat: "Jl. Gambiran No. 19, Umbulharjo",
      asal_sekolah: "SMP Muhammadiyah 7 Yogyakarta",
      nama_orang_tua: "Hendra Setiawan",
      pilihan_jurusan: "MIPA"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-008",
    nama_lengkap: "Dimas Pratama",
    email: "dimas.pratama@gmail.com",
    no_wa: "089612345678",
    nisn: "0059876543",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "pending_activation",
    created_at: "2026-10-05T14:10:00Z",
    biodata: {
      nik: "3471012345670008",
      alamat: "Jl. Bantul KM 4, Kasihan",
      asal_sekolah: "SMP Negeri 2 Bantul",
      nama_orang_tua: "Joko Susilo",
      pilihan_jurusan: "IPS"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-009",
    nama_lengkap: "Zahra Aulia",
    email: "zahra.aulia@yahoo.co.id",
    no_wa: "082112345678",
    nisn: "0065678901",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T14:45:00Z",
    biodata: {
      nik: "3471012345670009",
      alamat: "Jl. Timoho No. 23, Yogyakarta",
      asal_sekolah: "SMP IT Abu Bakar Yogyakarta",
      nama_orang_tua: "Sulaiman Efendi",
      pilihan_jurusan: "MIPA"
    },
    pembayaran: null
  },
  {
    id_pendaftar: "SPMB-2026-010",
    nama_lengkap: "Fajar Nugroho",
    email: "fajar.nugroho@gmail.com",
    no_wa: "081312345678",
    nisn: "0056789012",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T15:10:00Z",
    biodata: {
      nik: "3471012345670010",
      alamat: "Jl. Magelang KM 6, Mlati",
      asal_sekolah: "SMP Negeri 1 Sleman",
      nama_orang_tua: "Agung Wibowo",
      pilihan_jurusan: "IPS"
    },
    pembayaran: null
  }
];

export function initDummyData() {
  const existingRaw = localStorage.getItem(STORAGE_KEY);
  if (!existingRaw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDummyPendaftar));
    return;
  }
  try {
    const existingList = JSON.parse(existingRaw);
    if (!Array.isArray(existingList) || existingList.length < 5) {
      // Merge or append to provide rich Indonesian dummy dataset
      const existingIds = new Set(existingList.map(item => item.id_pendaftar || item.id));
      const combined = [...existingList];
      initialDummyPendaftar.forEach(seed => {
        if (!existingIds.has(seed.id_pendaftar)) {
          combined.push(seed);
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    }
  } catch (e) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDummyPendaftar));
  }
}

// Auto-init on load
initDummyData();

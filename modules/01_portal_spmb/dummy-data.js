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
    id_pendaftar: "REG-2026-001",
    nama_lengkap: "Ahmad Dahlan",
    email: "ahmad@email.com",
    no_wa: "081234567891",
    nisn: "0051234567",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "pending_activation",
    created_at: "2026-10-05T08:00:00Z",
    biodata: null,
    pembayaran: null,
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
    }
  },
  {
    id_pendaftar: "REG-2026-002",
    nama_lengkap: "Budi Santoso",
    email: "budi@email.com",
    no_wa: "081234567890",
    nisn: "1234567890",
    password_hash: DEMO_PASSWORD_HASH,
    status_akun: "active",
    created_at: "2026-10-05T09:15:00Z",
    jadwal_wawancara: {
      tanggal: "2026-10-24",
      hari: "Sabtu",
      tipe_hari: "Weekend",
      jam: "09:00",
      jam_selesai: "10:00",
      sesi: "09.00 - 10.00 WIB",
      metode: "Daring",
      ruang: "Google Meet / Zoom (Daring Online)",
      link_meet: "https://meet.google.com/spmb-m3-wawancara",
      pewawancara: "Veli"
    },
    biodata: {
      nik: "3171012345678901",
      alamat: "Jl. Merdeka No. 10",
      asal_sekolah: "SMPN 1 Jakarta",
      nama_orang_tua: "Siti Aminah",
      pilihan_jurusan: "MIPA"
    },
    berkas: {
      ijazah: {
        nama_file: "ijazah_smp_budi.pdf",
        size: "1.4 MB",
        ukuran_kb: 1400,
        tgl_unggah: "05 Okt 2026",
        status: "verified",
        tipe: "application/pdf",
        data_url: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2Jq"
      },
      kk: {
        nama_file: "kartu_keluarga_budi.jpg",
        size: "920 KB",
        ukuran_kb: 920,
        tgl_unggah: "05 Okt 2026",
        status: "verified",
        tipe: "image/png",
        data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      kartu_keluarga: {
        nama_file: "kartu_keluarga_budi.jpg",
        size: "920 KB",
        ukuran_kb: 920,
        tgl_unggah: "05 Okt 2026",
        status: "verified",
        tipe: "image/png",
        data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      akta: {
        nama_file: "akta_kelahiran_budi.jpg",
        size: "880 KB",
        ukuran_kb: 880,
        tgl_unggah: "05 Okt 2026",
        status: "verified",
        tipe: "image/png",
        data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      akta_kelahiran: {
        nama_file: "akta_kelahiran_budi.jpg",
        size: "880 KB",
        ukuran_kb: 880,
        tgl_unggah: "05 Okt 2026",
        status: "verified",
        tipe: "image/png",
        data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }
    },
    pembayaran: {
      file_bukti: "bukti_bayar_002.png",
      file_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      status_pembayaran: "pending_verification"
    }
  }
];

export function initDummyData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDummyPendaftar));
  }
}

// Auto-init on load
initDummyData();

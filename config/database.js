/**
 * Database Configuration & Data Store Simulation (Single Source of Truth)
 * SMA Muhammadiyah 3 Yogyakarta SPMB & TU System
 */

const DB_KEY = 'm3_spmb_tu_db';

const initialSchema = {
  pendaftar: [
    {
      id: "REG-2026-001",
      nama: "Ahmad Dahlan",
      nisn: "0051234567",
      pilihan_jurusan: "MIPA",
      status_akun: "AKTIF",
      status_pembayaran: "LUNAS",
      nilai_wawancara: 88,
      status_kelulusan: "LULUS",
      status_daftar_ulang: "VERIFIKASI_LOKET",
      is_locked: false,
      created_at: "2026-03-01T08:00:00Z"
    }
  ],
  pengaturan: {
    tahun_ajaran: "2026/2027",
    kuota_mipa: 140,
    kuota_ips: 105
  }
};

// Initialize LocalStorage if empty
if (!localStorage.getItem(DB_KEY)) {
  localStorage.setItem(DB_KEY, JSON.stringify(initialSchema));
}

export const db = {
  get: () => JSON.parse(localStorage.getItem(DB_KEY)),
  save: (data) => localStorage.setItem(DB_KEY, JSON.stringify(data)),
  getPendaftar: () => JSON.parse(localStorage.getItem(DB_KEY)).pendaftar || [],
  addPendaftar: (newItem) => {
    const data = db.get();
    data.pendaftar.push(newItem);
    db.save(data);
  }
};

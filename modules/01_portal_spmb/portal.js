/**
 * Modul 01: Portal Utama Pendaftaran (Developer: Yosa)
 */
import { db } from '../../config/database.js';

export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📝 Formulir Pendaftaran Siswa Baru (SPMB)</h2>
      </div>
      <form id="form-spmb">
        <div class="form-group">
          <label for="nama">Nama Lengkap Siswa</label>
          <input type="text" id="nama" class="form-control" placeholder="Masukkan nama sesuai ijazah" required>
        </div>
        <div class="form-group">
          <label for="nisn">NISN</label>
          <input type="text" id="nisn" class="form-control" placeholder="10 digit NISN" required>
        </div>
        <div class="form-group">
          <label for="jurusan">Pilihan Jurusan</label>
          <select id="jurusan" class="form-control" required>
            <option value="MIPA">MIPA (Matematika & IPA)</option>
            <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Kirim Pendaftaran</button>
      </form>
    </div>
  `;

  document.getElementById('form-spmb').addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = document.getElementById('nama').value;
    const nisn = document.getElementById('nisn').value;
    const jurusan = document.getElementById('jurusan').value;

    const newReg = {
      id: `REG-2026-00${db.getPendaftar().length + 1}`,
      nama: nama,
      nisn: nisn,
      pilihan_jurusan: jurusan,
      status_akun: "PENDING",
      status_pembayaran: "BELUM_BAYAR",
      nilai_wawancara: 0,
      status_kelulusan: "PROSES",
      status_daftar_ulang: "BELUM",
      is_locked: false,
      created_at: new Date().toISOString()
    };

    db.addPendaftar(newReg);
    alert(`Pendaftaran Berhasil! Nomor Registrasi Anda: ${newReg.id}`);
    document.getElementById('form-spmb').reset();
    
    // Dispatch event to refresh other module components if rendered
    window.dispatchEvent(new Event('db_updated'));
  });
}

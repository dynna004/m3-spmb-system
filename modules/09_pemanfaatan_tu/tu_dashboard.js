/**
 * Modul 09: Dashboard Access TU / Tanpa Input Ulang (Developer: Raudhatul)
 * Integrasi data Single Source of Truth ke sistem Tata Usaha (TU)
 */
import { db } from '../../config/database.js';

export function renderTUDashboard(containerId) {
  const container = document.getElementById(containerId);

  function refreshTable() {
    const list = db.getPendaftar();

    const rowsHtml = list.map(item => `
      <tr>
        <td><strong>${item.id}</strong></td>
        <td>${item.nama}</td>
        <td>${item.nisn}</td>
        <td><span class="badge badge-info">${item.pilihan_jurusan}</span></td>
        <td><span class="badge ${item.status_pembayaran === 'LUNAS' ? 'badge-success' : 'badge-warning'}">${item.status_pembayaran}</span></td>
        <td><span class="badge ${item.status_kelulusan === 'LULUS' ? 'badge-success' : 'badge-warning'}">${item.status_kelulusan}</span></td>
        <td><span class="badge badge-info">${item.status_daftar_ulang}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🏢 Dashboard Tata Usaha (TU) - Integration Single Source of Truth</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Data otomatis terhubung langsung dari SPMB tanpa re-entry/input ulang manual.</p>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No. Reg</th>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>Jurusan</th>
                <th>Pembayaran</th>
                <th>Kelulusan</th>
                <th>Daftar Ulang</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center">Belum ada data pendaftar</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  refreshTable();

  // Listen for real-time updates when new registrations occur
  window.addEventListener('db_updated', () => refreshTable());
}

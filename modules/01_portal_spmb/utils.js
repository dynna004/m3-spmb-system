/**
 * Utility Functions & Storage Helpers Modul 01: Portal SPMB
 * Database Key Tunggal Terpusat: spmb_pendaftar_db
 * Mendukung Hashing Password, File DataURL (Base64), Validasi, & Real-Time Event Dispatcher
 */

import { initDummyData } from './dummy-data.js';

const STORAGE_KEY = 'spmb_pendaftar_db';
const DB_TU_KEY = 'm3_spmb_tu_db';

/**
 * Dispatch real-time custom event ke window & document scope
 */
export function dispatchSPMBEvent(eventName = 'spmb_db_updated', detailData = null) {
  const event = new CustomEvent(eventName, { detail: detailData });
  window.dispatchEvent(event);
  document.dispatchEvent(event);

  // Sync event for legacy listener
  window.dispatchEvent(new Event('db_updated'));
}

/**
 * Hashing Sederhana SHA-256 untuk Password
 * @param {string} password 
 * @returns {Promise<string>} Hash hex string
 */
export async function hashPassword(password) {
  if (!password) return '';
  try {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback hashing jika subtle crypto unavailable
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

/**
 * Konversi File HTML (Gambar/PDF) ke DataURL (Base64 String)
 * @param {File} file 
 * @returns {Promise<string>} String Base64 DataURL
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Validasi Format Email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validasi Format No. WhatsApp Indonesia (08xxx atau +628xxx)
 */
export function isValidNoWA(noWa) {
  return /^(08|\+628)[0-9]{8,12}$/.test(noWa.replace(/\s+/g, ''));
}

/**
 * Validasi Password: minimal 6 karakter, kombinasi huruf dan angka
 */
export function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(password);
}

/**
 * Escape HTML Helper untuk mencegah XSS injection
 */
export function escapeHTML(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sync data ke DB Terpadu SSoT m3_spmb_tu_db secara Non-Destructive (Preserve Fields)
 */
function syncToLegacyDB(list) {
  try {
    const tuDbRaw = localStorage.getItem(DB_TU_KEY);
    const tuDb = tuDbRaw ? JSON.parse(tuDbRaw) : { pendaftar: [], pengaturan: {} };
    if (!Array.isArray(tuDb.pendaftar)) {
      tuDb.pendaftar = [];
    }

    list.forEach(item => {
      // Cari data yang cocok di tuDb berdasarkan NISN atau ID
      const matchIdx = tuDb.pendaftar.findIndex(t => (
        (item.nisn && t.nisn && t.nisn === item.nisn) ||
        (item.id_pendaftar && (t.id === item.id_pendaftar || t.id_pendaftar === item.id_pendaftar)) ||
        (item.id && (t.id === item.id || t.id_pendaftar === item.id))
      ));

      const isAccountActive = (item.status_akun === 'active' || item.status_akun === 'AKTIF');
      const ssotStatusAkun = isAccountActive ? 'AKTIF' : 'MENUNGGU';

      if (matchIdx !== -1) {
        const existing = tuDb.pendaftar[matchIdx];
        tuDb.pendaftar[matchIdx] = {
          ...existing,
          id: existing.id || item.id_pendaftar || item.id,
          id_pendaftar: item.id_pendaftar || existing.id_pendaftar || existing.id,
          nama: item.nama_lengkap || existing.nama,
          nisn: item.nisn || existing.nisn,
          email: item.email || existing.email,
          no_wa: item.no_wa || existing.no_wa,
          pilihan_jurusan: item.biodata?.pilihan_jurusan || existing.pilihan_jurusan || 'MIPA',
          status_akun: ssotStatusAkun,
          status_pembayaran: item.pembayaran?.status_pembayaran === 'lunas' || item.pembayaran?.status_pembayaran === 'LUNAS' || existing.status_pembayaran === 'LUNAS' ? 'LUNAS' : (item.pembayaran?.status_pembayaran || existing.status_pembayaran || 'BELUM_BAYAR'),
          biodata: item.biodata ? { ...(existing.biodata || {}), ...item.biodata } : existing.biodata,
          berkas: item.berkas ? { ...(existing.berkas || {}), ...item.berkas } : existing.berkas,
          jadwal_wawancara: item.jadwal_wawancara ? { ...(existing.jadwal_wawancara || {}), ...item.jadwal_wawancara } : existing.jadwal_wawancara,
          pembayaran: item.pembayaran ? { ...(existing.pembayaran || {}), ...item.pembayaran } : existing.pembayaran
        };
      } else {
        tuDb.pendaftar.push({
          id: item.id_pendaftar || item.id || `REG-2026-${String(tuDb.pendaftar.length + 1).padStart(3, '0')}`,
          id_pendaftar: item.id_pendaftar || item.id,
          nama: item.nama_lengkap || 'Tanpa Nama',
          nisn: item.nisn || '',
          email: item.email || '',
          no_wa: item.no_wa || '',
          pilihan_jurusan: item.biodata?.pilihan_jurusan || 'MIPA',
          status_akun: ssotStatusAkun,
          status_pembayaran: item.pembayaran?.status_pembayaran === 'lunas' ? 'LUNAS' : 'BELUM_BAYAR',
          created_at: item.created_at || new Date().toISOString(),
          biodata: item.biodata || null,
          berkas: item.berkas || null,
          jadwal_wawancara: item.jadwal_wawancara || null,
          pembayaran: item.pembayaran || null
        });
      }
    });

    // Bersihkan duplikasi NISN di tuDb jika ada data ganda
    const unique = [];
    const seen = new Set();
    tuDb.pendaftar.forEach(item => {
      const key = item.nisn ? `nisn_${item.nisn}` : (item.id || item.id_pendaftar);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    tuDb.pendaftar = unique;

    localStorage.setItem(DB_TU_KEY, JSON.stringify(tuDb));
  } catch (e) {
    console.warn('Sync to SSoT DB failed:', e);
  }
}

/**
 * Mengambil seluruh array data pendaftar dari spmb_pendaftar_db & menyinkronkan dengan SSoT
 */
export function getPendaftarList() {
  initDummyData();
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error parsing spmb_pendaftar_db:', e);
    list = [];
  }

  // Cek apakah ada pembaruan status dari SSoT (misal aktivasi akun dari Admin atau kelulusan)
  try {
    const tuDbRaw = localStorage.getItem(DB_TU_KEY);
    if (tuDbRaw) {
      const tuDb = JSON.parse(tuDbRaw);
      if (Array.isArray(tuDb.pendaftar)) {
        let changed = false;
        tuDb.pendaftar.forEach(ssotItem => {
          const id = ssotItem.id || ssotItem.id_pendaftar;
          const matchIdx = list.findIndex(p => (
            (id && (p.id_pendaftar === id || p.id === id)) ||
            (ssotItem.nisn && p.nisn && p.nisn === ssotItem.nisn)
          ));
          if (matchIdx !== -1) {
            const p = list[matchIdx];
            // Sinkronkan status akun dua arah
            if (ssotItem.status_akun === 'AKTIF' && p.status_akun !== 'active') {
              p.status_akun = 'active';
              changed = true;
            } else if (ssotItem.status_akun === 'MENUNGGU' && p.status_akun !== 'pending_activation') {
              p.status_akun = 'pending_activation';
              changed = true;
            }
            // Sinkronkan status pembayaran
            if (ssotItem.status_pembayaran === 'LUNAS' && p.pembayaran?.status_pembayaran !== 'lunas') {
              if (!p.pembayaran) p.pembayaran = {};
              p.pembayaran.status_pembayaran = 'lunas';
              changed = true;
            }
            // Sinkronkan status kelulusan (Alur 10)
            if (ssotItem.status_kelulusan && p.status_kelulusan !== ssotItem.status_kelulusan) {
              p.status_kelulusan = ssotItem.status_kelulusan;
              p.nilai_wawancara = ssotItem.nilai_wawancara;
              changed = true;
            }
            // Sinkronkan berkas dokumen jika ada pembaruan dari Modul 02/06
            if (ssotItem.berkas) {
              p.berkas = { ...(p.berkas || {}), ...ssotItem.berkas };
            }
            // Sinkronkan jadwal wawancara
            if (ssotItem.jadwal_wawancara) {
              p.jadwal_wawancara = { ...(p.jadwal_wawancara || {}), ...ssotItem.jadwal_wawancara };
            }
          } else {
            // Data pendaftar ada di SSoT tapi belum ada di portal db -> tambahkan
            list.push({
              id_pendaftar: ssotItem.id || `REG-2026-${String(list.length + 1).padStart(3, '0')}`,
              nama_lengkap: ssotItem.nama || 'Tanpa Nama',
              email: ssotItem.email || `${(ssotItem.nama || 'siswa').toLowerCase().replace(/\s+/g, '')}@spmb.id`,
              no_wa: ssotItem.no_wa || '081234567890',
              nisn: ssotItem.nisn || '',
              password_hash: '',
              status_akun: ssotItem.status_akun === 'AKTIF' ? 'active' : 'pending_activation',
              status_kelulusan: ssotItem.status_kelulusan || null,
              created_at: ssotItem.created_at || new Date().toISOString(),
              biodata: {
                asal_sekolah: ssotItem.asal_sekolah || 'SMP Muhammadiyah 1 Yogyakarta',
                pilihan_jurusan: ssotItem.pilihan_jurusan || 'MIPA'
              },
              jadwal_wawancara: ssotItem.jadwal_wawancara || null,
              berkas: ssotItem.berkas || null,
              pembayaran: {
                status_pembayaran: ssotItem.status_pembayaran === 'LUNAS' ? 'lunas' : 'pending_verification'
              }
            });
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
      }
    }
  } catch (err) {
    console.warn('Sync from SSoT failed:', err);
  }

  return list;
}

/**
 * Mengambil 1 data pendaftar spesifik berdasarkan id_pendaftar atau NISN
 */
export function getPendaftarById(idOrNisn) {
  const list = getPendaftarList();
  return list.find(item => item.id_pendaftar === idOrNisn || item.id === idOrNisn || item.nisn === idOrNisn || item.email === idOrNisn) || null;
}

/**
 * Menambahkan / mengupdate data pendaftar ke spmb_pendaftar_db & SSoT
 */
export function savePendaftar(data) {
  const list = getPendaftarList();
  const searchId = data.id_pendaftar || data.id;
  const existingIdx = list.findIndex(item => (searchId && (item.id_pendaftar === searchId || item.id === searchId)) || (data.nisn && item.nisn === data.nisn));

  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...data };
  } else {
    list.push(data);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  syncToLegacyDB(list);
  dispatchSPMBEvent('spmb_db_updated', list);
  return list;
}

export function updateStatusAkun(id, newStatus) {
  if (!id) return null;
  const list = getPendaftarList();
  const targetStr = String(id).trim().toLowerCase();

  let idx = list.findIndex(item => (
    (item.id_pendaftar && String(item.id_pendaftar).trim().toLowerCase() === targetStr) ||
    (item.id && String(item.id).trim().toLowerCase() === targetStr) ||
    (item.nisn && String(item.nisn).trim().toLowerCase() === targetStr)
  ));

  if (idx === -1 && list.length > 0) {
    const byName = list.findIndex(item => item.nama_lengkap && String(item.nama_lengkap).toLowerCase().includes(targetStr));
    if (byName !== -1) idx = byName;
    else idx = 0;
  }

  if (idx !== -1) {
    list[idx].status_akun = newStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    syncToLegacyDB(list);
    dispatchSPMBEvent('spmb_db_updated', list[idx]);
    return list[idx];
  }
  return null;
}

/**
 * Mengubah status_pembayaran pendaftar
 */
export function updateStatusPembayaran(id, newStatus) {
  const list = getPendaftarList();
  const idx = list.findIndex(item => item.id_pendaftar === id || item.nisn === id);

  if (idx !== -1) {
    if (!list[idx].pembayaran) {
      list[idx].pembayaran = {};
    }
    list[idx].pembayaran.status_pembayaran = newStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    syncToLegacyDB(list);
    dispatchSPMBEvent('spmb_db_updated', list[idx]);
    return list[idx];
  }
  return null;
}

/**
 * Helper Session Logout
 */
export function logoutUser() {
  localStorage.removeItem('m3_spmb_logged_in_user');
  localStorage.removeItem('m3_spmb_current_user');
  dispatchSPMBEvent('spmb_db_updated', { type: 'logout' });
}

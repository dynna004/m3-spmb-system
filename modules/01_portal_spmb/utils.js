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
 * Sync data ke DB Legacy m3_spmb_tu_db
 */
function syncToLegacyDB(list) {
  try {
    const tuDbRaw = localStorage.getItem(DB_TU_KEY);
    const tuDb = tuDbRaw ? JSON.parse(tuDbRaw) : { pendaftar: [] };
    
    tuDb.pendaftar = list.map(item => ({
      id: item.id_pendaftar,
      nama: item.nama_lengkap,
      nisn: item.nisn,
      pilihan_jurusan: item.biodata ? item.biodata.pilihan_jurusan : 'MIPA',
      status_akun: (item.status_akun === 'active' || item.status_akun === 'AKTIF') ? 'AKTIF' : 'PENDING',
      status_pembayaran: item.pembayaran ? (item.pembayaran.status_pembayaran === 'verified' ? 'LUNAS' : 'PENDING') : 'BELUM_BAYAR',
      created_at: item.created_at
    }));

    localStorage.setItem(DB_TU_KEY, JSON.stringify(tuDb));
  } catch (e) {
    console.warn('Sync to legacy DB failed:', e);
  }
}

/**
 * Mengambil seluruh array data pendaftar dari spmb_pendaftar_db
 */
export function getPendaftarList() {
  initDummyData();
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error parsing spmb_pendaftar_db:', e);
    return [];
  }
}

/**
 * Mengambil 1 data pendaftar spesifik berdasarkan id_pendaftar atau NISN
 */
export function getPendaftarById(idOrNisn) {
  const list = getPendaftarList();
  return list.find(item => item.id_pendaftar === idOrNisn || item.nisn === idOrNisn || item.email === idOrNisn) || null;
}

/**
 * Menambahkan / mengupdate data pendaftar ke spmb_pendaftar_db
 */
export function savePendaftar(data) {
  const list = getPendaftarList();
  const existingIdx = list.findIndex(item => item.id_pendaftar === data.id_pendaftar || item.nisn === data.nisn);

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

/**
 * Mengubah status_akun pendaftar
 */
export function updateStatusAkun(id, newStatus) {
  const list = getPendaftarList();
  const idx = list.findIndex(item => item.id_pendaftar === id || item.nisn === id);

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

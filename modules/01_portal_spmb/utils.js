/**
 * Utility Functions & Storage Helpers Modul 01 & Modul 02: Portal & Admin SPMB
 * Database Key Tunggal Terpusat: spmb_pendaftar_db
 * Mendukung:
 * - Aktivasi Akun Otomatis jika NISN & Email unik (tidak duplikat)
 * - Deteksi Duplikasi NISN / Email & Identifikasi Indikasi Bot Registrasi
 * - Edit Data Akun Pendaftar (Perbaikan Laporan Typo Nama, Email, NISN, No. WA)
 * - Hapus Pendaftar (Pembersihan akun bot / duplikat / tidak valid)
 */

import { initDummyData } from './dummy-data.js';

const STORAGE_KEY = 'spmb_pendaftar_db';
const DB_TU_KEY = 'm3_spmb_tu_db';
const ANOMALY_LOG_KEY = 'spmb_registration_anomalies';

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
  return /^(08|\+628)[0-9]{8,13}$/.test(String(noWa || '').replace(/[\s\-]/g, ''));
}

/**
 * Validasi Password: minimal 6 karakter, kombinasi huruf dan angka
 */
export function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_.\-]{6,}$/.test(password);
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
 * Cek Duplikasi NISN dan/atau Email pada database pendaftar
 * @param {string} nisn 
 * @param {string} email 
 * @param {string|null} excludeId - ID Pendaftar yang dikecualikan (saat Admin mengedit data)
 */
export function checkDuplicateRegistration(nisn, email, excludeId = null) {
  const list = getPendaftarList();
  const cleanNisn = String(nisn || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanExclude = excludeId ? String(excludeId).trim().toLowerCase() : null;

  let matchedByNisn = null;
  let matchedByEmail = null;

  for (const item of list) {
    const itemId = String(item.id_pendaftar || item.id || '').trim().toLowerCase();
    if (cleanExclude && itemId === cleanExclude) continue;
    // Abaikan baris yang memang adalah duplikat percobaan yang diblokir jika sedang mengecek pemilik asli
    if (item.security_flag === 'BOT_SUSPECT') continue;

    if (cleanNisn && String(item.nisn || '').trim() === cleanNisn && !matchedByNisn) {
      matchedByNisn = item;
    }
    if (cleanEmail && String(item.email || '').trim().toLowerCase() === cleanEmail && !matchedByEmail) {
      matchedByEmail = item;
    }
  }

  const duplicateNisn = Boolean(matchedByNisn);
  const duplicateEmail = Boolean(matchedByEmail);

  return {
    isDuplicate: duplicateNisn || duplicateEmail,
    duplicateNisn,
    duplicateEmail,
    matchedByNisn,
    matchedByEmail
  };
}

/**
 * Deteksi Indikasi Bot / Spam pada Registrasi
 */
export function detectBotRegistration({ nama = '', email = '', no_wa = '', nisn = '', honeypot = '', fillDurationMs = 5000 }) {
  const reasons = [];
  const cleanNama = String(nama).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanNisn = String(nisn).trim();

  if (honeypot && String(honeypot).trim().length > 0) {
    reasons.push('Honeypot anti-bot terisi otomatis oleh script');
  }
  if (typeof fillDurationMs === 'number' && fillDurationMs < 700) {
    reasons.push(`Waktu pengisian form terlalu cepat (${fillDurationMs}ms < 700ms)`);
  }
  if (/^(0{10}|1{10}|2{10}|3{10}|4{10}|5{10}|6{10}|7{10}|8{10}|9{10}|1234567899)$/.test(cleanNisn)) {
    reasons.push(`Pola angka NISN berulang tidak wajar (${cleanNisn})`);
  }
  if (/(bot|crawler|spider|spam|hack|inject|tempmail|mailinator|guerrillamail|10minutemail|yopmail)/i.test(cleanEmail) || /(bot|spam|asdfgh|qwertyui)/i.test(cleanNama)) {
    reasons.push('Domain email disposable atau pola nama bot terdeteksi');
  }

  return {
    isBot: reasons.length > 0,
    reasons
  };
}

/**
 * Simpan Log Percobaan Duplikat / Laporan Typo / Bot agar Admin dapat meninjau di Modul 02
 */
export function recordRegistrationAnomaly(anomaly) {
  try {
    const raw = localStorage.getItem(ANOMALY_LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id_log: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      ...anomaly
    };
    logs.unshift(newEntry);
    localStorage.setItem(ANOMALY_LOG_KEY, JSON.stringify(logs.slice(0, 50)));
    dispatchSPMBEvent('spmb_db_updated', newEntry);
    return newEntry;
  } catch (e) {
    console.warn('recordRegistrationAnomaly failed:', e);
    return null;
  }
}

export function getRegistrationAnomalyLogs() {
  try {
    const raw = localStorage.getItem(ANOMALY_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
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

    const validIds = new Set(list.map(i => i.id_pendaftar || i.id).filter(Boolean));

    list.forEach(item => {
      // Utamakan pencarian berdasarkan ID agar ketika Admin mengedit NISN/Email tidak membuat duplikat baru
      let matchIdx = tuDb.pendaftar.findIndex(t => (
        (item.id_pendaftar && (t.id === item.id_pendaftar || t.id_pendaftar === item.id_pendaftar)) ||
        (item.id && (t.id === item.id || t.id_pendaftar === item.id))
      ));

      if (matchIdx === -1 && item.nisn) {
        matchIdx = tuDb.pendaftar.findIndex(t => t.nisn && String(t.nisn).trim() === String(item.nisn).trim());
      }

      const isAccountActive = (item.status_akun === 'active' || item.status_akun === 'AKTIF');
      const ssotStatusAkun = isAccountActive ? 'AKTIF' : 'MENUNGGU';

      if (matchIdx !== -1) {
        const existing = tuDb.pendaftar[matchIdx];
        tuDb.pendaftar[matchIdx] = {
          ...existing,
          id: existing.id || item.id_pendaftar || item.id,
          id_pendaftar: item.id_pendaftar || existing.id_pendaftar || existing.id,
          nama: item.nama_lengkap || item.nama || existing.nama,
          nisn: item.nisn || existing.nisn,
          email: item.email || existing.email,
          no_wa: item.no_wa || existing.no_wa,
          pilihan_jurusan: item.biodata?.pilihan_jurusan || existing.pilihan_jurusan || 'MIPA',
          status_akun: ssotStatusAkun,
          activated_at: item.activated_at || existing.activated_at || null,
          notifikasi_aktivasi: item.notifikasi_aktivasi || existing.notifikasi_aktivasi || null,
          security_flag: item.security_flag || null,
          security_note: item.security_note || null,
          is_bot_suspect: Boolean(item.is_bot_suspect),
          is_duplicate_flag: Boolean(item.is_duplicate_flag),
          is_typo_reported: Boolean(item.is_typo_reported),
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
          nama: item.nama_lengkap || item.nama || 'Tanpa Nama',
          nisn: item.nisn || '',
          email: item.email || '',
          no_wa: item.no_wa || '',
          pilihan_jurusan: item.biodata?.pilihan_jurusan || 'MIPA',
          status_akun: ssotStatusAkun,
          activated_at: item.activated_at || null,
          notifikasi_aktivasi: item.notifikasi_aktivasi || null,
          security_flag: item.security_flag || null,
          security_note: item.security_note || null,
          is_bot_suspect: Boolean(item.is_bot_suspect),
          is_duplicate_flag: Boolean(item.is_duplicate_flag),
          is_typo_reported: Boolean(item.is_typo_reported),
          status_pembayaran: item.pembayaran?.status_pembayaran === 'lunas' ? 'LUNAS' : 'BELUM_BAYAR',
          created_at: item.created_at || new Date().toISOString(),
          biodata: item.biodata || null,
          berkas: item.berkas || null,
          jadwal_wawancara: item.jadwal_wawancara || null,
          pembayaran: item.pembayaran || null
        });
      }
    });

    // Pastikan item yang sudah dihapus di list tidak tertinggal di tuDb jika memiliki ID yang dikelola
    tuDb.pendaftar = tuDb.pendaftar.filter(t => {
      const tid = t.id_pendaftar || t.id;
      if (!tid) return true;
      return validIds.has(tid);
    });

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

  // Cek apakah ada pembaruan dari SSoT
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
            (ssotItem.nisn && p.nisn && String(p.nisn).trim() === String(ssotItem.nisn).trim() && !p.is_duplicate_flag)
          ));
          if (matchIdx !== -1) {
            const p = list[matchIdx];
            if ((ssotItem.status_akun === 'AKTIF' || ssotItem.status_akun === 'active') && p.status_akun !== 'active' && !p.is_bot_suspect && !p.is_duplicate_flag) {
              p.status_akun = 'active';
              changed = true;
            }
            if (ssotItem.notifikasi_aktivasi && !p.notifikasi_aktivasi) {
              p.notifikasi_aktivasi = ssotItem.notifikasi_aktivasi;
              changed = true;
            }
            if (ssotItem.status_pembayaran === 'LUNAS' && p.pembayaran?.status_pembayaran !== 'lunas') {
              if (!p.pembayaran) p.pembayaran = {};
              p.pembayaran.status_pembayaran = 'lunas';
              changed = true;
            }
            if (ssotItem.status_kelulusan && p.status_kelulusan !== ssotItem.status_kelulusan) {
              p.status_kelulusan = ssotItem.status_kelulusan;
              p.nilai_wawancara = ssotItem.nilai_wawancara;
              changed = true;
            }
            if (ssotItem.berkas) {
              p.berkas = { ...(p.berkas || {}), ...ssotItem.berkas };
            }
            if (ssotItem.jadwal_wawancara) {
              p.jadwal_wawancara = { ...(p.jadwal_wawancara || {}), ...ssotItem.jadwal_wawancara };
            }
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
 * Mengambil 1 data pendaftar spesifik berdasarkan id_pendaftar, NISN, atau Email
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
  const existingIdx = list.findIndex(item => (
    (searchId && (item.id_pendaftar === searchId || item.id === searchId)) ||
    (!data.is_duplicate_flag && !data.is_bot_suspect && data.nisn && item.nisn === data.nisn && !item.is_duplicate_flag)
  ));

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
 * Edit Data Akun Pendaftar oleh Admin (Perbaikan Laporan Typo Nama, Email, NISN, No. WA)
 */
export function updatePendaftarAccount(id, updatedFields) {
  if (!id) return { success: false, message: 'ID Pendaftar tidak ditemukan.' };
  const list = getPendaftarList();
  const targetStr = String(id).trim().toLowerCase();

  const idx = list.findIndex(item => (
    (item.id_pendaftar && String(item.id_pendaftar).trim().toLowerCase() === targetStr) ||
    (item.id && String(item.id).trim().toLowerCase() === targetStr)
  ));

  if (idx === -1) {
    return { success: false, message: 'Data pendaftar tidak ditemukan di database.' };
  }

  const current = list[idx];
  const newNama = (updatedFields.nama_lengkap ?? current.nama_lengkap ?? current.nama ?? '').trim();
  const newEmail = (updatedFields.email ?? current.email ?? '').trim();
  const newNisn = (updatedFields.nisn ?? current.nisn ?? '').trim();
  const newWa = (updatedFields.no_wa ?? current.no_wa ?? '').trim();

  // Cek apakah NISN atau Email baru bentrok dengan pendaftar LAIN
  const dupCheck = checkDuplicateRegistration(newNisn, newEmail, current.id_pendaftar || current.id);
  if (dupCheck.isDuplicate) {
    const conflictParts = [];
    if (dupCheck.duplicateNisn) conflictParts.push(`NISN (${newNisn}) sudah dipakai oleh ${dupCheck.matchedByNisn.nama_lengkap || dupCheck.matchedByNisn.nama}`);
    if (dupCheck.duplicateEmail) conflictParts.push(`Email (${newEmail}) sudah dipakai oleh ${dupCheck.matchedByEmail.nama_lengkap || dupCheck.matchedByEmail.nama}`);
    return {
      success: false,
      message: `Gagal menyimpan: ${conflictParts.join(' & ')}. Gunakan NISN dan Email yang unik.`
    };
  }

  const nowIso = new Date().toISOString();
  const prevCount = current.notifikasi_aktivasi?.jumlah_kirim || 0;

  // Karena NISN & Email kini sudah unik & valid, akun otomatis aktif dan email dikirim
  const updatedRecord = {
    ...current,
    nama_lengkap: newNama,
    nama: newNama,
    email: newEmail,
    nisn: newNisn,
    no_wa: newWa,
    status_akun: 'active',
    metode_aktivasi: 'OTOMATIS_REGISTRASI',
    activated_at: current.activated_at || nowIso,
    is_duplicate_flag: false,
    is_typo_reported: false,
    is_bot_suspect: false,
    security_flag: 'VERIFIED_UNIQUE',
    security_note: updatedFields.catatan_perbaikan || 'Data diperbaiki oleh Admin (NISN & Email Unik Terverifikasi)',
    updated_at: nowIso,
    notifikasi_aktivasi: {
      status: 'Berhasil Dikirim (Otomatis)',
      kode_status: 'SENT',
      waktu_aktual_kirim: nowIso,
      metode_kirim: 'Otomatis Setelah Perbaikan Data Typo oleh Admin',
      media: 'Email Resmi & WhatsApp',
      email_tujuan: newEmail,
      wa_tujuan: newWa,
      jumlah_kirim: prevCount + 1
    }
  };

  list[idx] = updatedRecord;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  syncToLegacyDB(list);

  // Sinkronkan session user jika yang diedit sedang terbuka di portal siswa
  try {
    const cur = JSON.parse(localStorage.getItem('m3_spmb_current_user'));
    if (cur && (cur.id_pendaftar === id || cur.id === id)) {
      localStorage.setItem('m3_spmb_current_user', JSON.stringify(updatedRecord));
    }
    const logged = JSON.parse(localStorage.getItem('m3_spmb_logged_in_user'));
    if (logged && (logged.id_pendaftar === id || logged.id === id)) {
      localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(updatedRecord));
    }
  } catch (e) {}

  dispatchSPMBEvent('spmb_db_updated', updatedRecord);
  return { success: true, data: updatedRecord };
}

/**
 * Hapus Pendaftar dari Database (Oleh Admin untuk membersihkan duplikat / akun bot / spam)
 */
export function deletePendaftar(id) {
  if (!id) return false;
  const list = getPendaftarList();
  const targetStr = String(id).trim().toLowerCase();

  const filtered = list.filter(item => {
    const itemId = String(item.id_pendaftar || item.id || '').trim().toLowerCase();
    return itemId !== targetStr;
  });

  if (filtered.length === list.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  syncToLegacyDB(filtered);

  try {
    const cur = JSON.parse(localStorage.getItem('m3_spmb_current_user'));
    if (cur && String(cur.id_pendaftar || cur.id || '').trim().toLowerCase() === targetStr) {
      localStorage.removeItem('m3_spmb_current_user');
    }
    const logged = JSON.parse(localStorage.getItem('m3_spmb_logged_in_user'));
    if (logged && String(logged.id_pendaftar || logged.id || '').trim().toLowerCase() === targetStr) {
      localStorage.removeItem('m3_spmb_logged_in_user');
    }
  } catch (e) {}

  dispatchSPMBEvent('spmb_db_updated', { deletedId: id });
  return true;
}

/**
 * Mengubah status_akun pendaftar
 */
export function updateStatusAkun(id, newStatus) {
  if (!id) return null;
  const list = getPendaftarList();
  const targetStr = String(id).trim().toLowerCase();

  let idx = list.findIndex(item => (
    (item.id_pendaftar && String(item.id_pendaftar).trim().toLowerCase() === targetStr) ||
    (item.id && String(item.id).trim().toLowerCase() === targetStr) ||
    (item.nisn && String(item.nisn).trim().toLowerCase() === targetStr)
  ));

  if (idx !== -1) {
    const isActivating = (newStatus === 'active' || newStatus === 'AKTIF');
    const nowIso = new Date().toISOString();

    list[idx].status_akun = isActivating ? 'active' : newStatus;
    if (isActivating) {
      list[idx].activated_at = list[idx].activated_at || nowIso;
      const prevCount = list[idx].notifikasi_aktivasi?.jumlah_kirim || 0;
      list[idx].notifikasi_aktivasi = {
        status: 'Berhasil Dikirim (Otomatis)',
        kode_status: 'SENT',
        waktu_aktual_kirim: nowIso,
        metode_kirim: 'Otomatis Saat Validasi Registrasi',
        media: 'Email Resmi & WhatsApp',
        email_tujuan: list[idx].email || '-',
        wa_tujuan: list[idx].no_wa || '-',
        jumlah_kirim: prevCount + 1
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    syncToLegacyDB(list);

    try {
      const cur = JSON.parse(localStorage.getItem('m3_spmb_current_user'));
      if (cur && (cur.id_pendaftar === id || cur.id === id || cur.nisn === list[idx].nisn)) {
        cur.status_akun = list[idx].status_akun;
        cur.activated_at = list[idx].activated_at;
        cur.notifikasi_aktivasi = list[idx].notifikasi_aktivasi;
        localStorage.setItem('m3_spmb_current_user', JSON.stringify(cur));
      }
      const logged = JSON.parse(localStorage.getItem('m3_spmb_logged_in_user'));
      if (logged && (logged.id_pendaftar === id || logged.id === id || logged.nisn === list[idx].nisn)) {
        logged.status_akun = list[idx].status_akun;
        logged.activated_at = list[idx].activated_at;
        logged.notifikasi_aktivasi = list[idx].notifikasi_aktivasi;
        localStorage.setItem('m3_spmb_logged_in_user', JSON.stringify(logged));
      }
    } catch (e) {}

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

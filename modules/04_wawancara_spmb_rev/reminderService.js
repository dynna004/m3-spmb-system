/**
 * Reminder Service Adapter & Message Generator
 * Modul 04 Penilaian Wawancara SPMB - SMA Muhammadiyah 3 Yogyakarta
 * 
 * Standar Pengingat H-1 Otomatis:
 * - Menghitung jadwal H-1 pada zona waktu Asia/Jakarta (WIB)
 * - Mencegah pesan ganda dengan Idempotency Key (REM-{candidateId}-{tanggal})
 * - Kontrak REST API siap terhubung ke backend scheduler (Node cron / Celery / Laravel)
 * - Transparan: Menandai status integrasi sebagai belum aktif jika gateway server belum tersedia
 */

import { formatTanggalIndonesia, isValidMeetingLink } from './wawancara.js';

// Status Integrasi Backend Gateway
export const BACKEND_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'BELUM_TERINTEGRASI_BACKEND'
};

// URL Konfigurasi Backend (Kosong atau diisi endpoint server jika tersedia)
export const BACKEND_CONFIG = {
  API_BASE_URL: (typeof window !== 'undefined' && window.__REMINDER_API_URL__) || '',
  WHATSAPP_GATEWAY_PROVIDER: 'Fonnte / Wablas / Twilio (Memerlukan Backend Gateway)',
  EMAIL_GATEWAY_PROVIDER: 'SMTP SMA M3 / Nodemailer / SendGrid (Memerlukan Backend Gateway)',
  TIMEZONE: 'Asia/Jakarta (WIB)'
};

/**
 * Menghitung tanggal H-1 dari string tanggal ISO YYYY-MM-DD
 * Bebas pergeseran timezone karena parsing komponen numerik lokal
 */
export function getHMinusOneDate(isoDateStr) {
  if (!isoDateStr || typeof isoDateStr !== 'string') return '-';
  const parts = isoDateStr.trim().split('-');
  if (parts.length !== 3) return '-';

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '-';

  // Kurangi 1 hari pada jam 12:00 siang lokal untuk stabilitas kalender
  const d = new Date(year, month, day, 12, 0, 0);
  d.setDate(d.getDate() - 1);

  const prevYear = d.getFullYear();
  const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
  const prevDay = String(d.getDate()).padStart(2, '0');

  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/**
 * Menghasilkan Idempotency Key unik per calon siswa & tanggal jadwal
 * Mencegah pengiriman pesan ganda untuk jadwal yang sama
 */
export function generateReminderIdempotencyKey(candidateId, tanggalJadwal) {
  const cleanId = (candidateId || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanDate = (tanggalJadwal || 'NODATE').replace(/-/g, '');
  return `REM-${cleanId}-${cleanDate}`;
}

/**
 * Evaluasi status komputasi pengingat H-1 calon siswa
 */
export function computeReminderMetadata(candidate, todayIso = null) {
  const jw = candidate?.jadwal_wawancara || {};
  const cId = candidate?.id || candidate?.id_pendaftar || '-';
  const tanggalWawancara = jw.tanggal || '';
  const jamWawancara = jw.jam || '08:00';
  const isSelesai = (candidate?.statusWawancara || '').toUpperCase() === 'SELESAI';
  const tanggalH1 = getHMinusOneDate(tanggalWawancara);

  // Today ISO dalam zona waktu Asia/Jakarta (default sistem hari ini)
  let today = todayIso;
  if (!today) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    today = `${y}-${m}-${d}`;
  }

  const existingRem = candidate?.pengingat_wawancara || {};
  const idempotencyKey = generateReminderIdempotencyKey(cId, tanggalWawancara);

  // Jika tidak memiliki jadwal yang valid
  if (!tanggalWawancara || tanggalH1 === '-') {
    return {
      id_pengingat: idempotencyKey,
      tanggal_jadwal: tanggalWawancara,
      jam_jadwal: jamWawancara,
      tanggal_pengingat_h1: '-',
      waktu_jadwal_kirim: null,
      waktu_aktual_kirim: null,
      media: 'WhatsApp & Email',
      status: 'Belum Dijadwalkan',
      status_badge_class: 'badge-status-neutral',
      alasan: 'Tanggal jadwal wawancara belum ditentukan.',
      is_sendable: false
    };
  }

  // Jika wawancara sudah selesai
  if (isSelesai) {
    return {
      id_pengingat: idempotencyKey,
      tanggal_jadwal: tanggalWawancara,
      jam_jadwal: jamWawancara,
      tanggal_pengingat_h1: tanggalH1,
      waktu_jadwal_kirim: `${tanggalH1}T08:00:00+07:00`,
      waktu_aktual_kirim: existingRem.waktu_aktual_kirim || null,
      media: existingRem.media || 'WhatsApp & Email',
      status: 'Dibatalkan',
      status_badge_class: 'badge-status-dibatalkan',
      alasan: 'Wawancara telah selesai dilaksanakan.',
      is_sendable: false
    };
  }

  // Jika tanggal jadwal wawancara sudah lewat di masa lalu
  if (tanggalWawancara < today) {
    return {
      id_pengingat: idempotencyKey,
      tanggal_jadwal: tanggalWawancara,
      jam_jadwal: jamWawancara,
      tanggal_pengingat_h1: tanggalH1,
      waktu_jadwal_kirim: `${tanggalH1}T08:00:00+07:00`,
      waktu_aktual_kirim: existingRem.waktu_aktual_kirim || null,
      media: existingRem.media || 'WhatsApp & Email',
      status: 'Dibatalkan',
      status_badge_class: 'badge-status-dibatalkan',
      alasan: 'Jadwal wawancara telah berlalu.',
      is_sendable: false
    };
  }

  // Jika sudah tercatat Berhasil Dikirim di database
  if (existingRem.status === 'Berhasil Dikirim') {
    return {
      ...existingRem,
      id_pengingat: idempotencyKey,
      tanggal_jadwal: tanggalWawancara,
      jam_jadwal: jamWawancara,
      tanggal_pengingat_h1: tanggalH1,
      status: 'Berhasil Dikirim',
      status_badge_class: 'badge-status-success',
      alasan: 'Pengingat H-1 telah berhasil terkirim.',
      is_sendable: false
    };
  }

  // Jika tercatat Gagal Dikirim di database
  if (existingRem.status === 'Gagal Dikirim') {
    return {
      ...existingRem,
      id_pengingat: idempotencyKey,
      tanggal_jadwal: tanggalWawancara,
      jam_jadwal: jamWawancara,
      tanggal_pengingat_h1: tanggalH1,
      status: 'Gagal Dikirim',
      status_badge_class: 'badge-status-error',
      alasan: existingRem.error_log || 'Gagal mengirim pesan melalui gateway pengiriman.',
      is_sendable: true
    };
  }

  // Default: Menunggu Pengiriman pada H-1
  return {
    id_pengingat: idempotencyKey,
    tanggal_jadwal: tanggalWawancara,
    jam_jadwal: jamWawancara,
    tanggal_pengingat_h1: tanggalH1,
    waktu_jadwal_kirim: `${tanggalH1}T08:00:00+07:00`,
    waktu_aktual_kirim: null,
    media: existingRem.media || 'WhatsApp & Email',
    status: 'Menunggu Pengiriman',
    status_badge_class: 'badge-status-waiting',
    alasan: `Dijadwalkan terkirim otomatis pada ${formatTanggalIndonesia(tanggalH1)} pukul 08:00 WIB (Asia/Jakarta).`,
    is_sendable: true
  };
}

/**
 * Generate Template Pesan WhatsApp Resmi
 */
export function generateWhatsAppMessage(candidate) {
  const jw = candidate?.jadwal_wawancara || {};
  const cName = candidate?.nama || candidate?.nama_lengkap || 'Calon Siswa';
  const cId = candidate?.id || candidate?.id_pendaftar || '-';
  const tglIndo = formatTanggalIndonesia(jw.tanggal, jw.hari);
  const jamStr = jw.sesi || (jw.jam ? `${jw.jam} WIB` : '08:00 WIB');
  const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
  const platform = jw.platform || 'Google Meet';
  const linkMeeting = (jw.link_meeting || '').trim();
  const hasLink = isDaring && isValidMeetingLink(linkMeeting);
  const ruang = jw.ruang ? jw.ruang.split('(')[0].trim() : 'Ruang Wawancara 1';
  const lokasiGedung = jw.ruang && jw.ruang.includes('(') ? `(${jw.ruang.split('(')[1]}` : '(Gedung Utama SMA Muhammadiyah 3 Yogyakarta)';
  const pewawancara = jw.pewawancara || 'Pewawancara SPMB';

  let lokasiMetodeText = '';
  if (isDaring) {
    lokasiMetodeText = `*Metode Wawancara:* Daring (Online)\n` +
      `*Platform:* ${platform}\n` +
      `*Tautan Meeting:* ${hasLink ? linkMeeting : 'Tautan meeting akan dikirimkan panitia sebelum sesi dimulai'}`;
  } else {
    lokasiMetodeText = `*Metode Wawancara:* Luring (Tatap Muka Langsung)\n` +
      `*Ruangan & Lokasi:* ${ruang} ${lokasiGedung}`;
  }

  return `*PENGINGAT JADWAL WAWANCARA SPMB SMA MUHAMMADIYAH 3 YOGYAKARTA*

Yth. Calon Siswa dan Orang Tua/Wali,

Kami mengingatkan bahwa pelaksanaan wawancara SPMB SMA Muhammadiyah 3 Yogyakarta Tahun Ajaran 2026/2027 akan dilaksanakan sesuai jadwal berikut:

*Nama Calon Siswa:* ${cName}
*No. Registrasi:* ${cId}
*Hari & Tanggal:* ${tglIndo}
*Waktu:* ${jamStr}
${lokasiMetodeText}
*Pewawancara Bertugas:* ${pewawancara}

Mohon calon siswa bersama orang tua/wali dapat hadir tepat waktu (disarankan 10–15 menit sebelum sesi dimulai).

Terima kasih atas perhatian dan kerja samanya.

_Panitia Penerimaan Murid Baru (SPMB)_
*SMA Muhammadiyah 3 Yogyakarta*
Jl. Kapten Piere Tendean No. 58, Wirobrajan, Yogyakarta`;
}

/**
 * Generate Template Pesan Email Resmi (Format HTML & Plain Text)
 */
export function generateEmailMessage(candidate) {
  const jw = candidate?.jadwal_wawancara || {};
  const cName = candidate?.nama || candidate?.nama_lengkap || 'Calon Siswa';
  const cId = candidate?.id || candidate?.id_pendaftar || '-';
  const tglIndo = formatTanggalIndonesia(jw.tanggal, jw.hari);
  const jamStr = jw.sesi || (jw.jam ? `${jw.jam} WIB` : '08:00 WIB');
  const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
  const platform = jw.platform || 'Google Meet';
  const linkMeeting = (jw.link_meeting || '').trim();
  const hasLink = isDaring && isValidMeetingLink(linkMeeting);
  const ruang = jw.ruang ? jw.ruang.split('(')[0].trim() : 'Ruang Wawancara 1';
  const pewawancara = jw.pewawancara || 'Pewawancara SPMB';

  const subject = `[PENGINGAT H-1] Jadwal Wawancara SPMB SMA Muhammadiyah 3 Yogyakarta - ${cName} (${cId})`;

  const textBody = `PENGINGAT JADWAL WAWANCARA SPMB SMA MUHAMMADIYAH 3 YOGYAKARTA

Yth. Calon Siswa dan Orang Tua/Wali,

Kami mengingatkan bahwa wawancara SPMB SMA Muhammadiyah 3 Yogyakarta akan dilaksanakan:

Nama Calon Siswa : ${cName}
No. Registrasi    : ${cId}
Hari & Tanggal    : ${tglIndo}
Waktu Pelaksanaan : ${jamStr}
Metode Wawancara  : ${isDaring ? `Daring via ${platform}` : 'Luring (Tatap Muka di Sekolah)'}
${isDaring ? `Tautan Meeting    : ${hasLink ? linkMeeting : 'Akan disampaikan panitia'}` : `Lokasi / Ruangan  : ${ruang}`}
Pewawancara       : ${pewawancara}

Mohon hadir tepat waktu sesuai jadwal yang telah ditentukan.

Terima kasih.

Panitia SPMB SMA Muhammadiyah 3 Yogyakarta`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.04);">
    <div style="background: #006837; color: #ffffff; padding: 24px; text-align: center;">
      <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.5px;">SMA MUHAMMADIYAH 3 YOGYAKARTA</h2>
      <p style="margin: 6px 0 0 0; font-size: 0.88rem; opacity: 0.9;">Panitia Penerimaan Murid Baru (SPMB) TA 2026/2027</p>
    </div>
    <div style="padding: 24px;">
      <h3 style="color: #006837; margin-top: 0; font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        📢 Pengingat Jadwal Wawancara SPMB
      </h3>
      <p style="font-size: 0.92rem; line-height: 1.5;">Yth. Calon Siswa dan Orang Tua/Wali,</p>
      <p style="font-size: 0.92rem; line-height: 1.5;">
        Kami mengingatkan bahwa wawancara seleksi SPMB SMA Muhammadiyah 3 Yogyakarta akan dilaksanakan dengan rincian sebagai berikut:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9rem;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; font-weight: 700; width: 38%; border-bottom: 1px solid #e2e8f0;">Nama Calon Siswa</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${cName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">No. Registrasi</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong style="color: #006837;">${cId}</strong></td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Hari & Tanggal</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>${tglIndo}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Waktu Pelaksanaan</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${jamStr}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Metode Pelaksanaan</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; ${isDaring ? 'background:#e0f2fe; color:#0369a1;' : 'background:#dcfce7; color:#15803d;'}">
              ${isDaring ? `🌐 Daring (${platform})` : '🏢 Luring (Tatap Muka)'}
            </span>
          </td>
        </tr>
        ${isDaring ? `
        <tr>
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Tautan Meeting</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            ${hasLink ? `<a href="${linkMeeting}" target="_blank" style="color: #0284c7; font-weight: 700; text-decoration: underline;">${linkMeeting}</a>` : '<span style="color:#64748b; font-style:italic;">Tautan akan disediakan panitia</span>'}
          </td>
        </tr>` : `
        <tr>
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Lokasi / Ruangan</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${ruang} (Gedung Utama SMA Muhammadiyah 3 Yogyakarta)</td>
        </tr>`}
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Pewawancara Bertugas</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${pewawancara}</td>
        </tr>
      </table>

      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 0.86rem; color: #92400e;">
        ⚠️ <strong>Catatan Penting:</strong> Mohon hadir tepat waktu 10–15 menit sebelum sesi dimulai agar proses wawancara berjalan lancar.
      </div>

      <p style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 0;">
        Terima kasih atas kerja sama dan kedisiplinan Anda.
      </p>
      <p style="font-size: 0.9rem; margin-top: 6px;">
        Wassalamu'alaikum Warahmatullahi Wabarakatuh,<br>
        <strong>Panitia SPMB SMA Muhammadiyah 3 Yogyakarta</strong>
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 0.76rem; color: #64748b; border-top: 1px solid #e2e8f0;">
      Jl. Kapten Piere Tendean No. 58, Wirobrajan, Yogyakarta 55252 &bull; Telp: (0274) 375127
    </div>
  </div>
</body>
</html>
`;

  return { subject, textBody, htmlBody };
}

/**
 * Payload JSON Standar Kontrak API untuk Backend Scheduler
 */
export function generateReminderPayload(candidate) {
  const jw = candidate?.jadwal_wawancara || {};
  const cId = candidate?.id || candidate?.id_pendaftar || '-';
  const cName = candidate?.nama || candidate?.nama_lengkap || '-';
  const tanggalH1 = getHMinusOneDate(jw.tanggal);
  const idempotencyKey = generateReminderIdempotencyKey(cId, jw.tanggal);

  return {
    idempotency_key: idempotencyKey,
    candidate: {
      id: cId,
      nama: cName,
      telepon_wa: candidate?.telepon || candidate?.biodata?.no_hp || candidate?.kontak?.no_wa || '',
      email: candidate?.email || candidate?.biodata?.email || ''
    },
    jadwal: {
      tanggal: jw.tanggal,
      hari: jw.hari,
      jam: jw.jam,
      metode: jw.metode || 'Luring',
      platform: jw.platform || '',
      link_meeting: jw.link_meeting || '',
      ruang: jw.ruang || 'Ruang Wawancara 1',
      pewawancara: jw.pewawancara || 'Yosa'
    },
    reminder: {
      scheduled_for_date: tanggalH1,
      scheduled_for_time: `${tanggalH1}T08:00:00+07:00`,
      timezone: 'Asia/Jakarta',
      media: ['WHATSAPP', 'EMAIL']
    },
    messages: {
      whatsapp_text: generateWhatsAppMessage(candidate),
      email_subject: generateEmailMessage(candidate).subject,
      email_html: generateEmailMessage(candidate).htmlBody
    }
  };
}

/**
 * Service Adapter untuk pengiriman pesan ke Backend Server
 * Menangani secara jujur kondisi ketika backend gateway belum tersedia
 */
export async function dispatchReminderToBackend(candidate, media = 'WhatsApp & Email') {
  const payload = generateReminderPayload(candidate);

  // Jika URL Backend belum dikonfigurasi
  if (!BACKEND_CONFIG.API_BASE_URL) {
    return {
      success: false,
      status: 'BELUM_TERINTEGRASI_BACKEND',
      idempotency_key: payload.idempotency_key,
      media,
      timestamp: new Date().toISOString(),
      error: 'Backend Gateway belum dihubungkan. Server scheduler & WhatsApp Gateway terpisah diperlukan untuk pengiriman otomatis di luar browser.',
      required_action: 'Konfigurasi backend scheduler (lihat file BACKEND_REMINDER_SPEC.md)'
    };
  }

  // Jika URL backend dikonfigurasi, kirim payload nyata via REST API
  try {
    const response = await fetch(`${BACKEND_CONFIG.API_BASE_URL}/api/reminders/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': payload.idempotency_key
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        status: 'Gagal Dikirim',
        idempotency_key: payload.idempotency_key,
        media,
        timestamp: new Date().toISOString(),
        error: errData.message || `HTTP ${response.status}: Layanan pengiriman menolak permintaan.`
      };
    }

    const resData = await response.json();
    return {
      success: true,
      status: 'Berhasil Dikirim',
      idempotency_key: payload.idempotency_key,
      external_message_id: resData.message_id || `M3-GATEWAY-${Date.now()}`,
      media,
      timestamp: new Date().toISOString(),
      details: resData
    };
  } catch (err) {
    return {
      success: false,
      status: 'Gagal Dikirim',
      idempotency_key: payload.idempotency_key,
      media,
      timestamp: new Date().toISOString(),
      error: `Koneksi ke backend gagal: ${err.message}`
    };
  }
}


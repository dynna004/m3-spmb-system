/**
 * Service Generator & Dispatcher: Notifikasi Email Aktivasi Akun Otomatis
 * Modul 01 (Portal SPMB) & Modul 02 (Admin SPMB) - SMA Muhammadiyah 3 Yogyakarta
 *
 * Mengadopsi arsitektur notifikasi dari Modul 04 (Pengingat Wawancara):
 * - Menyusun template Email Resmi (HTML & Plain Text) untuk Aktivasi Akun Otomatis
 *   saat NISN & Email tervalidasi unik (tidak duplikat).
 * - Menyusun pesan pendamping WhatsApp.
 * - Menghitung metadata status pengiriman email aktivasi & audit log.
 */

import { escapeHTML } from '../01_portal_spmb/utils.js';

/**
 * Format ID Pendaftar menjadi Nomor Pendaftaran Resmi (SPMB-2026-xxx)
 */
export function formatRegNumber(rawId) {
  if (!rawId) return 'SPMB-2026-001';
  const str = String(rawId).trim();
  if (str.startsWith('REG-')) {
    return str.replace('REG-', 'SPMB-');
  }
  return str;
}

/**
 * Menghasilkan timestamp lokal ISO dengan offset +07:00 (WIB)
 */
export function getLocalIsoTimestamp(dateObj = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}+07:00`;
}

/**
 * Format tanggal dan waktu ke Bahasa Indonesia
 */
export function formatWaktuIndonesia(isoString) {
  if (!isoString) return '-';
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return isoString;
    return dt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  } catch (e) {
    return isoString;
  }
}

/**
 * Buat Idempotency Key unik untuk pengiriman notifikasi aktivasi akun
 */
export function generateActivationIdempotencyKey(student) {
  const id = student.id_pendaftar || student.id || 'UNKNOWN';
  const nisn = student.nisn || '0000000000';
  return `ACT-AUTO-EMAIL_${id}_${nisn}`;
}

/**
 * Evaluasi metadata status pengiriman notifikasi aktivasi untuk 1 pendaftar
 */
export function computeActivationNotificationMetadata(student) {
  const isActive = (student.status_akun === 'active' || student.status_akun === 'AKTIF');
  const existingNotif = student.notifikasi_aktivasi || {};
  const idempotencyKey = generateActivationIdempotencyKey(student);
  const isBot = Boolean(student.is_bot_suspect || student.security_flag === 'BOT_SUSPECT');
  const isDuplicateFlag = Boolean(student.is_duplicate_flag || student.security_flag === 'DUPLICATE_CONFLICT');

  if (isBot || isDuplicateFlag || !isActive) {
    return {
      status_pengiriman: isBot ? 'Diblokir (Indikasi Bot)' : (isDuplicateFlag ? 'Tertahan (Konflik Duplikat)' : 'Menunggu Validasi Unik'),
      kode_status: isBot ? 'BLOCKED_BOT' : (isDuplicateFlag ? 'HOLD_DUPLICATE' : 'WAITING_ACTIVATION'),
      waktu_kirim: existingNotif.waktu_aktual_kirim || null,
      waktu_kirim_label: existingNotif.waktu_aktual_kirim
        ? formatWaktuIndonesia(existingNotif.waktu_aktual_kirim)
        : (isBot ? 'Pengiriman diblokir sistem anti-bot' : 'Menunggu penyelesaian duplikat/typo'),
      idempotency_key: idempotencyKey,
      media: 'Email Resmi & WhatsApp',
      metode_kirim: existingNotif.metode_kirim || '-',
      jumlah_kirim: existingNotif.jumlah_kirim || 0
    };
  }

  const fallbackSentTime = existingNotif.waktu_aktual_kirim || student.activated_at || student.created_at || '2026-10-05T09:30:00+07:00';

  return {
    status_pengiriman: existingNotif.status || 'Berhasil Dikirim (Otomatis)',
    kode_status: 'SENT',
    waktu_kirim: fallbackSentTime,
    waktu_kirim_label: formatWaktuIndonesia(fallbackSentTime),
    idempotency_key: existingNotif.idempotency_key || idempotencyKey,
    media: existingNotif.media || 'Email Resmi & WhatsApp',
    metode_kirim: existingNotif.metode_kirim || 'Otomatis Saat Registrasi (NISN & Email Unik)',
    jumlah_kirim: existingNotif.jumlah_kirim || 1
  };
}

/**
 * Generator Template Email Resmi Aktivasi Akun & Kredensial Login (HTML + Plain Text)
 */
export function generateActivationEmailMessage(student, customLoginUrl = null) {
  const nama = escapeHTML(student.nama_lengkap || student.nama || 'Calon Siswa');
  const regNo = escapeHTML(formatRegNumber(student.id_pendaftar || student.id));
  const nisn = escapeHTML(student.nisn || '-');
  const email = escapeHTML(student.email || '-');
  const noWa = escapeHTML(student.no_wa || '-');
  const isActive = (student.status_akun === 'active' || student.status_akun === 'AKTIF');
  const waktuAktivasi = formatWaktuIndonesia(
    student.notifikasi_aktivasi?.waktu_aktual_kirim || student.activated_at || student.created_at || new Date().toISOString()
  );

  // Tentukan URL Login berdasarkan konteks halaman
  const loginUrl = customLoginUrl || (
    typeof window !== 'undefined' && window.location.pathname.includes('/01_portal_spmb/')
      ? 'login.html'
      : 'modules/01_portal_spmb/login.html'
  );

  const subject = `[SPMB MUHI 2026] Akun Otomatis Aktif! Silakan Login (${nama} - ${regNo})`;

  const statusHeaderBadge = isActive
    ? `<span style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">✓ TERAKTIVASI OTOMATIS (NISN &amp; EMAIL UNIK)</span>`
    : `<span style="display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">⏳ TERTAHAN / KONFLIK DATA</span>`;

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: #ffffff; color: #1e293b; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);">
      <!-- Kop Email Resmi -->
      <div style="background: linear-gradient(135deg, #064e3b 0%, #006837 100%); color: #ffffff; padding: 24px 24px 20px; text-align: center; border-bottom: 4px solid #eab308;">
        <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
          Notifikasi Sistem Otomatis &bull; SPMB T.A. 2026/2027
        </div>
        <h2 style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: 0.3px;">SMA MUHAMMADIYAH 3 YOGYAKARTA</h2>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Jl. Kapten Piere Tendean No. 56, Wirobrajan, Kota Yogyakarta &bull; Telp. (0274) 375127</p>
      </div>

      <!-- Envelope Metadata Bar -->
      <div style="background: #f8fafc; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
          <div><strong>Dari:</strong> Panitia SPMB Muhi &lt;no-reply@spmb.muhi.sch.id&gt;</div>
          <div>${statusHeaderBadge}</div>
        </div>
        <div style="margin-bottom: 2px;"><strong>Kepada:</strong> ${nama} &lt;${email}&gt;</div>
        <div><strong>Subjek:</strong> <span style="color: #0f172a; font-weight: 700;">${subject}</span></div>
      </div>

      <!-- Isi Surat Elektronik -->
      <div style="padding: 24px; font-size: 14px; line-height: 1.65;">
        <p style="margin-top: 0;">Assalamu'alaikum Wr. Wb.,</p>
        <p>Halo <strong>${nama}</strong>,</p>
        <p>Selamat! Pendaftaran akun awal Anda pada Portal Sistem Penerimaan Murid Baru (SPMB) <strong>SMA Muhammadiyah 3 Yogyakarta</strong> telah <strong>terverifikasi dan diaktivasi secara otomatis</strong> oleh sistem karena <strong>NISN (${nisn})</strong> dan <strong>Email (${email})</strong> Anda tervalidasi unik.</p>

        <!-- Box Informasi Kredensial Login -->
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #006837; padding: 16px 18px; border-radius: 10px; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: 800; color: #006837; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">
            🔐 Detail Akun &amp; Kredensial Login Anda
          </div>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #475569; width: 42%;">Nomor Pendaftaran</td>
              <td style="padding: 5px 0; font-weight: 800; color: #0f172a; font-family: monospace; font-size: 14px;">: ${regNo}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">Nama Calon Siswa</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">: ${nama}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">NISN (Username Login 1)</td>
              <td style="padding: 5px 0; font-weight: 800; color: #0369a1; font-family: monospace;">: ${nisn}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">Email (Username Login 2)</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">: ${email}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">Password Akun</td>
              <td style="padding: 5px 0; font-weight: 600; color: #334155;">: <em>(Sesuai password yang Anda buat saat registrasi)</em></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">Status Aktivasi</td>
              <td style="padding: 5px 0; font-weight: 800; color: #15803d;">: AKTIF OTOMATIS &bull; Siap Login (${waktuAktivasi})</td>
            </tr>
          </table>
        </div>

        <!-- Langkah Selanjutnya -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 6px;">📌 Langkah Selanjutnya Setelah Login:</div>
          <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
            <li>Klik tombol <strong>Login ke Portal SPMB</strong> di bawah menggunakan <strong>NISN (${nisn})</strong> atau <strong>Email (${email})</strong> beserta password Anda.</li>
            <li>Lengkapi <strong>Formulir Biodata Lengkap</strong> dan pilih jurusan yang diminati.</li>
            <li>Unggah berkas persyaratan digital serta bukti pembayaran biaya pendaftaran untuk diverifikasi oleh petugas.</li>
          </ol>
        </div>

        <!-- CTA Button Login -->
        <div style="text-align: center; margin: 24px 0 18px;">
          <a href="${loginUrl}" style="display: inline-block; background: #006837; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 104, 55, 0.25);">
            🔑 Login ke Portal SPMB Sekarang &rarr;
          </a>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
            Tautan Langsung: <span style="color: #006837; text-decoration: underline;">https://spmb.muhi-yogya.sch.id/login</span>
          </div>
        </div>

        <p style="font-size: 12.5px; color: #475569; margin-bottom: 6px;">
          Apabila terdapat kesalahan penulisan (typo) pada Nama, NISN, Email, atau Nomor WhatsApp (${noWa}), silakan hubungi Admin Loket SPMB agar data Anda dapat diperbarui.
        </p>
        <p style="margin-bottom: 0;">Wassalamu'alaikum Wr. Wb.<br><strong>Panitia SPMB SMA Muhammadiyah 3 Yogyakarta</strong></p>
      </div>

      <!-- Footer Email -->
      <div style="background: #f1f5f9; padding: 12px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Email ini dikirim secara otomatis oleh Sistem Validasi Registrasi SPMB SMA Muhammadiyah 3 Yogyakarta.
      </div>
    </div>
  `;

  const plainText = `Subject: ${subject}
Kepada: ${nama} <${email}>

Assalamu'alaikum Wr. Wb.,
Halo ${nama},

Selamat! Akun pendaftaran SPMB SMA Muhammadiyah 3 Yogyakarta Anda telah TERAKTIVASI OTOMATIS karena NISN dan Email Anda tervalidasi unik.

DETAIL AKUN & KREDENSIAL LOGIN:
- Nomor Pendaftaran : ${regNo}
- Nama Lengkap      : ${nama}
- NISN (Login)      : ${nisn}
- Email (Login)     : ${email}
- Password          : (Sesuai password saat registrasi)
- Status Akun       : AKTIF OTOMATIS (${waktuAktivasi})

Silakan langsung Login di Portal SPMB untuk mengisi Formulir Biodata dan mengunggah berkas persyaratan:
https://spmb.muhi-yogya.sch.id/login

Wassalamu'alaikum Wr. Wb.
Panitia SPMB SMA Muhammadiyah 3 Yogyakarta`;

  return { subject, html, plainText };
}

/**
 * Generator Pesan WhatsApp Pendamping Notifikasi Aktivasi Otomatis
 */
export function generateActivationWhatsAppMessage(student) {
  const nama = student.nama_lengkap || student.nama || 'Calon Siswa';
  const regNo = formatRegNumber(student.id_pendaftar || student.id);
  const nisn = student.nisn || '-';
  const email = student.email || '-';

  return `*NOTIFIKASI AKTIVASI OTOMATIS AKUN SPMB*
*SMA MUHAMMADIYAH 3 YOGYAKARTA*

Assalamu'alaikum Wr. Wb.,
Halo *${nama}*,

Selamat! Akun pendaftaran SPMB Anda telah *AKTIF OTOMATIS* karena NISN & Email tervalidasi unik. Notifikasi rincian akun juga telah dikirimkan ke email Anda (*${email}*).

🔐 *INFORMASI LOGIN PORTAL SISWA:*
• *No. Pendaftaran:* ${regNo}
• *Username (NISN):* ${nisn}
• *Username (Email):* ${email}
• *Password:* _(Sesuai yang didaftarkan saat registrasi)_
• *Status Akun:* ✅ *AKTIF (Otomatis)*

📌 *Langkah Selanjutnya:*
Silakan langsung *Login* ke Portal SPMB menggunakan NISN/Email di atas untuk melengkapi Formulir Biodata, memilih jurusan, dan mengunggah berkas pendaftaran.

🔗 *Link Login:* https://spmb.muhi-yogya.sch.id/login

Terima kasih,
*Panitia SPMB SMA Muhammadiyah 3 Yogyakarta*`;
}

/**
 * Mencatat / Memperbarui pengiriman notifikasi email aktivasi pada objek pendaftar
 */
export function dispatchActivationNotification(student, metode = 'Otomatis Saat Registrasi (NISN & Email Unik)') {
  if (!student) return null;
  const nowIso = getLocalIsoTimestamp(new Date());
  const prevCount = student.notifikasi_aktivasi?.jumlah_kirim || 0;

  student.activated_at = student.activated_at || nowIso;
  student.metode_aktivasi = student.metode_aktivasi || 'OTOMATIS_REGISTRASI';
  student.notifikasi_aktivasi = {
    status: 'Berhasil Dikirim (Otomatis)',
    kode_status: 'SENT',
    waktu_aktual_kirim: nowIso,
    metode_kirim: metode,
    media: 'Email Resmi & WhatsApp',
    email_tujuan: student.email || '-',
    wa_tujuan: student.no_wa || '-',
    idempotency_key: generateActivationIdempotencyKey(student),
    jumlah_kirim: prevCount + 1
  };

  return student;
}


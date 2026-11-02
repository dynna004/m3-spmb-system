/**
 * Anekdotal Record Service & Document Generator
 * Modul 04 Penilaian Wawancara SPMB - SMA Muhammadiyah 3 Yogyakarta
 * 
 * Fitur:
 * - Menghasilkan dokumen Anekdotal Record Siswa individual formal standar A4 portrait
 * - Memuat Identitas, Pelaksanaan Wawancara, 5 Aspek Penilaian (Tahap 1),
 *   Tes Al-Qur'an & Beasiswa (Tahap 2), Rekomendasi Akhir, Catatan Pendampingan BK, & Pengesahan
 * - Mengambil data terbaru langsung dari SSoT
 */

import { formatTanggalIndonesia, calculateBeasiswaRecommendation } from './wawancara.js';

/**
 * Menghasilkan markup HTML dokumen Anekdotal Record Siswa lengkap untuk ukuran kertas A4 portrait
 */
export function generateAnekdotalRecordHTML(candidate, printDateIso = null) {
  if (!candidate) return '<div class="alert alert-error">Data calon siswa tidak ditemukan.</div>';

  const cId = candidate.id || candidate.id_pendaftar || '-';
  const cName = candidate.nama || candidate.nama_lengkap || 'Tanpa Nama';
  const nisn = candidate.nisn || candidate.biodata?.nisn || '-';
  const asalSekolah = candidate.asal_sekolah || candidate.biodata?.asal_sekolah || '-';
  const jurusan = candidate.pilihan_jurusan || candidate.biodata?.pilihan_jurusan || 'MIPA';

  const dw = candidate.dataWawancara || {};
  const jw = candidate.jadwal_wawancara || {};

  // Pelaksanaan Wawancara
  const tglWawancara = dw.tanggal_wawancara || jw.tanggal || '';
  const tglWawancaraIndo = tglWawancara ? formatTanggalIndonesia(tglWawancara, jw.hari) : 'Belum diisi';
  const jamSesi = jw.sesi || (jw.jam ? `${jw.jam} WIB` : '08:00 WIB');
  const isDaring = (jw.metode || '').toUpperCase() === 'DARING';
  const platform = jw.platform || 'Google Meet';
  const linkMeeting = (jw.link_meeting || '').trim();
  const ruang = jw.ruang ? jw.ruang.split('(')[0].trim() : 'Ruang Wawancara 1';
  const lokasiGedung = jw.ruang && jw.ruang.includes('(') ? `(${jw.ruang.split('(')[1]}` : '(Kampus Gedung Utama SMA Muhammadiyah 3 Yogyakarta)';
  const pewawancara = dw.pewawancara || jw.pewawancara || 'Pewawancara SPMB';

  // Nilai
  const nilaiSiswa = dw.nilai_siswa !== undefined && dw.nilai_siswa !== null ? dw.nilai_siswa : (candidate.nilai_wawancara ?? '-');
  const nilaiWali = dw.nilai_wali !== undefined && dw.nilai_wali !== null ? dw.nilai_wali : '-';
  let nilaiRata = '-';
  if (nilaiSiswa !== '-' && nilaiWali !== '-') {
    nilaiRata = Math.round(((parseFloat(nilaiSiswa) || 0) + (parseFloat(nilaiWali) || 0)) / 2);
  } else if (nilaiSiswa !== '-') {
    nilaiRata = nilaiSiswa;
  }

  // 5 Aspek Penilaian (Tahap 1)
  const aspekList = [
    { key: 'Kepribadian', nama: 'Kepribadian' },
    { key: 'Bahasa & Komunikasi', nama: 'Bahasa & Komunikasi' },
    { key: 'Sosial', nama: 'Sosial' },
    { key: 'Bakat & Minat', nama: 'Bakat & Minat' },
    { key: 'Ibadah', nama: 'Ibadah' }
  ];

  const checkedAspek = Array.isArray(dw.aspek_penilaian) ? dw.aspek_penilaian : (Array.isArray(dw.peminatan_bakat) ? dw.peminatan_bakat : []);
  const catatanAspek = dw.catatan_aspek || {};

  // Hasil Tes Al-Qur'an & Beasiswa (Tahap 2)
  const statusTes = dw.status_tes_quran || (dw.hafalan_teruji !== undefined ? 'Sudah Dites' : 'Belum Dites');
  const hafalanTeruji = dw.hafalan_teruji !== undefined ? dw.hafalan_teruji : (statusTes === 'Sudah Dites' ? (dw.hafalan_juz || 0) : 0);
  const beasiswaRec = calculateBeasiswaRecommendation(hafalanTeruji, statusTes);

  // Rekomendasi Akhir
  const recAkhir = (dw.rekomendasi_akhir || 'LAYAK').toUpperCase();
  let recLabelText = 'LAYAK DITERIMA';
  let recBadgeClass = 'badge-rec-layak';
  if (recAkhir === 'CADANGAN') {
    recLabelText = 'DIPERTIMBANGKAN (CADANGAN)';
    recBadgeClass = 'badge-rec-cadangan';
  } else if (recAkhir === 'TIDAK_LAYAK' || recAkhir === 'TIDAK LAYAK') {
    recLabelText = 'TIDAK DIREKOMENDASIKAN';
    recBadgeClass = 'badge-rec-tidak-layak';
  }

  const catatanSiswa = dw.catatan_siswa || '';
  const catatanWali = dw.catatan_wali || '';
  const catatanRekomendasi = dw.catatan_rekomendasi || (catatanSiswa ? `Observasi Siswa: ${catatanSiswa}` : 'Siswa memenuhi kriteria penerimaan berdasarkan hasil wawancara komprehensif.');
  const catatanPendampingan = dw.catatan_pendampingan || '';

  // Tanggal Cetak
  let today = printDateIso;
  if (!today) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    today = `${y}-${m}-${d}`;
  }
  const tglCetakIndo = formatTanggalIndonesia(today);

  return `
    <div class="anekdotal-paper-sheet" id="anekdotal-printable-sheet">
      <!-- KOP SURAT RESMI SEKOLAH -->
      <div class="anekdotal-kop">
        <div class="kop-emblem-box">
          <div class="kop-logo-symbol">☀️</div>
          <div style="font-size: 0.58rem; font-weight: 800; letter-spacing: 0.5px; color: #006837; text-align: center; margin-top: 2px;">MUHAMMADIYAH</div>
        </div>
        <div class="kop-text-box">
          <div class="kop-line-1">MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL</div>
          <div class="kop-line-2">PIMPINAN DAERAH MUHAMMADIYAH KOTA YOGYAKARTA</div>
          <div class="kop-line-sekolah">SMA MUHAMMADIYAH 3 YOGYAKARTA</div>
          <div class="kop-line-akreditasi">TERAKREDITASI "A" (UNGGUL) &bull; NSS: 304046001003 &bull; NPSN: 20403161</div>
          <div class="kop-line-alamat">Jl. Kapten Piere Tendean No. 58, Wirobrajan, Yogyakarta 55252 &bull; Telp. (0274) 375127</div>
          <div class="kop-line-kontak">Website: www.smamuh3jogja.sch.id &bull; Pos-el: spmb@smamuh3jogja.sch.id</div>
        </div>
      </div>
      <div class="kop-border-double"></div>

      <!-- JUDUL RESMI DOKUMEN -->
      <div class="anekdotal-title-box">
        <h2 class="anekdotal-main-title">ANEKDOTAL RECORD SISWA</h2>
        <div class="anekdotal-sub-title">DOKUMEN HASIL OBSERVASI & WAWANCARA SELEKSI SPMB TA 2026/2027</div>
        <div class="anekdotal-doc-id">No. Berkas: AR-${cId}-${today.replace(/-/g, '')}</div>
      </div>

      <!-- BAGIAN A: IDENTITAS SISWA -->
      <div class="anekdotal-section">
        <div class="section-heading">A. IDENTITAS CALON SISWA</div>
        <table class="anekdotal-table table-identitas">
          <tr>
            <td class="col-label" style="width: 25%;">Nama Lengkap</td>
            <td class="col-sep">:</td>
            <td class="col-val" style="width: 40%; font-weight: 800; font-size: 0.95rem; color: #0f172a;">${cName}</td>
            <td class="col-label" style="width: 15%;">Pilihan Peminatan</td>
            <td class="col-sep">:</td>
            <td class="col-val" style="font-weight: 800; color: #006837;">${jurusan}</td>
          </tr>
          <tr>
            <td class="col-label">Nomor Registrasi</td>
            <td class="col-sep">:</td>
            <td class="col-val"><strong style="color: #006837;">${cId}</strong></td>
            <td class="col-label">NISN</td>
            <td class="col-sep">:</td>
            <td class="col-val">${nisn}</td>
          </tr>
          <tr>
            <td class="col-label">Asal Sekolah</td>
            <td class="col-sep">:</td>
            <td class="col-val" colspan="4">${asalSekolah}</td>
          </tr>
        </table>
      </div>

      <!-- BAGIAN B: INFORMASI PELAKSANAAN WAWANCARA -->
      <div class="anekdotal-section">
        <div class="section-heading">B. INFORMASI PELAKSANAAN WAWANCARA</div>
        <table class="anekdotal-table table-pelaksanaan">
          <tr>
            <td class="col-label" style="width: 25%;">Hari & Tanggal Wawancara</td>
            <td class="col-sep">:</td>
            <td class="col-val" style="width: 35%; font-weight: 700;">${tglWawancaraIndo}</td>
            <td class="col-label" style="width: 20%;">Waktu / Sesi</td>
            <td class="col-sep">:</td>
            <td class="col-val">${jamSesi}</td>
          </tr>
          <tr>
            <td class="col-label">Metode Pelaksanaan</td>
            <td class="col-sep">:</td>
            <td class="col-val">
              <span class="anekdotal-badge-metode ${isDaring ? 'badge-daring' : 'badge-luring'}">
                ${isDaring ? '🌐 Daring (Virtual Online)' : '🏢 Luring (Tatap Muka Langsung)'}
              </span>
            </td>
            <td class="col-label">Pewawancara Bertugas</td>
            <td class="col-sep">:</td>
            <td class="col-val"><strong>${pewawancara}</strong></td>
          </tr>
          <tr>
            <td class="col-label">${isDaring ? 'Platform & Tautan Meeting' : 'Ruangan & Lokasi'}</td>
            <td class="col-sep">:</td>
            <td class="col-val" colspan="4">
              ${isDaring 
                ? `<span>${platform} &bull; ${linkMeeting ? `<span style="font-family: monospace; font-size: 0.8rem;">${linkMeeting}</span>` : '<em>Tautan telah terverifikasi panitia</em>'}</span>`
                : `<span>${ruang} ${lokasiGedung}</span>`}
            </td>
          </tr>
          <tr style="background: #f8fafc;">
            <td class="col-label">Nilai Wawancara Siswa</td>
            <td class="col-sep">:</td>
            <td class="col-val"><strong>${nilaiSiswa !== '-' ? nilaiSiswa + ' / 100' : 'Belum diisi'}</strong></td>
            <td class="col-label">Nilai Wawancara Wali</td>
            <td class="col-sep">:</td>
            <td class="col-val"><strong>${nilaiWali !== '-' ? nilaiWali + ' / 100' : 'Belum diisi'}</strong></td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td class="col-label"><strong>Rata-rata Skor Wawancara</strong></td>
            <td class="col-sep">:</td>
            <td class="col-val" colspan="4">
              <span style="font-size: 1rem; font-weight: 900; color: #006837;">${nilaiRata !== '-' ? nilaiRata + ' / 100' : 'Belum dihitung'}</span>
              <span style="font-size: 0.76rem; color: #64748b; margin-left: 8px;">(Rata-rata skor evaluasi siswa & orang tua/wali)</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- BAGIAN C: HASIL OBSERVASI ASPEK PENILAIAN WAWANCARA (5 ASPEK TAHAP 1) -->
      <div class="anekdotal-section">
        <div class="section-heading">C. HASIL OBSERVASI ASPEK PENILAIAN WAWANCARA</div>
        <table class="anekdotal-table-grid">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No.</th>
              <th style="width: 175px;">Aspek Penilaian</th>
              <th style="width: 110px; text-align: center;">Status Observasi</th>
              <th>Catatan Hasil Observasi Pewawancara</th>
            </tr>
          </thead>
          <tbody>
            ${aspekList.map((aspek, idx) => {
              const isChecked = checkedAspek.includes(aspek.key);
              const note = (catatanAspek[aspek.key] || '').trim();
              const hasNote = note.length > 0;

              return `
                <tr>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                  <td>
                    <strong style="color: #0f172a; font-size: 0.86rem;">${aspek.nama}</strong>
                  </td>
                  <td style="text-align: center;">
                    ${isChecked 
                      ? `<span class="badge-aspek-teramati">✓ Teramati</span>` 
                      : `<span class="badge-aspek-belum">Belum dinilai</span>`}
                  </td>
                  <td style="font-size: 0.84rem; line-height: 1.45;">
                    ${hasNote 
                      ? `<span>${note}</span>` 
                      : `<span style="color: #94a3b8; font-style: italic;">Belum diisi</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- BAGIAN D: HASIL TES AL-QUR'AN & REKOMENDASI BEASISWA TAHFIDZ (TAHAP 2) -->
      <div class="anekdotal-section">
        <div class="section-heading">D. HASIL TES AL-QUR'AN & REKOMENDASI BEASISWA TAHFIDZ</div>
        <table class="anekdotal-table table-tahfidz">
          <tr>
            <td class="col-label" style="width: 25%;">Status Tes Al-Qur'an</td>
            <td class="col-sep">:</td>
            <td class="col-val" style="width: 35%;">
              <span class="anekdotal-badge-tes ${statusTes === 'Sudah Dites' ? 'badge-tes-sudah' : 'badge-tes-belum'}">
                ${statusTes === 'Sudah Dites' ? '✓ Sudah Dites' : '⏳ Belum Dites'}
              </span>
            </td>
            <td class="col-label" style="width: 20%;">Jumlah Hafalan Diuji</td>
            <td class="col-sep">:</td>
            <td class="col-val">
              <strong>${statusTes === 'Sudah Dites' ? `${hafalanTeruji} Juz` : 'Belum diuji'}</strong>
            </td>
          </tr>
          <tr>
            <td class="col-label">Rekomendasi Beasiswa</td>
            <td class="col-sep">:</td>
            <td class="col-val">
              <strong style="color: #006837;">${beasiswaRec.label}</strong>
            </td>
            <td class="col-label">Potongan SPP Sekolah</td>
            <td class="col-sep">:</td>
            <td class="col-val">
              <span style="font-weight: 800; color: #0284c7;">
                ${statusTes === 'Sudah Dites' ? beasiswaRec.nominalFormatted : 'Menunggu Tes Al-Qur\'an'}
              </span>
            </td>
          </tr>
          <tr>
            <td class="col-label">Keterangan Beasiswa</td>
            <td class="col-sep">:</td>
            <td class="col-val" colspan="4" style="font-size: 0.8rem; color: #475569;">
              ${statusTes === 'Sudah Dites' 
                ? (hafalanTeruji > 3 ? 'Hafalan di atas 3 Juz memerlukan konfirmasi lebih lanjut dari Panitia SPMB & Kepala Sekolah.' : 'Rekomendasi potongan SPP telah sesuai dengan pedoman resmi beasiswa tahfidz SMA Muhammadiyah 3.')
                : 'Status beasiswa final akan ditetapkan setelah siswa menjalani tes hafalan Al-Qur\'an langsung di hadapan penguji.'}
            </td>
          </tr>
        </table>
      </div>

      <!-- BAGIAN E: REKOMENDASI AKHIR HASIL WAWANCARA -->
      <div class="anekdotal-section">
        <div class="section-heading">E. REKOMENDASI AKHIR HASIL SELEKSI WAWANCARA</div>
        <div class="rekomendasi-container">
          <div class="rekomendasi-badge-box ${recBadgeClass}">
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85;">Keputusan Wawancara:</div>
            <div style="font-size: 1.15rem; font-weight: 900; margin-top: 2px;">${recLabelText}</div>
          </div>
          <div class="rekomendasi-note-box">
            <strong>Catatan Pertimbangan:</strong>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; line-height: 1.45; color: #334155;">
              ${catatanRekomendasi}
            </p>
          </div>
        </div>
      </div>

      <!-- BAGIAN F: CATATAN PENDAMPINGAN SISWA (TINDAK LANJUT GURU BK & WALI KELAS) -->
      <div class="anekdotal-section">
        <div class="section-heading">F. CATATAN PENDAMPINGAN SISWA (TINDAK LANJUT GURU BK & WALI KELAS)</div>
        <div class="pendampingan-box">
          ${catatanPendampingan 
            ? `<p style="margin: 0; font-size: 0.86rem; line-height: 1.5; color: #1e293b;">${catatanPendampingan}</p>` 
            : `<div class="pendampingan-lines-placeholder">
                 <div style="font-size: 0.78rem; color: #64748b; font-style: italic; margin-bottom: 8px;">
                   (Ruang catatan pendampingan khusus bimbingan konseling, potensi minat bakat, kedisiplinan, dan penguatan karakter):
                 </div>
                 <div class="formal-ruled-line"></div>
                 <div class="formal-ruled-line"></div>
                 <div class="formal-ruled-line"></div>
               </div>`}
        </div>
      </div>

      <!-- BAGIAN G: PENGESAHAN DOKUMEN -->
      <div class="anekdotal-section pengesahan-section" style="margin-top: 1.25rem;">
        <div style="text-align: right; font-size: 0.84rem; margin-bottom: 0.75rem; color: #334155;">
          Yogyakarta, ${tglCetakIndo}
        </div>
        <table class="tanda-tangan-table">
          <tr>
            <td style="width: 33%; text-align: center;">
              <div class="ttd-jabatan">Pewawancara / Penguji,</div>
              <div class="ttd-space"></div>
              <div class="ttd-nama"><strong>${pewawancara}</strong></div>
              <div class="ttd-nip">NIP/NBM: &mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;</div>
            </td>
            <td style="width: 33%; text-align: center;">
              <div class="ttd-jabatan">Guru Bimbingan Konseling (BK),</div>
              <div class="ttd-space"></div>
              <div class="ttd-nama"><strong>Dra. Hj. Siti Fatimah, M.Pd.</strong></div>
              <div class="ttd-nip">NBM: 842.119.04</div>
            </td>
            <td style="width: 33%; text-align: center;">
              <div class="ttd-jabatan">Mengetahui,<br>Koordinator SPMB / Kepala Sekolah,</div>
              <div class="ttd-space"></div>
              <div class="ttd-nama"><strong>Drs. H. Herynugroho, M.Pd.</strong></div>
              <div class="ttd-nip">NBM: 785.421.01</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- FOOTER DOKUMEN KECIL -->
      <div class="anekdotal-doc-footer">
        <div>Dokumen Anekdotal Record ini bersifat rahasia dan menjadi dokumen resmi arsip Bimbingan Konseling & Tata Usaha SMA Muhammadiyah 3 Yogyakarta.</div>
        <div style="text-align: right;">Dicetak otomatis melalui Modul 04 SPMB &bull; Halaman 1 dari 1</div>
      </div>
    </div>
  `;
}

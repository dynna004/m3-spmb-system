# UI/UX Pro Max System Guidelines

Pola pikir dan standar untuk menciptakan antarmuka tingkat lanjut (Production-Grade UI/UX):

## 1. State Handling yang Lengkap (5 UI States)
Setiap komponen dan halaman harus menangani 5 kondisi fundamental:
1. **Empty State**: Tampilkan ilustrasi/ikon ramah, pesan panduan, dan tombol Call-to-Action (CTA) yang jelas, bukan sekadar layar kosong.
2. **Loading State**: Gunakan skeleton loader atau pulsing indicator halus yang proporsional dengan konten aslinya.
3. **Success State**: Berikan umpan balik instan (toast notifikasi, checklist animasi, badge hijau).
4. **Error State**: Pesan error yang membantu pengguna memperbaiki masalah (inline validation pada form, tombol coba lagi / retry).
5. **Partial / Incomplete State**: Berikan indikator progres atau langkah wizard yang jelas.

## 2. Formulir & Interaksi Input
- Label formulir harus selalu terlihat (jangan hanya mengandalkan placeholder teks).
- Validasi instan saat blur/input dengan pesan yang solutif.
- Indikator fokus (`:focus-visible`) wajib jelas dengan cincin outline (`ring`/`outline`) beraksen halus untuk navigasi keyboard.
- Tombol aksi utama (Primary CTA) harus memiliki pembeda visual jelas dibanding tombol sekunder atau batal.

## 3. Komponen Desain Modern
- **Card & Surface**: Gunakan layering elevasi bertingkat (`box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05)`).
- **Badge & Status Tag**: Kombinasi warna latar belakang soft (10-15% opacity) dengan teks berwarna kontras.
- **Table & Data Display**: Zebra striping lembut, sticky header untuk tabel panjang, dan perataan teks angka ke kanan (right-aligned).
- **Bento Grid**: Manfaatkan layout bento box untuk dashboard guna menonjolkan metrik paling bernilai secara visual.

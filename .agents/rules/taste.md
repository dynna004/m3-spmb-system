# Taste - Visual Judgment & Refinement

Pedoman untuk memberikan sentuhan estetika premium ("Visual Taste") pada antarmuka:

## 1. Visual Polish & Kehalusan Detail
- **Border yang Berkelas**: Hindari border hitam pekat atau abu-abu tebal (`#ccc`). Gunakan warna semi-transparan yang menyatu dengan latar belakang, misal `rgba(0, 0, 0, 0.08)` pada light mode atau `rgba(255, 255, 255, 0.1)` pada dark mode.
- **Transisi Halus (Micro-animations)**:
  - Berikan efek hover dengan `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`.
  - Tombol sedikit terangkat (`transform: translateY(-1px)`) saat di-hover dan tertekan (`transform: translateY(0px)`) saat di-klik (`:active`).
- **Radius Sudut yang Konsisten**:
  - Tombol dan badge: `6px - 8px`.
  - Kartu dan modal dialog: `12px - 16px`.
  - Hindari mencampuradukkan border radius yang tajam kotak (0px) dengan yang sangat bulat (pill) secara acak tanpa alasan fungsi.

## 2. Hirarki Ruang & Kerapian (Whitespace Mastery)
- Whitespace bukan area kosong yang harus diisi; whitespace adalah pemisah dan pemandu mata pembaca.
- Jarak antar kelompok elemen terkait harus lebih rapat daripada jarak antar section yang berbeda.
- Pertahankan margin luar halaman yang lega (minimal 24px pada desktop, 16px pada mobile).

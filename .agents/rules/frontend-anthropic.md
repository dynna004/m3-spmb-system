# Frontend Design Principles (Anthropic Standard)

Gunakan pedoman ini setiap kali merancang, memodifikasi, atau merefaktor komponen antarmuka (UI/Frontend):

## 1. Hindari Desain AI Generik ("No AI Slop")
- **Tanpa Default yang Membosankan**: Hindari template generik seperti font Inter standar tanpa bobot bervariasi, gradient ungu-ke-biru standar AI, dan kartu-kartu seragam tanpa diferensiasi hierarki.
- **Tentukan Arah Estetika (Bold & Intentional)**: Sebelum menulis kode CSS/HTML, tentukan identitas visual yang tegas:
  - *Clean Corporate & Crisp*: Garis bersih, monokromatik dengan satu warna aksen kuat, kerapian data tinggi.
  - *Editorial & Refined*: Tipografi kuat dengan kontras skala besar, whitespace luas, grid asimetris terstruktur.
  - *Modern High-Density Dashboard*: Pemadatan informasi yang elegan, kontras status jelas, visual divider halus.

## 2. Tipografi dan Skala Hierarki
- Gunakan font berkarakter (misal: Outfit, Plus Jakarta Sans, Fraunces, Space Grotesk, atau Roboto Mono untuk data angka/kode).
- Skala ukuran teks harus tegas: `h1` (2rem - 2.5rem), `h2` (1.5rem - 1.75rem), `body` (0.95rem - 1rem), `caption/badge` (0.75rem - 0.85rem).
- Atur `line-height` proporsional (1.2 untuk judul, 1.5 - 1.6 untuk teks deskriptif).

## 3. Sistem Warna dan Kontras
- Batasi palet inti menjadi:
  - 1 Warna Brand Utama (Primary).
  - 1-2 Warna Aksen fungsional (Warning, Success, Error).
  - Skala Netral yang kaya (Surface, Border, Text Primary, Text Muted).
- Pastikan rasio kontras teks terhadap latar belakang memenuhi standar WCAG AA (minimal 4.5:1 untuk teks normal).

## 4. Spacing dan Layout
- Gunakan sistem skala konsisten (kelipatan 4px/8px: 4px, 8px, 12px, 16px, 24px, 32px, 48px).
- Berikan ruang napas (generous padding) pada elemen interaktif untuk kenyamanan klik dan tap.
- Desain harus responsif (Mobile-first atau Fluid Layout dengan flexbox dan CSS Grid modern).

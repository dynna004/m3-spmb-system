# Code Review Standards (Anthropic Multi-Agent Protocol)

Protokol audit menyeluruh ketika melakukan review kode, evaluasi diff, atau inspeksi arsitektur:

## 1. Urutan Prioritas Evaluasi
1. **Kebenaran Logika (Correctness) [Skor Keyakinan Tertinggi]**:
   - Penanganan nilai `null`, `undefined`, atau data array/object kosong.
   - Race conditions pada operasi asynchronous / AJAX / fetch.
   - Perhitungan matematis atau manipulasi string/tanggal.
2. **Keamanan (Security)**:
   - Sanitasi input untuk mencegah Cross-Site Scripting (XSS) pada manipulasi `innerHTML`.
   - Penyimpanan credential/token yang aman (hindari hardcode secrets di client-side code).
   - Validasi otorisasi dan kontrol akses.
3. **Performa & Kebocoran Memori (Performance & Resource Leaks)**:
   - Lepaskan event listener jika elemen DOM di-remove atau diganti.
   - Hindari manipulasi DOM berulang-ulang di dalam loop (gunakan DocumentFragment atau batch updates).
   - Debounce / throttle untuk event `scroll`, `resize`, atau `input`.
4. **Kerapian & Keterbacaan (Maintainability & Style)**:
   - Penamaan fungsi dan variabel yang merefleksikan fungsinya dengan jelas.
   - Modularitas: Satu fungsi hanya bertanggung jawab atas satu tugas spesifik.

## 2. Format Pelaporan Review
Setiap temuan harus dilaporkan dengan format:
- **Tingkat Keparahan**: `[CRITICAL]` | `[WARNING]` | `[IMPROVEMENT]`
- **Lokasi**: File dan baris terkait.
- **Masalah**: Penjelasan ringkas apa yang salah dan risikonya.
- **Rekomendasi / Solusi Kode**: Contoh potongan kode perbaikan langsung.

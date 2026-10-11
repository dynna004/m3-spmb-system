# Ponytail - Anti-Over-Engineering & Code Restraint

Filosofi "Senior Developer Pragmatis" untuk mencegah over-engineering, menjaga kode tetap ringkas, dan memangkas token AI:

## 1. Tangga 7 Langkah Sebelum Menulis Kode (Seven-Rung Ladder)
Sebelum menambahkan kode atau paket baru, tanyakan secara berurutan:
1. **Apakah fitur ini benar-benar dibutuhkan sekarang?** (YAGNI - You Ain't Gonna Need It).
2. **Bisakah diselesaikan dengan fitur native bahasa pemrograman?** (Vanilla JS, standard Web APIs, built-in array methods).
3. **Bisakah diselesaikan hanya dengan CSS murni tanpa manipulasi DOM JS?** (misal: `:checked` accordion, CSS Grid/Flexbox, CSS transitions).
4. **Apakah sudah ada fungsi serupa di codebase yang dapat digunakan kembali?**
5. **Apakah abstraksi ini terlalu dini?** (Jangan buat factory pattern, generic class, atau 5 lapis file jika fungsi 20 baris sudah menyelesaikan masalah).
6. **Apakah ada potensi dependensi bloatware?** Hindari menginstal package besar hanya untuk 1 helper function kecil.
7. **Apakah arsitekturnya mudah dipahami oleh developer lain dalam 5 menit?**

## 2. Prinsip Implementasi
- Tulis kode yang langsung to-the-point, jelas, dan terbaca.
- Hindari konfigurasi berlebih dan boilerplate yang tidak perlu.
- Prioritaskan stabilitas dan kemudahan debugging daripada teknik koding yang rumit (clever code).

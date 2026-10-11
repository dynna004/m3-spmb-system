**Lembar Kerja 4 (Perencanaan Proyek TI: Scope, Tujuan, dan Deliverables)**

**Mata Kuliah Praktikum Manajemen Sistem Informasi**

Dosen Pengampu: Dr. Ratna Wardani M.T.

**Disusun Oleh:** 

| Raudhatul Audyna | 24050530050 |
| :---- | :---: |
| **Yosa Ekawati Alya Putri** | **24050530035** |
| **Novelia Harlinda** | **24050530045** |

**DEPARTEMEN PENDIDIKAN TEKNIK ELEKTRONIKA DAN INFORMATIKA** 

**FAKULTAS TEKNIK**  

**UNIVERSITAS NEGERI YOGYAKARTA**  

**2026**

1. # **Identitas Laporan**

| Field | Isian |
| ----- | ----- |
| **Nama Kelompok** | Kelompok 2 |
| **Anggota (NIM/Nama)** | Raudhatul Audyna (24050530050) Yosa Ekawati Alya Putri (24050530035) Novelia Harlinda (24050530045) |
| **Pertemuan Ke-** | 4 |
| **Tanggal Pelaksanaan** | 24/08/2026 |
| **Organisasi/Kasus yang Digunakan** | Sistem Informasi Manajemen Pendaftaran Siswa Baru pada SMA Muhammadiyah 3 Yogyakarta |
| **Studi Kasus** | SMA Muhammadiyah 3 Yogyakarta |

### 

2. # **Tujuan Kegiatan**

Mahasiswa mampu merumuskan tujuan proyek, menetapkan ruang lingkup, menentukan deliverables beserta kriteria penerimaannya, serta mengidentifikasi asumsi dan batasan proyek sistem informasi berdasarkan masalah prioritas organisasi, sebagai dasar perencanaan dan pengembangan sistem informasi.

3. # **Uraian Pelaksanaan Kegiatan**

1. ## **Perumusan Tujuan Proyek**

Perumusan tujuan proyek diawali dengan menetapkan masalah prioritas M2, yaitu adanya **penginputan ulang data peserta didik antara Unit SPMB dan bagian administrasi/TU yang dipengaruhi oleh kekhawatiran terhadap keamanan dan potensi kebocoran data**. Data peserta didik yang telah divalidasi dalam proses SPMB masih perlu direkap dan diserahkan kepada TU, kemudian digunakan kembali untuk pencatatan administrasi. Kondisi tersebut menyebabkan tambahan beban kerja bagi bagian administrasi/TU dan meningkatkan risiko kesalahan dalam pencatatan data. Selain itu, kondisi tersebut menunjukkan adanya permasalahan dalam pemanfaatan data antarbagian yang tidak hanya berkaitan dengan sistem, tetapi juga dengan kekhawatiran SDM administrasi TU terhadap keamanan data peserta didik.

Selanjutnya dilakukan analisis terhadap kebutuhan informasi untuk mengetahui informasi yang diperlukan dalam mengatasi masalah tersebut. Informasi yang dibutuhkan berupa data peserta didik yang telah divalidasi dalam proses SPMB, dengan pengguna utama Unit SPMB dan TU. Data tersebut digunakan TU untuk mendukung proses administrasi dan pengelolaan peserta didik baru. Pemanfaatan data tersebut tetap perlu mempertimbangkan aspek keamanan dan pengelolaan akses agar dapat mengurangi kekhawatiran SDM Administrasi TU terhadap risiko kebocoran data.

Setelah itu dianalisis proses informasi, mulai dari data peserta didik diinput melalui sistem SPMB, disimpan, diverifikasi dan diperbaiki apabila terdapat kesalahan, dipantau oleh panitia SPMB, kemudian direkap dan dicetak untuk diserahkan kepada TU. Data tersebut selanjutnya digunakan TU untuk daftar ulang, pencatatan administrasi peserta didik baru, penentuan kelas, penentuan minat dan bakat, serta pencatatan kontak emergensi. Rangkaian tersebut menunjukkan bahwa data peserta didik sebenarnya telah tersedia dan melalui proses validasi sebelum digunakan oleh TU. Analisis ini menunjukkan bahwa kebutuhan utama proyek adalah mendukung pemanfaatan data yang telah divalidasi agar dapat digunakan oleh TU tanpa pencatatan ulang, dengan mekanisme yang dapat memberikan rasa aman bagi SDM Administrasi TU dalam mengakses dan memanfaatkan data tersebut.

Berdasarkan hasil analisis tersebut, tujuan proyek kemudian dirumuskan menggunakan prinsip ***SMART, yaitu Specific, Measurable, Achievable, Relevant, dan Time-bound.*** Modul MSI menekankan bahwa tujuan perlu menunjukkan pengguna yang didukung, informasi atau proses yang didukung, ukuran keberhasilan, dan batas waktu pencapaiannya. Prinsip tersebut digunakan agar tujuan proyek tidak hanya berfokus pada perubahan pada sistem, tetapi juga dapat menjawab kebutuhan organisasi dalam pemanfaatan data peserta didik. Dengan demikian, tujuan proyek diarahkan untuk mendukung pemanfaatan data antara Unit SPMB dan TU secara lebih efektif dengan tetap memperhatikan aspek keamanan data dan kebutuhan SDM yang terlibat.

2. ## **Penetapan In-Scope dan Penetapan Out-of-Scope** 

### **Tabel Scope Informasi**

| Dimensi | Pertanyaan | Kasus M2 |
| ----- | ----- | ----- |
| **Informasi** | Informasi apa yang diperlukan? | Data peserta didik yang telah divalidasi dalam proses SPMB dan diperlukan oleh TU untuk proses administrasi peserta didik baru. |
| **Pengguna** | Siapa yang menggunakan informasi? | Unit SPMB dan bagian administrasi/TU. |
| **Tujuan penggunaan** | Untuk keputusan/aktivitas apa? | Untuk mendukung proses administrasi dan pengelolaan data peserta didik baru oleh TU. |
| **Sumber** | Dari mana informasi berasal? | Data yang diinput oleh calon peserta didik/orang tua melalui laman SPMB, kemudian divalidasi oleh Unit SPMB. |
| **Waktu** | Kapan informasi diperlukan? | Selama proses SPMB, setelah peserta dinyatakan diterima, saat daftar ulang, dan selama proses administrasi peserta didik baru. |
| **Bentuk** | Bagaimana informasi disajikan? | Dalam bentuk tabel atau daftar data peserta didik yang dapat digunakan untuk kebutuhan administrasi TU. |

### **Tabel Scope Proses Informasi**

| Tahap Proses Informasi | Pertanyaan MSI | Kasus M2 |
| ----- | ----- | ----- |
| Input | Informasi awal apa yang masuk? | Data peserta didik yang diinput oleh calon peserta didik/orang tua melalui sistem SPMB. |
| Pencatatan | Bagaimana informasi disimpan? | Data peserta didik tersimpan dalam sistem SPMB. |
| Pemutakhiran | Siapa dan bagaimana status diperbarui? | Panitia SPMB bersama peserta didik melakukan verifikasi data. Jika terdapat kesalahan, data diperbaiki melalui sistem SPMB. |
| Monitoring | Siapa memantau dan apa yang dilihat? | Panitia SPMB melakukan pemantauan terhadap data dan status peserta didik selama proses SPMB. |
| Pelaporan | Informasi apa yang perlu diringkas? | Rekap data peserta didik hasil proses SPMB yang dicetak dan diserahkan kepada TU. |
| Keputusan/Tindakan | Bagaimana informasi digunakan? | Data digunakan oleh TU untuk proses daftar ulang, pencatatan administrasi peserta didik baru, penentuan kelas, penentuan minat dan bakat, serta pencatatan kontak emergensi. |

### **Tabel Penerjemah Masalah Scope MSI**

| Tahap | Hasil analisis |
| ----- | ----- |
| **Masalah organisasi** | Duplikasi pengelolaan data peserta didik antara Unit SPMB dan bagian administrasi/TU menyebabkan data yang telah divalidasi perlu dicatat kembali, sehingga meningkatkan beban kerja dan risiko kesalahan pencatatan data. **Selain itu, penginputan ulang tersebut terjadi karena adanya kekhawatiran dari SDM administrasi/TU terhadap keamanan data peserta didik dan risiko kebocoran apabila data dari Unit SPMB dimanfaatkan secara langsung oleh bagian administrasi/TU.** |
| **Dampak** | Meningkatkan beban kerja TU, terutama karena data peserta didik perlu dicatat kembali, serta meningkatkan risiko kesalahan pencatatan dan kebutuhan pemeriksaan atau koreksi ulang. Selain itu, adanya kekhawatiran SDM administrasi/TU terhadap keamanan dan risiko kebocoran data menyebabkan data dari Unit SPMB belum dapat dimanfaatkan secara langsung oleh TU. |
| **Kebutuhan keputusan** | TU membutuhkan data peserta didik yang telah divalidasi untuk pencatatan dan penetapan administrasi peserta didik baru, yang selanjutnya digunakan dalam daftar ulang, penentuan kelas, penentuan minat dan bakat, serta pencatatan kontak emergensi. Dalam pemanfaatan data tersebut, diperlukan pertimbangan terkait keamanan data dan pengelolaan akses agar kekhawatiran SDM administrasi/TU terhadap risiko kebocoran data dapat diperhatikan. |
| **Kebutuhan informasi** | Data peserta didik yang telah divalidasi dalam proses SPMB dan diperlukan TU untuk proses administrasi peserta didik baru, beserta kebutuhan informasi mengenai pengamanan dan pengelolaan akses terhadap data tersebut agar dapat dimanfaatkan oleh TU tanpa menimbulkan kekhawatiran terhadap risiko kebocoran data. |
| **Proses informasi** | Input → pencatatan → pemutakhiran/validasi → monitoring → pelaporan → pengelolaan akses data → penggunaan oleh TU untuk proses administrasi dan penetapan peserta didik baru. |
| **Scope MSI** | Mendukung akses dan pemanfaatan data peserta didik hasil SPMB yang telah divalidasi oleh TU tanpa perlu melakukan input atau pencatatan ulang, dengan memperhatikan pengelolaan akses dan keamanan data peserta didik untuk mengurangi kekhawatiran SDM administrasi/TU terhadap risiko kebocoran data. |
| **Di luar scope** | Perubahan terhadap proses SPMB dan proses validasi data peserta didik yang dilakukan Unit SPMB, serta perubahan terhadap proses utama penerimaan peserta didik pada Unit SPMB. |

4. # **Hasil/Artefak Praktikum**

| Bagian | Isian |
| ----- | ----- |
| **Tujuan Proyek (SMART)** | Menyediakan rancangan sistem informasi berbasis web yang mendukung Unit SPMB dan TU dalam mengakses dan memanfaatkan data peserta didik yang telah divalidasi tanpa pencatatan ulang, dengan target minimal 90% data peserta didik dapat digunakan TU tanpa input ulang dalam satu semester akademik.  |
| **In-scope** | Perancangan sistem informasi berbasis web untuk mendukung pengelolaan dan akses data peserta didik hasil SPMB yang telah divalidasi; penyediaan akses data bagi Unit SPMB dan TU; pemanfaatan data hasil SPMB oleh TU untuk kebutuhan administrasi peserta didik baru; perancangan pengelolaan akses terhadap data peserta didik sesuai kebutuhan Unit SPMB dan TU untuk memperhatikan aspek keamanan data; serta pembuatan prototipe dan pengujian/demo menggunakan data dummy. |
| **Out-of-scope** | Perubahan terhadap proses SPMB dan proses validasi data yang dilakukan Unit SPMB; implementasi sistem pada lingkungan sekolah; penggunaan data peserta didik sebenarnya; penerapan kebijakan keamanan data sekolah secara langsung di lingkungan operasional sekolah; serta pengelolaan proses di luar kebutuhan pemanfaatan data peserta didik baru oleh TU.  |
| **Daftar Deliverables dan Kriteria Penerimaan**  | **Rancangan sistem informasi berbasis web**  rancangan mencakup kebutuhan informasi, pengguna, pengolahaan akses,  dan alur proses sesuai scope.  **Prototipe sistem informasi berbasis web**  dapat mendemonstrasikan akses dan pemanfaatan data peserta didik yang telah divalidasi oleh TU tanpa pencatatan ulang pada alur yang diuji, serta menunjukkan pengelolaan akses data sesuai kebutuhan pengguna yang telah ditentukan. **Hasil pengujian/demo prototipe**  mendokumentasikan hasil pengujian alur yang termasuk scope, termasuk pengujian akses dan pemanfaatan data oleh pengguna yang telah ditentukan. **Dokumentasi/panduan sistem**  menjelaskan penggunaan prototipe oleh Unit SPMB dan TU, termasuk penggunaan akses terhadap data peserta didik sesuai dengan peran pengguna yang ditentukan. |
| **Asumsi**  | Data yang diperlukan untuk mendemonstrasikan kebutuhan sistem dapat direpresentasikan menggunakan data dummy; kebutuhan informasi Unit SPMB dan TU dapat direpresentasikan berdasarkan hasil analisis kasus; kebutuhan pengelolaan akses dapat direpresentasikan berdasarkan kebutuhan pengguna dan kekhawatiran SDM administrasi/TU terhadap keamanan data; serta rancangan/prototipe dapat digunakan untuk mendemonstrasikan alur pemanfaatan data tanpa implementasi langsung di sekolah. |
| **Batasan (Constraints)**  | Proyek hanya menghasilkan rancangan dan prototipe/demo, bukan implementasi sistem pada sekolah; data peserta didik yang digunakan dalam demo berupa data dummy karena data sekolah bersifat rahasia; pengujian dilakukan pada lingkungan demo, bukan pada lingkungan operasional sekolah; pengujian keamanan yang dilakukan terbatas pada pengelolaan akses dalam prototipe dan tidak mencakup pengujian keamanan pada infrastruktur sekolah secara langsung; dan proyek dikerjakan dalam batas waktu tiga bulan. |

1. ## **Identifikasi Masalah Prioritas** 

| Masalah | Duplikasi pengelolaan data peserta didik antara Unit SPMB dan bagian administrasi/TU menyebabkan data yang telah divalidasi perlu dicatat kembali, sehingga meningkatkan beban kerja dan risiko kesalahan pencatatan data. Selain itu, penginputan ulang tersebut terjadi karena adanya kekhawatiran dari SDM administrasi/TU terhadap keamanan data peserta didik dan risiko kebocoran apabila data dari Unit SPMB dimanfaatkan secara langsung oleh bagian administrasi/TU. |
| :---- | :---- |
| **Alasan** | Berdasarkan hasil Impact–Effort Matrix, M2 yaitu duplikasi pengelolaan data murid antara Unit SPMB dan bagian administrasi diprioritaskan sebagai masalah utama. Masalah tersebut memiliki dampak sangat tinggi terhadap pengelolaan data dengan upaya penanganan pada tingkat sedang. **Kondisi ini juga dipengaruhi oleh kekhawatiran SDM administrasi/TU terhadap keamanan dan risiko kebocoran data apabila data SPMB dimanfaatkan secara langsung.** Oleh karena itu,  M2 dipilih sebagai fokus utama untuk dianalisis dan dirumuskan alternatif solusinya. |

2. ## **Penetapan Deliverables**

| No. | Deliverable | Kriteria Penerimaan |
| ----- | ----- | ----- |
| 1 | **Rancangan sistem informasi berbasis web** | Rancangan menggambarkan kebutuhan informasi, pengguna, alur proses, dan akses data peserta didik hasil SPMB sesuai scope proyek. |
| 2 | **Prototipe sistem informasi berbasis web** | Prototipe dapat mendemonstrasikan Unit SPMB mengelola/menyediakan data peserta didik yang telah divalidasi dan TU mengakses serta menggunakan data tersebut tanpa pencatatan ulang pada alur yang didemonstrasikan. |
| 3 | **Hasil pengujian prototipe** | Hasil pengujian mendokumentasikan ketercapaian alur yang menjadi scope, termasuk penggunaan data oleh TU tanpa input ulang. |
| 4 | **Dokumentasi/panduan sistem** | Tersedia dokumentasi yang menjelaskan alur dan penggunaan prototipe oleh Unit SPMB dan TU. |

3. ### **Penentuan In-Scope**

| In-Scope | Penjelasan |
| ----- | ----- |
| **Perancangan sistem informasi berbasis web** | Merancang sistem yang mendukung akses dan pemanfaatan data peserta didik hasil SPMB. |
| **Pengelolaan data peserta didik hasil SPMB** | Mendukung data peserta didik yang telah melalui proses validasi SPMB agar dapat dimanfaatkan dalam proses administrasi. |
| **Akses data oleh Unit SPMB dan TU** | Menyediakan akses informasi yang dibutuhkan oleh Unit SPMB dan TU sesuai perannya. |
| **Pemanfaatan data oleh TU** | Mendukung penggunaan data untuk daftar ulang, pencatatan administrasi peserta didik baru, penentuan kelas, penentuan minat dan bakat, serta pencatatan kontak emergensi. |
| **Prototipe/demo** | Membuat prototipe berbasis web menggunakan data dummy untuk mendemonstrasikan alur pemanfaatan data. |
| **Pengujian pada lingkungan demo** | Menguji apakah alur yang dirancang dapat mendukung penggunaan data oleh TU tanpa pencatatan ulang. |

   

4. ### **Penentuan Out-Scope**

| Out-of-Scope | Alasan |
| ----- | ----- |
| **Perubahan proses SPMB yang sedang berjalan** | Proyek berfokus pada pemanfaatan data hasil SPMB, bukan mengubah proses SPMB. |
| **Perubahan proses validasi data oleh Unit SPMB** | Validasi tetap dilakukan sebagaimana proses yang sudah ada. |
| **Implementasi sistem pada lingkungan operasional sekolah** | Proyek hanya sampai rancangan dan demo/prototipe. |
| **Penggunaan data peserta didik sebenarnya** | Data sekolah bersifat rahasia sehingga demo menggunakan data dummy. |
| **Pengelolaan proses di luar kebutuhan administrasi peserta didik baru** | Tidak berkaitan langsung dengan masalah prioritas M2. |

5. ## **Tujuan Proyek (SMART)** 

| Kriteria | Isi |
| ----- | ----- |
| **Spesific (Spesifik)** | Menyediakan fitur pengelolaan dan akses data peserta didik terintegrasi untuk Unit SPMB dan TU  |
| **Measureable (Terukur)** | Minimal 90% data peserta didik dapat digunakan TU tanpa input/pencatatan ulang  |
| **Achievable (Dapat Dicapai)** | Dikerjakan dalam batas sumber daya dan waktu proyek tiga bulan  |
| **Relevant (Relevan)** | Menangani duplikasi pengelolaan data antara Unit SPMB dan bagian administrasi  |
| **Time-Bound (Berbatas Waktu)** | Dalam tiga bulan |

   

5. # **Kendala dan Solusi**

Kendala yang ditemui dalam pengerjaan Modul 4 adalah menentukan bagian yang termasuk in-scope dan out-of-scope agar tetap sesuai dengan permasalahan yang telah diprioritaskan. Selain itu, diperlukan pertimbangan untuk memastikan hubungan antara permasalahan, tujuan proyek, scope, dan deliverables tetap logis dan tidak keluar dari fokus proyek. Khususnya, ruang lingkup perlu tetap mencakup permasalahan penginputan ulang data peserta didik serta kekhawatiran SDM administrasi/TU terhadap keamanan dan risiko kebocoran data apabila data dari Unit SPMB dimanfaatkan secara langsung. Oleh karena itu, penentuan scope perlu mempertimbangkan kebutuhan pemanfaatan data tanpa mengabaikan aspek keamanan data yang menjadi bagian dari permasalahan utama.

Solusi yang dilakukan adalah meninjau kembali permasalahan prioritas dan tujuan proyek sebagai dasar dalam menentukan in-scope dan out-of-scope. Setiap bagian scope diperiksa berdasarkan keterkaitannya dengan permasalahan dan tujuan proyek, sehingga bagian yang tidak secara langsung mendukung penyelesaian masalah dapat dimasukkan ke dalam out-of-scope. Aspek pengelolaan akses data dimasukkan dalam in-scope karena berkaitan dengan kekhawatiran SDM administrasi/TU terhadap keamanan data, sedangkan implementasi keamanan pada lingkungan operasional sekolah tetap berada di luar scope. Hubungan antara scope dan deliverables juga diperiksa kembali agar hasil perencanaan proyek tetap logis dan saling berkaitan.

6. # **Refleksi Pembelajaran**

Melalui Modul 4, saya memahami bahwa menentukan scope proyek tidak hanya berdasarkan sistem atau fitur yang ingin dibuat, tetapi harus disesuaikan dengan permasalahan organisasi dan tujuan yang ingin dicapai. Saya juga belajar bahwa in-scope dan out-of-scope perlu ditentukan dengan jelas agar batas proyek tidak terlalu luas. Selain itu, saya memahami bahwa permasalahan penginputan ulang data peserta didik tidak hanya berkaitan dengan proses sistem, tetapi juga dengan kekhawatiran SDM administrasi/TU terhadap keamanan dan risiko kebocoran data. Oleh karena itu, saya memahami pentingnya menjaga kelogisan hubungan antara permasalahan, tujuan, scope, dan deliverables agar proyek dapat menjawab kebutuhan organisasi tanpa keluar dari fokus yang telah ditetapkan.

7. # **Kesimpulan**

Modul 4 memberikan pemahaman mengenai perencanaan proyek TI melalui penentuan tujuan, scope, dan deliverables. Hasil perencanaan perlu memiliki batas yang jelas antara bagian yang termasuk dalam scope dan bagian yang berada di luar scope serta tetap memiliki keterkaitan dengan permasalahan prioritas. Dalam proyek ini, permasalahan tersebut mencakup penginputan ulang data peserta didik yang meningkatkan beban kerja dan risiko kesalahan pencatatan, serta kekhawatiran SDM administrasi/TU terhadap keamanan dan risiko kebocoran data. Dengan adanya penentuan tersebut, proyek dapat lebih terarah dan hasil yang direncanakan dapat disesuaikan dengan tujuan untuk mendukung pemanfaatan data peserta didik oleh TU tanpa mengabaikan aspek keamanan data.

**DAFTAR PUSTAKA**

Laudon, K. C., & Laudon, J. P. (2014). *Management information systems:  Managing the digital firm* (13th ed.). Pearson.

Wardani, R. (2026). *Modul praktikum Manajemen Sistem Informasi (PTF60234)*. Fakultas Teknik, Universitas Negeri Yogyakarta.


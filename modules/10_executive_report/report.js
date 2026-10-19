/**
 * Modul 10: Executive Reporting — Dashboard Laporan Pimpinan
 * SMA Muhammadiyah 3 Yogyakarta | Developer: Novelia
 * Alur 16: Rekapitulasi Analitik Eksekutif
 * Layer: Presentation | Strategi: Waterfall
 *
 * [MOCK-UP MODE] Data dummy mandiri — tidak tersambung ke SSoT/LocalStorage modul lain.
 */

// ─── CSS Injection ────────────────────────────────────────────────────────────
function injectModuleStyles() {
  if (!document.getElementById('ex-report-styles')) {
    const link = document.createElement('link');
    link.id   = 'ex-report-styles';
    link.rel  = 'stylesheet';
    const base = import.meta.url.replace(/\/[^/]+$/, '');
    link.href  = `${base}/report.css`;
    document.head.appendChild(link);
  }
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────
const fmt = {
  currency: (n)        => 'Rp ' + Number(n).toLocaleString('id-ID'),
  pct:      (n, total) => total ? ((n / total) * 100).toFixed(1) + '%' : '0%',
  date:     ()         => new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
};

// ─── [MOCK-UP] Data Dummy Mandiri ─────────────────────────────────────────────
// Data ini sepenuhnya mandiri, tidak membaca localStorage modul lain.
// Merepresentasikan kondisi SPMB SMA Muhammadiyah 3 Yogyakarta TA 2026/2027
// pada tahap akhir proses (setelah sebagian besar alur 1-15 selesai).
const DUMMY_ANALYTICS = {
  // ── Pengaturan Sistem ──
  tahunAjaran: '2026/2027',
  kuotaMIPA:   140,
  kuotaIPS:    105,

  // ── Funnel Konversi (Alur 1 → 16) ──
  total:    287,   // Total mendaftar (online + offline)
  aktif:    274,   // Akun diaktivasi oleh Admin SPMB (Modul 02)
  lunas:    261,   // Lunas biaya formulir pendaftaran (Modul 03 – Alur 7)
  lulus:    228,   // Dinyatakan LULUS seleksi (Modul 05 – Alur 9a)
  cadangan:  19,   // Status CADANGAN
  tidakLulus: 14,  // Tidak lulus seleksi
  dafulang:  198,  // Selesai daftar ulang & verifikasi berkas fisik (Modul 06)
  locked:    183,  // Data dikunci VERIFIED_LOCKED ke SSoT (Modul 07)

  // ── Distribusi Jurusan ──
  lulusMIPA: 124,  // Lulus & diterima di jurusan MIPA
  lulusIPS:  104,  // Lulus & diterima di jurusan IPS

  // ── Keuangan ──
  // Biaya formulir: Rp 350.000 per pendaftar yang lunas
  // Uang pangkal:   Rp 4.500.000 per siswa yang menyelesaikan daftar ulang
  totalFormulir:    91350000,   // 261 × Rp 350.000
  totalUangPangkal: 891000000,  // 198 × Rp 4.500.000
  totalPenerimaan:  982350000,  // Total gabungan

  // ── Demografi Asal Sekolah (Top 8) ──
  sekolahRanked: [
    ['SMP Muhammadiyah 1 Yogyakarta',    52],
    ['SMP Muhammadiyah 2 Yogyakarta',    38],
    ['SMP Negeri 5 Yogyakarta',          34],
    ['SMP Negeri 8 Yogyakarta',          27],
    ['SMP IT Abu Bakar Yogyakarta',      24],
    ['MTs Negeri 1 Yogyakarta',          21],
    ['SMP Negeri 12 Yogyakarta',         19],
    ['SMP & Sekolah Lain (Luar Kota)',   72],
  ],

  // ── Trend Bulanan Pendaftaran (untuk info strip) ──
  puncakPendaftaran: 'Agustus 2026',
  metodeLuring:  171,  // 59.6% Wawancara Luring
  metodeDaring:  116,  // 40.4% Wawancara Daring

  // ── Beasiswa Tahfidz ──
  beasiswaPenuh:   12,  // >= 15 Juz
  beasiswaParsial: 47,  // 1–14 Juz

  // ── Data Historis 5 Tahun Terakhir (TA 2022/2023 - 2026/2027) ──
  historical5Years: [
    {
      tahun: '2022/2023',
      label: '2022',
      pendaftar: 207,
      diterima: 175,
      formulir: 72450000,
      uangPangkal: 625000000,
      pendapatan: 697450000,
      mipa: 110,
      ips: 97
    },
    {
      tahun: '2023/2024',
      label: '2023',
      pendaftar: 226,
      diterima: 188,
      formulir: 79100000,
      uangPangkal: 688500000,
      pendapatan: 767600000,
      mipa: 122,
      ips: 104
    },
    {
      tahun: '2024/2025',
      label: '2024',
      pendaftar: 248,
      diterima: 204,
      formulir: 86800000,
      uangPangkal: 760500000,
      pendapatan: 847300000,
      mipa: 138,
      ips: 110
    },
    {
      tahun: '2025/2026',
      label: '2025',
      pendaftar: 265,
      diterima: 216,
      formulir: 92750000,
      uangPangkal: 823500000,
      pendapatan: 916250000,
      mipa: 149,
      ips: 116
    },
    {
      tahun: '2026/2027',
      label: '2026',
      pendaftar: 287,
      diterima: 228,
      formulir: 91350000,
      uangPangkal: 891000000,
      pendapatan: 982350000,
      mipa: 164,
      ips: 123
    }
  ]
};

// ─── Analytics Builder (dari data dummy) ────────────────────────────────────
function buildAnalytics() {
  return DUMMY_ANALYTICS;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function renderSkeleton() {
  return `
    <div class="ex-module-wrapper">
      <div class="ex-header-banner" style="min-height:140px;">
        <div class="ex-header-inner">
          <div>
            <div class="ex-skeleton" style="width:200px;height:18px;margin-bottom:12px;"></div>
            <div class="ex-skeleton" style="width:340px;height:32px;margin-bottom:8px;"></div>
            <div class="ex-skeleton" style="width:260px;height:16px;"></div>
          </div>
        </div>
      </div>
      <div class="ex-content-area">
        <div class="ex-kpi-grid">
          ${Array(5).fill('').map(() => `
            <div class="ex-kpi-card" style="padding:1.4rem 1.5rem;">
              <div class="ex-skeleton" style="width:40px;height:40px;border-radius:10px;margin-bottom:14px;"></div>
              <div class="ex-skeleton" style="width:70px;height:34px;margin-bottom:10px;"></div>
              <div class="ex-skeleton" style="width:90%;height:13px;margin-bottom:6px;"></div>
              <div class="ex-skeleton" style="width:70%;height:13px;"></div>
            </div>
          `).join('')}
        </div>
        <div class="ex-analytics-grid" style="margin-top:1.5rem;">
          ${Array(4).fill('').map(() => `
            <div class="ex-panel">
              <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(0,0,0,0.07);">
                <div class="ex-skeleton" style="width:60%;height:16px;"></div>
              </div>
              <div style="padding:1.5rem;">
                <div class="ex-skeleton" style="height:120px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ─── KPI Bento Grid ───────────────────────────────────────────────────────────
function buildKPIGrid(a) {
  const cards = [
    {
      color: 'kpi-green', icon: '👥',
      value: a.total.toLocaleString('id-ID'),
      label: 'Total Pendaftar',
      trend: 'up',
      trendLabel: 'Tahun Ajaran ' + a.tahunAjaran
    },
    {
      color: 'kpi-blue', icon: '✅',
      value: a.aktif.toLocaleString('id-ID'),
      label: 'Akun Aktif & Terverifikasi',
      trend: 'up',
      trendLabel: fmt.pct(a.aktif, a.total) + ' dari total pendaftar'
    },
    {
      color: 'kpi-gold', icon: '💰',
      value: a.lunas.toLocaleString('id-ID'),
      label: 'Lunas Biaya Formulir',
      trend: 'up',
      trendLabel: fmt.pct(a.lunas, a.total) + ' konversi pembayaran'
    },
    {
      color: 'kpi-green', icon: '🎓',
      value: a.lulus.toLocaleString('id-ID'),
      label: 'Peserta Dinyatakan LULUS',
      trend: 'up',
      trendLabel: fmt.pct(a.lulus, a.total) + ' overall passing rate'
    },
    {
      color: 'kpi-purple', icon: '🔒',
      value: a.locked.toLocaleString('id-ID'),
      label: 'Data Dikunci (VERIFIED_LOCKED)',
      trend: 'neu',
      trendLabel: fmt.pct(a.locked, a.lulus) + ' dari siswa lulus'
    }
  ];

  return cards.map(c => `
    <div class="ex-kpi-card ${c.color}">
      <span class="ex-kpi-icon">${c.icon}</span>
      <div class="ex-kpi-value">${c.value}</div>
      <div class="ex-kpi-label">${c.label}</div>
      <span class="ex-kpi-trend ${c.trend}">${c.trend === 'up' ? '▲' : '—'} ${c.trendLabel}</span>
    </div>
  `).join('');
}

// ─── Quota Progress Panel ─────────────────────────────────────────────────────
function buildQuotaPanel(a) {
  const pctMIPA  = Math.min(100, (a.lulusMIPA / a.kuotaMIPA * 100)).toFixed(1);
  const pctIPS   = Math.min(100, (a.lulusIPS  / a.kuotaIPS  * 100)).toFixed(1);
  const sisaMIPA = Math.max(0, a.kuotaMIPA - a.lulusMIPA);
  const sisaIPS  = Math.max(0, a.kuotaIPS  - a.lulusIPS);
  const totalBeasiswa = a.beasiswaPenuh + a.beasiswaParsial;

  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">🏫 Keterisian Kuota Jurusan</span>
      <span class="ex-panel-badge">Real-time</span>
    </div>
    <div class="ex-panel-body">
      <div class="ex-quota-item">
        <div class="ex-quota-header">
          <span class="ex-quota-label">MIPA (Matematika & IPA)</span>
          <span class="ex-quota-stat"><strong>${a.lulusMIPA}</strong> / ${a.kuotaMIPA} siswa</span>
        </div>
        <div class="ex-progress-track">
          <div class="ex-progress-fill mipa" id="prog-mipa" style="width:0%"></div>
        </div>
        <div class="ex-quota-detail">
          <span>Terisi ${pctMIPA}%</span>
          <span>Sisa ${sisaMIPA} kursi tersedia</span>
        </div>
      </div>

      <div class="ex-quota-item">
        <div class="ex-quota-header">
          <span class="ex-quota-label">IPS (Ilmu Pengetahuan Sosial)</span>
          <span class="ex-quota-stat"><strong>${a.lulusIPS}</strong> / ${a.kuotaIPS} siswa</span>
        </div>
        <div class="ex-progress-track">
          <div class="ex-progress-fill ips" id="prog-ips" style="width:0%"></div>
        </div>
        <div class="ex-quota-detail">
          <span>Terisi ${pctIPS}%</span>
          <span>Sisa ${sisaIPS} kursi tersedia</span>
        </div>
      </div>

      <!-- Ring stats -->
      <div class="ex-ring-row">
        <div class="ex-ring-item">
          <div class="ex-ring-value" style="color:#006837;">${a.lulusMIPA}</div>
          <div class="ex-ring-pct">Lulus MIPA</div>
        </div>
        <div class="ex-ring-item">
          <div class="ex-ring-value" style="color:#0369a1;">${a.lulusIPS}</div>
          <div class="ex-ring-pct">Lulus IPS</div>
        </div>
        <div class="ex-ring-item">
          <div class="ex-ring-value" style="color:#f5a623;">${a.cadangan}</div>
          <div class="ex-ring-pct">Cadangan</div>
        </div>
        <div class="ex-ring-item">
          <div class="ex-ring-value" style="color:#dc2626;">${a.tidakLulus}</div>
          <div class="ex-ring-pct">Tidak Lulus</div>
        </div>
      </div>

      <!-- Beasiswa Tahfidz summary -->
      <div style="margin-top:1rem;padding:0.85rem 1rem;background:#f8fafc;border-radius:8px;border:1px solid rgba(0,0,0,0.06);">
        <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.5rem;">
          🕌 Penerima Beasiswa Tahfidz Al-Qur'an
        </div>
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
          <div>
            <span style="font-size:1.1rem;font-weight:800;color:#006837;">${a.beasiswaPenuh}</span>
            <span style="font-size:0.75rem;color:#64748b;margin-left:4px;">Bebas SPP (≥15 Juz)</span>
          </div>
          <div>
            <span style="font-size:1.1rem;font-weight:800;color:#0369a1;">${a.beasiswaParsial}</span>
            <span style="font-size:0.75rem;color:#64748b;margin-left:4px;">Potongan SPP (1–14 Juz)</span>
          </div>
          <div>
            <span style="font-size:1.1rem;font-weight:800;color:#7c3aed;">${totalBeasiswa}</span>
            <span style="font-size:0.75rem;color:#64748b;margin-left:4px;">Total Penerima</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Funnel Panel ─────────────────────────────────────────────────────────────
function buildFunnelPanel(a) {
  const steps = [
    { label: 'Total Mendaftar',          count: a.total,    cls: 'f-daftar'   },
    { label: 'Akun Aktif (Verif. Admin)',count: a.aktif,    cls: 'f-aktif'    },
    { label: 'Lunas Biaya Formulir',     count: a.lunas,    cls: 'f-lunas'    },
    { label: 'Dinyatakan Lulus Seleksi', count: a.lulus,    cls: 'f-lulus'    },
    { label: 'Selesai Daftar Ulang',     count: a.dafulang, cls: 'f-dafulang' },
    { label: 'Data Dikunci ke SSoT',     count: a.locked,   cls: 'f-dafulang' },
  ];

  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">📉 Rasio Konversi Pendaftar (Funnel)</span>
      <span class="ex-panel-badge">Alur 1 → 16</span>
    </div>
    <div class="ex-panel-body">
      <div class="ex-funnel-list">
        ${steps.map((s, i) => {
          const pct = a.total ? Math.round((s.count / a.total) * 100) : 0;
          return `
            <div class="ex-funnel-row">
              <span class="ex-funnel-label">${i + 1}. ${s.label}</span>
              <div class="ex-funnel-track">
                <div class="ex-funnel-fill ${s.cls}" id="funnel-${i}" style="width:0%">
                  <span>${pct}%</span>
                </div>
              </div>
              <span class="ex-funnel-count">${s.count.toLocaleString('id-ID')}</span>
            </div>`;
        }).join('')}
      </div>

      <!-- Wawancara method split -->
      <div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.06);">
        <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.6rem;">
          🎙️ Metode Wawancara
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;background:#f8fafc;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:0.75rem;text-align:center;">
            <div style="font-size:1.35rem;font-weight:800;color:#006837;">🏢 ${a.metodeLuring}</div>
            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">Luring (${fmt.pct(a.metodeLuring, a.total)})</div>
          </div>
          <div style="flex:1;background:#f8fafc;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:0.75rem;text-align:center;">
            <div style="font-size:1.35rem;font-weight:800;color:#0369a1;">🌐 ${a.metodeDaring}</div>
            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">Daring (${fmt.pct(a.metodeDaring, a.total)})</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── School Origin Bar Chart Panel ────────────────────────────────────────────
function buildSchoolPanel(a) {
  const max = a.sekolahRanked[0]?.[1] || 1;
  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">🏫 Demografi Asal Sekolah Pendaftar</span>
      <span class="ex-panel-badge">Top ${a.sekolahRanked.length} Sekolah</span>
    </div>
    <div class="ex-panel-body">
      <div class="ex-bar-chart">
        ${a.sekolahRanked.map(([nama, jumlah], i) => {
          const pct = Math.round((jumlah / max) * 100);
          return `
            <div class="ex-bar-row">
              <div class="ex-bar-wrap">
                <span class="ex-bar-school" title="${nama}">${i + 1}. ${nama}</span>
                <div class="ex-bar-track">
                  <div class="ex-bar-fill"
                       id="bar-school-${i}"
                       style="width:0%"
                       data-pct="${pct}">
                  </div>
                </div>
              </div>
              <span class="ex-bar-num">${jumlah}</span>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:1rem;padding-top:0.85rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.75rem;color:#94a3b8;text-align:right;">
        Puncak pendaftaran: <strong style="color:#475569;">${a.puncakPendaftaran}</strong>
      </div>
    </div>`;
}

// ─── Financial Panel ──────────────────────────────────────────────────────────
function buildFinancePanel(a) {
  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">💵 Ringkasan Penerimaan Finansial</span>
      <span class="ex-panel-badge">Alur 6–7 &amp; 12–13</span>
    </div>
    <div class="ex-panel-body">
      <div class="ex-finance-grid">
        <div class="ex-finance-card">
          <div class="ex-finance-label">Biaya Formulir (Tahap 1)</div>
          <div class="ex-finance-value">${fmt.currency(a.totalFormulir)}</div>
          <div class="ex-finance-sub">${a.lunas} pendaftar × Rp 350.000</div>
        </div>
        <div class="ex-finance-card">
          <div class="ex-finance-label">Uang Pangkal (Tahap 2)</div>
          <div class="ex-finance-value">${fmt.currency(a.totalUangPangkal)}</div>
          <div class="ex-finance-sub">${a.dafulang} siswa × Rp 4.500.000</div>
        </div>
      </div>
      <div class="ex-finance-total">
        <span class="ex-finance-total-label">
          🏦 Total Penerimaan Keuangan SPMB ${a.tahunAjaran}
        </span>
        <span class="ex-finance-total-value">${fmt.currency(a.totalPenerimaan)}</span>
      </div>

      <!-- Rata-rata per siswa -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">
        <div style="background:#f8fafc;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:0.7rem 0.9rem;">
          <div style="font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            Rata-rata/Pendaftar
          </div>
          <div style="font-size:1rem;font-weight:800;color:#006837;margin-top:3px;">
            ${fmt.currency(a.lunas ? Math.round(a.totalFormulir / a.lunas) : 0)}
          </div>
        </div>
        <div style="background:#f8fafc;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:0.7rem 0.9rem;">
          <div style="font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            Tingkat Daftar Ulang
          </div>
          <div style="font-size:1rem;font-weight:800;color:#0369a1;margin-top:3px;">
            ${fmt.pct(a.dafulang, a.lulus)} dari siswa lulus
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Status Distribution Table ────────────────────────────────────────────────
function buildStatusTable(a) {
  const rows = [
    { label: 'Total Mendaftar (Online + Offline)', count: a.total,      badge: 'aktif',    icon: '👥' },
    { label: 'Akun Diaktivasi oleh Admin SPMB',    count: a.aktif,      badge: 'aktif',    icon: '✅' },
    { label: 'Lunas Biaya Formulir Pendaftaran',   count: a.lunas,      badge: 'lulus',    icon: '💰' },
    { label: 'Lulus Seleksi — Jurusan MIPA',       count: a.lulusMIPA,  badge: 'lulus',    icon: '🔬' },
    { label: 'Lulus Seleksi — Jurusan IPS',        count: a.lulusIPS,   badge: 'aktif',    icon: '📚' },
    { label: 'Status CADANGAN (Antrean)',           count: a.cadangan,   badge: 'cadangan', icon: '⏳' },
    { label: 'Tidak Lulus Seleksi',                count: a.tidakLulus, badge: 'gagal',    icon: '❌' },
    { label: 'Selesai Daftar Ulang & Verifikasi Berkas', count: a.dafulang, badge: 'lulus', icon: '📋' },
    { label: 'Data Dikunci VERIFIED_LOCKED (SSoT-Ready)', count: a.locked, badge: 'locked', icon: '🔒' },
    { label: 'Penerima Beasiswa Tahfidz (Total)',  count: a.beasiswaPenuh + a.beasiswaParsial, badge: 'aktif', icon: '🕌' },
  ];

  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">📊 Rekap Distribusi Status Keseluruhan SPMB</span>
      <span class="ex-panel-badge">Alur 1–16 Summary</span>
    </div>
    <div class="ex-panel-body" style="padding:0 1rem 1rem;">
      <table class="ex-status-table">
        <thead>
          <tr>
            <th>Indikator Status</th>
            <th style="text-align:right;">Jumlah Siswa</th>
            <th style="text-align:right;">% dari Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><span class="ex-status-badge ${r.badge}">${r.icon} ${r.label}</span></td>
              <td class="ex-num-cell">${r.count.toLocaleString('id-ID')}</td>
              <td class="ex-num-cell" style="color:#64748b;">${fmt.pct(r.count, a.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── Historical 5-Year Trend & Executive Analysis Panel ────────────────────────
function buildHistoricalTrendPanel(a) {
  return `
    <div class="ex-panel-header">
      <span class="ex-panel-title">📈 Analisa Tren 5 Tahun Terakhir (TA 2022/2023 – 2026/2027)</span>
      <span class="ex-panel-badge">Analitika Strategis Pimpinan</span>
    </div>
    <div class="ex-panel-body" style="padding:1.25rem 1.5rem 1.5rem;">

      <!-- ── Ringkasan KPI Analisa 5 Tahun ── -->
      <div class="ex-hist-analysis-row">
        <div class="ex-hist-kpi">
          <span class="ex-hist-kpi-icon">📈</span>
          <div class="ex-hist-kpi-val">+38.6%</div>
          <div class="ex-hist-kpi-label">Pertumbuhan Pendaftar<span>207 siswa (2022) → 287 siswa (2026)</span></div>
        </div>

        <div class="ex-hist-kpi">
          <span class="ex-hist-kpi-icon">💵</span>
          <div class="ex-hist-kpi-val blue">Rp 4,21 M</div>
          <div class="ex-hist-kpi-label">Akumulasi Pendapatan<span>Total Penerimaan Finansial 5 Thn</span></div>
        </div>

        <div class="ex-hist-kpi">
          <span class="ex-hist-kpi-icon">🔬</span>
          <div class="ex-hist-kpi-val purple">57.1%</div>
          <div class="ex-hist-kpi-label">Dominasi Minat MIPA<span>Tren naik stabil dari 53.1% di 2022</span></div>
        </div>

        <div class="ex-hist-kpi ex-hist-kpi-analysis">
          <div class="ex-hist-kpi-label-lg">💡 Resume Eksekutif &amp; Rekomendasi Strategis</div>
          <p>
            • <strong>Pertumbuhan Konsisten:</strong> Volume pendaftar naik rata-rata <strong>+8.5% CAGR</strong> per tahun. Rasio kelulusan seleksi terkendali stabil pada <strong>~80%</strong>, mencerminkan mutu input siswa yang semakin kompetitif.<br>
            • <strong>Likuiditas Finansial Kuat:</strong> Pendapatan SPMB melonjak <strong>+40.8%</strong> dalam 5 tahun, menyediakan ruang fiskal memadai untuk sarana Lab Digital dan perluasan beasiswa Tahfidz.<br>
            • <strong>Rekomendasi Kuota:</strong> Keterisian MIPA kini mencapai <strong>88.6%</strong> kuota (124/140 siswa). Disarankan pimpinan menambah 1 rombel MIPA pada TA 2027/2028 guna merespons lonjakan peminat sains teknologi.
          </p>
        </div>
      </div>

      <!-- ── Grafik 1: Tren Pendaftar vs Diterima (Full Width) ── -->
      <div class="ex-hist-svg-wrap">
        <div class="ex-hist-chart-label">1. Tren Volume Pendaftar vs Siswa Diterima (2022 – 2026)</div>
        <svg viewBox="0 0 760 215" width="100%" height="215" style="overflow:visible;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-pendaftar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#006837" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#006837" stop-opacity="0.01" />
            </linearGradient>
          </defs>

          <!-- Grid Lines -->
          <line x1="60" y1="35" x2="720" y2="35" stroke="#e2e8f0" stroke-dasharray="4,4" />
          <text x="50" y="39" font-size="11" fill="#94a3b8" text-anchor="end">300</text>

          <line x1="60" y1="80" x2="720" y2="80" stroke="#e2e8f0" stroke-dasharray="4,4" />
          <text x="50" y="84" font-size="11" fill="#94a3b8" text-anchor="end">250</text>

          <line x1="60" y1="125" x2="720" y2="125" stroke="#e2e8f0" stroke-dasharray="4,4" />
          <text x="50" y="129" font-size="11" fill="#94a3b8" text-anchor="end">200</text>

          <line x1="60" y1="170" x2="720" y2="170" stroke="#cbd5e1" />
          <text x="50" y="174" font-size="11" fill="#94a3b8" text-anchor="end">150</text>

          <!-- Area Pendaftar -->
          <path d="M 90 170 L 90 118.7 L 245 101.6 L 400 81.8 L 555 66.5 L 710 46.7 L 710 170 Z" fill="url(#grad-pendaftar)" />

          <!-- Line Pendaftar (Hijau) -->
          <path d="M 90 118.7 L 245 101.6 L 400 81.8 L 555 66.5 L 710 46.7" fill="none" stroke="#006837" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Line Diterima (Biru) -->
          <path d="M 90 147.5 L 245 135.8 L 400 121.4 L 555 110.6 L 710 99.8" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Titik & Label Pendaftar -->
          <circle cx="90" cy="118.7" r="5" fill="#ffffff" stroke="#006837" stroke-width="2.5" />
          <text x="90" y="106" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">207</text>

          <circle cx="245" cy="101.6" r="5" fill="#ffffff" stroke="#006837" stroke-width="2.5" />
          <text x="245" y="89" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">226</text>

          <circle cx="400" cy="81.8" r="5" fill="#ffffff" stroke="#006837" stroke-width="2.5" />
          <text x="400" y="69" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">248</text>

          <circle cx="555" cy="66.5" r="5" fill="#ffffff" stroke="#006837" stroke-width="2.5" />
          <text x="555" y="54" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">265</text>

          <circle cx="710" cy="46.7" r="5" fill="#ffffff" stroke="#006837" stroke-width="2.5" />
          <text x="710" y="34" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">287</text>

          <!-- Titik & Label Diterima -->
          <circle cx="90" cy="147.5" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
          <text x="90" y="161" font-size="10" font-weight="600" fill="#0284c7" text-anchor="middle">175</text>

          <circle cx="245" cy="135.8" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
          <text x="245" y="149" font-size="10" font-weight="600" fill="#0284c7" text-anchor="middle">188</text>

          <circle cx="400" cy="121.4" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
          <text x="400" y="135" font-size="10" font-weight="600" fill="#0284c7" text-anchor="middle">204</text>

          <circle cx="555" cy="110.6" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
          <text x="555" y="124" font-size="10" font-weight="600" fill="#0284c7" text-anchor="middle">216</text>

          <circle cx="710" cy="99.8" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
          <text x="710" y="113" font-size="10" font-weight="600" fill="#0284c7" text-anchor="middle">228</text>

          <!-- X-Axis Labels -->
          <text x="90" y="195" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">TA 2022/2023</text>
          <text x="245" y="195" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">TA 2023/2024</text>
          <text x="400" y="195" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">TA 2024/2025</text>
          <text x="555" y="195" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">TA 2025/2026</text>
          <text x="710" y="195" font-size="11" font-weight="700" fill="#006837" text-anchor="middle">TA 2026/2027 (Kini)</text>
        </svg>

        <div class="ex-chart-legend">
          <div class="ex-chart-legend-item">
            <span class="ex-chart-legend-dot" style="background:#006837;"></span>
            <span>Total Pendaftar (Siswa)</span>
          </div>
          <div class="ex-chart-legend-item">
            <span class="ex-chart-legend-dot" style="background:#0284c7;"></span>
            <span>Peserta Diterima / Lulus</span>
          </div>
        </div>
      </div>

      <!-- ── Sub Grid: Pendapatan + Minat Penjurusan ── -->
      <div class="ex-hist-sub-grid">

        <!-- Grafik 2: Pendapatan Finansial -->
        <div class="ex-hist-svg-wrap">
          <div class="ex-hist-chart-label">2. Tren Pendapatan Finansial (Juta Rupiah)</div>
          <svg viewBox="0 0 440 195" width="100%" height="195" style="overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <!-- Grid Lines -->
            <line x1="50" y1="30" x2="420" y2="30" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="42" y="34" font-size="10" fill="#94a3b8" text-anchor="end">1.000 Jt</text>

            <line x1="50" y1="72" x2="420" y2="72" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="42" y="76" font-size="10" fill="#94a3b8" text-anchor="end">750 Jt</text>

            <line x1="50" y1="114" x2="420" y2="114" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="42" y="118" font-size="10" fill="#94a3b8" text-anchor="end">500 Jt</text>

            <line x1="50" y1="156" x2="420" y2="156" stroke="#cbd5e1" />
            <text x="42" y="160" font-size="10" fill="#94a3b8" text-anchor="end">0</text>

            <!-- Bars: Uang Pangkal (#006837) + Formulir (#f5a623) Stacked -->
            <!-- 2022: Total 697.5 (y=69.3), Pangkal 625 (y=78.7, h=77.3), Formulir 72.5 (y=69.3, h=9.4) -->
            <rect x="68" y="78.7" width="34" height="77.3" fill="#006837" rx="3" />
            <rect x="68" y="69.3" width="34" height="9.4" fill="#f5a623" rx="2" />
            <text x="85" y="62" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">697M</text>
            <text x="85" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'22/'23</text>

            <!-- 2023: Total 767.6 (y=60.8), Pangkal 688.5 (y=70.6, h=85.4), Formulir 79.1 (y=60.8, h=9.8) -->
            <rect x="142" y="70.6" width="34" height="85.4" fill="#006837" rx="3" />
            <rect x="142" y="60.8" width="34" height="9.8" fill="#f5a623" rx="2" />
            <text x="159" y="53" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">768M</text>
            <text x="159" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'23/'24</text>

            <!-- 2024: Total 847.3 (y=50.9), Pangkal 760.5 (y=61.7, h=94.3), Formulir 86.8 (y=50.9, h=10.8) -->
            <rect x="216" y="61.7" width="34" height="94.3" fill="#006837" rx="3" />
            <rect x="216" y="50.9" width="34" height="10.8" fill="#f5a623" rx="2" />
            <text x="233" y="44" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">847M</text>
            <text x="233" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'24/'25</text>

            <!-- 2025: Total 916.3 (y=42.4), Pangkal 823.5 (y=53.9, h=102.1), Formulir 92.8 (y=42.4, h=11.5) -->
            <rect x="290" y="53.9" width="34" height="102.1" fill="#006837" rx="3" />
            <rect x="290" y="42.4" width="34" height="11.5" fill="#f5a623" rx="2" />
            <text x="307" y="35" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">916M</text>
            <text x="307" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'25/'26</text>

            <!-- 2026: Total 982.4 (y=34.2), Pangkal 891 (y=45.5, h=110.5), Formulir 91.4 (y=34.2, h=11.3) -->
            <rect x="364" y="45.5" width="34" height="110.5" fill="#006837" rx="3" />
            <rect x="364" y="34.2" width="34" height="11.3" fill="#f5a623" rx="2" />
            <text x="381" y="27" font-size="10" font-weight="800" fill="#006837" text-anchor="middle">982M</text>
            <text x="381" y="174" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">'26/'27</text>
          </svg>

          <div class="ex-chart-legend">
            <div class="ex-chart-legend-item">
              <span class="ex-chart-legend-rect" style="background:#006837;"></span>
              <span>Uang Pangkal</span>
            </div>
            <div class="ex-chart-legend-item">
              <span class="ex-chart-legend-rect" style="background:#f5a623;"></span>
              <span>Formulir Pendaftaran</span>
            </div>
          </div>
        </div>

        <!-- Grafik 3: Minat Penjurusan MIPA vs IPS -->
        <div class="ex-hist-svg-wrap">
          <div class="ex-hist-chart-label">3. Tren Minat Penjurusan Pendaftar (MIPA vs IPS)</div>
          <svg viewBox="0 0 440 195" width="100%" height="195" style="overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <!-- Grid Lines -->
            <line x1="45" y1="30" x2="420" y2="30" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="38" y="34" font-size="10" fill="#94a3b8" text-anchor="end">180</text>

            <line x1="45" y1="72" x2="420" y2="72" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="38" y="76" font-size="10" fill="#94a3b8" text-anchor="end">120</text>

            <line x1="45" y1="114" x2="420" y2="114" stroke="#e2e8f0" stroke-dasharray="3,3" />
            <text x="38" y="118" font-size="10" fill="#94a3b8" text-anchor="end">60</text>

            <line x1="45" y1="156" x2="420" y2="156" stroke="#cbd5e1" />
            <text x="38" y="160" font-size="10" fill="#94a3b8" text-anchor="end">0</text>

            <!-- Paired Bars: MIPA (#059669) vs IPS (#0284c7) -->
            <!-- 2022: MIPA 110 (h=77, y=79), IPS 97 (h=67.9, y=88.1) -->
            <rect x="65" y="79" width="15" height="77" fill="#059669" rx="3" />
            <rect x="83" y="88.1" width="15" height="67.9" fill="#0284c7" rx="3" />
            <text x="72.5" y="73" font-size="9" font-weight="700" fill="#059669" text-anchor="middle">110</text>
            <text x="90.5" y="82" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">97</text>
            <text x="81.5" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'22/'23</text>

            <!-- 2023: MIPA 122 (h=85.4, y=70.6), IPS 104 (h=72.8, y=83.2) -->
            <rect x="139" y="70.6" width="15" height="85.4" fill="#059669" rx="3" />
            <rect x="157" y="83.2" width="15" height="72.8" fill="#0284c7" rx="3" />
            <text x="146.5" y="64" font-size="9" font-weight="700" fill="#059669" text-anchor="middle">122</text>
            <text x="164.5" y="77" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">104</text>
            <text x="155.5" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'23/'24</text>

            <!-- 2024: MIPA 138 (h=96.6, y=59.4), IPS 110 (h=77, y=79) -->
            <rect x="213" y="59.4" width="15" height="96.6" fill="#059669" rx="3" />
            <rect x="231" y="79" width="15" height="77" fill="#0284c7" rx="3" />
            <text x="220.5" y="53" font-size="9" font-weight="700" fill="#059669" text-anchor="middle">138</text>
            <text x="238.5" y="73" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">110</text>
            <text x="229.5" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'24/'25</text>

            <!-- 2025: MIPA 149 (h=104.3, y=51.7), IPS 116 (h=81.2, y=74.8) -->
            <rect x="287" y="51.7" width="15" height="104.3" fill="#059669" rx="3" />
            <rect x="305" y="74.8" width="15" height="81.2" fill="#0284c7" rx="3" />
            <text x="294.5" y="45" font-size="9" font-weight="700" fill="#059669" text-anchor="middle">149</text>
            <text x="312.5" y="68" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">116</text>
            <text x="303.5" y="174" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">'25/'26</text>

            <!-- 2026: MIPA 164 (h=114.8, y=41.2), IPS 123 (h=86.1, y=69.9) -->
            <rect x="361" y="41.2" width="15" height="114.8" fill="#059669" rx="3" />
            <rect x="379" y="69.9" width="15" height="86.1" fill="#0284c7" rx="3" />
            <text x="368.5" y="34" font-size="9" font-weight="800" fill="#059669" text-anchor="middle">164</text>
            <text x="386.5" y="63" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">123</text>
            <text x="377.5" y="174" font-size="10" font-weight="700" fill="#006837" text-anchor="middle">'26/'27</text>
          </svg>

          <div class="ex-chart-legend">
            <div class="ex-chart-legend-item">
              <span class="ex-chart-legend-rect" style="background:#059669;"></span>
              <span>Peminat MIPA (Sains)</span>
            </div>
            <div class="ex-chart-legend-item">
              <span class="ex-chart-legend-rect" style="background:#0284c7;"></span>
              <span>Peminat IPS (Sosial)</span>
            </div>
          </div>
        </div>

      </div>

    </div>`;
}

// ─── Animation: Trigger bar fills ─────────────────────────────────────────────
function animateCharts(a) {
  const pctMIPA = Math.min(100, (a.lulusMIPA / a.kuotaMIPA * 100)).toFixed(1);
  const pctIPS  = Math.min(100, (a.lulusIPS  / a.kuotaIPS  * 100)).toFixed(1);

  requestAnimationFrame(() => {
    setTimeout(() => {
      // Quota bars
      const mEl = document.getElementById('prog-mipa');
      const iEl = document.getElementById('prog-ips');
      if (mEl) mEl.style.width = pctMIPA + '%';
      if (iEl) iEl.style.width = pctIPS  + '%';

      // Funnel bars
      const funnelCounts = [a.total, a.aktif, a.lunas, a.lulus, a.dafulang, a.locked];
      funnelCounts.forEach((count, i) => {
        const el = document.getElementById(`funnel-${i}`);
        if (el && a.total > 0) {
          el.style.width = Math.round((count / a.total) * 100) + '%';
        }
      });

      // School bars
      document.querySelectorAll('[id^="bar-school-"]').forEach(el => {
        el.style.width = (el.dataset.pct || '0') + '%';
      });
    }, 150);
  });
}

// ─── Main Render ──────────────────────────────────────────────────────────────
export function renderExecutiveReport(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  injectModuleStyles();

  // Tampilkan skeleton loader
  container.innerHTML = renderSkeleton();

  // Simulasikan latensi data fetch (mock-up feel)
  setTimeout(() => {
    const a = buildAnalytics();

    container.innerHTML = `
      <div class="ex-module-wrapper">

        <!-- ══ Header Banner ══ -->
        <div class="ex-header-banner">
          <div class="ex-header-inner">
            <div class="ex-header-left">
              <span class="ex-module-tag">📊 Modul 10 · Alur 16 · Novelia · [Data Simulasi]</span>
              <h1>Executive Reporting</h1>
              <p class="ex-subtitle">
                Dashboard Laporan Pimpinan — SPMB ${a.tahunAjaran} · SMA Muhammadiyah 3 Yogyakarta
              </p>
            </div>
            <div class="ex-header-right">
              <div class="ex-timestamp-badge">
                🕐 Diperbarui: ${fmt.date()}
              </div>
              <button class="ex-print-btn" onclick="window.print()" id="btn-print-executive">
                🖨️ Cetak / Ekspor Laporan
              </button>
            </div>
          </div>
        </div>

        <!-- ══ Content Area ══ -->
        <div class="ex-content-area">

          <!-- Info Strip Alur 16 + Mock-up notice -->
          <div class="ex-alur-strip">
            <span class="alur-icon">🔗</span>
            <div class="alur-text">
              <strong>Alur 16 — Rekapitulasi Analitik Eksekutif:</strong>
              Laporan ini ditarik dari <strong>Basis Data Terintegrasi SSoT</strong> (Modul 08) tanpa input manual pimpinan.
              Saat ini menampilkan <strong>data simulasi (mock-up)</strong> yang merepresentasikan kondisi SPMB
              pada tahap akhir — ${a.total} pendaftar, ${a.lulus} dinyatakan lulus, ${a.locked} data dikunci ke SSoT.
            </div>
          </div>

          <!-- ── KPI Overview ── -->
          <div class="ex-section-title">📌 Ringkasan Metrik Eksekutif</div>
          <div class="ex-kpi-grid">
            ${buildKPIGrid(a)}
          </div>

          <!-- ── Tren Historis 5 Tahun & Analisa Eksekutif ── -->
          <div class="ex-section-title">📊 Tren &amp; Analisa Historis 5 Tahun Terakhir (TA 2022/2023 – 2026/2027)</div>
          <div class="ex-panel wide" style="margin-bottom:2rem;">
            ${buildHistoricalTrendPanel(a)}
          </div>

          <!-- ── Analytics Detail ── -->
          <div class="ex-section-title">📈 Analitik Operasional SPMB TA ${a.tahunAjaran}</div>
          <div class="ex-analytics-grid">

            <div class="ex-panel">${buildQuotaPanel(a)}</div>
            <div class="ex-panel">${buildFunnelPanel(a)}</div>
            <div class="ex-panel">${buildSchoolPanel(a)}</div>
            <div class="ex-panel">${buildFinancePanel(a)}</div>

            <!-- Tabel distribusi full-width -->
            <div class="ex-panel wide">${buildStatusTable(a)}</div>

          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:1rem 0 0.5rem;color:#94a3b8;font-size:0.75rem;">
            Modul 10 · Executive Reporting · SMA Muhammadiyah 3 Yogyakarta ·
            TA ${a.tahunAjaran} · Dikembangkan oleh <strong style="color:#64748b;">Novelia</strong>
            (Desainer &amp; Dokumentasi)
          </div>

        </div>
      </div>`;

    animateCharts(a);
  }, 450);
}

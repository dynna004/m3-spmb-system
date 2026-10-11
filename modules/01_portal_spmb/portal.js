/**
 * Modul 01: Portal Utama Pendaftaran (Portal SPMB)
 * SMA Muhammadiyah 3 Yogyakarta
 * 
 * Menghubungkan & memanggil file utama Modul 01:
 * - register.html   (Alur 1a: Registrasi Akun Mandiri)
 * - status-akun.html (Alur 4: Status Aktivasi Akun)
 * - login.html      (Akses Akun Terdaftar)
 * - formulir.html   (Alur 5: Formulir Biodata & Unggah 4 Dokumen: Ijazah, KK, Akta, Bayar)
 * - pengumuman.html (Alur 10: Pengumuman Kelulusan Seleksi)
 * secara utuh & 100% IDENTIK saat dijalankan dari index.html maupun dibuka langsung.
 */

export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="background: #ffffff; border-radius: 16px; padding: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #006837 0%, #004d28 100%); color: white; border-radius: 12px; font-weight: 800; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 104, 55, 0.2);">
            M3
          </div>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #006837; margin: 0;">Portal Calon Peserta Didik (SPMB 2026)</h2>
            <p style="color: #64748b; font-size: 0.8rem; margin: 2px 0 0 0;">SMA Muhammadiyah 3 Yogyakarta &bull; Jalur Mandiri & SSoT Terintegrasi</p>
          </div>
        </div>

        <!-- Quick Sub-Page Navigation Tabs -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="spmb-nav-container">
          <button class="tab-btn active" id="spmb-nav-reg" onclick="window.loadSPMBSubPage('register.html')">1. Registrasi Akun</button>
          <button class="tab-btn" id="spmb-nav-status" onclick="window.loadSPMBSubPage('status-akun.html')">2. Status Aktivasi</button>
          <button class="tab-btn" id="spmb-nav-login" onclick="window.loadSPMBSubPage('login.html')">3. Login Pendaftar</button>
          <button class="tab-btn" id="spmb-nav-form" onclick="window.loadSPMBSubPage('formulir.html')">4. Formulir & Bukti</button>
          <button class="tab-btn" id="spmb-nav-ann" onclick="window.loadSPMBSubPage('pengumuman.html')">5. Cek Kelulusan</button>
        </div>
      </div>

      <!-- Live Embedded View of Module 01 Sub-pages (100% Identical) -->
      <div style="width: 100%; min-height: 820px; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; background: #f8fafc;">
        <iframe id="spmb-iframe" src="modules/01_portal_spmb/register.html" style="width: 100%; height: 860px; border: none; display: block;" title="Portal SPMB View"></iframe>
      </div>
    </div>
  `;

  // Sub-page navigation loader
  window.loadSPMBSubPage = function(pageName) {
    const iframe = document.getElementById('spmb-iframe');
    if (iframe) {
      iframe.src = `modules/01_portal_spmb/${pageName}`;
    }

    const navButtons = {
      'register.html': 'spmb-nav-reg',
      'status-akun.html': 'spmb-nav-status',
      'login.html': 'spmb-nav-login',
      'formulir.html': 'spmb-nav-form',
      'pengumuman.html': 'spmb-nav-ann'
    };

    Object.values(navButtons).forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });

    const activeId = navButtons[pageName];
    if (activeId) {
      const activeBtn = document.getElementById(activeId);
      if (activeBtn) activeBtn.classList.add('active');
    }
  };

  // Sync tab highlights when iframe navigates internally
  const iframe = document.getElementById('spmb-iframe');
  if (iframe) {
    iframe.addEventListener('load', () => {
      try {
        const currentPath = iframe.contentWindow.location.pathname;
        const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        const navButtons = {
          'register.html': 'spmb-nav-reg',
          'status-akun.html': 'spmb-nav-status',
          'login.html': 'spmb-nav-login',
          'formulir.html': 'spmb-nav-form',
          'pengumuman.html': 'spmb-nav-ann'
        };

        Object.values(navButtons).forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.classList.remove('active');
        });

        const activeId = navButtons[pageName];
        if (activeId) {
          const activeBtn = document.getElementById(activeId);
          if (activeBtn) activeBtn.classList.add('active');
        }

        // Auto-fit height to iframe content height if available
        const doc = iframe.contentWindow.document;
        if (doc && doc.body) {
          const contentHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 780);
          iframe.style.height = `${contentHeight + 40}px`;
        }
      } catch (e) {
        // Cross-origin fallback
      }
    });
  }
}

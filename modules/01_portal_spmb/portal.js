/**
 * Modul 01: Portal Utama Pendaftaran (Portal SPMB)
 * Lead Front-End Developer: SPMB Siswa Portal
 * Menghubungkan & memanggil file utama (register.html, status-akun.html, login.html, formulir.html)
 * secara utuh & identik saat dijalankan dari index.html (Full Run).
 */

export function renderPortalSPMB(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="background: #ffffff; border-radius: 16px; padding: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 700; color: #006837; margin: 0;">🎓 Modul 01: Portal Pendaftaran SPMB</h2>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 2px;">SMA Muhammadiyah 3 Yogyakarta - Integrated Portal View</p>
        </div>

        <!-- Quick Sub-Page Navigation Tabs -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="tab-btn active" id="spmb-nav-reg" onclick="window.loadSPMBSubPage('register.html')">1. Registrasi Akun</button>
          <button class="tab-btn" id="spmb-nav-status" onclick="window.loadSPMBSubPage('status-akun.html')">2. Status Aktivasi</button>
          <button class="tab-btn" id="spmb-nav-login" onclick="window.loadSPMBSubPage('login.html')">3. Login Pendaftar</button>
          <button class="tab-btn" id="spmb-nav-form" onclick="window.loadSPMBSubPage('formulir.html')">4. Formulir & Bukti</button>
          <a href="modules/01_portal_spmb/README.md" target="_blank" class="btn btn-primary" style="font-size: 0.78rem; text-decoration: none; padding: 6px 12px; border-radius: 8px;">📖 README Contract</a>
        </div>
      </div>

      <!-- Live Embedded View of Module 01 Sub-pages -->
      <div style="width: 100%; min-height: 720px; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; background: #f8fafc;">
        <iframe id="spmb-iframe" src="modules/01_portal_spmb/register.html" style="width: 100%; height: 750px; border: none; display: block;" title="Portal SPMB View"></iframe>
      </div>
    </div>
  `;

  // Sub-page navigation loader
  window.loadSPMBSubPage = function(pageName) {
    const iframe = document.getElementById('spmb-iframe');
    if (iframe) {
      iframe.src = `modules/01_portal_spmb/${pageName}`;
    }

    // Update active button state
    const navButtons = {
      'register.html': 'spmb-nav-reg',
      'status-akun.html': 'spmb-nav-status',
      'login.html': 'spmb-nav-login',
      'formulir.html': 'spmb-nav-form'
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
          'formulir.html': 'spmb-nav-form'
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
      } catch (e) {
        // Ignore cross-origin path errors if any
      }
    });
  }
}

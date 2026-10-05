/**
 * Dynamic Header Component
 * SMA Muhammadiyah 3 Yogyakarta
 */

export function renderHeader(activeModuleId = '01') {
  const headerHtml = `
    <header class="app-header">
      <div class="brand-title">
        🏫 SMA Muhammadiyah 3 Yogyakarta 
        <span class="brand-badge">SPMB & TU System</span>
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">T.A. 2026/2027</div>
    </header>
  `;
  
  const headerElement = document.getElementById('app-header-container');
  if (headerElement) {
    headerElement.innerHTML = headerHtml;
  }
}

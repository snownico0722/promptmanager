/**
 * Shared manager footer — keep only product controls used by the extension itself.
 */

/** @returns {string} */
export function resolveSidepanelFooterPrefix() {
  return window.location.pathname.includes('/sidepanel/') ? '../' : '';
}

/**
 * @param {{ active?: 'settings'|null, root?: HTMLElement }} [options]
 */
export function mountSidepanelFooter({ active = null, root = document.body } = {}) {
  if (root.querySelector('footer.footer')) return;

  const prefix = resolveSidepanelFooterPrefix();
  const footer = document.createElement('footer');
  footer.className = 'footer';

  footer.innerHTML = `
    <div class="footer-icons">
      <a class="footer-icon-link${active === 'settings' ? ' footer-icon-link-active' : ''}" data-footer-page="settings" href="${prefix}settings.html" data-i18n-title="settings.title" title="Settings">
        <svg class="footer-md-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.488.488 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>
      </a>
      <a class="footer-cta-link" href="${prefix}permissions/permissions.html" data-i18n-title="support.getStarted" title="Get Started" target="_blank" rel="noopener">
        <span data-i18n="support.getStarted">Get Started</span>
      </a>
    </div>
  `;

  root.appendChild(footer);
  window.OPMI18n.apply(footer);
}

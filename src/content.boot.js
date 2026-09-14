// content.boot.js — first injected file. Marks the isolated world so a concurrent
// executeScript cannot start a second copy of the bundle before listeners exist.
window.__openPromptManagerInjected = true;

// Product cleanup for the in-page LLM invocation panel.
// Remove the legacy Changelog entry and the "Support & links" block whenever
// the extension panel is rebuilt, without observing the host page long-term.
(() => {
  const ROOT_ID = 'opm-root';
  let rootObserver = null;
  let discoveryObserver = null;
  let cleanupQueued = false;

  const cleanupLegacyPanelExtras = (root) => {
    cleanupQueued = false;
    if (!root?.isConnected) return;

    root
      .querySelectorAll('img[data-i18n-title="changelog.title"]')
      .forEach((icon) => icon.closest('button')?.remove());

    root
      .querySelectorAll('[data-i18n="support.title"]')
      .forEach((title) => {
        const links = title.nextElementSibling;
        if (links?.querySelector?.('[data-i18n="support.github"], [data-i18n="support.review"], [data-i18n="support.coffee"]')) {
          links.remove();
        }
        title.remove();
      });
  };

  const attachToRoot = () => {
    const root = document.getElementById(ROOT_ID);
    if (!root) return false;

    discoveryObserver?.disconnect();
    discoveryObserver = null;
    cleanupLegacyPanelExtras(root);

    rootObserver?.disconnect();
    rootObserver = new MutationObserver(() => {
      if (cleanupQueued) return;
      cleanupQueued = true;
      queueMicrotask(() => cleanupLegacyPanelExtras(root));
    });
    rootObserver.observe(root, { childList: true, subtree: true });
    return true;
  };

  const start = () => {
    if (attachToRoot()) return;
    discoveryObserver = new MutationObserver(() => {
      attachToRoot();
    });
    discoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();

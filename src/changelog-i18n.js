(() => {
  'use strict';
  if (window.__OPM_CHANGELOG_I18N__) return;
  window.__OPM_CHANGELOG_I18N__ = true;

  const ENGLISH_PATH = 'changelog.html';
  const CHINESE_PATH = 'changelog.zh-CN.html';
  let rootObserver = null;
  let bodyObserver = null;
  let observerRoot = null;
  let inFlightLanguage = null;

  function desiredLanguage() {
    return window.OPMI18n?.getLanguage?.() === 'zh-CN' ? 'zh-CN' : 'en';
  }

  function contentLooksChinese(host) {
    const text = host?.textContent || '';
    return text.includes('未发布') && text.includes('版本 3.0.5');
  }

  async function renderChangelogIfNeeded() {
    const host = document.getElementById('opm-changelog-content');
    if (!host) return;

    const language = desiredLanguage();
    const alreadyMatches = language === 'zh-CN'
      ? contentLooksChinese(host)
      : (host.textContent.trim().length > 0 && !contentLooksChinese(host));
    if (alreadyMatches || inFlightLanguage === language) return;

    inFlightLanguage = language;
    try {
      const path = language === 'zh-CN' ? CHINESE_PATH : ENGLISH_PATH;
      const response = await fetch(chrome.runtime.getURL(path));
      if (!response.ok) return;
      const html = await response.text();

      // Language or view may have changed while the file was loading.
      if (!host.isConnected || desiredLanguage() !== language) return;
      host.innerHTML = html;
    } catch (error) {
      console.warn('[PromptManager] Failed to load localized changelog:', error);
    } finally {
      inFlightLanguage = null;
    }
  }

  function attachRoot(root) {
    if (!root || root === observerRoot) {
      renderChangelogIfNeeded();
      return;
    }
    rootObserver?.disconnect();
    observerRoot = root;
    rootObserver = new MutationObserver(() => {
      renderChangelogIfNeeded();
    });
    rootObserver.observe(root, { childList: true, subtree: true });
    renderChangelogIfNeeded();
  }

  function ensureRootWatcher() {
    const root = document.getElementById('opm-root');
    if (root) attachRoot(root);
    if (bodyObserver || !document.body) return;

    // #opm-root is a direct body child. Observe only body-level additions so this
    // helper never watches the host application's internal DOM.
    bodyObserver = new MutationObserver(() => {
      const nextRoot = document.getElementById('opm-root');
      if (nextRoot) attachRoot(nextRoot);
    });
    bodyObserver.observe(document.body, { childList: true });
  }

  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.uiLanguage) {
      renderChangelogIfNeeded();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureRootWatcher, { once: true });
  } else {
    ensureRootWatcher();
  }
})();

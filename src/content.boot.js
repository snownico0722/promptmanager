// content.boot.js — first injected file. Marks the isolated world so a concurrent
// executeScript cannot start a second copy of the bundle before listeners exist.
window.__openPromptManagerInjected = true;

// COMMENT: Load localization before the in-page prompt UI is rendered. The shared
// translator scopes itself to #opm-root on host pages; changelog localization also
// observes only that extension-owned subtree.
import(chrome.runtime.getURL('i18n.js'))
  .then(() => import(chrome.runtime.getURL('changelog-i18n.js')))
  .catch(() => {});

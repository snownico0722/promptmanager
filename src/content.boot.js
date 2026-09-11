// content.boot.js — first injected file. Marks the isolated world so a concurrent
// executeScript cannot start a second copy of the bundle before listeners exist.
window.__openPromptManagerInjected = true;

// COMMENT: Load localization before the in-page prompt UI is rendered. Dialog and
// changelog helpers run after the shared language state is available.
import(chrome.runtime.getURL('i18n.js'))
  .then(() => Promise.all([
    import(chrome.runtime.getURL('dialog-i18n.js')),
    import(chrome.runtime.getURL('changelog-i18n.js')),
  ]))
  .catch(() => {});

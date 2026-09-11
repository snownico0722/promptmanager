// content.boot.js — first injected file. Marks the isolated world so a concurrent
// executeScript cannot start a second copy of the bundle before listeners exist.
window.__openPromptManagerInjected = true;

// COMMENT: Load localization before the in-page prompt UI is rendered. The dialog
// wrapper runs after i18n so native prompt() calls from the service worker use the
// same selected language as the rest of the extension UI.
import(chrome.runtime.getURL('i18n.js'))
  .then(() => import(chrome.runtime.getURL('dialog-i18n.js')))
  .catch(() => {});

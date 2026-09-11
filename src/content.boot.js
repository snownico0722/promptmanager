// content.boot.js — first injected file. Marks the isolated world so a concurrent
// executeScript cannot start a second copy of the bundle before listeners exist.
window.__openPromptManagerInjected = true;

// COMMENT: Load the lightweight UI localization layer before the in-page prompt UI
// is rendered. The module observes later DOM changes, so dynamically-created labels
// and dialogs are translated as well.
import(chrome.runtime.getURL('i18n.js')).catch(() => {});

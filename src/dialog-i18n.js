(() => {
  'use strict';
  if (window.__OPM_DIALOG_I18N__) return;
  window.__OPM_DIALOG_I18N__ = true;

  const nativePrompt = typeof window.prompt === 'function' ? window.prompt.bind(window) : null;
  if (!nativePrompt) return;

  // COMMENT: service-worker executeScript() runs in the extension isolated world. Translate
  // the native prompt dialog there as well; alert/confirm are already wrapped by i18n.js.
  window.prompt = (message, defaultValue) => {
    const translated = window.OPMI18n?.t
      ? window.OPMI18n.t(String(message))
      : String(message);
    return nativePrompt(translated, defaultValue);
  };
})();

(() => {
  'use strict';
  if (window.__OPM_DIALOG_I18N__) return;
  window.__OPM_DIALOG_I18N__ = true;

  const nativePrompt = typeof window.prompt === 'function' ? window.prompt.bind(window) : null;
  if (!nativePrompt) return;

  const DIALOG_ZH = {
    'Enter a title for your prompt': '请输入提示词标题',
    'Please add a title to your prompt.': '请为提示词添加标题。',
  };

  function translateDialog(message) {
    const source = String(message);
    const shared = window.OPMI18n?.t ? window.OPMI18n.t(source) : source;
    if (shared !== source) return shared;
    if (window.OPMI18n?.getLanguage?.() === 'zh-CN') return DIALOG_ZH[source] || source;
    return source;
  }

  // COMMENT: service-worker executeScript() runs in the extension isolated world. Translate
  // native prompt() there as well; alert/confirm are wrapped by the shared i18n layer.
  window.prompt = (message, defaultValue) => nativePrompt(translateDialog(message), defaultValue);
})();

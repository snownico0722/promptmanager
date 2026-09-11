(() => {
  'use strict';
  if (window.__OPM_CHANGELOG_I18N__) return;
  window.__OPM_CHANGELOG_I18N__ = true;

  const nativeFetch = window.fetch.bind(window);
  const englishUrl = chrome.runtime.getURL('changelog.html');
  const chineseUrl = chrome.runtime.getURL('changelog.zh-CN.html');

  window.fetch = (input, init) => {
    const requestedUrl = typeof input === 'string' ? input : input?.url;
    if (requestedUrl === englishUrl && window.OPMI18n?.getLanguage?.() === 'zh-CN') {
      return nativeFetch(chineseUrl, init);
    }
    return nativeFetch(input, init);
  };
})();

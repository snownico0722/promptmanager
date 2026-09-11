// Direct view loader: no global patches, DOM observers or version-string sniffing.
(() => {
  'use strict';
  if (globalThis.OPMChangelog) return;
  const i18n = globalThis.OPMI18n;
  const cache = new Map();
  let activeHost = null;
  let generation = 0;

  function read(language) {
    if (!cache.has(language)) {
      const path = language === 'zh-CN' ? 'changelog.zh-CN.html' : 'changelog.html';
      const request = fetch(chrome.runtime.getURL(path)).then(response => {
        if (!response.ok) throw new Error(`Changelog HTTP ${response.status}`);
        return response.text();
      }).catch(error => { cache.delete(language); throw error; });
      cache.set(language, request);
    }
    return cache.get(language);
  }

  async function render(host) {
    const ticket = ++generation;
    await i18n.ready;
    const language = i18n.getLanguage();
    if (ticket !== generation || activeHost?.deref() !== host) return;
    host.setAttribute('data-opm-i18n-skip', '');
    host.textContent = i18n.t('Loading changelog…');
    let html;
    let actualLanguage = language;
    try {
      try { html = await read(language); }
      catch (error) {
        if (language === 'en') throw error;
        actualLanguage = 'en';
        html = await read('en');
      }
      if (ticket !== generation || activeHost?.deref() !== host || !host.isConnected || i18n.getLanguage() !== language) return;
      host.innerHTML = html;
      host.lang = actualLanguage;
      host.dataset.opmLocale = actualLanguage;
      if (actualLanguage !== language) {
        const note = document.createElement('p');
        note.textContent = i18n.t('Chinese changelog unavailable. Showing English.');
        note.lang = language;
        host.prepend(note);
      }
    } catch (error) {
      if (ticket !== generation || activeHost?.deref() !== host || !host.isConnected) return;
      host.textContent = i18n.t('Could not load changelog.');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = i18n.t('Retry');
      retry.addEventListener('click', () => render(host));
      host.appendChild(retry);
      console.warn('[OPM i18n] Changelog unavailable:', error);
    }
  }

  const unmount = () => { generation += 1; activeHost = null; };
  globalThis.OPMChangelog = {
    mount(host) { activeHost = new WeakRef(host); return render(host); },
    unmount,
  };
  i18n.subscribe(() => {
    const host = activeHost?.deref();
    if (host?.isConnected) render(host);
    else unmount();
  });
})();

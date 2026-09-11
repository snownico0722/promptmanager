
  const listeners = new Set();
  let preference = 'auto';
  let revision = 0;

  function browserLanguage() {
    let language = '';
    try { language = globalThis.chrome?.i18n?.getUILanguage?.() || ''; } catch (_) { /* fallback */ }
    return language || globalThis.navigator?.language || 'en';
  }

  function resolveLanguage(value) {
    if (value === 'en' || value === 'zh-CN') return value;
    return browserLanguage().toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }

  let activeLanguage = resolveLanguage(preference);

  function translate(value, language = activeLanguage) {
    if (language !== 'zh-CN' || typeof value !== 'string' || !value.trim()) return value;
    const trimmed = value.trim();
    const key = trimmed.replace(/\s+/g, ' ');
    let translated = Object.hasOwn(ZH_CN, key) ? ZH_CN[key] : undefined;
    if (translated === undefined) {
      for (const pattern of DYNAMIC_PATTERNS) {
        const match = trimmed.match(pattern.re);
        if (match) { translated = pattern.zh(match); break; }
      }
    }
    if (typeof translated !== 'string' || translated === trimmed) return value;
    const start = value.indexOf(trimmed);
    return value.slice(0, start) + translated + value.slice(start + trimmed.length);
  }

  function acceptPreference(value) {
    const next = SUPPORTED.has(value) ? value : 'auto';
    const language = resolveLanguage(next);
    if (preference === next && activeLanguage === language) return;
    preference = next;
    activeLanguage = language;
    for (const listener of [...listeners]) {
      try { listener(activeLanguage); } catch (error) { console.error('[OPM i18n]', error); }
    }
  }

  async function setLanguage(value) {
    const next = SUPPORTED.has(value) ? value : 'auto';
    const writeRevision = ++revision;
    if (globalThis.chrome?.storage?.local) {
      await chrome.storage.local.set({ [LANGUAGE_KEY]: next });
    }
    if (revision === writeRevision) acceptPreference(next);
  }

  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, LANGUAGE_KEY)) return;
    revision += 1;
    acceptPreference(changes[LANGUAGE_KEY].newValue);
  });

  const initialRevision = revision;
  const ready = (async () => {
    try {
      const stored = await globalThis.chrome?.storage?.local?.get([LANGUAGE_KEY]);
      if (revision === initialRevision) acceptPreference(stored?.[LANGUAGE_KEY]);
    } catch (error) {
      console.warn('[OPM i18n] Using browser language:', error);
    }
  })();

  globalThis.OPMI18n = {
    ready,
    t: translate,
    getLanguage: () => activeLanguage,
    getPreference: () => preference,
    resolveLanguage,
    setLanguage,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    alert: message => globalThis.alert(translate(String(message))),
    confirm: message => globalThis.confirm(translate(String(message))),
  };
})();

// Shared by Puppeteer CI and local Chromium/Playwright verification.
globalThis.runDomChecks = async function () {
  const results = [];
  const check = (name, ok) => { if (!ok) throw new Error(name); results.push(name); };
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  await OPMI18n.ready;
  document.documentElement.lang = 'en';
  document.body.innerHTML = '<div id="host"><button title="Copy">Settings</button><div contenteditable="true">Copy</div></div>';
  await flush();
  check('host DOM untouched before extension root exists', document.querySelector('#host button').textContent === 'Settings');
  const root = document.createElement('section'); root.id = 'opm-root';
  root.innerHTML = '<button id="ui" title="Copy" aria-label="Copy">Save</button><span data-opm-user-content>Settings</span><div data-opm-user-content title="Copy">handle</div><textarea placeholder="Prompt Title">Copy</textarea><label data-opm-user-content>Settings</label><script type="application/json">"Copy"</script><style>/* Copy */</style><div contenteditable="true">Copy</div>';
  document.body.appendChild(root); OPMI18n.attachRoot(root); await flush();
  const ui = root.querySelector('#ui');
  check('owned UI translated', ui.textContent === '保存' && ui.title === '复制');
  check('host language and controls are unchanged', document.documentElement.lang === 'en' && document.querySelector('#host button').title === 'Copy');
  check('user content and attributes are literal', root.querySelector('span').textContent === 'Settings' && root.querySelector('div[data-opm-user-content]').title === 'Copy');
  check('editors, script and style payloads are untouched', root.querySelector('textarea').value === 'Copy' && root.querySelector('script').textContent === '"Copy"' && root.querySelector('style').textContent === '/* Copy */' && root.querySelector('[contenteditable]').textContent === 'Copy');
  ui.title = 'Delete'; ui.firstChild.data = 'Save'; ui.firstChild.data = 'Save'; await flush();
  await OPMI18n.setLanguage('en'); await flush();
  check('duplicate mutations preserve source text', ui.textContent === 'Save');
  check('changing title cannot poison aria-label source', ui.title === 'Delete' && ui.getAttribute('aria-label') === 'Copy');
  await OPMI18n.setLanguage('zh-CN'); await flush();
  ui.removeAttribute('title'); await flush(); ui.title = 'Edit'; await flush();
  const field = root.querySelector('textarea'); field.value = 'Copy draft'; field.focus(); field.setSelectionRange(2, 4);
  await OPMI18n.setLanguage('en'); await flush();
  check('removed/re-added attributes get a fresh source', ui.title === 'Edit');
  check('language switch preserves draft, focus and selection', field.value === 'Copy draft' && document.activeElement === field && field.selectionStart === 2 && field.selectionEnd === 4);
  OPMI18n.attachRoot(document.documentElement); await OPMI18n.setLanguage('zh-CN'); await flush();
  check('host document cannot be registered as an owned root', document.querySelector('#host button').textContent === 'Settings');
  OPMI18n.detachRoot(root); root.remove();
  const replacement = document.createElement('div'); replacement.id = 'opm-root'; replacement.textContent = 'Save'; document.body.appendChild(replacement); OPMI18n.attachRoot(replacement); await flush();
  check('replacement root is localized explicitly', replacement.textContent === '保存');
  check('no native fetch or dialog monkey patches', Object.entries(__nativeFunctions).every(([k, v]) => globalThis[k] === v));
  return results;
};

globalThis.runChangelogChecks = async function () {
  const results = [];
  const check = (name, ok) => { if (!ok) throw new Error(name); results.push(name); };
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const host = document.createElement('div'); document.body.appendChild(host);
  const first = OPMChangelog.mount(host); await flush();
  await OPMI18n.setLanguage('en'); await flush();
  __resolveChangelog('en', '<p>English changelog</p>'); await flush();
  __resolveChangelog('zh-CN', '<p>任意新版本的中文日志</p>'); await first; await flush();
  check('rapid switching cannot display a stale language', host.textContent === 'English changelog' && host.dataset.opmLocale === 'en');
  check('one request per language; no original competing loader', __changelogRequests.length === 2);
  await OPMI18n.setLanguage('zh-CN'); await flush();
  check('cached log uses explicit locale, not a hard-coded version string', host.textContent === '任意新版本的中文日志');
  const before = __changelogRequests.length; host.appendChild(document.createElement('span')); await flush();
  check('DOM mutations do not cause new changelog loads', __changelogRequests.length === before);
  check('changelog loader does not replace fetch', fetch === __changelogFetch);
  OPMChangelog.unmount(); host.remove();
  return results;
};

globalThis.inspectPageTranslation = function () {
  const untranslated = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const node = walk.currentNode;
    if (node.parentElement?.closest('script,style,[data-opm-user-content]')) continue;
    const text = node.nodeValue.trim();
    if (text && /[a-zA-Z]/.test(text) && OPMI18n.t(text) !== text) untranslated.push(text);
  }
  return untranslated;
};

globalThis.runChangelogFailureChecks = async function () {
  const passed = [];
  const check = (name, ok) => { if (!ok) throw new Error(name); passed.push(name); };
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const host = document.createElement('div'); document.body.append(host);
  const originalFetch = fetch;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(url);
    return { ok: !url.includes('zh-CN'), status: 404, text: async () => '<p>English fallback</p>' };
  };
  await OPMChangelog.mount(host);
  check('Chinese load failure falls back once to English with an honest notice', requests.length === 2 && host.dataset.opmLocale === 'en' && host.textContent.includes('以下显示英文原文') && host.textContent.includes('English fallback'));
  const before = requests.length; host.appendChild(document.createElement('span')); await flush();
  check('fallback does not trigger an observer retry loop', requests.length === before);
  OPMChangelog.unmount(); host.remove(); globalThis.fetch = originalFetch;
  return passed;
};

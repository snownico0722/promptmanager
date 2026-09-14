const t = key => window.OPMI18n.t(key);
let targets = [];
let reloadTargetId = null;

async function initialize() {
  await window.OPMI18n.ready;
  const select = document.getElementById('custom-site-tab');
  const pick = document.getElementById('custom-site-pick');
  const status = document.getElementById('custom-site-status');
  const reload = document.getElementById('custom-site-reload');
  const refresh = async () => {
    const previous = Number(select.value);
    const current = await chrome.tabs.getCurrent();
    targets = (await chrome.tabs.query({ currentWindow: true }))
      .filter(tab => /^https?:\/\//.test(tab.url || ''))
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    select.replaceChildren(...targets.map(tab => {
      const option = document.createElement('option');
      option.value = String(tab.id);
      option.textContent = `${tab.title || ''} — ${new URL(tab.url).hostname}`;
      return option;
    }));
    const preferred = targets.find(tab => tab.id === previous)
      || targets.find(tab => tab.id === current?.openerTabId) || targets[0];
    if (preferred) select.value = String(preferred.id);
    pick.disabled = !preferred;
    status.textContent = preferred ? '' : t('settings.openWebsiteFirst');
  };
  const report = error => { status.textContent = `${t('settings.customSiteFailed')} ${error.message || error}`; };
  document.getElementById('custom-site-refresh').addEventListener('click', () => refresh().catch(report));
  pick.addEventListener('click', () => {
    const target = targets.find(tab => tab.id === Number(select.value));
    if (!target) return;
    // Request immediately in the click gesture, before any asynchronous tab work.
    const origins = [`*://${new URL(target.url).hostname}/*`];
    pick.disabled = true;
    reload.hidden = true;
    reloadTargetId = null;
    chrome.permissions.request({ origins }, async granted => {
      try {
        if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
        if (!granted) { status.textContent = t('settings.sitePermissionDenied'); return; }
        const result = await chrome.runtime.sendMessage({ type: 'OPM_PIN_INPUT', tabId: target.id, action: 'start' });
        if (result?.error === 'reload_required') {
          reloadTargetId = target.id;
          reload.hidden = false;
          status.textContent = t('settings.reloadTargetHelp');
        } else if (!result?.ok && result?.error !== 'picker_already_active') {
          throw new Error(result?.error || 'No response');
        } else status.textContent = t('settings.clickTargetInput');
      } catch (error) { report(error); }
      finally { pick.disabled = false; }
    });
  });
  reload.addEventListener('click', async () => {
    if (reloadTargetId == null || !window.confirm(t('settings.reloadTargetHelp'))) return;
    try {
      await chrome.tabs.reload(reloadTargetId);
      reload.hidden = true;
      status.textContent = t('settings.pickAgain');
    } catch (error) { report(error); }
  });
  await refresh();
}

document.addEventListener('DOMContentLoaded', () => initialize().catch(console.error));

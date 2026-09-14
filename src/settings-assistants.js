import {
  resolveProviderIconUrl,
  attachProviderIconFallback,
} from './utils/providerIcons.js';
import {
  expandOriginPatterns,
  hasAnyOriginPermission,
} from './utils/originPatterns.js';

async function loadProviders() {
  const response = await fetch(chrome.runtime.getURL('llm_providers.json'));
  if (!response.ok) throw new Error(`Provider registry HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.llm_providers) ? data.llm_providers : [];
}

async function persistProviderState(provider, enabled) {
  const stored = await chrome.storage.local.get(['aiProvidersMap']);
  const map = stored?.aiProvidersMap && typeof stored.aiProvidersMap === 'object'
    ? { ...stored.aiProvidersMap }
    : {};

  map[provider.name] = {
    ...(map[provider.name] || {}),
    hasPermission: enabled ? 'Yes' : 'No',
    urlPattern: provider.pattern,
    url: provider.url,
    iconUrl: resolveProviderIconUrl(provider.icon_url, provider.url),
  };
  await chrome.storage.local.set({ aiProvidersMap: map });
}

async function setProviderEnabled(provider, enabled) {
  const origins = expandOriginPatterns(provider.pattern);
  if (!origins.length) return false;

  if (enabled) {
    const granted = await new Promise((resolve) => {
      chrome.permissions.request({ origins }, (ok) => resolve(Boolean(ok)));
    });
    if (!granted) return false;
    await persistProviderState(provider, true);
    return true;
  }

  await new Promise((resolve) => {
    chrome.permissions.remove({ origins }, () => resolve());
  });
  await persistProviderState(provider, false);
  return true;
}

function makeAssistantCard(provider, enabled, rerender) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `settings-assistant-card${enabled ? ' is-enabled' : ''}`;
  button.setAttribute('aria-pressed', String(enabled));

  const icon = document.createElement('img');
  icon.className = 'settings-assistant-icon';
  icon.src = resolveProviderIconUrl(provider.icon_url, provider.url);
  icon.alt = '';
  icon.width = 28;
  icon.height = 28;
  attachProviderIconFallback(icon, provider.url);

  const name = document.createElement('span');
  name.className = 'settings-assistant-name';
  name.textContent = provider.name;

  const toggle = document.createElement('span');
  toggle.className = 'settings-assistant-toggle';
  toggle.setAttribute('aria-hidden', 'true');

  button.append(icon, name, toggle);
  window.OPMI18n.bind(
    button,
    enabled ? 'settings.removeAccess' : 'provider.activate',
    { site: provider.name, name: provider.name },
    'aria-label',
  );

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await setProviderEnabled(provider, !enabled);
    } catch (error) {
      console.error('[OPM] Failed to update assistant permission:', provider.name, error);
    } finally {
      await rerender();
    }
  });

  return button;
}

let renderInFlight = null;

async function renderAssistantSettings() {
  const host = document.getElementById('settings-assistants-grid');
  if (!host) return;
  if (renderInFlight) return renderInFlight;

  renderInFlight = (async () => {
    const providers = await loadProviders();
    const rows = await Promise.all(providers.map(async (provider) => ({
      provider,
      enabled: await hasAnyOriginPermission(provider.pattern),
    })));

    rows.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.provider.name.localeCompare(b.provider.name);
    });

    host.replaceChildren();
    rows.forEach(({ provider, enabled }) => {
      host.appendChild(makeAssistantCard(provider, enabled, renderAssistantSettings));
    });
  })().catch((error) => {
    console.error('[OPM] Failed to render assistant settings:', error);
  }).finally(() => {
    renderInFlight = null;
  });

  return renderInFlight;
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.OPMI18n.ready;
  await renderAssistantSettings();

  chrome.permissions.onAdded.addListener(() => renderAssistantSettings());
  chrome.permissions.onRemoved.addListener(() => renderAssistantSettings());
});

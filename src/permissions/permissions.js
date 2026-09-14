// COMMENT: Install onboarding — launcher choice and unified LLM shortcuts
import { OPM_DEV_FORCE_ONBOARDING_STORAGE_KEY } from '../devFlags.js';
import { attachProviderIconFallback } from '../utils/providerIcons.js';
import { expandOriginPatterns } from '../utils/originPatterns.js';

const t = (key, params) => window.OPMI18n.t(key, params);

/** COMMENT: ?reset=1 clears onboarding state so the in-page tooltip shows again (dev only). */
async function maybeResetOnboardingFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('reset')) return;
  await chrome.storage.local.set({
    onboardingCompleted: false,
    [OPM_DEV_FORCE_ONBOARDING_STORAGE_KEY]: true,
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  await window.OPMI18n.ready;
  maybeResetOnboardingFromQuery().catch(console.error);
  const DISPLAY_MODE_KEY = 'displayMode';
  const DEFAULT_DISPLAY_MODE = 'hotCorner';
  const ALLOWED_DISPLAY_MODES = new Set(['standard', 'hotCorner', 'invisible']);

  /** COMMENT: Wire the install-page launcher choice. */
  function initDisplayModePicker() {
    const section = document.getElementById('display-mode-section');
    if (!section) return;

    const radios = section.querySelectorAll('input[name="displayMode"]');
    const options = section.querySelectorAll('.custom-display-mode-option');

    const updateSelectedUI = (mode) => {
      options.forEach((option) => {
        const radio = option.querySelector('input[type="radio"]');
        option.classList.toggle('is-selected', radio?.value === mode);
      });
    };

    chrome.storage.local.get([DISPLAY_MODE_KEY], (result) => {
      const storedMode = result[DISPLAY_MODE_KEY];
      const mode = ALLOWED_DISPLAY_MODES.has(storedMode) ? storedMode : DEFAULT_DISPLAY_MODE;
      if (!ALLOWED_DISPLAY_MODES.has(storedMode)) {
        chrome.storage.local.set({ [DISPLAY_MODE_KEY]: DEFAULT_DISPLAY_MODE });
      }
      radios.forEach((radio) => {
        radio.checked = radio.value === mode;
      });
      updateSelectedUI(mode);
    });

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked || !ALLOWED_DISPLAY_MODES.has(radio.value)) return;
        chrome.storage.local.set({ [DISPLAY_MODE_KEY]: radio.value });
        updateSelectedUI(radio.value);
      });
    });
  }

  initDisplayModePicker();

  const providerShortcutsContainer = document.getElementById('provider-shortcuts');
  const removeAllBtn = document.getElementById('remove-all-permissions');
  const anotherWebsiteBtn = document.getElementById('another-website-btn');
  const anotherWebsiteHint = document.getElementById('another-website-hint');

  if (!providerShortcutsContainer) {
    console.error('Required container element (#provider-shortcuts) not found.');
    return;
  }

  // COMMENT: Custom sites are pinned from the manager on the target page — show guidance only here.
  if (anotherWebsiteBtn && anotherWebsiteHint) {
    anotherWebsiteBtn.addEventListener('click', () => {
      const willShow = anotherWebsiteHint.hidden;
      anotherWebsiteHint.hidden = !willShow;
      anotherWebsiteBtn.setAttribute('aria-expanded', willShow ? 'true' : 'false');
      if (willShow) {
        anotherWebsiteHint.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  /** COMMENT: Request host access in the click handler, then open the provider tab. */
  function launchProviderFromOnboarding(providerKey, providerInfo) {
    return new Promise((resolve) => {
      const origins = expandOriginPatterns(providerInfo.urlPattern);
      if (!origins.length) {
        resolve({ ok: false, error: 'missing_provider' });
        return;
      }

      const finishLaunch = (permissionGranted) => {
        chrome.runtime.sendMessage(
          {
            type: 'OPM_LAUNCH_PROVIDER_ONBOARDING',
            providerKey,
            url: providerInfo.url,
            originPattern: providerInfo.urlPattern,
            permissionAlreadyGranted: permissionGranted,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            if (response?.error === 'permission_denied') {
              alert(t('onboarding.permissionDenied', { provider: providerKey }));
            }
            resolve(response || { ok: false, error: 'no_response' });
          },
        );
      };

      const syncGrantedState = (granted) => {
        if (!granted) return;
        chrome.storage.local.get(['aiProvidersMap'], (res) => {
          const map = res?.aiProvidersMap || {};
          if (map[providerKey]) {
            map[providerKey].hasPermission = 'Yes';
            chrome.storage.local.set({ aiProvidersMap: map });
          }
        });
      };

      chrome.permissions.request({ origins }, (granted) => {
        if (chrome.runtime.lastError) {
          alert(t('onboarding.permissionRequestFailed', { provider: providerKey, error: chrome.runtime.lastError.message }));
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (!granted) {
          alert(t('onboarding.permissionDenied', { provider: providerKey }));
          resolve({ ok: false, error: 'permission_denied' });
          return;
        }

        syncGrantedState(true);
        finishLaunch(true);
      });
    });
  }

  /** COMMENT: Render all default LLM providers as equal shortcuts. */
  function populateProviders(providersMap) {
    providerShortcutsContainer.querySelectorAll('[data-provider]').forEach((el) => el.remove());

    for (const [key, providerInfo] of Object.entries(providersMap)) {
      const iconUrl = providerInfo.iconUrl;
      const isGranted = providerInfo.hasPermission === 'Yes';

      const element = document.createElement('button');
      element.type = 'button';
      element.id = `perm-${key}`;
      element.className = `custom-button custom-provider-shortcut${isGranted ? ' is-granted' : ''}`;
      element.dataset.provider = key;
      const icon = document.createElement('img');
      icon.src = iconUrl;
      icon.width = 32;
      icon.height = 32;
      icon.className = 'custom-rounded-circle';
      window.OPMI18n.bind(icon, 'provider.icon', { name: key }, 'alt');
      const label = document.createElement('span');
      label.className = 'custom-mb-0';
      label.textContent = key;
      element.append(icon, label);
      providerShortcutsContainer.appendChild(element);

      const iconEl = element.querySelector('img');
      if (iconEl) attachProviderIconFallback(iconEl, providerInfo.url);

      element.addEventListener('click', () => {
        launchProviderFromOnboarding(key, providerInfo).catch(console.error);
      });
    }

    if (anotherWebsiteBtn) {
      providerShortcutsContainer.appendChild(anotherWebsiteBtn);
    }
    if (anotherWebsiteHint) {
      providerShortcutsContainer.appendChild(anotherWebsiteHint);
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.aiProvidersMap?.newValue) {
      populateProviders(changes.aiProvidersMap.newValue);
    }
  });

  chrome.storage.local.get(['aiProvidersMap'], function (result) {
    if (result.aiProvidersMap) {
      populateProviders(result.aiProvidersMap);
      return;
    }
    providerShortcutsContainer.replaceChildren(window.OPMI18n.bind(document.createElement('p'), 'onboarding.noProviderData'));
  });

  if (removeAllBtn) {
    removeAllBtn.addEventListener('click', () => {
      chrome.storage.local.get(['aiProvidersMap'], (res) => {
        const currentMap = res && res.aiProvidersMap ? res.aiProvidersMap : {};
        const allPatterns = Array.from(new Set(
          Object.values(currentMap)
            .flatMap((v) => expandOriginPatterns(v && v.urlPattern))
        ));

        const persistRevokedState = () => {
          const updated = {};
          for (const [key, val] of Object.entries(currentMap)) {
            updated[key] = {
              ...val,
              hasPermission: 'No',
            };
          }
          chrome.storage.local.set({
            aiProvidersMap: updated,
            pinned_inputs_v1: {},
            learned_inputs_v1: {},
          });
        };

        if (allPatterns.length === 0) {
          persistRevokedState();
          return;
        }

        chrome.permissions.remove({ origins: allPatterns }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to remove permissions:', chrome.runtime.lastError);
            alert(t('onboarding.removePermissionsFailed'));
            return;
          }
          persistRevokedState();
        });
      });
    });
  }

  const darkQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const applyHeaderIcon = (dark) => {
    const headerIcon = document.getElementById('header-icon');
    if (!headerIcon) return;
    headerIcon.src = dark ? '../icons/icon-base.png' : '../icons/icon128.png';
  };
  if (darkQuery) {
    applyHeaderIcon(darkQuery.matches);
    darkQuery.addEventListener('change', (event) => applyHeaderIcon(event.matches));
  }
});

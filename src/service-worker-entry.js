import './service-worker.js';
import { getPrompts, onPromptsChanged } from './storage/promptStorage.js';

const LANGUAGE_KEY = 'uiLanguage';
const SAVE_MENU_ID = 'save-as-prompt';
let localizationTimer = null;

async function isSimplifiedChinese() {
  try {
    const stored = await chrome.storage.local.get([LANGUAGE_KEY]);
    if (stored?.[LANGUAGE_KEY] === 'zh-CN') return true;
    if (stored?.[LANGUAGE_KEY] === 'en') return false;
  } catch (_) {
    // Fall back to the browser UI language.
  }
  const uiLanguage = String(chrome.i18n?.getUILanguage?.() || '').toLowerCase();
  return uiLanguage.startsWith('zh');
}

function updateMenuItem(id, updateProperties) {
  return new Promise((resolve) => {
    chrome.contextMenus.update(id, updateProperties, () => {
      const error = chrome.runtime.lastError;
      resolve(!error);
    });
  });
}

async function localizeExistingMenu() {
  const zh = await isSimplifiedChinese();
  const saveNewPrompt = zh ? '保存为新提示词' : 'Save new prompt';
  const untitledPrompt = zh ? '未命名提示词' : 'Untitled prompt';

  // COMMENT: service-worker.js remains the single owner of menu creation, ordering,
  // removal and click behavior. This layer only changes labels after an upstream rebuild.
  await updateMenuItem(SAVE_MENU_ID, { title: saveNewPrompt });

  // Prompt titles are user content and stay untouched. Only localize the fallback label
  // for prompts that actually have an empty title.
  const prompts = await getPrompts().catch(() => []);
  await Promise.all(prompts
    .filter((prompt) => !String(prompt?.title || '').trim())
    .map((prompt) => updateMenuItem(`prompt-${prompt.uuid}`, { title: untitledPrompt })));
}

function scheduleMenuLocalization(delay = 300) {
  clearTimeout(localizationTimer);
  localizationTimer = setTimeout(() => {
    localizeExistingMenu().catch((error) => {
      console.warn('[PromptManager] Failed to localize context menu:', error);
    });
  }, delay);
}

// The upstream worker registers first through the static import above. It rebuilds
// menus after prompt changes; localization runs slightly later and never calls removeAll().
chrome.runtime.onInstalled.addListener(() => scheduleMenuLocalization(500));
chrome.runtime.onStartup.addListener(() => scheduleMenuLocalization(500));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[LANGUAGE_KEY]) {
    scheduleMenuLocalization(50);
  }
});
onPromptsChanged(() => scheduleMenuLocalization(300));

// Context menus survive MV3 worker sleeps. Reconcile once whenever the worker wakes so
// a language change made in another extension page is reflected without rebuilding menus.
scheduleMenuLocalization(500);

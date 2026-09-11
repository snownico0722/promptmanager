import './service-worker.js';
import { getPrompts, onPromptsChanged, savePrompt } from './storage/promptStorage.js';

const LANGUAGE_KEY = 'uiLanguage';
const ORIGINAL_SAVE_MENU_ID = 'save-as-prompt';
const LOCALIZED_SAVE_MENU_ID = 'save-as-prompt-i18n';
const MENU_PARENT_ID = 'open-prompt-manager';
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

function removeMenuItem(id) {
  return new Promise((resolve) => {
    chrome.contextMenus.remove(id, () => {
      // Missing menu ids are expected during install/rebuild races.
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function updateMenuItem(id, updateProperties) {
  return new Promise((resolve) => {
    chrome.contextMenus.update(id, updateProperties, () => {
      const error = chrome.runtime.lastError;
      resolve(!error);
    });
  });
}

function createMenuItem(createProperties) {
  return new Promise((resolve) => {
    try {
      chrome.contextMenus.create(createProperties, () => {
        const error = chrome.runtime.lastError;
        resolve(!error);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

async function ensureLocalizedSaveMenu(title) {
  // COMMENT: The upstream worker remains the sole owner of the parent menu, separator,
  // and prompt items. We replace only its save-selection item with a localized id so
  // the upstream click handler ignores it and cannot duplicate saves.
  await removeMenuItem(ORIGINAL_SAVE_MENU_ID);

  const updated = await updateMenuItem(LOCALIZED_SAVE_MENU_ID, { title });
  if (updated) return true;

  return createMenuItem({
    id: LOCALIZED_SAVE_MENU_ID,
    parentId: MENU_PARENT_ID,
    title,
    contexts: ['selection'],
  });
}

async function localizeExistingMenu() {
  const zh = await isSimplifiedChinese();
  const saveNewPrompt = zh ? '保存为新提示词' : 'Save new prompt';
  const untitledPrompt = zh ? '未命名提示词' : 'Untitled prompt';

  const saveReady = await ensureLocalizedSaveMenu(saveNewPrompt);
  if (!saveReady) return;

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

async function saveSelectionAsPrompt(info, tab) {
  const selectedText = String(info?.selectionText || '').trim();
  if (!selectedText || !tab?.id) return;

  const zh = await isSimplifiedChinese();
  const titleQuestion = zh ? '请输入提示词标题' : 'Enter a title for your prompt';
  const missingTitle = zh ? '请为提示词添加标题。' : 'Please add a title to your prompt.';

  const [{ result: title } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (message) => window.prompt(message, ''),
    args: [titleQuestion],
  }).catch(() => []);

  if (title === null || title === undefined) return;
  const cleanTitle = String(title).trim();
  if (!cleanTitle) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message) => window.alert(message),
      args: [missingTitle],
    }).catch(() => {});
    return;
  }

  await savePrompt({
    title: cleanTitle,
    content: selectedText,
    tags: [],
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info?.menuItemId !== LOCALIZED_SAVE_MENU_ID) return;
  saveSelectionAsPrompt(info, tab).catch((error) => {
    console.warn('[PromptManager] Failed to save selected text as prompt:', error);
  });
});

// The upstream worker creates/rebuilds the menu first. Localization only reconciles
// the one replaced item afterward; it never calls removeAll() or rebuilds prompt items.
chrome.runtime.onInstalled.addListener(() => scheduleMenuLocalization(500));
chrome.runtime.onStartup.addListener(() => scheduleMenuLocalization(500));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[LANGUAGE_KEY]) {
    scheduleMenuLocalization(50);
  }
});
onPromptsChanged(() => scheduleMenuLocalization(300));

// Menus persist across MV3 worker sleeps, but language/storage may have changed while
// the worker was stopped. Reconcile once on every worker start without rebuilding it.
scheduleMenuLocalization(500);

import './service-worker.js';
import { getPrompts, onPromptsChanged, savePrompt } from './storage/promptStorage.js';

const LANGUAGE_KEY = 'uiLanguage';
const LOCALIZED_SAVE_MENU_ID = 'save-as-prompt-i18n';
let rebuildTimer = null;

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

async function rebuildLocalizedContextMenu() {
  const zh = await isSimplifiedChinese();
  const saveNewPrompt = zh ? '保存为新提示词' : 'Save new prompt';
  const untitledPrompt = zh ? '未命名提示词' : 'Untitled prompt';

  await new Promise((resolve) => chrome.contextMenus.removeAll(() => resolve()));

  chrome.contextMenus.create({
    id: 'open-prompt-manager',
    title: 'Open Prompt Manager',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: LOCALIZED_SAVE_MENU_ID,
    parentId: 'open-prompt-manager',
    title: saveNewPrompt,
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'save-separator',
    parentId: 'open-prompt-manager',
    type: 'separator',
    contexts: ['selection'],
  });

  const prompts = await getPrompts().catch(() => []);
  prompts.forEach((prompt) => {
    chrome.contextMenus.create({
      id: `prompt-${prompt.uuid}`,
      parentId: 'open-prompt-manager',
      title: prompt.title || untitledPrompt,
      contexts: ['all'],
    });
  });
}

function scheduleLocalizedContextMenu(delay = 360) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildLocalizedContextMenu().catch((error) => {
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

// COMMENT: The localized save item deliberately uses a different id so the original
// worker's save-as-prompt handler ignores it. Existing prompt item ids stay unchanged,
// so insertion still uses the upstream behavior without duplication.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info?.menuItemId !== LOCALIZED_SAVE_MENU_ID) return;
  saveSelectionAsPrompt(info, tab).catch((error) => {
    console.warn('[PromptManager] Failed to save selected text as prompt:', error);
  });
});

// COMMENT: The original worker remains the source of truth for all other behavior. Its
// listeners register first via the static import above; this layer reapplies localized
// menu titles shortly afterward without changing normal prompt insertion semantics.
chrome.runtime.onInstalled.addListener(() => scheduleLocalizedContextMenu(500));
chrome.runtime.onStartup.addListener(() => scheduleLocalizedContextMenu(500));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[LANGUAGE_KEY]) {
    scheduleLocalizedContextMenu(50);
  }
});
onPromptsChanged(() => scheduleLocalizedContextMenu(360));

// MV3 workers can wake without an install/startup event. Ensure the current menu follows the saved language.
scheduleLocalizedContextMenu(600);

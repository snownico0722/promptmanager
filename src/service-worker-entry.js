import './service-worker.js';
import { getPrompts, onPromptsChanged } from './storage/promptStorage.js';

const LANGUAGE_KEY = 'uiLanguage';
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
    id: 'save-as-prompt',
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

// COMMENT: The original worker remains the source of truth for behavior. Its listeners
// register first via the static import above; this layer reapplies localized menu titles
// shortly afterward without changing click handling or prompt storage semantics.
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

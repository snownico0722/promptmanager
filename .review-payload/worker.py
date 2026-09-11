from pathlib import Path
p=Path('src/service-worker.js'); s=p.read_text()
start=s.index('// Create the context menu\n'); end=s.index('// On install or update, create the context menu',start)
s=s[:start]+'''// One owner for creation, ordering and localization. Serialize asynchronous rebuilds.
let menuRebuildPending = false;
let menuRebuildPromise = null;

function menuCall(method, ...args) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus[method](...args, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function createPromptContextMenu() {
  menuRebuildPending = true;
  if (menuRebuildPromise) return menuRebuildPromise;
  menuRebuildPromise = (async () => {
    await globalThis.OPMI18n.ready;
    while (menuRebuildPending) {
      menuRebuildPending = false;
      const prompts = await getAllPrompts();
      const t = globalThis.OPMI18n.t;
      await menuCall('removeAll');
      await menuCall('create', {
        id: 'open-prompt-manager', title: 'Open Prompt Manager', contexts: ['all'],
      });
      await menuCall('create', {
        id: 'save-as-prompt', parentId: 'open-prompt-manager',
        title: t('Save new prompt'), contexts: ['selection'],
      });
      await menuCall('create', {
        id: 'save-separator', parentId: 'open-prompt-manager',
        type: 'separator', contexts: ['selection'],
      });
      await Promise.all(prompts.map(prompt => menuCall('create', {
        id: 'prompt-' + prompt.uuid, parentId: 'open-prompt-manager',
        title: prompt.title || t('Untitled prompt'), contexts: ['all'],
      })));
      await chrome.action.setTitle({ title: t('Open Sidebar') });
    }
  })().catch(error => {
    menuRebuildPending = false;
    console.error('[PromptManager] Failed to rebuild context menu:', error);
  }).finally(() => {
    menuRebuildPromise = null;
    if (menuRebuildPending) createPromptContextMenu();
  });
  return menuRebuildPromise;
}

globalThis.OPMI18n.subscribe(createPromptContextMenu);

''' + s[end:]
s=s.replace("      const selected = info.selectionText || '';", "      const selected = info.selectionText || '';\n      await globalThis.OPMI18n.ready;",1)
s=s.replace("        func: () => {\n          return window.prompt('Enter a title for your prompt', '');\n        }", "        func: message => window.prompt(message, ''),\n        args: [globalThis.OPMI18n.t('Enter a title for your prompt')],",1)
s=s.replace("      const title = (titleValue || '').trim();", "      if (titleValue === null || titleValue === undefined) return;\n      const title = String(titleValue).trim();",1)
s=s.replace("          func: () => { window.alert('Please add a title to your prompt.'); }", "          func: message => window.alert(message),\n          args: [globalThis.OPMI18n.t('Please add a title to your prompt.')],",1)
s=s.replace('clearStaleDevOnboardingFlag();','// Rebuild once on worker wake, including extension reloads.\ncreatePromptContextMenu();\nclearStaleDevOnboardingFlag();',1)
p.write_text(s)

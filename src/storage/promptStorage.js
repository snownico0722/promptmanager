// Shared client for manager, settings, content scripts and the background worker.
// Only storeWorker.js installs a local transport; every other context sends a message.
export const PROMPT_STORAGE_VERSION = 3;
export const STORE_MESSAGE = 'OPM_STORE';
let localTransport = null;
export function setLocalStorageTransport(dispatch) { localTransport = dispatch; }
async function request(action, data = {}) {
  if (localTransport) return localTransport(action, data);
  const response = await chrome.runtime.sendMessage({ type: STORE_MESSAGE, action, data });
  if (!response?.ok) throw new Error(response?.error || 'Storage service unavailable');
  return response.result;
}
export const getStoreSnapshot = () => request('snapshot');
export const getPrompts = (options = {}) => request('prompts', options);
export const getFolders = (options = {}) => request('folders', options);
export const savePrompt = prompt => request('savePrompt', prompt);
export const updatePrompt = (uuid, partial) => request('updatePrompt', { uuid, partial });
export const deletePrompt = uuid => request('deletePrompt', { uuid });
export const deleteAllPrompts = (workspaceId) => request('deleteAllPrompts', { workspaceId });
export const reorderPrompts = (ids, workspaceId) => request('reorderPrompts', { ids, workspaceId });
export const removeTagFromPrompts = (tag, workspaceId) => request('removeTag', { tag, workspaceId });
export const saveFolder = folder => request('saveFolder', folder);
export const updateFolder = (id, partial) => request('updateFolder', { id, partial });
export const deleteFolder = id => request('deleteFolder', { id });
export const movePromptToFolder = (uuid, folderId = null) => updatePrompt(uuid, { folderId });
export const saveWorkspace = name => request('saveWorkspace', { name });
export const renameWorkspace = (id, name) => request('renameWorkspace', { id, name });
export const deleteWorkspace = id => request('deleteWorkspace', { id });
export const setActiveWorkspace = id => request('switchWorkspace', { id });
export const buildExportPayload = () => request('export');

export async function importPrompts(source) {
  let payload = source;
  if (typeof File !== 'undefined' && source instanceof File) payload = JSON.parse(await source.text());
  else if (typeof source === 'string') payload = JSON.parse(source);
  return request('import', { payload });
}
export async function exportPrompts() {
  const payload = await buildExportPayload();
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `opm-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
}
export function onStoreChanged(callback) {
  const listener = (changes, area) => {
    const store = changes.prompts_storage?.newValue;
    if (area === 'local' && store?.version === PROMPT_STORAGE_VERSION) callback(store);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
export function onPromptsChanged(callback) {
  return onStoreChanged(store => {
    if (store?.version === PROMPT_STORAGE_VERSION) {
      callback(store.prompts.filter(p => p.workspaceId === store.activeWorkspaceId));
    }
  });
}

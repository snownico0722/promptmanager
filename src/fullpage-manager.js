// Full-page manager controller.
// The legacy sidepanel controller still owns prompt CRUD/form wiring; this file owns
// the full-page workspace, folder, navigation, and placement behavior directly.
import {
  deleteFolder,
  getFolders,
  getPrompts,
  movePromptToFolder,
  onPromptsChanged,
  saveFolder,
  updateFolder,
} from './storage/promptStorage.js';

const OPTION_ALL = '__all__';
const OPTION_UNCATEGORIZED = '__uncategorized__';
const DEFAULT_WORKSPACE_ID = 'workspace-default';

const WORKSPACES_KEY = 'opmManagerWorkspacesV1';
const ACTIVE_WORKSPACE_KEY = 'opmManagerActiveWorkspaceV1';
const PROMPT_WORKSPACES_KEY = 'opmManagerPromptWorkspacesV1';
const FOLDER_WORKSPACES_KEY = 'opmManagerFolderWorkspacesV1';

const managerState = {
  folderOption: OPTION_ALL,
  prompts: [],
  folders: [],
  promptsById: new Map(),
  workspaces: [],
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  promptWorkspaces: {},
  folderWorkspaces: {},
  pendingPlacement: null,
  workspaceEditing: false,
};

function isChineseUi() {
  const language = globalThis.OPMI18n?.getLanguage?.() || navigator.language || 'en';
  return String(language).toLowerCase().startsWith('zh');
}

function copy() {
  return isChineseUi()
    ? {
        edit: '编辑',
        done: '完成',
        create: '新建',
        rename: '重命名',
        remove: '删除',
        defaultName: '默认',
        name: '名称',
        keepOne: '至少需要保留一个。',
        confirmRemove: '删除“{name}”？其中内容会移动到其他项。',
        noFolder: '无文件夹',
        all: '全部',
        uncategorized: '未分类',
        newFolder: '新建文件夹',
        renameFolder: '重命名文件夹',
        deleteFolder: '删除文件夹',
        folderName: '文件夹名称',
        confirmDeleteFolder: '删除文件夹“{name}”？其中的提示词会变为未分类。',
      }
    : {
        edit: 'Edit',
        done: 'Done',
        create: 'New',
        rename: 'Rename',
        remove: 'Delete',
        defaultName: 'Default',
        name: 'Name',
        keepOne: 'At least one must remain.',
        confirmRemove: 'Delete “{name}”? Its contents will move to another item.',
        noFolder: 'No folder',
        all: 'All',
        uncategorized: 'Uncategorized',
        newFolder: 'New folder',
        renameFolder: 'Rename folder',
        deleteFolder: 'Delete folder',
        folderName: 'Folder name',
        confirmDeleteFolder: 'Delete folder “{name}”? Its prompts will become uncategorized.',
      };
}

function format(text, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function generateId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function refreshPromptMaps() {
  managerState.promptsById = new Map(
    managerState.prompts.map((prompt, index) => [prompt.uuid, { prompt, index }]),
  );
}

function displayWorkspaceName(workspace) {
  if (!workspace) return '';
  const name = String(workspace.name || '').trim();
  if (workspace.id === DEFAULT_WORKSPACE_ID
    && ['默认工作区', 'Default workspace', '默认', 'Default'].includes(name)) {
    return copy().defaultName;
  }
  return name || copy().defaultName;
}

function promptWorkspaceId(promptUuid) {
  return managerState.promptWorkspaces[promptUuid] || DEFAULT_WORKSPACE_ID;
}

function folderWorkspaceId(folderId) {
  return managerState.folderWorkspaces[folderId] || DEFAULT_WORKSPACE_ID;
}

function activePrompts() {
  return managerState.prompts.filter(
    (prompt) => promptWorkspaceId(prompt.uuid) === managerState.activeWorkspaceId,
  );
}

function activeFolders() {
  return managerState.folders.filter(
    (folder) => folderWorkspaceId(folder.id) === managerState.activeWorkspaceId,
  );
}

async function persistWorkspaceState() {
  await chrome.storage.local.set({
    [WORKSPACES_KEY]: managerState.workspaces,
    [ACTIVE_WORKSPACE_KEY]: managerState.activeWorkspaceId,
    [PROMPT_WORKSPACES_KEY]: managerState.promptWorkspaces,
    [FOLDER_WORKSPACES_KEY]: managerState.folderWorkspaces,
  });
}

async function ensureWorkspaceState(prompts, folders) {
  const stored = await chrome.storage.local.get([
    WORKSPACES_KEY,
    ACTIVE_WORKSPACE_KEY,
    PROMPT_WORKSPACES_KEY,
    FOLDER_WORKSPACES_KEY,
  ]);
  const labels = copy();

  let workspaces = Array.isArray(stored[WORKSPACES_KEY])
    ? stored[WORKSPACES_KEY]
        .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item) => ({ id: item.id, name: item.name.trim() || labels.defaultName }))
    : [];
  if (workspaces.length === 0) {
    workspaces = [{ id: DEFAULT_WORKSPACE_ID, name: labels.defaultName }];
  }

  let activeWorkspaceId = stored[ACTIVE_WORKSPACE_KEY];
  if (!workspaces.some((item) => item.id === activeWorkspaceId)) {
    activeWorkspaceId = workspaces[0].id;
  }

  const promptWorkspaces = stored[PROMPT_WORKSPACES_KEY]
    && typeof stored[PROMPT_WORKSPACES_KEY] === 'object'
    ? { ...stored[PROMPT_WORKSPACES_KEY] }
    : {};
  const folderWorkspaces = stored[FOLDER_WORKSPACES_KEY]
    && typeof stored[FOLDER_WORKSPACES_KEY] === 'object'
    ? { ...stored[FOLDER_WORKSPACES_KEY] }
    : {};

  const fallbackWorkspace = workspaces.some((item) => item.id === DEFAULT_WORKSPACE_ID)
    ? DEFAULT_WORKSPACE_ID
    : workspaces[0].id;
  const validWorkspaceIds = new Set(workspaces.map((item) => item.id));
  const promptIds = new Set(prompts.map((prompt) => prompt.uuid));
  const folderIds = new Set(folders.map((folder) => folder.id));

  Object.keys(promptWorkspaces).forEach((uuid) => {
    if (!promptIds.has(uuid)) delete promptWorkspaces[uuid];
    else if (!validWorkspaceIds.has(promptWorkspaces[uuid])) promptWorkspaces[uuid] = fallbackWorkspace;
  });
  prompts.forEach((prompt) => {
    if (!promptWorkspaces[prompt.uuid]) promptWorkspaces[prompt.uuid] = fallbackWorkspace;
  });

  Object.keys(folderWorkspaces).forEach((folderId) => {
    if (!folderIds.has(folderId)) delete folderWorkspaces[folderId];
    else if (!validWorkspaceIds.has(folderWorkspaces[folderId])) folderWorkspaces[folderId] = fallbackWorkspace;
  });
  folders.forEach((folder) => {
    if (!folderWorkspaces[folder.id]) folderWorkspaces[folder.id] = fallbackWorkspace;
  });

  managerState.workspaces = workspaces;
  managerState.activeWorkspaceId = activeWorkspaceId;
  managerState.promptWorkspaces = promptWorkspaces;
  managerState.folderWorkspaces = folderWorkspaces;
  await persistWorkspaceState();
}

function forcePromptNavigationVisible() {
  const controls = document.getElementById('prompt-list-controls');
  const list = document.getElementById('prompt-list');
  if (controls) {
    controls.hidden = false;
    controls.style.removeProperty('display');
  }
  if (list) list.style.setProperty('display', 'flex', 'important');
}

function selectPromptRow(row) {
  document.querySelectorAll('#prompt-list li.is-selected').forEach((item) => {
    item.classList.remove('is-selected');
  });
  row?.classList.add('is-selected');
}

function renderPromptFolderSelect(selectedFolderId = null) {
  const select = document.getElementById('manager-prompt-folder-select');
  if (!select) return;
  const labels = copy();
  const folders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  select.replaceChildren();

  const none = document.createElement('option');
  none.value = '';
  none.textContent = labels.noFolder;
  select.appendChild(none);

  folders.forEach((folder) => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    select.appendChild(option);
  });

  select.value = folders.some((folder) => folder.id === selectedFolderId) ? selectedFolderId : '';
}

function openPromptForEditing(row) {
  if (!row) return;
  const editButton = row.querySelector('.spm-prompt-actions-overflow .spm-prompt-action-btn');
  if (!editButton) return;
  selectPromptRow(row);
  const meta = managerState.promptsById.get(row.dataset.uuid);
  editButton.click();
  queueMicrotask(() => renderPromptFolderSelect(meta?.prompt?.folderId || null));
}

function wireNavigationClicks() {
  const list = document.getElementById('prompt-list');
  if (!list || list.dataset.managerNavigationWired === '1') return;
  list.dataset.managerNavigationWired = '1';

  list.addEventListener('click', (event) => {
    if (event.target.closest('.spm-prompt-actions')) return;
    const row = event.target.closest('li[data-uuid]');
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPromptForEditing(row);
  }, true);
}

function wireCreateShortcut() {
  document.getElementById('create-prompt-btn')?.addEventListener('click', () => {
    selectPromptRow(null);
    const defaultFolder = managerState.folderOption !== OPTION_ALL
      && managerState.folderOption !== OPTION_UNCATEGORIZED
      ? managerState.folderOption
      : null;
    queueMicrotask(() => renderPromptFolderSelect(defaultFolder));
  });
}

async function assignPromptWorkspace(promptUuid, workspaceId) {
  if (!promptUuid || !workspaceId) return;
  if (managerState.promptWorkspaces[promptUuid] === workspaceId) return;
  managerState.promptWorkspaces[promptUuid] = workspaceId;
  await chrome.storage.local.set({ [PROMPT_WORKSPACES_KEY]: managerState.promptWorkspaces });
}

function rowMatchesCurrentView(meta) {
  if (!meta) return false;
  const { prompt } = meta;
  if (promptWorkspaceId(prompt.uuid) !== managerState.activeWorkspaceId) return false;
  if (managerState.folderOption === OPTION_ALL) return true;
  if (managerState.folderOption === OPTION_UNCATEGORIZED) return !prompt.folderId;
  return prompt.folderId === managerState.folderOption;
}

function applyViewToRows() {
  const list = document.getElementById('prompt-list');
  if (!list) return;
  list.querySelectorAll('li[data-uuid]').forEach((row) => {
    const meta = managerState.promptsById.get(row.dataset.uuid);
    row.classList.toggle('manager-workspace-hidden', !rowMatchesCurrentView(meta));
    row.style.order = String(meta?.index ?? 999999);
  });
}

function makeActionButton(className, text, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    Promise.resolve(onClick?.()).catch(console.error);
  });
  return button;
}

function resetWorkspaceLocalView() {
  const search = document.getElementById('prompt-search-input');
  if (search?.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const list = document.getElementById('prompt-list');
  if (list) list.scrollTop = 0;
}

function closeCurrentEditor() {
  document.getElementById('cancel-edit-button')?.click();
  selectPromptRow(null);
}

async function switchWorkspace(workspaceId) {
  if (!managerState.workspaces.some((item) => item.id === workspaceId)) return;
  if (managerState.activeWorkspaceId === workspaceId) return;
  closeCurrentEditor();
  resetWorkspaceLocalView();
  managerState.activeWorkspaceId = workspaceId;
  managerState.folderOption = OPTION_ALL;
  await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: workspaceId });
  renderWorkspaceTabs();
  renderFolderOptions();
  renderPromptFolderSelect(null);
  applyViewToRows();
}

async function createWorkspace() {
  const labels = copy();
  const name = window.prompt(labels.name, '');
  if (name == null || !name.trim()) return;
  const workspace = { id: generateId('workspace'), name: name.trim() };
  managerState.workspaces.push(workspace);
  managerState.activeWorkspaceId = workspace.id;
  managerState.folderOption = OPTION_ALL;
  await persistWorkspaceState();
  closeCurrentEditor();
  resetWorkspaceLocalView();
  renderWorkspaceTabs();
  renderFolderOptions();
  renderPromptFolderSelect(null);
  applyViewToRows();
}

async function renameWorkspace(workspaceId) {
  const labels = copy();
  const workspace = managerState.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return;
  const currentName = displayWorkspaceName(workspace);
  const next = window.prompt(labels.name, currentName);
  if (next == null || !next.trim() || next.trim() === currentName) return;
  workspace.name = next.trim();
  await persistWorkspaceState();
  renderWorkspaceTabs();
}

async function deleteWorkspace(workspaceId) {
  const labels = copy();
  if (managerState.workspaces.length <= 1) {
    window.alert(labels.keepOne);
    return;
  }

  const workspace = managerState.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return;
  const name = displayWorkspaceName(workspace);
  if (!window.confirm(format(labels.confirmRemove, { name }))) return;

  const fallback = managerState.workspaces.find((item) => item.id !== workspaceId);
  Object.keys(managerState.promptWorkspaces).forEach((uuid) => {
    if (managerState.promptWorkspaces[uuid] === workspaceId) managerState.promptWorkspaces[uuid] = fallback.id;
  });
  Object.keys(managerState.folderWorkspaces).forEach((folderId) => {
    if (managerState.folderWorkspaces[folderId] === workspaceId) managerState.folderWorkspaces[folderId] = fallback.id;
  });

  managerState.workspaces = managerState.workspaces.filter((item) => item.id !== workspaceId);
  if (managerState.activeWorkspaceId === workspaceId) {
    managerState.activeWorkspaceId = fallback.id;
    managerState.folderOption = OPTION_ALL;
    closeCurrentEditor();
    resetWorkspaceLocalView();
  }
  await persistWorkspaceState();
  renderWorkspaceTabs();
  renderFolderOptions();
  renderPromptFolderSelect(null);
  applyViewToRows();
}

function renderWorkspaceTabs() {
  const host = document.getElementById('manager-workspace-tabs');
  const editToggle = document.getElementById('manager-workspace-edit-toggle');
  if (!host || !editToggle) return;

  const labels = copy();
  host.replaceChildren();

  managerState.workspaces.forEach((workspace) => {
    const wrap = document.createElement('span');
    wrap.className = 'manager-workspace-tab-wrap';
    wrap.classList.toggle('is-active', workspace.id === managerState.activeWorkspaceId);

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'manager-workspace-tab';
    select.textContent = displayWorkspaceName(workspace);
    select.title = select.textContent;
    select.setAttribute('role', 'tab');
    select.setAttribute('aria-selected', String(workspace.id === managerState.activeWorkspaceId));
    select.addEventListener('click', () => switchWorkspace(workspace.id).catch(console.error));
    wrap.appendChild(select);

    if (managerState.workspaceEditing) {
      wrap.appendChild(makeActionButton(
        'manager-workspace-inline-action',
        '✎',
        labels.rename,
        () => renameWorkspace(workspace.id),
      ));
      wrap.appendChild(makeActionButton(
        'manager-workspace-inline-action is-danger',
        '×',
        labels.remove,
        () => deleteWorkspace(workspace.id),
      ));
    }

    host.appendChild(wrap);
  });

  if (managerState.workspaceEditing) {
    host.appendChild(makeActionButton(
      'manager-workspace-create-inline',
      '+',
      labels.create,
      () => createWorkspace(),
    ));
  }

  editToggle.textContent = managerState.workspaceEditing ? '✓' : '✎';
  editToggle.title = managerState.workspaceEditing ? labels.done : labels.edit;
  editToggle.setAttribute('aria-label', editToggle.title);
  editToggle.classList.toggle('is-editing', managerState.workspaceEditing);
  editToggle.setAttribute('aria-pressed', String(managerState.workspaceEditing));
}

function wireWorkspaceControls() {
  document.getElementById('manager-workspace-edit-toggle')?.addEventListener('click', () => {
    managerState.workspaceEditing = !managerState.workspaceEditing;
    renderWorkspaceTabs();
  });
}

function createFolderFilterButton(label, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'manager-category-option';
  button.textContent = label;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.classList.toggle('is-active', managerState.folderOption === value);
  button.setAttribute('aria-pressed', String(managerState.folderOption === value));
  button.addEventListener('click', () => {
    managerState.folderOption = value;
    renderFolderOptions();
    applyViewToRows();
    if (!document.getElementById('prompt-uuid')?.value
      && value !== OPTION_ALL
      && value !== OPTION_UNCATEGORIZED) {
      renderPromptFolderSelect(value);
    }
  });
  return button;
}

function createManagedFolderChip(folder) {
  const labels = copy();
  const group = document.createElement('span');
  group.className = 'manager-folder-group';
  group.classList.toggle('is-active', managerState.folderOption === folder.id);

  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'manager-folder-select-btn';
  select.textContent = folder.name;
  select.title = folder.name;
  select.addEventListener('click', () => {
    managerState.folderOption = folder.id;
    renderFolderOptions();
    applyViewToRows();
    if (!document.getElementById('prompt-uuid')?.value) renderPromptFolderSelect(folder.id);
  });

  const rename = makeActionButton('manager-folder-mini', '✎', labels.renameFolder, async () => {
    const next = window.prompt(labels.folderName, folder.name);
    if (next == null || !next.trim() || next.trim() === folder.name) return;
    await updateFolder(folder.id, { name: next.trim() });
    await refreshManagerData();
  });

  const remove = makeActionButton('manager-folder-mini manager-folder-mini-danger', '×', labels.deleteFolder, async () => {
    if (!window.confirm(format(labels.confirmDeleteFolder, { name: folder.name }))) return;
    await deleteFolder(folder.id);
    delete managerState.folderWorkspaces[folder.id];
    await chrome.storage.local.set({ [FOLDER_WORKSPACES_KEY]: managerState.folderWorkspaces });
    if (managerState.folderOption === folder.id) managerState.folderOption = OPTION_ALL;
    await refreshManagerData();
  });

  group.append(select, rename, remove);
  return group;
}

function renderFolderOptions() {
  const host = document.getElementById('manager-category-options');
  if (!host) return;
  host.hidden = false;
  host.replaceChildren();

  const labels = copy();
  const folders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const validOptions = new Set([OPTION_ALL, OPTION_UNCATEGORIZED, ...folders.map((folder) => folder.id)]);
  if (!validOptions.has(managerState.folderOption)) managerState.folderOption = OPTION_ALL;

  host.appendChild(createFolderFilterButton(labels.all, OPTION_ALL));
  host.appendChild(createFolderFilterButton(labels.uncategorized, OPTION_UNCATEGORIZED));
  folders.forEach((folder) => host.appendChild(createManagedFolderChip(folder)));

  host.appendChild(makeActionButton('manager-folder-create', '+', labels.newFolder, async () => {
    const name = window.prompt(labels.folderName, '');
    if (name == null || !name.trim()) return;
    const folder = await saveFolder({ name: name.trim() });
    managerState.folderWorkspaces[folder.id] = managerState.activeWorkspaceId;
    await chrome.storage.local.set({ [FOLDER_WORKSPACES_KEY]: managerState.folderWorkspaces });
    managerState.folderOption = folder.id;
    await refreshManagerData();
    renderPromptFolderSelect(folder.id);
  }));
}

function wirePromptFolderSelect() {
  const select = document.getElementById('manager-prompt-folder-select');
  select?.addEventListener('change', async () => {
    const uuid = document.getElementById('prompt-uuid')?.value;
    if (!uuid) return;
    const targetFolderId = select.value || null;
    const prompt = managerState.promptsById.get(uuid)?.prompt;
    if (!prompt) return;

    await assignPromptWorkspace(uuid, managerState.activeWorkspaceId);
    if ((prompt.folderId || null) !== targetFolderId) {
      await movePromptToFolder(uuid, targetFolderId);
    }
    await refreshManagerData();
  });
}

function wireFormPlacement() {
  const form = document.getElementById('prompt-form');
  if (!form) return;
  form.addEventListener('submit', () => {
    managerState.pendingPlacement = {
      uuid: document.getElementById('prompt-uuid')?.value || null,
      folderId: document.getElementById('manager-prompt-folder-select')?.value || null,
      workspaceId: managerState.activeWorkspaceId,
      beforeIds: new Set(managerState.prompts.map((prompt) => prompt.uuid)),
    };
  }, true);
}

async function applyPendingPlacement(prompts) {
  const pending = managerState.pendingPlacement;
  if (!pending) return false;

  let targetUuid = pending.uuid;
  if (!targetUuid) {
    targetUuid = prompts.find((prompt) => !pending.beforeIds.has(prompt.uuid))?.uuid || null;
  }
  if (!targetUuid) return false;

  managerState.pendingPlacement = null;
  await assignPromptWorkspace(targetUuid, pending.workspaceId);
  const current = prompts.find((prompt) => prompt.uuid === targetUuid);
  if (current && (current.folderId || null) !== pending.folderId) {
    await movePromptToFolder(targetUuid, pending.folderId);
  }
  return true;
}

async function refreshManagerData(promptsOverride = null) {
  try {
    const [prompts, folders] = await Promise.all([
      promptsOverride ? Promise.resolve(promptsOverride) : getPrompts(),
      getFolders(),
    ]);
    managerState.prompts = Array.isArray(prompts) ? prompts : [];
    managerState.folders = Array.isArray(folders) ? folders : [];
    await ensureWorkspaceState(managerState.prompts, managerState.folders);
    refreshPromptMaps();
    renderWorkspaceTabs();
    renderFolderOptions();

    const uuid = document.getElementById('prompt-uuid')?.value;
    const selectedFolder = uuid ? managerState.promptsById.get(uuid)?.prompt?.folderId : null;
    renderPromptFolderSelect(selectedFolder || null);
    applyViewToRows();
  } catch (error) {
    console.warn('[Open Prompt Manager] Failed to refresh workspace/folder data:', error);
  }
}

function observeLegacyVisibilityWrites() {
  const controls = document.getElementById('prompt-list-controls');
  const list = document.getElementById('prompt-list');
  const observer = new MutationObserver(forcePromptNavigationVisible);
  if (controls) observer.observe(controls, { attributes: true, attributeFilter: ['hidden', 'style'] });
  if (list) observer.observe(list, { attributes: true, attributeFilter: ['style'] });
}

function observePromptListRebuilds() {
  const list = document.getElementById('prompt-list');
  if (!list) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      applyViewToRows();
    });
  });
  observer.observe(list, { childList: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  await globalThis.OPMI18n?.ready;
  document.body.classList.add('is-expanded-tab', 'manager-page');

  forcePromptNavigationVisible();
  wireNavigationClicks();
  wireCreateShortcut();
  wireWorkspaceControls();
  wirePromptFolderSelect();
  wireFormPlacement();
  observeLegacyVisibilityWrites();
  observePromptListRebuilds();
  await refreshManagerData();

  globalThis.OPMI18n?.subscribe?.(() => {
    renderWorkspaceTabs();
    renderFolderOptions();
    const uuid = document.getElementById('prompt-uuid')?.value;
    renderPromptFolderSelect(uuid ? managerState.promptsById.get(uuid)?.prompt?.folderId : null);
  });

  onPromptsChanged(async (prompts) => {
    try {
      const placed = await applyPendingPlacement(Array.isArray(prompts) ? prompts : []);
      await refreshManagerData(placed ? null : prompts);
    } catch (error) {
      console.error(error);
    }
  });

  setTimeout(() => {
    forcePromptNavigationVisible();
    applyViewToRows();
  }, 0);
  setTimeout(() => {
    forcePromptNavigationVisible();
    applyViewToRows();
  }, 350);
});

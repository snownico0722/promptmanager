// Full-page manager behavior layered on top of the legacy sidepanel controller.
// Main-page responsibilities here: workspaces, real folder CRUD, folder assignment,
// prompt navigation, and keeping prompt rows scoped to the active workspace.
import {
  deleteFolder,
  getFolders,
  getPrompts,
  movePromptToFolder,
  onPromptsChanged,
  saveFolder,
  updateFolder,
} from './storage/promptStorage.js';

const CATEGORY_ALL = 'all';
const CATEGORY_FOLDERS = 'folders';
const OPTION_ALL = '__all__';
const OPTION_UNCATEGORIZED = '__uncategorized__';
const DEFAULT_WORKSPACE_ID = 'workspace-default';

const WORKSPACES_KEY = 'opmManagerWorkspacesV1';
const ACTIVE_WORKSPACE_KEY = 'opmManagerActiveWorkspaceV1';
const PROMPT_WORKSPACES_KEY = 'opmManagerPromptWorkspacesV1';
const FOLDER_WORKSPACES_KEY = 'opmManagerFolderWorkspacesV1';

const managerState = {
  category: CATEGORY_ALL,
  folderOption: OPTION_ALL,
  prompts: [],
  folders: [],
  promptsById: new Map(),
  workspaces: [],
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  promptWorkspaces: {},
  folderWorkspaces: {},
  pendingPlacement: null,
};

function isChineseUi() {
  const language = globalThis.OPMI18n?.getLanguage?.() || navigator.language || 'en';
  return String(language).toLowerCase().startsWith('zh');
}

function copy() {
  return isChineseUi()
    ? {
        workspace: '工作区',
        defaultWorkspace: '默认工作区',
        newWorkspace: '新建工作区',
        renameWorkspace: '重命名工作区',
        deleteWorkspace: '删除工作区',
        workspaceName: '工作区名称',
        cannotDeleteOnlyWorkspace: '至少需要保留一个工作区。',
        confirmDeleteWorkspace: '删除工作区“{name}”？其中的提示词和文件夹会移动到其他工作区。',
        folders: '文件夹',
        noFolder: '无文件夹',
        allFolders: '全部文件夹',
        uncategorized: '未分类',
        newFolder: '新建文件夹',
        renameFolder: '重命名文件夹',
        deleteFolder: '删除文件夹',
        folderName: '文件夹名称',
        confirmDeleteFolder: '删除文件夹“{name}”？其中的提示词会变为未分类。',
      }
    : {
        workspace: 'Workspace',
        defaultWorkspace: 'Default workspace',
        newWorkspace: 'New workspace',
        renameWorkspace: 'Rename workspace',
        deleteWorkspace: 'Delete workspace',
        workspaceName: 'Workspace name',
        cannotDeleteOnlyWorkspace: 'At least one workspace is required.',
        confirmDeleteWorkspace: 'Delete workspace “{name}”? Its prompts and folders will move to another workspace.',
        folders: 'Folder',
        noFolder: 'No folder',
        allFolders: 'All folders',
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

function activeWorkspace() {
  return managerState.workspaces.find((item) => item.id === managerState.activeWorkspaceId)
    || managerState.workspaces[0]
    || null;
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
        .map((item) => ({ id: item.id, name: item.name.trim() || labels.defaultWorkspace }))
    : [];
  if (workspaces.length === 0) {
    workspaces = [{ id: DEFAULT_WORKSPACE_ID, name: labels.defaultWorkspace }];
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

function localizeStaticUi() {
  const labels = copy();
  const zh = isChineseUi();
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    button.textContent = zh ? button.dataset.labelZh : button.dataset.labelEn;
  });

  const workspaceLabel = document.getElementById('manager-workspace-label');
  if (workspaceLabel) workspaceLabel.textContent = labels.workspace;
  const folderLabel = document.getElementById('manager-prompt-folder-label');
  if (folderLabel) folderLabel.textContent = labels.folders;

  const titleMap = [
    ['manager-workspace-add', labels.newWorkspace],
    ['manager-workspace-rename', labels.renameWorkspace],
    ['manager-workspace-delete', labels.deleteWorkspace],
  ];
  titleMap.forEach(([id, title]) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.title = title;
    node.setAttribute('aria-label', title);
  });
}

function renderWorkspaceBar() {
  const select = document.getElementById('manager-workspace-select');
  if (!select) return;
  select.replaceChildren();
  managerState.workspaces.forEach((workspace) => {
    const option = document.createElement('option');
    option.value = workspace.id;
    option.textContent = workspace.name;
    select.appendChild(option);
  });
  select.value = managerState.activeWorkspaceId;
}

function forcePromptNavigationVisible() {
  const controls = document.getElementById('prompt-list-controls');
  const list = document.getElementById('prompt-list');
  if (controls) {
    if (controls.hidden) controls.hidden = false;
    if (controls.style.getPropertyValue('display')) controls.style.removeProperty('display');
  }
  if (list) {
    const display = list.style.getPropertyValue('display');
    const priority = list.style.getPropertyPriority('display');
    if (display !== 'flex' || priority !== 'important') {
      list.style.setProperty('display', 'flex', 'important');
    }
  }
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
  const currentFolders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  select.replaceChildren();

  const none = document.createElement('option');
  none.value = '';
  none.textContent = labels.noFolder;
  select.appendChild(none);

  currentFolders.forEach((folder) => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    select.appendChild(option);
  });

  const valid = currentFolders.some((folder) => folder.id === selectedFolderId);
  select.value = valid ? selectedFolderId : '';
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
  const mainCreate = document.getElementById('create-prompt-btn');
  mainCreate?.addEventListener('click', () => {
    selectPromptRow(null);
    const defaultFolder = managerState.category === CATEGORY_FOLDERS
      && managerState.folderOption !== OPTION_ALL
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

  if (managerState.category === CATEGORY_FOLDERS && managerState.folderOption !== OPTION_ALL) {
    if (managerState.folderOption === OPTION_UNCATEGORIZED) return !prompt.folderId;
    return prompt.folderId === managerState.folderOption;
  }
  return true;
}

function applyViewToRows() {
  const list = document.getElementById('prompt-list');
  if (!list) return;
  list.querySelectorAll('li[data-uuid]').forEach((row) => {
    const meta = managerState.promptsById.get(row.dataset.uuid);
    const visible = rowMatchesCurrentView(meta);
    row.classList.toggle('manager-workspace-hidden', !visible);
    row.style.order = String(meta?.index ?? 999999);
  });
}

function createFolderFilterButton(label, value, count = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'manager-category-option';
  button.textContent = count == null ? label : `${label} (${count})`;
  button.classList.toggle('is-active', managerState.folderOption === value);
  button.setAttribute('aria-pressed', String(managerState.folderOption === value));
  button.addEventListener('click', () => {
    managerState.folderOption = value;
    renderFolderOptions();
    applyViewToRows();
    const uuid = document.getElementById('prompt-uuid')?.value;
    if (!uuid && value !== OPTION_ALL && value !== OPTION_UNCATEGORIZED) {
      renderPromptFolderSelect(value);
    }
  });
  return button;
}

function createManagedFolderChip(folder, count) {
  const labels = copy();
  const group = document.createElement('span');
  group.className = 'manager-folder-group';
  group.classList.toggle('is-active', managerState.folderOption === folder.id);

  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'manager-folder-select-btn';
  select.textContent = `${folder.name} (${count})`;
  select.title = folder.name;
  select.addEventListener('click', () => {
    managerState.folderOption = folder.id;
    renderFolderOptions();
    applyViewToRows();
    if (!document.getElementById('prompt-uuid')?.value) renderPromptFolderSelect(folder.id);
  });

  const rename = document.createElement('button');
  rename.type = 'button';
  rename.className = 'manager-folder-mini';
  rename.textContent = '✎';
  rename.title = labels.renameFolder;
  rename.setAttribute('aria-label', labels.renameFolder);
  rename.addEventListener('click', async () => {
    const next = window.prompt(labels.folderName, folder.name);
    if (next == null || !next.trim() || next.trim() === folder.name) return;
    await updateFolder(folder.id, { name: next.trim() });
    await refreshManagerData();
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'manager-folder-mini manager-folder-mini-danger';
  remove.textContent = '×';
  remove.title = labels.deleteFolder;
  remove.setAttribute('aria-label', labels.deleteFolder);
  remove.addEventListener('click', async () => {
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
  host.replaceChildren();
  if (managerState.category !== CATEGORY_FOLDERS) {
    host.hidden = true;
    managerState.folderOption = OPTION_ALL;
    return;
  }

  host.hidden = false;
  const labels = copy();
  const workspacePrompts = activePrompts();
  const folders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const counts = new Map();
  let uncategorizedCount = 0;
  workspacePrompts.forEach((prompt) => {
    if (!prompt.folderId) uncategorizedCount += 1;
    else counts.set(prompt.folderId, (counts.get(prompt.folderId) || 0) + 1);
  });

  const validOptions = new Set([OPTION_ALL, OPTION_UNCATEGORIZED, ...folders.map((folder) => folder.id)]);
  if (!validOptions.has(managerState.folderOption)) managerState.folderOption = OPTION_ALL;

  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'manager-folder-create';
  create.textContent = `+ ${labels.newFolder}`;
  create.addEventListener('click', async () => {
    const name = window.prompt(labels.folderName, '');
    if (name == null || !name.trim()) return;
    const folder = await saveFolder({ name: name.trim() });
    managerState.folderWorkspaces[folder.id] = managerState.activeWorkspaceId;
    await chrome.storage.local.set({ [FOLDER_WORKSPACES_KEY]: managerState.folderWorkspaces });
    managerState.folderOption = folder.id;
    await refreshManagerData();
    renderPromptFolderSelect(folder.id);
  });
  host.appendChild(create);
  host.appendChild(createFolderFilterButton(labels.allFolders, OPTION_ALL, workspacePrompts.length));
  host.appendChild(createFolderFilterButton(labels.uncategorized, OPTION_UNCATEGORIZED, uncategorizedCount));
  folders.forEach((folder) => host.appendChild(createManagedFolderChip(folder, counts.get(folder.id) || 0)));
}

function activateCategory(category) {
  managerState.category = category === CATEGORY_FOLDERS ? CATEGORY_FOLDERS : CATEGORY_ALL;
  managerState.folderOption = OPTION_ALL;
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    const active = button.dataset.managerCategory === managerState.category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderFolderOptions();
  applyViewToRows();
}

function wireCategoryTabs() {
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    button.addEventListener('click', () => activateCategory(button.dataset.managerCategory));
  });
}

function closeCurrentEditor() {
  document.getElementById('cancel-edit-button')?.click();
  selectPromptRow(null);
}

async function switchWorkspace(workspaceId) {
  if (!managerState.workspaces.some((item) => item.id === workspaceId)) return;
  closeCurrentEditor();
  managerState.activeWorkspaceId = workspaceId;
  managerState.folderOption = OPTION_ALL;
  await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: workspaceId });
  renderWorkspaceBar();
  renderFolderOptions();
  renderPromptFolderSelect(null);
  applyViewToRows();
}

function wireWorkspaceControls() {
  const labels = copy();
  const select = document.getElementById('manager-workspace-select');
  select?.addEventListener('change', () => switchWorkspace(select.value).catch(console.error));

  document.getElementById('manager-workspace-add')?.addEventListener('click', async () => {
    const name = window.prompt(labels.workspaceName, '');
    if (name == null || !name.trim()) return;
    const workspace = { id: generateId('workspace'), name: name.trim() };
    managerState.workspaces.push(workspace);
    managerState.activeWorkspaceId = workspace.id;
    managerState.folderOption = OPTION_ALL;
    await persistWorkspaceState();
    closeCurrentEditor();
    renderWorkspaceBar();
    renderFolderOptions();
    renderPromptFolderSelect(null);
    applyViewToRows();
  });

  document.getElementById('manager-workspace-rename')?.addEventListener('click', async () => {
    const current = activeWorkspace();
    if (!current) return;
    const next = window.prompt(labels.workspaceName, current.name);
    if (next == null || !next.trim() || next.trim() === current.name) return;
    current.name = next.trim();
    await persistWorkspaceState();
    renderWorkspaceBar();
  });

  document.getElementById('manager-workspace-delete')?.addEventListener('click', async () => {
    if (managerState.workspaces.length <= 1) {
      window.alert(labels.cannotDeleteOnlyWorkspace);
      return;
    }
    const current = activeWorkspace();
    if (!current) return;
    if (!window.confirm(format(labels.confirmDeleteWorkspace, { name: current.name }))) return;

    const fallback = managerState.workspaces.find((item) => item.id !== current.id);
    Object.keys(managerState.promptWorkspaces).forEach((uuid) => {
      if (managerState.promptWorkspaces[uuid] === current.id) managerState.promptWorkspaces[uuid] = fallback.id;
    });
    Object.keys(managerState.folderWorkspaces).forEach((folderId) => {
      if (managerState.folderWorkspaces[folderId] === current.id) managerState.folderWorkspaces[folderId] = fallback.id;
    });
    managerState.workspaces = managerState.workspaces.filter((item) => item.id !== current.id);
    managerState.activeWorkspaceId = fallback.id;
    managerState.folderOption = OPTION_ALL;
    await persistWorkspaceState();
    closeCurrentEditor();
    renderWorkspaceBar();
    renderFolderOptions();
    renderPromptFolderSelect(null);
    applyViewToRows();
  });
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
    const uuid = document.getElementById('prompt-uuid')?.value || null;
    const folderId = document.getElementById('manager-prompt-folder-select')?.value || null;
    managerState.pendingPlacement = {
      uuid,
      folderId,
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
    renderWorkspaceBar();
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
  const observer = new MutationObserver(() => forcePromptNavigationVisible());
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

  localizeStaticUi();
  forcePromptNavigationVisible();
  wireNavigationClicks();
  wireCreateShortcut();
  wireCategoryTabs();
  wireWorkspaceControls();
  wirePromptFolderSelect();
  wireFormPlacement();
  observeLegacyVisibilityWrites();
  observePromptListRebuilds();
  await refreshManagerData();

  globalThis.OPMI18n?.subscribe?.(() => {
    localizeStaticUi();
    renderWorkspaceBar();
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

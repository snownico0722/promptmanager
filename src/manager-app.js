import {
  deleteFolder,
  deletePrompt,
  getFolders,
  getPrompts,
  onPromptsChanged,
  saveFolder,
  savePrompt,
  updateFolder,
  updatePrompt,
} from './storage/promptStorage.js';
import { normalizeTag, uniqueNormalizedTags } from './utils/tags.js';

const OPTION_ALL = '__all__';
const OPTION_UNCATEGORIZED = '__uncategorized__';
const DEFAULT_WORKSPACE_ID = 'workspace-default';

const WORKSPACES_KEY = 'opmManagerWorkspacesV1';
const ACTIVE_WORKSPACE_KEY = 'opmManagerActiveWorkspaceV1';
const PROMPT_WORKSPACES_KEY = 'opmManagerPromptWorkspacesV1';
const FOLDER_WORKSPACES_KEY = 'opmManagerFolderWorkspacesV1';

const state = {
  prompts: [],
  folders: [],
  workspaces: [],
  promptWorkspaces: {},
  folderWorkspaces: {},
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  folderOption: OPTION_ALL,
  workspaceEditing: false,
  selectedPromptId: null,
  search: '',
  enableTags: true,
};

const el = {};
let tags = [];

function t(key, params, fallback = key) {
  return globalThis.OPMI18n?.t?.(key, params, fallback) ?? fallback;
}

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

function fmt(text, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function generateId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function promptWorkspaceId(uuid) {
  return state.promptWorkspaces[uuid] || DEFAULT_WORKSPACE_ID;
}

function folderWorkspaceId(id) {
  return state.folderWorkspaces[id] || DEFAULT_WORKSPACE_ID;
}

function activePrompts() {
  return state.prompts.filter((prompt) => promptWorkspaceId(prompt.uuid) === state.activeWorkspaceId);
}

function activeFolders() {
  return state.folders.filter((folder) => folderWorkspaceId(folder.id) === state.activeWorkspaceId);
}

function displayWorkspaceName(workspace) {
  if (!workspace) return copy().defaultName;
  const name = String(workspace.name || '').trim();
  if (workspace.id === DEFAULT_WORKSPACE_ID
    && ['默认工作区', 'Default workspace', '默认', 'Default'].includes(name)) {
    return copy().defaultName;
  }
  return name || copy().defaultName;
}

async function persistWorkspaceState() {
  await chrome.storage.local.set({
    [WORKSPACES_KEY]: state.workspaces,
    [ACTIVE_WORKSPACE_KEY]: state.activeWorkspaceId,
    [PROMPT_WORKSPACES_KEY]: state.promptWorkspaces,
    [FOLDER_WORKSPACES_KEY]: state.folderWorkspaces,
  });
}

async function ensureWorkspaceState() {
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
  const promptIds = new Set(state.prompts.map((prompt) => prompt.uuid));
  const folderIds = new Set(state.folders.map((folder) => folder.id));

  Object.keys(promptWorkspaces).forEach((uuid) => {
    if (!promptIds.has(uuid)) delete promptWorkspaces[uuid];
    else if (!validWorkspaceIds.has(promptWorkspaces[uuid])) promptWorkspaces[uuid] = fallbackWorkspace;
  });
  state.prompts.forEach((prompt) => {
    if (!promptWorkspaces[prompt.uuid]) promptWorkspaces[prompt.uuid] = fallbackWorkspace;
  });

  Object.keys(folderWorkspaces).forEach((folderId) => {
    if (!folderIds.has(folderId)) delete folderWorkspaces[folderId];
    else if (!validWorkspaceIds.has(folderWorkspaces[folderId])) folderWorkspaces[folderId] = fallbackWorkspace;
  });
  state.folders.forEach((folder) => {
    if (!folderWorkspaces[folder.id]) folderWorkspaces[folder.id] = fallbackWorkspace;
  });

  state.workspaces = workspaces;
  state.activeWorkspaceId = activeWorkspaceId;
  state.promptWorkspaces = promptWorkspaces;
  state.folderWorkspaces = folderWorkspaces;
  await persistWorkspaceState();
}

function makeButton(className, text, title, onClick) {
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

function resetLocalView() {
  state.search = '';
  state.folderOption = OPTION_ALL;
  if (el.search) el.search.value = '';
  if (el.list) el.list.scrollTop = 0;
  clearEditor();
}

async function switchWorkspace(id) {
  if (id === state.activeWorkspaceId) return;
  if (!state.workspaces.some((workspace) => workspace.id === id)) return;
  state.activeWorkspaceId = id;
  await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: id });
  resetLocalView();
  renderAll();
}

async function createWorkspace() {
  const labels = copy();
  const name = window.prompt(labels.name, '');
  if (name == null || !name.trim()) return;
  const workspace = { id: generateId('workspace'), name: name.trim() };
  state.workspaces.push(workspace);
  state.activeWorkspaceId = workspace.id;
  await persistWorkspaceState();
  resetLocalView();
  renderAll();
}

async function renameWorkspace(id) {
  const workspace = state.workspaces.find((item) => item.id === id);
  if (!workspace) return;
  const labels = copy();
  const next = window.prompt(labels.name, displayWorkspaceName(workspace));
  if (next == null || !next.trim()) return;
  workspace.name = next.trim();
  await persistWorkspaceState();
  renderWorkspaceTabs();
}

async function removeWorkspace(id) {
  const labels = copy();
  if (state.workspaces.length <= 1) {
    window.alert(labels.keepOne);
    return;
  }
  const workspace = state.workspaces.find((item) => item.id === id);
  if (!workspace) return;
  if (!window.confirm(fmt(labels.confirmRemove, { name: displayWorkspaceName(workspace) }))) return;

  const fallback = state.workspaces.find((item) => item.id !== id);
  Object.keys(state.promptWorkspaces).forEach((uuid) => {
    if (state.promptWorkspaces[uuid] === id) state.promptWorkspaces[uuid] = fallback.id;
  });
  Object.keys(state.folderWorkspaces).forEach((folderId) => {
    if (state.folderWorkspaces[folderId] === id) state.folderWorkspaces[folderId] = fallback.id;
  });
  state.workspaces = state.workspaces.filter((item) => item.id !== id);
  if (state.activeWorkspaceId === id) state.activeWorkspaceId = fallback.id;
  await persistWorkspaceState();
  resetLocalView();
  renderAll();
}

function renderWorkspaceTabs() {
  const labels = copy();
  el.workspaceTabs.replaceChildren();

  state.workspaces.forEach((workspace) => {
    const wrap = document.createElement('span');
    wrap.className = 'manager-workspace-tab-wrap';
    wrap.classList.toggle('is-active', workspace.id === state.activeWorkspaceId);

    const select = makeButton(
      'manager-workspace-tab',
      displayWorkspaceName(workspace),
      displayWorkspaceName(workspace),
      () => switchWorkspace(workspace.id),
    );
    select.setAttribute('role', 'tab');
    select.setAttribute('aria-selected', String(workspace.id === state.activeWorkspaceId));
    wrap.appendChild(select);

    if (state.workspaceEditing) {
      wrap.appendChild(makeButton(
        'manager-workspace-inline-action',
        '✎',
        labels.rename,
        () => renameWorkspace(workspace.id),
      ));
      wrap.appendChild(makeButton(
        'manager-workspace-inline-action is-danger',
        '×',
        labels.remove,
        () => removeWorkspace(workspace.id),
      ));
    }
    el.workspaceTabs.appendChild(wrap);
  });

  if (state.workspaceEditing) {
    el.workspaceTabs.appendChild(makeButton(
      'manager-workspace-create-inline',
      '+',
      labels.create,
      createWorkspace,
    ));
  }

  el.workspaceEdit.textContent = state.workspaceEditing ? '✓' : '✎';
  el.workspaceEdit.title = state.workspaceEditing ? labels.done : labels.edit;
  el.workspaceEdit.setAttribute('aria-label', state.workspaceEditing ? labels.done : labels.edit);
  el.workspaceEdit.setAttribute('aria-pressed', String(state.workspaceEditing));
  el.workspaceEdit.classList.toggle('is-editing', state.workspaceEditing);
}

function folderCounts() {
  const counts = new Map();
  let uncategorized = 0;
  activePrompts().forEach((prompt) => {
    if (!prompt.folderId) uncategorized += 1;
    else counts.set(prompt.folderId, (counts.get(prompt.folderId) || 0) + 1);
  });
  return { counts, uncategorized };
}

function chooseFolder(value) {
  state.folderOption = value;
  renderFolders();
  renderPromptList();
  if (!state.selectedPromptId) renderFolderSelect(value);
}

async function createFolder() {
  const labels = copy();
  const name = window.prompt(labels.folderName, '');
  if (name == null || !name.trim()) return;
  const folder = await saveFolder({ name: name.trim() });
  state.folderWorkspaces[folder.id] = state.activeWorkspaceId;
  state.folderOption = folder.id;
  await chrome.storage.local.set({ [FOLDER_WORKSPACES_KEY]: state.folderWorkspaces });
  await refreshData();
  renderFolderSelect(folder.id);
}

async function renameFolder(folder) {
  const labels = copy();
  const next = window.prompt(labels.folderName, folder.name);
  if (next == null || !next.trim() || next.trim() === folder.name) return;
  await updateFolder(folder.id, { name: next.trim() });
  await refreshData();
}

async function removeFolder(folder) {
  const labels = copy();
  if (!window.confirm(fmt(labels.confirmDeleteFolder, { name: folder.name }))) return;
  await deleteFolder(folder.id);
  delete state.folderWorkspaces[folder.id];
  await chrome.storage.local.set({ [FOLDER_WORKSPACES_KEY]: state.folderWorkspaces });
  if (state.folderOption === folder.id) state.folderOption = OPTION_ALL;
  await refreshData();
}

function renderFolders() {
  const labels = copy();
  const folders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const { counts, uncategorized } = folderCounts();
  el.folders.replaceChildren();

  const all = makeButton(
    'manager-category-option',
    labels.all,
    labels.all,
    () => chooseFolder(OPTION_ALL),
  );
  all.classList.toggle('is-active', state.folderOption === OPTION_ALL);
  el.folders.appendChild(all);

  const uncat = makeButton(
    'manager-category-option',
    labels.uncategorized,
    `${labels.uncategorized} (${uncategorized})`,
    () => chooseFolder(OPTION_UNCATEGORIZED),
  );
  uncat.classList.toggle('is-active', state.folderOption === OPTION_UNCATEGORIZED);
  el.folders.appendChild(uncat);

  folders.forEach((folder) => {
    const group = document.createElement('span');
    group.className = 'manager-folder-group';
    group.classList.toggle('is-active', state.folderOption === folder.id);

    const select = makeButton(
      'manager-folder-select-btn',
      folder.name,
      `${folder.name} (${counts.get(folder.id) || 0})`,
      () => chooseFolder(folder.id),
    );
    group.appendChild(select);
    group.appendChild(makeButton(
      'manager-folder-mini',
      '✎',
      labels.renameFolder,
      () => renameFolder(folder),
    ));
    group.appendChild(makeButton(
      'manager-folder-mini manager-folder-mini-danger',
      '×',
      labels.deleteFolder,
      () => removeFolder(folder),
    ));
    el.folders.appendChild(group);
  });

  el.folders.appendChild(makeButton(
    'manager-folder-create',
    '+',
    labels.newFolder,
    createFolder,
  ));
}

function visiblePrompts() {
  const query = state.search.trim().toLowerCase();
  return activePrompts().filter((prompt) => {
    if (state.folderOption === OPTION_UNCATEGORIZED && prompt.folderId) return false;
    if (state.folderOption !== OPTION_ALL
      && state.folderOption !== OPTION_UNCATEGORIZED
      && prompt.folderId !== state.folderOption) return false;

    if (!query) return true;
    const haystack = [
      prompt.title,
      prompt.content,
      ...(Array.isArray(prompt.tags) ? prompt.tags : []),
    ].join('\n').toLowerCase();
    return haystack.includes(query);
  });
}

function renderPromptList() {
  el.list.replaceChildren();
  const fragment = document.createDocumentFragment();

  visiblePrompts().forEach((prompt) => {
    const item = document.createElement('li');
    item.dataset.uuid = prompt.uuid;
    item.classList.toggle('is-selected', state.selectedPromptId === prompt.uuid);

    const title = document.createElement('span');
    title.textContent = prompt.title || t('prompt.untitled', {}, 'Untitled');
    item.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'spm-prompt-actions';
    actions.appendChild(makeButton(
      'spm-prompt-action-btn',
      '⧉',
      t('prompt.copy', {}, 'Copy'),
      async () => navigator.clipboard.writeText(prompt.content),
    ));
    actions.appendChild(makeButton(
      'spm-prompt-action-btn',
      '×',
      t('common.delete', {}, 'Delete'),
      async () => {
        if (!window.confirm(t('prompt.deleteConfirm', {}, 'Delete prompt?'))) return;
        await deletePrompt(prompt.uuid);
        delete state.promptWorkspaces[prompt.uuid];
        await chrome.storage.local.set({ [PROMPT_WORKSPACES_KEY]: state.promptWorkspaces });
        if (state.selectedPromptId === prompt.uuid) clearEditor();
        await refreshData();
      },
    ));
    item.appendChild(actions);

    item.addEventListener('click', (event) => {
      if (event.target.closest('.spm-prompt-actions')) return;
      openEditor(prompt);
    });
    fragment.appendChild(item);
  });

  el.list.appendChild(fragment);
}

function renderFolderSelect(selected = null) {
  const labels = copy();
  const folders = activeFolders().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  el.folderSelect.replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = labels.noFolder;
  el.folderSelect.appendChild(none);
  folders.forEach((folder) => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    el.folderSelect.appendChild(option);
  });
  const fallback = state.folderOption !== OPTION_ALL && state.folderOption !== OPTION_UNCATEGORIZED
    ? state.folderOption
    : '';
  const value = selected || fallback;
  el.folderSelect.value = folders.some((folder) => folder.id === value) ? value : '';
}

function renderTags() {
  el.tagsHost.hidden = !state.enableTags;
  el.tagsPills.replaceChildren();
  tags.forEach((tag) => {
    const pill = document.createElement('span');
    pill.className = 'spm-tag-pill';
    pill.textContent = tag;
    pill.appendChild(makeButton('spm-tag-remove', '×', t('common.delete', {}, 'Delete'), () => {
      tags = tags.filter((item) => item !== tag);
      renderTags();
    }));
    el.tagsPills.appendChild(pill);
  });
}

function addPendingTag() {
  const value = normalizeTag(el.tagsInput.value);
  el.tagsInput.value = '';
  if (!value) return;
  tags = uniqueNormalizedTags([...tags, value]);
  renderTags();
}

function setSaveLabel(editing) {
  const key = editing ? 'prompt.update' : 'prompt.save';
  el.saveLabel.dataset.i18n = key;
  el.saveLabel.textContent = t(key, {}, editing ? 'Save changes' : 'Save prompt');
}

function openEditor(prompt = null) {
  state.selectedPromptId = prompt?.uuid || null;
  el.uuid.value = prompt?.uuid || '';
  el.title.value = prompt?.title || '';
  el.content.value = prompt?.content || '';
  tags = uniqueNormalizedTags(prompt?.tags || []);
  renderTags();
  renderFolderSelect(prompt?.folderId || null);
  setSaveLabel(Boolean(prompt));
  renderPromptList();
  el.title.focus();
}

function clearEditor() {
  state.selectedPromptId = null;
  el.uuid.value = '';
  el.title.value = '';
  el.content.value = '';
  tags = [];
  el.tagsInput.value = '';
  renderTags();
  renderFolderSelect(null);
  setSaveLabel(false);
  renderPromptList();
}

async function saveCurrentPrompt(event) {
  event.preventDefault();
  addPendingTag();
  const title = el.title.value.trim();
  const content = el.content.value;
  if (!title || !content.trim()) {
    window.alert(t('prompt.validationBeforeSave', {}, 'Enter a title and prompt.'));
    return;
  }

  const folderId = el.folderSelect.value || null;
  const uuid = el.uuid.value;
  if (uuid) {
    await updatePrompt(uuid, { title, content, tags, folderId });
    state.promptWorkspaces[uuid] = state.activeWorkspaceId;
    await chrome.storage.local.set({ [PROMPT_WORKSPACES_KEY]: state.promptWorkspaces });
    await refreshData();
    const updated = state.prompts.find((prompt) => prompt.uuid === uuid);
    openEditor(updated || null);
    return;
  }

  const result = await savePrompt({ title, content, tags, folderId });
  const prompt = result?.prompt;
  if (prompt?.uuid) {
    state.promptWorkspaces[prompt.uuid] = state.activeWorkspaceId;
    await chrome.storage.local.set({ [PROMPT_WORKSPACES_KEY]: state.promptWorkspaces });
  }
  await refreshData();
  const created = prompt?.uuid ? state.prompts.find((item) => item.uuid === prompt.uuid) : null;
  openEditor(created || null);
}

function renderAll() {
  renderWorkspaceTabs();
  renderFolders();
  renderPromptList();
  renderFolderSelect(state.prompts.find((p) => p.uuid === state.selectedPromptId)?.folderId || null);
  renderTags();
}

async function refreshData(promptsOverride = null) {
  const [prompts, folders, settings] = await Promise.all([
    promptsOverride ? Promise.resolve(promptsOverride) : getPrompts(),
    getFolders(),
    chrome.storage.local.get(['enableTags']),
  ]);
  state.prompts = Array.isArray(prompts) ? prompts : [];
  state.folders = Array.isArray(folders) ? folders : [];
  state.enableTags = settings.enableTags !== false;
  await ensureWorkspaceState();

  if (state.selectedPromptId && !state.prompts.some((prompt) => prompt.uuid === state.selectedPromptId)) {
    state.selectedPromptId = null;
  }
  renderAll();
}

function collectElements() {
  Object.assign(el, {
    workspaceTabs: document.getElementById('manager-workspace-tabs'),
    workspaceEdit: document.getElementById('manager-workspace-edit-toggle'),
    folders: document.getElementById('manager-category-options'),
    search: document.getElementById('prompt-search-input'),
    newPrompt: document.getElementById('create-prompt-btn'),
    list: document.getElementById('prompt-list'),
    form: document.getElementById('prompt-form'),
    uuid: document.getElementById('prompt-uuid'),
    title: document.getElementById('prompt-title'),
    content: document.getElementById('prompt-content'),
    folderSelect: document.getElementById('manager-prompt-folder-select'),
    tagsHost: document.getElementById('prompt-tags-host'),
    tagsPills: document.getElementById('prompt-tags-pills'),
    tagsInput: document.getElementById('prompt-tags-input'),
    saveLabel: document.getElementById('prompt-save-label'),
    cancel: document.getElementById('cancel-edit-button'),
  });
}

function wireUi() {
  el.workspaceEdit.addEventListener('click', () => {
    state.workspaceEditing = !state.workspaceEditing;
    renderWorkspaceTabs();
  });
  el.search.addEventListener('input', () => {
    state.search = el.search.value || '';
    renderPromptList();
  });
  el.newPrompt.addEventListener('click', () => openEditor(null));
  el.form.addEventListener('submit', saveCurrentPrompt);
  el.cancel.addEventListener('click', clearEditor);
  el.tagsInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addPendingTag();
    } else if (event.key === 'Backspace' && !el.tagsInput.value && tags.length) {
      tags = tags.slice(0, -1);
      renderTags();
    }
  });
  el.tagsInput.addEventListener('blur', addPendingTag);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enableTags) {
      state.enableTags = changes.enableTags.newValue !== false;
      renderTags();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await globalThis.OPMI18n?.ready;
  document.body.classList.add('manager-page', 'is-expanded-tab');
  collectElements();
  wireUi();
  await refreshData();
  clearEditor();

  onPromptsChanged((prompts) => {
    refreshData(Array.isArray(prompts) ? prompts : []).catch(console.error);
  });

  globalThis.OPMI18n?.subscribe?.(() => {
    renderAll();
    setSaveLabel(Boolean(state.selectedPromptId));
  });
});

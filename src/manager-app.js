import {
  deleteFolder, deletePrompt, getStoreSnapshot, onStoreChanged,
  saveFolder, savePrompt, updateFolder, updatePrompt,
  saveWorkspace, renameWorkspace as renameStoredWorkspace,
  deleteWorkspace, setActiveWorkspace,
} from './storage/promptStorage.js';
import { SETTINGS_DEFAULTS } from './settings-defaults.js';
import { normalizeTag, uniqueNormalizedTags } from './utils/tags.js';

const OPTION_ALL = '__all__';
const OPTION_UNCATEGORIZED = '__uncategorized__';
const DEFAULT_WORKSPACE_ID = 'workspace-default';

const state = {
  prompts: [],
  folders: [],
  workspaces: [],
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  folderOption: OPTION_ALL,
  workspaceEditing: false,
  selectedPromptId: null,
  search: '',
  enableTags: SETTINGS_DEFAULTS.enableTags,
  revision: -1,
  saving: false,
};

const el = {};
let tags = [];
let editorGeneration = 0;
let editorRevision = 0;

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

function activePrompts() {
  return state.prompts.filter((prompt) => prompt.workspaceId === state.activeWorkspaceId);
}

function activeFolders() {
  return state.folders.filter((folder) => folder.workspaceId === state.activeWorkspaceId);
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
    Promise.resolve().then(() => onClick?.()).catch(showError);
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
  await setActiveWorkspace(id);
  await refreshData();
}

async function createWorkspace() {
  const next = window.prompt(copy().name, '');
  if (next == null || !next.trim()) return;
  await saveWorkspace(next.trim());
  await refreshData();
}

async function renameWorkspace(id) {
  const workspace = state.workspaces.find(item => item.id === id);
  if (!workspace) return;
  const next = window.prompt(copy().name, displayWorkspaceName(workspace));
  if (next == null || !next.trim()) return;
  await renameStoredWorkspace(id, next.trim());
  await refreshData();
}

async function removeWorkspace(id) {
  if (state.workspaces.length <= 1) { window.alert(copy().keepOne); return; }
  const workspace = state.workspaces.find(item => item.id === id);
  if (!workspace || !window.confirm(fmt(copy().confirmRemove, { name: displayWorkspaceName(workspace) }))) return;
  await deleteWorkspace(id);
  await refreshData();
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
  const workspaceId = state.activeWorkspaceId;
  const folder = await saveFolder({ name: name.trim(), workspaceId });
  if (state.activeWorkspaceId !== workspaceId) return;
  state.folderOption = folder.id;
  await refreshData();
  if (!state.selectedPromptId) renderFolderSelect(folder.id);
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

function renderFolderSelect(selected = undefined) {
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
  const value = selected === undefined ? fallback : selected;
  el.folderSelect.value = folders.some((folder) => folder.id === value) ? value : '';
}

function markEditorDirty() {
  editorRevision += 1;
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
      markEditorDirty();
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
  markEditorDirty();
  renderTags();
}

function setSaveLabel(editing) {
  const key = editing ? 'prompt.update' : 'prompt.save';
  el.saveLabel.dataset.i18n = key;
  el.saveLabel.textContent = t(key, {}, editing ? 'Save changes' : 'Save prompt');
}

function openEditor(prompt = null) {
  editorGeneration += 1;
  editorRevision = 0;
  el.tagsInput.value = '';
  state.selectedPromptId = prompt?.uuid || null;
  el.uuid.value = prompt?.uuid || '';
  el.title.value = prompt?.title || '';
  el.content.value = prompt?.content || '';
  tags = uniqueNormalizedTags(prompt?.tags || []);
  renderTags();
  renderFolderSelect(prompt ? prompt.folderId : undefined);
  setSaveLabel(Boolean(prompt));
  renderPromptList();
  el.title.focus();
}

function clearEditor() {
  editorGeneration += 1;
  editorRevision = 0;
  state.selectedPromptId = null;
  el.uuid.value = '';
  el.title.value = '';
  el.content.value = '';
  tags = [];
  el.tagsInput.value = '';
  renderTags();
  renderFolderSelect();
  setSaveLabel(false);
  renderPromptList();
}

function showError(error) {
  console.error('[OPM] Manager:', error);
  if (el.status) el.status.textContent = `${t('prompt.saveError')} ${error.message || ''}`;
}

async function saveCurrentPrompt(event) {
  event.preventDefault();
  if (state.saving) return;
  addPendingTag();
  const title = el.title.value.trim();
  const content = el.content.value;
  if (!title || !content.trim()) {
    window.alert(t('prompt.validationBeforeSave'));
    return;
  }
  // Capture ownership and the editor instance before waiting for the writer.
  const workspaceId = state.activeWorkspaceId;
  const generation = editorGeneration;
  const revision = editorRevision;
  const draft = { title, content, tags: [...tags], folderId: el.folderSelect.value || null };
  const uuid = el.uuid.value;
  state.saving = true;
  el.submit.disabled = true;
  el.status.textContent = '';
  try {
    const result = uuid ? await updatePrompt(uuid, draft) : await savePrompt({ ...draft, workspaceId });
    const savedPrompt = uuid ? result : result.prompt;
    await refreshData();
    if (generation === editorGeneration && workspaceId === state.activeWorkspaceId) {
      if (revision === editorRevision) {
        openEditor(savedPrompt);
      } else if (!uuid && savedPrompt?.uuid) {
        // The first save created an identity, but the user kept typing while the
        // worker was writing. Bind the live draft to that identity without
        // overwriting any newer title/content/tags/folder edits.
        state.selectedPromptId = savedPrompt.uuid;
        el.uuid.value = savedPrompt.uuid;
        setSaveLabel(true);
        renderPromptList();
      }
    }
  } catch (error) { showError(error); }
  finally { state.saving = false; el.submit.disabled = false; }
}

function renderAll() {
  const selectedFolder = el.folderSelect.value;
  renderWorkspaceTabs();
  renderFolders();
  renderPromptList();
  // Renders caused by a different item or a language change must not overwrite
  // the unsaved folder selection in this form.
  renderFolderSelect(selectedFolder);
  renderTags();
}

function applySnapshot(snapshot) {
  if (snapshot.revision < state.revision) return;
  const switched = state.activeWorkspaceId !== snapshot.activeWorkspaceId;
  Object.assign(state, {
    prompts: snapshot.prompts, folders: snapshot.folders,
    workspaces: snapshot.workspaces, activeWorkspaceId: snapshot.activeWorkspaceId,
    revision: snapshot.revision,
  });
  if (switched) resetLocalView();
  if (state.selectedPromptId && !activePrompts().some(p => p.uuid === state.selectedPromptId)) clearEditor();
  if (state.folderOption !== OPTION_ALL && state.folderOption !== OPTION_UNCATEGORIZED
      && !activeFolders().some(f => f.id === state.folderOption)) state.folderOption = OPTION_ALL;
  renderAll();
}

async function refreshData() { applySnapshot(await getStoreSnapshot()); }

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
    submit: document.getElementById('submit-button'),
    status: document.getElementById('manager-status'),
  });
}

function wireUi() {
  el.workspaceEdit.addEventListener('click', () => {
    state.workspaceEditing = !state.workspaceEditing;
    renderWorkspaceTabs();
  });
  el.title.addEventListener('input', markEditorDirty);
  el.content.addEventListener('input', markEditorDirty);
  el.folderSelect.addEventListener('change', markEditorDirty);
  el.tagsInput.addEventListener('input', markEditorDirty);
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
      markEditorDirty();
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

document.addEventListener('DOMContentLoaded', () => initialize().catch(showError));

async function initialize() {
  await globalThis.OPMI18n?.ready;
  document.body.classList.add('manager-page');
  collectElements();
  wireUi();
  const preferences = await chrome.storage.local.get(SETTINGS_DEFAULTS);
  state.enableTags = preferences.enableTags;
  onStoreChanged(applySnapshot);
  await refreshData();
  clearEditor();

  globalThis.OPMI18n?.subscribe?.(() => {
    renderAll();
    setSaveLabel(Boolean(state.selectedPromptId));
  });
}

// UI refinement for the full-page manager.
// Normal mode: flat workspace choices + one edit button.
// Edit mode: rename/delete controls and a create button become available.
// Folder navigation stays functional without a visible "Folders" category label.

let workspaceEditing = false;

function isChineseUi() {
  const language = globalThis.OPMI18n?.getLanguage?.() || navigator.language || 'en';
  return String(language).toLowerCase().startsWith('zh');
}

function uiCopy() {
  return isChineseUi()
    ? {
        edit: '编辑',
        done: '完成',
        create: '新建',
        rename: '重命名',
        remove: '删除',
        all: '全部',
        defaultName: '默认',
        name: '名称',
        keepOne: '至少需要保留一个。',
        confirmRemove: '删除“{name}”？其中内容会移动到其他项。',
        newFolder: '新建文件夹',
      }
    : {
        edit: 'Edit',
        done: 'Done',
        create: 'New',
        rename: 'Rename',
        remove: 'Delete',
        all: 'All',
        defaultName: 'Default',
        name: 'Name',
        keepOne: 'At least one must remain.',
        confirmRemove: 'Delete “{name}”? Its contents will move to another item.',
        newFolder: 'New folder',
      };
}

function format(text, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function legacyWorkspaceSelect() {
  return document.getElementById('manager-workspace-select');
}

function workspaceOptions() {
  const select = legacyWorkspaceSelect();
  if (!select) return [];
  const labels = uiCopy();
  return Array.from(select.options).map((option) => {
    const rawName = option.textContent || option.value;
    const isDefault = option.value === 'workspace-default'
      && (rawName === '默认工作区' || rawName === 'Default workspace');
    return {
      id: option.value,
      name: isDefault ? labels.defaultName : rawName,
    };
  });
}

function activeWorkspaceId() {
  return legacyWorkspaceSelect()?.value || '';
}

function activateLegacyWorkspace(id) {
  const select = legacyWorkspaceSelect();
  if (!select || !id || select.value === id) return;
  select.value = id;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

async function activateThen(id, action) {
  activateLegacyWorkspace(id);
  await new Promise((resolve) => queueMicrotask(resolve));
  action?.();
}

function clickLegacyPromptAction(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const labels = uiCopy();
  const originalPrompt = window.prompt;
  window.prompt = (_message, defaultValue) => originalPrompt(labels.name, defaultValue);
  try {
    button.click();
  } finally {
    window.prompt = originalPrompt;
  }
}

function clickLegacyDeleteAction(workspaceName) {
  const button = document.getElementById('manager-workspace-delete');
  if (!button) return;
  const labels = uiCopy();
  const originalConfirm = window.confirm;
  const originalAlert = window.alert;
  window.confirm = () => originalConfirm(format(labels.confirmRemove, { name: workspaceName }));
  window.alert = () => originalAlert(labels.keepOne);
  try {
    button.click();
  } finally {
    window.confirm = originalConfirm;
    window.alert = originalAlert;
  }
}

function makeIconButton(className, text, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  });
  return button;
}

function renderWorkspaceTabs() {
  const host = document.getElementById('manager-workspace-tabs');
  const editToggle = document.getElementById('manager-workspace-edit-toggle');
  if (!host || !editToggle) return;

  const labels = uiCopy();
  const currentId = activeWorkspaceId();
  const options = workspaceOptions();
  host.replaceChildren();

  options.forEach((workspace) => {
    const wrap = document.createElement('span');
    wrap.className = 'manager-workspace-tab-wrap';
    wrap.classList.toggle('is-active', workspace.id === currentId);

    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'manager-workspace-tab';
    selectButton.textContent = workspace.name;
    selectButton.title = workspace.name;
    selectButton.setAttribute('role', 'tab');
    selectButton.setAttribute('aria-selected', String(workspace.id === currentId));
    selectButton.addEventListener('click', () => {
      activateLegacyWorkspace(workspace.id);
      renderWorkspaceTabs();
    });
    wrap.appendChild(selectButton);

    if (workspaceEditing) {
      wrap.appendChild(makeIconButton(
        'manager-workspace-inline-action',
        '✎',
        labels.rename,
        () => activateThen(workspace.id, () => clickLegacyPromptAction('manager-workspace-rename')),
      ));
      wrap.appendChild(makeIconButton(
        'manager-workspace-inline-action is-danger',
        '×',
        labels.remove,
        () => activateThen(workspace.id, () => clickLegacyDeleteAction(workspace.name)),
      ));
    }

    host.appendChild(wrap);
  });

  if (workspaceEditing) {
    host.appendChild(makeIconButton(
      'manager-workspace-create-inline',
      '+',
      labels.create,
      () => clickLegacyPromptAction('manager-workspace-add'),
    ));
  }

  editToggle.textContent = workspaceEditing ? '✓' : '✎';
  editToggle.title = workspaceEditing ? labels.done : labels.edit;
  editToggle.setAttribute('aria-label', workspaceEditing ? labels.done : labels.edit);
  editToggle.classList.toggle('is-editing', workspaceEditing);
  editToggle.setAttribute('aria-pressed', String(workspaceEditing));
}

function wireWorkspaceTabs() {
  const select = legacyWorkspaceSelect();
  const editToggle = document.getElementById('manager-workspace-edit-toggle');
  if (!select || !editToggle) return;

  editToggle.addEventListener('click', () => {
    workspaceEditing = !workspaceEditing;
    renderWorkspaceTabs();
  });

  select.addEventListener('change', () => queueMicrotask(renderWorkspaceTabs));

  const observer = new MutationObserver(() => queueMicrotask(renderWorkspaceTabs));
  observer.observe(select, { childList: true, subtree: true });
  renderWorkspaceTabs();
}

function hiddenFolderTab() {
  return document.querySelector('.manager-category-tab[data-manager-category="folders"]');
}

function visibleAllTab() {
  return document.querySelector('.manager-category-tab[data-manager-category="all"]');
}

function folderOptionsHost() {
  return document.getElementById('manager-category-options');
}

function syncFolderPresentation() {
  const host = folderOptionsHost();
  const allTab = visibleAllTab();
  if (!host || !allTab) return;
  const labels = uiCopy();

  // The first category option generated by the legacy controller is "All folders".
  // Hide it because the visible "All" tab owns that action now.
  const allFolders = host.querySelector('.manager-category-option');
  if (allFolders && !allFolders.classList.contains('manager-hidden-all-folders')) {
    allFolders.classList.add('manager-hidden-all-folders');
  }

  // Keep creation functional but do not add another visible "文件夹/Folders" label.
  const createFolder = host.querySelector('.manager-folder-create');
  if (createFolder) {
    if (createFolder.textContent !== '+') createFolder.textContent = '+';
    if (createFolder.title !== labels.newFolder) createFolder.title = labels.newFolder;
    if (createFolder.getAttribute('aria-label') !== labels.newFolder) {
      createFolder.setAttribute('aria-label', labels.newFolder);
    }
  }

  const allIsActive = Boolean(allFolders?.classList.contains('is-active'));
  allTab.classList.toggle('is-active', allIsActive);
  allTab.setAttribute('aria-selected', String(allIsActive));
  if (allTab.textContent !== labels.all) allTab.textContent = labels.all;
}

function forceFolderNavigationMode() {
  const folderTab = hiddenFolderTab();
  if (!folderTab) return;
  if (!folderTab.classList.contains('is-active')) folderTab.click();
  queueMicrotask(syncFolderPresentation);
}

function wireFolderPresentation() {
  const allTab = visibleAllTab();
  const folderTab = hiddenFolderTab();
  const host = folderOptionsHost();
  if (!allTab || !folderTab || !host) return;

  // Keep the underlying controller in folder mode so folder chips are always available.
  // The visible All control simply resets that folder filter to all prompts.
  allTab.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    folderTab.click();
    queueMicrotask(syncFolderPresentation);
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(syncFolderPresentation));
  observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  forceFolderNavigationMode();
  setTimeout(forceFolderNavigationMode, 80);
  setTimeout(forceFolderNavigationMode, 350);
}

function localizeRefinementUi() {
  renderWorkspaceTabs();
  syncFolderPresentation();
}

document.addEventListener('DOMContentLoaded', async () => {
  await globalThis.OPMI18n?.ready;
  wireWorkspaceTabs();
  wireFolderPresentation();
  globalThis.OPMI18n?.subscribe?.(localizeRefinementUi);
});

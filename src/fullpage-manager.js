// Full-page manager behavior that is intentionally separate from the legacy sidepanel controller.
// It keeps the left column focused on prompt navigation and turns row clicks into edit/select actions.
import {
  getFolders,
  getPrompts,
  onPromptsChanged,
} from './storage/promptStorage.js';

const CATEGORY_ALL = 'all';
const CATEGORY_RECENT = 'recent';
const CATEGORY_TAGS = 'tags';
const CATEGORY_FOLDERS = 'folders';
const OPTION_ALL = '__all__';
const OPTION_UNCATEGORIZED = '__uncategorized__';

const categoryState = {
  category: CATEGORY_ALL,
  option: OPTION_ALL,
  prompts: [],
  folders: [],
  promptsById: new Map(),
};

function isChineseUi() {
  const language = globalThis.OPMI18n?.getLanguage?.() || navigator.language || 'en';
  return String(language).toLowerCase().startsWith('zh');
}

function categoryCopy() {
  return isChineseUi()
    ? {
        allTags: '全部标签',
        allFolders: '全部文件夹',
        uncategorized: '未分类',
      }
    : {
        allTags: 'All tags',
        allFolders: 'All folders',
        uncategorized: 'Uncategorized',
      };
}

function localizeCategoryTabs() {
  const zh = isChineseUi();
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    button.textContent = zh ? button.dataset.labelZh : button.dataset.labelEn;
  });
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

function openPromptForEditing(row) {
  if (!row) return;
  const editButton = row.querySelector('.spm-prompt-actions-overflow .spm-prompt-action-btn');
  if (!editButton) return;
  selectPromptRow(row);
  editButton.click();
}

function wireNavigationClicks() {
  const list = document.getElementById('prompt-list');
  if (!list || list.dataset.managerNavigationWired === '1') return;
  list.dataset.managerNavigationWired = '1';

  // Capture before the legacy row handler, which otherwise tries to insert into the active webpage.
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
    document.querySelectorAll('#prompt-list li.is-selected').forEach((item) => {
      item.classList.remove('is-selected');
    });
  });
}

function refreshPromptMaps() {
  categoryState.promptsById = new Map(
    categoryState.prompts.map((prompt, index) => [prompt.uuid, { prompt, index }]),
  );
}

function promptTimestamp(prompt) {
  const value = prompt?.updatedAt || prompt?.createdAt;
  const timestamp = value ? Date.parse(value) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function setRowOrder(row, meta) {
  if (!meta) {
    row.style.order = '999999';
    return;
  }

  if (categoryState.category === CATEGORY_RECENT) {
    const sorted = [...categoryState.prompts]
      .sort((a, b) => promptTimestamp(b) - promptTimestamp(a));
    const recentIndex = sorted.findIndex((prompt) => prompt.uuid === meta.prompt.uuid);
    row.style.order = String(recentIndex < 0 ? 999999 : recentIndex);
    return;
  }

  row.style.order = String(meta.index);
}

function rowMatchesCategory(meta) {
  if (!meta) return true;
  const { prompt } = meta;

  if (categoryState.category === CATEGORY_TAGS && categoryState.option !== OPTION_ALL) {
    const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
    return tags.includes(categoryState.option);
  }

  if (categoryState.category === CATEGORY_FOLDERS && categoryState.option !== OPTION_ALL) {
    if (categoryState.option === OPTION_UNCATEGORIZED) {
      return !prompt.folderId;
    }
    return prompt.folderId === categoryState.option;
  }

  return true;
}

function applyCategoryToRows() {
  const list = document.getElementById('prompt-list');
  if (!list) return;

  list.querySelectorAll('li[data-uuid]').forEach((row) => {
    const meta = categoryState.promptsById.get(row.dataset.uuid);
    row.classList.toggle('manager-category-hidden', !rowMatchesCategory(meta));
    setRowOrder(row, meta);
  });
}

function createCategoryOption(label, value, count = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'manager-category-option';
  button.dataset.managerOption = value;
  button.textContent = count == null ? label : `${label} (${count})`;
  button.classList.toggle('is-active', categoryState.option === value);
  button.setAttribute('aria-pressed', String(categoryState.option === value));
  button.addEventListener('click', () => {
    categoryState.option = value;
    renderCategoryOptions();
    applyCategoryToRows();
  });
  return button;
}

function renderTagOptions(host) {
  const copy = categoryCopy();
  const counts = new Map();
  categoryState.prompts.forEach((prompt) => {
    const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
    tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  const tags = [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const validOptions = new Set([OPTION_ALL, ...tags]);
  if (!validOptions.has(categoryState.option)) categoryState.option = OPTION_ALL;

  host.appendChild(createCategoryOption(copy.allTags, OPTION_ALL));
  tags.forEach((tag) => {
    host.appendChild(createCategoryOption(String(tag), tag, counts.get(tag)));
  });
}

function renderFolderOptions(host) {
  const copy = categoryCopy();
  const counts = new Map();
  let uncategorizedCount = 0;
  categoryState.prompts.forEach((prompt) => {
    if (!prompt.folderId) {
      uncategorizedCount += 1;
      return;
    }
    counts.set(prompt.folderId, (counts.get(prompt.folderId) || 0) + 1);
  });

  const folders = [...categoryState.folders]
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const validOptions = new Set([OPTION_ALL, OPTION_UNCATEGORIZED, ...folders.map((folder) => folder.id)]);
  if (!validOptions.has(categoryState.option)) categoryState.option = OPTION_ALL;

  host.appendChild(createCategoryOption(copy.allFolders, OPTION_ALL));
  host.appendChild(createCategoryOption(copy.uncategorized, OPTION_UNCATEGORIZED, uncategorizedCount));
  folders.forEach((folder) => {
    host.appendChild(createCategoryOption(folder.name || copy.uncategorized, folder.id, counts.get(folder.id) || 0));
  });
}

function renderCategoryOptions() {
  const host = document.getElementById('manager-category-options');
  if (!host) return;
  host.replaceChildren();

  if (categoryState.category === CATEGORY_TAGS) {
    host.hidden = false;
    renderTagOptions(host);
    return;
  }

  if (categoryState.category === CATEGORY_FOLDERS) {
    host.hidden = false;
    renderFolderOptions(host);
    return;
  }

  host.hidden = true;
  categoryState.option = OPTION_ALL;
}

function activateCategory(category) {
  categoryState.category = category;
  categoryState.option = OPTION_ALL;
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    const active = button.dataset.managerCategory === category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderCategoryOptions();
  applyCategoryToRows();
}

function wireCategoryTabs() {
  document.querySelectorAll('.manager-category-tab').forEach((button) => {
    button.addEventListener('click', () => {
      activateCategory(button.dataset.managerCategory || CATEGORY_ALL);
    });
  });
}

async function refreshCategoryData() {
  try {
    const [prompts, folders] = await Promise.all([getPrompts(), getFolders()]);
    categoryState.prompts = Array.isArray(prompts) ? prompts : [];
    categoryState.folders = Array.isArray(folders) ? folders : [];
    refreshPromptMaps();
    renderCategoryOptions();
    applyCategoryToRows();
  } catch (error) {
    console.warn('[Open Prompt Manager] Failed to refresh prompt categories:', error);
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
      applyCategoryToRows();
    });
  });
  observer.observe(list, { childList: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  await globalThis.OPMI18n?.ready;

  // sidepanel.js marks expanded pages shortly after DOMContentLoaded; this page is always full-page now.
  document.body.classList.add('is-expanded-tab', 'manager-page');
  localizeCategoryTabs();
  forcePromptNavigationVisible();
  wireNavigationClicks();
  wireCreateShortcut();
  wireCategoryTabs();
  observeLegacyVisibilityWrites();
  observePromptListRebuilds();
  await refreshCategoryData();

  globalThis.OPMI18n?.subscribe?.(() => {
    localizeCategoryTabs();
    renderCategoryOptions();
  });
  onPromptsChanged(() => {
    refreshCategoryData().catch(console.error);
  });

  // The legacy controller may change visibility during async initialization.
  setTimeout(() => {
    forcePromptNavigationVisible();
    applyCategoryToRows();
  }, 0);
  setTimeout(() => {
    forcePromptNavigationVisible();
    applyCategoryToRows();
  }, 350);
});

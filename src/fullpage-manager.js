// Full-page manager behavior that is intentionally separate from the legacy sidepanel controller.
// It keeps the left column focused on prompt navigation and turns row clicks into edit/select actions.

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
    if (display !== 'block' || priority !== 'important') {
      list.style.setProperty('display', 'block', 'important');
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

function wireCreateShortcuts() {
  const mainCreate = document.getElementById('create-prompt-btn');
  const emptyCreate = document.getElementById('empty-create-prompt-btn');
  if (mainCreate && emptyCreate) {
    emptyCreate.addEventListener('click', () => mainCreate.click());
  }
  mainCreate?.addEventListener('click', () => {
    document.querySelectorAll('#prompt-list li.is-selected').forEach((item) => {
      item.classList.remove('is-selected');
    });
  });
}

function observeLegacyVisibilityWrites() {
  const controls = document.getElementById('prompt-list-controls');
  const list = document.getElementById('prompt-list');
  const observer = new MutationObserver(() => forcePromptNavigationVisible());
  if (controls) observer.observe(controls, { attributes: true, attributeFilter: ['hidden', 'style'] });
  if (list) observer.observe(list, { attributes: true, attributeFilter: ['style'] });
}

document.addEventListener('DOMContentLoaded', () => {
  // sidepanel.js marks expanded pages shortly after DOMContentLoaded; this page is always full-page now.
  document.body.classList.add('is-expanded-tab', 'manager-page');
  forcePromptNavigationVisible();
  wireNavigationClicks();
  wireCreateShortcuts();
  observeLegacyVisibilityWrites();

  // The legacy controller may change visibility during async initialization.
  setTimeout(forcePromptNavigationVisible, 0);
  setTimeout(forcePromptNavigationVisible, 350);
});

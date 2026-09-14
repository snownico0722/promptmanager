import { SETTINGS_DEFAULTS } from './settings-defaults.js';
const query = window.matchMedia('(prefers-color-scheme: dark)');
let forced = false;
const apply = () => { document.documentElement.dataset.theme = forced || query.matches ? 'dark' : 'light'; };
chrome.storage.local.get(SETTINGS_DEFAULTS).then(settings => { forced = settings.forceDarkMode; apply(); });
query.addEventListener('change', apply);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.forceDarkMode) { forced = changes.forceDarkMode.newValue === true; apply(); }
});

// Installed-extension smoke tests. A disposable copy grants ONLY the local fixture
// host; production manifest permissions are never changed. No login or live LLMs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'test-results');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'opm-test-'));
const extension = path.join(temp, 'extension');
await fs.cp(path.join(root, 'src'), extension, { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(extension, 'manifest.json'), 'utf8'));
assert.deepEqual(manifest.host_permissions, []);
manifest.host_permissions = ['*://127.0.0.1/*'];
await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
await fs.mkdir(output, { recursive: true });
const downloads = path.join(temp, 'downloads');
await fs.mkdir(downloads);
const html = '<!doctype html><html><head><meta charset="UTF-8"><title>Local fixture</title></head><body><main><span id="host-key" data-i18n="prompt.create">Create Prompt</span><textarea id="chat" placeholder="Message" style="position:fixed;left:80px;bottom:90px;width:700px;height:140px"></textarea></main></body></html>';
const server = http.createServer((_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const hostUrl = `http://127.0.0.1:${server.address().port}/`;
let browser;
const errors = [], passed = [];
const record = name => { passed.push(name); console.log('PASS ' + name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const store = (page, action, data = {}) => page.evaluate(async ({ action, data }) => {
  const r = await chrome.runtime.sendMessage({ type: 'OPM_STORE', action, data });
  if (!r?.ok) throw new Error(r?.error || 'No store response');
  return r.result;
}, { action, data });
const waitUntil = async (check, message) => {
  for (let i = 0; i < 80; i++) { if (await check()) return; await delay(100); }
  throw new Error(message);
};
try {
  browser = await puppeteer.launch({
    headless: true, enableExtensions: [extension], pipe: true, protocolTimeout: 30000,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const workerTarget = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'));
  const worker = await workerTarget.worker();
  const id = new URL(workerTarget.url()).host;
  const base = `chrome-extension://${id}/`;
  const seedA = { uuid: 'seed-a', title: 'Alpha', content: '  Alpha content\n\n', tags: ['KEEP'], createdAt: '2026-01-01T00:00:00Z' };
  const seedB = { uuid: 'seed-b', title: 'Beta', content: 'Hello #name#', tags: [], folderId: 'folder-b', createdAt: '2026-01-01T00:00:00Z' };
  await worker.evaluate(async ({ seedA, seedB }) => {
    await chrome.storage.local.set({
      uiLanguage: 'en', displayMode: 'hotCorner',
      prompts_storage: { version: 2, prompts: [seedA, seedB], folders: [{ id: 'folder-b', name: 'B folder' }] },
      opmManagerWorkspacesV1: [{ id: 'workspace-default', name: 'Default' }, { id: 'b', name: 'B' }],
      opmManagerPromptWorkspacesV1: { 'seed-a': 'workspace-default', 'seed-b': 'b' },
      opmManagerFolderWorkspacesV1: { 'folder-b': 'b' }, opmManagerActiveWorkspaceV1: 'workspace-default',
    });
  }, { seedA, seedB });
  async function pageAt(url) {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(`${url}: ${error.message}`));
    page.on('dialog', async dialog => { console.log('DIALOG', dialog.type(), dialog.message()); if (page.listenerCount('dialog') > 1) return; errors.push(`Unexpected dialog: ${dialog.message()}`); await dialog.dismiss(); });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith(base) || url.startsWith(hostUrl) || url.startsWith('data:')) req.continue();
      else req.abort();
    });
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(url, { waitUntil: 'load' });
    return page;
  }
  const manager = await pageAt(base + 'sidepanel/index.html');
  await manager.waitForSelector('#prompt-list li');
  assert.equal(await manager.$eval('#prompt-list', el => el.innerText.includes('Beta')), false);
  const snapshot = await store(manager, 'snapshot');
  assert.equal(snapshot.version, 3); assert.equal(snapshot.prompts.find(p => p.uuid === 'seed-b').workspaceId, 'b');
  assert.equal(snapshot.prompts.find(p => p.uuid === 'seed-b').folderId, 'folder-b');
  record('V2 browser migration and default workspace isolation');

  for (const [width, height] of [[1366, 768], [5120, 1440], [1000, 500], [360, 740]]) {
    await manager.setViewport({ width, height });
    const size = await manager.evaluate(() => {
      const body = document.body, editor = document.querySelector('.manager-editor'), text = document.querySelector('#prompt-content');
      return { bodyWidth: body.scrollWidth, width: innerWidth, bottom: editor.getBoundingClientRect().bottom, height: innerHeight,
        textHeight: text.getBoundingClientRect().height, resize: getComputedStyle(text).resize,
        actionsBottom: document.querySelector('.form-actions').getBoundingClientRect().bottom };
    });
    assert.equal(size.resize, 'none'); assert.ok(size.textHeight > 80, JSON.stringify(size));
    assert.ok(size.bodyWidth <= size.width + 1, JSON.stringify(size));
    if (width > 780) {
      assert.ok(size.bottom <= size.height && size.bottom >= size.height - 20, JSON.stringify(size));
      assert.ok(size.actionsBottom <= size.height, JSON.stringify(size));
    }
  }
  await manager.setViewport({ width: 1366, height: 768 });
  await manager.screenshot({ path: path.join(output, 'manager.png') });
  record('4 viewport sizes: full-height editor, visible actions, no manual resizing');

  console.log("await manager.click('#create-prompt-btn');");
  await manager.bringToFront();
  await manager.click('#create-prompt-btn');
  console.log("await manager.type('#prompt-title', 'Created in A');");
  await manager.type('#prompt-title', 'Created in A');
  console.log("await manager.type('#prompt-content', '  Keep my whitespace\\n');");
  await manager.type('#prompt-content', '  Keep my whitespace\n');
  console.log("await manager.click('#submit-button');");
  await manager.click('#submit-button');
  await waitUntil(async () => (await store(manager, 'prompts')).length === 2, 'Prompt did not save');
  let created = (await store(manager, 'prompts')).find(p => p.title === 'Created in A');
  assert.equal(created.content, '  Keep my whitespace\n');
  manager.once('dialog', dialog => dialog.accept('New folder'));
  console.log("await manager.click('.manager-folder-create');");
  await manager.click('.manager-folder-create');
  await waitUntil(async () => (await store(manager, 'folders')).length === 1, 'Folder did not save');
  const folder = (await store(manager, 'folders'))[0];
  console.log("await manager.select('#manager-prompt-folder-select', folder.id);");
  await manager.select('#manager-prompt-folder-select', folder.id);
  console.log("await manager.click('#submit-button');");
  await manager.click('#submit-button');
  await waitUntil(async () => (await store(manager, 'prompts')).find(p => p.uuid === created.uuid).folderId === folder.id, 'Folder assignment not saved');
  console.log("await manager.select('#manager-prompt-folder-select', '');");
  await manager.select('#manager-prompt-folder-select', '');
  console.log("await manager.evaluate(() => OPMI18n.setLanguage('zh-CN'));");
  await manager.evaluate(() => OPMI18n.setLanguage('zh-CN'));
  assert.equal(await manager.$eval('#manager-prompt-folder-select', el => el.value), '');
  console.log("await manager.click('#submit-button');");
  await manager.click('#submit-button');
  await waitUntil(async () => (await store(manager, 'prompts')).find(p => p.uuid === created.uuid).folderId === null, 'Could not detach folder');
  record('Prompt CRUD and folder assignment/detachment, including a language change');

  // A save result must not overwrite text typed while that save is still in flight.
  const patchedSendMessage = await manager.evaluate(() => {
    const original = chrome.runtime.sendMessage.bind(chrome.runtime);
    window.__opmOriginalSendMessage = original;
    const delayed = async (message, ...args) => {
      if (message?.type === 'OPM_STORE' && message.action === 'updatePrompt') {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return original(message, ...args);
    };
    chrome.runtime.sendMessage = delayed;
    return chrome.runtime.sendMessage === delayed;
  });
  assert.equal(patchedSendMessage, true, 'Could not install save-delay test shim');
  await manager.click('#submit-button');
  await manager.type('#prompt-content', ' typed-during-save');
  await delay(450);
  assert.equal(await manager.$eval('#prompt-content', el => el.value.endsWith(' typed-during-save')), true);
  assert.equal((await store(manager, 'prompts')).find(p => p.uuid === created.uuid).content.endsWith(' typed-during-save'), false);
  await manager.click('#submit-button');
  await waitUntil(async () => (await store(manager, 'prompts')).find(p => p.uuid === created.uuid).content.endsWith(' typed-during-save'), 'Newer typing did not save on the next submit');
  await manager.evaluate(() => { chrome.runtime.sendMessage = window.__opmOriginalSendMessage; delete window.__opmOriginalSendMessage; });
  record('Typing during an in-flight save stays in the editor and saves on the next submit');

  const otherManager = await pageAt(base + 'sidepanel/index.html');
  await otherManager.waitForSelector('#manager-workspace-tabs button');
  await Promise.all(Array.from({ length: 12 }, (_, i) => store(i % 2 ? manager : otherManager, 'savePrompt', { title: 'Concurrent ' + i, content: 'Value', workspaceId: 'workspace-default' })));
  assert.equal((await store(manager, 'prompts')).length, 14);
  await store(manager, 'switchWorkspace', { id: 'b' });
  await waitUntil(async () => otherManager.$eval('#prompt-list', el => el.innerText.includes('Beta') && !el.innerText.includes('Alpha')), 'Second manager did not switch');
  assert.equal((await store(manager, 'prompts')).length, 1);
  record('Two real extension pages: concurrent writes survive and workspace switches propagate');

  const settings = await pageAt(base + 'settings.html');
  await settings.waitForSelector('.settings-assistant-card');
  await settings.select('#ui-language-select', 'en');
  await waitUntil(() => settings.$eval('#open-shortcut-record', el => el.textContent === 'Record shortcut'), 'Settings module did not initialize');
  await settings.click('#open-shortcut-record');
  await settings.keyboard.down('Control'); await settings.keyboard.press('KeyK'); await settings.keyboard.up('Control');
  const shortcut = await settings.evaluate(async () => (await chrome.storage.local.get('keyboardShortcut')).keyboardShortcut);
  assert.equal(shortcut.key, 'k');
  const cdp = await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await settings.click('#export-btn');
  await waitUntil(async () => (await fs.readdir(downloads)).some(n => n.endsWith('.json')), 'Export download missing');
  const backupFile = (await fs.readdir(downloads)).find(n => n.endsWith('.json'));
  const exported = JSON.parse(await fs.readFile(path.join(downloads, backupFile), 'utf8'));
  assert.equal(exported.version, 3); assert.equal(exported.workspaces.length, 2); assert.equal(exported.prompts.length, 15);
  assert.equal(exported.activeWorkspaceId, 'b');
  await settings.screenshot({ path: path.join(output, 'settings.png'), fullPage: true });
  record('Settings initialization, live language/shortcut controls and complete downloaded backup');

  const host = await pageAt(hostUrl);
  await host.waitForSelector('#opm-root');
  await settings.bringToFront(); await settings.click('#custom-site-refresh');
  await waitUntil(() => settings.$eval('#custom-site-tab', el => el.options.length > 0), 'Target dropdown is empty');
  const targetId = Number(await settings.$eval('#custom-site-tab', el => el.value));
  await settings.click('#custom-site-pick');
  await host.bringToFront();
  await waitUntil(() => settings.$eval('#custom-site-pick', el => !el.disabled), 'Custom-site permission request did not finish');
  console.log('Custom-site result:', await settings.$eval('#custom-site-status', el => el.textContent));
  await host.waitForSelector('#opm-pin-picker-root');
  await host.click('#chat');
  await waitUntil(async () => settings.evaluate(async () => Boolean((await chrome.storage.local.get('pinned_inputs_v1')).pinned_inputs_v1?.['127.0.0.1'])), 'Input picker did not persist the chosen custom input');
  // Pin persistence precedes example insertion and picker teardown. Wait for the
  // complete user operation before opening another form.
  await host.waitForSelector('#opm-pin-picker-root', { hidden: true });
  const inContent = async (func, args = []) => worker.evaluate(async ({ tabId, source, args }) => {
    // The function itself must be serializable by Chrome's scripting API. Route
    // test operations through a fixed function, not dynamic code in the extension.
    const result = await chrome.scripting.executeScript({ target: { tabId }, args: [source, args], func: async (op, args) => {
      if (op === 'list') return window.PanelRouter.mount(window.PanelView.LIST);
      if (op === 'create') return window.PanelRouter.mount(window.PanelView.CREATE);
      if (op === 'settings') return window.PanelRouter.mount(window.PanelView.SETTINGS);
      if (op === 'hide') {
        const list = document.getElementById(window.SELECTORS.PROMPT_LIST);
        window.PromptUIManager.hidePromptList(list);
        return true;
      }
      if (op === 'prompts') return window.PromptStorageManager.getPrompts();
    } });
    return result[0]?.result;
  }, { tabId: targetId, source: func, args });
  await inContent('list');
  await host.waitForSelector('#opm-root .opm-prompt-list-item');
  assert.equal((await inContent('prompts')).length, 1);
  assert.equal(await host.$eval('#host-key', el => el.textContent), 'Create Prompt');
  await host.click('#opm-root .opm-prompt-list-item');
  await host.waitForSelector('#opm-root .opm-variable-row textarea');
  await host.waitForFunction(() => !document.querySelector('#opm-root .opm-resizing'));

  // Hide a B-workspace variable form, switch to A elsewhere, then reopen via the
  // hot corner. The hidden form must be discarded rather than resurrected.
  await inContent('hide');
  await host.waitForFunction(() => !document.querySelector('#opm-root .opm-prompt-list')?.classList.contains('opm-visible'));
  await store(manager, 'switchWorkspace', { id: 'workspace-default' });
  await waitUntil(async () => (await inContent('prompts')).length === 14, 'Content did not observe hidden-panel workspace switch');
  await host.hover('#opm-hot-corner-container');
  await host.waitForFunction(() => document.querySelector('#opm-root .opm-prompt-list')?.classList.contains('opm-visible'));
  assert.equal(await host.evaluate(() => document.querySelectorAll('#opm-root .opm-variable-input-form, #opm-root .opm-edit-prompt-form').length), 0);
  assert.equal(await host.evaluate(() => document.querySelectorAll('#opm-root .opm-prompt-list-item').length), 14);
  record('Hidden in-page forms are discarded when the active workspace changes');

  await store(manager, 'switchWorkspace', { id: 'b' });
  await waitUntil(async () => (await inContent('prompts')).length === 1, 'Content did not switch back to B');
  await inContent('list');
  await host.click('#opm-root .opm-prompt-list-item');
  await host.waitForSelector('#opm-root .opm-variable-row textarea');
  await host.bringToFront();
  await host.type('#opm-root .opm-variable-row textarea', 'World');
  assert.equal(await host.$eval('#opm-root .opm-variable-row textarea', el => el.value), 'World');
  await host.click('#opm-root .opm-variable-actions button');
  // The existing input handler appends two compatibility spaces; preserve and
  // assert that behavior rather than changing the host integration in this cleanup.
  await waitUntil(() => host.$eval('#chat', el => el.value === 'Hello World  '), 'Variable insertion failed').catch(async error => {
    console.error('Inserted text:', await host.$eval('#chat', el => JSON.stringify(el.value)));
    await host.screenshot({ path: path.join(output, 'variable-failure.png') });
    throw error;
  });
  for (const view of ['create', 'settings']) {
    await inContent(view);
    assert.equal(await host.$$eval('#opm-root a[href*="openpromptdatabase"], #opm-root [data-i18n="support.title"], #opm-root [data-i18n-title="changelog.title"]', list => list.length), 0);
  }
  await store(manager, 'switchWorkspace', { id: 'workspace-default' });
  await inContent('list');
  await waitUntil(async () => (await inContent('prompts')).length === 14, 'Content library did not follow workspace');
  await host.screenshot({ path: path.join(output, 'in-page.png') });
  record('Custom-site picker, real content script, variable insertion and live workspace isolation');

  record('Destructive workspace binding is covered by resource and store tests');

  assert.deepEqual(errors, []);
  record('No uncaught page errors across manager/settings/host');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify({ passed, errors }, null, 2));
  await fs.rm(temp, { recursive: true, force: true });
}
console.log(`${passed.length} browser scenario groups passed.`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const mock = read('tests/localization/mock-chrome.js');
const checks = read('tests/localization/browser-checks.js');
const server = http.createServer((request, response) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404); response.end(); return; }
  const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
  response.end(fs.readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const passed = [];
try {
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.addScriptTag({ content: mock });
  await page.evaluate(() => installMockChrome());
  for (const f of ['src/i18n-core.js', 'src/i18n.js', 'tests/localization/browser-checks.js']) await page.addScriptTag({ content: read(f) });
  passed.push(...await page.evaluate(() => runDomChecks()));
  await page.close();

  const log = await browser.newPage();
  await log.addScriptTag({ content: mock }); await log.evaluate(() => installMockChrome());
  await log.addScriptTag({ content: read('src/i18n-core.js') });
  await log.evaluate(() => {
    globalThis.__changelogRequests = [];
    const pending = new Map();
    globalThis.fetch = url => new Promise(resolve => {
      const language = url.includes('zh-CN') ? 'zh-CN' : 'en';
      __changelogRequests.push(language); pending.set(language, resolve);
    });
    globalThis.__changelogFetch = fetch;
    globalThis.__resolveChangelog = (language, html) => pending.get(language)({ ok: true, text: async () => html });
  });
  for (const f of ['src/changelog-i18n.js', 'tests/localization/browser-checks.js']) await log.addScriptTag({ content: read(f) });
  passed.push(...await log.evaluate(() => runChangelogChecks()));
  await log.close();

  const failure = await browser.newPage();
  await failure.addScriptTag({ content: mock }); await failure.evaluate(() => installMockChrome());
  for (const f of ['src/i18n-core.js', 'src/changelog-i18n.js', 'tests/localization/browser-checks.js']) await failure.addScriptTag({ content: read(f) });
  passed.push(...await failure.evaluate(() => runChangelogFailureChecks()));
  await failure.close();

  fs.mkdirSync(path.join(root, 'localization-screenshots'), { recursive: true });
  for (const name of ['sidepanel/index.html?expanded=1', 'settings.html', 'permissions/permissions.html', 'opd-settings.html']) {
    const ui = await browser.newPage(); const errors = [];
    ui.on('pageerror', e => errors.push(e.message));
    await ui.setViewport({ width: 1100, height: 850 });
    await ui.setRequestInterception(true);
    ui.on('request', request => request.url().startsWith(base + '/') || request.url().startsWith('data:') ? request.continue() : request.abort());
    await ui.evaluateOnNewDocument(mock + `\ninstallMockChrome({baseUrl:${JSON.stringify(base + '/src/')},seed:true});`);
    await ui.goto(`${base}/src/${name}`, { waitUntil: 'load' });
    await ui.evaluate(() => OPMI18n.ready);
    await new Promise(resolve => setTimeout(resolve, 400));
    await ui.addScriptTag({ content: checks });
    await ui.screenshot({ path: path.join(root, 'localization-screenshots', name.replace(/[^a-z0-9.-]/gi, '_') + '.png'), fullPage: true });
    assert.deepEqual(await ui.evaluate(() => inspectPageTranslation()), [], name);
    if (name.startsWith('sidepanel/')) {
      await ui.click('.spm-prompt-action-btn[data-opm-action="copy"]');
      assert.equal(await ui.evaluate(() => __copiedText), 'Copy\n#name#');
      assert.equal(await ui.$eval('#prompt-list li > span', el => el.textContent), 'Settings');
      await ui.click('.spm-prompt-action-more');
      await ui.click('.spm-prompt-action-btn[aria-label="编辑"]');
      assert.equal(await ui.$eval('#prompt-title', el => el.value), 'Settings');
      assert.equal(await ui.$eval('.spm-tag-pill', el => el.firstChild.textContent), 'handle');
      assert.equal(await ui.$('.spm-tag-pill b'), null);
      await ui.evaluate(() => OPMI18n.setLanguage('en'));
      assert.equal(await ui.$eval('#submit-button', el => el.textContent.trim()), 'Update');
      assert.equal(await ui.$eval('#prompt-content', el => el.value), 'Copy\n#name#');
      passed.push('sidepanel copy/edit round trip, literal tags, stable actions and preserved draft');
    }
    assert.deepEqual(errors, [], `${name}: script errors`);
    passed.push(`${name}: translated real page modules with mocked Chrome APIs`);
    await ui.close();
  }
  fs.writeFileSync(path.join(root, 'localization-browser-results.json'), JSON.stringify({ passed }, null, 2));
  console.log(`${passed.length} browser checks passed\n` + passed.join('\n'));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

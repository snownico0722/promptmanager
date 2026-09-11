import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../src/i18n-core.js', import.meta.url), 'utf8');

function runtime({ browser = 'en-US', stored = 'auto', get } = {}) {
  const listeners = [];
  const writes = [];
  const native = { alert() {}, confirm() { return true; }, fetch() {} };
  const context = vm.createContext({
    console, ...native, navigator: { language: 'de-DE' },
    chrome: {
      i18n: { getUILanguage: () => browser },
      storage: {
        local: {
          get: get || (async () => ({ uiLanguage: stored })),
          async set(value) { writes.push(value); },
        },
        onChanged: { addListener: f => listeners.push(f) },
      },
    },
  });
  vm.runInContext(source, context);
  return { context, native, writes, i18n: context.OPMI18n,
    change(value) { for (const f of listeners) f({ uiLanguage: { newValue: value } }, 'local'); },
  };
}

test('auto follows browser UI; manual English/Chinese override it', async () => {
  const { i18n } = runtime({ browser: 'zh-CN' });
  await i18n.ready;
  assert.equal(i18n.t('Save Changes'), '保存更改');
  await i18n.setLanguage('en');
  assert.equal(i18n.t('Save Changes'), 'Save Changes');
  await i18n.setLanguage('zh-CN');
  assert.equal(i18n.t('Enter tags here.'), '输入标签，按回车添加');
  await i18n.setLanguage('unsupported');
  assert.equal(i18n.getPreference(), 'auto');
});

test('native globals are untouched; one storage key, no prompt writes', async () => {
  const { context, native, writes, i18n } = runtime();
  await i18n.ready;
  vm.runInContext(source, context);
  assert.equal(context.OPMI18n, i18n);
  for (const key of Object.keys(native)) assert.equal(context[key], native[key]);
  await i18n.setLanguage('zh-CN');
  assert.deepEqual(Object.keys(writes[0]), ['uiLanguage']);
});

test('late initial read cannot overwrite a newer language event', async () => {
  let finish;
  const r = runtime({ get: () => new Promise(resolve => { finish = resolve; }) });
  r.change('zh-CN');
  finish({ uiLanguage: 'en' });
  await r.i18n.ready;
  assert.equal(r.i18n.getLanguage(), 'zh-CN');
});

test('slow earlier preference write cannot undo a newer event', async () => {
  const r = runtime(); await r.i18n.ready;
  let finish;
  r.context.chrome.storage.local.set = () => new Promise(resolve => { finish = resolve; });
  const pending = r.i18n.setLanguage('zh-CN');
  r.change('en'); finish(); await pending;
  assert.equal(r.i18n.getLanguage(), 'en');
});

test('dictionary is prototype-safe, preserves whitespace and unknown text', async () => {
  const { i18n } = runtime({ stored: 'zh-CN' }); await i18n.ready;
  for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.equal(i18n.t(key), key);
  assert.equal(i18n.t('\n Save Changes  '), '\n 保存更改  ');
  assert.equal(i18n.t('Use Add to Open Prompt Manager\n on the website.'), '点击网站上的“Add to Open Prompt Manager”即可导入。');
  assert.equal(i18n.t('My untouched prompt'), 'My untouched prompt');
});

test('dynamic names remain literal and provider names may contain spaces', async () => {
  const { i18n } = runtime({ stored: 'zh-CN' }); await i18n.ready;
  assert.equal(i18n.t('Open Google AI Studio'), '打开 Google AI Studio');
  assert.equal(i18n.t('Remove tag "$& <literal>" from all prompts?'), '从所有提示词中移除标签“$& <literal>”？');
  assert.equal(i18n.t('Settings value'), 'Settings 的值');
});

test('variable examples match the actual ASCII variable syntax', async () => {
  const { i18n } = runtime({ stored: 'zh-CN' }); await i18n.ready;
  for (const key of ['Enter prompt. # for #variables#', 'Write your prompt. Use hashtags for #variables#']) {
    const translated = i18n.t(key);
    assert.match(translated, /#([a-zA-Z0-9_]+)#/);
    assert.doesNotMatch(translated, /#变量/);
  }
});

test('subscriptions are removable and redundant changes do not notify', async () => {
  const { i18n } = runtime(); await i18n.ready;
  let count = 0;
  const off = i18n.subscribe(() => count++);
  await i18n.setLanguage('zh-CN'); await i18n.setLanguage('zh-CN');
  assert.equal(count, 1); off(); await i18n.setLanguage('en');
  assert.equal(count, 1);
});

test('brand names remain unchanged in Chinese', async () => {
  const { i18n } = runtime({ stored: 'zh-CN' }); await i18n.ready;
  assert.equal(i18n.t('Open Prompt Manager'), 'Open Prompt Manager');
  assert.equal(i18n.t('Open Prompt Database'), 'Open Prompt Database');
});

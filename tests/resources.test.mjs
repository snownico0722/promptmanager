import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? files(path.join(dir, f.name)) : [path.join(dir, f.name)]);
const exists = (base, ref) => {
  const file = path.resolve(base, ref.split(/[?#]/)[0]);
  assert.ok(file.startsWith(root) && fs.existsSync(file), `Missing resource: ${file}`);
};

test('all literal module imports and page scripts/styles exist', () => {
  for (const file of files(root).filter(f => /\.(?:js|html)$/.test(f))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [, ref] of source.matchAll(/(?:from\s+|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)) exists(path.dirname(file), ref);
    if (file.endsWith('.html')) {
      for (const [, ref] of source.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"#:]+)"/g)) exists(path.dirname(file), ref);
    }
  }
});

test('retired features have no executable entry, assets or DOM cleaner', () => {
  const source = files(root).filter(f => /\.(?:js|html|css|json)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(source, /OPD_CATALOG_URL|openpromptdatabase\.com|PanelView\.CHANGELOG|OPM_SIDE_PANEL_STATE|sidepanelFooter|localizedResource/);
  assert.ok(!fs.existsSync(path.join(root, 'sidepanel/styles.css')));
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'content.boot.js'), 'utf8'), /MutationObserver/);
});

test('only the worker store owns canonical writes; no array replacement API remains', () => {
  const client = fs.readFileSync(path.join(root, 'storage/promptStorage.js'), 'utf8');
  assert.match(client, /chrome\.runtime\.sendMessage/);
  assert.doesNotMatch(client, /chrome\.storage\.local\.set|setPrompts/);
  for (const name of ['manager-app.js', 'content.js', 'content.shared.js', 'settings.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /setPrompts|opmManager\w+V1/);
  }
});


test('settings destructive actions keep the workspace that was confirmed', () => {
  const source = fs.readFileSync(path.join(root, 'settings.js'), 'utf8');
  assert.match(source, /const workspaceId = snapshot\.activeWorkspaceId;[\s\S]*clearWorkspacePrompts\(workspaceId\)/);
  assert.match(source, /const workspaceId = snapshot\.activeWorkspaceId;[\s\S]*removeTagFromPrompts\(tag, workspaceId\)/);
});

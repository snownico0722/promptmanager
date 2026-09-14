import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoreService, migrateStorage } from '../../src/storage/storeService.js';

function setup(initial = {}) {
  const data = structuredClone(initial);
  let writes = 0, fail = false;
  const adapter = {
    async get(keys) { await Promise.resolve(); return structuredClone(Object.fromEntries(keys.filter(k => k in data).map(k => [k, data[k]]))); },
    async set(values) { if (fail) throw new Error('Disk full'); writes++; Object.assign(data, structuredClone(values)); },
    async remove(keys) { for (const k of keys) delete data[k]; },
  };
  const service = createStoreService(adapter);
  return { data, run: service.dispatch, get writes() { return writes; }, fail(value) { fail = value; } };
}
const prompt = (title, extra = {}) => ({ title, content: `  ${title}\n\n`, ...extra });
const seed = () => ({
  prompts_storage: { version: 2, prompts: [{ uuid: 'p', ...prompt('Legacy'), folderId: 'f', tags: [' A ', 'a'], opdPublicId: 'obsolete' }], folders: [{ id: 'f', name: 'Folder' }] },
  prompts: [{ uuid: 'old-mirror', ...prompt('Mirror') }],
  opmManagerWorkspacesV1: [{ id: 'workspace-default', name: 'Default' }, { id: 'b', name: 'Project B' }],
  opmManagerActiveWorkspaceV1: 'b', opmManagerPromptWorkspacesV1: { p: 'b' }, opmManagerFolderWorkspacesV1: { f: 'b' },
});

test('legacy migration preserves workspace/folder/IDs/text; retires mirror and metadata only after success', async () => {
  const r = setup(seed()); const s = await r.run('snapshot');
  assert.equal(s.version, 3); assert.equal(s.activeWorkspaceId, 'b');
  assert.equal(s.prompts[0].workspaceId, 'b'); assert.equal(s.folders[0].workspaceId, 'b');
  assert.equal(s.prompts[0].folderId, 'f'); assert.equal(s.prompts[0].content, '  Legacy\n\n');
  assert.deepEqual(s.prompts[0].tags, ['a']); assert.ok(!('opdPublicId' in s.prompts[0]));
  assert.ok(!('prompts' in r.data)); assert.ok(!('opmManagerWorkspacesV1' in r.data));
  const writes = r.writes; await r.run('snapshot'); await r.run('prompts'); assert.equal(r.writes, writes);
});

test('failed migration leaves original data untouched', async () => {
  const original = seed(); const r = setup(original); r.fail(true);
  await assert.rejects(r.run('snapshot'), /Disk full/); assert.deepEqual(r.data, original);
  r.fail(false); assert.equal((await r.run('snapshot')).version, 3);
});

test('unknown future version is not downgraded or overwritten', async () => {
  const r = setup({ prompts_storage: { version: 4 } });
  await assert.rejects(r.run('snapshot'), /newer extension/); assert.equal(r.writes, 0);
});

test('bare array and deleted-default migrations choose an existing workspace', () => {
  const s = migrateStorage({ prompts: [{ uuid: 'a', ...prompt('A') }] });
  assert.equal(s.prompts[0].workspaceId, s.activeWorkspaceId);
  const input = seed(); input.opmManagerWorkspacesV1 = [{ id: 'b', name: 'B' }]; delete input.opmManagerPromptWorkspacesV1;
  const other = migrateStorage(input); assert.equal(other.prompts[0].workspaceId, 'b');
});

test('many simultaneous saves are serialized without losing entries', async () => {
  const r = setup(); await Promise.all(Array.from({ length: 30 }, (_, i) => r.run('savePrompt', prompt(String(i)))));
  const all = await r.run('prompts'); assert.equal(all.length, 30); assert.equal(new Set(all.map(p => p.uuid)).size, 30);
});

test('simultaneous edits to different prompts both survive', async () => {
  const r = setup();
  const a = (await r.run('savePrompt', prompt('A'))).prompt, b = (await r.run('savePrompt', prompt('B'))).prompt;
  await Promise.all([r.run('updatePrompt', { uuid: a.uuid, partial: { title: 'AA' } }), r.run('updatePrompt', { uuid: b.uuid, partial: { title: 'BB' } })]);
  assert.deepEqual((await r.run('prompts')).map(p => p.title), ['AA', 'BB']);
});

test('failed writes reject, preserve the library and do not poison the queue', async () => {
  const r = setup(); await r.run('snapshot'); r.fail(true);
  await assert.rejects(r.run('savePrompt', prompt('A')), /Disk full/);
  r.fail(false); await r.run('savePrompt', prompt('B')); assert.deepEqual((await r.run('prompts')).map(p => p.title), ['B']);
});

test('one save writes content and workspace/folder ownership together', async () => {
  const r = setup(); const w = await r.run('saveWorkspace', { name: 'B' });
  const f = await r.run('saveFolder', { name: 'F', workspaceId: w.id }); const writes = r.writes;
  const { prompt: p } = await r.run('savePrompt', prompt('B', { workspaceId: w.id, folderId: f.id }));
  assert.equal(r.writes, writes + 1); assert.equal(p.workspaceId, w.id); assert.equal(p.folderId, f.id);
  await r.run('switchWorkspace', { id: 'workspace-default' }); assert.equal((await r.run('prompts')).length, 0);
  assert.equal((await r.run('prompts', { allWorkspaces: true })).length, 1);
});

test('foreign folder assignment fails rather than creating a cross-workspace relation', async () => {
  const r = setup(); const f = await r.run('saveFolder', { name: 'F' }); await r.run('saveWorkspace', { name: 'B' });
  await assert.rejects(r.run('savePrompt', prompt('B', { folderId: f.id })), /does not belong/);
  assert.equal((await r.run('prompts', { allWorkspaces: true })).length, 0);
});

test('folder deletion detaches prompts; workspace deletion moves content without data loss', async () => {
  const r = setup(); const w = await r.run('saveWorkspace', { name: 'B' }); const f = await r.run('saveFolder', { name: 'F' });
  const p = (await r.run('savePrompt', prompt('A', { folderId: f.id }))).prompt;
  await r.run('deleteFolder', { id: f.id }); assert.equal((await r.run('prompts'))[0].folderId, null);
  await r.run('deleteWorkspace', { id: w.id }); const all = await r.run('prompts');
  assert.equal(all[0].uuid, p.uuid); assert.equal(all[0].workspaceId, 'workspace-default');
  await assert.rejects(r.run('deleteWorkspace', { id: 'workspace-default' }), /At least one/);
});

test('reordering only IDs preserves concurrent new prompts, edits and other workspaces', async () => {
  const r = setup(); const a = (await r.run('savePrompt', prompt('A'))).prompt; const b = (await r.run('savePrompt', prompt('B'))).prompt;
  const w = await r.run('saveWorkspace', { name: 'Other' }); await r.run('savePrompt', prompt('Other'));
  await r.run('updatePrompt', { uuid: a.uuid, partial: { content: 'New content' } });
  await r.run('savePrompt', prompt('C', { workspaceId: 'workspace-default' }));
  await r.run('reorderPrompts', { ids: [b.uuid, a.uuid], workspaceId: 'workspace-default' });
  const all = await r.run('prompts', { workspaceId: 'workspace-default' });
  assert.deepEqual(all.map(p => p.title), ['B', 'A', 'C']); assert.equal(all[1].content, 'New content');
  assert.equal((await r.run('prompts', { workspaceId: w.id }))[0].title, 'Other');
});

test('backup/restore retains workspaces, ownership, folder, tags and selection on a clean profile', async () => {
  const r = setup(seed()); const exported = await r.run('export');
  const restored = setup(); await restored.run('import', { payload: exported });
  const actual = await restored.run('export');
  assert.deepEqual(actual.workspaces, exported.workspaces); assert.equal(actual.activeWorkspaceId, 'b');
  assert.deepEqual(actual.prompts, exported.prompts); assert.deepEqual(actual.folders, exported.folders);
});

test('v1/v2 imports target the current workspace and preserve other workspaces', async () => {
  const r = setup(); await r.run('savePrompt', prompt('Existing')); const w = await r.run('saveWorkspace', { name: 'B' });
  await r.run('import', { payload: [{ uuid: 'new', ...prompt('Array') }] });
  await r.run('import', { payload: { version: 2, prompts: [{ uuid: 'new2', ...prompt('V2'), folderId: 'f' }], folders: [{ id: 'f', name: 'F' }] } });
  const p = await r.run('prompts'); assert.equal(p.length, 2); assert.ok(p.every(p => p.workspaceId === w.id));
  assert.equal((await r.run('prompts', { workspaceId: 'workspace-default' })).length, 1);
});

test('malformed import fails atomically; cannot partially add folders', async () => {
  const r = setup(seed()); const before = await r.run('snapshot');
  await assert.rejects(r.run('import', { payload: { version: 2, prompts: [null], folders: [{ id: 'q', name: 'F' }] } }), /Invalid/);
  await assert.rejects(r.run('import', { payload: {} }), /Invalid backup/);
  assert.deepEqual(await r.run('snapshot'), before);
});

test('delete-all and remove-tag affect only the selected workspace', async () => {
  const r = setup(); await r.run('savePrompt', prompt('A', { tags: ['t'] }));
  await r.run('saveWorkspace', { name: 'B' }); await r.run('savePrompt', prompt('B', { tags: ['t'] }));
  await r.run('removeTag', { tag: 't' }); assert.deepEqual((await r.run('prompts'))[0].tags, []);
  await r.run('deleteAllPrompts'); assert.equal((await r.run('prompts')).length, 0);
  assert.deepEqual((await r.run('prompts', { allWorkspaces: true }))[0].tags, ['t']);
});


test('explicit destructive workspace IDs do not follow a later active-workspace switch', async () => {
  const r = setup();
  await r.run('savePrompt', prompt('A', { uuid: 'a' }));
  const b = await r.run('saveWorkspace', { name: 'B' });
  await r.run('savePrompt', prompt('B', { uuid: 'b', workspaceId: b.id }));
  const confirmedWorkspace = 'workspace-default';
  await r.run('switchWorkspace', { id: b.id });
  await r.run('deleteAllPrompts', { workspaceId: confirmedWorkspace });
  assert.equal((await r.run('prompts', { workspaceId: confirmedWorkspace })).length, 0);
  assert.deepEqual((await r.run('prompts', { workspaceId: b.id })).map(p => p.title), ['B']);
});

test('newer imported folder metadata updates an existing folder', async () => {
  const r = setup();
  const folder = await r.run('saveFolder', { id: 'folder-shared', name: 'Old name' });
  const backup = await r.run('export');
  const importedFolder = backup.folders.find(f => f.id === folder.id);
  importedFolder.name = 'New name';
  importedFolder.updatedAt = '2099-01-01T00:00:00.000Z';
  await r.run('import', { payload: backup });
  assert.equal((await r.run('folders'))[0].name, 'New name');
});

test('reimporting a legacy backup into another workspace reuses stable collision IDs', async () => {
  const r = setup();
  await r.run('saveFolder', { id: 'shared-folder', name: 'Default folder' });
  await r.run('savePrompt', prompt('Default prompt', { uuid: 'shared-prompt', folderId: 'shared-folder' }));
  const b = await r.run('saveWorkspace', { name: 'B' });
  const legacy = {
    version: 2,
    folders: [{ id: 'shared-folder', name: 'Imported folder', createdAt: '2025-01-01T00:00:00.000Z' }],
    prompts: [{ uuid: 'shared-prompt', ...prompt('Imported prompt'), folderId: 'shared-folder', createdAt: '2025-01-01T00:00:00.000Z' }],
  };
  await r.run('import', { payload: legacy });
  const firstPrompts = await r.run('prompts', { workspaceId: b.id });
  const firstFolders = await r.run('folders', { workspaceId: b.id });
  assert.equal(firstPrompts.length, 1); assert.equal(firstFolders.length, 1);
  assert.equal(firstPrompts[0].folderId, firstFolders[0].id);
  await r.run('import', { payload: legacy });
  const secondPrompts = await r.run('prompts', { workspaceId: b.id });
  const secondFolders = await r.run('folders', { workspaceId: b.id });
  assert.equal(secondPrompts.length, 1); assert.equal(secondFolders.length, 1);
  assert.equal(secondPrompts[0].uuid, firstPrompts[0].uuid);
  assert.equal(secondFolders[0].id, firstFolders[0].id);
  assert.equal((await r.run('prompts', { workspaceId: 'workspace-default' }))[0].title, 'Default prompt');
});

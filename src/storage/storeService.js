// The service worker is the only writer. Every operation reads the latest store
// inside one queue; views never send an old complete array back to storage.
import { generateUUID } from '../utils.js';
import { uniqueNormalizedTags, normalizeTag } from '../utils/tags.js';

export const STORAGE_KEY = 'prompts_storage';
export const VERSION = 3;
export const DEFAULT_WORKSPACE_ID = 'workspace-default';
const LEGACY_KEYS = [
  'prompts', 'opmManagerWorkspacesV1', 'opmManagerActiveWorkspaceV1',
  'opmManagerPromptWorkspacesV1', 'opmManagerFolderWorkspacesV1',
];
const now = () => new Date().toISOString();
const id = value => typeof value === 'string' && value ? value : generateUUID();
const name = value => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A name is required');
  return value.trim();
};
const list = (value, label) => {
  if (!Array.isArray(value) || value.some(x => !x || typeof x !== 'object' || Array.isArray(x))) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
};
const assertUnique = (items, key) => {
  if (new Set(items.map(x => x[key])).size !== items.length) throw new Error(`Duplicate ${key}`);
};

// Pure migration: no writes until the complete legacy payload has been read and
// normalized. Unknown future versions fail closed instead of being downgraded.
export function migrateStorage(data) {
  const raw = data[STORAGE_KEY];
  if (raw?.version > VERSION) throw new Error('This library needs a newer extension');
  if (raw?.version === VERSION) {
    list(raw.workspaces, 'workspaces'); list(raw.prompts, 'prompts'); list(raw.folders, 'folders');
    if (!raw.workspaces.some(w => w.id === raw.activeWorkspaceId)) throw new Error('Invalid active workspace');
    return structuredClone(raw);
  }
  const prompts = raw ? list(raw.prompts, 'prompts') : list(data.prompts ?? [], 'prompts');
  const folders = list(raw?.folders ?? [], 'folders');
  const oldWorkspaces = list(data.opmManagerWorkspacesV1 ?? [], 'workspaces');
  const workspaces = oldWorkspaces.length
    ? oldWorkspaces.map(w => ({ id: id(w.id), name: name(w.name) }))
    : [{ id: DEFAULT_WORKSPACE_ID, name: 'Default' }];
  assertUnique(workspaces, 'id');
  const valid = new Set(workspaces.map(w => w.id));
  const fallback = valid.has(DEFAULT_WORKSPACE_ID) ? DEFAULT_WORKSPACE_ID : workspaces[0].id;
  const resolveWorkspace = candidate => valid.has(candidate) ? candidate : fallback;
  const normalizedFolders = folders.map(f => ({
    id: id(f.id), name: typeof f.name === 'string' ? f.name : '',
    workspaceId: resolveWorkspace(data.opmManagerFolderWorkspacesV1?.[f.id]),
    parentId: typeof f.parentId === 'string' ? f.parentId : null,
    createdAt: f.createdAt || now(), ...(f.updatedAt ? { updatedAt: f.updatedAt } : {}),
  }));
  const normalizedPrompts = prompts.map(p => {
    const uuid = id(p.uuid || p.id);
    const folder = normalizedFolders.find(f => f.id === p.folderId);
    const workspaceId = resolveWorkspace(data.opmManagerPromptWorkspacesV1?.[uuid] || folder?.workspaceId);
    return {
      uuid, title: typeof p.title === 'string' ? p.title : '',
      content: typeof p.content === 'string' ? p.content : '',
      tags: uniqueNormalizedTags(p.tags), workspaceId,
      folderId: folder?.workspaceId === workspaceId ? folder.id : null,
      createdAt: p.createdAt || now(), ...(p.updatedAt ? { updatedAt: p.updatedAt } : {}),
    };
  });
  assertUnique(normalizedFolders, 'id'); assertUnique(normalizedPrompts, 'uuid');
  for (const f of normalizedFolders) {
    if (!normalizedFolders.some(parent => parent.id === f.parentId && parent.workspaceId === f.workspaceId && parent.id !== f.id)) f.parentId = null;
  }
  return {
    version: VERSION, revision: 0, workspaces,
    activeWorkspaceId: resolveWorkspace(data.opmManagerActiveWorkspaceV1),
    prompts: normalizedPrompts, folders: normalizedFolders,
  };
}

function workspaceId(store, requested) {
  const value = requested ?? store.activeWorkspaceId;
  if (!store.workspaces.some(w => w.id === value)) throw new Error('Workspace no longer exists');
  return value;
}
function folderId(store, requested, workspace) {
  if (!requested) return null;
  if (!store.folders.some(f => f.id === requested && f.workspaceId === workspace)) {
    throw new Error('Folder does not belong to this workspace');
  }
  return requested;
}
function promptFields(data) {
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.content !== 'string' || !data.content.trim()) {
    throw new Error('Title and content are required');
  }
  return { title: data.title.trim(), content: data.content, tags: uniqueNormalizedTags(data.tags) };
}
function findPrompt(store, uuid) {
  const p = store.prompts.find(p => p.uuid === uuid);
  if (!p) throw new Error('Prompt no longer exists');
  return p;
}

const modifiedTime = item => {
  const value = Date.parse(item?.updatedAt || item?.createdAt || '');
  return Number.isFinite(value) ? value : 0;
};

function importedCollisionId(kind, workspace, sourceId) {
  return `__opm_import__${kind}__${encodeURIComponent(workspace)}__${encodeURIComponent(sourceId)}`;
}

function resolveImportedId(items, key, sourceId, workspace, kind) {
  const existing = items.find(item => item[key] === sourceId);
  if (!existing || existing.workspaceId === workspace) return sourceId;
  const stable = importedCollisionId(kind, workspace, sourceId);
  const stableExisting = items.find(item => item[key] === stable);
  if (!stableExisting || stableExisting.workspaceId === workspace) return stable;
  throw new Error(`Import ${kind} ID collision`);
}

function importInto(store, payload) {
  const legacy = Array.isArray(payload) || payload?.version !== VERSION;
  if (!Array.isArray(payload) && (!payload || typeof payload !== 'object' || !Array.isArray(payload.prompts))) throw new Error('Invalid backup');
  if (payload.version > VERSION) throw new Error('This backup needs a newer extension');
  const rawPrompts = list(Array.isArray(payload) ? payload : payload.prompts, 'prompts');
  const rawFolders = list(payload.folders ?? [], 'folders');
  const wasEmpty = !store.prompts.length && !store.folders.length && store.workspaces.length === 1 && store.workspaces[0].id === DEFAULT_WORKSPACE_ID;
  const target = store.activeWorkspaceId;
  if (!legacy) {
    const importedWorkspaces = list(payload.workspaces, 'workspaces');
    if (!importedWorkspaces.length) throw new Error('Backup contains no workspaces');
    assertUnique(importedWorkspaces, 'id');
    for (const w of importedWorkspaces) {
      if (typeof w.id !== 'string' || !w.id) throw new Error('Invalid workspace ID');
      name(w.name);
      const existing = store.workspaces.find(x => x.id === w.id);
      if (!existing) store.workspaces.push({ id: w.id, name: w.name });
      else if (wasEmpty) existing.name = w.name;
    }
    const importedIds = new Set(importedWorkspaces.map(w => w.id));
    if ([...rawPrompts, ...rawFolders].some(x => !importedIds.has(x.workspaceId))) throw new Error('Backup has an invalid workspace reference');
  }
  const folderMap = new Map();
  const importedFolders = rawFolders.map(f => {
    const workspace = legacy ? target : workspaceId(store, f.workspaceId);
    const sourceId = id(f.id);
    const nextId = resolveImportedId(store.folders, 'id', sourceId, workspace, 'folder');
    folderMap.set(f.id, nextId);
    return { id: nextId, name: name(f.name), workspaceId: workspace, parentId: f.parentId || null, createdAt: f.createdAt || now(), ...(f.updatedAt ? { updatedAt: f.updatedAt } : {}) };
  });
  assertUnique(importedFolders, 'id');
  for (const f of importedFolders) {
    f.parentId = folderMap.get(f.parentId) || null;
    const parent = importedFolders.find(x => x.id === f.parentId && x.workspaceId === f.workspaceId && x.id !== f.id);
    if (!parent) f.parentId = null;
    const existing = store.folders.find(x => x.id === f.id);
    if (!existing) store.folders.push(f);
    else if (wasEmpty || modifiedTime(f) > modifiedTime(existing)) Object.assign(existing, f);
  }
  const incoming = rawPrompts.map(p => {
    const workspace = legacy ? target : workspaceId(store, p.workspaceId);
    const sourceUuid = id(p.uuid || p.id);
    const uuid = resolveImportedId(store.prompts, 'uuid', sourceUuid, workspace, 'prompt');
    const mappedFolder = folderMap.get(p.folderId) || p.folderId;
    return {
      uuid, ...promptFields(p), workspaceId: workspace,
      folderId: store.folders.some(f => f.id === mappedFolder && f.workspaceId === workspace) ? mappedFolder : null,
      createdAt: p.createdAt || now(), ...(p.updatedAt ? { updatedAt: p.updatedAt } : {}),
    };
  });
  assertUnique(incoming, 'uuid');
  for (const p of incoming) {
    const index = store.prompts.findIndex(x => x.uuid === p.uuid);
    if (index < 0) store.prompts.push(p);
    else {
      const existing = store.prompts[index];
      if (new Date(p.updatedAt || p.createdAt) > new Date(existing.updatedAt || existing.createdAt)) store.prompts[index] = p;
    }
  }
  if (!legacy && wasEmpty) {
    // A restore into a clean profile restores the exported selection as well.
    const usedDefault = payload.workspaces.some(w => w.id === DEFAULT_WORKSPACE_ID);
    if (!usedDefault) store.workspaces = store.workspaces.filter(w => w.id !== DEFAULT_WORKSPACE_ID);
    store.activeWorkspaceId = workspaceId(store, payload.activeWorkspaceId || payload.workspaces[0].id);
  }
  const meta = payload.meta || {};
  const settings = {};
  if (Array.isArray(meta.tagsOrder)) settings.tagsOrder = uniqueNormalizedTags(meta.tagsOrder);
  if (typeof meta.enableTags === 'boolean') settings.enableTags = meta.enableTags;
  if (typeof meta.activeTagFilter === 'string') settings.activeTagFilter = meta.activeTagFilter;
  return { result: store.prompts.filter(p => p.workspaceId === store.activeWorkspaceId), settings };
}

// The storage adapter is injected to make migration, write failures and concurrent
// writes testable without Chrome. There is no second writer in extension pages.
export function createStoreService(storage) {
  let tail = Promise.resolve();
  const run = async (action, data = {}) => {
    const raw = await storage.get([STORAGE_KEY, ...LEGACY_KEYS, 'tagsOrder', 'activeTagFilter', 'enableTags']);
    const store = migrateStorage(raw);
    if (raw[STORAGE_KEY]?.version !== VERSION) {
      await storage.set({ [STORAGE_KEY]: store });
      await storage.remove(LEGACY_KEYS);
    }
    const original = JSON.stringify(store);
    let result, settings = {};
    switch (action) {
    case 'snapshot': return store;
    case 'prompts': return store.prompts.filter(p => data.allWorkspaces || p.workspaceId === workspaceId(store, data.workspaceId));
    case 'folders': return store.folders.filter(f => data.allWorkspaces || f.workspaceId === workspaceId(store, data.workspaceId));
    case 'export': return { ...store, meta: { tagsOrder: uniqueNormalizedTags(raw.tagsOrder), activeTagFilter: raw.activeTagFilter || 'all', enableTags: raw.enableTags !== false } };
    case 'savePrompt': {
      const workspace = workspaceId(store, data.workspaceId);
      const uuid = id(data.uuid);
      if (store.prompts.some(p => p.uuid === uuid)) throw new Error('Prompt already exists');
      const prompt = { uuid, ...promptFields(data), workspaceId: workspace, folderId: folderId(store, data.folderId, workspace), createdAt: now() };
      store.prompts.push(prompt); result = { success: true, prompt }; break;
    }
    case 'updatePrompt': {
      const prompt = findPrompt(store, data.uuid);
      const patch = data.partial || {};
      const workspace = workspaceId(store, prompt.workspaceId);
      Object.assign(prompt, promptFields({ ...prompt, ...patch }), {
        folderId: folderId(store, patch.folderId === undefined ? prompt.folderId : patch.folderId, workspace), updatedAt: now(),
      });
      result = prompt; break;
    }
    case 'deletePrompt': store.prompts = store.prompts.filter(p => p.uuid !== data.uuid); result = true; break;
    case 'deleteAllPrompts': {
      const workspace = workspaceId(store, data.workspaceId);
      store.prompts = store.prompts.filter(p => p.workspaceId !== workspace); result = true; break;
    }
    case 'reorderPrompts': {
      const workspace = workspaceId(store, data.workspaceId);
      const current = store.prompts.filter(p => p.workspaceId === workspace);
      const byId = new Map(current.map(p => [p.uuid, p]));
      const ordered = [...new Set(data.ids)].filter(uuid => byId.has(uuid));
      ordered.push(...current.filter(p => !ordered.includes(p.uuid)).map(p => p.uuid));
      let index = 0;
      store.prompts = store.prompts.map(p => p.workspaceId === workspace ? byId.get(ordered[index++]) : p);
      result = true; break;
    }
    case 'removeTag': {
      const workspace = workspaceId(store, data.workspaceId);
      const tag = normalizeTag(data.tag);
      store.prompts = store.prompts.map(p => p.workspaceId === workspace && p.tags.includes(tag) ? { ...p, tags: p.tags.filter(t => t !== tag), updatedAt: now() } : p);
      result = store.prompts.filter(p => p.workspaceId === workspace); break;
    }
    case 'saveFolder': {
      const workspace = workspaceId(store, data.workspaceId);
      const folder = { id: id(data.id), name: name(data.name), workspaceId: workspace, parentId: folderId(store, data.parentId, workspace), createdAt: now() };
      if (store.folders.some(f => f.id === folder.id)) throw new Error('Folder already exists');
      store.folders.push(folder); result = folder; break;
    }
    case 'updateFolder': {
      const folder = store.folders.find(f => f.id === data.id);
      if (!folder) throw new Error('Folder no longer exists');
      folder.name = name(data.partial.name); folder.updatedAt = now(); result = folder; break;
    }
    case 'deleteFolder':
      store.folders = store.folders.filter(f => f.id !== data.id).map(f => f.parentId === data.id ? { ...f, parentId: null } : f);
      store.prompts = store.prompts.map(p => p.folderId === data.id ? { ...p, folderId: null, updatedAt: now() } : p);
      result = true; break;
    case 'saveWorkspace': {
      const workspace = { id: generateUUID(), name: name(data.name) };
      store.workspaces.push(workspace); store.activeWorkspaceId = workspace.id;
      settings.activeTagFilter = 'all'; result = workspace; break;
    }
    case 'renameWorkspace': {
      const workspace = store.workspaces.find(w => w.id === data.id);
      if (!workspace) throw new Error('Workspace no longer exists');
      workspace.name = name(data.name); result = workspace; break;
    }
    case 'switchWorkspace': store.activeWorkspaceId = workspaceId(store, data.id); settings.activeTagFilter = 'all'; result = true; break;
    case 'deleteWorkspace': {
      if (store.workspaces.length < 2) throw new Error('At least one workspace must remain');
      workspaceId(store, data.id);
      const target = store.workspaces.find(w => w.id !== data.id).id;
      store.workspaces = store.workspaces.filter(w => w.id !== data.id);
      for (const item of [...store.prompts, ...store.folders]) if (item.workspaceId === data.id) item.workspaceId = target;
      if (store.activeWorkspaceId === data.id) { store.activeWorkspaceId = target; settings.activeTagFilter = 'all'; }
      result = true; break;
    }
    case 'import': ({ result, settings } = importInto(store, data.payload)); break;
    default: throw new Error('Unknown storage operation');
    }
    if (original !== JSON.stringify(store) || Object.keys(settings).length) {
      store.revision += 1;
      await storage.set({ [STORAGE_KEY]: store, ...settings });
    }
    return result;
  };
  return {
    dispatch(action, data) {
      const task = tail.then(() => run(action, data));
      tail = task.catch(() => {}); // A rejected write must not poison the queue.
      return task;
    },
  };
}

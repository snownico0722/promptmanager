# Library V3

`src/storage/storeWorker.js` installs the single library writer in the service
worker. Manager, settings and content pages use `promptStorage.js`; this client
sends named operations, not replacement arrays. `storeService.js` serializes each
operation, rereads the latest store and writes one complete canonical value.
Failures reject the caller and do not block subsequent operations.

The canonical `prompts_storage` object contains `version`, `revision`,
`workspaces`, `activeWorkspaceId`, `prompts` and `folders`. Each prompt/folder has
its own `workspaceId`; each prompt also has a nullable `folderId`. A folder cannot
be assigned to a prompt from another workspace.

V1/V2 records and the previous four manager-specific workspace mappings are read
once. Migration keeps record IDs, text, timestamps and valid relationships, writes
V3 successfully, then retires the duplicate legacy values. It no longer preserves
obsolete community-publication metadata or continuously mirrors the prompt array.
Unknown newer schema versions are refused without overwriting them.

Workspace switching is a shared choice for this browser profile. All open manager
pages, in-page lists and context menus follow it. Settings prompt/tag deletion is
workspace-scoped; exporting always includes the complete library. Deleting a
folder detaches its prompts. Deleting a workspace moves its prompts and folders
to a remaining workspace; the last workspace cannot be deleted.

V3 backups retain workspaces, selection and relationships. On a clean profile,
import restores the selection. When merging into an existing library, existing
workspace selection is kept, conflicting cross-workspace record IDs are remapped,
and legacy backups target the active workspace. Invalid imports fail before any
part of that import is written.

Two queued edits to different records are both retained. Two editors saving the
same field of the same record still use the later save; this change does not add a
collaborative merge engine. Prompt drafts are not automatically saved.

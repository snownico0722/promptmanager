/**
 * Compatibility shims for legacy manager imports.
 *
 * Community/Open Prompt Database support is intentionally removed. None of these
 * functions request permissions, inject scripts, or contact a remote catalog.
 */
export const OPD_CATALOG_ORIGINS = Object.freeze([]);

export function isOpdCatalogUrl() {
  return false;
}

export function isAllowedOpdMessageOrigin() {
  return false;
}

export async function grantedOpdCatalogOrigins() {
  return [];
}

export async function hasOpdCatalogPermission() {
  return false;
}

export async function requestOpdCatalogPermission() {
  return false;
}

export async function registerOpdBridgeContentScript() {
  // Removed feature: no-op.
}

export async function unregisterOpdBridgeContentScript() {
  // Removed feature: no-op.
}

export async function ensureOpdBridgeForTab() {
  return false;
}

export async function syncOpdCatalogAccess() {
  // Removed feature: no-op.
}

export function initOpdCatalogAccess() {
  // Removed feature: no-op.
}

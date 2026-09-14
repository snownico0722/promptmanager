/**
 * Compatibility constants for legacy manager code.
 *
 * Open Prompt Database/community support has been removed from the extension.
 * These identifiers remain temporarily so the legacy full-page manager module can
 * load without carrying any catalog endpoint or permission capability.
 */
export const OPD_CATALOG_URL = 'about:blank';

export const OPD_MSG = Object.freeze({
  PUBLISH_STATUS: 'OPD_PUBLISH_STATUS',
  PUBLISH_ENABLE: 'OPD_PUBLISH_ENABLE',
  HANDLE_AVAILABLE: 'OPD_HANDLE_AVAILABLE',
  PUBLISH_REGISTER: 'OPD_PUBLISH_REGISTER',
  PUBLISH_PROMPT: 'OPD_PUBLISH_PROMPT',
  PUBLISH_DELETE: 'OPD_PUBLISH_DELETE',
});

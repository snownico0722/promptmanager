/**
 * Shared info-banner compatibility module.
 *
 * The community catalog feature has been removed, so the old OPD banner must
 * never surface in either the manager or the in-page prompt list.
 */

/** @type {{ active: boolean, id: string, storageKey: string }} */
export const OPM_INFO_BANNER = {
  active: false,
  id: 'info-banner-disabled',
  storageKey: 'dismissedBanners',
};

/** @returns {string} */
export function buildInfoBannerHtml() {
  return '';
}

/**
 * Retained as a no-op so older callers can be removed independently without
 * breaking the full-page manager during the transition.
 */
export async function mountSidepanelInfoBanner() {
  // Intentionally empty.
}

// DOM adapter. Call attachRoot when creating extension UI; never observe a host page.
(() => {
  'use strict';
  const i18n = globalThis.OPMI18n;
  if (!i18n || i18n.attachRoot || typeof document === 'undefined') return;

  const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];
  const SKIP = '[data-opm-user-content], [data-opm-i18n-skip], [translate="no"], script, style, noscript, [contenteditable]:not([contenteditable="false"])';
  const roots = new Map();
  const textState = new WeakMap();
  const attributeState = new WeakMap();
  const boundControls = new WeakSet();
  const extensionDocument = (() => {
    try { return location.origin === new URL(chrome.runtime.getURL('')).origin; }
    catch (_) { return false; }
  })();

  function isSkipped(element) {
    return !!element?.closest(SKIP);
  }

  function translateText(node) {
    if (!node.parentElement || isSkipped(node.parentElement) || node.parentElement.closest('textarea')) return;
    const current = node.nodeValue;
    let state = textState.get(node);
    // Preserve the source when repeated observer records see our own output.
    if (!state || current !== state.rendered) state = { source: current, rendered: current };
    const next = i18n.t(state.source);
    state.rendered = next;
    textState.set(node, state);
    if (next !== current) node.nodeValue = next;
  }

  function translateAttribute(element, name) {
    if (isSkipped(element)) return;
    let states = attributeState.get(element);
    if (!states) { states = new Map(); attributeState.set(element, states); }
    if (!element.hasAttribute(name)) { states.delete(name); return; }
    const current = element.getAttribute(name);
    let state = states.get(name);
    if (!state || current !== state.rendered) state = { source: current, rendered: current };
    const next = i18n.t(state.source);
    state.rendered = next;
    states.set(name, state);
    if (next !== current) element.setAttribute(name, next);
  }

  function applySubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) { translateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || isSkipped(root)) return;
    const visit = node => {
      if (node.nodeType === Node.TEXT_NODE) translateText(node);
      else for (const attribute of ATTRIBUTES) translateAttribute(node, attribute);
    };
    visit(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeType === Node.ELEMENT_NODE && isSkipped(node)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) visit(walker.currentNode);
  }

  function detachRoot(root) {
    roots.get(root)?.disconnect();
    roots.delete(root);
  }

  function syncControl() {
    if (!extensionDocument) return;
    const control = document.getElementById('ui-language-select');
    if (!control) return;
    control.value = i18n.getPreference();
    if (boundControls.has(control)) return;
    boundControls.add(control);
    control.addEventListener('change', async () => {
      try { await i18n.setLanguage(control.value); }
      catch (error) {
        control.value = i18n.getPreference();
        i18n.alert('Could not save language preference.');
        console.error('[OPM i18n]', error);
      }
    });
  }

  function attachRoot(root) {
    if (!root || roots.has(root)) return;
    if (!(extensionDocument && root === document.documentElement)
      && !['opm-root', 'opm-pin-picker-root', 'opm-pin-toast'].includes(root.id)) return;
    for (const existing of roots.keys()) if (!existing.isConnected) detachRoot(existing);
    root.lang = i18n.getLanguage();
    applySubtree(root);
    const observer = new MutationObserver(mutations => {
      if (!root.isConnected) { detachRoot(root); return; }
      observer.disconnect();
      try {
        // Attribute sources are independent; ignore removed or moved-out nodes.
        for (const mutation of mutations) {
          if (!root.contains(mutation.target)) continue;
          if (mutation.type === 'attributes') translateAttribute(mutation.target, mutation.attributeName);
          else if (mutation.type === 'characterData') translateText(mutation.target);
          else for (const node of mutation.addedNodes) if (root.contains(node)) applySubtree(node);
        }
      } finally { observer.observe(root, options); }
    });
    const options = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES };
    roots.set(root, observer);
    observer.observe(root, options);
  }

  function apply() {
    for (const [root, observer] of roots) {
      if (!root.isConnected) { detachRoot(root); continue; }
      observer.disconnect();
      root.lang = i18n.getLanguage();
      applySubtree(root);
      observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
    }
    syncControl();
  }

  Object.assign(i18n, { attachRoot, detachRoot, apply });
  i18n.subscribe(apply);
  i18n.ready.then(() => {
    if (!extensionDocument) { apply(); return; }
    const start = () => { attachRoot(document.documentElement); apply(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  });
})();

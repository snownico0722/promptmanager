from pathlib import Path
import re, json
R = Path('.')
def edit(path, old, new, count=None):
    p=R/path; s=p.read_text(); actual=s.count(old)
    if not actual or (count is not None and actual!=count): raise ValueError((path,old[:100],actual,count))
    p.write_text(s.replace(old,new))
edit('src/service-worker.js', 'import { getProviderList }', "import './i18n-core.js';\nimport { getProviderList }", 1)
edit('src/service-worker.js', "  'content.boot.js',", "  'content.boot.js',\n  'i18n-core.js',\n  'i18n.js',\n  'changelog-i18n.js',",1)
(R/'src/content.boot.js').write_text('// First injected file: reserve this isolated world until the bundle is ready.\nwindow.__openPromptManagerInjected = true;\n')
for path in ['src/settings.html','src/opd-settings.html','src/permissions/permissions.html','src/sidepanel/index.html']:
    s=(R/path).read_text(); prefix='../' if path.count('/')==2 else ''
    old=f'<script src="{prefix}i18n.js"></script>'
    assert old in s,path
    (R/path).write_text(s.replace(old,f'<script src="{prefix}i18n-core.js"></script>\n  '+old))
(R/'src/service-worker-entry.js').unlink()
p=R/'src/manifest.json'; s=p.read_text().replace('service-worker-entry.js','service-worker.js')
p.write_text(s.replace('                "changelog-i18n.js",\n','').replace('                "i18n.js",\n',''))
edit('src/content.js', '    PromptUIManager.state.root = root;', '    window.OPMI18n.attachRoot(root);\n    PromptUIManager.state.root = root;',1)
edit('src/content.js', "    fetch(chrome.runtime.getURL(sourcePath))\n      .then(r => r.text())\n      .then(html => { info.innerHTML = html; })\n      .catch(err => console.error(`[PromptManager] Failed to load ${sourcePath}:`, err));", "    if (sourcePath === 'changelog.html') {\n      window.OPMChangelog.mount(info);\n    } else {\n      fetch(chrome.runtime.getURL(sourcePath))\n        .then(r => r.text())\n        .then(html => { info.innerHTML = html; })\n        .catch(err => console.error(`[PromptManager] Failed to load ${sourcePath}:`, err));\n    }",1)
edit('src/content.js','    const previousView = state.currentView;', '    if (view !== PanelView.CHANGELOG) window.OPMChangelog.unmount();\n    const previousView = state.currentView;',1)
edit('src/content.js','  const reset = () => {\n    state.currentView = null;','  const reset = () => {\n    window.OPMChangelog.unmount();\n    state.currentView = null;',1)
edit('src/content.js','    // COMMENT: Load theme preference before UI injection','    await window.OPMI18n.ready;\n    // COMMENT: Load theme preference before UI injection',1)
for path in ['src/content.js','src/content.shared.js','src/sidepanel/sidepanel.js','src/settings.js','src/permissions/permissions.js']:
    p=R/path; s=p.read_text()
    p.write_text(re.sub(r'(?<![\w.])(?:window\.)?(alert|confirm)\(',r'window.OPMI18n.\1(',s))
edit('src/content.shared.js', "const pill = createEl('span', { className: `opm-tag-pill opm-${getMode()}`, innerHTML: String(tag) });", "const pill = createEl('span', { className: `opm-tag-pill opm-${getMode()}` });\n            pill.setAttribute('data-opm-user-content', '');\n            pill.textContent = String(tag);",1)
edit('src/content.shared.js', "const item = createEl('div', { className: 'opm-tag-suggestion-item', innerHTML: t });", "const item = createEl('div', { className: 'opm-tag-suggestion-item' });\n            item.setAttribute('data-opm-user-content', '');\n            item.textContent = t;",1)
edit('src/content.shared.js', "const label = createEl('span', { innerHTML: `${tag} (${n})` });", "const label = createEl('span');\n                  label.setAttribute('data-opm-user-content', '');\n                  label.textContent = `${tag} (${n})`;",1)
for source in ['prompt.title','p.title']:
    edit('src/content.shared.js',f'text.textContent = {source};', f"text.setAttribute('data-opm-user-content', '');\n          text.textContent = {source};")
edit('src/content.shared.js','            pill.dataset.tag = tag;', "            pill.setAttribute('data-opm-user-content', '');\n            pill.dataset.tag = tag;",1)
edit('src/content.js','        innerHTML: displayLabel,', "        attributes: { 'data-opm-user-content': '' },",1)
edit('src/content.js',"      const inputField = createEl('textarea', {", "      label.textContent = displayLabel;\n      const inputField = createEl('textarea', {",1)
edit('src/sidepanel/sidepanel.js','    label.textContent = displayLabel;', "    label.setAttribute('data-opm-user-content', '');\n    label.textContent = displayLabel;",1)
for source in ['String(tag)','t']:
    var='pill' if source=='String(tag)' else 'item'
    edit('src/sidepanel/sidepanel.js',f'      {var}.textContent = {source};', f"      {var}.setAttribute('data-opm-user-content', '');\n      {var}.textContent = {source};",1)
edit('src/sidepanel/sidepanel.js','    pill.dataset.tag = tag;', "    if (tag !== 'all') pill.setAttribute('data-opm-user-content', '');\n    pill.dataset.tag = tag;",1)
edit('src/sidepanel/sidepanel.js','    titleSpan.textContent = prompt.title;', "    titleSpan.setAttribute('data-opm-user-content', '');\n    titleSpan.textContent = prompt.title;",1)
edit('src/settings.js',"      label.className = 'settings-tag-label';", "      label.className = 'settings-tag-label';\n      label.setAttribute('data-opm-user-content', '');",1)
edit('src/opd-settings.html','id="opd-handle-profile-text"','id="opd-handle-profile-text" data-opm-user-content',1)
edit('src/opd-settings.html','Your public name on the catalog. Locked in after your first upload.','Your public name on the catalog. Cannot be changed after registration.',1)
edit('src/opd-settings.html','Use <strong>Add to Open Prompt Manager</strong> on the website.','Use Add to Open Prompt Manager on the website.',1)
edit('src/sidepanel/sidepanel.js', "  const label = kind === 'share'\n    ? 'Share to Open Prompt Database'\n    : 'Copy to clipboard';\n  return li.querySelector(`.spm-prompt-action-btn[aria-label=\"${label}\"]`);", "  return li.querySelector(`.spm-prompt-action-btn[data-opm-action=\"${kind}\"]`);",1)
edit('src/sidepanel/sidepanel.js',"  btn.setAttribute('aria-label', label);", "  btn.setAttribute('aria-label', label);\n  if (feedbackKey) btn.dataset.opmAction = feedbackKey.kind;",2)
edit('src/sidepanel/sidepanel.js','li[data-uuid="${uuid}"]','li[data-uuid="${CSS.escape(uuid)}"]',2)
for path in ['src/content.js','src/content.shared.js']:
    for phrase in ['Write your prompt. Use hashtags for #variables#','Enter prompt. # for #variables#']:
        p=R/path; s=p.read_text(); old=f"placeholder: '{phrase}'"
        if old in s: p.write_text(s.replace(old,old+", title: 'Variable names can contain letters, numbers and underscores.'"))
edit('src/sidepanel/index.html','id="prompt-content"','id="prompt-content" title="Variable names can contain letters, numbers and underscores."',1)
edit('src/handlers/inputBoxHandler.js','    if (existing) existing.remove();','    if (existing) { window.OPMI18n.detachRoot(existing); existing.remove(); }',1)
edit('src/handlers/inputBoxHandler.js','    document.documentElement.appendChild(toast);\n    window.setTimeout(() => toast.remove(), 2200);','    document.documentElement.appendChild(toast);\n    window.OPMI18n.attachRoot(toast);\n    window.setTimeout(() => { window.OPMI18n.detachRoot(toast); toast.remove(); }, 2200);',1)
edit('src/handlers/inputBoxHandler.js','    document.documentElement.appendChild(root);','    document.documentElement.appendChild(root);\n    window.OPMI18n.attachRoot(root);',1)
edit('src/handlers/inputBoxHandler.js','      root.remove();','      window.OPMI18n.detachRoot(root);\n      root.remove();',1)
edit('src/handlers/inputBoxHandler.js','queuedPrompt?.content || EXAMPLE_PROMPT','queuedPrompt?.content || window.OPMI18n.t(EXAMPLE_PROMPT)',1)
for path in ['src/sidepanel/sidepanel.js','src/settings.js','src/permissions/permissions.js']:
    p=R/path; s=p.read_text()
    for a,b in [("document.addEventListener('DOMContentLoaded', async () => {","document.addEventListener('DOMContentLoaded', async () => {\n  await window.OPMI18n.ready;"),("document.addEventListener('DOMContentLoaded', () => {","document.addEventListener('DOMContentLoaded', async () => {\n  await window.OPMI18n.ready;"),("document.addEventListener('DOMContentLoaded', function () {","document.addEventListener('DOMContentLoaded', async function () {\n  await window.OPMI18n.ready;")]: s=s.replace(a,b)
    p.write_text(s)
# Preserve user-authored labels; keep runtime error codes in the console, not UI.
edit('src/settings.js',"    label.className = 'settings-permission-label';", "    label.className = 'settings-permission-label';\n    if (entry.pattern !== '<all_urls>') label.setAttribute('data-opm-user-content', '');",1)
edit('src/settings.js',"        setImportExportStatus(err?.message || 'Import failed — invalid JSON file.', true);", "        setImportExportStatus(err instanceof SyntaxError\n          ? 'Import failed — invalid JSON file.'\n          : 'Import failed. Please try again.', true);",1)
edit('src/permissions/permissions.js','<span class="custom-mb-0">${key}</span>','<span class="custom-mb-0" data-opm-user-content>${key}</span>',1)
edit('src/sidepanel/index.html','<title>Simple Prompt Manager</title>','<title>Open Prompt Manager</title>',1)
p=R/'src/sidepanel/sidepanel.js'; s=p.read_text()
s=s.replace("pickerResult?.error || 'Could not start input picker on this page.'", "'Could not start input picker on this page.'")
s=s.replace("result?.error || 'Could not start input picker on this page.'", "'Could not start input picker on this page.'")
s=s.replace("result?.error || 'Could not reset input detection on this page.'", "'Could not reset input detection on this page.'")
s=s.replace("error?.message || 'Could not save this prompt.'", "'Could not save this prompt.'")
p.write_text(s)
p=R/'src/content.shared.js'; p.write_text(p.read_text().replace('          text.textContent = p.title;','            text.textContent = p.title;'))
p=R/'src/changelog.zh-CN.html'; s=p.read_text()
for a,b in {'扩展提示词实验页：':'独立标签页：','整体样式优化。':'优化整体界面样式。','鼠标悬停提示词按钮':'将鼠标悬停在提示词按钮上','热区':'右下角热区','目录导入':'社区导入','网站目录':'社区网站','从目录':'从社区提示词库','数据库网站':'社区网站','目录网站':'社区网站','目录更新':'社区内容更新','目录 ID':'社区提示词 ID','发布者用户名':'发布用户名','提示词实验页':'独立标签页','UI':'界面','LLM 页面':'AI 助手页面','toast':'提示'}.items(): s=s.replace(a,b)
p.write_text(s.replace('右下角右下角热区','右下角热区'))
p=R/'package.json'; d=json.loads(p.read_text()); d['scripts'].update({'test:i18n:unit':'node --test tests/localization/*.test.mjs','test:i18n:browser':'node tests/localization/browser.mjs','test:i18n':'npm run test:i18n:unit && npm run test:i18n:browser'}); p.write_text(json.dumps(d,indent=4)+'\n')

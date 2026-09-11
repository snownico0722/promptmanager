(() => {
  'use strict';

  const LANGUAGE_KEY = 'uiLanguage';
  const DEFAULT_PREFERENCE = 'auto';
  const SUPPORTED_PREFERENCES = new Set(['auto', 'en', 'zh-CN']);
  const EXTENSION_PROTOCOLS = new Set(['chrome-extension:', 'moz-extension:', 'safari-web-extension:']);

  // COMMENT: Brand/product names stay unchanged. This table covers user-facing UI copy.
  const ZH_CN = {
    'Simple Prompt Manager': '简易提示词管理器',
    'Extension Icon': '扩展图标',
    'Open in New Tab': '在新标签页打开',
    'Close': '关闭',
    'Create Prompt': '新建提示词',
    'Community Prompts': '社区提示词',
    'Prompt Title': '提示词标题',
    'Enter your prompt here - Use #variablename# for dynamic values.': '在此输入提示词——使用 #变量名# 插入动态值。',
    'Write your prompt. Use hashtags for #variables#': '输入提示词。使用 #变量名# 插入动态值。',
    'Enter prompt. # for #variables#': '输入提示词。使用 #变量名# 插入动态值。',
    'Save prompt': '保存提示词',
    'Save Prompt': '保存提示词',
    'Save new prompt': '保存为新提示词',
    'Save Changes': '保存更改',
    'Update': '更新',
    'Back': '返回',
    'Submit': '确定',
    'Cancel': '取消',
    'Save': '保存',
    'Add your supported Assistants below to get started.': '在下方添加支持的 AI 助手即可开始使用。',
    'Type to search': '输入关键词搜索',
    'Search prompts': '搜索提示词',
    'Keyboard Navigation & Shortcuts': '键盘导航与快捷键',
    'These can be used on any page supported by the extension.': '这些快捷键可在扩展支持的任意页面使用。',
    'Hover/Click': '悬停/点击',
    'Open prompt list buttons': '打开提示词列表按钮',
    'Custom shortcut': '自定义快捷键',
    'Open / close prompt list (set in Settings)': '打开 / 关闭提示词列表（在设置中配置）',
    'Navigate the prompt list': '在提示词列表中导航',
    'Select a prompt': '选择提示词',
    'Close the prompt manager': '关闭提示词管理器',
    'Assistants': 'AI 助手',
    'Add more': '添加更多',
    'Add': '添加',
    'Edit': '编辑',
    'Edit Prompt': '编辑提示词',
    'Delete': '删除',
    'Copy': '复制',
    'Copy to clipboard': '复制到剪贴板',
    'Copied': '已复制',
    'Copied!': '已复制！',
    'Share': '分享',
    'More actions': '更多操作',
    'Insert into the chat on this page': '插入到当前页面的聊天输入框',
    'No prompts found': '未找到提示词',
    'No matching prompts': '没有匹配的提示词',
    'Tags': '标签',
    'Tag': '标签',
    'Add tag': '添加标签',
    'Enter tags here.': '在此输入标签。',
    'All': '全部',
    'List Prompts': '提示词列表',
    'Add Prompt': '添加提示词',
    'Changelog': '更新日志',
    'Drag handle': '拖动手柄',
    'Drag': '拖动',
    'Drag to reorder': '拖动以调整顺序',
    'Import Community Prompts': '导入社区提示词',

    'Settings': '设置',
    'Back to side panel': '返回侧边栏',
    'Keyboard shortcuts': '键盘快捷键',
    'Customize how you open the in-page prompt panel on assistant sites.': '自定义在 AI 助手网站中打开页面内提示词面板的方式。',
    'Open / close panel': '打开 / 关闭面板',
    'Open / close shortcut': '打开 / 关闭快捷键',
    'Record shortcut': '录制快捷键',
    'Record': '录制',
    'Click record, then press your preferred key combination.': '点击“录制快捷键”，然后按下你想使用的组合键。',
    'Press keys… (Esc to cancel)': '请按下按键…（Esc 取消）',
    'Press keys…': '请按下按键…',
    'Listening…': '正在监听…',
    'Launcher mode': '启动方式',
    'Choose how prompts open on assistant pages. Sidebar or shortcut uses the Chrome side panel or your keyboard shortcut only.': '选择在 AI 助手页面中打开提示词的方式。“侧边栏或快捷键”仅使用 Chrome 侧边栏或键盘快捷键。',
    'Floating button': '悬浮按钮',
    'Hot corner': '热区',
    'Sidebar or shortcut': '侧边栏或快捷键',
    'Preferences': '偏好设置',
    'Extension behaviour on assistant pages and in the side panel.': '设置扩展在 AI 助手页面和侧边栏中的行为。',
    'Append prompts to text': '将提示词追加到现有文本',
    'Enable tags': '启用标签',
    'Force dark mode': '强制深色模式',
    'Force Dark Mode': '强制深色模式',
    'Tag management': '标签管理',
    'Drag to reorder tags. Remove a tag from every prompt.': '拖动可调整标签顺序，也可以从所有提示词中移除某个标签。',
    'No tags yet — add tags when creating or editing prompts.': '还没有标签——创建或编辑提示词时可以添加标签。',
    'Prompt management': '提示词管理',
    'Prompt Management': '提示词管理',
    'Export': '导出',
    'Import': '导入',
    'Export failed.': '导出失败。',
    'Export started — check your downloads folder.': '已开始导出——请检查下载文件夹。',
    'Import successful!': '导入成功！',
    'Import successful — prompts merged.': '导入成功——提示词已合并。',
    'Import failed — invalid JSON file.': '导入失败——JSON 文件无效。',
    'Invalid JSON file format.': 'JSON 文件格式无效。',
    'Delete all prompts': '删除全部提示词',
    'Delete ALL prompts? This cannot be undone.': '删除全部提示词？此操作无法撤销。',
    'Are you sure you want to delete all prompts? This action cannot be undone.': '确定要删除全部提示词吗？此操作无法撤销。',
    'Are you sure you want to delete this prompt?': '确定要删除这条提示词吗？',
    'All prompts deleted.': '已删除全部提示词。',
    'Failed to delete prompts.': '删除提示词失败。',
    'Please fill in both title and content.': '请同时填写标题和正文。',
    'Error saving prompt.': '保存提示词时出错。',
    'Add a title and prompt text before saving.': '保存前请填写标题和提示词正文。',
    'Could not save this prompt.': '无法保存这条提示词。',
    'Permissions editor': '权限管理',
    'Sites where the extension can inject prompts.': '允许扩展注入提示词的网站。',
    'No website access granted yet.': '尚未授予任何网站访问权限。',
    'All websites': '所有网站',
    'Remove': '移除',
    'Language': '语言',
    'Choose the interface language.': '选择界面语言。',
    'Automatic (browser language)': '自动（跟随浏览器语言）',
    'English': 'English',
    'Simplified Chinese': '简体中文',
    'Support & Links': '支持与链接',
    'Visit the GitHub Repository': '访问 GitHub 仓库',
    'Leave a Review': '留下评价',
    'Leave a review': '留下评价',
    'Buy me a Coffee': '请我喝杯咖啡',
    'Buy me a coffee': '请我喝杯咖啡',
    'Review me': '给个评价',

    'Open Source & Forever Simple.': '开源，始终保持简单。',
    'Hover to start': '悬停即可开始',
    'Hover to Start': '悬停即可开始',
    'Hover to Start...': '悬停即可开始…',
    'Or check out Keyboard Shortcuts.': '也可以使用键盘快捷键。',
    'Explore features': '探索功能',
    '...And Explore': '…继续探索',
    'Hot Corner, variables, context menu, tags, and more.': '热区、变量、右键菜单、标签等更多功能。',
    'How would you like to open your prompts?': '你希望如何打开提示词？',
    'Choose your preferred launcher. You can change this anytime in Settings.': '选择你喜欢的启动方式，之后可以随时在“设置”中修改。',
    'Your prompts appear when you hover over the floating button.': '将鼠标悬停在悬浮按钮上即可显示提示词。',
    'Move your cursor to the bottom-right corner to open prompts instantly.': '将鼠标移到右下角即可立即打开提示词。',
    'Open the Chrome side panel or use your keyboard shortcut — no on-page launcher.': '通过 Chrome 侧边栏或键盘快捷键打开，不在页面中显示启动控件。',
    'Default': '默认',
    'Features': '功能',
    'Your prompts, in a single click': '一键使用你的提示词',
    'Just hover to get started.': '悬停即可开始。',
    'Available everywhere you need it': '在需要的地方随时可用',
    'Works on any website.': '可用于任意网站。',
    'Advanced features': '高级功能',
    'Prompt Variables, Tags, Search, Append prompts, Easy Import.': '提示词变量、标签、搜索、追加提示词和便捷导入。',
    'Keyboard Shortcuts': '键盘快捷键',
    'Keyboard shortcuts and navigation.': '支持快捷键和键盘导航。',
    'Clean & Simple': '干净简洁',
    'User friendly, Light & Dark mode.': '易于使用，支持浅色和深色模式。',
    'Open Source': '开源',
    'No account required.': '无需账号。',
    'Privacy policy': '隐私政策',
    '— how local storage and catalog sharing work.': '——了解本地存储和目录分享的工作方式。',
    'Community prompts': '社区提示词',
    'Browse and import from the Open Prompt Database.': '浏览 Open Prompt Database 并导入提示词。',
    'Enable sharing': '启用分享',
    'Publish prompts you choose to the catalog.': '将你选择的提示词发布到公共目录。',
    'Choose an AI Assistant below to get started.': '在下方选择一个 AI 助手即可开始使用。',
    'AI Assistants': 'AI 助手',
    'Another website': '其他网站',
    'Remove all permissions': '移除全部权限',
    "To add a site that isn't listed above, open that website in your browser, open the": '要添加上方未列出的网站，请先在浏览器中打开该网站，再打开',
    'sidebar, and click': '侧边栏，然后点击',
    'under Assistants. Then click the chat input on the page.': '（位于“AI 助手”下方）。然后点击页面中的聊天输入框。',
    'Chrome Store': 'Chrome 商店',

    'Open Prompt Database': 'Open Prompt Database',
    'Handle': '用户名',
    'Your public name on the catalog. Locked in after your first upload.': '你在公共目录中显示的名称。首次上传后将锁定。',
    'Suggest': '建议一个',
    'Suggest handle': '生成用户名建议',
    'Confirm': '确认',
    'Publishing': '发布',
    'Share your prompts to the catalog when you are ready.': '准备好后，可以把提示词分享到公共目录。',
    'Publish prompts': '发布提示词',
    'Use Add to Open Prompt Manager on the website.': '在网站中使用“添加到 Open Prompt Manager”。',
    'Enable catalog import': '启用目录导入',
    'Import enabled': '已启用导入',
    'Browse catalog': '浏览目录',
    'Privacy policy — how local storage and catalog sharing work.': '隐私政策——了解本地存储和目录分享的工作方式。',
    'Needed for one-click import on the site.': '用于在网站上一键导入。',
    'Catalog access is required to check handles.': '检查用户名需要目录访问权限。',
    'Could not check that handle. Try again.': '无法检查该用户名，请重试。',
    'Unavailable — try another.': '该用户名不可用——请换一个。',
    'Catalog access is required to register a handle.': '注册用户名需要目录访问权限。',
    'Could not confirm.': '无法确认，请重试。',
    'Permission denied.': '权限已拒绝。',
    'Min. 3 characters.': '至少需要 3 个字符。',

    'Custom website': '自定义网站',
    '+ Custom website': '+ 自定义网站',
    'Pin input': '固定输入框',
    'Unpin input': '取消固定输入框',
    'Open a website tab, then click to pick its input field': '请先打开一个网站标签页，再点击此处选择输入框',
    'Allow site access for this page to pick its input field.': '请允许访问当前网站，以便选择输入框。',
    'Could not start input picker on this page.': '无法在当前页面启动输入框选择器。',
    'Could not reset input detection on this page.': '无法重置当前页面的输入框识别。',

    'Open a chat site, then click a prompt to insert it.': '请先打开聊天网站，再点击提示词插入。',
    'No chat input found. Wait for it to load, or pick the field if the page changed.': '未找到聊天输入框。请等待页面加载，若网站界面已变化可手动选择输入框。',
    'Pick field': '选择输入框',
    'This page is not enabled. Grant it under Assistants, then try again.': '当前页面尚未启用。请在“AI 助手”中授权后重试。',
    'No chat input found on this page. Wait for it to finish loading, then try again.': '当前页面未找到聊天输入框。请等待页面加载完成后重试。',
    'That prompt could not be found. Refresh the side panel and try again.': '找不到该提示词。请刷新侧边栏后重试。',
    'Could not reach this page. Reload the tab and try again.': '无法连接当前页面。请重新加载标签页后重试。',
    'The prompt did not land in the chat input. Click the input, then try again.': '提示词未能写入聊天输入框。请先点击输入框，再重试。',
    'Could not insert this prompt. Try again.': '无法插入该提示词，请重试。',

    'Share to Open Prompt Database': '分享到 Open Prompt Database',
    'Unpublish': '取消发布',
    'Set a publisher handle in Open Prompt Database settings before sharing.': '分享前请先在 Open Prompt Database 设置中设置发布者用户名。',
    'Catalog access is required to share. Grant permission and try again.': '分享需要目录访问权限。请授权后重试。',
    'Sharing is turned off in Open Prompt Database settings.': 'Open Prompt Database 设置中已关闭分享。',
    'That prompt is no longer in your library.': '该提示词已不在你的库中。',
    'Could not reach the catalog. Check your connection and try again.': '无法连接目录。请检查网络后重试。',
    'Could not register a publisher handle. Try again from Open Prompt Database settings.': '无法注册发布者用户名。请在 Open Prompt Database 设置中重试。',
    'Share verification failed. Try again in a moment.': '分享验证失败，请稍后重试。',
    'Publisher identity is missing. Toggle sharing off and on in settings, then retry.': '缺少发布者身份信息。请在设置中关闭再重新开启分享，然后重试。',
    'Too many shares. Wait a bit and try again.': '分享操作过于频繁，请稍后重试。',
    'That prompt could not be published. Check the title and content.': '无法发布该提示词，请检查标题和正文。',
    'This catalog id is owned by another publisher.': '该目录 ID 属于其他发布者。',
    'Could not reach openpromptdatabase.com. Grant catalog access and try again.': '无法连接 openpromptdatabase.com。请授予目录访问权限后重试。',
    'The extension background page did not respond. Reload the extension and retry.': '扩展后台没有响应。请重新加载扩展后重试。',
    'Could not share this prompt. Try again.': '无法分享该提示词，请重试。',

    'Open Sidebar': '打开侧边栏',
    'Get Started': '开始使用',
    'No provider data found in storage.': '本地存储中没有找到 AI 助手数据。',
    'Could not remove all permissions. Try again from Settings.': '无法移除全部权限，请在设置中重试。',

    'New:': '新功能：',
    'Use Open Prompt Manager on ANY site. Enjoy the extension?': 'Open Prompt Manager 现在可用于任意网站。喜欢这个扩展吗？',
  };

  const DYNAMIC_PATTERNS = [
    { re: /^Remove tag "(.+)" from all prompts\?$/, zh: m => `从所有提示词中移除标签“${m[1]}”？` },
    { re: /^Reorder tag (.+)$/, zh: m => `调整标签 ${m[1]} 的顺序` },
    { re: /^Remove tag (.+) from all prompts$/, zh: m => `从所有提示词中移除标签 ${m[1]}` },
    { re: /^Delete prompt "(.+)"\?$/, zh: m => `删除提示词“${m[1]}”？` },
    { re: /^Delete "(.+)"\?$/, zh: m => `删除“${m[1]}”？` },
    { re: /^Remove access to (.+)\?$/, zh: m => `移除对 ${m[1]} 的访问权限？` },
    { re: /^Remove access to (.+)$/, zh: m => `移除对 ${m[1]} 的访问权限` },
    { re: /^Permission denied for (.+)\. Allow site access in the Chrome prompt to continue\.$/, zh: m => `未授予 ${m[1]} 的网站权限。请在 Chrome 权限提示中允许访问后继续。` },
    { re: /^Could not request permission for (.+): (.+)$/, zh: m => `无法请求 ${m[1]} 的权限：${m[2]}` },
    { re: /^Reset input field on (.+) — click to re-pick$/, zh: m => `重置 ${m[1]} 的输入框——点击重新选择` },
    { re: /^Reset auto-detected input on (.+) — click to re-pick$/, zh: m => `重置 ${m[1]} 自动识别的输入框——点击重新选择` },
    { re: /^Pick the input field on (.+)$/, zh: m => `选择 ${m[1]} 的输入框` },
    { re: /^Open ([A-Za-z0-9_.:-]+)$/, zh: m => `打开 ${m[1]}` },
    { re: /^Activate (.+)$/, zh: m => `启用 ${m[1]}` },
    { re: /^(.+) icon$/, zh: m => `${m[1]} 图标` },
    { re: /^(.+) value$/, zh: m => `${m[1]} 的值` },
    { re: /^Could not share this prompt \((.+)\)\. Try again\.$/, zh: m => `无法分享该提示词（${m[1]}），请重试。` },
  ];

  const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];
  const USER_TEXT_CONTAINERS = [
    '#prompt-list',
    '.opm-prompt-items-container',
    '.opm-prompt-list-item',
    '[data-content]',
    '[data-tag]:not([data-tag="all"])',
    '.spm-tag-pill',
    '.opm-tag-pill',
    '.settings-tag-label',
    '#opd-handle-profile-text',
  ].join(',');

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  let preference = DEFAULT_PREFERENCE;
  let activeLanguage = 'en';
  let observer = null;
  let observerRoot = null;
  let hostRootObserver = null;

  function isExtensionDocument() {
    return EXTENSION_PROTOCOLS.has(window.location.protocol);
  }

  function browserLanguage() {
    let lang = '';
    try {
      lang = String(chrome?.i18n?.getUILanguage?.() || '');
    } catch (_) {
      lang = '';
    }
    if (!lang) lang = String(navigator.language || '');
    return lang.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }

  function resolveLanguage(value) {
    if (value === 'zh-CN' || value === 'en') return value;
    return browserLanguage();
  }

  function translateCore(value) {
    if (activeLanguage !== 'zh-CN' || typeof value !== 'string' || !value) return value;
    const trimmed = value.trim();
    if (!trimmed) return value;

    let translated = ZH_CN[trimmed];
    if (!translated) {
      for (const pattern of DYNAMIC_PATTERNS) {
        const match = trimmed.match(pattern.re);
        if (match) {
          translated = pattern.zh(match);
          break;
        }
      }
    }
    if (!translated || translated === trimmed) return value;
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
  }

  function isUserTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    return Boolean(node.parentElement?.closest(USER_TEXT_CONTAINERS));
  }

  function captureAttribute(element, name, refreshOriginal = false) {
    if (!element.hasAttribute(name)) return;
    let attrs = originalAttributes.get(element);
    if (!attrs) {
      attrs = new Map();
      originalAttributes.set(element, attrs);
    }
    if (refreshOriginal || !attrs.has(name)) attrs.set(name, element.getAttribute(name));
  }

  function applyTextNode(node, refreshOriginal = false) {
    if (!node || node.nodeType !== Node.TEXT_NODE || isUserTextNode(node)) return;
    if (refreshOriginal || !originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node) ?? node.nodeValue;
    node.nodeValue = activeLanguage === 'zh-CN' ? translateCore(source) : source;
  }

  function applyElement(element, refreshOriginal = false) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    for (const name of TRANSLATABLE_ATTRIBUTES) {
      if (!element.hasAttribute(name)) continue;
      captureAttribute(element, name, refreshOriginal);
      const source = originalAttributes.get(element)?.get(name);
      if (source == null) continue;
      element.setAttribute(name, activeLanguage === 'zh-CN' ? translateCore(source) : source);
    }
  }

  function applySubtree(root, refreshOriginal = false) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      applyTextNode(root, refreshOriginal);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) applyElement(root, refreshOriginal);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.currentNode;
    while (node) {
      if (node !== root) {
        if (node.nodeType === Node.TEXT_NODE) applyTextNode(node, refreshOriginal);
        else applyElement(node, refreshOriginal);
      }
      node = walker.nextNode();
    }
  }

  function observerOptions() {
    return {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    };
  }

  function observe(root) {
    if (!root) return;
    observerRoot = root;
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        observer.disconnect();
        for (const mutation of mutations) {
          if (mutation.type === 'characterData') {
            applyTextNode(mutation.target, true);
          } else if (mutation.type === 'attributes') {
            applyElement(mutation.target, true);
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => applySubtree(node));
          }
        }
        if (observerRoot?.isConnected || isExtensionDocument()) {
          observer.observe(observerRoot, observerOptions());
        }
      });
    }
    observer.disconnect();
    observer.observe(root, observerOptions());
  }

  function attachRoot(root) {
    if (!root) return;
    if (observer) observer.disconnect();
    observerRoot = root;
    applySubtree(root);
    observe(root);
  }

  function ensureHostRootWatcher() {
    if (isExtensionDocument() || hostRootObserver || !document.body) return;
    hostRootObserver = new MutationObserver(() => {
      const nextRoot = document.getElementById('opm-root');
      if (nextRoot && nextRoot !== observerRoot) {
        attachRoot(nextRoot);
        return;
      }
      if (!nextRoot && observerRoot && !observerRoot.isConnected) {
        observer?.disconnect();
        observerRoot = null;
      }
    });
    // COMMENT: #opm-root is appended directly to body. Watching only direct body
    // children avoids observing or traversing the host site's application DOM.
    hostRootObserver.observe(document.body, { childList: true });
  }

  function syncLanguageControl() {
    const select = document.getElementById('ui-language-select');
    if (!select) return;
    select.value = preference;
    if (select.dataset.opmLanguageBound) return;
    select.dataset.opmLanguageBound = '1';
    select.addEventListener('change', async () => {
      const value = SUPPORTED_PREFERENCES.has(select.value) ? select.value : DEFAULT_PREFERENCE;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [LANGUAGE_KEY]: value });
      } else {
        preference = value;
        activeLanguage = resolveLanguage(value);
        apply();
      }
    });
  }

  function apply() {
    const extensionDocument = isExtensionDocument();
    if (extensionDocument) {
      if (!document.documentElement) return;
      document.documentElement.lang = activeLanguage === 'zh-CN' ? 'zh-CN' : 'en';
      attachRoot(document.documentElement);
      syncLanguageControl();
      return;
    }

    // COMMENT: On assistant websites, never translate or observe the host document.
    // Only the extension-owned #opm-root subtree is eligible for localization.
    const root = document.getElementById('opm-root');
    if (root) attachRoot(root);
    else {
      observer?.disconnect();
      observerRoot = null;
    }
    ensureHostRootWatcher();
  }

  async function loadPreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get([LANGUAGE_KEY]);
        const stored = result?.[LANGUAGE_KEY];
        preference = SUPPORTED_PREFERENCES.has(stored) ? stored : DEFAULT_PREFERENCE;
      }
    } catch (_) {
      preference = DEFAULT_PREFERENCE;
    }
    activeLanguage = resolveLanguage(preference);
  }

  const nativeAlert = typeof window.alert === 'function' ? window.alert.bind(window) : null;
  const nativeConfirm = typeof window.confirm === 'function' ? window.confirm.bind(window) : null;
  if (nativeAlert) window.alert = (message) => nativeAlert(translateCore(String(message)));
  if (nativeConfirm) window.confirm = (message) => nativeConfirm(translateCore(String(message)));

  window.OPMI18n = {
    t: translateCore,
    getLanguage: () => activeLanguage,
    getPreference: () => preference,
    attachRoot,
    setLanguage: async (value) => {
      const next = SUPPORTED_PREFERENCES.has(value) ? value : DEFAULT_PREFERENCE;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [LANGUAGE_KEY]: next });
      } else {
        preference = next;
        activeLanguage = resolveLanguage(next);
        apply();
      }
    },
    apply,
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[LANGUAGE_KEY]) return;
      const next = changes[LANGUAGE_KEY].newValue;
      preference = SUPPORTED_PREFERENCES.has(next) ? next : DEFAULT_PREFERENCE;
      activeLanguage = resolveLanguage(preference);
      apply();
    });
  }

  const start = async () => {
    await loadPreference();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  };

  start().catch(() => {});
})();
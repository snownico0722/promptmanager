(() => {
  'use strict';

  const LANGUAGE_KEY = 'uiLanguage';
  const DEFAULT_PREFERENCE = 'auto';
  const SUPPORTED_PREFERENCES = new Set(['auto', 'en', 'zh-CN']);

  const ZH_CN = {
    'Simple Prompt Manager': '简易提示词管理器',
    'Open in New Tab': '在新标签页打开',
    'Close': '关闭',
    'Create Prompt': '新建提示词',
    'Community Prompts': '社区提示词',
    'Prompt Title': '提示词标题',
    'Enter your prompt here - Use #variablename# for dynamic values.': '在此输入提示词——使用 #变量名# 插入动态值。',
    'Save prompt': '保存提示词',
    'Save Prompt': '保存提示词',
    'Back': '返回',
    'Submit': '确定',
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
    'Copied': '已复制',
    'Copied!': '已复制！',
    'Share': '分享',
    'Cancel': '取消',
    'Save': '保存',
    'No prompts found': '未找到提示词',
    'No matching prompts': '没有匹配的提示词',
    'Tags': '标签',
    'Tag': '标签',
    'Add tag': '添加标签',
    'Settings': '设置',
    'Back to side panel': '返回侧边栏',
    'Keyboard shortcuts': '键盘快捷键',
    'Customize how you open the in-page prompt panel on assistant sites.': '自定义在 AI 助手网站中打开页面内提示词面板的方式。',
    'Open / close panel': '打开 / 关闭面板',
    'Record shortcut': '录制快捷键',
    'Click record, then press your preferred key combination.': '点击“录制快捷键”，然后按下你想使用的组合键。',
    'Press keys… (Esc to cancel)': '请按下按键…（Esc 取消）',
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
    'Tag management': '标签管理',
    'Drag to reorder tags. Remove a tag from every prompt.': '拖动可调整标签顺序，也可以从所有提示词中移除某个标签。',
    'No tags yet — add tags when creating or editing prompts.': '还没有标签——创建或编辑提示词时可以添加标签。',
    'Prompt management': '提示词管理',
    'Export': '导出',
    'Import': '导入',
    'Delete all prompts': '删除全部提示词',
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
    'Open Source & Forever Simple.': '开源，始终保持简单。',
    'Hover to Start...': '悬停即可开始…',
    'Or check out Keyboard Shortcuts.': '也可以使用键盘快捷键。',
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
    'Community prompts': '社区提示词',
    'Browse and import from the Open Prompt Database.': '浏览 Open Prompt Database 并导入提示词。',
    'Enable sharing': '启用分享',
    'Publish prompts you choose to the catalog.': '将你选择的提示词发布到公共目录。',
    'Choose an AI Assistant below to get started.': '在下方选择一个 AI 助手即可开始使用。',
    'AI Assistants': 'AI 助手',
    'Another website': '其他网站',
    'Remove all permissions': '移除全部权限',
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
    'Custom website': '自定义网站',
    '+ Custom website': '+ 自定义网站',
    'Pin input': '固定输入框',
    'Unpin input': '取消固定输入框',
    'Share to Open Prompt Database': '分享到 Open Prompt Database',
    'Unpublish': '取消发布',
    'Open Sidebar': '打开侧边栏'
  };

  const DYNAMIC_PATTERNS = [
    {
      re: /^Remove tag "(.+)" from all prompts\?$/,
      zh: (match) => `从所有提示词中移除标签“${match[1]}”？`,
    },
    {
      re: /^Reorder tag (.+)$/,
      zh: (match) => `调整标签 ${match[1]} 的顺序`,
    },
    {
      re: /^Remove tag (.+) from all prompts$/,
      zh: (match) => `从所有提示词中移除标签 ${match[1]}`,
    },
    {
      re: /^Delete prompt "(.+)"\?$/,
      zh: (match) => `删除提示词“${match[1]}”？`,
    },
  ];

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];
  let preference = DEFAULT_PREFERENCE;
  let activeLanguage = 'en';
  let observer = null;
  let observerRoot = null;

  function browserLanguage() {
    const lang = String(navigator.language || '').toLowerCase();
    return lang.startsWith('zh') ? 'zh-CN' : 'en';
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

  function captureAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
    let attrs = originalAttributes.get(element);
    if (!attrs) {
      attrs = new Map();
      originalAttributes.set(element, attrs);
    }
    if (!attrs.has(name)) attrs.set(name, element.getAttribute(name));
  }

  function applyTextNode(node, refreshOriginal = false) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if (refreshOriginal || !originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node) ?? node.nodeValue;
    node.nodeValue = activeLanguage === 'zh-CN' ? translateCore(source) : source;
  }

  function applyElement(element, refreshOriginal = false) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    for (const name of TRANSLATABLE_ATTRIBUTES) {
      if (!element.hasAttribute(name)) continue;
      if (refreshOriginal) {
        let attrs = originalAttributes.get(element);
        if (!attrs) {
          attrs = new Map();
          originalAttributes.set(element, attrs);
        }
        attrs.set(name, element.getAttribute(name));
      } else {
        captureAttribute(element, name);
      }
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

  function observe(root = document.documentElement) {
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
        observer.observe(observerRoot, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: TRANSLATABLE_ATTRIBUTES,
        });
      });
    }
    observer.disconnect();
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });
  }

  function syncLanguageControl() {
    const select = document.getElementById('ui-language-select');
    if (!select) return;
    select.value = preference;
    if (!select.dataset.opmLanguageBound) {
      select.dataset.opmLanguageBound = '1';
      select.addEventListener('change', async () => {
        const value = SUPPORTED_PREFERENCES.has(select.value) ? select.value : DEFAULT_PREFERENCE;
        if (chrome?.storage?.local) {
          await chrome.storage.local.set({ [LANGUAGE_KEY]: value });
        } else {
          preference = value;
          activeLanguage = resolveLanguage(value);
          apply();
        }
      });
    }
  }

  function apply() {
    if (!document.documentElement) return;
    if (observer) observer.disconnect();
    document.documentElement.lang = activeLanguage === 'zh-CN' ? 'zh-CN' : 'en';
    applySubtree(document.documentElement);
    syncLanguageControl();
    observe(document.documentElement);
  }

  async function loadPreference() {
    try {
      if (chrome?.storage?.local) {
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
    setLanguage: async (value) => {
      const next = SUPPORTED_PREFERENCES.has(value) ? value : DEFAULT_PREFERENCE;
      if (chrome?.storage?.local) await chrome.storage.local.set({ [LANGUAGE_KEY]: next });
      else {
        preference = next;
        activeLanguage = resolveLanguage(next);
        apply();
      }
    },
    apply,
  };

  if (chrome?.storage?.onChanged) {
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

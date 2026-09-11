// Shared language state and messages for extension pages, content scripts and the worker.
// Classic-script compatible; loading this file never touches DOM or browser globals.
(() => {
  'use strict';
  if (globalThis.OPMI18n) return;
  const LANGUAGE_KEY = 'uiLanguage';
  const SUPPORTED = new Set(['auto', 'en', 'zh-CN']);
  const ZH_CN = {
    'Simple Prompt Manager': 'Open Prompt Manager',
    'Extension Icon': '扩展图标',
    'Open in New Tab': '在新标签页打开',
    'Close': '关闭',
    'Create Prompt': '新建提示词',
    'Community Prompts': '社区提示词',
    'Prompt Title': '提示词标题',
    'Enter your prompt here - Use #variablename# for dynamic values.': '输入提示词，可用 #name# 插入变量。',
    'Write your prompt. Use hashtags for #variables#': '输入提示词，可用 #name# 插入变量。',
    'Enter prompt. # for #variables#': '输入提示词，可用 #name# 插入变量。',
    'Save prompt': '保存提示词',
    'Save Prompt': '保存提示词',
    'Save new prompt': '保存为提示词',
    'Save Changes': '保存更改',
    'Update': '保存更改',
    'Back': '返回',
    'Submit': '插入提示词',
    'Cancel': '取消',
    'Save': '保存',
    'Add your supported Assistants below to get started.': '请先在下方启用一个 AI 助手。',
    'Type to search': '输入关键词搜索',
    'Search prompts': '搜索提示词',
    'Keyboard Navigation & Shortcuts': '键盘导航与快捷键',
    'These can be used on any page supported by the extension.': '这些快捷键可在扩展支持的任意页面使用。',
    'Hover/Click': '悬停/点击',
    'Open prompt list buttons': '打开提示词列表',
    'Custom shortcut': '自定义快捷键',
    'Open / close prompt list (set in Settings)': '打开或关闭提示词列表（可在设置中修改）',
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
    'Enter tags here.': '输入标签，按回车添加',
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
    'Open / close panel': '打开或关闭面板',
    'Open / close shortcut': '打开或关闭面板的快捷键',
    'Record shortcut': '录制快捷键',
    'Record': '录制',
    'Click record, then press your preferred key combination.': '点击“录制快捷键”，然后按下你想使用的组合键。',
    'Press keys… (Esc to cancel)': '请按下组合键…（Esc 取消）',
    'Press keys…': '请按下组合键…',
    'Listening…': '等待按键…',
    'Launcher mode': '启动方式',
    'Choose how prompts open on assistant pages. Sidebar or shortcut uses the Chrome side panel or your keyboard shortcut only.': '选择提示词面板的打开方式。“侧边栏或快捷键”不会在网页中显示悬浮按钮或热区。',
    'Floating button': '悬浮按钮',
    'Hot corner': '右下角热区',
    'Sidebar or shortcut': '侧边栏或快捷键',
    'Preferences': '偏好设置',
    'Extension behaviour on assistant pages and in the side panel.': '设置扩展在 AI 助手页面和侧边栏中的行为。',
    'Append prompts to text': '追加到已有文本',
    'Enable tags': '启用标签',
    'Force dark mode': '强制深色模式',
    'Force Dark Mode': '强制深色模式',
    'Tag management': '标签管理',
    'Drag to reorder tags. Remove a tag from every prompt.': '拖动可调整标签顺序。移除标签会同时从所有提示词中移除。',
    'No tags yet — add tags when creating or editing prompts.': '暂无标签，可在新建或编辑提示词时添加。',
    'Prompt management': '提示词管理',
    'Prompt Management': '提示词管理',
    'Export': '导出',
    'Import': '导入',
    'Export failed.': '导出失败。',
    'Export started — check your downloads folder.': '已开始导出，请查看下载文件夹。',
    'Import successful!': '导入成功！',
    'Import successful — prompts merged.': '导入成功，已与现有提示词合并。',
    'Import failed — invalid JSON file.': '导入失败，请选择有效的 JSON 备份文件。',
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
    'Permissions editor': '网站权限',
    'Sites where the extension can inject prompts.': '扩展可以在以下网站中填入提示词。',
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
    'Open Source & Forever Simple.': '保持开源，保持简单。',
    'Hover to start': '悬停即可开始',
    'Hover to Start': '悬停即可开始',
    'Hover to Start...': '悬停即可开始…',
    'Or check out Keyboard Shortcuts.': '也可以使用键盘快捷键。',
    'Explore features': '探索功能',
    '...And Explore': '…继续探索',
    'Hot Corner, variables, context menu, tags, and more.': '支持右下角热区、变量、右键菜单和标签等功能。',
    'How would you like to open your prompts?': '你希望如何打开提示词？',
    'Choose your preferred launcher. You can change this anytime in Settings.': '选择你喜欢的启动方式，之后可以随时在“设置”中修改。',
    'Your prompts appear when you hover over the floating button.': '将鼠标悬停在悬浮按钮上即可显示提示词。',
    'Move your cursor to the bottom-right corner to open prompts instantly.': '将鼠标移到右下角即可立即打开提示词。',
    'Open the Chrome side panel or use your keyboard shortcut — no on-page launcher.': '通过浏览器侧边栏或快捷键打开，不在网页中显示启动按钮。',
    'Default': '默认',
    'Features': '功能',
    'Your prompts, in a single click': '一键使用你的提示词',
    'Just hover to get started.': '悬停即可开始。',
    'Available everywhere you need it': '随处可用',
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
    '— how local storage and catalog sharing work.': '——了解本地存储与公开分享的规则。',
    'Community prompts': '社区提示词',
    'Browse and import from the Open Prompt Database.': '浏览 Open Prompt Database 社区提示词库并导入提示词。',
    'Enable sharing': '启用公开分享',
    'Publish prompts you choose to the catalog.': '将你选择的提示词公开发布到社区提示词库。',
    'Choose an AI Assistant below to get started.': '在下方选择一个 AI 助手即可开始使用。',
    'AI Assistants': 'AI 助手',
    'Another website': '其他网站',
    'Remove all permissions': '移除全部权限',
    'To add a site that isn\'t listed above, open that website in your browser, open the': '要添加上方未列出的网站，请先在浏览器中打开该网站，再打开',
    'sidebar, and click': '侧边栏，然后点击',
    'under Assistants. Then click the chat input on the page.': '（位于“AI 助手”下方）。然后点击页面中的聊天输入框。',
    'Chrome Store': 'Chrome 商店',
    'Open Prompt Database': 'Open Prompt Database',
    'Handle': '发布用户名',
    'Your public name on the catalog. Locked in after your first upload.': '在社区提示词库中公开显示的用户名，确认注册后不可修改。',
    'Suggest': '随机生成',
    'Suggest handle': '随机生成用户名',
    'Confirm': '确认',
    'Publishing': '发布',
    'Share your prompts to the catalog when you are ready.': '可以将你选择的提示词公开发布到社区提示词库。',
    'Publish prompts': '允许发布提示词',
    'Use Add to Open Prompt Manager on the website.': '点击网站上的“Add to Open Prompt Manager”即可导入。',
    'Enable catalog import': '启用社区导入',
    'Import enabled': '已启用社区导入',
    'Browse catalog': '浏览社区提示词库',
    'Privacy policy — how local storage and catalog sharing work.': '隐私政策——了解本地存储与公开分享的规则。',
    'Needed for one-click import on the site.': '授权后，可在社区网站上一键导入提示词。',
    'Catalog access is required to check handles.': '请先允许访问社区网站，才能检查用户名。',
    'Could not check that handle. Try again.': '用户名检查失败，请重试。',
    'Unavailable — try another.': '该用户名不可用，请换一个。',
    'Catalog access is required to register a handle.': '请先允许访问社区网站，才能注册用户名。',
    'Could not confirm.': '注册失败，请重试。',
    'Permission denied.': '未授予访问权限。',
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
    'Set a publisher handle in Open Prompt Database settings before sharing.': '请先在社区设置中注册发布用户名，再分享提示词。',
    'Catalog access is required to share. Grant permission and try again.': '分享需要访问社区网站，请授权后重试。',
    'Sharing is turned off in Open Prompt Database settings.': '社区设置中已关闭分享。',
    'That prompt is no longer in your library.': '该提示词已不在你的库中。',
    'Could not reach the catalog. Check your connection and try again.': '无法连接社区提示词库，请检查网络后重试。',
    'Could not register a publisher handle. Try again from Open Prompt Database settings.': '用户名注册失败，请在社区设置中重试。',
    'Share verification failed. Try again in a moment.': '分享验证失败，请稍后重试。',
    'Publisher identity is missing. Toggle sharing off and on in settings, then retry.': '缺少发布者身份信息。请在社区设置中关闭分享后重新开启，再重试。',
    'Too many shares. Wait a bit and try again.': '分享操作过于频繁，请稍后重试。',
    'That prompt could not be published. Check the title and content.': '无法发布该提示词，请检查标题和正文。',
    'This catalog id is owned by another publisher.': '这条社区提示词属于其他发布者。',
    'Could not reach openpromptdatabase.com. Grant catalog access and try again.': '无法连接社区网站 openpromptdatabase.com，请确认已授权后重试。',
    'The extension background page did not respond. Reload the extension and retry.': '扩展后台没有响应。请重新加载扩展后重试。',
    'Could not share this prompt. Try again.': '无法分享该提示词，请重试。',
    'Open Sidebar': '打开侧边栏',
    'Get Started': '开始使用',
    'No provider data found in storage.': '本地存储中没有找到 AI 助手数据。',
    'Could not remove all permissions. Try again from Settings.': '无法移除全部权限，请在设置中重试。',
    'New:': '新功能：',
    'Use Open Prompt Manager on ANY site. Enjoy the extension?': 'Open Prompt Manager 现在可用于任意网站。喜欢这个扩展吗？',
    'Open Prompt Manager': 'Open Prompt Manager',
    'Variable names can contain letters, numbers and underscores.': '变量名仅支持英文字母、数字和下划线，例如 #name#。',
    'handle': '发布用户名',
    'Your public name on the catalog. Cannot be changed after registration.': '在社区提示词库中公开显示的用户名，确认注册后不可修改。',
    'Choose an input field to load prompts into': '点击要填入提示词的输入框',
    'Cancel input picker': '取消选择输入框',
    'Could not pin this input': '无法设置此输入框',
    'Click the input field on the page': '请点击页面中的输入框',
    'Example Prompt': '示例提示词',
    'Enter a title for your prompt': '请输入提示词标题',
    'Please add a title to your prompt.': '请填写提示词标题。',
    'Untitled prompt': '未命名提示词',
    'Title & content are required': '请填写标题和提示词正文。',
    'Prompt not found': '找不到这条提示词。',
    'Folder name is required': '请填写文件夹名称。',
    'Folder not found': '找不到该文件夹。',
    'Target folder does not exist': '目标文件夹不存在。',
    'Unsupported import source': '不支持此导入内容。',
    'Invalid JSON format – expected an array or store object': '备份格式无效，请选择提示词数组或完整备份对象。',
    'Loading changelog…': '正在加载更新日志…',
    'Could not load changelog.': '更新日志加载失败。',
    'Chinese changelog unavailable. Showing English.': '中文更新日志暂不可用，以下显示英文原文。',
    'Retry': '重试',
    'Import failed. Please try again.': '导入失败，请重试。',
    'Could not save language preference.': '语言设置保存失败，请重试。',
  };

  const DYNAMIC_PATTERNS = [
    { re: /^Remove tag "(.+)" from all prompts\?$/, zh: m => `从所有提示词中移除标签“${m[1]}”？` },
    { re: /^Reorder tag (.+)$/, zh: m => `调整标签“${m[1]}”的顺序` },
    { re: /^Remove tag (.+) from all prompts$/, zh: m => `从所有提示词中移除标签“${m[1]}”` },
    { re: /^Delete prompt "(.+)"\?$/, zh: m => `删除提示词“${m[1]}”？` },
    { re: /^Delete "(.+)"\?$/, zh: m => `删除提示词“${m[1]}”？` },
    { re: /^Remove access to (.+)\?$/, zh: m => `移除对 ${m[1]} 的访问权限？` },
    { re: /^Remove access to (.+)$/, zh: m => `移除对 ${m[1]} 的访问权限` },
    { re: /^Permission denied for (.+)\. Allow site access in the Chrome prompt to continue\.$/, zh: m => `请在浏览器权限提示中允许访问 ${m[1]}，然后重试。` },
    { re: /^Could not request permission for (.+): (.+)$/, zh: m => `无法请求 ${m[1]} 的访问权限：${m[2]}` },
    { re: /^Reset input field on (.+) — click to re-pick$/, zh: m => `重新选择 ${m[1]} 的输入框` },
    { re: /^Reset auto-detected input on (.+) — click to re-pick$/, zh: m => `重新选择 ${m[1]} 自动识别的输入框` },
    { re: /^Pick the input field on (.+)$/, zh: m => `选择 ${m[1]} 的输入框` },
    { re: /^Open (.+)$/, zh: m => `打开 ${m[1]}` },
    { re: /^Activate (.+)$/, zh: m => `启用 ${m[1]}` },
    { re: /^(.+) icon$/, zh: m => `${m[1]} 图标` },
    { re: /^(.+) value$/, zh: m => `${m[1]} 的值` },
    { re: /^Could not share this prompt \((.+)\)\. Try again\.$/, zh: m => `分享失败（${m[1]}），请重试。` },
    { re: /^Custom website removed for (.+)$/, zh: m => `已移除 ${m[1]} 的自定义输入框设置` },
  ];

  const listeners = new Set();
  let preference = 'auto';
  let revision = 0;

  function browserLanguage() {
    let language = '';
    try { language = globalThis.chrome?.i18n?.getUILanguage?.() || ''; } catch (_) { /* fallback */ }
    return language || globalThis.navigator?.language || 'en';
  }

  function resolveLanguage(value) {
    if (value === 'en' || value === 'zh-CN') return value;
    return browserLanguage().toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }

  let activeLanguage = resolveLanguage(preference);

  function translate(value, language = activeLanguage) {
    if (language !== 'zh-CN' || typeof value !== 'string' || !value.trim()) return value;
    const trimmed = value.trim();
    const key = trimmed.replace(/\s+/g, ' ');
    let translated = Object.hasOwn(ZH_CN, key) ? ZH_CN[key] : undefined;
    if (translated === undefined) {
      for (const pattern of DYNAMIC_PATTERNS) {
        const match = trimmed.match(pattern.re);
        if (match) { translated = pattern.zh(match); break; }
      }
    }
    if (typeof translated !== 'string' || translated === trimmed) return value;
    const start = value.indexOf(trimmed);
    return value.slice(0, start) + translated + value.slice(start + trimmed.length);
  }

  function acceptPreference(value) {
    const next = SUPPORTED.has(value) ? value : 'auto';
    const language = resolveLanguage(next);
    if (preference === next && activeLanguage === language) return;
    preference = next;
    activeLanguage = language;
    for (const listener of [...listeners]) {
      try { listener(activeLanguage); } catch (error) { console.error('[OPM i18n]', error); }
    }
  }

  async function setLanguage(value) {
    const next = SUPPORTED.has(value) ? value : 'auto';
    const writeRevision = ++revision;
    if (globalThis.chrome?.storage?.local) {
      await chrome.storage.local.set({ [LANGUAGE_KEY]: next });
    }
    if (revision === writeRevision) acceptPreference(next);
  }

  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, LANGUAGE_KEY)) return;
    revision += 1;
    acceptPreference(changes[LANGUAGE_KEY].newValue);
  });

  const initialRevision = revision;
  const ready = (async () => {
    try {
      const stored = await globalThis.chrome?.storage?.local?.get([LANGUAGE_KEY]);
      if (revision === initialRevision) acceptPreference(stored?.[LANGUAGE_KEY]);
    } catch (error) {
      console.warn('[OPM i18n] Using browser language:', error);
    }
  })();

  globalThis.OPMI18n = {
    ready,
    t: translate,
    getLanguage: () => activeLanguage,
    getPreference: () => preference,
    resolveLanguage,
    setLanguage,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    alert: message => globalThis.alert(translate(String(message))),
    confirm: message => globalThis.confirm(translate(String(message))),
  };
})();

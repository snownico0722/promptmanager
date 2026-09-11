import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
const source = execFileSync('git', ['show', '73664609718100a9c07f4673cf0663ce9333106b:src/i18n.js'], {encoding:'utf8'});
const dictionary = source.split('  const ZH_CN = ')[1].split('\n\n  const DYNAMIC_PATTERNS')[0].trim().replace(/;$/, '');
const d = vm.runInNewContext('(' + dictionary + ')');
Object.assign(d, {
  'Simple Prompt Manager': 'Open Prompt Manager',
  'Open Prompt Manager': 'Open Prompt Manager',
  'Enter your prompt here - Use #variablename# for dynamic values.': '输入提示词，可用 #name# 插入变量。',
  'Write your prompt. Use hashtags for #variables#': '输入提示词，可用 #name# 插入变量。',
  'Enter prompt. # for #variables#': '输入提示词，可用 #name# 插入变量。',
  'Variable names can contain letters, numbers and underscores.': '变量名仅支持英文字母、数字和下划线，例如 #name#。',
  'Save new prompt': '保存为提示词', 'Update': '保存更改', 'Submit': '插入提示词',
  'Enter tags here.': '输入标签，按回车添加',
  'Add your supported Assistants below to get started.': '请先在下方启用一个 AI 助手。',
  'Open prompt list buttons': '打开提示词列表',
  'Open / close prompt list (set in Settings)': '打开或关闭提示词列表（可在设置中修改）',
  'Open / close panel': '打开或关闭面板', 'Open / close shortcut': '打开或关闭面板的快捷键',
  'Press keys… (Esc to cancel)': '请按下组合键…（Esc 取消）', 'Press keys…': '请按下组合键…',
  'Listening…': '等待按键…', 'Hot corner': '右下角热区',
  'Choose how prompts open on assistant pages. Sidebar or shortcut uses the Chrome side panel or your keyboard shortcut only.': '选择提示词面板的打开方式。“侧边栏或快捷键”不会在网页中显示悬浮按钮或热区。',
  'Append prompts to text': '追加到已有文本',
  'Drag to reorder tags. Remove a tag from every prompt.': '拖动可调整标签顺序。移除标签会同时从所有提示词中移除。',
  'No tags yet — add tags when creating or editing prompts.': '暂无标签，可在新建或编辑提示词时添加。',
  'Export started — check your downloads folder.': '已开始导出，请查看下载文件夹。',
  'Import successful — prompts merged.': '导入成功，已与现有提示词合并。',
  'Import failed — invalid JSON file.': '导入失败，请选择有效的 JSON 备份文件。',
  'Permissions editor': '网站权限',
  'Sites where the extension can inject prompts.': '扩展可以在以下网站中填入提示词。',
  'Open Source & Forever Simple.': '保持开源，保持简单。',
  'Available everywhere you need it': '随处可用',
  'Hot Corner, variables, context menu, tags, and more.': '支持右下角热区、变量、右键菜单和标签等功能。',
  'Open the Chrome side panel or use your keyboard shortcut — no on-page launcher.': '通过浏览器侧边栏或快捷键打开，不在网页中显示启动按钮。',
  'Browse and import from the Open Prompt Database.': '浏览 Open Prompt Database 社区提示词库并导入提示词。',
  'Enable sharing': '启用公开分享', 'Publish prompts': '允许发布提示词',
  'Publish prompts you choose to the catalog.': '将你选择的提示词公开发布到社区提示词库。',
  'Share your prompts to the catalog when you are ready.': '可以将你选择的提示词公开发布到社区提示词库。',
  'Handle': '发布用户名', 'handle': '发布用户名', 'Suggest': '随机生成', 'Suggest handle': '随机生成用户名',
  'Your public name on the catalog. Locked in after your first upload.': '在社区提示词库中公开显示的用户名，确认注册后不可修改。',
  'Your public name on the catalog. Cannot be changed after registration.': '在社区提示词库中公开显示的用户名，确认注册后不可修改。',
  'Use Add to Open Prompt Manager on the website.': '点击网站上的“Add to Open Prompt Manager”即可导入。',
  'Enable catalog import': '启用社区导入', 'Import enabled': '已启用社区导入', 'Browse catalog': '浏览社区提示词库',
  'Needed for one-click import on the site.': '授权后，可在社区网站上一键导入提示词。',
  '— how local storage and catalog sharing work.': '——了解本地存储与公开分享的规则。',
  'Privacy policy — how local storage and catalog sharing work.': '隐私政策——了解本地存储与公开分享的规则。',
  'Catalog access is required to check handles.': '请先允许访问社区网站，才能检查用户名。',
  'Could not check that handle. Try again.': '用户名检查失败，请重试。',
  'Unavailable — try another.': '该用户名不可用，请换一个。',
  'Catalog access is required to register a handle.': '请先允许访问社区网站，才能注册用户名。',
  'Could not confirm.': '注册失败，请重试。', 'Permission denied.': '未授予访问权限。',
  'Set a publisher handle in Open Prompt Database settings before sharing.': '请先在社区设置中注册发布用户名，再分享提示词。',
  'Catalog access is required to share. Grant permission and try again.': '分享需要访问社区网站，请授权后重试。',
  'Sharing is turned off in Open Prompt Database settings.': '社区设置中已关闭分享。',
  'Could not reach the catalog. Check your connection and try again.': '无法连接社区提示词库，请检查网络后重试。',
  'Could not register a publisher handle. Try again from Open Prompt Database settings.': '用户名注册失败，请在社区设置中重试。',
  'Publisher identity is missing. Toggle sharing off and on in settings, then retry.': '缺少发布者身份信息。请在社区设置中关闭分享后重新开启，再重试。',
  'This catalog id is owned by another publisher.': '这条社区提示词属于其他发布者。',
  'Could not reach openpromptdatabase.com. Grant catalog access and try again.': '无法连接社区网站 openpromptdatabase.com，请确认已授权后重试。',
  'Share verification failed. Try again in a moment.': '分享验证失败，请稍后重试。',
  'Choose an input field to load prompts into': '点击要填入提示词的输入框',
  'Cancel input picker': '取消选择输入框', 'Could not pin this input': '无法设置此输入框',
  'Click the input field on the page': '请点击页面中的输入框', 'Example Prompt': '示例提示词',
  'Enter a title for your prompt': '请输入提示词标题', 'Please add a title to your prompt.': '请填写提示词标题。',
  'Untitled prompt': '未命名提示词',
  'Title & content are required': '请填写标题和提示词正文。', 'Prompt not found': '找不到这条提示词。',
  'Folder name is required': '请填写文件夹名称。', 'Folder not found': '找不到该文件夹。',
  'Target folder does not exist': '目标文件夹不存在。', 'Unsupported import source': '不支持此导入内容。',
  'Invalid JSON format – expected an array or store object': '备份格式无效，请选择提示词数组或完整备份对象。',
  'Loading changelog…': '正在加载更新日志…', 'Could not load changelog.': '更新日志加载失败。',
  'Chinese changelog unavailable. Showing English.': '中文更新日志暂不可用，以下显示英文原文。', 'Retry': '重试',
  'Import failed. Please try again.': '导入失败，请重试。',
  'Could not save language preference.': '语言设置保存失败，请重试。',
});
const quote = s => "'" + s.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n') + "'";
const preamble = `// Shared language state and messages for extension pages, content scripts and the worker.
// Classic-script compatible; loading this file never touches DOM or browser globals.
(() => {
  'use strict';
  if (globalThis.OPMI18n) return;
  const LANGUAGE_KEY = 'uiLanguage';
  const SUPPORTED = new Set(['auto', 'en', 'zh-CN']);
  const ZH_CN = {
`;
let patterns = source.split('  const DYNAMIC_PATTERNS = ')[1].split('\n\n  const TRANSLATABLE_ATTRIBUTES')[0].trim();
patterns = patterns.replace('/^Open ([A-Za-z0-9_.:-]+)$/', '/^Open (.+)$/')
  .replace('`调整标签 ${m[1]} 的顺序`', '`调整标签“${m[1]}”的顺序`')
  .replace('`从所有提示词中移除标签 ${m[1]}`', '`从所有提示词中移除标签“${m[1]}”`')
  .replace('`删除“${m[1]}”？`', '`删除提示词“${m[1]}”？`')
  .replace('`未授予 ${m[1]} 的网站权限。请在 Chrome 权限提示中允许访问后继续。`', '`请在浏览器权限提示中允许访问 ${m[1]}，然后重试。`')
  .replace('`无法请求 ${m[1]} 的权限：${m[2]}`', '`无法请求 ${m[1]} 的访问权限：${m[2]}`')
  .replace('`重置 ${m[1]} 的输入框——点击重新选择`', '`重新选择 ${m[1]} 的输入框`')
  .replace('`重置 ${m[1]} 自动识别的输入框——点击重新选择`', '`重新选择 ${m[1]} 自动识别的输入框`')
  .replace('`无法分享该提示词（${m[1]}），请重试。`', '`分享失败（${m[1]}），请重试。`')
  .replace(/\s*\];$/, '\n    { re: /^Custom website removed for (.+)$/, zh: m => `已移除 ${m[1]} 的自定义输入框设置` },\n  ];');
fs.writeFileSync('src/i18n-core.js', preamble + Object.entries(d).map(([k,v]) => '    ' + quote(k) + ': ' + quote(v) + ',\n').join('') + '  };\n\n  const DYNAMIC_PATTERNS = ' + patterns + '\n' + fs.readFileSync('.review-payload/core-tail.js','utf8'));

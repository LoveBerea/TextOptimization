import { createScriptIdDiv, teleportStyle } from '@util/script';
import 配置界面 from './配置界面.vue';
import 对比界面 from './对比界面.vue';
import { extractText, optimizeText, applyOptimization } from './optimizer';
import { useSettingsStore } from './settings';
import { currentTask } from './state';

/** 配置面板挂载点 */
let $configApp: JQuery<HTMLDivElement>;
let configApp: ReturnType<typeof createApp>;
let configStyleDestroy: () => void;

/** 对比界面挂载点 */
let $compareApp: JQuery<HTMLDivElement>;
let compareApp: ReturnType<typeof createApp>;
let compareStyleDestroy: () => void;

// ==================== 加载 ====================

$(() => {
  const pinia = createPinia();

  // ---- 挂载配置面板到扩展设置区域 ----
  configApp = createApp(配置界面).use(pinia);
  $configApp = createScriptIdDiv().appendTo('#extensions_settings2');
  configApp.mount($configApp[0]);
  configStyleDestroy = teleportStyle().destroy;

  // ---- 挂载对比界面到 body ----
  compareApp = createApp(对比界面).use(pinia);
  $compareApp = createScriptIdDiv().appendTo('body');
  compareApp.mount($compareApp[0]);
  compareStyleDestroy = teleportStyle().destroy;

  // ---- 注册脚本按钮 ----
  replaceScriptButtons([
    { name: '优化', visible: true },
    { name: '配置', visible: true },
    { name: '确认', visible: true },
    { name: '取消', visible: true },
  ]);

  // ---- 绑定按钮事件 ----
  eventOn(getButtonEvent('优化'), () => errorCatched(handleOptimize)());
  eventOn(getButtonEvent('配置'), () => errorCatched(handleConfigToggle)());
  eventOn(getButtonEvent('确认'), () => errorCatched(handleConfirm)());
  eventOn(getButtonEvent('取消'), () => errorCatched(handleCancel)());

  console.info('[文本优化] 脚本已加载');
});

// ==================== 卸载 ====================

$(window).on('pagehide', () => {
  configApp?.unmount();
  $configApp?.remove();
  configStyleDestroy?.();

  compareApp?.unmount();
  $compareApp?.remove();
  compareStyleDestroy?.();

  console.info('[文本优化] 脚本已卸载');
});

// ==================== 按钮事件处理 ====================

/** "优化"按钮：获取最新楼层，正则提取，调用 AI，弹出对比界面 */
async function handleOptimize() {
  if (currentTask.value?.loading) {
    toastr.warning('已有优化任务进行中，请等待完成', '文本优化');
    return;
  }

  // 获取最新楼层
  const messageId = getLastMessageId();
  const messages = getChatMessages(messageId);
  if (!messages.length) {
    toastr.error('未找到楼层消息', '文本优化');
    return;
  }

  const message = messages[0]!;
  const store = useSettingsStore();
  const config = store.activeConfig;

  // 正则提取
  const extract = extractText(message.message, config.regex);
  if (!extract.matched) {
    toastr.warning('正则表达式未匹配到任何文本，请检查配置', '文本优化');
    return;
  }

  // 创建优化任务，触发对比界面显示
  currentTask.value = {
    messageId: message.message_id,
    fullMessage: message.message,
    extract,
    optimizedText: null,
    loading: true,
    error: null,
  };

  // 调用 AI
  try {
    const result = await optimizeText(extract.originalText, config, store.activePrompt);
    if (currentTask.value) {
      currentTask.value.optimizedText = result;
    }
  } catch (err: any) {
    console.error('[文本优化] AI 调用失败:', err);
    if (currentTask.value) {
      currentTask.value.error = err?.message ?? 'AI 调用失败';
    }
  } finally {
    if (currentTask.value) {
      currentTask.value.loading = false;
    }
  }
}

/** "配置"按钮：折叠/展开配置面板并滚动到可见位置 */
function handleConfigToggle() {
  const $drawer = $configApp.find('.inline-drawer');
  if (!$drawer.length) return;

  const $content = $drawer.find('.inline-drawer-content');
  const $icon = $drawer.find('.inline-drawer-icon');

  if ($content.is(':hidden')) {
    $content.show();
    $icon.removeClass('fa-circle-chevron-down down').addClass('fa-circle-chevron-up up');
  } else {
    $content.hide();
    $icon.removeClass('fa-circle-chevron-up up').addClass('fa-circle-chevron-down down');
  }

  $configApp[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** "确认"按钮：替换楼层文本 */
async function handleConfirm() {
  const task = currentTask.value;
  if (!task || task.loading || task.optimizedText === null || task.error) {
    toastr.info('没有可确认的优化结果', '文本优化');
    return;
  }

  try {
    const store = useSettingsStore();
    const config = store.activeConfig;
    await applyOptimization(task.messageId, task.fullMessage, task.optimizedText, config.regex);
    toastr.success(`楼层 #${task.messageId} 文本已替换`, '文本优化');
    currentTask.value = null;
  } catch (err: any) {
    console.error('[文本优化] 替换失败:', err);
    toastr.error(err?.message ?? '替换失败', '文本优化');
  }
}

/** "取消"按钮：关闭对比界面 */
function handleCancel() {
  if (!currentTask.value) {
    toastr.info('没有进行中的优化任务', '文本优化');
    return;
  }
  currentTask.value = null;
}

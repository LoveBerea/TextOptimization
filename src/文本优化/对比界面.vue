<template>
  <Transition name="text-optimizer_fade">
    <div v-if="task" class="text-optimizer_overlay" @click.self="onCancel">
      <div class="text-optimizer_modal">
        <!-- 标题栏 -->
        <div class="text-optimizer_header">
          <div class="text-optimizer_title">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            文本优化 — 楼层 #{{ task.messageId }}
          </div>
          <div class="menu_button text-optimizer_close-btn" @click="onCancel" title="关闭">
            <i class="fa-solid fa-xmark"></i>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="task.loading" class="text-optimizer_loading">
          <div class="text-optimizer_spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <div class="text-optimizer_loading-text">正在调用 AI 优化文本…</div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="task.error" class="text-optimizer_error">
          <div class="text-optimizer_error-icon">
            <i class="fa-solid fa-circle-exclamation"></i>
          </div>
          <div class="text-optimizer_error-text">{{ task.error }}</div>
          <div class="menu_button text-optimizer_retry-btn" @click="onRetry">
            <i class="fa-solid fa-rotate-right"></i> 重试
          </div>
        </div>

        <!-- 对比内容 -->
        <div v-else-if="task.optimizedText !== null" class="text-optimizer_compare">
          <div class="text-optimizer_column">
            <div class="text-optimizer_column-header">
              <i class="fa-solid fa-file-lines"></i> 原文
            </div>
            <pre class="text-optimizer_text-block text-optimizer_text-block--original">{{ task.extract.originalText }}</pre>
          </div>
          <div class="text-optimizer_divider"></div>
          <div class="text-optimizer_column">
            <div class="text-optimizer_column-header">
              <i class="fa-solid fa-pen-fancy"></i> 优化后
            </div>
            <pre class="text-optimizer_text-block text-optimizer_text-block--optimized">{{ task.optimizedText }}</pre>
          </div>
        </div>

        <!-- 空状态（不应出现，作为兜底） -->
        <div v-else class="text-optimizer_empty">
          <div class="text-optimizer_empty-icon">
            <i class="fa-solid fa-inbox"></i>
          </div>
          <div class="text-optimizer_empty-text">暂无优化结果</div>
        </div>

        <!-- 底部操作栏 -->
        <div class="text-optimizer_footer">
          <div
            class="menu_button text-optimizer_btn text-optimizer_btn--confirm"
            :class="{ 'text-optimizer_btn--disabled': task.loading || task.optimizedText === null || !!task.error }"
            @click="onConfirm"
          >
            <i class="fa-solid fa-check"></i> 确认替换
          </div>
          <div
            class="menu_button text-optimizer_btn text-optimizer_btn--cancel"
            @click="onCancel"
          >
            <i class="fa-solid fa-xmark"></i> 取消
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { applyOptimization, optimizeText } from './optimizer';
import { useSettingsStore } from './settings';
import { currentTask } from './state';

const store = useSettingsStore();

/** 当前优化任务（来自共享状态，由 index.ts 写入） */
const task = currentTask;

/** 关闭浮层 */
function close() {
  task.value = null;
}

/** 确认：替换楼层原文 */
async function onConfirm() {
  if (!task.value || task.value.loading || task.value.optimizedText === null || task.value.error) return;

  try {
    const config = store.activeConfig;
    await applyOptimization(
      task.value.messageId,
      task.value.fullMessage,
      task.value.optimizedText,
      config.regex,
    );
    toastr.success(`楼层 #${task.value.messageId} 文本已替换`, '文本优化');
    close();
  } catch (err: any) {
    console.error('[文本优化] 替换失败:', err);
    toastr.error(err?.message ?? '替换失败', '文本优化');
  }
}

/** 取消：关闭浮层 */
function onCancel() {
  close();
}

/** 重试：重新调用 AI */
async function onRetry() {
  if (!task.value) return;

  task.value.loading = true;
  task.value.error = null;
  task.value.optimizedText = null;

  try {
    const config = store.activeConfig;
    const result = await optimizeText(task.value.extract.originalText, config);
    task.value.optimizedText = result;
  } catch (err: any) {
    console.error('[文本优化] 重试失败:', err);
    task.value.error = err?.message ?? 'AI 调用失败';
  } finally {
    task.value.loading = false;
  }
}
</script>

<style scoped>
/* 遮罩层 */
.text-optimizer_overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}

/* 模态框 */
.text-optimizer_modal {
  width: 90vw;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 1px solid rgba(104, 117, 137, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

/* 标题栏 */
.text-optimizer_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(104, 117, 137, 0.2);
  background: rgba(22, 33, 62, 0.6);
}

.text-optimizer_title {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-optimizer_title i {
  color: #687589;
}

.text-optimizer_close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  border-radius: 6px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.text-optimizer_close-btn:hover {
  opacity: 1;
}

/* 对比区域 */
.text-optimizer_compare {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.text-optimizer_column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.text-optimizer_column-header {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #b0b0b0;
  border-bottom: 1px solid rgba(104, 117, 137, 0.15);
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-optimizer_column-header i {
  font-size: 12px;
  opacity: 0.6;
}

.text-optimizer_divider {
  width: 1px;
  background: rgba(104, 117, 137, 0.25);
}

/* 文本块 */
.text-optimizer_text-block {
  flex: 1;
  margin: 0;
  padding: 14px 16px;
  overflow-y: auto;
  font-family: 'PingFang-SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #e0e0e0;
  background: transparent;
}

.text-optimizer_text-block--original {
  color: #b0b0b0;
  background: rgba(0, 0, 0, 0.15);
}

.text-optimizer_text-block--optimized {
  color: #e0e0e0;
  background: rgba(76, 175, 80, 0.04);
}

/* 加载状态 */
.text-optimizer_loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 60px 20px;
  color: #b0b0b0;
}

.text-optimizer_spinner {
  font-size: 28px;
  color: #687589;
  animation: text-optimizer_spin 1.2s linear infinite;
}

@keyframes text-optimizer_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text-optimizer_loading-text {
  font-size: 14px;
  color: #b0b0b0;
}

/* 错误状态 */
.text-optimizer_error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}

.text-optimizer_error-icon {
  font-size: 32px;
  color: #f44336;
  opacity: 0.8;
}

.text-optimizer_error-text {
  font-size: 13px;
  color: #f44336;
  text-align: center;
  max-width: 400px;
  line-height: 1.5;
}

.text-optimizer_retry-btn {
  margin-top: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 空状态 */
.text-optimizer_empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: #b0b0b0;
}

.text-optimizer_empty-icon {
  font-size: 28px;
  opacity: 0.4;
}

.text-optimizer_empty-text {
  font-size: 13px;
  opacity: 0.6;
}

/* 底部操作栏 */
.text-optimizer_footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid rgba(104, 117, 137, 0.2);
  background: rgba(22, 33, 62, 0.4);
}

.text-optimizer_btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 6px;
  transition: all 0.2s;
}

.text-optimizer_btn--confirm {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.text-optimizer_btn--confirm:hover {
  background: rgba(76, 175, 80, 0.35);
}

.text-optimizer_btn--cancel {
  background: rgba(104, 117, 137, 0.15);
  color: #b0b0b0;
  border: 1px solid rgba(104, 117, 137, 0.2);
}

.text-optimizer_btn--cancel:hover {
  background: rgba(104, 117, 137, 0.3);
}

.text-optimizer_btn--disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* 过渡动画 */
.text-optimizer_fade-enter-active,
.text-optimizer_fade-leave-active {
  transition: opacity 0.25s ease;
}

.text-optimizer_fade-enter-from,
.text-optimizer_fade-leave-to {
  opacity: 0;
}
</style>

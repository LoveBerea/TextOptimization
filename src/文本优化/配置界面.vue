<template>
  <div class="text-optimizer-settings">
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header" @click="toggleDrawer">
        <b>📝 文本优化</b>
        <div
          class="inline-drawer-icon fa-solid"
          :class="drawerOpen ? 'fa-circle-chevron-up up' : 'fa-circle-chevron-down down'"
        ></div>
      </div>

      <div v-if="drawerOpen" class="inline-drawer-content">
        <!-- 配置槽位切换 -->
        <div class="text-optimizer_config-tabs">
          <div
            v-for="(_, idx) in settings.configs"
            :key="idx"
            class="menu_button text-optimizer_tab"
            :class="{ 'text-optimizer_tab--active': settings.active_config === idx }"
            @click="switchConfig(idx)"
          >
            {{ idx + 1 }}
          </div>
          <div
            v-if="settings.configs.length < 3"
            class="menu_button text-optimizer_tab text-optimizer_tab--add"
            @click="addConfig"
          >
            <i class="fa-solid fa-plus"></i>
          </div>
        </div>

        <!-- 当前配置编辑 -->
        <template v-if="currentConfig">
          <!-- 配置名称 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">配置名称</label>
            <input
              v-model="currentConfig.name"
              class="text_pole"
              type="text"
              placeholder="输入配置名称"
            />
          </div>

          <!-- AI 格式选择 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">AI 格式</label>
            <select v-model="currentConfig.format" class="text_pole" @change="onFormatChange">
              <option v-for="(preset, key) in AI_FORMAT_PRESETS" :key="key" :value="key">
                {{ preset.label }}
              </option>
            </select>
          </div>

          <!-- API 地址 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">API 地址</label>
            <input
              v-model="currentConfig.apiurl"
              class="text_pole"
              type="text"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>

          <!-- API 密钥 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">API 密钥</label>
            <div class="text-optimizer_key-row">
              <input
                v-model="currentConfig.key"
                class="text_pole"
                :type="showKey ? 'text' : 'password'"
                placeholder="sk-..."
              />
              <div
                class="menu_button text-optimizer_icon-btn"
                @click="showKey = !showKey"
                :title="showKey ? '隐藏密钥' : '显示密钥'"
              >
                <i class="fa-solid" :class="showKey ? 'fa-eye-slash' : 'fa-eye'"></i>
              </div>
            </div>
          </div>

          <!-- 模型名称 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">模型名称</label>
            <input
              v-model="currentConfig.model"
              class="text_pole"
              type="text"
              placeholder="gpt-4o-mini"
            />
          </div>

          <hr class="sysHR" />

          <!-- 正则表达式 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">
              正则表达式
              <span class="text-optimizer_hint" title="用于从楼层消息中提取待优化文本&#10;如有捕获组则只提取捕获组1的内容&#10;例如: /(.+)/s 匹配全部文本">ℹ️</span>
            </label>
            <input
              v-model="currentConfig.regex"
              class="text_pole"
              type="text"
              placeholder="/(.+)/s"
            />
          </div>

          <!-- 优化提示词 -->
          <div class="text-optimizer_field">
            <label class="text-optimizer_label">优化提示词</label>
            <textarea
              v-model="currentConfig.prompt"
              class="text_pole text-optimizer_textarea"
              rows="3"
              placeholder="请优化以下文本，保持原意和风格，使表达更加流畅自然："
            ></textarea>
          </div>

          <!-- 删除配置按钮（至少保留1个） -->
          <div v-if="settings.configs.length > 1" class="text-optimizer_actions">
            <div class="menu_button text-optimizer_delete-btn" @click="removeCurrentConfig">
              <i class="fa-solid fa-trash"></i> 删除此配置
            </div>
          </div>
        </template>

        <hr class="sysHR" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { AI_FORMAT_PRESETS, useSettingsStore } from './settings';
import type { AIFormatKey } from './settings';

const store = useSettingsStore();
const { settings } = storeToRefs(store);

const drawerOpen = ref(true);
const showKey = ref(false);

/** 当前正在编辑的配置对象（响应式引用） */
const currentConfig = computed(() => {
  const idx = settings.value.active_config;
  return settings.value.configs[idx] ?? null;
});

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value;
}

function switchConfig(idx: number) {
  store.switchConfig(idx);
}

function addConfig() {
  store.addConfig();
  showKey.value = false;
}

function removeCurrentConfig() {
  if (settings.value.configs.length <= 1) return;
  store.removeConfig(settings.value.active_config);
}

/** 切换 AI 格式时自动填充对应的 API 地址 */
function onFormatChange() {
  const format = currentConfig.value?.format as AIFormatKey | undefined;
  if (format) {
    store.applyFormatPreset(format, settings.value.active_config);
  }
}
</script>

<style scoped>
.text-optimizer-settings {
  font-size: 13px;
}

/* 配置槽位标签页 */
.text-optimizer_config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.text-optimizer_tab {
  flex: 1;
  text-align: center;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}

.text-optimizer_tab--active {
  background-color: rgba(104, 117, 137, 0.4);
  color: #e0e0e0;
  font-weight: 600;
}

.text-optimizer_tab--add {
  flex: 0 0 32px;
  font-size: 12px;
}

/* 表单字段 */
.text-optimizer_field {
  margin-bottom: 10px;
}

.text-optimizer_label {
  display: block;
  margin-bottom: 3px;
  font-weight: 500;
  font-size: 12px;
  color: #b0b0b0;
}

.text-optimizer_hint {
  cursor: help;
  opacity: 0.6;
  font-size: 11px;
  margin-left: 4px;
}

.text-optimizer_hint:hover {
  opacity: 1;
}

/* 密钥行 */
.text-optimizer_key-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.text-optimizer_key-row .text_pole {
  flex: 1;
}

.text-optimizer_icon-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 13px;
}

/* 文本域 */
.text-optimizer_textarea {
  min-height: 60px;
  resize: vertical;
  line-height: 1.5;
}

/* 操作区 */
.text-optimizer_actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.text-optimizer_delete-btn {
  font-size: 12px;
  color: #f44336;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.text-optimizer_delete-btn:hover {
  opacity: 1;
}
</style>

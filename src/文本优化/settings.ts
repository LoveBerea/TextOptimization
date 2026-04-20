/** AI 接口格式预设模板 */
export const AI_FORMAT_PRESETS = {
  openai: {
    label: 'OpenAI 兼容',
    source: 'openai' as const,
    apiurl: 'https://api.openai.com/v1/chat/completions',
  },
  deepseek: {
    label: 'DeepSeek',
    source: 'openai' as const,
    apiurl: 'https://api.deepseek.com/v1/chat/completions',
  },
  gemini: {
    label: 'Gemini',
    source: 'google' as const,
    apiurl: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  kimi: {
    label: 'Kimi',
    source: 'openai' as const,
    apiurl: 'https://api.moonshot.cn/v1/chat/completions',
  },
} as const;

export type AIFormatKey = keyof typeof AI_FORMAT_PRESETS;

/** 单套 AI 配置 */
const AIConfigSchema = z.object({
  /** 配置名称 */
  name: z.string().default('默认配置'),
  /** AI 格式类型 */
  format: z.enum(['openai', 'deepseek', 'gemini', 'kimi']).default('openai'),
  /** API 地址 */
  apiurl: z.string().default('https://api.openai.com/v1/chat/completions'),
  /** API 密钥 */
  key: z.string().default(''),
  /** 模型名称 */
  model: z.string().default('gpt-4o-mini'),
  /** 用于提取待优化文本的正则表达式 */
  regex: z.string().default('/(.+)/s'),
  /** 发送给 AI 的优化提示词 */
  prompt: z.string().default('请优化以下文本，保持原意和风格，使表达更加流畅自然：'),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

/** 全局设置 */
const SettingsSchema = z
  .object({
    /** 最多3套配置方案 */
    configs: z.array(AIConfigSchema).min(1).max(3).default([
      AIConfigSchema.parse({}),
    ]),
    /** 当前激活的配置索引 (0-2) */
    active_config: z.number().min(0).max(2).default(0),
  })
  .prefault({});

export type Settings = z.infer<typeof SettingsSchema>;

export const useSettingsStore = defineStore('text-optimizer-settings', () => {
  const settings = ref(Settings.parse(getVariables({ type: 'script', script_id: getScriptId() })));

  watchEffect(() => {
    insertOrAssignVariables(klona(settings.value), { type: 'script', script_id: getScriptId() });
  });

  /** 获取当前激活的配置 */
  const activeConfig = computed(() => {
    const idx = settings.value.active_config;
    return settings.value.configs[idx] ?? settings.value.configs[0]!;
  });

  /** 切换激活配置 */
  function switchConfig(index: number) {
    if (index >= 0 && index < settings.value.configs.length) {
      settings.value.active_config = index;
    }
  }

  /** 更新指定索引的配置 */
  function updateConfig(index: number, patch: Partial<AIConfig>) {
    if (index >= 0 && index < settings.value.configs.length) {
      Object.assign(settings.value.configs[index]!, patch);
    }
  }

  /** 新增一个配置槽位（最多3个） */
  function addConfig() {
    if (settings.value.configs.length < 3) {
      const newConfig = AIConfigSchema.parse({
        name: `配置${settings.value.configs.length + 1}`,
      });
      settings.value.configs.push(newConfig);
      settings.value.active_config = settings.value.configs.length - 1;
    }
  }

  /** 删除指定索引的配置（至少保留1个） */
  function removeConfig(index: number) {
    if (settings.value.configs.length <= 1) return;
    settings.value.configs.splice(index, 1);
    if (settings.value.active_config >= settings.value.configs.length) {
      settings.value.active_config = settings.value.configs.length - 1;
    }
  }

  /** 根据格式预设自动填充 API 地址和 source */
  function applyFormatPreset(format: AIFormatKey, configIndex: number) {
    const preset = AI_FORMAT_PRESETS[format];
    if (preset && configIndex >= 0 && configIndex < settings.value.configs.length) {
      const cfg = settings.value.configs[configIndex]!;
      cfg.format = format;
      cfg.apiurl = preset.apiurl;
    }
  }

  return {
    settings,
    activeConfig,
    switchConfig,
    updateConfig,
    addConfig,
    removeConfig,
    applyFormatPreset,
  };
});

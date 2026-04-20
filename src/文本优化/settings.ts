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

/**
 * 默认提示词预设
 * prompt1：风格润色——保留语气、修正措辞
 * prompt2：创意扩写——丰富细节与氛围感
 */
export const DEFAULT_PROMPT_1 =
  `你是一位专业的文字润色师。请对以下文本进行润色优化，要求：
1. 保持原文的核心含义、情感基调与人称视角不变
2. 修正语病、冗余表达与不自然的措辞
3. 提升句子的节奏感与可读性
4. 不添加原文中不存在的情节或信息
5. 直接输出优化后的文本，不附加任何说明

待优化文本：`;

export const DEFAULT_PROMPT_2 =
  `你是一位富有想象力的创意写手。请在保留原文核心情节的基础上，对以下文本进行扩写润色，要求：
1. 丰富场景细节、感官描写与人物心理
2. 增强氛围感与沉浸感，使文字更具画面感
3. 保持原文的人称视角与情感走向
4. 扩写后长度约为原文的 1.5～2 倍
5. 直接输出扩写后的文本，不附加任何说明

待扩写文本：`;

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
  /** 优化提示词 1（风格润色） */
  prompt1: z.string().default(DEFAULT_PROMPT_1),
  /** 优化提示词 2（创意扩写） */
  prompt2: z.string().default(DEFAULT_PROMPT_2),
  /** 当前使用哪套提示词 (0=prompt1, 1=prompt2) */
  active_prompt: z.number().min(0).max(1).default(0),
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
    const cfg = settings.value.configs[idx] ?? settings.value.configs[0]!;
    return cfg;
  });

  /** 获取当前激活配置中正在使用的提示词文本 */
  const activePrompt = computed(() => {
    const cfg = activeConfig.value;
    return cfg.active_prompt === 1 ? cfg.prompt2 : cfg.prompt1;
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
    activePrompt,
    switchConfig,
    updateConfig,
    addConfig,
    removeConfig,
    applyFormatPreset,
  };
});

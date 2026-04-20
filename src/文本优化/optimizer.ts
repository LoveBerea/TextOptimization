import { regexFromString } from '@util/common';
import { AI_FORMAT_PRESETS, type AIConfig } from './settings';

/** 正则提取结果 */
export interface ExtractResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 正则匹配到的原始文本 */
  originalText: string;
  /** 匹配文本在 message 之前的部分 */
  before: string;
  /** 匹配文本在 message 之后的部分 */
  after: string;
}

/** 优化任务状态（供对比界面使用） */
export interface OptimizeTask {
  /** 楼层号 */
  messageId: number;
  /** 原始完整消息 */
  fullMessage: string;
  /** 正则提取结果 */
  extract: ExtractResult;
  /** AI 优化后的文本（异步填充） */
  optimizedText: string | null;
  /** 是否正在请求 AI */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 从楼层消息中用正则提取待优化文本
 *
 * @param message 楼层的 message 字段
 * @param regexStr 正则表达式字符串，如 `/(.+)/s` 或 `/"([^"]+)"/g`
 * @returns 提取结果，包含匹配文本及其前后上下文
 */
export function extractText(message: string, regexStr: string): ExtractResult {
  const regex = regexFromString(regexStr);
  if (!regex) {
    console.warn(`[文本优化] 正则表达式无效: ${regexStr}`);
    return { matched: false, originalText: '', before: message, after: '' };
  }

  // 使用带 g 标志的正则进行全文匹配
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  const match = globalRegex.exec(message);

  if (!match) {
    return { matched: false, originalText: '', before: message, after: '' };
  }

  const matchedText = match[1] ?? match[0]; // 优先使用捕获组1，否则使用整个匹配
  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;

  return {
    matched: true,
    originalText: matchedText,
    before: message.substring(0, matchStart),
    after: message.substring(matchEnd),
  };
}

/**
 * 调用 AI 优化文本
 *
 * 使用 generateRaw + custom_api，不携带酒馆预设，仅发送用户配置的提示词和待优化文本。
 *
 * @param text 待优化的文本
 * @param config 当前激活的 AI 配置
 * @param prompt 当前激活的提示词文本（来自 config.prompt1 或 config.prompt2）
 * @returns AI 返回的优化后文本
 */
export async function optimizeText(text: string, config: AIConfig, prompt: string): Promise<string> {
  const preset = AI_FORMAT_PRESETS[config.format];
  if (!preset) {
    throw new Error(`未知的 AI 格式: ${config.format}`);
  }

  if (!config.key) {
    throw new Error('API 密钥未配置，请在配置面板中填写');
  }

  if (!config.model) {
    throw new Error('模型名称未配置，请在配置面板中填写');
  }

  console.info(`[文本优化] 调用 ${preset.label} API, 模型: ${config.model}`);

  const result = await generateRaw({
    custom_api: {
      apiurl: config.apiurl,
      key: config.key,
      model: config.model,
      source: preset.source,
    },
    should_silence: true,
    ordered_prompts: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
  });

  if (typeof result !== 'string') {
    // generateRaw 返回了 tool_call 结果，不应该发生（未配置 tools）
    console.warn('[文本优化] AI 返回了非文本结果，尝试提取 content');
    return (result as any).content ?? text;
  }

  return result.trim();
}

/**
 * 将优化后的文本替换回楼层消息
 *
 * 用正则重新匹配原文，将匹配部分替换为优化文本，保留前后上下文不变。
 *
 * @param messageId 楼层号
 * @param originalMessage 原始完整消息
 * @param optimizedText AI 优化后的文本
 * @param regexStr 正则表达式字符串
 */
export async function applyOptimization(
  messageId: number,
  originalMessage: string,
  optimizedText: string,
  regexStr: string,
): Promise<void> {
  const regex = regexFromString(regexStr);
  if (!regex) {
    throw new Error(`正则表达式无效: ${regexStr}`);
  }

  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  const match = globalRegex.exec(originalMessage);

  if (!match) {
    throw new Error('正则匹配失败，无法替换文本');
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;

  // 判断原始匹配是捕获组还是整体匹配
  const hasCaptureGroup = match[1] !== undefined;
  let newMessage: string;

  if (hasCaptureGroup) {
    // 如果正则有捕获组，只替换捕获组部分，保留捕获组外的前后缀
    const captureStart = match.index + match[0].indexOf(match[1]);
    const captureEnd = captureStart + match[1].length;
    newMessage = originalMessage.substring(0, captureStart) + optimizedText + originalMessage.substring(captureEnd);
  } else {
    // 无捕获组，替换整个匹配
    newMessage = originalMessage.substring(0, matchStart) + optimizedText + originalMessage.substring(matchEnd);
  }

  await setChatMessages([{ message_id: messageId, message: newMessage }], { refresh: 'affected' });
  console.info(`[文本优化] 楼层 ${messageId} 文本已替换`);
}

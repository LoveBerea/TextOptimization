import type { OptimizeTask } from './optimizer';

/**
 * 共享的优化任务状态
 *
 * index.ts 写入此状态，对比界面.vue 读取此状态
 */
export const currentTask = ref<OptimizeTask | null>(null);

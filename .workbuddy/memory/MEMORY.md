# 工作记忆 - 文本优化酒馆助手脚本项目

## 项目结构
```
src/文本优化/
├── index.ts        # 主入口：按钮注册、组件挂载、事件绑定
├── state.ts        # 共享响应式状态：currentTask (ref<OptimizeTask | null>)
├── settings.ts     # 配置管理：zod schema + pinia store
├── optimizer.ts    # 核心逻辑：extractText / optimizeText / applyOptimization
├── 配置界面.vue     # 配置面板（挂载 #extensions_settings2）
└── 对比界面.vue     # 对比浮层（挂载 body）
脚本/导入到酒馆中/
└── 脚本-文本优化.json  # 导入JSON，content 指向 http://localhost:6621/dist/文本优化/index.js
```

## 关键技术决策
- 使用 `state.ts` 共享状态避免 index.ts 与 对比界面.vue 之间的循环依赖
- 提示词字段：`prompt1`（风格润色）/ `prompt2`（创意扩写）/ `active_prompt`（0 or 1），`activePrompt` computed 由 store 暴露；`optimizeText()` 接受独立 prompt 参数
- source 映射：openai→'openai', deepseek→'openai', gemini→'google', kimi→'openai'
- 正则匹配支持捕获组：有捕获组时只替换捕获组部分，无则替换整个匹配
- webpack 输出路径：`src/文本优化/index.ts` → `dist/文本优化/index.js`
- 样式：`<style scoped>` + 酒馆原生 CSS 类，禁止 tailwind

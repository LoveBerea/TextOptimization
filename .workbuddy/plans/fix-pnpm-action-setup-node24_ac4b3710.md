---
name: fix-pnpm-action-setup-node24
overview: 将三个工作流中的 pnpm/action-setup@v4.1.0 升级到 @v5（原生 Node 24 支持），同时移除不再需要的 FORCE_JAVASCRIPT_ACTIONS_TO_NODE24 环境变量
todos:
  - id: upgrade-pnpm-action
    content: 将 bundle.yaml 和 bump_deps.yaml 中 pnpm/action-setup@v4.1.0 升级为 @v5
    status: completed
---

## 核心需求

GitHub Actions 运行时报告 `pnpm/action-setup@v4.1.0` 仍在 Node.js 20 上运行，触发弃用警告。需要将其升级到原生支持 Node 24 的版本。

## 具体变更

- 将 `bundle.yaml` 和 `bump_deps.yaml` 中的 `pnpm/action-setup@v4.1.0` 升级为 `@v5`（v5.0.0 于 2025-03-17 发布，原生 Node 24 runtime）
- `version: 10` 参数保持不变（v5 仍支持该参数）
- `sync_template.yaml` 无 pnpm/action-setup，无需修改
- 三个文件的 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 保留，因为 `EndBug/add-and-commit@v9.1.3`、`AndreasAugustin/actions-template-sync@v2`、`phish108/autotag-action@v1.1.64` 仍运行在 Node 20 上

## 技术方案

`pnpm/action-setup@v5.0.0` 是最新稳定版（Latest），已将 action runtime 更新为 Node.js 24。其 `version` 参数与 v4 完全兼容，当前 `version: 10` 无需修改。

### 文件变更清单

```
d:\ST\优化\TextOptimization\
├── .github/workflows/
│   ├── bundle.yaml        # [MODIFY] 第35行: pnpm/action-setup@v4.1.0 → @v5
│   ├── bump_deps.yaml     # [MODIFY] 第25行: pnpm/action-setup@v4.1.0 → @v5
│   └── sync_template.yaml # 无变更（不含 pnpm/action-setup）
```

### 实现要点

- v5 的 `version` 参数语义与 v4 一致，指定安装的 pnpm 大版本号
- 升级后 `pnpm/action-setup` 将不再触发 Node 20 弃用警告
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 环境变量必须保留，因其他第三方 action（EndBug/add-and-commit、AndreasAugustin/actions-template-sync、phish108/autotag-action）尚未发布 Node 24 版本
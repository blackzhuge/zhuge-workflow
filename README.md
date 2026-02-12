# zhuge-workflow

`zhuge-workflow` 是一个面向 AI 开发协作场景的 CLI 工具，命令名为 `zhuge`。

它的目标是：

- 自动检测并安装常用 AI 工作流工具
- 在本机部署统一的 Claude 配置模板
- 在项目内初始化协作文档与脚本
- 提供可复现的 CI/CD 发包流程（GitHub Actions → npm）

---

## 支持项总览

### 1) CLI 命令支持

| 命令 | 说明 | 关键行为 |
| --- | --- | --- |
| `zhuge setup` | 安装/更新外部工具并部署配置 | 检测状态、选择 install/update、可选择锁定版本、部署配置模板 |
| `zhuge setup --yes` | CI/无人值守模式 | 跳过交互、执行可操作项、跳过配置部署交互 |
| `zhuge init` | 初始化当前项目 | 调用 OpenSpec/Trellis 初始化（若已安装）、生成 `.zhuge` 状态文件、创建/更新 `CLAUDE.md` |

---

### 2) 外部工具适配支持

当前内置 4 个 adapter（按执行顺序）：

| 工具 | 标识 | 安装方式 | 版本策略 | 交互式 |
| --- | --- | --- | --- | --- |
| OpenSpec | `openspec` | npm global | 支持锁定版本（默认 `1.1.1`）或 latest | 否 |
| Trellis | `trellis` | npm global | 支持锁定版本（默认 `0.2.15`）或 latest | 否 |
| Claude Code Bridge | `ccb` | git clone + install 脚本 | 无锁定版本策略 | 否 |
| CCG Workflow | `ccg` | `npx ccg-workflow` | 支持锁定版本（默认 `1.7.61`）或 latest | 是 |

补充说明：

- 每个 adapter 都有安装状态检测（install / update / skip）
- 支持失败隔离：某个工具失败不会中断其它工具执行
- 交互式工具（如 CCG）会关闭 spinner，直接把终端控制权交给工具本身

---

### 3) 配置部署支持（当前目标：Claude Code）

当前配置目标为 `Claude Code (~/.claude)`，支持以下部署规则：

| 模板源 | 目标路径 | 策略 | 说明 |
| --- | --- | --- | --- |
| `templates/claude/CLAUDE.md` | `~/.claude/CLAUDE.md` | `merge-section` | 替换 `<!-- Global -->` 区段 |
| `templates/claude/CLAUDE-ccg.md` | `~/.claude/CLAUDE.md` | `merge-section` | 替换 `<!-- CCG 增强 -->` 区段 |
| `templates/claude/rules/` | `~/.claude/rules/` | `replace` | 递归复制目录 |
| `templates/claude/skills/` | `~/.claude/skills/` | `replace` | 递归复制目录 |
| `templates/claude/commands/` | `~/.claude/commands/` | `replace` | 递归复制目录 |

支持的部署策略：

- `replace`：目标存在时先备份，再替换（文件）或递归复制（目录）
- `append`：追加内容且幂等（已有内容不重复追加）
- `merge-section`：按 marker 区段替换；marker 不存在时自动降级 append

---

### 4) 项目初始化支持（`zhuge init`）

`zhuge init` 在当前 git 项目内执行以下动作：

1. 校验当前目录是 git 仓库（否则退出）
2. 检测 OpenSpec/Trellis 是否可用，已安装则调用其 `init`
3. 创建 `.zhuge/init-state.json` 记录初始化状态
4. 创建或更新项目级 `CLAUDE.md`（幂等写入 zhuge 区段）
5. 部署增强模板：
   - `templates/init/claude-agents/` → `.claude/agents/`
   - `templates/init/claude-hooks/` → `.claude/hooks/`
   - `templates/init/claude-commands-trellis/` → `.claude/commands/trellis/`
   - `templates/init/trellis-scripts/` → `.trellis/scripts/`
6. 若存在 `.gitignore`，自动追加 `.zhuge/`

---

### 5) CI/CD 与发布支持

仓库内已提供 npm 自动发布工作流：

- 文件：`.github/workflows/publish-npm.yml`
- 触发：
  - push tag（`v*.*.*`）
  - 手动 `workflow_dispatch`
- 发布前校验：测试、类型检查、构建、tag 与 `package.json` 版本一致性
- 发布命令：`npm publish --access public --provenance`

发布说明文档：`docs/npm-trusted-publishing.md`

---

## 快速开始

### 环境要求

- Node.js `>=20`
- 推荐 `pnpm`（开发）
- Git（`zhuge init` 依赖）
- 建议 Unix-like 环境（macOS / Linux）

### 安装

```bash
npm i -g zhuge-workflow
```

### 常用命令

```bash
# 交互式安装/更新工具 + 配置部署
zhuge setup

# CI 模式（跳过交互）
zhuge setup --yes

# 初始化当前项目
zhuge init
```

---

## 开发与测试

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 单元测试
pnpm test -- --run

# 类型检查
pnpm lint

# Docker E2E（可选）
pnpm test:e2e
```

沙盒开发脚本（不污染真实 HOME）：

```bash
bash scripts/dev-sandbox.sh
```

---

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `ZHUGE_HOME` | 覆盖 HOME 用于工具路径定位（便于测试沙盒） |
| `ZHUGE_CI` | 设为 `true` 时启用 CI 模式（等价无人值守） |
| `CI` | 设为 `true` 时同样启用 CI 模式 |

---

## 当前边界与说明

- 当前内置配置目标为 Claude Code（`~/.claude`）
- CCG 适配器安装是交互式流程
- `zhuge init` 要求在 git 仓库内执行

---

## License

MIT

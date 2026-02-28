# Trellis 升级分析：0.2.15 → 0.3.0

> 分析日期：2026-02-28
> 当前安装版本：0.2.12（全局）
> adapter 锁定版本：0.2.15
> 目标版本：0.3.0（发布于 2026-02-28）

---

## 一、版本概况

### 0.3.0 核心变更（Breaking Release）

| 变更类型 | 说明 |
|----------|------|
| Shell → Python | 所有 `.trellis/scripts/*.sh` 替换为 `.py`，需 Python 3.10+ |
| 目录重命名 | `multi-agent/` → `multi_agent/`（下划线） |
| 调用方式 | `./script.sh` → `python3 ./script.py` |
| 新增 6 平台 | Codex、Kiro、Kilo、Gemini CLI、iFlow、Antigravity（共 9 个） |
| 新增命令 | `brainstorm.md`（所有平台）、`migrate-specs.md`（OpenCode） |
| 新增 spec 模板 | `backend/index.md`、`backend/script-conventions.md`、`guides/cross-platform-thinking-guide.md` |
| 架构重构 | 集中化平台注册表、提取 `resolvePlaceholders()` 到 shared 模块 |
| 术语变更 | "specs" → "code-spec" / "code-spec context"（全文替换） |
| 工作流重构 | start.md 拆为 3 Phase + brainstorm 流程 |

### Shell Archive

0.3.0 将旧 shell 脚本归档到 `scripts-shell-archive/`，内容与 0.2.15 完全一致（1204 行），仅做语言迁移，无逻辑修改。

---

## 二、本地定制清单

### 2.1 新增文件（不在原版中）

| 文件 | 说明 |
|------|------|
| `templates/init/claude-agents/ccg-impl.md` | CCG 多模型协作实现 agent（基于原版 implement agent 改写） |
| `templates/init/claude-agents/ccg-review.md` | CCG 双模型交叉审查 agent（基于原版 check agent 改写） |
| `templates/claude/commands/ccg/spec-plan-trellis.md` | CCG 规划命令，整合多模型分析 + Trellis Task 创建 |

### 2.2 修改文件（基于 0.2.15 原版改动）

| 文件 | 本地路径 | 原版路径 |
|------|----------|----------|
| dispatch.md | `templates/init/claude-agents/dispatch.md` | `dist/templates/claude/agents/dispatch.md` |
| start.md | `templates/init/claude-commands-trellis/start.md` | `dist/templates/claude/commands/trellis/start.md` |
| inject-subagent-context.py | `templates/init/claude-hooks/inject-subagent-context.py` | `dist/templates/claude/hooks/inject-subagent-context.py` |
| task.sh | `templates/init/trellis-scripts/task.sh` | `dist/templates/trellis/scripts/task.sh` |

---

## 三、逐文件详细 Diff

### 3.1 dispatch.md

#### 本地改动（相对 0.2.15 原版）

```diff
# 路径格式变更
- Task directory path format: `.trellis/tasks/{MM}-{DD}-{name}/`
+ Task directory path format: `.trellis/workspace/{developer}/tasks/{MM}-{DD}-{name}/`

- # e.g.: .trellis/tasks/02-03-my-feature
+ # e.g.: .trellis/workspace/taosu/tasks/12-my-feature

# 新增 ccg-impl action（在 implement action 之后）
+ ### action: "ccg-impl"
+ Task(subagent_type: "ccg-impl", prompt: "Execute the OpenSpec phase implementation with multi-model collaboration")
+ Hook 注入: implement.jsonl + OpenSpec artifacts + Phase tasks + prd.md

# 新增 ccg-review action（在 check action 之后）
+ ### action: "ccg-review"
+ Task(subagent_type: "ccg-review", prompt: "Perform dual-model cross-validation code review")
+ Hook 注入: check.jsonl + OpenSpec specs.md + prd.md
```

#### 0.3.0 相对 0.2.15 的变化

```diff
# finish action 新增 update-spec.md 注入
  Read order:
  ...
- 3. prd.md (for verifying requirements are met)
+ 3. update-spec.md (for active spec sync)
+ 4. prd.md (for verifying requirements are met)

# finish 描述增强
+ The finish agent actively updates spec docs when it detects new patterns
+ or contracts in the changes.

# create-pr 路径迁移
- ./.trellis/scripts/multi-agent/create-pr.sh
+ python3 ./.trellis/scripts/multi_agent/create_pr.py

# Key Constraints 路径同步
- Use `multi-agent/create-pr.sh` at the end of pipeline
+ Use `multi_agent/create_pr.py` at the end of pipeline
```

#### 升级操作

1. 合并 finish action 的 update-spec.md 注入和描述增强
2. 合并 create-pr 路径改为 Python
3. 保留本地的 ccg-impl / ccg-review action（0.3.0 没有）
4. workspace 路径格式需确认 0.3.0 是否也改了（待验证）

---

### 3.2 start.md（改动最大）

#### 本地改动（相对 0.2.15 原版）

```diff
# Step 7: 新增执行模式选择（原版无此步骤）
- ### Step 7: Implement `[AI]`
- Call Implement Agent (specs are auto-injected by hook):
+ ### Step 7: Choose Execution Mode `[AI]`
+ **MANDATORY**: 实现前必须询问用户选择执行模式：
+ > 1. **Agent 模式** - 委派给 subagent（ccg-impl/ccg-review）执行
+ > 2. **直接模式** - 在当前会话直接实现

# Step 8: Agent 替换
- subagent_type: "implement"
+ subagent_type: "ccg-impl"

# Step 9: Agent 替换
- subagent_type: "check"
+ subagent_type: "ccg-review"

# 新增直接模式路径
+ #### If Direct Mode:
+ 1. Read all relevant specs from implement.jsonl manually
+ 2. Implement the code yourself following those specs
+ 3. Run lint and typecheck

# Agent 表格替换
- | implement | Write code | Yes (implement.jsonl) |
- | check | Review & fix | Yes (check.jsonl) |
+ | ccg-impl | Write code (multi-model) | Yes (implement.jsonl) |
+ | ccg-review | Review & fix (dual-model) | Yes (check.jsonl) |
```

#### 0.3.0 相对 0.2.15 的变化

**A. 任务分类从 2 级扩展为 3 级**

```diff
- | **Trivial Fix** | Typo fix, comment update, single-line change, < 5 minutes | Direct Edit |
- | **Development Task** | Any code change that modifies logic... | **Task Workflow** |
+ | **Trivial Fix** | Typo fix, comment update, single-line change | Direct Edit |
+ | **Simple Task** | Clear goal, 1-2 files, well-defined scope | Quick confirm → Implement |
+ | **Complex Task** | Vague goal, multiple files, architectural decisions | **Brainstorm → Task Workflow** |
```

新增 "Classification Signals" 判断标准（Trivial/Simple indicators vs Complex indicators）。

**B. 新增 brainstorm 流程（Complex Task 入口）**

```diff
+ ## Complex Task - Brainstorm First
+ See `/trellis:brainstorm` for the full process. Summary:
+ 1. Acknowledge and classify
+ 2. Create task directory - Track evolving requirements in prd.md
+ 3. Ask questions one at a time - Update PRD after each answer
+ 4. Propose approaches - For architectural decisions
+ 5. Confirm final requirements - Get explicit approval
+ 6. Proceed to Task Workflow
```

**C. 工作流重构为 3 Phase**

```
Phase 1: Establish Requirements
  - Path A: From Brainstorm (PRD already exists, skip to Phase 2)
  - Path B: From Simple Task (confirm → create task → write PRD)

Phase 2: Prepare for Implementation (shared)
  - Step 4: Code-Spec Depth Check (NEW - infra/跨层变更必须先定义 spec 深度)
  - Step 5: Research the Codebase (原 Step 2，移到 PRD 确认之后)
  - Step 6: Configure Context (原 Step 4)
  - Step 7: Activate Task (原 Step 6)

Phase 3: Execute (shared)
  - Step 8: Implement
  - Step 9: Check Quality
  - Step 10: Complete
```

关键变化：Research 从 Step 2 移到 Phase 2 Step 5，**先确认需求再调研**。

**D. 新增 Code-Spec Depth Check（Step 4）**

触发条件：新增/变更 API 签名、数据库 schema、infra 集成、跨层 payload。
必须满足：目标 spec 文件已识别、合约已定义、验证矩阵已定义、至少一个 Good/Base/Bad case。

**E. 术语全文替换**

```diff
- specs → code-spec / code-spec context
- "Specs are injected, not remembered." → "Code-spec context is injected, not remembered."
```

**F. 脚本路径全部迁移**

```diff
- ./.trellis/scripts/get-context.sh
+ python3 ./.trellis/scripts/get_context.py

- ./.trellis/scripts/task.sh create
+ python3 ./.trellis/scripts/task.py create
（所有 task.sh 引用同理）
```

**G. 新增内容**

```diff
+ cat .trellis/spec/unit-test/index.md  # Testing guidelines（启动时读取）
+ | `/trellis:brainstorm` | Clarify vague requirements |（命令表新增）
```

#### 升级操作

1. **采纳 3 级分类 + brainstorm 流程** — 0.3.0 核心新增，建议全量采纳
2. **采纳 Code-Spec Depth Check** — 有价值的新增检查
3. **在 Phase 3 Step 8 重新嫁接执行模式选择** — 保留 Agent/直接模式二选一
4. **Agent 模式中保留 ccg-impl/ccg-review** — 替代原版 implement/check
5. **术语替换** — specs → code-spec（跟随 0.3.0 统一）
6. **脚本路径全部改 Python**
7. 这是 4 个文件中**工作量最大**的，建议以 0.3.0 为基础重新嫁接本地定制

---

### 3.3 inject-subagent-context.py

#### 本地改动（相对 0.2.15 原版，+210 行）

**A. 新增常量和注册**

```diff
+ AGENT_CCG_IMPL = "ccg-impl"
+ AGENT_CCG_REVIEW = "ccg-review"

- AGENTS_REQUIRE_TASK = (AGENT_IMPLEMENT, AGENT_CHECK, AGENT_DEBUG)
+ AGENTS_REQUIRE_TASK = (AGENT_IMPLEMENT, AGENT_CHECK, AGENT_DEBUG, AGENT_CCG_IMPL, AGENT_CCG_REVIEW)

- AGENTS_ALL = (AGENT_IMPLEMENT, AGENT_CHECK, AGENT_DEBUG, AGENT_RESEARCH)
+ AGENTS_ALL = (AGENT_IMPLEMENT, AGENT_CHECK, AGENT_DEBUG, AGENT_RESEARCH, AGENT_CCG_IMPL, AGENT_CCG_REVIEW)
```

**B. Agent 映射表新增**

```diff
+ "ccg-impl": "ccg-impl",
+ "ccg-review": "ccg-review",
```

**C. 新增函数（6 个）**

| 函数 | 说明 |
|------|------|
| `get_ccg_impl_context()` | 读取 implement.jsonl + prd.md + 提取 phase tasks |
| `extract_phase_section()` | 从 tasks.md 按 `## Phase N:` 提取指定 Phase 内容 |
| `build_ccg_impl_prompt()` | 构建 ccg-impl 完整 prompt（含工作流指令） |
| `get_ccg_review_context()` | 读取 check.jsonl + prd.md + OpenSpec specs.md |
| `build_ccg_review_prompt()` | 构建 ccg-review 完整 prompt（含工作流指令） |

**D. 主逻辑分支新增**

```diff
+ elif subagent_type == AGENT_CCG_IMPL:
+     context = get_ccg_impl_context(repo_root, task_dir)
+     new_prompt = build_ccg_impl_prompt(original_prompt, context)
+ elif subagent_type == AGENT_CCG_REVIEW:
+     context = get_ccg_review_context(repo_root, task_dir)
+     new_prompt = build_ccg_review_prompt(original_prompt, context)
```

#### 0.3.0 相对 0.2.15 的变化

**A. Windows 编码修复（文件头）**

```diff
+ # -*- coding: utf-8 -*-

+ # IMPORTANT: Suppress all warnings FIRST
+ import warnings
+ warnings.filterwarnings("ignore")

+ # IMPORTANT: Force stdout to use UTF-8 on Windows
+ if sys.platform == "win32":
+     import io as _io
+     if hasattr(sys.stdout, "reconfigure"):
+         sys.stdout.reconfigure(encoding="utf-8", errors="replace")
+     elif hasattr(sys.stdout, "detach"):
+         sys.stdout = _io.TextIOWrapper(sys.stdout.detach(), encoding="utf-8", errors="replace")
```

**B. finish context 新增 update-spec.md 注入**

```diff
  Read order:
  ...
- 3. prd.md (for verifying requirements are met)
+ 3. update-spec.md (for active spec sync)
+ 4. prd.md (for verifying requirements are met)

# 对应代码：
+ update_spec = read_file_content(repo_root, ".claude/commands/trellis/update-spec.md")
+ if update_spec:
+     context_parts.append(f"=== ... (Spec update process) ===\n{update_spec}")
```

**C. finish prompt 新增 Spec sync 步骤**

```diff
  3. **Run final checks** ...
- 4. **Confirm ready** ...
+ 3. **Spec sync** - Analyze whether changes introduce new patterns, contracts, or conventions
+    - If new pattern/convention found: read target spec file → update it → update index.md
+    - If infra/cross-layer change: follow 7-section mandatory template from update-spec.md
+    - If pure code fix with no new patterns: skip this step
+ 4. **Run final checks** - Execute lint and typecheck
+ 5. **Confirm ready** ...
```

**D. finish 约束更新**

```diff
- This is a final verification, not a fix phase
- If critical issues found, report them clearly
+ You MAY update spec files when gaps are detected (use update-spec.md as guide)
+ MUST read the target spec file BEFORE editing (avoid duplicating existing content)
+ Do NOT update specs for trivial changes
+ If critical CODE issues found, report them clearly (fix specs, not code)
```

**E. 返回格式注释**

```diff
- # Return updated input
+ # Return updated input with correct Claude Code PreToolUse format
```

#### 升级操作

1. **合并 Windows 编码修复** — 文件头 utf-8 + stdout reconfigure（低风险）
2. **合并 finish 的 update-spec.md 注入** — 新增 spec sync 能力（低风险）
3. **合并 finish prompt 的 spec sync 步骤和约束** — 增强 finish agent 能力
4. **保留全部 ccg 扩展**（常量、映射、6 个函数、主逻辑分支）— 0.3.0 没有这些
5. 整体风险低，可直接在 0.3.0 基础上追加本地代码

---

### 3.4 task.sh → task.py

#### 行数对比

| 版本 | 文件 | 行数 |
|------|------|------|
| 0.2.15 原版 | `task.sh` | 1204 |
| 本地定制 | `task.sh` | 1462 |
| 0.3.0 归档 | `scripts-shell-archive/task.sh` | 1204（与 0.2.15 完全一致） |
| 0.3.0 新版 | `task.py` | 1049 |

#### 本地改动（相对 0.2.15 原版）

**A. 删除的功能**

```diff
# 删除 PLATFORM 支持（--platform claude|cursor）
- PLATFORM="claude"
- get_command_path() { ... }  # 15 行
- init-context 的 --platform 参数解析（24 行 while/case）

# 删除 set-base-branch 命令
- cmd_set_base_branch() { ... }  # 36 行

# 删除 create 时自动检测 base_branch
- local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
- "base_branch": "$current_branch"
+ "base_branch": null
```

**B. 硬编码路径替代动态路径**

```diff
# check context 中的命令路径
- local finish_work=$(get_command_path "finish-work")
- {"file": "${finish_work}", ...}
+ {"file": ".claude/commands/trellis/finish-work.md", ...}

# 同理 check-backend.md、check-frontend.md
```

**C. init-context 简化**

```diff
- # 解析 --platform 等参数的 while 循环
- while [[ $# -gt 0 ]]; do case "$1" in --platform) ... esac done
+ local target_dir="$1"
+ local dev_type="$2"
```

**D. 新增 create-from-phase 命令（+180 行，核心定制）**

功能：从 OpenSpec change 的 tasks.md 自动创建 Trellis Task。

参数：

| 参数 | 说明 |
|------|------|
| `--change <dir>` | OpenSpec change 目录路径 |
| `--phase <N>` | 单 Phase 创建 |
| `--phases "1,2,4"` | 多 Phase 合并创建（与 --phase 互斥） |
| `--dev-type <type>` | backend / frontend / fullstack / test |
| `--priority <P>` | P0-P3，默认 P2 |

自动生成内容：

- `task.json` — 含 `openspec_change`、`phase_number`、`phase_numbers` 字段
- `next_action` 固定为 `[ccg-impl → ccg-review → finish]`
- `prd.md` — 单 Phase 和多 Phase 合并两种模板
- `implement.jsonl` — 基础 spec + dev_type 对应 spec + OpenSpec artifacts（specs.md, design.md, tasks.md）
- `check.jsonl` — check spec + OpenSpec specs.md + tasks.md
- `debug.jsonl` — debug spec + OpenSpec specs.md + tasks.md

**E. 命令路由新增**

```diff
+ create-from-phase)
+     shift
+     cmd_create_from_phase "$@"
+     ;;
```

#### 0.3.0 相对 0.2.15 的变化

0.3.0 的 `scripts-shell-archive/task.sh` 与 0.2.15 的 `task.sh` **完全一致**（1204 行），说明 0.3.0 没有修改 shell 版本的任何逻辑，纯粹做了 Shell → Python 语言迁移。

新版 `task.py`（1049 行）是 `task.sh` 的 Python 等价实现，功能一一对应：

| Shell 命令 | Python 等价 |
|------------|-------------|
| `task.sh create` | `task.py create` |
| `task.sh init-context` | `task.py init-context` |
| `task.sh add-context` | `task.py add-context` |
| `task.sh validate` | `task.py validate` |
| `task.sh list-context` | `task.py list-context` |
| `task.sh start` | `task.py start` |
| `task.sh finish` | `task.py finish` |
| `task.sh set-branch` | `task.py set-branch` |
| `task.sh set-scope` | `task.py set-scope` |
| `task.sh create-pr` | `task.py create-pr` |
| `task.sh archive` | `task.py archive` |
| `task.sh list` | `task.py list` |
| `task.sh list-archive` | `task.py list-archive` |
| `task.sh set-base-branch` | `task.py set-base-branch`（0.3.0 保留了此命令） |

注意：0.3.0 Python 版**保留了** `set-base-branch` 和 `PLATFORM`/`get_command_path()` 逻辑，而本地版本删除了这些。

#### 升级操作

1. **create-from-phase 需用 Python 重写** — 核心定制，约 180 行 bash → Python
2. **确认是否恢复 PLATFORM 支持** — 0.3.0 Python 版保留了多平台路径，本地删除了；如果只用 Claude Code 可继续不要
3. **确认是否恢复 set-base-branch** — 0.3.0 保留了，本地删除了；评估是否需要
4. **确认是否恢复 create 时自动检测 base_branch** — 本地改为 null，0.3.0 Python 版可能保留了自动检测
5. 所有引用 `task.sh` 的地方改为 `python3 task.py`
6. 这是工作量最大的文件，建议以 0.3.0 的 `task.py` 为基础，追加 `create-from-phase` 的 Python 实现

---

## 四、其他受影响文件

### 4.1 spec-plan-trellis.md

全自定义文件，不在原版中，但内部引用了大量 trellis 脚本路径。

需要替换的引用：

| 当前引用 | 替换为 |
|----------|--------|
| `./.trellis/scripts/task.sh create-from-phase` | `python3 ./.trellis/scripts/task.py create-from-phase` |
| `./.trellis/scripts/task.sh list` | `python3 ./.trellis/scripts/task.py list` |
| `./.trellis/scripts/task.sh start` | `python3 ./.trellis/scripts/task.py start` |
| `grep -A5 'get_implement_base\|...' .trellis/scripts/task.sh` | 改为读取 `task.py` 中对应函数 |

### 4.2 trellis.adapter.ts

```diff
- pinnedVersion: '0.2.15',
+ pinnedVersion: '0.3.0',
```

位置：`src/adapters/trellis.adapter.ts:14`

### 4.3 _context.md

引用了 `.trellis/spec/guides/index.md` 等路径，0.3.0 新增了 spec 模板但路径不变，无需修改。

### 4.4 spec-research.md

引用了 trellis 路径，需检查是否有 `.sh` 引用需替换。

### 4.5 ccg-impl.md / ccg-review.md

全自定义 agent，不在原版中。内部无脚本路径引用，无需修改。

---

## 五、升级执行计划

### 5.1 前置条件

- [ ] 确认 Python 3.10+ 可用：`python3 --version`
- [ ] 在测试项目上 `trellis init` 验证 0.3.0 生成的完整结构
- [ ] 备份当前 templates/init/ 目录

### 5.2 执行顺序（按风险从低到高）

| 步骤 | 文件 | 工作量 | 风险 | 操作 |
|------|------|--------|------|------|
| 1 | trellis.adapter.ts | 极低 | 低 | pinnedVersion 改为 `0.3.0` |
| 2 | inject-subagent-context.py | 低 | 低 | 以 0.3.0 为基础，追加 ccg 扩展代码 |
| 3 | dispatch.md | 低 | 低 | 合并 finish/create-pr 变更，保留 ccg actions |
| 4 | spec-plan-trellis.md | 低 | 低 | 批量替换 `.sh` → `python3 .py` 引用 |
| 5 | start.md | 高 | 中 | 以 0.3.0 为基础重写，嫁接 ccg 执行模式选择 |
| 6 | task.py | 高 | 中 | 以 0.3.0 task.py 为基础，追加 create-from-phase Python 实现 |
| 7 | spec-research.md | 低 | 低 | 检查并替换 `.sh` 引用 |

### 5.3 需要决策的问题

| # | 问题 | 选项 | 建议 |
|---|------|------|------|
| 1 | 是否恢复 PLATFORM 多平台支持？ | A. 恢复（跟随 0.3.0）/ B. 继续只支持 Claude | B — 只用 Claude Code，不需要 |
| 2 | 是否恢复 set-base-branch 命令？ | A. 恢复 / B. 不恢复 | 待定 — 看实际使用是否需要 |
| 3 | create 时 base_branch 自动检测？ | A. 恢复自动检测 / B. 保持 null | 待定 — 看 create-from-phase 是否已覆盖 |
| 4 | 术语是否跟随 0.3.0 改为 code-spec？ | A. 全量替换 / B. 保持 specs | A — 跟随上游统一 |
| 5 | brainstorm 流程是否采纳？ | A. 采纳 / B. 跳过 | A — 有价值的新增 |

### 5.4 验证清单

升级完成后逐项验证：

- [ ] `npm install -g @mindfoldhq/trellis@0.3.0` 成功
- [ ] `trellis --version` 输出 0.3.0
- [ ] 测试项目 `trellis init` 正常生成 `.trellis/` 结构
- [ ] `python3 .trellis/scripts/task.py list` 正常运行
- [ ] `python3 .trellis/scripts/task.py create "test" --slug test-task` 正常创建
- [ ] `python3 .trellis/scripts/task.py create-from-phase --change <dir> --phase 1` 正常（自定义命令）
- [ ] Hook inject-subagent-context.py 正常注入 ccg-impl/ccg-review context
- [ ] `/trellis:start` 命令正常启动工作流
- [ ] dispatch agent 能正确路由 ccg-impl/ccg-review action
- [ ] finish agent 能注入 update-spec.md 并执行 spec sync

---

## 六、参考路径

### 原版文件位置（npm 包内）

```
/tmp/trellis-0215/package/dist/templates/   # 0.2.15 原版
/tmp/trellis-030/package/dist/templates/    # 0.3.0 原版
```

### 本地定制文件位置

```
templates/init/claude-agents/dispatch.md
templates/init/claude-agents/ccg-impl.md
templates/init/claude-agents/ccg-review.md
templates/init/claude-commands-trellis/start.md
templates/init/claude-hooks/inject-subagent-context.py
templates/init/trellis-scripts/task.sh
templates/claude/commands/ccg/spec-plan-trellis.md
src/adapters/trellis.adapter.ts
```

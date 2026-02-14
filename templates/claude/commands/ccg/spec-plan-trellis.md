---
description: '多模型分析 → 消除歧义 → 零决策可执行计划 → 生成 Trellis Tasks'
---
<!-- CCG:SPEC:PLAN-NEW:START -->

> ⚠️ **上下文注入（阶段一）**
> 执行本命令前，必须先读取基础规范。参考：`~/.claude/commands/ccg/_context.md`
>
> **必读规范**：
> 1. `.trellis/spec/guides/index.md` - 思维指南
> 2. 根据开发类型读取 `backend/index.md` 或 `frontend/index.md`

**Core Philosophy**
- The goal is to eliminate ALL decision points—implementation should be pure mechanical execution.
- Every ambiguity must be resolved into explicit constraints before proceeding.
- Multi-model collaboration surfaces blind spots and conflicting assumptions.
- Every requirement must have Property-Based Testing (PBT) properties—focus on invariants.

**Guardrails**
- Do not proceed to implementation until every ambiguity is resolved.
- Multi-model collaboration is **mandatory**: use both Codex and Gemini.
- If constraints cannot be fully specified, escalate to user or return to research phase.
- Refer to `openspec/config.yaml` for project conventions.

**Steps**
1. **Select Change**
   - Run `/opsx:list` to display Active Changes.
   - Confirm with user which change ID to refine.
   - Run `/opsx:status <change_id>` to review current state.

2. **Multi-Model Implementation Analysis (PARALLEL)**
   - **CRITICAL**: You MUST launch BOTH Codex AND Gemini in a SINGLE message with TWO Bash tool calls.
   - **DO NOT** call one model first and wait. Launch BOTH simultaneously with `run_in_background: true`.

   **Step 2.1**: In ONE message, make TWO parallel Bash calls:

   **FIRST Bash call (Codex)**:
   ```
   Bash({
     command: "/Users/blackzhuge/.claude/bin/codeagent-wrapper --backend codex - \"$PWD\" <<'EOF'\nAnalyze change <change_id> from backend perspective:\n- Implementation approach\n- Technical risks\n- Alternative architectures\n- Edge cases and failure modes\nOUTPUT: JSON with analysis\nEOF",
     run_in_background: true,
     timeout: 300000,
     description: "Codex: backend analysis"
   })
   ```

   **SECOND Bash call (Gemini) - IN THE SAME MESSAGE**:
   ```
   Bash({
     command: "/Users/blackzhuge/.claude/bin/codeagent-wrapper --backend gemini - \"$PWD\" <<'EOF'\nAnalyze change <change_id> from frontend/integration perspective:\n- Maintainability assessment\n- Scalability considerations\n- Integration conflicts\nOUTPUT: JSON with analysis\nEOF",
     run_in_background: true,
     timeout: 300000,
     description: "Gemini: frontend analysis"
   })
   ```

   **Step 2.2**: After BOTH Bash calls return task IDs, wait for results with TWO TaskOutput calls:
   ```
   TaskOutput({ task_id: "<codex_task_id>", block: true, timeout: 600000 })
   TaskOutput({ task_id: "<gemini_task_id>", block: true, timeout: 600000 })
   ```

   - Synthesize responses and present consolidated options to user.

3. **Uncertainty Elimination Audit**
   - **Codex**: "Review proposal for unspecified decision points. List each as: [AMBIGUITY] → [REQUIRED CONSTRAINT]"
   - **Gemini**: "Identify implicit assumptions. Specify: [ASSUMPTION] → [EXPLICIT CONSTRAINT NEEDED]"

   **Anti-Pattern Detection** (flag and reject):
   - Information collection without decision boundaries
   - Technical comparisons without selection criteria
   - Deferred decisions marked "to be determined during implementation"

   **Target Pattern** (required for approval):
   - Explicit technology choices with parameters (e.g., "JWT with TTL=15min")
   - Concrete algorithm selections with configs (e.g., "bcrypt cost=12")
   - Precise behavioral rules (e.g., "Lock account 30min after 5 failed attempts")

   Iterate with user until ALL ambiguities resolved.

4. **PBT Property Extraction**
   - **Codex**: "Extract PBT properties. For each requirement: [INVARIANT] → [FALSIFICATION STRATEGY]"
   - **Gemini**: "Define system properties: [PROPERTY] | [DEFINITION] | [BOUNDARY CONDITIONS] | [COUNTEREXAMPLE GENERATION]"

   **Property Categories**:
   - **Commutativity/Associativity**: Order-independent operations
   - **Idempotency**: Repeated operations yield same result
   - **Round-trip**: Encode→Decode returns original
   - **Invariant Preservation**: State constraints maintained
   - **Monotonicity**: Ordering guarantees (e.g., timestamps increase)
   - **Bounds**: Value ranges, size limits, rate constraints

5. **Update OPSX Artifacts**
   - The agent will use OpenSpec skills to generate/update:
     * specs (Requirements + PBT)
     * design (Technical decisions)
     * tasks (Zero-decision implementation plan)
   - Ensure all resolved constraints and PBT properties are included in the generated artifacts.

   **tasks.md 格式约束（强制）**:

   每个任务必须使用 checkbox 格式，便于跟踪进度：

   ```markdown
   ### 1.1 任务标题

   - [ ] **文件**: `path/to/file.cs`

   **实现要点**:
   - 要点1
   - 要点2

   **验收**: 验收标准
   ```

   **格式规则**：
   - 每个任务条目必须以 `- [ ]` 开头（待完成）
   - 完成后标记为 `- [x]`
   - 文件末尾必须包含进度统计表

   **测试任务（强制）**：
   - 每个功能实现任务必须有对应的测试任务
   - 单元测试：覆盖核心逻辑、边界条件、异常处理
   - 集成测试：覆盖 API 端点、数据库交互、跨模块协作
   - 测试任务使用独立编号（如 1.2 实现 → 1.3 单元测试 → 1.4 集成测试）
   - 具体测试框架参考 `openspec/config.yaml` 中的项目约定
   - **禁止**：跳过测试任务或标记为"后续补充"

   **进度统计表**：

   ```markdown
   ## 进度统计

   | Phase | 总任务 | 已完成 | 进度 |
   |-------|--------|--------|------|
   | Phase 1 | N | 0 | 0% |
   | **总计** | **N** | **0** | **0%** |
   ```

6. **生成 Trellis Tasks（智能合并 + 用户确认）**

   基于 tasks.md 的 Phase 结构，智能分析规范差异，合并同类 Phase 后创建 Trellis Task。

   **6.1 解析 tasks.md 获取所有 Phase**

   ```bash
   CHANGE_ID="<change-id>"
   CHANGE_DIR="openspec/changes/$CHANGE_ID"

   # 提取所有 Phase 编号和标题
   grep -E "^## Phase [0-9]+:" "$CHANGE_DIR/tasks.md"
   ```

   **6.2 确定每个 Phase 的 dev_type**

   根据 Phase 内容判断开发类型：
   - 包含 `.cs`, `API`, `Service`, `Controller` → `backend`
   - 包含 `.vue`, `.tsx`, `Component`, `UI` → `frontend`
   - 混合内容 → `fullstack`
   - 测试相关 → `test`

   **6.3 计算 jsonl 差异矩阵（智能合并分析）**

   对每个 Phase，模拟 `task.sh create-from-phase` 的 jsonl 生成逻辑，推算 implement.jsonl 将包含的规范文件列表：

   ```bash
   # 读取 task.sh 中的 jsonl 生成函数，获取各 dev_type 实际注入的文件
   grep -A5 'get_implement_base\|get_implement_backend\|get_implement_frontend' .trellis/scripts/task.sh
   ```

   根据读取结果，为每个 Phase 构建其 implement.jsonl 文件列表（排除 openspec artifacts，因为所有 Phase 都相同）。

   **差异比较**：逐对比较 Phase 的规范文件列表，计算差异文件数。

   **合并规则**：
   - 同 dev_type 的 Phase → 规范差异为 0，可合并
   - 差异 <= 2 个文件 → 可合并
   - 差异 > 2 个文件 → 必须分开为独立 Task

   **6.4 生成合并计划并确认**

   使用 `AskUserQuestion` 向用户展示合并计划：

   ```
   根据规范差异分析，建议如下 Task 分组：

   | Task | 包含 Phase | Dev Type | 规范差异 |
   |------|-----------|----------|---------|
   | Task 1 | Phase 1, 2, 4 | backend | 0 文件（完全相同） |
   | Task 2 | Phase 3 | frontend | - |

   原始 4 个 Phase → 合并为 2 个 Task

   选项：
   1. 接受合并方案（推荐）
   2. 保持独立（每个 Phase 一个 Task）
   3. 自定义分组
   ```

   等待用户确认后再创建。

   **6.5 创建 Trellis Tasks**

   根据用户确认的方案调用 task.sh：

   ```bash
   # 合并的 Phase 使用 --phases 参数
   ./.trellis/scripts/task.sh create-from-phase \
     --change "$CHANGE_DIR" \
     --phases "1,2,4" \
     --dev-type backend

   # 独立的 Phase 使用 --phase 参数
   ./.trellis/scripts/task.sh create-from-phase \
     --change "$CHANGE_DIR" \
     --phase 3 \
     --dev-type frontend
   ```

   **create-from-phase 输出结构**：

   ```
   # 合并 Task
   .trellis/tasks/MM-DD-<change-name>-phase-1-2-4/
   ├── task.json         # 包含 phase_numbers: [1,2,4], phase_number: 1
   ├── prd.md            # 列出所有覆盖的 Phase
   ├── implement.jsonl   # 包含 specs.md, design.md, tasks.md
   ├── check.jsonl
   └── debug.jsonl

   # 独立 Task
   .trellis/tasks/MM-DD-<change-name>-phase-3/
   ├── task.json         # 包含 phase_number: 3
   ├── prd.md
   ├── implement.jsonl
   ├── check.jsonl
   └── debug.jsonl
   ```

   **6.6 列出创建的任务**

   ```bash
   ./.trellis/scripts/task.sh list
   ```

   **6.7 激活第一个任务**

   自动激活第一个 Task，使 hook 能注入 context：

   ```bash
   ./.trellis/scripts/task.sh start "$FIRST_TASK_DIR"
   ```

   **6.8 输出任务执行顺序**

   向用户报告创建的任务列表和建议的执行顺序：

   ```markdown
   ## Trellis Tasks 已创建

   | Task | Phase | Dev Type | 状态 |
   |------|-------|----------|------|
   | 02-10-xxx-phase-1-2-4 | Phase 1,2,4: 后端修复 + 路径修复 + 回归验证 | backend | in_progress |
   | 02-10-xxx-phase-3 | Phase 3: 前端 lint 闭环 | frontend | planning |

   原始 N 个 Phase → 合并为 M 个 Task

   **下一步**：运行 `/clear` 清理上下文，然后在新 session 中执行：
   - `/trellis:start` → 自动检测当前任务 → 调用 ccg-impl → ccg-review → finish
   - 或直接调用 `Task(subagent_type: "ccg-impl")` 开始实现
   ```

7. **Context Checkpoint**
   - Report current context usage.
   - If approaching 80K tokens, suggest: "Run `/clear` and start executing tasks"

**Exit Criteria**
A change is ready for implementation only when:
- [ ] All multi-model analyses completed and synthesized
- [ ] Zero ambiguities remain (verified by step 3 audit)
- [ ] All PBT properties documented with falsification strategies
- [ ] Artifacts (specs, design, tasks) generated via OpenSpec skills
- [ ] **tasks.md 包含单元测试和集成测试任务**（无"后续补充"标记）
- [ ] **Trellis Tasks 已创建**（智能合并后，用户已确认分组方案）
- [ ] User has explicitly approved all constraint decisions

**Reference**
- Inspect change: `/opsx:status <id>`
- Check conflicts: `/opsx:schemas`
- Search patterns: `rg -n "INVARIANT:|PROPERTY:" openspec/`
- List tasks: `./.trellis/scripts/task.sh list`
- Use `AskUserQuestion` for ANY ambiguity—never assume
<!-- CCG:SPEC:PLAN-NEW:END -->

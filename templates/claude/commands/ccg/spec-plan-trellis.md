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

6. **生成 Trellis Tasks（替代 ccg-context.jsonl）**

   基于 tasks.md 的 Phase 结构，为每个 Phase 创建独立的 Trellis Task。

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

   **6.3 为每个 Phase 创建 Trellis Task**

   对每个 Phase 调用 task.sh：

   ```bash
   # Phase 1 示例
   ./.trellis/scripts/task.sh create-from-phase \
     --change "$CHANGE_DIR" \
     --phase 1 \
     --dev-type backend

   # Phase 2 示例
   ./.trellis/scripts/task.sh create-from-phase \
     --change "$CHANGE_DIR" \
     --phase 2 \
     --dev-type backend

   # Phase 3 示例（前端）
   ./.trellis/scripts/task.sh create-from-phase \
     --change "$CHANGE_DIR" \
     --phase 3 \
     --dev-type frontend
   ```

   **create-from-phase 输出结构**：

   ```
   .trellis/tasks/MM-DD-<change-name>-phase-N/
   ├── task.json         # 包含 openspec_change, phase_number, ccg-impl action
   ├── prd.md            # 描述执行哪个 change 的哪个 Phase
   ├── implement.jsonl   # 包含 specs.md, design.md, tasks.md
   ├── check.jsonl
   └── debug.jsonl
   ```

   **6.4 列出创建的任务**

   ```bash
   ./.trellis/scripts/task.sh list
   ```

   **6.5 激活第一个任务**

   自动激活第一个 Phase 的任务，使 hook 能注入 context：

   ```bash
   # 用第一个 create-from-phase 返回的目录路径
   ./.trellis/scripts/task.sh start "$FIRST_PHASE_TASK_DIR"
   ```

   其中 `$FIRST_PHASE_TASK_DIR` 是 Step 6.3 中 Phase 1 的 `create-from-phase` 输出路径。

   **6.6 输出任务执行顺序**

   向用户报告创建的任务列表和建议的执行顺序：

   ```markdown
   ## Trellis Tasks 已创建

   | Task | Phase | Dev Type | 状态 |
   |------|-------|----------|------|
   | 02-10-xxx-phase-1 | Phase 1: 后端 DTO | backend | in_progress |
   | 02-10-xxx-phase-2 | Phase 2: 树构建 | backend | planning |
   | 02-10-xxx-phase-3 | Phase 3: API 端点 | backend | planning |
   | ... | ... | ... | ... |

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
- [ ] **Trellis Tasks 已创建**（每个 Phase 一个 Task）
- [ ] User has explicitly approved all constraint decisions

**Reference**
- Inspect change: `/opsx:status <id>`
- Check conflicts: `/opsx:schemas`
- Search patterns: `rg -n "INVARIANT:|PROPERTY:" openspec/`
- List tasks: `./.trellis/scripts/task.sh list`
- Use `AskUserQuestion` for ANY ambiguity—never assume
<!-- CCG:SPEC:PLAN-NEW:END -->

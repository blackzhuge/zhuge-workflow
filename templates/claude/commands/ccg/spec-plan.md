---
description: '多模型分析 → 消除歧义 → 零决策可执行计划'
---
<!-- CCG:SPEC:PLAN:START -->

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

6. **创建任务专属上下文配置 (ccg-context.jsonl)**

   基于研究和规划结果，为每个 task 创建上下文配置。

   **6.1 读取 tasks.md 获取任务列表**

   ```bash
   cat openspec/changes/<change-id>/tasks.md
   ```

   **6.2 为每个任务分析所需规范**

   使用语义化查询找到与每个任务相关的规范：

   ```
   mcp__ace-tool__search_context({
     project_root_path: "$PWD",
     query: "<任务N描述> 需要遵循的具体规范文件"
   })
   ```

   **6.3 创建 ccg-context.jsonl**

   每条规范关联到具体的 task 编号，**必须使用 tasks.md 中的 Phase.Section 编号格式**：

   ```bash
   cat > openspec/changes/<change-id>/ccg-context.jsonl << 'EOF'
   {"task": "*", "file": "<通用规范路径>", "reason": "所有任务通用"}
   {"task": "1.1,1.2", "file": "<规范路径>", "reason": "Phase 1.1-1.2 DTO设计需要此规范"}
   {"task": "2.5", "file": "<规范路径>", "reason": "Phase 2.5 组件开发需要此规范"}
   {"task": "3.1", "file": "<规范路径>", "reason": "Phase 3.1 E2E测试需要此规范"}
   EOF
   ```

   **字段说明**：
   - `task`: 任务编号，**必须与 tasks.md 的 Phase.Section 编号一致**（如 `"1.1"`, `"2.5"`, `"3.1"`）
     - `"*"` 表示所有任务通用
     - 多个任务用逗号分隔：`"1.1,1.2,1.3"`
     - 范围表达式不支持，需逐个列出
   - `file`: 规范文件路径
   - `reason`: 为什么该规范与此任务相关

   **编号规则（强制）**：
   - 必须使用 `Phase.Section` 格式（如 `1.1`, `2.5`），禁止使用连续数字（如 `1`, `7`, `16`）
   - 从 tasks.md 提取编号时，保留原始 Phase.Section 格式
   - 示例映射：
     - `### 1.1 预设 DTO` → task: `"1.1"`
     - `### 2.5 预设选择器组件` → task: `"2.5"`
     - `### 3.1 E2E 测试` → task: `"3.1"`

   **选择原则**：
   - 每条规范关联到具体任务，避免注入不相关内容
   - 所有任务都需要的规范用 `"*"` 标记
   - 优先选择 index.md 之外的具体规范文件

   **6.4 验证配置**

   ```bash
   cat openspec/changes/<change-id>/ccg-context.jsonl | while read line; do
     file=$(echo "$line" | jq -r '.file')
     if [ ! -f "$file" ]; then
       echo "警告: $file 不存在"
     fi
   done
   ```

7. **Context Checkpoint**
   - Report current context usage.
   - If approaching 80K tokens, suggest: "Run `/clear` and continue with `/ccg:spec-impl`"

**Exit Criteria**
A change is ready for implementation only when:
- [ ] All multi-model analyses completed and synthesized
- [ ] Zero ambiguities remain (verified by step 3 audit)
- [ ] All PBT properties documented with falsification strategies
- [ ] Artifacts (specs, design, tasks) generated via OpenSpec skills
- [ ] **tasks.md 包含单元测试和集成测试任务**（无"后续补充"标记）
- [ ] **ccg-context.jsonl 已创建**（供 spec-impl/spec-review 使用）
- [ ] User has explicitly approved all constraint decisions

**Reference**
- Inspect change: `/opsx:status <id>`
- Check conflicts: `/opsx:schemas`
- Search patterns: `rg -n "INVARIANT:|PROPERTY:" openspec/`
- Use `AskUserQuestion` for ANY ambiguity—never assume
<!-- CCG:SPEC:PLAN:END -->

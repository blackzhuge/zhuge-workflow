---
description: '按规范执行 + 多模型协作 + 归档'
---
<!-- CCG:SPEC:IMPL:START -->

> ⚠️ **上下文注入（阶段一 + 阶段二）**
> 执行本命令前，必须完成上下文注入。参考：`~/.claude/commands/ccg/_context.md`
>
> **阶段一**：发现并读取 `.trellis/spec/` 下相关目录的规范
> **阶段二**：根据当前任务编号，从 `ccg-context.jsonl` 筛选并读取对应规范

**Core Philosophy**
- Implementation is pure mechanical execution—all decisions were made in Plan phase.
- External model outputs are prototypes only; must be rewritten to production-grade code.
- Keep changes tightly scoped; enforce side-effect review before any modification.
- Minimize documentation—prefer self-explanatory code over comments.

**Guardrails**
- **NEVER** apply Codex/Gemini prototypes directly—all outputs are reference only.
- **MANDATORY**: Request `unified diff patch` format from external models; they have zero write permission.
- Keep implementation strictly within `tasks.md` scope—no scope creep.
- Refer to `openspec/config.yaml` for conventions.

**Steps**
1. **Select Change**
   - Run `/opsx:list` to inspect Active Changes.
   - Confirm with user which change ID to implement.
   - Run `/opsx:show <change_id>` to review tasks.

2. **Apply OPSX Change**
   - Use `/ccg:spec-impl` (which uses OpenSpec skills internally) to enter implementation mode.
   - This skill will guide you through the tasks defined in `tasks.md`.

3. **Identify Minimal Verifiable Phase**
   - Review `tasks.md` and identify the **smallest verifiable phase**.
   - Do NOT complete all tasks at once—control context window.
   - Announce: "Implementing Phase X: [task group name]"

4. **按任务编号注入规范（阶段二）**

   在执行每个任务前，根据任务编号从 `ccg-context.jsonl` 筛选并读取规范。

   **任务编号格式**：使用 `Phase.Section` 格式（如 `1.1`, `2.5`, `3.1`），与 tasks.md 保持一致。

   ```bash
   # 假设当前执行 Phase 2.5 预设选择器组件
   TASK_ID="2.5"
   CHANGE_ID="<change-id>"

   cat openspec/changes/$CHANGE_ID/ccg-context.jsonl | while read line; do
     task=$(echo "$line" | jq -r '.task')
     # 匹配: "*" 或 精确匹配 或 在逗号分隔列表中
     if [ "$task" = "*" ] || [ "$task" = "$TASK_ID" ] || echo ",$task," | grep -q ",$TASK_ID,"; then
       file=$(echo "$line" | jq -r '.file')
       reason=$(echo "$line" | jq -r '.reason')
       echo "=== $file ($reason) ==="
       cat "$file" 2>/dev/null
     fi
   done
   ```

   **匹配规则**：
   - `"*"` - 所有任务通用，始终注入
   - `"2.5"` - 精确匹配 Phase 2.5
   - `"1.1,1.2,1.3"` - Phase 1.1、1.2、1.3 共用，匹配其中任一

5. **Route Tasks to Appropriate Model**
   - **Route A: Gemini** — Frontend/UI/styling (CSS, React, Vue, HTML, components)
   - **Route B: Codex** — Backend/logic/algorithm (API, data processing, business logic)

   For each task:
   ```
   codeagent-wrapper --backend <codex|gemini> - "$PWD" <<'EOF'
   TASK: <task description from tasks.md>
   CONTEXT: <relevant code context>
   CONSTRAINTS: <constraints from spec>
   OUTPUT: Unified Diff Patch format ONLY
   EOF
   ```

5. **Rewrite Prototype to Production Code**
   Upon receiving diff patch, **NEVER apply directly**. Rewrite by:
   - Removing redundancy
   - Ensuring clear naming and simple structure
   - Aligning with project style
   - Eliminating unnecessary comments
   - Verifying no new dependencies introduced

6. **Side-Effect Review** (Mandatory before apply)
   Verify the change:
   - [ ] Does not exceed `tasks.md` scope
   - [ ] Does not affect unrelated modules
   - [ ] Does not introduce new dependencies
   - [ ] Does not break existing interfaces

   If issues found, make targeted corrections.

7. **Multi-Model Review (PARALLEL)**
   - **CRITICAL**: You MUST launch BOTH Codex AND Gemini in a SINGLE message with TWO Bash tool calls.
   - **DO NOT** call one model first and wait. Launch BOTH simultaneously with `run_in_background: true`.

   **Step 7.1**: In ONE message, make TWO parallel Bash calls:

   **FIRST Bash call (Codex)**:
   ```
   Bash({
     command: "/Users/blackzhuge/.claude/bin/codeagent-wrapper --backend codex - \"$PWD\" <<'EOF'\nReview the implementation changes:\n- Correctness: logic errors, edge cases\n- Security: injection, auth issues\n- Spec compliance: constraints satisfied\nOUTPUT: JSON with findings\nEOF",
     run_in_background: true,
     timeout: 300000,
     description: "Codex: correctness/security review"
   })
   ```

   **SECOND Bash call (Gemini) - IN THE SAME MESSAGE**:
   ```
   Bash({
     command: "/Users/blackzhuge/.claude/bin/codeagent-wrapper --backend gemini - \"$PWD\" <<'EOF'\nReview the implementation changes:\n- Maintainability: readability, complexity\n- Patterns: consistency with project style\n- Integration: cross-module impacts\nOUTPUT: JSON with findings\nEOF",
     run_in_background: true,
     timeout: 300000,
     description: "Gemini: maintainability/patterns review"
   })
   ```

   **Step 7.2**: After BOTH Bash calls return task IDs, wait for results with TWO TaskOutput calls:
   ```
   TaskOutput({ task_id: "<codex_task_id>", block: true, timeout: 600000 })
   TaskOutput({ task_id: "<gemini_task_id>", block: true, timeout: 600000 })
   ```

   Address any critical findings before proceeding.

8. **Update Task Status**
   - Mark completed task in `tasks.md`: `- [x] Task description`
   - Commit changes if appropriate.

9. **Context Checkpoint**
   - After completing a phase, report context usage.
   - If below 80K: Ask user "Continue to next phase?"
   - If approaching 80K: Suggest "Run `/clear` and resume with `/ccg:spec:impl`"

10. **Sync Specs Before Archive (MANDATORY)**
    - When ALL tasks in `tasks.md` are marked `[x]`:
    - **MUST** run `/opsx:sync` first to merge delta specs to `openspec/specs/`
    - Verify sync completed successfully before proceeding
    - Only after sync succeeds, run `/opsx:archive` to archive the change

    **WARNING**: Skipping sync will result in lost specifications!

**Reference**
- Check task status: `/opsx:show <id>`
- Validate before archive: `/opsx:validate <id>`
- View active changes: `/opsx:list`
- Search existing patterns: `rg -n "function|class" <file>`

**Exit Criteria**
Implementation is complete when:
- [ ] All tasks in `tasks.md` marked `[x]`
- [ ] All multi-model reviews passed
- [ ] Side-effect review confirmed no regressions
- [ ] Change archived successfully
<!-- CCG:SPEC:IMPL:END -->

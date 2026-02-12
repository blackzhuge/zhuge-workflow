# CCG Spec 上下文注入协议

> 本文件定义 CCG Spec 工作流的上下文注入规范。
> 所有 `/ccg:spec-*` 命令（除 `spec-init`）必须遵循此协议。

---

## 阶段一：基础规范（所有命令通用）

### 1.1 发现规范目录结构

使用 Glob 快速列出规范文件：

```bash
# 列出规范目录结构
ls -la .trellis/spec/ 2>/dev/null
```

### 1.2 读取基础规范

根据发现的目录结构和任务类型，读取相关规范：

```
mcp__ace-tool__search_context({
  project_root_path: "$PWD",
  query: "<任务描述> 需要遵循哪些编码规范和开发指南"
})
```

### 1.3 规范约束

读取的规范内容必须：
1. **保持在工作记忆中** - 后续所有步骤都受这些规范约束
2. **传递给外部模型** - 调用 Codex/Gemini 时，将相关规范内容包含在 prompt 中
3. **优先于默认行为** - 规范与 AI 默认行为冲突时，以规范为准

---

## 阶段二：任务专属上下文（仅 spec-impl / spec-review）

### 2.1 读取 ccg-context.jsonl

```bash
cat openspec/changes/<change-id>/ccg-context.jsonl 2>/dev/null
```

### 2.2 JSONL 格式

每条规范关联到具体的 task 编号，支持多任务关联：

```jsonl
{"task": "1", "file": "<规范文件路径>", "reason": "<为什么与该任务相关>"}
{"task": "1,2", "file": "<规范文件路径>", "reason": "<任务1和2都需要>"}
{"task": "1,2,3", "file": "<规范文件路径>", "reason": "<多个任务共用>"}
{"task": "*", "file": "<规范文件路径>", "reason": "<所有任务通用>"}
```

**字段说明**：
- `task`: 任务编号，多个用逗号分隔（如 `"1,2,3"`），`"*"` 表示所有任务通用
- `file`: 规范文件路径
- `reason`: 为什么该规范与此任务相关

### 2.3 按当前任务读取规范

在 `spec-impl` 阶段，根据当前执行的任务编号筛选并读取规范：

```bash
# 读取任务 N 相关的规范（包括通用规范 "*" 和包含该任务的多任务条目）
TASK_ID="1"
cat openspec/changes/<change-id>/ccg-context.jsonl | while read line; do
  task=$(echo "$line" | jq -r '.task')
  # 匹配: "*" 或 精确匹配 或 在逗号分隔列表中
  if [ "$task" = "*" ] || [ "$task" = "$TASK_ID" ] || echo ",$task," | grep -q ",$TASK_ID,"; then
    file=$(echo "$line" | jq -r '.file')
    echo "=== $file ==="
    cat "$file" 2>/dev/null
  fi
done
```

---

## 命令与阶段对应关系

| 命令 | 阶段一（基础规范） | 阶段二（专属上下文） | 特殊职责 |
|------|:------------------:|:--------------------:|----------|
| `/ccg:spec-init` | ❌ | ❌ | 验证工具 |
| `/ccg:spec-research` | ✅ | ❌ | 探索代码库 |
| `/ccg:spec-plan` | ✅ | ❌ | **创建** ccg-context.jsonl |
| `/ccg:spec-impl` | ✅ | ✅ | 按计划实现 |
| `/ccg:spec-review` | ✅ | ✅ | 双模型审查 |

---

## ccg-context.jsonl 创建指南（spec-plan 职责）

在 `spec-plan` 阶段，基于研究和规划结果，为每个 task 创建上下文配置。

### 步骤

1. **读取 tasks.md**：获取所有任务列表和编号
2. **为每个任务分析所需规范**：使用mcp__ace-tool__search_context工具语义化查询找到相关规范
3. **创建 ccg-context.jsonl**：每条规范关联到具体任务

### 发现相关规范

使用语义化查询找到与当前任务相关的规范：

```
mcp__ace-tool__search_context({
  project_root_path: "$PWD",
  query: "<任务描述> 需要遵循的具体规范文件"
})
```

### 创建示例

```bash
cat > openspec/changes/<change-id>/ccg-context.jsonl << 'EOF'
{"task": "*", "file": ".trellis/spec/guides/index.md", "reason": "所有任务通用的思维指南"}
{"task": "1,2", "file": ".trellis/spec/backend/api.md", "reason": "任务1和2都涉及API开发"}
{"task": "3", "file": ".trellis/spec/frontend/components.md", "reason": "任务3涉及组件开发"}
EOF
```

### 选择原则

1. **任务粒度** - 每条规范关联到具体任务，避免注入不相关内容
2. **多任务共用** - 多个任务需要同一规范时用逗号分隔（如 `"1,2,3"`）
3. **通用规范用 `"*"`** - 所有任务都需要的规范用 `"*"` 标记
4. **明确理由** - 每个条目必须有清晰的 `reason`

---

## 传递规范给外部模型

调用 Codex/Gemini 时，必须将相关规范包含在 prompt 中：

```bash
SPEC_CONTENT=$(cat <规范文件路径>)

codeagent-wrapper --backend codex - "$PWD" <<EOF
## 项目规范约束
$SPEC_CONTENT

## 任务
<具体任务描述>

## 输出格式
Unified Diff Patch
EOF
```

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

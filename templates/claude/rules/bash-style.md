---
paths:
  - "**/*.sh"
  - "**/Dockerfile"
  - "**/Makefile"
  - "**/*.yml"
  - "**/*.yaml"
  - "**/*.md"
---
# Bash 核心规范

> 详细规范见 `skills/bash-style/`，操作 .sh/.md/Dockerfile 等文件时自动加载。

---

## 禁止行尾注释

```bash
# ❌ 错误
curl -X POST https://api.example.com # 发送请求

# ✅ 正确
# 发送请求
curl -X POST https://api.example.com
```

**适用范围**：.sh 脚本、Markdown 代码块、Dockerfile、Makefile

---

## 核心要点

| 场景 | 规范 |
|------|------|
| 文件写入 | `sudo tee file > /dev/null << 'EOF'` |
| Heredoc | 默认用 `<< 'EOF'`（禁止变量展开） |
| 脚本头 | `#!/usr/bin/env bash` + `set -euo pipefail` |
| 变量 | 用 `${var}` 包裹，设默认值 `${VAR:-default}` |

---

## 规则溯源

```
> 📋 本回复遵循：`bash-style.md` - [章节]
```

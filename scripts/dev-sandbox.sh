#!/bin/bash
# 在临时目录中测试 CLI，不污染真实系统
set -e

SANDBOX=$(mktemp -d)
export HOME="$SANDBOX"
export ZHUGE_HOME="$SANDBOX"
echo "Sandbox HOME: $SANDBOX"

# 链接当前开发版本
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"
pnpm build
npm link 2>/dev/null || true

# 创建测试项目
mkdir -p "$SANDBOX/.claude"
mkdir -p "$SANDBOX/test-project"
cd "$SANDBOX/test-project"
git init

echo ""
echo "=== Sandbox ready ==="
echo "HOME:    $SANDBOX"
echo "Project: $SANDBOX/test-project"
echo ""
echo "You can now run:"
echo "  zhuge --help"
echo "  zhuge setup"
echo "  zhuge init"
echo ""
echo "Cleanup: rm -rf $SANDBOX"

# 启动交互式 shell
exec bash --norc --noprofile

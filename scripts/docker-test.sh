#!/bin/bash
# Docker E2E 测试入口
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building Docker E2E test image..."
docker build -t zhuge-workflow-test -f "$PROJECT_DIR/tests/e2e/Dockerfile" "$PROJECT_DIR"

echo ""
echo "Running E2E tests..."
docker run --rm zhuge-workflow-test

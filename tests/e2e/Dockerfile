FROM node:22-slim

RUN apt-get update && apt-get install -y git python3 vim && rm -rf /var/lib/apt/lists/*

WORKDIR /pkg

# 复制项目文件
COPY package.json pnpm-lock.yaml ./
COPY tsup.config.ts tsconfig.json vitest.config.ts ./
COPY src/ src/
COPY templates/ templates/
COPY tests/ tests/

# 安装依赖并构建
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

# 全局安装 CLI
RUN npm install -g .

# 安装 Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# 创建测试项目目录
RUN mkdir /test-project && cd /test-project && git init && git config user.email "test@test.com" && git config user.name "test"

WORKDIR /pkg

CMD ["bash"]

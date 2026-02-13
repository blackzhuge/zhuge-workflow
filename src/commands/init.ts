import { existsSync, writeFileSync, readFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { execInherit, commandExists } from '../utils/shell.js'
import * as logger from '../utils/logger.js'
import { getBundledTemplatesDir } from '../core/config-source.js'
import { getCliVersion } from '../utils/version.js'

export async function initCommand() {
  const cwd = process.cwd()

  logger.title('zhuge init')

  // 1. 前置检查
  if (!existsSync(resolve(cwd, '.git'))) {
    logger.error('Current directory is not a git repository. Run "git init" first.')
    process.exit(1)
  }

  const checks = await Promise.all([
    commandExists('openspec'),
    commandExists('trellis'),
  ])

  if (!checks[0]) {
    logger.warn('OpenSpec not installed. Run "zhuge setup" first to install it.')
    logger.info('Skipping OpenSpec init...')
  }

  if (!checks[1]) {
    logger.warn('Trellis not installed. Run "zhuge setup" first to install it.')
    logger.info('Skipping Trellis init...')
  }

  // 2. OpenSpec init
  if (checks[0]) {
    console.log()
    logger.info('Running OpenSpec init...')
    console.log()
    try {
      await execInherit('openspec', ['init'], { cwd })
      logger.success('OpenSpec init complete')
    } catch (err) {
      logger.error(`OpenSpec init failed: ${err}`)
    }
  }

  // 3. Trellis init
  if (checks[1]) {
    console.log()
    logger.info('Running Trellis init...')
    console.log()
    try {
      await execInherit('trellis', ['init'], { cwd })
      logger.success('Trellis init complete')
    } catch (err) {
      logger.error(`Trellis init failed: ${err}`)
    }
  }

  // 4. zhuge 自身初始化
  console.log()
  logger.info('Running zhuge init...')
  await zhugeOwnInit(cwd)

  // 5. 完成摘要
  console.log()
  logger.title('Init Complete')
  logger.success(`Project initialized at ${cwd}`)
}

async function zhugeOwnInit(cwd: string) {
  // 创建 .zhuge/ 目录
  const zhugeDir = resolve(cwd, '.zhuge')
  mkdirSync(zhugeDir, { recursive: true })

  // 写入 init 状态记录
  const stateFile = resolve(zhugeDir, 'init-state.json')
  const state = {
    version: getCliVersion(),
    initializedAt: new Date().toISOString(),
    tools: {
      openspec: existsSync(resolve(cwd, 'openspec')) || existsSync(resolve(cwd, 'specs')),
      trellis: existsSync(resolve(cwd, '.trellis')),
    },
  }
  writeFileSync(stateFile, JSON.stringify(state, null, 2))

  // 生成/修改项目级 CLAUDE.md
  const claudeMdPath = resolve(cwd, 'CLAUDE.md')
  if (existsSync(claudeMdPath)) {
    // 已有 CLAUDE.md，追加 zhuge 区段
    const existing = readFileSync(claudeMdPath, 'utf-8')
    const zhugeSection = buildZhugeSection(cwd)
    if (!existing.includes('<!-- zhuge-workflow -->')) {
      writeFileSync(claudeMdPath, existing + '\n' + zhugeSection)
      logger.success('Updated project CLAUDE.md with zhuge section')
    } else {
      logger.info('CLAUDE.md already contains zhuge section, skipping')
    }
  } else {
    // 创建新的 CLAUDE.md
    const content = buildProjectClaudeMd(cwd)
    writeFileSync(claudeMdPath, content)
    logger.success('Created project CLAUDE.md')
  }

  // 替换 Trellis/Claude 生成的文件为 zhuge 增强版
  deployInitTemplates(cwd)

  // 添加 .zhuge/ 到 .gitignore（如果需要）
  const gitignorePath = resolve(cwd, '.gitignore')
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8')
    if (!gitignore.includes('.zhuge/')) {
      writeFileSync(gitignorePath, gitignore.trimEnd() + '\n.zhuge/\n')
    }
  }

  logger.success('zhuge init complete')
}

function buildZhugeSection(cwd: string): string {
  const parts: string[] = [
    '<!-- zhuge-workflow -->',
    '',
    '## Workflow',
    '',
  ]

  // 检测 OpenSpec 生成的内容
  if (existsSync(resolve(cwd, 'specs')) || existsSync(resolve(cwd, 'openspec'))) {
    parts.push('- OpenSpec specs available in `specs/` or `openspec/`')
  }

  // 检测 Trellis 生成的内容
  if (existsSync(resolve(cwd, '.trellis'))) {
    parts.push('- Trellis workflow configured in `.trellis/`')
  }

  parts.push('')
  parts.push('<!-- zhuge-workflow-end -->')

  return parts.join('\n')
}

function buildProjectClaudeMd(cwd: string): string {
  const parts: string[] = [
    `# ${resolve(cwd).split('/').pop() || 'Project'}`,
    '',
  ]

  parts.push(buildZhugeSection(cwd))

  return parts.join('\n')
}

/**
 * 将 zhuge 增强版文件替换到项目中
 * templates/init/claude-agents/   → {cwd}/.claude/agents/
 * templates/init/claude-hooks/    → {cwd}/.claude/hooks/
 * templates/init/claude-commands-trellis/ → {cwd}/.claude/commands/trellis/
 * templates/init/trellis-scripts/ → {cwd}/.trellis/scripts/
 */
function deployInitTemplates(cwd: string) {
  const templatesDir = resolve(getBundledTemplatesDir(), 'init')

  if (!existsSync(templatesDir)) {
    logger.warn('Init templates not found, skipping file replacements')
    return
  }

  const mappings: Array<{ source: string; target: string }> = [
    { source: 'claude-agents', target: '.claude/agents' },
    { source: 'claude-hooks', target: '.claude/hooks' },
    { source: 'claude-commands-trellis', target: '.claude/commands/trellis' },
    { source: 'trellis-scripts', target: '.trellis/scripts' },
  ]

  let count = 0
  for (const { source, target } of mappings) {
    const srcDir = resolve(templatesDir, source)
    if (!existsSync(srcDir)) continue

    const tgtDir = resolve(cwd, target)
    mkdirSync(tgtDir, { recursive: true })

    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        copyFileSync(resolve(srcDir, entry.name), resolve(tgtDir, entry.name))
        count++
      }
    }
  }

  if (count > 0) {
    logger.success(`Deployed ${count} zhuge enhanced file(s)`)
  }
}

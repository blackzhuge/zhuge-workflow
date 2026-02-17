import { resolve, dirname, basename } from 'node:path'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  renameSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { select, confirm } from '@inquirer/prompts'
import type { ConfigDeployRule, ConfigTarget } from './types.js'
import { getBundledTemplatesDir } from './config-source.js'
import { expandHome } from '../utils/platform.js'
import * as logger from '../utils/logger.js'

type OverwritePolicy = 'all' | 'none' | 'ask'

/** 部署配置到目标 */
export async function deployConfigs(
  targets: ConfigTarget[],
): Promise<void> {
  const templatesDir = getBundledTemplatesDir()

  for (const target of targets) {
    // Phase 1: 预扫描 replace 策略中已存在的文件
    const existingFiles = collectExistingReplaceFiles(templatesDir, target)

    let overwritePolicy: OverwritePolicy = 'all'
    if (existingFiles.length > 0) {
      console.log()
      logger.warn(`${target.displayName}: 以下 ${existingFiles.length} 个配置文件已存在：`)
      for (const f of existingFiles) {
        logger.info(`  - ${f}`)
      }
      overwritePolicy = await select({
        message: '如何处理已存在的配置文件？',
        choices: [
          { name: '全部覆盖（自动备份）', value: 'all' as const },
          { name: '跳过已存在', value: 'none' as const },
          { name: '逐个确认', value: 'ask' as const },
        ],
      })
    }

    // Phase 2: 部署
    const spin = logger.spinner(`Deploying configs to ${target.displayName}...`)

    try {
      let deployed = 0
      for (const rule of target.rules) {
        const sourcePath = resolve(templatesDir, target.name, rule.source)
        const targetPath = expandHome(rule.target)

        if (!existsSync(sourcePath)) {
          continue
        }

        // 确保目标目录存在
        mkdirSync(dirname(targetPath), { recursive: true })

        if (statSync(sourcePath).isDirectory()) {
          deployed += await deployDirectory(sourcePath, targetPath, rule.strategy, overwritePolicy)
        } else {
          const ok = await deployFile(sourcePath, targetPath, rule, overwritePolicy)
          if (ok) deployed++
        }
      }

      spin.succeed(`${target.displayName}: ${deployed} file(s) deployed`)
    } catch (err) {
      spin.fail(`${target.displayName}: deploy failed`)
      logger.error(String(err))
    }
  }
}

/** 收集 replace 策略中已存在的目标文件 */
function collectExistingReplaceFiles(templatesDir: string, target: ConfigTarget): string[] {
  const existing: string[] = []
  for (const rule of target.rules) {
    if (rule.strategy !== 'replace') continue
    const sourcePath = resolve(templatesDir, target.name, rule.source)
    const targetPath = expandHome(rule.target)
    if (!existsSync(sourcePath)) continue

    if (statSync(sourcePath).isDirectory()) {
      collectExistingInDir(sourcePath, targetPath, existing)
    } else if (existsSync(targetPath)) {
      existing.push(targetPath)
    }
  }
  return existing
}

/** 递归收集目录中已存在的目标文件 */
function collectExistingInDir(sourceDir: string, targetDir: string, result: string[]): void {
  if (!existsSync(targetDir)) return
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const srcPath = resolve(sourceDir, entry.name)
    const tgtPath = resolve(targetDir, entry.name)
    if (entry.isDirectory()) {
      collectExistingInDir(srcPath, tgtPath, result)
    } else if (existsSync(tgtPath)) {
      result.push(tgtPath)
    }
  }
}

/** 部署单个文件，返回是否实际部署 */
async function deployFile(
  source: string,
  target: string,
  rule: ConfigDeployRule,
  policy: OverwritePolicy,
): Promise<boolean> {
  switch (rule.strategy) {
    case 'replace':
      return deployReplace(source, target, policy)
    case 'append':
      deployAppend(source, target)
      return true
    case 'merge-section':
      if (!rule.sectionMarker) {
        throw new Error(`merge-section requires sectionMarker for ${rule.source}`)
      }
      deployMergeSection(source, target, rule.sectionMarker)
      return true
  }
}

/** 整文件替换（备份旧文件），尊重覆盖策略 */
async function deployReplace(
  source: string,
  target: string,
  policy: OverwritePolicy,
): Promise<boolean> {
  if (existsSync(target)) {
    if (policy === 'none') return false
    if (policy === 'ask') {
      const yes = await confirm({
        message: `  覆盖 ${basename(target)}?`,
        default: false,
      })
      if (!yes) return false
    }
    const backupPath = `${target}.bak.${Date.now()}`
    renameSync(target, backupPath)
  }
  copyFileSync(source, target)
  return true
}

/** 追加到文件末尾（幂等：已包含则跳过） */
function deployAppend(source: string, target: string): void {
  const content = readFileSync(source, 'utf-8')

  if (existsSync(target)) {
    const existing = readFileSync(target, 'utf-8')
    if (existing.includes(content.trim())) return
    writeFileSync(target, existing + '\n' + content)
  } else {
    writeFileSync(target, content)
  }
}

/** 用 HTML comment marker 替换指定区段 */
function deployMergeSection(
  source: string,
  target: string,
  marker: { start: string; end: string },
): void {
  const newContent = readFileSync(source, 'utf-8')

  if (!existsSync(target)) {
    writeFileSync(target, newContent)
    return
  }

  const existing = readFileSync(target, 'utf-8')
  const startIdx = existing.indexOf(marker.start)
  const endIdx = existing.indexOf(marker.end)

  if (startIdx !== -1 && endIdx !== -1) {
    const before = existing.substring(0, startIdx)
    const after = existing.substring(endIdx + marker.end.length)
    writeFileSync(target, before + newContent + after)
  } else {
    // marker 不存在，降级为 append
    logger.warn(`Section markers not found in ${basename(target)}, appending instead`)
    writeFileSync(target, existing + '\n' + newContent)
  }
}

/** 部署整个目录（递归复制），尊重覆盖策略 */
async function deployDirectory(
  sourceDir: string,
  targetDir: string,
  _strategy: string,
  policy: OverwritePolicy,
): Promise<number> {
  mkdirSync(targetDir, { recursive: true })
  let count = 0

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const srcPath = resolve(sourceDir, entry.name)
    const tgtPath = resolve(targetDir, entry.name)

    if (entry.isDirectory()) {
      count += await deployDirectory(srcPath, tgtPath, _strategy, policy)
    } else {
      if (existsSync(tgtPath)) {
        if (policy === 'none') continue
        if (policy === 'ask') {
          const yes = await confirm({
            message: `  覆盖 ${basename(tgtPath)}?`,
            default: false,
          })
          if (!yes) continue
        }
      }
      copyFileSync(srcPath, tgtPath)
      count++
    }
  }

  return count
}

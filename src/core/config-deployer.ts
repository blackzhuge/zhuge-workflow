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
import type { ConfigDeployRule, ConfigTarget } from './types.js'
import { getBundledTemplatesDir } from './config-source.js'
import { expandHome } from '../utils/platform.js'
import * as logger from '../utils/logger.js'

/** 部署配置到目标 */
export async function deployConfigs(
  targets: ConfigTarget[],
): Promise<void> {
  const templatesDir = getBundledTemplatesDir()

  for (const target of targets) {
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
          deployed += deployDirectory(sourcePath, targetPath, rule.strategy)
        } else {
          deployFile(sourcePath, targetPath, rule)
          deployed++
        }
      }

      spin.succeed(`${target.displayName}: ${deployed} file(s) deployed`)
    } catch (err) {
      spin.fail(`${target.displayName}: deploy failed`)
      logger.error(String(err))
    }
  }
}

/** 部署单个文件 */
function deployFile(source: string, target: string, rule: ConfigDeployRule): void {
  switch (rule.strategy) {
    case 'replace':
      deployReplace(source, target)
      break
    case 'append':
      deployAppend(source, target)
      break
    case 'merge-section':
      if (!rule.sectionMarker) {
        throw new Error(`merge-section requires sectionMarker for ${rule.source}`)
      }
      deployMergeSection(source, target, rule.sectionMarker)
      break
  }
}

/** 整文件替换（备份旧文件） */
function deployReplace(source: string, target: string): void {
  if (existsSync(target)) {
    const backupPath = `${target}.bak.${Date.now()}`
    renameSync(target, backupPath)
  }
  copyFileSync(source, target)
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

/** 部署整个目录（递归复制） */
function deployDirectory(sourceDir: string, targetDir: string, _strategy: string): number {
  mkdirSync(targetDir, { recursive: true })
  let count = 0

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const srcPath = resolve(sourceDir, entry.name)
    const tgtPath = resolve(targetDir, entry.name)

    if (entry.isDirectory()) {
      count += deployDirectory(srcPath, tgtPath, _strategy)
    } else {
      copyFileSync(srcPath, tgtPath)
      count++
    }
  }

  return count
}

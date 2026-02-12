import { homedir } from 'node:os'
import { resolve } from 'node:path'

/** 展开路径中的 ~ 为用户 HOME 目录 */
export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return resolve(homedir(), p.slice(2))
  }
  return p
}

/** 获取 HOME 目录（支持 ZHUGE_HOME 环境变量覆盖，用于测试沙盒） */
export function getHome(): string {
  return process.env.ZHUGE_HOME || homedir()
}

/** 是否 CI 模式 */
export function isCI(): boolean {
  return process.env.ZHUGE_CI === 'true' || process.env.CI === 'true'
}

import type { ConfigTarget } from '../core/types.js'
import { claudeConfig } from './claude.config.js'

/** 所有配置目标 */
export function getAllConfigTargets(): ConfigTarget[] {
  return [claudeConfig]
}

/** 按名称获取配置目标 */
export function getConfigTargetsByNames(names: string[]): ConfigTarget[] {
  const all = getAllConfigTargets()
  return all.filter((t) => names.includes(t.name))
}

import type { PluginAdapter, ToolStatus } from './types.js'
import * as logger from '../utils/logger.js'

export interface AdapterAction {
  adapter: PluginAdapter
  status: ToolStatus
  action: 'install' | 'update' | 'skip'
}

/** 检测所有工具状态 */
export async function checkAllAdapters(adapters: PluginAdapter[]): Promise<AdapterAction[]> {
  const spin = logger.spinner('Checking installed tools...')

  const results: AdapterAction[] = []
  for (const adapter of adapters) {
    try {
      const status = await adapter.check()
      let action: 'install' | 'update' | 'skip'
      if (!status.installed) {
        action = 'install'
      } else if (status.updateAvailable) {
        action = 'update'
      } else {
        action = 'skip'
      }
      results.push({ adapter, status, action })
    } catch {
      results.push({
        adapter,
        status: { installed: false },
        action: 'install',
      })
    }
  }

  spin.succeed('Tool check complete')
  return results
}

/** 执行单个 adapter 的安装/更新 */
export async function runAdapter(
  adapter: PluginAdapter,
  action: 'install' | 'update',
  version?: string,
): Promise<void> {
  if (adapter.meta.interactive) {
    // 交互式工具：暂停 spinner，让工具自己控制终端
    console.log()
    logger.info(`Starting ${adapter.meta.displayName} (interactive)...`)
    console.log()
    await adapter[action](version)
    console.log()
  } else {
    const spin = logger.spinner(
      `${action === 'install' ? 'Installing' : 'Updating'} ${adapter.meta.displayName}${version ? `@${version}` : ''}...`,
    )
    try {
      await adapter[action](version)
      spin.succeed(`${adapter.meta.displayName} ${action === 'install' ? 'installed' : 'updated'}${version ? ` (v${version})` : ''}`)
    } catch (err) {
      spin.fail(`${adapter.meta.displayName} ${action} failed`)
      throw err
    }
  }
}

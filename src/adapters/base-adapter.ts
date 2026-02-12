import type { PluginAdapter, AdapterMeta, ToolStatus } from '../core/types.js'
import { exec, commandExists } from '../utils/shell.js'

export abstract class BaseAdapter implements PluginAdapter {
  abstract readonly meta: AdapterMeta

  abstract check(): Promise<ToolStatus>
  abstract install(version?: string): Promise<void>
  abstract update(version?: string): Promise<void>
  abstract uninstall(): Promise<void>

  /** 执行命令并提取版本号 */
  protected async getVersionFromCommand(
    cmd: string,
    args: string[] = ['--version'],
  ): Promise<string | undefined> {
    try {
      const result = await exec(cmd, args)
      const stdout = String(result.stdout ?? '')
      const match = stdout.match(/v?(\d+\.\d+\.\d+)/)
      return match?.[1]
    } catch {
      return undefined
    }
  }

  /** 检查命令是否存在 */
  protected commandExists(cmd: string): Promise<boolean> {
    return commandExists(cmd)
  }

  /** 获取 npm 包最新版本 */
  protected async getLatestNpmVersion(packageName: string): Promise<string | undefined> {
    try {
      const result = await exec('npm', ['info', packageName, 'version'])
      return String(result.stdout ?? '').trim()
    } catch {
      return undefined
    }
  }
}

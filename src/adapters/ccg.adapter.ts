import { BaseAdapter } from './base-adapter.js'
import type { AdapterMeta, ToolStatus } from '../core/types.js'
import { execInherit } from '../utils/shell.js'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getHome } from '../utils/platform.js'

export class CcgAdapter extends BaseAdapter {
  readonly meta: AdapterMeta = {
    name: 'ccg',
    displayName: 'CCG Workflow',
    description: 'Claude Code enhanced multi-model workflow',
    installMethod: 'npx',
    required: false,
    order: 4,
    interactive: true,
    pinnedVersion: '1.7.61',
  }

  private get configPath(): string {
    return resolve(getHome(), '.claude/.ccg/config.toml')
  }

  async check(): Promise<ToolStatus> {
    const installed = existsSync(this.configPath)
    if (!installed) return { installed: false }
    return { installed: true, version: 'detected' }
  }

  async install(version?: string): Promise<void> {
    const pkg = version ? `ccg-workflow@${version}` : 'ccg-workflow@latest'
    await execInherit('npx', [pkg])
  }

  async update(version?: string): Promise<void> {
    await this.install(version)
  }

  async uninstall(): Promise<void> {
    // ccg 无专用 uninstall 命令
    const ccgDir = resolve(getHome(), '.claude/.ccg')
    if (existsSync(ccgDir)) {
      const { rmSync } = await import('node:fs')
      rmSync(ccgDir, { recursive: true, force: true })
    }
  }
}

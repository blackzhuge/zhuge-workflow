import { BaseAdapter } from './base-adapter.js'
import type { AdapterMeta, ToolStatus } from '../core/types.js'
import { execInherit } from '../utils/shell.js'

export class TrellisAdapter extends BaseAdapter {
  readonly meta: AdapterMeta = {
    name: 'trellis',
    displayName: 'Trellis',
    description: 'AI workflow structure for Claude Code and Cursor',
    installMethod: 'npm-global',
    required: false,
    order: 2,
    interactive: false,
    pinnedVersion: '0.2.15',
  }

  private readonly packageName = '@mindfoldhq/trellis'
  private readonly binName = 'trellis'

  async check(): Promise<ToolStatus> {
    const installed = await this.commandExists(this.binName)
    if (!installed) return { installed: false }

    const version = await this.getVersionFromCommand(this.binName)
    const latest = await this.getLatestNpmVersion(this.packageName)
    return {
      installed: true,
      version,
      latestVersion: latest,
      updateAvailable: !!(version && latest && version !== latest),
    }
  }

  async install(version?: string): Promise<void> {
    const pkg = version ? `${this.packageName}@${version}` : this.packageName
    await execInherit('npm', ['install', '-g', pkg])
  }

  async update(version?: string): Promise<void> {
    if (version) {
      await execInherit('npm', ['install', '-g', `${this.packageName}@${version}`])
    } else {
      await execInherit('npm', ['update', '-g', this.packageName])
    }
  }

  async uninstall(): Promise<void> {
    await execInherit('npm', ['uninstall', '-g', this.packageName])
  }

  async initProject(cwd: string): Promise<void> {
    await execInherit(this.binName, ['init'], { cwd })
  }
}

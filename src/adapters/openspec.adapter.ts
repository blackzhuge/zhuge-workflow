import { BaseAdapter } from './base-adapter.js'
import type { AdapterMeta, ToolStatus } from '../core/types.js'
import { execInherit } from '../utils/shell.js'

export class OpenSpecAdapter extends BaseAdapter {
  readonly meta: AdapterMeta = {
    name: 'openspec',
    displayName: 'OpenSpec',
    description: 'AI-native spec-driven development',
    installMethod: 'npm-global',
    required: false,
    order: 1,
    interactive: false,
    pinnedVersion: '1.1.1',
  }

  private readonly packageName = '@fission-ai/openspec'
  private readonly binName = 'openspec'

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

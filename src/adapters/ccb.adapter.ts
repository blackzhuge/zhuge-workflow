import { BaseAdapter } from './base-adapter.js'
import type { AdapterMeta, ToolStatus } from '../core/types.js'
import { execInherit } from '../utils/shell.js'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getHome } from '../utils/platform.js'

export class CcbAdapter extends BaseAdapter {
  readonly meta: AdapterMeta = {
    name: 'ccb',
    displayName: 'Claude Code Bridge (CCB)',
    description: 'Multi-model collaboration via split-pane terminal',
    installMethod: 'git-clone-script',
    required: false,
    order: 3,
    interactive: false,
  }

  private readonly repoUrl = 'https://github.com/bfly123/claude_code_bridge.git'

  private get cloneDir(): string {
    return resolve(getHome(), '.local/share/claude_code_bridge')
  }

  async check(): Promise<ToolStatus> {
    const installed = await this.commandExists('ccb')
    if (!installed) return { installed: false }

    const version = await this.getVersionFromCommand('ccb')
    return { installed: true, version }
  }

  async install(): Promise<void> {
    if (!existsSync(this.cloneDir)) {
      await execInherit('git', ['clone', this.repoUrl, this.cloneDir])
    }
    await execInherit('bash', ['./install.sh', 'install'], { cwd: this.cloneDir })
  }

  async update(): Promise<void> {
    if (existsSync(this.cloneDir)) {
      await execInherit('git', ['-C', this.cloneDir, 'pull'])
    } else {
      await execInherit('git', ['clone', this.repoUrl, this.cloneDir])
    }
    await execInherit('bash', ['./install.sh', 'install'], { cwd: this.cloneDir })
  }

  async uninstall(): Promise<void> {
    if (existsSync(this.cloneDir)) {
      await execInherit('bash', ['./install.sh', 'uninstall'], { cwd: this.cloneDir })
    }
  }
}

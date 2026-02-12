import chalk from 'chalk'
import { checkbox, confirm, select } from '@inquirer/prompts'
import { getAllAdapters } from '../adapters/index.js'
import { checkAllAdapters, runAdapter, type AdapterAction } from '../core/plugin-runner.js'
import type { SetupOptions } from '../core/types.js'
import { isCI } from '../utils/platform.js'
import * as logger from '../utils/logger.js'
import { deployConfigs } from '../core/config-deployer.js'
import { getConfigTargetsByNames } from '../configs/index.js'

export async function setupCommand(options: SetupOptions) {
  const ciMode = options.yes || isCI()

  logger.title('zhuge setup')

  // 1. 检测所有工具状态
  const adapters = getAllAdapters()
  const actions = await checkAllAdapters(adapters)

  // 2. 展示状态表格
  printStatusTable(actions)

  // 3. 筛选可操作的工具
  const actionable = actions.filter((a) => a.action !== 'skip')
  const skippable = actions.filter((a) => a.action === 'skip')

  if (actionable.length === 0 && skippable.length === actions.length) {
    logger.success('All tools are up to date!')
  }

  // 4. 交互选择要安装/更新的工具
  let selected: AdapterAction[]

  if (ciMode) {
    // CI 模式：全部执行
    selected = actionable
  } else if (actionable.length === 0) {
    // 没有可操作的，询问是否重新配置已安装的工具
    const reconfig = await confirm({
      message: 'All tools installed. Reconfigure any tool?',
      default: false,
    })
    if (!reconfig) {
      selected = []
    } else {
      const choices = skippable.map((a) => ({
        name: `${a.adapter.meta.displayName} (reconfigure)`,
        value: a,
      }))
      const picked = await checkbox({
        message: 'Select tools to reconfigure:',
        choices,
      })
      // 重新配置 = 重新安装
      selected = picked.map((p) => ({ ...p, action: 'install' as const }))
    }
  } else {
    const choices = actionable.map((a) => ({
      name: formatActionChoice(a),
      value: a,
      checked: true,
    }))
    selected = await checkbox({
      message: 'Select tools to install/update:',
      choices,
    })
  }

  // 5. 逐个询问版本策略 & 依次执行
  if (selected.length > 0) {
    // 为每个支持版本锁定的工具单独询问版本策略
    const versionMap = new Map<string, string | undefined>()

    if (!ciMode) {
      for (const item of selected) {
        if (item.adapter.meta.pinnedVersion) {
          const strategy = await select({
            message: `${item.adapter.meta.displayName} - Version strategy:`,
            choices: [
              {
                name: `Pinned v${item.adapter.meta.pinnedVersion} (tested with zhuge)`,
                value: 'pinned' as const,
              },
              { name: 'Latest version', value: 'latest' as const },
            ],
          })
          if (strategy === 'pinned') {
            versionMap.set(item.adapter.meta.name, item.adapter.meta.pinnedVersion)
          }
        }
      }
    }

    console.log()
    for (const item of selected) {
      try {
        const version = versionMap.get(item.adapter.meta.name)
        await runAdapter(item.adapter, item.action === 'skip' ? 'install' : item.action, version)
      } catch (err) {
        logger.error(`Failed: ${item.adapter.meta.displayName} - ${err}`)
      }
    }
  }

  // 6. 配置部署阶段
  await deployConfigsPhase(ciMode)

  // 7. 完成摘要
  console.log()
  logger.title('Setup Complete')
  if (selected.length > 0) {
    for (const item of selected) {
      const verb = item.action === 'update' ? 'Updated' : 'Installed'
      logger.success(`${verb}: ${item.adapter.meta.displayName}`)
    }
  } else {
    logger.info('No tools were installed or updated.')
  }
}

function printStatusTable(actions: AdapterAction[]) {
  console.log()
  const header = `  ${pad('Tool', 24)} ${pad('Status', 10)} ${pad('Version', 12)} Action`
  console.log(chalk.dim(header))
  console.log(chalk.dim('  ' + '─'.repeat(64)))

  for (const { adapter, status, action } of actions) {
    const name = pad(adapter.meta.displayName, 24)
    const st = status.installed
      ? chalk.green(pad('OK', 10))
      : chalk.red(pad('Missing', 10))
    const ver = pad(status.version || '-', 12)
    const act =
      action === 'install'
        ? chalk.yellow('Install')
        : action === 'update'
          ? chalk.cyan(`Update → ${status.latestVersion || '?'}`)
          : chalk.dim('Skip')
    console.log(`  ${name} ${st} ${ver} ${act}`)
  }
  console.log()
}

function formatActionChoice(a: AdapterAction): string {
  if (a.action === 'install') {
    return `${a.adapter.meta.displayName} - Install`
  }
  return `${a.adapter.meta.displayName} - Update to ${a.status.latestVersion || 'latest'}`
}

function pad(s: string, len: number): string {
  return s.padEnd(len)
}

async function deployConfigsPhase(ciMode: boolean) {
  console.log()
  if (ciMode) {
    logger.info('Config deployment skipped in CI mode (use zhuge setup interactively)')
    return
  }

  const deploy = await confirm({
    message: 'Deploy AI tool config files?',
    default: true,
  })

  if (!deploy) return

  const targets = await checkbox({
    message: 'Deploy configs to:',
    choices: [
      { name: 'Claude Code (~/.claude/)', value: 'claude', checked: true },
    ],
  })

  if (targets.length === 0) {
    logger.info('No config targets selected, skipping.')
    return
  }

  const configTargets = getConfigTargetsByNames(targets)
  await deployConfigs(configTargets)
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PluginAdapter, ToolStatus } from '../../../src/core/types.js'
import { setupCommand } from '../../../src/commands/setup.js'
import { checkbox, confirm, select } from '@inquirer/prompts'
import { getAllAdapters } from '../../../src/adapters/index.js'
import { checkAllAdapters, runAdapter } from '../../../src/core/plugin-runner.js'
import { deployConfigs } from '../../../src/core/config-deployer.js'
import { getConfigTargetsByNames } from '../../../src/configs/index.js'
import { isCI } from '../../../src/utils/platform.js'
import * as logger from '../../../src/utils/logger.js'

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}))

vi.mock('../../../src/adapters/index.js', () => ({
  getAllAdapters: vi.fn(),
}))

vi.mock('../../../src/core/plugin-runner.js', () => ({
  checkAllAdapters: vi.fn(),
  runAdapter: vi.fn(),
}))

vi.mock('../../../src/core/config-deployer.js', () => ({
  deployConfigs: vi.fn(),
}))

vi.mock('../../../src/configs/index.js', () => ({
  getConfigTargetsByNames: vi.fn(),
}))

vi.mock('../../../src/utils/platform.js', () => ({
  isCI: vi.fn(() => false),
}))

vi.mock('../../../src/utils/logger.js', () => ({
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  title: vi.fn(),
}))

function createAdapter(options: {
  name: string
  displayName: string
  interactive?: boolean
  pinnedVersion?: string
}): PluginAdapter {
  return {
    meta: {
      name: options.name,
      displayName: options.displayName,
      description: 'test adapter',
      installMethod: 'custom',
      required: false,
      order: 1,
      interactive: options.interactive ?? false,
      pinnedVersion: options.pinnedVersion,
    },
    check: vi.fn(async () => ({ installed: true })),
    install: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    uninstall: vi.fn(async () => {}),
  }
}

function createAction(options: {
  adapter: PluginAdapter
  status: ToolStatus
  action: 'install' | 'update' | 'skip'
}) {
  return {
    adapter: options.adapter,
    status: options.status,
    action: options.action,
  }
}

describe('setupCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isCI).mockReturnValue(false)
  })

  it('runs all actionable adapters in CI mode and skips config deploy prompts', async () => {
    const openSpec = createAdapter({ name: 'openspec', displayName: 'OpenSpec' })
    const trellis = createAdapter({ name: 'trellis', displayName: 'Trellis' })

    const actions = [
      createAction({
        adapter: openSpec,
        status: { installed: false },
        action: 'install',
      }),
      createAction({
        adapter: trellis,
        status: { installed: true, latestVersion: '2.0.0', updateAvailable: true },
        action: 'update',
      }),
    ]

    vi.mocked(getAllAdapters).mockReturnValue([openSpec, trellis])
    vi.mocked(checkAllAdapters).mockResolvedValue(actions)

    await setupCommand({ yes: true })

    expect(runAdapter).toHaveBeenNthCalledWith(1, openSpec, 'install', undefined)
    expect(runAdapter).toHaveBeenNthCalledWith(2, trellis, 'update', undefined)
    expect(confirm).not.toHaveBeenCalled()
    expect(deployConfigs).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(
      'Config deployment skipped in CI mode (use zhuge setup interactively)',
    )
  })

  it('supports pinned version strategy and deploys selected config targets', async () => {
    const openSpec = createAdapter({
      name: 'openspec',
      displayName: 'OpenSpec',
      pinnedVersion: '1.1.1',
    })

    const action = createAction({
      adapter: openSpec,
      status: { installed: false },
      action: 'install',
    })

    const claudeTarget = {
      name: 'claude',
      displayName: 'Claude Code',
      configDir: '~/.claude',
      detect: vi.fn(async () => true),
      rules: [],
    }

    vi.mocked(getAllAdapters).mockReturnValue([openSpec])
    vi.mocked(checkAllAdapters).mockResolvedValue([action])
    vi.mocked(checkbox)
      .mockResolvedValueOnce([action])
      .mockResolvedValueOnce(['claude'])
    vi.mocked(select).mockResolvedValue('pinned')
    vi.mocked(confirm).mockResolvedValue(true)
    vi.mocked(getConfigTargetsByNames).mockReturnValue([claudeTarget])

    await setupCommand({})

    expect(runAdapter).toHaveBeenCalledWith(openSpec, 'install', '1.1.1')
    expect(getConfigTargetsByNames).toHaveBeenCalledWith(['claude'])
    expect(deployConfigs).toHaveBeenCalledWith([claudeTarget])
  })

  it('skips reconfigure flow when all tools are up to date and user declines', async () => {
    const ccg = createAdapter({ name: 'ccg', displayName: 'CCG Workflow' })

    const actions = [
      createAction({
        adapter: ccg,
        status: { installed: true, updateAvailable: false },
        action: 'skip',
      }),
    ]

    vi.mocked(getAllAdapters).mockReturnValue([ccg])
    vi.mocked(checkAllAdapters).mockResolvedValue(actions)
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)

    await setupCommand({})

    expect(logger.success).toHaveBeenCalledWith('All tools are up to date!')
    expect(runAdapter).not.toHaveBeenCalled()
    expect(checkbox).not.toHaveBeenCalled()
  })
})

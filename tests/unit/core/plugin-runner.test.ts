import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PluginAdapter, ToolStatus } from '../../../src/core/types.js'
import { checkAllAdapters, runAdapter } from '../../../src/core/plugin-runner.js'
import * as logger from '../../../src/utils/logger.js'

vi.mock('../../../src/utils/logger.js', () => ({
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  title: vi.fn(),
  spinner: vi.fn(() => ({
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}))

function createAdapter(options: {
  name: string
  displayName?: string
  interactive?: boolean
  check: () => Promise<ToolStatus>
  installImpl?: (version?: string) => Promise<void>
  updateImpl?: (version?: string) => Promise<void>
}): PluginAdapter {
  return {
    meta: {
      name: options.name,
      displayName: options.displayName || options.name,
      description: 'test adapter',
      installMethod: 'custom',
      required: false,
      order: 1,
      interactive: options.interactive ?? false,
    },
    check: vi.fn(options.check),
    install: vi.fn(options.installImpl || (async () => {})),
    update: vi.fn(options.updateImpl || (async () => {})),
    uninstall: vi.fn(async () => {}),
  }
}

describe('checkAllAdapters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks missing adapter as install', async () => {
    const adapter = createAdapter({
      name: 'missing-tool',
      check: async () => ({ installed: false }),
    })

    const result = await checkAllAdapters([adapter])

    expect(result).toHaveLength(1)
    expect(result[0].action).toBe('install')
    expect(result[0].status).toEqual({ installed: false })
    expect(logger.spinner).toHaveBeenCalledWith('Checking installed tools...')

    const spin = vi.mocked(logger.spinner).mock.results[0]?.value
    expect(spin?.succeed).toHaveBeenCalledWith('Tool check complete')
  })

  it('marks outdated adapter as update', async () => {
    const adapter = createAdapter({
      name: 'old-tool',
      check: async () => ({
        installed: true,
        version: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
      }),
    })

    const result = await checkAllAdapters([adapter])

    expect(result[0].action).toBe('update')
  })

  it('marks up-to-date adapter as skip', async () => {
    const adapter = createAdapter({
      name: 'fresh-tool',
      check: async () => ({
        installed: true,
        version: '1.1.0',
        latestVersion: '1.1.0',
        updateAvailable: false,
      }),
    })

    const result = await checkAllAdapters([adapter])

    expect(result[0].action).toBe('skip')
  })

  it('falls back to install when check throws', async () => {
    const adapter = createAdapter({
      name: 'broken-tool',
      check: async () => {
        throw new Error('check failed')
      },
    })

    const result = await checkAllAdapters([adapter])

    expect(result[0].action).toBe('install')
    expect(result[0].status).toEqual({ installed: false })
  })
})

describe('runAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs non-interactive install and reports success', async () => {
    const adapter = createAdapter({
      name: 'openspec',
      displayName: 'OpenSpec',
      check: async () => ({ installed: false }),
    })

    await runAdapter(adapter, 'install', '1.2.3')

    expect(adapter.install).toHaveBeenCalledWith('1.2.3')
    expect(logger.spinner).toHaveBeenCalledWith('Installing OpenSpec@1.2.3...')

    const spin = vi.mocked(logger.spinner).mock.results[0]?.value
    expect(spin?.succeed).toHaveBeenCalledWith('OpenSpec installed (v1.2.3)')
  })

  it('fails non-interactive update and rethrows', async () => {
    const adapter = createAdapter({
      name: 'trellis',
      displayName: 'Trellis',
      check: async () => ({ installed: true }),
      updateImpl: async () => {
        throw new Error('boom')
      },
    })

    await expect(runAdapter(adapter, 'update')).rejects.toThrow('boom')

    const spin = vi.mocked(logger.spinner).mock.results[0]?.value
    expect(spin?.fail).toHaveBeenCalledWith('Trellis update failed')
  })

  it('runs interactive adapter without spinner', async () => {
    const adapter = createAdapter({
      name: 'ccg',
      displayName: 'CCG Workflow',
      interactive: true,
      check: async () => ({ installed: false }),
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runAdapter(adapter, 'install')

    expect(adapter.install).toHaveBeenCalledWith(undefined)
    expect(logger.spinner).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('Starting CCG Workflow (interactive)...')

    logSpy.mockRestore()
  })
})

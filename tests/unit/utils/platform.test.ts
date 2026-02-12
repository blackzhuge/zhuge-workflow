import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { homedir } from 'node:os'

describe('platform utils', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('expandHome expands ~ prefix', async () => {
    const { expandHome } = await import('../../../src/utils/platform.js')
    const expectedPrefix = `${homedir()}/.claude`

    expect(expandHome('~/.claude')).toBe(expectedPrefix)
  })

  it('expandHome keeps non-home path unchanged', async () => {
    const { expandHome } = await import('../../../src/utils/platform.js')

    expect(expandHome('/tmp/test')).toBe('/tmp/test')
  })

  it('getHome prefers ZHUGE_HOME when provided', async () => {
    process.env.ZHUGE_HOME = '/sandbox/zhuge-home'
    const { getHome } = await import('../../../src/utils/platform.js')

    expect(getHome()).toBe('/sandbox/zhuge-home')
  })

  it('isCI returns true when ZHUGE_CI is true', async () => {
    process.env.ZHUGE_CI = 'true'
    delete process.env.CI

    const { isCI } = await import('../../../src/utils/platform.js')
    expect(isCI()).toBe(true)
  })

  it('isCI returns true when CI is true', async () => {
    process.env.CI = 'true'
    delete process.env.ZHUGE_CI

    const { isCI } = await import('../../../src/utils/platform.js')
    expect(isCI()).toBe(true)
  })

  it('isCI returns false when both flags are not true', async () => {
    process.env.CI = '1'
    process.env.ZHUGE_CI = 'false'

    const { isCI } = await import('../../../src/utils/platform.js')
    expect(isCI()).toBe(false)
  })
})

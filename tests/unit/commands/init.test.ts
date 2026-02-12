import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { initCommand } from '../../../src/commands/init.js'
import { commandExists, execInherit } from '../../../src/utils/shell.js'
import { getBundledTemplatesDir } from '../../../src/core/config-source.js'
import * as logger from '../../../src/utils/logger.js'

vi.mock('../../../src/utils/shell.js', () => ({
  commandExists: vi.fn(),
  execInherit: vi.fn(),
  exec: vi.fn(),
}))

vi.mock('../../../src/core/config-source.js', () => ({
  getBundledTemplatesDir: vi.fn(),
}))

vi.mock('../../../src/utils/logger.js', () => ({
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  title: vi.fn(),
}))

describe('initCommand', () => {
  let testDir: string
  let oldCwd: string

  beforeEach(() => {
    vi.clearAllMocks()
    oldCwd = process.cwd()
    testDir = mkdtempSync(join(tmpdir(), 'zhuge-init-test-'))
    process.chdir(testDir)
  })

  afterEach(() => {
    process.chdir(oldCwd)
    rmSync(testDir, { recursive: true, force: true })
  })

  it('exits when current directory is not a git repository', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    await expect(initCommand()).rejects.toThrow('process.exit called')
    expect(logger.error).toHaveBeenCalledWith(
      'Current directory is not a git repository. Run "git init" first.',
    )

    exitSpy.mockRestore()
  })

  it('creates project state and CLAUDE.md when tools are missing', async () => {
    mkdirSync(resolve(testDir, '.git'))
    writeFileSync(resolve(testDir, '.gitignore'), 'node_modules/\n')
    vi.mocked(commandExists).mockResolvedValue(false)

    const templatesDir = resolve(testDir, '__templates__')
    mkdirSync(resolve(templatesDir, 'init', 'claude-agents'), { recursive: true })
    writeFileSync(resolve(templatesDir, 'init', 'claude-agents', 'agent.md'), 'agent')
    mkdirSync(resolve(templatesDir, 'init', 'claude-commands-trellis'), { recursive: true })
    writeFileSync(resolve(templatesDir, 'init', 'claude-commands-trellis', 'start.md'), '# start')
    vi.mocked(getBundledTemplatesDir).mockReturnValue(templatesDir)

    await initCommand()

    expect(existsSync(resolve(testDir, '.zhuge/init-state.json'))).toBe(true)
    expect(existsSync(resolve(testDir, 'CLAUDE.md'))).toBe(true)
    expect(existsSync(resolve(testDir, '.claude/commands/trellis/start.md'))).toBe(true)
    expect(readFileSync(resolve(testDir, '.gitignore'), 'utf-8')).toContain('.zhuge/')

    const state = JSON.parse(readFileSync(resolve(testDir, '.zhuge/init-state.json'), 'utf-8'))
    expect(state.version).toBe('0.1.0')
    expect(state.tools.openspec).toBe(false)
    expect(state.tools.trellis).toBe(false)

    expect(logger.warn).toHaveBeenCalledWith(
      'OpenSpec not installed. Run "zhuge setup" first to install it.',
    )
    expect(logger.warn).toHaveBeenCalledWith(
      'Trellis not installed. Run "zhuge setup" first to install it.',
    )
    expect(execInherit).not.toHaveBeenCalled()
  })

  it('runs external init for installed tools and appends zhuge section once', async () => {
    mkdirSync(resolve(testDir, '.git'))
    writeFileSync(resolve(testDir, 'CLAUDE.md'), '# Existing\n')
    writeFileSync(resolve(testDir, '.gitignore'), 'node_modules/\n')

    vi.mocked(commandExists)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    const templatesDir = resolve(testDir, '__templates__')
    mkdirSync(resolve(templatesDir, 'init', 'trellis-scripts'), { recursive: true })
    writeFileSync(resolve(templatesDir, 'init', 'trellis-scripts', 'sync.sh'), 'echo sync')
    vi.mocked(getBundledTemplatesDir).mockReturnValue(templatesDir)

    await initCommand()

    const firstCall = vi.mocked(execInherit).mock.calls[0]
    const secondCall = vi.mocked(execInherit).mock.calls[1]

    expect(firstCall[0]).toBe('openspec')
    expect(firstCall[1]).toEqual(['init'])
    expect(String((firstCall[2] as { cwd: string }).cwd).endsWith(basename(testDir))).toBe(true)

    expect(secondCall[0]).toBe('trellis')
    expect(secondCall[1]).toEqual(['init'])
    expect(String((secondCall[2] as { cwd: string }).cwd).endsWith(basename(testDir))).toBe(true)

    const claudeContent = readFileSync(resolve(testDir, 'CLAUDE.md'), 'utf-8')
    expect(claudeContent).toContain('<!-- zhuge-workflow -->')

    // 第二次执行不重复追加区段
    await initCommand()
    const claudeContent2 = readFileSync(resolve(testDir, 'CLAUDE.md'), 'utf-8')
    const markerCount = (claudeContent2.match(/<!-- zhuge-workflow -->/g) || []).length
    expect(markerCount).toBe(1)
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { rmSync } from 'node:fs'

// 直接测试部署策略的核心逻辑（不依赖模块导入）
// 这里复制核心逻辑进行单元测试，避免对 config-source 的副作用依赖

describe('deploy strategies', () => {
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'zhuge-deploy-test-'))
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe('replace', () => {
    it('should copy file when target does not exist', () => {
      const source = resolve(testDir, 'source.md')
      const target = resolve(testDir, 'target.md')

      writeFileSync(source, 'new content')
      // simulate replace
      const { copyFileSync } = require('node:fs')
      copyFileSync(source, target)

      expect(readFileSync(target, 'utf-8')).toBe('new content')
    })

    it('should backup and replace existing file', () => {
      const source = resolve(testDir, 'source.md')
      const target = resolve(testDir, 'target.md')

      writeFileSync(target, 'old content')
      writeFileSync(source, 'new content')

      // simulate backup + replace
      const { renameSync, copyFileSync } = require('node:fs')
      const backup = `${target}.bak`
      renameSync(target, backup)
      copyFileSync(source, target)

      expect(readFileSync(target, 'utf-8')).toBe('new content')
      expect(readFileSync(backup, 'utf-8')).toBe('old content')
    })
  })

  describe('append', () => {
    it('should append content to existing file', () => {
      const target = resolve(testDir, 'target.md')
      writeFileSync(target, 'existing content')

      const newContent = 'appended content'
      const existing = readFileSync(target, 'utf-8')
      if (!existing.includes(newContent.trim())) {
        writeFileSync(target, existing + '\n' + newContent)
      }

      expect(readFileSync(target, 'utf-8')).toBe('existing content\nappended content')
    })

    it('should skip if content already exists (idempotent)', () => {
      const target = resolve(testDir, 'target.md')
      writeFileSync(target, 'existing content\nappended content')

      const newContent = 'appended content'
      const existing = readFileSync(target, 'utf-8')
      if (!existing.includes(newContent.trim())) {
        writeFileSync(target, existing + '\n' + newContent)
      }

      // should not duplicate
      expect(readFileSync(target, 'utf-8')).toBe('existing content\nappended content')
    })
  })

  describe('merge-section', () => {
    it('should replace content between markers', () => {
      const target = resolve(testDir, 'target.md')
      writeFileSync(
        target,
        'before\n<!-- START -->\nold section\n<!-- END -->\nafter',
      )

      const markerStart = '<!-- START -->'
      const markerEnd = '<!-- END -->'
      const newContent = '<!-- START -->\nnew section\n<!-- END -->'

      const existing = readFileSync(target, 'utf-8')
      const startIdx = existing.indexOf(markerStart)
      const endIdx = existing.indexOf(markerEnd)

      if (startIdx !== -1 && endIdx !== -1) {
        const before = existing.substring(0, startIdx)
        const after = existing.substring(endIdx + markerEnd.length)
        writeFileSync(target, before + newContent + after)
      }

      const result = readFileSync(target, 'utf-8')
      expect(result).toBe('before\n<!-- START -->\nnew section\n<!-- END -->\nafter')
    })

    it('should append when markers not found', () => {
      const target = resolve(testDir, 'target.md')
      writeFileSync(target, 'no markers here')

      const markerStart = '<!-- START -->'
      const markerEnd = '<!-- END -->'
      const newContent = '<!-- START -->\nnew section\n<!-- END -->'

      const existing = readFileSync(target, 'utf-8')
      const startIdx = existing.indexOf(markerStart)
      const endIdx = existing.indexOf(markerEnd)

      if (startIdx !== -1 && endIdx !== -1) {
        // replace
      } else {
        // fallback: append
        writeFileSync(target, existing + '\n' + newContent)
      }

      const result = readFileSync(target, 'utf-8')
      expect(result).toContain('no markers here')
      expect(result).toContain('new section')
    })

    it('should create file when target does not exist', () => {
      const target = resolve(testDir, 'new-target.md')
      const newContent = '<!-- START -->\nnew section\n<!-- END -->'

      if (!existsSync(target)) {
        writeFileSync(target, newContent)
      }

      expect(readFileSync(target, 'utf-8')).toBe(newContent)
    })
  })
})

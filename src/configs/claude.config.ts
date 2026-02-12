import { existsSync } from 'node:fs'
import type { ConfigTarget } from '../core/types.js'
import { expandHome } from '../utils/platform.js'

export const claudeConfig: ConfigTarget = {
  name: 'claude',
  displayName: 'Claude Code',
  configDir: '~/.claude',
  detect: async () => existsSync(expandHome('~/.claude')),
  rules: [
    // CLAUDE.md - Global 区块（个人配置）
    {
      source: 'CLAUDE.md',
      target: '~/.claude/CLAUDE.md',
      strategy: 'merge-section',
      sectionMarker: {
        start: '<!-- Global -->',
        end: '<!-- Global_END -->',
      },
    },
    // CLAUDE.md - CCG 增强区块
    {
      source: 'CLAUDE-ccg.md',
      target: '~/.claude/CLAUDE.md',
      strategy: 'merge-section',
      sectionMarker: {
        start: '<!-- CCG 增强 -->',
        end: '<!-- CCG 增强_END -->',
      },
    },
    // rules - 整体替换（全部由 zhuge 管理）
    {
      source: 'rules',
      target: '~/.claude/rules',
      strategy: 'replace',
    },
    // skills - 只复制 zhuge 管理的，不删除已有的（保护 CCB/第三方 skill）
    {
      source: 'skills',
      target: '~/.claude/skills',
      strategy: 'replace',
    },
    // commands/developer - 只复制 zhuge 管理的（保护 CCG 的 commands/ccg/）
    {
      source: 'commands',
      target: '~/.claude/commands',
      strategy: 'replace',
    },
  ],
}

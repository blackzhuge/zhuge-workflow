import { describe, it, expect } from 'vitest'
import { getAllConfigTargets, getConfigTargetsByNames } from '../../../src/configs/index.js'

describe('config targets registry', () => {
  it('returns only claude target in current version', () => {
    const targets = getAllConfigTargets()

    expect(targets).toHaveLength(1)
    expect(targets[0].name).toBe('claude')
  })

  it('filters targets by exact names', () => {
    const targets = getConfigTargetsByNames(['claude'])

    expect(targets).toHaveLength(1)
    expect(targets[0].name).toBe('claude')
  })

  it('ignores unknown names', () => {
    const targets = getConfigTargetsByNames(['unknown'])

    expect(targets).toHaveLength(0)
  })

  it('supports mixed known and unknown names', () => {
    const targets = getConfigTargetsByNames(['unknown', 'claude'])

    expect(targets).toHaveLength(1)
    expect(targets[0].name).toBe('claude')
  })
})

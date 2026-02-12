import { describe, it, expect } from 'vitest'
import { OpenSpecAdapter } from '../../../src/adapters/openspec.adapter.js'
import { TrellisAdapter } from '../../../src/adapters/trellis.adapter.js'
import { CcbAdapter } from '../../../src/adapters/ccb.adapter.js'
import { CcgAdapter } from '../../../src/adapters/ccg.adapter.js'

describe('Adapter meta', () => {
  it('OpenSpec adapter has correct meta', () => {
    const adapter = new OpenSpecAdapter()
    expect(adapter.meta.name).toBe('openspec')
    expect(adapter.meta.installMethod).toBe('npm-global')
    expect(adapter.meta.interactive).toBe(false)
  })

  it('Trellis adapter has correct meta', () => {
    const adapter = new TrellisAdapter()
    expect(adapter.meta.name).toBe('trellis')
    expect(adapter.meta.installMethod).toBe('npm-global')
    expect(adapter.meta.interactive).toBe(false)
  })

  it('CCB adapter has correct meta', () => {
    const adapter = new CcbAdapter()
    expect(adapter.meta.name).toBe('ccb')
    expect(adapter.meta.installMethod).toBe('git-clone-script')
    expect(adapter.meta.interactive).toBe(false)
  })

  it('CCG adapter has correct meta', () => {
    const adapter = new CcgAdapter()
    expect(adapter.meta.name).toBe('ccg')
    expect(adapter.meta.installMethod).toBe('npx')
    expect(adapter.meta.interactive).toBe(true)
  })
})

describe('Adapter ordering', () => {
  it('adapters are ordered correctly', () => {
    const adapters = [
      new OpenSpecAdapter(),
      new TrellisAdapter(),
      new CcbAdapter(),
      new CcgAdapter(),
    ].sort((a, b) => a.meta.order - b.meta.order)

    expect(adapters.map((a) => a.meta.name)).toEqual([
      'openspec',
      'trellis',
      'ccb',
      'ccg',
    ])
  })
})

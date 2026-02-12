import { describe, it, expect } from 'vitest'
import { getAllAdapters } from '../../../src/adapters/index.js'

describe('plugin-registry', () => {
  it('should return all 4 adapters', () => {
    const adapters = getAllAdapters()
    expect(adapters).toHaveLength(4)
  })

  it('should return adapters sorted by order', () => {
    const adapters = getAllAdapters()
    const orders = adapters.map((a) => a.meta.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('should have unique names', () => {
    const adapters = getAllAdapters()
    const names = adapters.map((a) => a.meta.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

import type { PluginAdapter } from '../core/types.js'
import { OpenSpecAdapter } from './openspec.adapter.js'
import { TrellisAdapter } from './trellis.adapter.js'
import { CcbAdapter } from './ccb.adapter.js'
import { CcgAdapter } from './ccg.adapter.js'

/** 所有已注册的 adapter，按 order 排序 */
export function getAllAdapters(): PluginAdapter[] {
  return [
    new OpenSpecAdapter(),
    new TrellisAdapter(),
    new CcbAdapter(),
    new CcgAdapter(),
  ].sort((a, b) => a.meta.order - b.meta.order)
}

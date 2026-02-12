import { resolve, dirname } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 获取模板目录路径 */
export function getBundledTemplatesDir(): string {
  let dir = __dirname
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'templates')
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate
    }
    dir = resolve(dir, '..')
  }
  throw new Error('Could not find templates directory')
}

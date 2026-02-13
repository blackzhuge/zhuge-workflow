import { readFileSync } from 'node:fs'

type PackageJson = {
  version?: string
}

const FALLBACK_VERSION = '0.0.0'
const PACKAGE_JSON_RELATIVE_PATHS = ['../package.json', '../../package.json'] as const

export function getCliVersion(): string {
  for (const relativePath of PACKAGE_JSON_RELATIVE_PATHS) {
    try {
      const packageJsonPath = new URL(relativePath, import.meta.url)
      const packageJsonRaw = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonRaw) as PackageJson

      if (packageJson.version) {
        return packageJson.version
      }
    } catch {
      continue
    }
  }

  return FALLBACK_VERSION
}

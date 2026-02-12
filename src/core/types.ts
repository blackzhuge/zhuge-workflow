// === 安装方式（可扩展） ===
export type InstallMethod =
  | 'npm-global'
  | 'npx'
  | 'git-clone-script'
  | 'pip'
  | 'binary'
  | 'custom'

// === 工具状态 ===
export interface ToolStatus {
  installed: boolean
  version?: string
  latestVersion?: string
  updateAvailable?: boolean
  path?: string
}

// === Adapter 元信息 ===
export interface AdapterMeta {
  name: string
  displayName: string
  description: string
  installMethod: InstallMethod
  required: boolean
  order: number
  interactive: boolean
  /** 经过测试的锁定版本（不适用于 git-clone 类工具） */
  pinnedVersion?: string
}

// === Plugin Adapter 接口 ===
export interface PluginAdapter {
  readonly meta: AdapterMeta

  /** 检查工具是否已安装及版本信息 */
  check(): Promise<ToolStatus>

  /** 安装工具，可指定版本 */
  install(version?: string): Promise<void>

  /** 更新工具，可指定版本 */
  update(version?: string): Promise<void>

  /** 卸载工具 */
  uninstall(): Promise<void>

  /** 项目级初始化（zhuge init 时调用，可选） */
  initProject?(cwd: string): Promise<void>
}

// === 配置部署策略 ===
export type DeployStrategy = 'replace' | 'append' | 'merge-section'

// === 配置部署规则 ===
export interface ConfigDeployRule {
  /** 模板中的相对路径 */
  source: string
  /** 目标绝对路径（支持 ~ 展开） */
  target: string
  strategy: DeployStrategy
  /** merge-section 时的区段标记 */
  sectionMarker?: {
    start: string
    end: string
  }
}

// === 配置目标 ===
export interface ConfigTarget {
  name: string
  displayName: string
  configDir: string
  rules: ConfigDeployRule[]
  /** 检测该 AI 工具是否已安装 */
  detect(): Promise<boolean>
}

// === Setup 命令选项 ===
export interface SetupOptions {
  yes?: boolean
}

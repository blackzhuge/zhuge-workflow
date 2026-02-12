import { execa, type Options as ExecaOptions } from 'execa'

/** 捕获输出的执行（用于 check、获取版本等） */
export async function exec(cmd: string, args: string[], opts?: ExecaOptions) {
  return execa(cmd, args, { ...opts, reject: true })
}

/** 透传 stdio 的执行（用于交互式安装） */
export async function execInherit(cmd: string, args: string[], opts?: ExecaOptions) {
  return execa(cmd, args, {
    ...opts,
    stdio: 'inherit',
  })
}

/** 检查命令是否存在 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execa('which', [cmd])
    return true
  } catch {
    return false
  }
}

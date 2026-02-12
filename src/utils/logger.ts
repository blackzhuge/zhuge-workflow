import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export function info(msg: string) {
  console.log(chalk.blue('ℹ'), msg)
}

export function success(msg: string) {
  console.log(chalk.green('✔'), msg)
}

export function warn(msg: string) {
  console.log(chalk.yellow('⚠'), msg)
}

export function error(msg: string) {
  console.log(chalk.red('✖'), msg)
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start()
}

export function title(text: string) {
  console.log()
  console.log(chalk.bold.cyan(text))
  console.log(chalk.dim('─'.repeat(text.length + 4)))
}

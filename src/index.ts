import { Command } from 'commander'
import { setupCommand } from './commands/setup.js'
import { initCommand } from './commands/init.js'
import { getCliVersion } from './utils/version.js'

const program = new Command()

program
  .name('zhuge')
  .description('AI development workflow installer and manager')
  .version(getCliVersion())

program
  .command('setup')
  .description('Install external tools and deploy AI config files')
  .option('--yes', 'Skip all prompts and use defaults (CI mode)')
  .action(async (options) => {
    await setupCommand(options)
  })

program
  .command('init')
  .description('Initialize project-level documents in current directory')
  .action(async () => {
    await initCommand()
  })

program.parse()

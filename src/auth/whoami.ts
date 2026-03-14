import chalk from 'chalk';
import { config } from '../lib/config.js';

export async function whoami() {
  const cfg = config.get();
  if (!cfg.pat) {
    console.log(chalk.red('Not logged in.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan('Account:   ') + (cfg.accountEmail ?? 'unknown'));
  console.log(chalk.cyan('Name:      ') + (cfg.accountName ?? 'unknown'));
  console.log(
    chalk.cyan('Project:   ') +
      (cfg.projectId ? `${cfg.projectName ?? 'unnamed'} (${cfg.projectId})` : 'none')
  );
  console.log('');
}

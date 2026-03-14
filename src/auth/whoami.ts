import chalk from 'chalk';
import { config } from '../lib/config.js';

export async function whoami() {
  const cfg = config.get();
  if (!cfg.apiKey) {
    console.log(chalk.red('Not logged in.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan('API Key:   ') + cfg.apiKey);
  console.log(chalk.cyan('Project:   ') + (cfg.projectId ?? 'none'));
  console.log('');
}

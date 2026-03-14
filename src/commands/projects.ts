import chalk from 'chalk';
import { config } from '../lib/config.js';

export async function projectsList() {
  const cfg = config.get();
  console.log('');
  console.log(
    chalk.cyan('Active project: ') + (cfg.projectId ?? chalk.gray('none'))
  );
  console.log('');
}

export async function projectsUse(projectId: string) {
  config.set({ projectId });
  console.log(chalk.green('Active project set to: ') + chalk.cyan(projectId));
}

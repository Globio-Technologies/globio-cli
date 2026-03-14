import * as p from '@clack/prompts';
import chalk from 'chalk';
import { config } from '../lib/config.js';

export async function logout() {
  config.clear();
  p.outro(chalk.green('Logged out.'));
}

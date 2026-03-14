import chalk from 'chalk';
import { orange, muted } from '../lib/banner.js';
import { config } from '../lib/config.js';

export async function profilesList() {
  const profiles = config.listProfiles();
  const active = config.getActiveProfile();

  if (!profiles.length) {
    console.log(chalk.gray('No profiles found. Run: globio login'));
    return;
  }

  console.log('');
  for (const name of profiles) {
    const data = config.getProfile(name);
    const isActive = name === active;
    const bullet = isActive ? orange('●') : chalk.gray('○');
    const label = isActive ? orange(name) : chalk.white(name);
    const email = data?.account_email ? muted(data.account_email) : chalk.gray('unknown');
    const tag = isActive ? muted(' (active)') : '';

    console.log(`  ${bullet}  ${label}   ${email}${tag}`);
  }
  console.log('');
}

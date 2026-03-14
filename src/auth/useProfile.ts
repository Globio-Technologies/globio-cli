import chalk from 'chalk';
import { orange } from '../lib/banner.js';
import { config } from '../lib/config.js';

export async function useProfile(profileName: string) {
  const profile = config.getProfile(profileName);
  if (!profile) {
    console.log(
      chalk.red(
        `Profile "${profileName}" not found. Run: globio login --profile ${profileName}`
      )
    );
    process.exit(1);
  }

  config.setActiveProfile(profileName);
  console.log(
    chalk.green('Switched to profile: ') + orange(profileName) + ` (${profile.account_email})`
  );
}

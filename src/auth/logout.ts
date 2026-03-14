import chalk from 'chalk';
import { config } from '../lib/config.js';

export async function logout(options: { profile?: string } = {}) {
  const activeProfile = config.getActiveProfile();
  const profileName = options.profile ?? activeProfile;
  const profile = profileName ? config.getProfile(profileName) : null;

  if (!profileName || !profile) {
    console.log(chalk.yellow(`No active session on profile "${profileName || 'default'}".`));
    return;
  }

  config.deleteProfile(profileName);

  if (profileName === activeProfile) {
    const remaining = config.listProfiles();
    if (remaining.length > 0) {
      config.setActiveProfile(remaining[0]);
      console.log(chalk.green(`Logged out. Switched to profile: ${remaining[0]}`));
      return;
    }

    config.setActiveProfile('');
    console.log(chalk.green('Logged out.'));
    return;
  }

  console.log(chalk.green(`Logged out profile: ${profileName}`));
}

import chalk from 'chalk';
import { config } from '../lib/config.js';
import { muted, orange } from '../lib/banner.js';

export async function whoami(options: { profile?: string } = {}) {
  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);

  if (!profile) {
    console.log(chalk.red('Not logged in. Run: globio login'));
    return;
  }

  const allProfiles = config.listProfiles();
  const activeProfile = config.getActiveProfile();

  console.log('');
  console.log(
    muted('Profile:  ') + orange(profileName) + (profileName === activeProfile ? muted(' (active)') : '')
  );
  console.log(muted('Account:  ') + profile.account_email);
  console.log(muted('Name:     ') + (profile.account_name || '—'));
  console.log(
    muted('Project:  ') +
      (profile.active_project_id
        ? orange(profile.active_project_name || 'unnamed') + muted(` (${profile.active_project_id})`)
        : chalk.gray('none — run: globio projects use <id>'))
  );

  if (allProfiles.length > 1) {
    console.log('');
    console.log(
      muted('Other profiles: ') + allProfiles.filter((name) => name !== profileName).join(', ')
    );
  }
  console.log('');
}

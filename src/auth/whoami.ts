import { config } from '../lib/config.js';
import {
  failure,
  getCliVersion,
  header,
  inactive,
  muted,
  orange,
  renderTable,
  white,
  gold,
  reset,
} from '../lib/banner.js';

const version = getCliVersion();

export async function whoami(options: { profile?: string } = {}) {
  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);

  if (!profile) {
    console.log(
      header(version) +
        '  ' +
        failure('Not logged in.') +
        reset +
        '  Run: globio login\n'
    );
    return;
  }

  const allProfiles = config.listProfiles();
  const active = config.getActiveProfile();
  const otherProfiles = allProfiles.filter((p) => p !== profileName).join(', ') || '—';

  console.log(
    header(
      version,
      'Logged in as ' +
        orange(profile.account_name || profile.account_email) +
        reset +
        ' · ' +
        muted(profile.account_email)
    )
  );

  console.log(
    renderTable({
      columns: [
        { header: 'Profile', width: 16 },
        { header: 'Value', width: 44 },
      ],
      rows: [
        [
          'Profile',
          profileName === active
            ? orange(profileName) + reset + ' ' + inactive('(active)')
            : inactive(profileName),
        ],
        ['Other profiles', inactive(otherProfiles)],
        ['Account', white(profile.account_name || '—')],
        ['Organization', white(profile.org_name || '—')],
        [
          'Active project',
          profile.active_project_id
            ? gold(profile.active_project_name || 'unnamed') +
              reset +
              ' ' +
              inactive(profile.active_project_id)
            : inactive('none — run: globio projects use <id>'),
        ],
      ],
    })
  );
  console.log('');
}

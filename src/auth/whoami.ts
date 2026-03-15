import { config } from '../lib/config.js';
import {
  failure,
  getCliVersion,
  header,
  inactive,
  jsonOutput,
  muted,
  orange,
  renderTable,
  white,
  gold,
  reset,
} from '../lib/banner.js';

const version = getCliVersion();

export async function whoami(options: { profile?: string; json?: boolean } = {}) {
  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);
  const active = config.getActiveProfile();

  if (!profile) {
    if (options.json) {
      jsonOutput({
        profile: profileName,
        active: false,
        account_email: null,
        account_name: null,
        org_name: null,
        active_project_id: null,
        active_project_name: null,
      });
    }

    console.log(
      header(version) +
        '  ' +
        failure('Not logged in.') +
        reset +
        '  Run: globio login\n'
    );
    return;
  }

  if (options.json) {
    jsonOutput({
      profile: profileName,
      active: profileName === active,
      account_email: profile.account_email,
      account_name: profile.account_name,
      org_name: profile.org_name ?? null,
      active_project_id: profile.active_project_id ?? null,
      active_project_name: profile.active_project_name ?? null,
    });
  }

  const allProfiles = config.listProfiles();
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

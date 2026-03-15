import {
  getCliVersion,
  green,
  header,
  inactive,
  jsonOutput,
  muted,
  orange,
  renderTable,
  reset,
  white,
} from '../lib/banner.js';
import { config } from '../lib/config.js';

const version = getCliVersion();

export async function profilesList(options: { json?: boolean } = {}) {
  const profiles = config.listProfiles();
  const active = config.getActiveProfile();
  const wantsJson = options.json ?? process.argv.includes('--json');

  if (wantsJson) {
    jsonOutput(
      profiles.map((name) => {
        const profile = config.getProfile(name);
        return {
          name,
          email: profile?.account_email ?? null,
          active: name === active,
        };
      })
    );
  }

  if (!profiles.length) {
    console.log(
      header(version) + '  ' + muted('No profiles. Run: globio login') + '\n'
    );
    return;
  }

  const rows = profiles.map((name) => {
    const p = config.getProfile(name);
    const isActive = name === active;
    return [
      isActive ? orange(name) : inactive(name),
      p?.account_email
        ? isActive
          ? white(p.account_email)
          : muted(p.account_email)
        : inactive('—'),
      isActive ? green('active') : inactive('—'),
    ];
  });

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Profile', width: 16 },
        { header: 'Account', width: 36 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
  console.log('');
}

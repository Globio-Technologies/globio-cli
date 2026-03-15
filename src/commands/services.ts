import { config } from '../lib/config.js';
import { manageRequest, type ManageProjectServices } from '../lib/manage.js';
import {
  footer,
  getCliVersion,
  green,
  header,
  inactive,
  jsonOutput,
  muted,
  orange,
  renderTable,
} from '../lib/banner.js';

const version = getCliVersion();

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  id: 'Authentication and user management',
  doc: 'Document database',
  vault: 'File storage',
  pulse: 'Feature flags and remote config',
  scope: 'Analytics and event tracking',
  sync: 'Real-time multiplayer rooms',
  signal: 'Push notifications',
  mart: 'Game economy and payments',
  brain: 'AI agents and LLM routing',
  code: 'Edge functions and GC Hooks',
};

export async function servicesList(options: { profile?: string; json?: boolean } = {}) {
  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);
  let serviceStatuses: ManageProjectServices = {};

  if (profile?.active_project_id) {
    try {
      serviceStatuses = await manageRequest<ManageProjectServices>(
        `/projects/${profile.active_project_id}/services`,
        { profileName }
      );
    } catch {
      serviceStatuses = {};
    }
  }

  if (options.json) {
    jsonOutput(
      Object.keys(SERVICE_DESCRIPTIONS).map((service) => ({
        service,
        enabled: serviceStatuses[service] ?? false,
      }))
    );
  }

  const rows = Object.entries(SERVICE_DESCRIPTIONS).map(([slug, desc]) => {
    const enabled = serviceStatuses[slug] ?? null;
    return [
      orange(slug),
      muted(desc),
      enabled === true
        ? green('enabled')
        : enabled === false
          ? inactive('disabled')
          : inactive('—'),
    ];
  });

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Service', width: 10 },
        { header: 'Description', width: 42 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
  console.log(footer('Manage services at console.globio.stanlink.online'));
}

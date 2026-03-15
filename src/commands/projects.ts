import * as p from '@clack/prompts';
import { config } from '../lib/config.js';
import {
  manageRequest,
  type ManageOrg,
  type ManageProject,
  type ManageProjectKey,
  type ManageProjectServices,
} from '../lib/manage.js';
import {
  footer,
  getCliVersion,
  gold,
  green,
  header,
  inactive,
  jsonOutput,
  muted,
  orange,
  renderTable,
  reset,
  white,
  failure,
} from '../lib/banner.js';

const version = getCliVersion();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}

function resolveProfileName(profileName?: string) {
  return profileName ?? config.getActiveProfile() ?? 'default';
}

async function createServerKey(projectId: string, profileName: string) {
  const created = await manageRequest<ManageProjectKey>(`/projects/${projectId}/keys`, {
    method: 'POST',
    body: {
      name: 'CLI server key',
      scope: 'server',
    },
    profileName,
  });

  if (!created.token) {
    throw new Error('Management API did not return a project API key');
  }

  return created.token;
}

function buildSlug(value: string) {
  return slugify(value).slice(0, 30);
}

async function createProjectRecord(
  input: {
    profileName: string;
    orgId: string;
    orgName?: string;
    name: string;
    slug?: string;
    environment?: string;
  }
) {
  const result = await manageRequest<{
    project: { id: string; name: string; slug: string; environment: string; active: boolean };
    keys: { client: string; server: string };
  }>('/projects', {
    method: 'POST',
    body: {
      org_id: input.orgId,
      name: input.name,
      slug: input.slug ?? buildSlug(input.name),
      environment: input.environment ?? 'development',
    },
    profileName: input.profileName,
  });

  config.setProfile(input.profileName, {
    active_project_id: result.project.id,
    active_project_name: result.project.name,
    org_name: input.orgName,
    project_api_key: result.keys.server,
  });
  config.setActiveProfile(input.profileName);

  return result;
}

export async function projectsList(options: { profile?: string; json?: boolean } = {}) {
  const profileName = resolveProfileName(options.profile);
  config.requireAuth(profileName);

  const projects = await manageRequest<ManageProject[]>('/projects', { profileName });
  const activeProjectId = config.getProfile(profileName)?.active_project_id;

  if (options.json) {
    jsonOutput(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        org_id: project.org_id,
        org_name: project.org_name,
        environment: project.environment,
        active: project.id === activeProjectId,
      }))
    );
  }

  if (!projects.length) {
    console.log(header(version) + '  ' + muted('No projects found.') + '\n');
    return;
  }

  const rows = projects.map((project) => [
    activeProjectId === project.id
      ? gold(project.name) + reset + ' ' + orange('●') + reset
      : white(project.name),
    muted(project.id),
    muted(project.org_name || project.org_id),
    inactive(
      project.environment === 'development'
        ? 'dev'
        : project.environment === 'production'
          ? 'prod'
          : project.environment === 'staging'
            ? 'stg'
            : project.environment ?? 'dev'
    ),
  ]);

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Project', width: 24 },
        { header: 'ID', width: 26 },
        { header: 'Org', width: 16 },
        { header: 'Env', width: 6 },
      ],
      rows,
    })
  );
  console.log(
    footer('● active project · run globio projects use <id> to switch')
  );
}

export async function projectsUse(
  projectId: string,
  options: { profile?: string; json?: boolean } = {}
) {
  const profileName = resolveProfileName(options.profile);
  config.requireAuth(profileName);

  const projects = await manageRequest<ManageProject[]>('/projects', { profileName });
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    if (options.json) {
      jsonOutput({ success: false, error: `Project not found: ${projectId}` });
    }
    console.log(failure(`Project not found: ${projectId}`));
    process.exit(1);
  }

  await manageRequest<ManageProjectKey[]>(`/projects/${projectId}/keys`, { profileName });
  const apiKey = await createServerKey(projectId, profileName);

  config.setProfile(profileName, {
    active_project_id: project.id,
    active_project_name: project.name,
    org_name: project.org_name,
    project_api_key: apiKey,
  });
  config.setActiveProfile(profileName);

  if (options.json) {
    jsonOutput({
      success: true,
      project_id: project.id,
      project_name: project.name,
    });
  }

  console.log(green('Active project: ') + `${project.name} (${project.id})`);
}

export async function projectsCreate(
  options: {
    profile?: string;
    name?: string;
    org?: string;
    env?: string;
    json?: boolean;
  } = {}
) {
  const profileName = resolveProfileName(options.profile);
  config.requireAuth(profileName);

  const orgs = await manageRequest<ManageOrg[]>('/orgs', { profileName });
  if (!orgs.length) {
    console.log(failure('No organizations found. Create one in the console first.'));
    process.exit(1);
  }

  const isNonInteractive = Boolean(options.name && options.org);

  if (options.json && !isNonInteractive) {
    jsonOutput({
      success: false,
      error: 'projects create --json requires --name <name> and --org <orgId>',
    });
  }

  if (isNonInteractive) {
    const org = orgs.find((item) => item.id === options.org);
    if (!org) {
      console.log(failure(`Organization not found: ${options.org}`));
      process.exit(1);
    }

    const result = await createProjectRecord({
      profileName,
      orgId: org.id,
      orgName: org.name,
      name: options.name as string,
      environment: options.env ?? 'development',
    });

    if (options.json) {
      jsonOutput({
        success: true,
        project_id: result.project.id,
        project_name: result.project.name,
        org_id: org.id,
        environment: result.project.environment,
        client_key: result.keys.client,
        server_key: result.keys.server,
      });
    }

    console.log('');
    console.log(green('Project created successfully.'));
    console.log(orange('Project: ') + reset + `${result.project.name} (${result.project.id})`);
    console.log(orange('Client key: ') + reset + result.keys.client);
    console.log(orange('Server key: ') + reset + result.keys.server);
    console.log('');
    return;
  }

  const orgId = await p.select({
    message: 'Select an organization',
    options: orgs.map((org) => ({
      value: org.id,
      label: org.name,
      hint: org.role,
    })),
  });

  if (p.isCancel(orgId)) {
    p.cancel('Project creation cancelled.');
    process.exit(0);
  }

  const values = await p.group(
    {
      name: () =>
        p.text({
          message: 'Project name',
          validate: (value) => (!value ? 'Project name is required' : undefined),
        }),
      slug: ({ results }) =>
        p.text({
          message: 'Project slug',
          initialValue: buildSlug(String(results.name ?? '')),
          validate: (value) => (!value ? 'Project slug is required' : undefined),
        }),
      environment: () =>
        p.select({
          message: 'Environment',
          options: [
            { value: 'development', label: 'development' },
            { value: 'staging', label: 'staging' },
            { value: 'production', label: 'production' },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel('Project creation cancelled.');
        process.exit(0);
      },
    }
  );

  const result = await createProjectRecord({
    profileName,
    orgId,
    orgName: orgs.find((org) => org.id === orgId)?.name,
    name: String(values.name),
    slug: String(values.slug),
    environment: String(values.environment),
  });

  console.log('');
  console.log(green('Project created successfully.'));
  console.log(orange('Project: ') + reset + `${result.project.name} (${result.project.id})`);
  console.log(orange('Client key: ') + reset + result.keys.client);
  console.log(orange('Server key: ') + reset + result.keys.server);
  console.log('');
}

export { createProjectRecord, buildSlug };

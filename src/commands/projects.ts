import * as p from '@clack/prompts';
import chalk from 'chalk';
import { config } from '../lib/config.js';
import {
  manageRequest,
  type ManageOrg,
  type ManageProject,
  type ManageProjectKey,
} from '../lib/manage.js';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}

async function ensureProjectKey(projectId: string) {
  const existingKey = config.getProjectApiKey(projectId);
  if (existingKey) return existingKey;

  const created = await manageRequest<ManageProjectKey>(`/projects/${projectId}/keys`, {
    method: 'POST',
    body: {
      name: 'CLI server key',
      scope: 'server',
    },
  });

  if (!created.token) {
    throw new Error('Management API did not return a project API key');
  }

  return created.token;
}

export async function projectsList() {
  const projects = await manageRequest<ManageProject[]>('/projects');
  const activeProjectId = config.get().projectId;
  const grouped = new Map<string, ManageProject[]>();

  for (const project of projects) {
    const list = grouped.get(project.org_name) ?? [];
    list.push(project);
    grouped.set(project.org_name, list);
  }

  console.log('');
  if (!projects.length) {
    console.log(chalk.gray('No projects found.'));
    console.log('');
    return;
  }

  for (const [orgName, orgProjects] of grouped.entries()) {
    console.log(chalk.cyan(`org: ${orgName}`));
    for (const project of orgProjects) {
      const marker = project.id === activeProjectId ? chalk.green('●') : chalk.gray('○');
      const active = project.id === activeProjectId ? chalk.green('  (active)') : '';
      console.log(`  ${marker} ${project.slug.padEnd(22)} ${chalk.gray(project.id)}${active}`);
    }
    console.log('');
  }
}

export async function projectsUse(projectId: string) {
  const projects = await manageRequest<ManageProject[]>('/projects');
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    console.log(chalk.red(`Project not found: ${projectId}`));
    process.exit(1);
  }

  const apiKey = await ensureProjectKey(projectId);
  config.setProjectAuth(projectId, apiKey, project.name);
  console.log(chalk.green('Active project set to: ') + chalk.cyan(`${project.name} (${project.id})`));
}

export async function projectsCreate() {
  const orgs = await manageRequest<ManageOrg[]>('/orgs');
  if (!orgs.length) {
    console.log(chalk.red('No organizations found. Create one in the console first.'));
    process.exit(1);
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
          initialValue: slugify(String(results.name ?? '')),
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

  const result = await manageRequest<{
    project: { id: string; name: string; slug: string; environment: string; active: boolean };
    keys: { client: string; server: string };
  }>('/projects', {
    method: 'POST',
    body: {
      org_id: orgId,
      name: values.name,
      slug: values.slug,
      environment: values.environment,
    },
  });

  config.setProjectAuth(result.project.id, result.keys.server, result.project.name);

  console.log('');
  console.log(chalk.green('Project created successfully.'));
  console.log(chalk.cyan('Project: ') + `${result.project.name} (${result.project.id})`);
  console.log(chalk.cyan('Client key: ') + result.keys.client);
  console.log(chalk.cyan('Server key: ') + result.keys.server);
  console.log('');
}

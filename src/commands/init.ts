import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { config } from '../lib/config.js';
import {
  failure,
  getCliVersion,
  jsonOutput,
  muted,
  orange,
  printSuccess,
  printBanner,
} from '../lib/banner.js';
import { promptInit } from '../prompts/init.js';
import { migrateFirestore, migrateFirebaseStorage } from './migrate.js';
import { buildSlug, createProjectRecord, projectsCreate, projectsUse } from './projects.js';

const version = getCliVersion();

export async function init(
  options: {
    profile?: string;
    name?: string;
    slug?: string;
    org?: string;
    env?: string;
    migrate?: boolean;
    from?: string;
    json?: boolean;
  } = {}
) {
  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);
  if (!profile) {
    if (options.json) {
      jsonOutput({ success: false, error: `Run: npx @globio/cli login --profile ${profileName}` });
    }
    console.log(failure('Run: npx @globio/cli login --profile ' + profileName));
    process.exit(1);
  }

  const isNonInteractive = Boolean(options.name && options.org);
  let filesCreated: string[] = [];

  if (options.json && !isNonInteractive) {
    jsonOutput({
      success: false,
      error: 'init --json requires --name <name> and --org <orgId>',
    });
  }

  if (!isNonInteractive) {
    printBanner(version);
    p.intro(orange('⇒⇒') + '  Initialize your Globio project');

    if (!profile.active_project_id) {
      await projectsCreate({ profile: profileName });
    } else {
      await projectsUse(profile.active_project_id, { profile: profileName });
    }
  } else {
    const orgId = options.org as string;
    const orgName = profile.org_name;
    const created = await createProjectRecord({
      profileName,
      orgId,
      orgName,
      name: options.name as string,
      slug: options.slug ?? buildSlug(options.name as string),
      environment: options.env ?? 'development',
    });
    void created;
  }

  const values = isNonInteractive
    ? {
        migrateFromFirebase: Boolean(options.from),
        serviceAccountPath: options.from,
      }
    : await promptInit();
  const activeProfile = config.getProfile(profileName);
  const activeProjectKey = activeProfile?.project_api_key;
  const { projectId: activeProjectId } = config.requireProject(profileName);
  const activeProjectName = activeProfile?.active_project_name ?? 'unnamed';

  if (!activeProjectKey) {
    if (options.json) {
      jsonOutput({
        success: false,
        error: `No project API key cached. Run: npx @globio/cli projects use ${activeProjectId}`,
      });
    }
    console.log(failure('No project API key cached. Run: npx @globio/cli projects use ' + activeProjectId));
    process.exit(1);
  }

  if (!existsSync('globio.config.ts')) {
    writeFileSync(
      'globio.config.ts',
      `import { Globio } from '@globio/sdk';

export const globio = new Globio({
  apiKey: process.env.GLOBIO_API_KEY!,
  projectId: '${activeProjectId}',
});
`
    );
    filesCreated.push('globio.config.ts');
    if (!options.json) {
      printSuccess('Created globio.config.ts');
    }
  }

  if (!existsSync('.env')) {
    writeFileSync('.env', `GLOBIO_API_KEY=${activeProjectKey}\n`);
    filesCreated.push('.env');
    if (!options.json) {
      printSuccess('Created .env');
    }
  }

  if (values.migrateFromFirebase && values.serviceAccountPath) {
    if (!options.json) {
      console.log('');
      printSuccess('Starting Firebase migration...');
    }

    await migrateFirestore({
      from: values.serviceAccountPath as string,
      all: true,
      profile: profileName,
    });

    const serviceAccount = JSON.parse(
      readFileSync(values.serviceAccountPath as string, 'utf-8')
    ) as { project_id: string };

    await migrateFirebaseStorage({
      from: values.serviceAccountPath as string,
      bucket: `${serviceAccount.project_id}.appspot.com`,
      all: true,
      profile: profileName,
    });
  }

  if (options.json) {
    jsonOutput({
      success: true,
      project_id: activeProjectId,
      project_name: activeProjectName,
      api_key: activeProjectKey,
      files_created: filesCreated,
    });
  }

  console.log('');
  p.outro(
    orange('⇒⇒') +
      '  Your project is ready.\n\n' +
      '  ' +
      muted('Next steps:') +
      '\n\n' +
      '  npm install @globio/sdk\n' +
      `  # active project: ${activeProjectId}\n` +
      '  npx @globio/cli functions create my-first-function'
  );
}

import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { config } from '../lib/config.js';
import {
  getCliVersion,
  muted,
  orange,
  printSuccess,
  printBanner,
} from '../lib/banner.js';
import { promptInit } from '../prompts/init.js';
import { migrateFirestore, migrateFirebaseStorage } from './migrate.js';
import { projectsCreate, projectsUse } from './projects.js';

const version = getCliVersion();

export async function init(options: { profile?: string } = {}) {
  printBanner(version);
  p.intro(orange('⇒⇒') + '  Initialize your Globio project');

  const profileName = options.profile ?? config.getActiveProfile() ?? 'default';
  const profile = config.getProfile(profileName);
  if (!profile) {
    console.log('Run: npx @globio/cli login --profile ' + profileName);
    process.exit(1);
  }

  if (!profile.active_project_id) {
    await projectsCreate({ profile: profileName });
  } else {
    await projectsUse(profile.active_project_id, { profile: profileName });
  }

  const values = await promptInit();
  const activeProfile = config.getProfile(profileName);
  const activeProjectKey = activeProfile?.project_api_key;
  const { projectId: activeProjectId } = config.requireProject(profileName);

  if (!activeProjectKey) {
    console.log('No project API key cached. Run: npx @globio/cli projects use ' + activeProjectId);
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
    printSuccess('Created globio.config.ts');
  }

  if (!existsSync('.env')) {
    writeFileSync('.env', `GLOBIO_API_KEY=${activeProjectKey}\n`);
    printSuccess('Created .env');
  }

  if (values.migrateFromFirebase && values.serviceAccountPath) {
    console.log('');
    printSuccess('Starting Firebase migration...');

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

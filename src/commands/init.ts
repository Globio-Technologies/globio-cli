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

export async function init() {
  printBanner(version);
  p.intro(orange('⇒⇒') + '  Initialize your Globio project');

  const cfg = config.get();
  if (!cfg.projectId) {
    await projectsCreate();
  } else {
    await projectsUse(cfg.projectId);
  }

  const values = await promptInit();
  const activeProjectKey = config.requireProjectApiKey();
  const activeProjectId = config.requireProject();

  if (!existsSync('globio.config.ts')) {
    writeFileSync(
      'globio.config.ts',
      `import { Globio } from '@globio/sdk';

export const globio = new Globio({
  apiKey: process.env.GLOBIO_API_KEY!,
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
    });

    const serviceAccount = JSON.parse(
      readFileSync(values.serviceAccountPath as string, 'utf-8')
    ) as { project_id: string };

    await migrateFirebaseStorage({
      from: values.serviceAccountPath as string,
      bucket: `${serviceAccount.project_id}.appspot.com`,
      all: true,
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

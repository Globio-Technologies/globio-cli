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

const version = getCliVersion();

export async function init() {
  printBanner(version);
  p.intro(orange('⇒⇒') + '  Initialize your Globio project');

  const values = await promptInit();

  config.set({
    apiKey: values.apiKey as string,
    projectId: values.projectId as string,
  });

  if (!existsSync('globio.config.ts')) {
    writeFileSync(
      'globio.config.ts',
      `import { GlobioClient } from '@globio/sdk';

export const globio = new GlobioClient({
  apiKey: process.env.GLOBIO_API_KEY!,
});
`
    );
    printSuccess('Created globio.config.ts');
  }

  if (!existsSync('.env')) {
    writeFileSync('.env', `GLOBIO_API_KEY=${values.apiKey}\n`);
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
      '  npx @globio/cli functions create my-first-function'
  );
}

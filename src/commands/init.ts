import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { config } from '../lib/config.js';
import { promptInit } from '../prompts/init.js';
import { migrateFirestore, migrateFirebaseStorage } from './migrate.js';

export async function init() {
  console.log('');
  p.intro(chalk.bgCyan(chalk.black(' Globio — Game Backend as a Service ')));

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
    console.log(chalk.green('✓ Created globio.config.ts'));
  }

  if (!existsSync('.env')) {
    writeFileSync('.env', `GLOBIO_API_KEY=${values.apiKey}\n`);
    console.log(chalk.green('✓ Created .env'));
  }

  if (values.migrateFromFirebase && values.serviceAccountPath) {
    console.log('');
    console.log(chalk.cyan('Starting Firebase migration...'));

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
    chalk.green('Your Globio project is ready.') +
      '\n\n' +
      chalk.white('  Next steps:\n') +
      chalk.gray('  npm install @globio/sdk\n') +
      chalk.gray('  npx @globio/cli functions create my-first-function\n')
  );
}

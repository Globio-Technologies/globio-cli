#!/usr/bin/env node
import { Command } from 'commander';
import { login } from './auth/login.js';
import { logout } from './auth/logout.js';
import { whoami } from './auth/whoami.js';
import { init } from './commands/init.js';
import { projectsList, projectsUse } from './commands/projects.js';
import { servicesList } from './commands/services.js';
import {
  functionsList,
  functionsCreate,
  functionsDeploy,
  functionsInvoke,
  functionsLogs,
  functionsDelete,
  functionsToggle,
} from './commands/functions.js';
import {
  migrateFirestore,
  migrateFirebaseStorage,
} from './commands/migrate.js';
import { getCliVersion, printBanner } from './lib/banner.js';

const version = getCliVersion();

const program = new Command();

program
  .name('globio')
  .description('The official Globio CLI')
  .version(version)
  .addHelpText('beforeAll', () => {
    printBanner(version);
    return '';
  });

program.command('login').description('Log in to your Globio account').action(login);
program.command('logout').description('Log out').action(logout);
program.command('whoami').description('Show current account and project').action(whoami);

program.command('init').description('Initialize a Globio project').action(init);

const projects = program.command('projects').description('Manage projects');
projects.command('list').description('List projects').action(projectsList);
projects.command('use <projectId>').description('Set active project').action(projectsUse);

program.command('services').description('List available Globio services').action(servicesList);

const functions = program
  .command('functions')
  .alias('fn')
  .description('Manage GlobalCode edge functions');

functions.command('list').description('List all functions').action(functionsList);
functions.command('create <slug>').description('Scaffold a new function file locally').action(functionsCreate);
functions
  .command('deploy <slug>')
  .description('Deploy a function to GlobalCode')
  .option('-f, --file <path>', 'Path to function file')
  .option('-n, --name <name>', 'Display name')
  .action(functionsDeploy);
functions
  .command('invoke <slug>')
  .description('Invoke a function')
  .option('-i, --input <json>', 'JSON input payload')
  .action(functionsInvoke);
functions
  .command('logs <slug>')
  .description('Show invocation history')
  .option('-l, --limit <n>', 'Number of entries', '20')
  .action(functionsLogs);
functions.command('delete <slug>').description('Delete a function').action(functionsDelete);
functions.command('enable <slug>').description('Enable a function').action((slug) => functionsToggle(slug, true));
functions.command('disable <slug>').description('Disable a function').action((slug) => functionsToggle(slug, false));

const migrate = program
  .command('migrate')
  .description('Migrate from Firebase to Globio');

migrate
  .command('firestore')
  .description('Migrate Firestore collections to GlobalDoc')
  .requiredOption('--from <path>', 'Path to Firebase service account JSON')
  .option('--collection <name>', 'Migrate a specific collection')
  .option('--all', 'Migrate all collections')
  .action(migrateFirestore);

migrate
  .command('firebase-storage')
  .description('Migrate Firebase Storage to GlobalVault')
  .requiredOption('--from <path>', 'Path to Firebase service account JSON')
  .requiredOption('--bucket <name>', 'Firebase Storage bucket')
  .option('--folder <path>', 'Migrate a specific folder')
  .option('--all', 'Migrate all files')
  .action(migrateFirebaseStorage);

if (process.argv.length <= 2) {
  program.help();
}

await program.parseAsync();

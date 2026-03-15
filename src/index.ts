#!/usr/bin/env node
import { Command } from 'commander';
import { login } from './auth/login.js';
import { logout } from './auth/logout.js';
import { useProfile } from './auth/useProfile.js';
import { whoami } from './auth/whoami.js';
import { init } from './commands/init.js';
import { projectsCreate, projectsList, projectsUse } from './commands/projects.js';
import { profilesList } from './commands/profiles.js';
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
  hooksList,
  hooksCreate,
  hooksDeploy,
  hooksLogs,
  hooksToggle,
  hooksDelete,
} from './commands/hooks.js';
import { functionsWatch } from './commands/watch.js';
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
  })
  .addHelpText(
    'after',
    `
Examples:
  $ globio login
  $ globio login --profile work
  $ globio use work
  $ globio projects list
  $ globio projects use proj_abc123
  $ globio functions deploy my-function
  $ globio hooks deploy on-signup --trigger id.onSignup
  $ globio hooks list
  $ globio migrate firestore --from ./key.json --all

Credentials are stored in ~/.globio/profiles/
`
  );

program
  .command('login')
  .description('Log in to your Globio account')
  .option('-p, --profile <name>', 'Profile name', 'default')
  .option('--token <pat>', 'Personal access token (non-interactive)')
  .option('--json', 'Output as JSON')
  .action(login);
program.command('logout').description('Log out').option('--profile <name>', 'Use a specific profile').action(logout);
program.command('whoami').description('Show current account and project').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(whoami);
program.command('use <profile>').description('Switch active profile').action(useProfile);

program
  .command('init')
  .description('Initialize a Globio project')
  .option('-p, --profile <name>', 'Profile name')
  .option('--name <name>', 'Project name')
  .option('--slug <slug>', 'Project slug')
  .option('--org <orgId>', 'Organization ID')
  .option('--env <environment>', 'Environment (development|staging|production)', 'development')
  .option('--no-migrate', 'Skip Firebase migration prompt')
  .option('--from <path>', 'Firebase service account path (triggers migration)')
  .option('--json', 'Output as JSON')
  .action(init);

const profiles = program
  .command('profiles')
  .description('Manage login profiles')
  .option('--json', 'Output as JSON')
  .action(function (this: Command) {
    return profilesList(this.opts());
  });

profiles
  .command('list')
  .description('List all profiles')
  .option('--json', 'Output as JSON')
  .action(function (this: Command) {
    return profilesList(this.opts());
  });

const projects = program.command('projects').description('Manage projects');
projects.command('list').description('List projects').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(projectsList);
projects
  .command('create')
  .description('Create a project')
  .option('--name <name>', 'Project name')
  .option('--org <orgId>', 'Organization ID')
  .option('--env <environment>', 'Environment', 'development')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action(projectsCreate);
projects.command('use <projectId>').description('Set active project').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(projectsUse);

program.command('services').description('List available Globio services').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(servicesList);

const functions = program
  .command('functions')
  .alias('fn')
  .description('Manage edge functions');

functions.command('list').description('List all functions').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(functionsList);
functions.command('create <slug>').description('Scaffold a new function file locally').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(functionsCreate);
functions
  .command('deploy <slug>')
  .description('Deploy a function to GlobalCode')
  .option('-f, --file <path>', 'Path to function file')
  .option('-n, --name <name>', 'Display name')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(functionsDeploy);
functions
  .command('invoke <slug>')
  .description('Invoke a function')
  .option('-i, --input <json>', 'JSON input payload')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(functionsInvoke);
functions
  .command('logs <slug>')
  .description('Show invocation history')
  .option('-l, --limit <n>', 'Number of entries', '20')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(functionsLogs);
functions
  .command('watch <slug>')
  .description('Stream live function execution logs')
  .option('--profile <name>', 'Use a specific profile')
  .action(functionsWatch);
functions.command('delete <slug>').description('Delete a function').option('--profile <name>', 'Use a specific profile').option('--json', 'Output as JSON').action(functionsDelete);
functions
  .command('enable <slug>')
  .description('Enable a function')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action((slug, options) => functionsToggle(slug, true, options));
functions
  .command('disable <slug>')
  .description('Disable a function')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action((slug, options) => functionsToggle(slug, false, options));

const hooks = program
  .command('hooks')
  .description('Manage GC Hooks')
  .action(hooksList);

hooks
  .command('list')
  .description('List all hooks')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action(hooksList);

hooks
  .command('create <slug>')
  .description('Scaffold a new hook file locally')
  .option('--json', 'Output as JSON')
  .action(hooksCreate);

hooks
  .command('deploy <slug>')
  .description('Deploy a hook')
  .option('-f, --file <path>', 'Path to hook file')
  .option('-n, --name <name>', 'Display name')
  .option('-t, --trigger <event>', 'Hook trigger event (e.g. id.onSignup)')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action(hooksDeploy);

hooks
  .command('logs <slug>')
  .description('Show hook invocation history')
  .option('-l, --limit <n>', 'Number of entries', '20')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action(hooksLogs);

hooks
  .command('watch <slug>')
  .description('Stream live hook execution logs')
  .option('-p, --profile <name>', 'Profile name')
  .action((slug, opts) => functionsWatch(slug, opts));

hooks
  .command('enable <slug>')
  .description('Enable a hook')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action((slug, opts) => hooksToggle(slug, true, opts));

hooks
  .command('disable <slug>')
  .description('Disable a hook')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action((slug, opts) => hooksToggle(slug, false, opts));

hooks
  .command('delete <slug>')
  .description('Delete a hook')
  .option('-p, --profile <name>', 'Profile name')
  .option('--json', 'Output as JSON')
  .action(hooksDelete);

const migrate = program
  .command('migrate')
  .description('Migrate from Firebase to Globio');

migrate
  .command('firestore')
  .description('Migrate Firestore collections to GlobalDoc')
  .requiredOption('--from <path>', 'Path to Firebase service account JSON')
  .option('--collection <name>', 'Migrate a specific collection')
  .option('--all', 'Migrate all collections')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(migrateFirestore);

migrate
  .command('firebase-storage')
  .description('Migrate Firebase Storage to GlobalVault')
  .requiredOption('--from <path>', 'Path to Firebase service account JSON')
  .requiredOption('--bucket <name>', 'Firebase Storage bucket')
  .option('--folder <path>', 'Migrate a specific folder')
  .option('--all', 'Migrate all files')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(migrateFirebaseStorage);

async function main() {
  if (process.argv.length <= 2) {
    program.help();
  }

  await program.parseAsync();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { config } from '../lib/config.js';

const DEFAULT_BASE_URL = 'https://api.globio.stanlink.online';

export async function login() {
  console.log('');
  p.intro(chalk.bgCyan(chalk.black(' Globio CLI ')));

  const values = await p.group(
    {
      apiKey: () =>
        p.text({
          message: 'Paste your Globio API key',
          placeholder: 'gk_live_...',
          validate: (value) => (!value ? 'API key is required' : undefined),
        }),
      projectId: () =>
        p.text({
          message: 'Paste your Project ID',
          placeholder: 'proj_...',
          validate: (value) => (!value ? 'Project ID is required' : undefined),
        }),
    },
    {
      onCancel: () => {
        p.cancel('Login cancelled.');
        process.exit(0);
      },
    }
  );

  const spinner = p.spinner();
  spinner.start('Validating credentials...');

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/id/health`, {
      headers: {
        'X-Globio-Key': values.apiKey as string,
      },
    });

    if (!response.ok) {
      spinner.stop('Validation failed.');
      p.outro(chalk.red('Invalid API key or project ID.'));
      process.exit(1);
    }

    config.set({
      apiKey: values.apiKey as string,
      projectId: values.projectId as string,
    });

    spinner.stop('Credentials validated.');
    p.outro(
      chalk.green('Logged in. Active project: ') +
        chalk.cyan(values.projectId as string)
    );
  } catch {
    spinner.stop('');
    p.outro(chalk.red('Could not connect to Globio. Check your credentials.'));
    process.exit(1);
  }
}

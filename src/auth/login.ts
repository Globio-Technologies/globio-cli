import * as p from '@clack/prompts';
import { exec } from 'child_process';
import chalk from 'chalk';
import { config } from '../lib/config.js';
import { getConsoleCliAuthUrl, manageRequest, type ManageAccount } from '../lib/manage.js';
import { getCliVersion, muted, orange, printBanner } from '../lib/banner.js';

const version = getCliVersion();

function openBrowser(url: string) {
  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function savePat(token: string) {
  const account = await manageRequest<ManageAccount>('/account', { token });
  config.set({
    pat: token,
    accountEmail: account.email,
    accountName: account.display_name ?? account.email,
  });
  return account;
}

async function runTokenLogin() {
  const token = await p.text({
    message: 'Paste your personal access token',
    placeholder: 'glo_pat_...',
    validate: (value) => {
      if (!value) return 'Personal access token is required';
      if (!value.startsWith('glo_pat_')) return 'Token must start with glo_pat_';
      return undefined;
    },
  });

  if (p.isCancel(token)) {
    p.cancel('Login cancelled.');
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start('Validating personal access token...');
  try {
    const account = await savePat(token);
    spinner.stop('Token validated.');
    p.outro(`Logged in as ${account.email}`);
  } catch (error) {
    spinner.stop('Validation failed.');
    p.outro(chalk.red(error instanceof Error ? error.message : 'Could not validate token'));
    process.exit(1);
  }
}

async function runBrowserLogin() {
  const state = crypto.randomUUID();
  const spinner = p.spinner();

  await manageRequest('/cli-auth/request', {
    method: 'POST',
    body: { state },
  });

  const url = getConsoleCliAuthUrl(state);
  openBrowser(url);
  console.log('  ' + muted('Browser URL: ') + orange(url));
  console.log('');

  spinner.start('Waiting for browser approval...');
  const deadline = Date.now() + 5 * 60 * 1000;

  while (Date.now() < deadline) {
    try {
      const status = await manageRequest<{ status: 'pending' | 'approved' | 'expired'; code?: string }>(
        `/cli-auth/poll?state=${encodeURIComponent(state)}`
      );

      if (status.status === 'expired') {
        spinner.stop('Approval window expired.');
        p.outro(chalk.red('CLI auth request expired. Try again or use globio login --token.'));
        process.exit(1);
      }

      if (status.status === 'approved' && status.code) {
        const exchange = await manageRequest<{
          token: string;
          account: { email: string; display_name: string | null };
        }>('/cli-auth/exchange', {
          method: 'POST',
          body: { code: status.code },
        });

        config.set({
          pat: exchange.token,
          accountEmail: exchange.account.email,
          accountName: exchange.account.display_name ?? exchange.account.email,
        });

        spinner.stop('Browser approval received.');
        p.outro(`Logged in as ${exchange.account.email}`);
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await sleep(2000);
  }

  spinner.stop('Approval timed out.');
  p.outro(chalk.red('Timed out waiting for browser approval. Try again or use globio login --token.'));
  process.exit(1);
}

export async function login(options: { token?: boolean } = {}) {
  printBanner(version);

  if (options.token) {
    await runTokenLogin();
    return;
  }

  const choice = await p.select({
    message: 'Choose a login method',
    options: [
      { value: 'browser', label: 'Browser', hint: 'Open console and approve access' },
      { value: 'token', label: 'Token', hint: 'Paste a personal access token' },
    ],
  });

  if (p.isCancel(choice)) {
    p.cancel('Login cancelled.');
    process.exit(0);
  }

  if (choice === 'token') {
    await runTokenLogin();
    return;
  }

  try {
    await runBrowserLogin();
  } catch (error) {
    p.outro(chalk.red(error instanceof Error ? error.message : 'Could not connect to Globio.'));
    process.exit(1);
  }
}

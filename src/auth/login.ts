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
  return account;
}

function warnOnDuplicateAccount(accountEmail: string, targetProfileName: string) {
  const allProfiles = config.listProfiles();
  const duplicate = allProfiles.find((name) => {
    const profile = config.getProfile(name);
    return profile?.account_email === accountEmail && name !== targetProfileName;
  });

  if (!duplicate) return;

  console.log('');
  console.log(
    chalk.yellow('  ⚠  ') +
      chalk.white(accountEmail) +
      chalk.gray(' is already logged in under profile ') +
      orange(`"${duplicate}"`) +
      chalk.gray('.')
  );
  console.log('');
}

async function runTokenLogin(profileName: string) {
  const hadProfiles = config.listProfiles().length > 0;
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
    warnOnDuplicateAccount(account.email, profileName);
    config.setProfile(profileName, {
      pat: token,
      account_email: account.email,
      account_name: account.display_name ?? account.email,
      created_at: Date.now(),
    });
    if (profileName === 'default' || !hadProfiles) {
      config.setActiveProfile(profileName);
    }
    spinner.stop('Token validated.');
    p.outro(`Logged in as ${account.email}\nProfile: ${profileName}`);
  } catch (error) {
    spinner.stop('Validation failed.');
    p.outro(chalk.red(error instanceof Error ? error.message : 'Could not validate token'));
    process.exit(1);
  }
}

async function runBrowserLogin(profileName: string) {
  const state = crypto.randomUUID();
  const spinner = p.spinner();
  const hadProfiles = config.listProfiles().length > 0;

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

        warnOnDuplicateAccount(exchange.account.email, profileName);
        config.setProfile(profileName, {
          pat: exchange.token,
          account_email: exchange.account.email,
          account_name: exchange.account.display_name ?? exchange.account.email,
          created_at: Date.now(),
        });
        if (profileName === 'default' || !hadProfiles) {
          config.setActiveProfile(profileName);
        }

        spinner.stop('Browser approval received.');
        p.outro(`Logged in as ${exchange.account.email}\nProfile: ${profileName}`);
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

export async function login(options: { token?: boolean; profile?: string } = {}) {
  printBanner(version);
  const profileName = options.profile ?? 'default';
  const existing = config.getProfile(profileName);

  if (existing) {
    const proceed = await p.confirm({
      message: `Already logged in as ${existing.account_email} on profile "${profileName}". Replace?`,
      initialValue: false,
    });

    if (p.isCancel(proceed) || !proceed) {
      p.outro('Login cancelled.');
      return;
    }
  }

  if (options.token) {
    await runTokenLogin(profileName);
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
    await runTokenLogin(profileName);
    return;
  }

  try {
    await runBrowserLogin(profileName);
  } catch (error) {
    p.outro(chalk.red(error instanceof Error ? error.message : 'Could not connect to Globio.'));
    process.exit(1);
  }
}

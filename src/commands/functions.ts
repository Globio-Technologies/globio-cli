import chalk from 'chalk';
import type { CodeFunction, CodeInvocation } from '@globio/sdk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { config } from '../lib/config.js';
import { gold, muted, orange } from '../lib/banner.js';
import { getClient } from '../lib/sdk.js';

function resolveProfileName(profile?: string) {
  return profile ?? config.getActiveProfile() ?? 'default';
}

export async function functionsList(options: { profile?: string } = {}) {
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora('Fetching functions...').start();
  const result = await client.code.listFunctions();
  spinner.stop();

  if (!result.success || !result.data.length) {
    console.log(chalk.gray('No functions found.'));
    return;
  }

  console.log('');
  result.data.forEach((fn: CodeFunction) => {
    const status = fn.active ? '\x1b[32m●\x1b[0m' : '\x1b[2m○\x1b[0m';
    const type =
      fn.type === 'hook' ? gold('[hook]') : orange('[function]');
    console.log('  ' + status + '  ' + type + '  ' + fn.slug);
    if (fn.type === 'hook' && fn.trigger_event) {
      console.log(muted('           trigger: ' + fn.trigger_event));
    }
  });
  console.log('');
}

export async function functionsCreate(slug: string, _options: { profile?: string } = {}) {
  const filename = `${slug}.js`;
  if (existsSync(filename)) {
    console.log(chalk.yellow(`${filename} already exists.`));
    return;
  }

  const template = `/**
 * Globio Edge Function: ${slug}
 * Invoke: npx @globio/cli functions invoke ${slug} --input '{"key":"value"}'
 */
async function handler(input, globio) {
  // input: the payload from the caller
  // globio: injected SDK — access all Globio services
  // Example: const player = await globio.doc.get('players', input.userId);

  return {
    ok: true,
    received: input,
  };
}
`;
  writeFileSync(filename, template);
  console.log(chalk.green(`Created ${filename}`));
  console.log(
    chalk.gray(`Deploy with: npx @globio/cli functions deploy ${slug}`)
  );
}

export async function functionsDeploy(
  slug: string,
  options: { file?: string; name?: string; profile?: string }
) {
  const filename = options.file ?? `${slug}.js`;
  if (!existsSync(filename)) {
    console.log(
      chalk.red(
        `File not found: ${filename}. Create it with: npx @globio/cli functions create ${slug}`
      )
    );
    process.exit(1);
  }

  const code = readFileSync(filename, 'utf-8');
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora(`Deploying ${slug}...`).start();
  const existing = await client.code.getFunction(slug);

  let result;
  if (existing.success) {
    result = await client.code.updateFunction(slug, {
      code,
      name: options.name ?? slug,
    });
  } else {
    result = await client.code.createFunction({
      name: options.name ?? slug,
      slug,
      type: 'function',
      code,
    });
  }

  if (!result.success) {
    spinner.fail('Deploy failed');
    console.error(result.error.message);
    process.exit(1);
  }

  spinner.succeed(existing.success ? `Updated ${slug}` : `Deployed ${slug}`);
}

export async function functionsInvoke(
  slug: string,
  options: { input?: string; profile?: string }
) {
  let input: Record<string, unknown> = {};
  if (options.input) {
    try {
      input = JSON.parse(options.input) as Record<string, unknown>;
    } catch {
      console.error(chalk.red('--input must be valid JSON'));
      process.exit(1);
    }
  }

  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora(`Invoking ${slug}...`).start();
  const result = await client.code.invoke(slug, input);
  spinner.stop();

  if (!result.success) {
    console.log(chalk.red('Invocation failed'));
    console.error(result.error.message);
    return;
  }

  console.log('');
  console.log(orange('Result:'));
  console.log(JSON.stringify(result.data.result, null, 2));
  console.log(muted(`\nDuration: ${result.data.duration_ms}ms`));
}

export async function functionsLogs(
  slug: string,
  options: { limit?: string; profile?: string }
) {
  const limit = options.limit ? parseInt(options.limit, 10) : 20;
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora('Fetching invocations...').start();
  const result = await client.code.getInvocations(slug, limit);
  spinner.stop();

  if (!result.success || !result.data.length) {
    console.log(chalk.gray('No invocations yet.'));
    return;
  }

  console.log('');
  result.data.forEach((inv: CodeInvocation) => {
    const status = inv.success
      ? '\x1b[38;2;244;140;6m✓\x1b[0m'
      : '\x1b[31m✗\x1b[0m';
    const date = new Date(inv.invoked_at * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    console.log(
      `  ${status}  ${chalk.gray(date)}  ${inv.duration_ms}ms  ${chalk.gray(`[${inv.trigger_type}]`)}`
    );
  });
  console.log('');
}

export async function functionsDelete(slug: string, options: { profile?: string } = {}) {
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora(`Deleting ${slug}...`).start();
  const result = await client.code.deleteFunction(slug);
  if (!result.success) {
    spinner.fail(`Delete failed for ${slug}`);
    console.error(result.error.message);
    process.exit(1);
  }
  spinner.succeed(`Deleted ${slug}`);
}

export async function functionsToggle(
  slug: string,
  active: boolean,
  options: { profile?: string } = {}
) {
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora(
    `${active ? 'Enabling' : 'Disabling'} ${slug}...`
  ).start();
  const result = await client.code.toggleFunction(slug, active);
  if (!result.success) {
    spinner.fail(`Toggle failed for ${slug}`);
    console.error(result.error.message);
    process.exit(1);
  }
  spinner.succeed(`${slug} is now ${active ? 'active' : 'inactive'}`);
}

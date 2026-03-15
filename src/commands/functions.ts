import type { CodeFunction, CodeInvocation } from '@globio/sdk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { config } from '../lib/config.js';
import {
  failure,
  getCliVersion,
  green,
  header,
  inactive,
  muted,
  orange,
  gold,
  renderTable,
} from '../lib/banner.js';
import { getClient } from '../lib/sdk.js';

const version = getCliVersion();

function resolveProfileName(profile?: string) {
  return profile ?? config.getActiveProfile() ?? 'default';
}

export async function functionsList(options: { profile?: string } = {}) {
  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const result = await client.code.listFunctions();

  if (!result.success || !result.data.length) {
    console.log(header(version) + '  ' + muted('No functions found.') + '\n');
    return;
  }

  const rows = result.data.map((fn: CodeFunction) => [
    fn.type === 'hook' ? gold(fn.slug) : orange(fn.slug),
    fn.type === 'hook' ? gold('hook') : orange('function'),
    fn.type === 'hook' && fn.trigger_event ? gold(fn.trigger_event) : muted('http'),
    fn.active ? green('active') : inactive('inactive'),
  ]);

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Function', width: 24 },
        { header: 'Type', width: 10 },
        { header: 'Trigger', width: 20 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
  console.log('');
}

export async function functionsCreate(slug: string, _options: { profile?: string } = {}) {
  const filename = `${slug}.js`;
  if (existsSync(filename)) {
    console.log(inactive(`${filename} already exists.`));
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
  console.log(green(`Created ${filename}`));
  console.log(muted(`Deploy with: npx @globio/cli functions deploy ${slug}`));
}

export async function functionsDeploy(
  slug: string,
  options: { file?: string; name?: string; profile?: string }
) {
  const filename = options.file ?? `${slug}.js`;
  if (!existsSync(filename)) {
    console.log(
      failure(
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
      console.error(failure('--input must be valid JSON'));
      process.exit(1);
    }
  }

  const profileName = resolveProfileName(options.profile);
  const client = getClient(profileName);
  const spinner = ora(`Invoking ${slug}...`).start();
  const result = await client.code.invoke(slug, input);
  spinner.stop();

  if (!result.success) {
    console.log(failure('Invocation failed'));
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
  const result = await client.code.getInvocations(slug, limit);

  if (!result.success || !result.data.length) {
    console.log(header(version) + '  ' + muted('No invocations yet.') + '\n');
    return;
  }

  const rows = result.data.map((inv: CodeInvocation) => {
    const date = new Date(inv.invoked_at * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    return [
      muted(date),
      muted(inv.trigger_type),
      muted(inv.duration_ms + 'ms'),
      inv.success ? green('success') : failure('failed'),
    ];
  });

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Time', width: 21 },
        { header: 'Trigger', width: 9 },
        { header: 'Duration', width: 10 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
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

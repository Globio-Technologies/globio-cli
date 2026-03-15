import { existsSync, readFileSync, writeFileSync } from 'fs';
import { getClient } from '../lib/sdk.js';
import {
  failure,
  getCliVersion,
  gold,
  green,
  header,
  inactive,
  jsonOutput,
  muted,
  renderTable,
  reset,
} from '../lib/banner.js';
import type { CodeInvocation } from '@globio/sdk';

const version = getCliVersion();

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const HOOK_TRIGGERS = [
  'id.onSignup',
  'id.onSignin',
  'id.onSignout',
  'id.onPasswordReset',
  'doc.onCreate',
  'doc.onUpdate',
  'doc.onDelete',
  'mart.onPurchase',
  'mart.onPayment',
  'sync.onRoomCreate',
  'sync.onRoomClose',
  'sync.onPlayerJoin',
  'sync.onPlayerLeave',
  'vault.onUpload',
  'vault.onDelete',
  'signal.onDeliver',
] as const;

export async function hooksList(
  options: { profile?: string; json?: boolean } = {}
) {
  const client = getClient(options.profile);
  const result = await client.code.listHooks();

  if (options.json) {
    jsonOutput(
      result.success
        ? (result.data ?? []).map((hook) => ({
            slug: hook.slug,
            type: hook.type,
            trigger_event: hook.trigger_event,
            active: hook.active,
          }))
        : []
    );
  }

  if (!result.success || !result.data?.length) {
    console.log(header(version));
    console.log('  ' + muted('No hooks found.') + '\n');
    return;
  }

  const rows = result.data.map((fn) => [
    gold(fn.slug),
    gold(fn.trigger_event ?? '—'),
    fn.active ? green('active') : inactive('inactive'),
  ]);

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Hook', width: 24 },
        { header: 'Trigger', width: 24 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
  console.log('');
}

export async function hooksCreate(
  slug: string,
  options: { json?: boolean } = {}
) {
  const filename = `${slug}.hook.js`;
  if (existsSync(filename)) {
    if (options.json) {
      jsonOutput({ success: false, file: filename, error: 'File already exists' });
    }
    console.log(gold(filename) + reset + ' already exists.');
    return;
  }

  const template = `/**
 * GC Hook: ${slug}
 * This hook fires automatically when its trigger event occurs.
 * You cannot invoke it manually.
 *
 * The handler receives the event payload and the injected
 * globio SDK — use it to orchestrate any Globio service.
 */
async function handler(payload, globio) {
  // payload: event data from the trigger
  // globio: injected SDK — access all Globio services

  // Example for id.onSignup:
  // const { userId, email } = payload;
  // await globio.doc.set('players', userId, {
  //   level: 1, xp: 0, coins: 100
  // });
}
`;

  writeFileSync(filename, template);

  if (options.json) {
    jsonOutput({ success: true, file: filename });
  }

  console.log(green('✓') + reset + '  Created ' + gold(filename) + reset);
  console.log(muted('  Deploy with: globio hooks deploy ' + slug));
}

export async function hooksDeploy(
  slug: string,
  options: {
    file?: string;
    name?: string;
    trigger?: string;
    profile?: string;
    json?: boolean;
  }
) {
  const filename = options.file ?? `${slug}.hook.js`;
  if (!existsSync(filename)) {
    if (options.json) {
      jsonOutput({ success: false, error: `File not found: ${filename}` });
    }
    console.log(
      failure('File not found: ' + filename) +
        reset +
        '  Run: globio hooks create ' +
        slug
    );
    process.exit(1);
  }

  if (!options.trigger) {
    if (options.json) {
      jsonOutput({ success: false, error: '--trigger required for hooks' });
    }
    console.log(
      failure('--trigger required for hooks.') +
        reset +
        '\n\n  Available triggers:\n' +
        HOOK_TRIGGERS.map((trigger) => '    ' + gold(trigger) + reset).join('\n')
    );
    process.exit(1);
  }

  const code = readFileSync(filename, 'utf-8');
  const client = getClient(options.profile);
  const existing = await client.code.getFunction(slug).catch(() => null);

  let result;
  if (existing?.success) {
    result = await client.code.updateHook(slug, {
      code,
      trigger: options.trigger as (typeof HOOK_TRIGGERS)[number],
    });

    if (options.json) {
      jsonOutput({ success: result.success, slug, action: 'updated' });
    }

    if (!result.success) {
      console.log(failure('Deploy failed'));
      process.exit(1);
    }

    console.log(green('✓') + reset + '  Updated hook ' + gold(slug) + reset);
    return;
  }

  result = await client.code.createHook({
    name: options.name ?? slug,
    slug,
    trigger: options.trigger as (typeof HOOK_TRIGGERS)[number],
    code,
  });

  if (options.json) {
    jsonOutput({ success: result.success, slug, action: 'created' });
  }

  if (!result.success) {
    console.log(failure('Deploy failed'));
    process.exit(1);
  }

  console.log(green('✓') + reset + '  Deployed hook ' + gold(slug) + reset);
}

export async function hooksLogs(
  slug: string,
  options: { limit?: string; profile?: string; json?: boolean } = {}
) {
  const limit = options.limit ? parseInt(options.limit, 10) : 20;
  const client = getClient(options.profile);
  const result = await client.code.getHookInvocations(slug, limit);

  if (options.json) {
    jsonOutput(
      result.success
        ? (result.data as Array<CodeInvocation & {
            logs?: string | null;
            error_message?: string | null;
            input?: string | null;
            result?: string | null;
          }>).map((invocation) => ({
            id: invocation.id,
            trigger_type: invocation.trigger_type,
            duration_ms: invocation.duration_ms,
            success: invocation.success,
            invoked_at: invocation.invoked_at,
            logs: parseJsonField<string[]>(invocation.logs) ?? [],
            error_message: invocation.error_message ?? null,
            input: parseJsonField<Record<string, unknown>>(invocation.input),
            result: parseJsonField<unknown>(invocation.result),
          }))
        : []
    );
  }

  if (!result.success || !result.data?.length) {
    console.log(header(version));
    console.log('  ' + muted('No invocations yet.') + '\n');
    return;
  }

  const rows = result.data.map((inv) => {
    const date = new Date(inv.invoked_at * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    return [
      muted(date),
      muted(inv.duration_ms + 'ms'),
      inv.success ? green('success') : failure('failed'),
    ];
  });

  console.log(header(version));
  console.log(
    renderTable({
      columns: [
        { header: 'Time', width: 21 },
        { header: 'Duration', width: 10 },
        { header: 'Status', width: 10 },
      ],
      rows,
    })
  );
  console.log('');
}

export async function hooksToggle(
  slug: string,
  active: boolean,
  options: { profile?: string; json?: boolean } = {}
) {
  const client = getClient(options.profile);
  const result = await client.code.toggleHook(slug, active);

  if (options.json) {
    jsonOutput({ success: result.success, slug, active });
  }

  if (!result.success) {
    console.log(failure('Toggle failed'));
    process.exit(1);
  }

  console.log(
    green('✓') +
      reset +
      '  ' +
      gold(slug) +
      reset +
      ' is now ' +
      (active ? green('active') : inactive('inactive')) +
      reset
  );
}

export async function hooksDelete(
  slug: string,
  options: { profile?: string; json?: boolean } = {}
) {
  const client = getClient(options.profile);
  const result = await client.code.deleteHook(slug);

  if (options.json) {
    jsonOutput({ success: result.success, slug });
  }

  if (!result.success) {
    console.log(failure('Delete failed'));
    process.exit(1);
  }

  console.log(green('✓') + reset + '  Deleted hook ' + gold(slug) + reset);
}

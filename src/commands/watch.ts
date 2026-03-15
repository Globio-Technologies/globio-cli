import { config } from '../lib/config.js';
import {
  dim,
  failure,
  getCliVersion,
  green,
  header,
  muted,
  orange,
  reset,
} from '../lib/banner.js';

const BASE_URL = 'https://api.globio.stanlink.online';
const version = getCliVersion();

export async function functionsWatch(
  slug: string,
  options: { profile?: string } = {}
) {
  const profileName = options.profile ?? config.getActiveProfile();
  const profile = config.getProfile(profileName ?? 'default');

  if (!profile?.project_api_key) {
    console.log(
      failure('No active project.') +
        reset +
        ' Run: globio projects use <id>'
    );
    process.exit(1);
  }

  console.log(header(version));
  console.log(
    '  ' +
      orange('watching') +
      reset +
      ' ' +
      slug +
      dim(' · press Ctrl+C to stop') +
      '\n'
  );

  const res = await fetch(`${BASE_URL}/code/functions/${slug}/watch`, {
    headers: {
      'X-Globio-Key': profile.project_api_key,
      Accept: 'text/event-stream',
    },
  });

  if (!res.ok || !res.body) {
    console.log(failure('Failed to connect to watch stream.') + reset);
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  process.on('SIGINT', () => {
    console.log('\n' + dim('  Stream closed.') + '\n');
    void reader.cancel();
    process.exit(0);
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const dataLine = chunk
        .split('\n')
        .find((line) => line.startsWith('data: '));

      if (!dataLine) continue;

      try {
        renderEvent(JSON.parse(dataLine.slice(6)) as WatchEvent);
      } catch {
        // Ignore malformed events.
      }
    }
  }
}

interface WatchEvent {
  type: 'connected' | 'heartbeat' | 'timeout' | 'invocation';
  invoked_at?: number;
  trigger_type?: string;
  duration_ms?: number;
  success?: boolean;
  input?: string | null;
  result?: string | null;
  error_message?: string | null;
  logs?: string | null;
}

function renderEvent(event: WatchEvent) {
  if (event.type === 'connected') {
    console.log(
      '  ' + green('●') + reset + dim(' connected — waiting for invocations...\n')
    );
    return;
  }

  if (event.type === 'heartbeat') {
    return;
  }

  if (event.type === 'timeout') {
    console.log(
      '\n' + dim('  Session timed out after 5 minutes.') + ' Run again to resume.\n'
    );
    return;
  }

  if (event.type !== 'invocation' || !event.invoked_at) {
    return;
  }

  const time = new Date(event.invoked_at * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  const status = event.success ? green('✓') : failure('✗');
  const trigger = dim(`[${event.trigger_type ?? 'http'}]`);
  const duration = dim(`${event.duration_ms ?? 0}ms`);

  console.log(
    '  ' + status + reset + ' ' + dim(time) + '  ' + trigger + '  ' + duration
  );

  if (event.input && event.input !== '{}') {
    try {
      console.log(
        '  ' + dim('  input   ') + muted(JSON.stringify(JSON.parse(event.input)))
      );
    } catch {
      // Ignore invalid JSON payloads.
    }
  }

  if (event.logs) {
    try {
      const logs = JSON.parse(event.logs) as string[];
      for (const line of logs) {
        console.log('  ' + dim('  log     ') + reset + line);
      }
    } catch {
      // Ignore invalid log payloads.
    }
  }

  if (event.result && event.result !== 'null') {
    try {
      console.log(
        '  ' + dim('  result  ') + muted(JSON.stringify(JSON.parse(event.result)))
      );
    } catch {
      // Ignore invalid result payloads.
    }
  }

  if (event.error_message) {
    console.log('  ' + dim('  error   ') + failure(event.error_message) + reset);
  }

  console.log('');
}

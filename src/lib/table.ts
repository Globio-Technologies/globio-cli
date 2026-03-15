export interface Column {
  header: string;
  width: number;
  color?: (val: string) => string;
}

export interface TableOptions {
  columns: Column[];
  rows: string[][];
}

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export const orange = (s: string) => '\x1b[38;2;244;140;6m' + s;
export const gold = (s: string) => '\x1b[38;2;255;208;0m' + s;
export const dim = (s: string) => '\x1b[2m' + s + '\x1b[0m';
export const white = (s: string) => '\x1b[97m' + s;
export const green = (s: string) => '\x1b[38;2;34;197;94m' + s;
export const muted = (s: string) => '\x1b[38;2;85;85;85m' + s;
export const inactive = (s: string) => '\x1b[38;2;68;68;68m' + s;
export const failure = (s: string) => '\x1b[38;2;232;93;4m' + s;
export const reset = '\x1b[0m';

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

function fitCell(value: string, width: number): string {
  const plain = stripAnsi(value);
  if (plain.length <= width) {
    return value + ' '.repeat(width - plain.length);
  }

  const truncated = plain.slice(0, width);
  return truncated;
}

export function renderTable(options: TableOptions): string {
  const { columns, rows } = options;
  const lines: string[] = [];

  lines.push(
    '  ┌' + columns.map((c) => '─'.repeat(c.width + 2)).join('┬') + '┐'
  );

  lines.push(
    '  │' +
      columns
        .map((c) => ' ' + dim(c.header.padEnd(c.width)) + ' │')
        .join('')
  );

  lines.push(
    '  ├' + columns.map((c) => '─'.repeat(c.width + 2)).join('┼') + '┤'
  );

  for (const row of rows) {
    lines.push(
      '  │' +
        columns
          .map((c, i) => {
            const raw = row[i] ?? '';
            const fitted = fitCell(raw, c.width);
            const colored = c.color
              ? fitCell(c.color(stripAnsi(raw)), c.width)
              : fitted;
            return ' ' + colored + ' ' + reset + '│';
          })
          .join('')
    );
  }

  lines.push(
    '  └' + columns.map((c) => '─'.repeat(c.width + 2)).join('┴') + '┘'
  );

  return lines.join('\n');
}

export function header(version: string, subtitle?: string): string {
  const lines = [
    '',
    orange('  ⇒⇒') + reset + ' globio ' + dim(version),
    dim('  ──────────────────────────────────────────'),
  ];

  if (subtitle) {
    lines.push('  ' + subtitle);
  }

  lines.push('');
  return lines.join('\n');
}

export function footer(text: string): string {
  return '\n' + dim('  ' + text) + '\n';
}

export function jsonOutput(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

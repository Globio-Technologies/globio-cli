import { readFileSync } from 'fs';
import figlet from 'figlet';
import gradientString from 'gradient-string';

const globioGradient = gradientString(
  '#e85d04',
  '#f48c06',
  '#faa307',
  '#ffba08',
  '#ffd000'
);

export function printBanner(version: string) {
  const art = figlet.textSync('Globio', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
  });

  console.log(globioGradient.multiline(art));
  console.log(
    globioGradient('  ⇒⇒') +
      '  Game Backend as a Service' +
      '  \x1b[2mv' +
      version +
      '\x1b[0m'
  );
  console.log('');
}

export function printSuccess(message: string) {
  console.log('\x1b[38;2;250;163;7m✓\x1b[0m  ' + message);
}

export function printError(message: string) {
  console.log('\x1b[31m✗\x1b[0m  ' + message);
}

export function printInfo(message: string) {
  console.log('\x1b[2m›\x1b[0m  ' + message);
}

export const orange = (s: string) => '\x1b[38;2;244;140;6m' + s + '\x1b[0m';

export const gold = (s: string) => '\x1b[38;2;255;208;0m' + s + '\x1b[0m';

export const muted = (s: string) => '\x1b[2m' + s + '\x1b[0m';

export function getCliVersion() {
  const file = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  return (JSON.parse(file) as { version: string }).version;
}

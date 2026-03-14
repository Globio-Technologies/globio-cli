import chalk from 'chalk';
import cliProgress from 'cli-progress';

export function createProgressBar(label: string) {
  const bar = new cliProgress.SingleBar(
    {
      format:
        chalk.cyan(label) +
        ' [{bar}] {percentage}% | {value}/{total}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  return bar;
}

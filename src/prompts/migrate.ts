import * as p from '@clack/prompts';

export async function confirmMigration(message: string) {
  return p.confirm({
    message,
    initialValue: false,
  });
}

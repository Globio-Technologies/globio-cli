import * as p from '@clack/prompts';

export async function promptInit() {
  return p.group(
    {
      migrateFromFirebase: () =>
        p.confirm({
          message: 'Migrating from Firebase?',
          initialValue: false,
        }),
      serviceAccountPath: ({ results }) =>
        results.migrateFromFirebase
          ? p.text({
              message: 'Path to Firebase service account JSON',
              placeholder: './serviceAccountKey.json',
            })
          : Promise.resolve(undefined),
    },
    {
      onCancel: () => {
        p.cancel('Cancelled.');
        process.exit(0);
      },
    }
  );
}

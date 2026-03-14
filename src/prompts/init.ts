import * as p from '@clack/prompts';

export async function promptInit() {
  return p.group(
    {
      apiKey: () =>
        p.text({
          message: 'Globio API key',
          placeholder: 'gk_live_...',
          validate: (value) => (!value ? 'Required' : undefined),
        }),
      projectId: () =>
        p.text({
          message: 'Project ID',
          placeholder: 'proj_...',
          validate: (value) => (!value ? 'Required' : undefined),
        }),
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

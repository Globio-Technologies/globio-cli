import * as p from '@clack/prompts';
import { basename } from 'path';
import {
  failure,
  getCliVersion,
  gold,
  green,
  muted,
  orange,
  printBanner,
} from '../lib/banner.js';
import { createIndex, docSet } from '../lib/api.js';
import { initFirebase } from '../lib/firebase.js';
import { createProgressBar } from '../lib/progress.js';
import { config } from '../lib/config.js';

const version = getCliVersion();

interface MigrateFirestoreOptions {
  from: string;
  collection?: string;
  all?: boolean;
  profile?: string;
}

interface MigrateStorageOptions {
  from: string;
  bucket: string;
  folder?: string;
  all?: boolean;
  profile?: string;
}

function resolveProfileName(profile?: string) {
  return profile ?? config.getActiveProfile() ?? 'default';
}

export async function migrateFirestore(options: MigrateFirestoreOptions) {
  printBanner(version);
  p.intro(gold('⇒⇒') + '  Firebase → Globio Migration');

  const { firestore } = await initFirebase(options.from);
  const profileName = resolveProfileName(options.profile);

  let collections: string[] = [];

  if (options.all) {
    const snapshot = await firestore.listCollections();
    collections = snapshot.map((collection) => collection.id);
    console.log(
      green(
        `Found ${collections.length} collections: ${collections.join(', ')}`
      )
    );
  } else if (options.collection) {
    collections = [options.collection];
  } else {
    console.log(failure('Specify --collection <name> or --all'));
    process.exit(1);
  }

  const results: Record<
    string,
    { success: number; failed: number; failedIds: string[] }
  > = {};

  for (const collectionId of collections) {
    console.log('');
    console.log('  ' + orange(collectionId));

    const countSnap = await firestore.collection(collectionId).count().get();
    const total = countSnap.data().count;

    const bar = createProgressBar(collectionId);
    bar.start(total, 0);

    results[collectionId] = {
      success: 0,
      failed: 0,
      failedIds: [],
    };

    let lastDoc: unknown = null;
    let processed = 0;
    let firstDocData: Record<string, unknown> | null = null;
    let indexFieldCount = 0;

    while (processed < total) {
      let query = firestore.collection(collectionId).limit(100);

      if (lastDoc) {
        query = query.startAfter(lastDoc as never);
      }

      const snapshot = await query.get();
      if (snapshot.empty) {
        break;
      }

      for (const doc of snapshot.docs) {
        try {
          if (!firstDocData) {
            firstDocData = doc.data();
            for (const [field, value] of Object.entries(firstDocData)) {
              const fieldType =
                typeof value === 'number'
                  ? 'number'
                  : typeof value === 'boolean'
                    ? 'boolean'
                    : 'string';
              await createIndex(collectionId, field, fieldType, profileName);
            }
            indexFieldCount = Object.keys(firstDocData).length;
          }

          await docSet(collectionId, doc.id, doc.data(), profileName);
          results[collectionId].success++;
        } catch {
          results[collectionId].failed++;
          results[collectionId].failedIds.push(doc.id);
        }
        processed++;
        bar.update(processed);
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    }

    bar.stop();

    console.log(
      green(`  ✓ ${results[collectionId].success} documents migrated`)
    );
    if (indexFieldCount > 0) {
      console.log(
        muted(`  Indexes created for ${indexFieldCount} fields`)
      );
    }
    if (results[collectionId].failed > 0) {
      console.log(failure(`  ✗ ${results[collectionId].failed} failed`) + '\x1b[0m');
      console.log(
        muted(
          '  Failed IDs: ' +
            results[collectionId].failedIds.slice(0, 10).join(', ') +
            (results[collectionId].failedIds.length > 10 ? '...' : '')
        )
      );
    }
  }

  console.log('');
  p.outro(
    orange('✓') +
      '  Migration complete.\n\n' +
      '  ' +
      muted('Your Firebase data is intact.') +
      '\n' +
      '  ' +
      muted('Delete it manually when ready.')
  );
}

export async function migrateFirebaseStorage(options: MigrateStorageOptions) {
  printBanner(version);
  p.intro(gold('⇒⇒') + '  Firebase → Globio Migration');

  const { storage } = await initFirebase(options.from);
  const profileName = resolveProfileName(options.profile);
  const profile = config.getProfile(profileName);

  if (!profile?.project_api_key) {
    throw new Error('No active project. Run: globio projects use <id>');
  }

  const bucketName = options.bucket.replace(/^gs:\/\//, '');
  const bucket = storage.bucket(bucketName);
  const prefix = options.folder ? options.folder.replace(/^\//, '') : '';

  const [files] = await bucket.getFiles(prefix ? { prefix } : {});

  console.log(green(`Found ${files.length} files to migrate`));

  const bar = createProgressBar('Storage');
  bar.start(files.length, 0);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const [buffer] = await file.download();
      const bytes = Uint8Array.from(buffer);
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([bytes]),
        basename(file.name) || file.name
      );
      formData.append('path', file.name);

      const res = await fetch(
        'https://api.globio.stanlink.online/vault/files',
        {
          method: 'POST',
          headers: {
            'X-Globio-Key': profile.project_api_key,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      success++;
    } catch {
      failed++;
    }
    bar.increment();
  }

  bar.stop();

  console.log('');
  console.log(green(`  ✓ ${success} files migrated`));
  if (failed > 0) {
    console.log(failure(`  ✗ ${failed} failed`) + '\x1b[0m');
  }

  p.outro(
    orange('✓') +
      '  Migration complete.\n\n' +
      '  ' +
      muted('Your Firebase data is intact.') +
      '\n' +
      '  ' +
      muted('Delete it manually when ready.')
  );
}

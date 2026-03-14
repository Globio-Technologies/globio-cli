export async function initFirebase(serviceAccountPath: string) {
  const admin = await import('firebase-admin');
  const { readFileSync } = await import('fs');

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

  if (!admin.default.apps.length) {
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
      storageBucket: serviceAccount.project_id + '.appspot.com',
    });
  }

  return {
    firestore: admin.default.firestore(),
    storage: admin.default.storage(),
    app: admin.default.app(),
  };
}

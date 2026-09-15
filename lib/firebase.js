import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Fallback placeholder values allow the build to pass without a .env.local file.
// At runtime (local dev or Vercel) the real NEXT_PUBLIC_ env vars are used.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'placeholder-api-key',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'placeholder.firebaseapp.com',
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       || 'https://placeholder-default-rtdb.firebaseio.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'placeholder-project',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| '000000000000',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '1:000000000000:web:placeholder',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };

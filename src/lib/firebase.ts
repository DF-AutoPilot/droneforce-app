import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Determine if we're in UI debug mode (missing env vars)
const isDebugMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'your_firebase_api_key';

// Use mock config if in debug mode
const firebaseConfig = isDebugMode ? {
  apiKey: 'debug-api-key',
  authDomain: 'debug-project.firebaseapp.com',
  projectId: 'debug-project',
  storageBucket: 'debug-project.appspot.com',
  appId: 'debug-app-id',
} : {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Export debug mode flag
export const DEBUG_MODE = isDebugMode;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };

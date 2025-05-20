
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if essential config values are present
if (!firebaseConfig.apiKey) {
  const errorMessage =
    'CRITICAL: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing in your environment variables. The application cannot connect to Firebase without it. Please set this variable and restart the application.';
  console.error(errorMessage);
  // This error will stop the app, which is appropriate if Firebase is critical.
  throw new Error(errorMessage);
}
if (!firebaseConfig.authDomain) {
  const errorMessage =
    'WARNING: Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing. Authentication will likely fail. Please check your environment variables.';
  console.warn(errorMessage);
}
if (!firebaseConfig.projectId) {
  const errorMessage =
    'WARNING: Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing. Some Firebase services may not function correctly. Please check your environment variables.';
  console.warn(errorMessage);
}

let app: FirebaseApp;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error: any) {
  console.error('Critical error initializing Firebase app:', error);
  let UIMessage = 'Failed to initialize the Firebase app. This usually means your Firebase configuration (apiKey, authDomain, projectId, etc.) in your environment variables is incorrect or incomplete.';
  if (error.message && typeof error.message === 'string') {
    UIMessage += ` Firebase specific error: ${error.message}`;
  }
  UIMessage += "\nPlease verify all NEXT_PUBLIC_FIREBASE_... environment variables.";
  throw new Error(UIMessage);
}

let auth: Auth;
try {
  auth = getAuth(app);
} catch (error: any) {
  console.error('Error getting Firebase Auth instance:', error);
  let UIMessage = "Failed to initialize Firebase Authentication. The error (auth/invalid-api-key) strongly suggests an issue with your Firebase project's API key or its restrictions.";
  UIMessage += "\nPlease meticulously verify the following in your Firebase project and environment setup:\n";
  UIMessage += "1. The `NEXT_PUBLIC_FIREBASE_API_KEY` environment variable is correctly set and exactly matches the API Key shown in your Firebase project console (Project settings > General > Your apps > Web apps > SDK setup and configuration).\n";
  UIMessage += "2. The domain your application is running on (e.g., `localhost` for local development, or your deployed domain) is explicitly added to the 'Authorized domains' list. You can find this in Firebase Console > Authentication > Settings > Authorized domains.\n";
  UIMessage += "3. If you have API key restrictions enabled in Google Cloud Console for this API key, ensure it allows your domain and the necessary Firebase services (like Identity Toolkit API for authentication).\n";
  if (error.message && typeof error.message === 'string') {
    UIMessage += `\nFirebase specific error message: ${error.message}`;
  }
  throw new Error(UIMessage);
}

export { app, auth };

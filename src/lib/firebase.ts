import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase Web SDK config is publishable by design.
export const firebaseConfig = {
  apiKey: "AIzaSyCzCk0TmecUlOuaMDuOXWJutLQaehbGh2A",
  authDomain: "true-furniture-s.firebaseapp.com",
  projectId: "true-furniture-s",
  storageBucket: "true-furniture-s.firebasestorage.app",
  messagingSenderId: "121210212122",
  appId: "1:121210212122:web:ec0b03541249c3b001e6a3",
};

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  auth.useDeviceLanguage();
  return auth;
}
let readyPromise: Promise<import("firebase/auth").User | null> | null = null;

/**
 * Resolves once Firebase has restored the persisted session (first
 * onAuthStateChanged emission). Prevents "Unauthorized: invalid session"
 * when a server function is called right after a page load/refresh.
 */
export function firebaseAuthReady(): Promise<import("firebase/auth").User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!readyPromise) {
    const auth = getFirebaseAuth();
    readyPromise = new Promise((resolve) => {
      if (auth.currentUser) return resolve(auth.currentUser);
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        resolve(u);
      });
      // Safety net: never hang the request forever.
      setTimeout(() => resolve(auth.currentUser), 8000);
    });
  }
  return readyPromise;
}

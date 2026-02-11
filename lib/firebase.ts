
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAIpi7omCGt_AeqIPzHjGvDyguzCni6w1w",
  authDomain: "nightguard-bd7b1.firebaseapp.com",
  projectId: "nightguard-bd7b1",
  storageBucket: "nightguard-bd7b1.firebasestorage.app",
  messagingSenderId: "241266841462",
  appId: "1:241266841462:web:fe875d85309012edf50c57",
  measurementId: "G-3J0GGXM97L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = firebaseAuth.getAuth(app);
const storage = getStorage(app);

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err: any) => {
  if (err.code == 'failed-precondition') {
      console.warn('Firebase Persistence: Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
      console.warn('Firebase Persistence: The current browser does not support all of the features required to enable persistence');
  }
});

const isFirebaseConfigured = true;

export { app, db, auth, storage, isFirebaseConfigured };

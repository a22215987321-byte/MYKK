// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBATCKKV9bqDaBeWTxehvc9i3vg4hQ8I9w",
  authDomain: "my-chat-app-24641.firebaseapp.com",
  projectId: "my-chat-app-24641",
  storageBucket: "my-chat-app-24641.firebasestorage.app",
  messagingSenderId: "646812370805",
  appId: "1:646812370805:web:d2b608154267805fa1f53c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword };
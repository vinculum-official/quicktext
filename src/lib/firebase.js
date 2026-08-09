import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDgBFXRQhaO1W2TuDWt5V5yryiBffP_nNw",
  authDomain: "quicktextforum.firebaseapp.com",
  projectId: "quicktextforum",
  storageBucket: "quicktextforum.firebasestorage.app",
  messagingSenderId: "333585641763",
  appId: "1:333585641763:web:78e2f73526a201155e9c96"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
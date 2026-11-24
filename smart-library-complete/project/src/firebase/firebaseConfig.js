import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKnuIJ4SUMs09tm1jbLN8x5b-vZk28CQ",
  authDomain: "smart-library-management-c7cd3.firebaseapp.com",
  projectId: "smart-library-management-c7cd3",
  storageBucket: "smart-library-management-c7cd3.firebasestorage.app",
  messagingSenderId: "927623190270",
  appId: "1:927623190270:web:30ec4663f80271c77cf7af",
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// Firestore Database
export const db = getFirestore(app);

// Firebase Authentication
export const auth = getAuth(app);

// Default Firebase App
export default app;

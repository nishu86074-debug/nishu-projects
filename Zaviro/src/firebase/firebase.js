import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDaD3Na4RjwhoK8SexB9wHb51YdBynZcU",
  authDomain: "zaviro-9f8ad.firebaseapp.com",
  projectId: "zaviro-9f8ad",
  storageBucket: "zaviro-9f8ad.firebasestorage.app",
  messagingSenderId: "938118695164",
  appId: "1:938118695164:web:42d85b0386a2d9f6106f79",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
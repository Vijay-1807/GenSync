import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC-Te8BS3XxqN21QzH-pcPRwJsl2n3Pprc",
    authDomain: "gemini-chat-app-87a18.firebaseapp.com",
    projectId: "gemini-chat-app-87a18",
    storageBucket: "gemini-chat-app-87a18.firebasestorage.app",
    messagingSenderId: "149845948022",
    appId: "1:149845948022:web:2ba0f7f2f8336022769157"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

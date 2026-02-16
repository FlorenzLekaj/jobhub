import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBX-qbRwWBzP1FJcjUiuaXsDwQzIeeUV4",
  authDomain: "jobhub-12ece.firebaseapp.com",
  projectId: "jobhub-12ece",
  storageBucket: "jobhub-12ece.firebasestorage.app",
  messagingSenderId: "96622572766",
  appId: "1:96622572766:web:f563095c36cabc58d607e1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
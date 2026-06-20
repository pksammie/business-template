import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVCAY2V-56V5YrYiI4qNaLqFgA3SHH_A0",
  authDomain: "business-template-825fe.firebaseapp.com",
  projectId: "business-template-825fe",
  storageBucket: "business-template-825fe.firebasestorage.app",
  messagingSenderId: "17921984521",
  appId: "1:17921984521:web:fc4ea0c5c2865f7bab50d8",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

const db = getFirestore(app);

export { app, db, auth, googleProvider };

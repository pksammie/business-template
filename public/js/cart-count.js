import { auth, db } from "./firebase.js";

import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const badge = document.getElementById("cart-count");

onAuthStateChanged(auth, (user) => {
  if (!badge) return;

  if (!user) {
    badge.textContent = "0";

    return;
  }

  onSnapshot(
    collection(db, "users", user.uid, "cart"),

    (snapshot) => {
      let total = 0;

      snapshot.forEach((doc) => {
        total += doc.data().quantity || 0;
      });

      badge.textContent = total;
    },
  );
});

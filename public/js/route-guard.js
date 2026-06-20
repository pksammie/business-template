import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const publicPages = [
  "/",
  "/about",
  "/contact-us",
  "/login",
  "/register",
  "/forgot-password",
];

onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  if (!user) {
    const isPublic = publicPages.includes(path);

    if (!isPublic) {
      window.location.href = "/login";
    }
  }
});

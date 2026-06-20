import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const protectedPages = ["/cart", "/admin", "/checkout"];

  if (!user && protectedPages.includes(location.pathname)) {
    location.href = "/login";
  }
});

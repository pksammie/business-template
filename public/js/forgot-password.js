import { auth } from "./firebase.js";

import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  try {
    await sendPasswordResetEmail(auth, email);

    showToast("Password reset email sent. Check your inbox or spam folder.");
  } catch (err) {
    let message = "Unable to send reset email.";

    if (err.code === "auth/user-not-found") {
      message = "No account exists with this email.";
    }

    showToast(message);
  }
});

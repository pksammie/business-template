import { auth, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const registerForm = document.getElementById("registerForm");

const email = document.getElementById("email");

const password = document.getElementById("password");

const confirmPassword = document.getElementById("confirmPassword");

const googleSignup = document.getElementById("googleSignup");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (password.value !== confirmPassword.value) {
    alert("Passwords don't match");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);

    alert("Registration successful");

    location.href = "/";
  } catch (err) {
    let message = "Registration failed.";

    switch (err.code) {
      case "auth/email-already-in-use":
        message = "Email already in use. Please try again.";
        break;

      case "auth/invalid-email":
        message = "Invalid email address.";
        break;

      case "auth/weak-password":
        message = "Password should be at least 6 characters.";
        break;
    }
    alert(message);
  }
});

googleSignup.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);

    location.href = "/";
  } catch (err) {
    alert(err.message);
  }
});

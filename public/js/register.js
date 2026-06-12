import { auth, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification
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

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

    await sendEmailVerification(
      userCredential.user
    );

    await auth.signOut();
    
    alert(
      "Account created. Please check your email and verify your account before logging in."
    );

    await auth.signOut();

    location.href = "/login";

  } catch (err) {

    let message = "Registration failed.";

    switch (err.code) {

      case "auth/email-already-in-use":
        message = "Email already in use.";
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

    await signInWithPopup(
      auth,
      googleProvider
    );

    location.href = "/";

  } catch (err) {
    alert(err.message);
  }
});
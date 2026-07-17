import { auth, googleProvider } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let failedAttempts = 0;

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const forgotContainer = document.getElementById("forgotContainer");
const googleButton = document.getElementById("googleLogin");
const togglePassword = document.getElementById("togglePassword");

if (loginForm && emailInput && passwordInput) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const loginBtn = loginForm.querySelector(".login-btn");

    if (!loginBtn) return;

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value,
      );

      if (!credential.user.emailVerified) {
        showToast(
          "Please verify your email first. Check your Spam/Junk folder if you can't find the verification email.",
        );

        await auth.signOut();
        return;
      }

      window.location.href = "/";
    } catch (err) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";

      failedAttempts++;
      
      if (failedAttempts >= 3 && forgotContainer) {
        forgotContainer.innerHTML = `
          <a href="/forgot-password">
            Forgot Password?
          </a>
        `;
      }

      let message = "Login failed. Please try again.";

      switch (err.code) {
        case "auth/invalid-credential":
          message = "Incorrect email or password. Please try again.";
          break;

        case "auth/user-not-found":
          message = "No account found with that email.";
          break;

        case "auth/wrong-password":
          message = "Incorrect password. Please try again.";
          break;

        case "auth/network-request-failed":
          message = "Please check your internet connection.";
          break;

        case "auth/too-many-requests":
          message = "Too many login attempts. Please try again later.";
          break;
      }

      showToast(message);
    }
  });
}

if (googleButton) {
  googleButton.addEventListener("click", async () => {
    googleButton.disabled = true;
    googleButton.textContent = "Connecting...";

    try {
      await signInWithPopup(auth, googleProvider);

      const redirect = sessionStorage.getItem("redirectAfterLogin");

      if (redirect) {
        sessionStorage.removeItem("redirectAfterLogin");
        window.location.href = redirect;
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      showToast("Google sign in failed. Please try again.");
    } finally {
      googleButton.disabled = false;
      googleButton.textContent = "Continue with Google";
    }
  });
}

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      icon.className = "fa-solid fa-eye-slash";
    } else {
      passwordInput.type = "password";
      icon.className = "fa-solid fa-eye";
    }
  });
}
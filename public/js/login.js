import {
    auth,
    googleProvider
}
from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signInWithPopup
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let failedAttempts = 0;

document
.getElementById("loginForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const credential =
await signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
);

if(
    !credential.user.emailVerified
){

    alert(
      "Please verify your email first."
    );

    await auth.signOut();

    return;
}

        location.href = "/";

    } catch (err) {

        failedAttempts++;

        if (failedAttempts >= 3) {

            document
            .getElementById("forgotContainer")
            .innerHTML = `
                <a href="/forgot-password">
                    Forgot Password?
                </a>
            `;
        }

        let message =
            "Login failed. Please try again.";

        switch (err.code) {

            case "auth/invalid-credential":
                message =
                "Incorrect email or password. Please try again.";
                break;

            case "auth/user-not-found":
                message =
                "No account found with that email.";
                break;

            case "auth/wrong-password":
                message =
                "Incorrect password. Please try again.";
                break;

            case "auth/network-request-failed":
                message =
                "Please check your internet connection.";
                break;

            case "auth/too-many-requests":
                message =
                "Too many login attempts. Please try again later.";
                break;

        }

        alert(message);
    }

});

document
.getElementById("googleLogin")
.addEventListener("click", async () => {

    try {

        await signInWithPopup(
            auth,
            googleProvider
        );

        location.href = "/";

    } catch (err) {

        alert(
            "Google sign in failed. Please try again."
        );

    }

});
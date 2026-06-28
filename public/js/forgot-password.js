import { auth } from "./firebase.js";

import {
sendPasswordResetEmail
}

from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const form =
document.getElementById("forgotForm");

form.addEventListener(
"submit",
async(e)=>{

e.preventDefault();

const btn =
form.querySelector("button");

btn.disabled=true;

btn.innerHTML="Sending Link...";

const email =
document
.getElementById("email")
.value.trim();

try{

await sendPasswordResetEmail(
auth,
email
);

showToast(
"Password reset email sent successfully. Please check your Inbox and Spam folder."
);

btn.innerHTML="Email Sent ✓";

setTimeout(()=>{

location.href="/login";

},2000);

}

catch(err){

btn.disabled=false;

btn.innerHTML="Send Reset Link";

let message=
"Unable to send reset email.";

switch(err.code){

case "auth/user-not-found":

message=
"No account exists with this email.";

break;

case "auth/invalid-email":

message=
"Please enter a valid email address.";

break;

case "auth/network-request-failed":

message=
"Check your internet connection.";

break;

case "auth/too-many-requests":

message=
"Too many attempts. Please try again later.";

break;

}

showToast(message);

}

});
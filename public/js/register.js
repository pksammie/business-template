import { auth, googleProvider } from "./firebase.js";

import {

createUserWithEmailAndPassword,

signInWithPopup,

sendEmailVerification

}

from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const registerForm =
document.getElementById("registerForm");

const email =
document.getElementById("email");

const password =
document.getElementById("password");

const confirmPassword =
document.getElementById("confirmPassword");

const googleSignup =
document.getElementById("googleSignup");

const strengthFill =
document.getElementById("strengthFill");

const strengthText =
document.getElementById("strengthText");

/* PASSWORD STRENGTH */

password.addEventListener("input",()=>{

const value=password.value;

let strength=0;

if(value.length>=6)strength++;

if(/[A-Z]/.test(value))strength++;

if(/[0-9]/.test(value))strength++;

if(/[^A-Za-z0-9]/.test(value))strength++;

const percent=[
0,
25,
50,
75,
100
][strength];

strengthFill.style.width=percent+"%";

if(strength<=1){

strengthFill.style.background="#ff3b30";

strengthText.innerText="Weak";

}

else if(strength==2){

strengthFill.style.background="#ff9500";

strengthText.innerText="Fair";

}

else if(strength==3){

strengthFill.style.background="#ffd60a";

strengthText.innerText="Good";

}

else{

strengthFill.style.background="#34c759";

strengthText.innerText="Strong";

}

});

/* REGISTER */

registerForm.addEventListener("submit",async(e)=>{

e.preventDefault();

const btn=
registerForm.querySelector("button");

btn.disabled=true;

btn.innerText="Creating Account...";

if(password.value!==confirmPassword.value){

showToast("Passwords don't match.");

btn.disabled=false;

btn.innerText="Create Account";

return;

}

try{

const userCredential=

await createUserWithEmailAndPassword(

auth,

email.value,

password.value

);

await sendEmailVerification(

userCredential.user

);

await auth.signOut();

showToast(

"Verification email sent! Check your Inbox or Spam folder."

);

location.href="/login";

}

catch(err){

btn.disabled=false;

btn.innerText="Create Account";

let message="Registration failed.";

switch(err.code){

case "auth/email-already-in-use":

message="Email already exists.";

break;

case "auth/invalid-email":

message="Invalid email address.";

break;

case "auth/weak-password":

message="Password must be at least 6 characters.";

break;

}

showToast(message);

}

});

/* GOOGLE */

googleSignup.addEventListener("click",async()=>{

try{

await signInWithPopup(auth,googleProvider);

location.href="/";

}

catch{

showToast("Google signup failed.");

}

});

/* SHOW PASSWORD */

function setupToggle(id,inputId){

const btn=document.getElementById(id);

const input=document.getElementById(inputId);

btn.onclick=()=>{

const icon=btn.querySelector("i");

if(input.type==="password"){

input.type="text";

icon.className="fa-solid fa-eye-slash";

}else{

input.type="password";

icon.className="fa-solid fa-eye";

}

};

}

setupToggle("togglePassword","password");

setupToggle("toggleConfirmPassword","confirmPassword");
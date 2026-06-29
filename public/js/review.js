import { db, auth } from "./firebase.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    updateDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

/* =====================================================
   URL PARAMETERS
===================================================== */

const params = new URLSearchParams(location.search);

const orderId = params.get("orderId");
const productId = params.get("productId");

/* =====================================================
   ELEMENTS
===================================================== */

const reviewForm = document.getElementById("review-form");

const reviewBox = document.getElementById("review-text");

const ratingSelect =
document.getElementById("review-rating");

const counter =
document.getElementById("review-count");

const oneStarModal =
document.getElementById("one-star-modal");

const submitOneStarBtn =
document.getElementById("submit-one-star");

const closeOneStarModal =
document.getElementById("close-one-star-modal");

const submitBtn =
reviewForm.querySelector(
'button[type="submit"]'
);

/* =====================================================
   REVIEW COUNTER
===================================================== */

reviewBox.addEventListener("input", () => {

counter.innerText =
reviewBox.value.length;

});

/* =====================================================
   BUTTON HELPERS
===================================================== */

function lockMainButton(){

submitBtn.disabled = true;

submitBtn.innerText =
"Sending Review...";

}

function unlockMainButton(){

submitBtn.disabled = false;

submitBtn.innerText =
"Submit Review";

}

function lockModalButton(){

submitOneStarBtn.disabled = true;

submitOneStarBtn.innerText =
"Sending Review...";

}

function unlockModalButton(){

submitOneStarBtn.disabled = false;

submitOneStarBtn.innerText =
"Submit Review";

}

/* =====================================================
   SUBMIT REVIEW
===================================================== */

async function submitReview(oneStarReason = ""){

const user = auth.currentUser;

if(!user){

showToast(
"Please login first."
);

return false;

}

try{

lockMainButton();

const rating =
Number(ratingSelect.value);

const reviewText =
reviewBox.value.trim();

/* ---------- validation ---------- */

if(reviewText.length < 20){

showToast(
"Please write at least 20 characters."
);

return false;

}

/* ---------- already reviewed ---------- */

const existingReviewQuery =
query(

collection(db,"reviews"),

where("orderId","==",orderId),

where("userId","==",user.uid)

);

const existingReview =
await getDocs(existingReviewQuery);

if(!existingReview.empty){

showToast(
"You already reviewed this product."
);

return false;

}

/* ---------- order ---------- */

const orderRef =
doc(
db,
"cart_reservations",
orderId
);

const orderSnap =
await getDoc(orderRef);

if(!orderSnap.exists()){

showToast(
"Order could not be found."
);

return false;

}

const order =
orderSnap.data();

/* ---------- save review ---------- */

await addDoc(

collection(db,"reviews"),

{

productId,

orderId,

userId:user.uid,

customerName:
order.customerName,

rating,

reviewText,

oneStarReason,

createdAt:Date.now(),

likes:0,

likedBy:[],

edited:false

}

);

/* ---------- mark reviewed ---------- */

await updateDoc(orderRef,{

reviewSubmitted:true

});

/* ---------- update product ---------- */

const productRef =
doc(
db,
"products",
productId
);

const productSnap =
await getDoc(productRef);

if(productSnap.exists()){

const product =
productSnap.data();

const totalRating =
(product.totalRating || 0)
+ rating;

const reviewCount =
(product.reviewCount || 0)
+ 1;

await updateDoc(

productRef,

{

totalRating,

reviewCount,

averageRating:
totalRating /
reviewCount

}

);

}

showToast(
"Thank you for reviewing this product!"
);

setTimeout(()=>{

location.href="/orders";

},1500);

return true;

}

catch(err){

console.error(err);

showToast(
err.message ||
"Couldn't submit review."
);

return false;

}

finally{

unlockMainButton();

}

}

/* =====================================================
   FORM SUBMIT
===================================================== */

reviewForm.addEventListener("submit", async (e) => {

e.preventDefault();

const rating =
Number(ratingSelect.value);

const reviewText =
reviewBox.value.trim();

if(reviewText.length < 20){

showToast(
"Please write at least 20 characters."
);

return;

}

/* ---------- one star ---------- */

if(rating === 1){

oneStarModal.style.display="flex";

return;

}

/* ---------- normal review ---------- */

await submitReview();

});

/* =====================================================
   ONE STAR REVIEW
===================================================== */

submitOneStarBtn.onclick = async()=>{

let selectedReason = "";

const selectedRadio =
document.querySelector(
'input[name="oneStarReason"]:checked'
);

if(selectedRadio){

selectedReason =
selectedRadio.value;

}

const customReason =
document
.getElementById(
"custom-one-star-reason"
)
.value
.trim();

if(customReason){

selectedReason =
customReason;

}

if(selectedReason===""){

showToast(
"Please tell us why you gave one star."
);

return;

}

lockModalButton();

const success =
await submitReview(selectedReason);

unlockModalButton();

if(success){

document
.querySelectorAll(
'input[name="oneStarReason"]'
)
.forEach(r=>{

r.checked=false;

});

document
.getElementById(
"custom-one-star-reason"
)
.value="";

oneStarModal.style.display="none";

}

};

/* =====================================================
   CLOSE MODAL
===================================================== */

closeOneStarModal.onclick = ()=>{

oneStarModal.style.display="none";

};

oneStarModal.onclick = (e)=>{

if(e.target===oneStarModal){

oneStarModal.style.display="none";

}

};

/* =====================================================
   RADIO TOGGLE
===================================================== */

let lastChecked = null;

document
.querySelectorAll(
'input[name="oneStarReason"]'
)
.forEach(radio=>{

radio.addEventListener(
"click",
function(){

if(lastChecked===this){

this.checked=false;

lastChecked=null;

}else{

lastChecked=this;

}

}

);

});

/* =====================================================
   CANCEL REVIEW
===================================================== */

document
.getElementById("cancel-review-btn")
.addEventListener("click",()=>{

if(submitBtn.disabled){

showToast(
"Please wait until your review finishes submitting."
);

return;

}

location.href="/orders";

});

/* =====================================================
   PAGE SAFETY
===================================================== */

window.addEventListener("beforeunload",(e)=>{

if(submitBtn.disabled || submitOneStarBtn.disabled){

e.preventDefault();

e.returnValue="";

}

});

/* =====================================================
   RESET UI AFTER SUCCESS
===================================================== */

function resetReviewForm(){

reviewForm.reset();

reviewBox.value="";

counter.innerText="0";

ratingSelect.value="5";

document
.querySelectorAll(
'input[name="oneStarReason"]'
)
.forEach(r=>{

r.checked=false;

});

document
.getElementById(
"custom-one-star-reason"
)
.value="";

}

/* =====================================================
   GLOBAL FIREBASE ERROR CATCH
===================================================== */

window.addEventListener("unhandledrejection",(event)=>{

console.error(event.reason);

showToast(
"Something went wrong. Please try again."
);

unlockMainButton();

unlockModalButton();

});

/* =====================================================
   PAGE READY
===================================================== */

document.addEventListener("DOMContentLoaded",()=>{

counter.innerText="0";

unlockMainButton();

unlockModalButton();

});


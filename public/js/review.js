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

const params =
new URLSearchParams(
    location.search
);

const orderId =
params.get("orderId");

const productId =
params.get("productId");

const reviewBox =
document.getElementById(
"review-text"
);

const oneStarModal =
document.getElementById(
"one-star-modal"
);

const submitOneStarBtn =
document.getElementById(
"submit-one-star"
);

const closeOneStarModal =
document.getElementById(
"close-one-star-modal"
);

const counter =
document.getElementById(
"review-count"
);

reviewBox.addEventListener(
"input",
()=>{

counter.innerText =
reviewBox.value.length;

});

async function submitReview(oneStarReason = ""){

const user = auth.currentUser;

if(!user) return;

const rating =
Number(
document.getElementById(
"review-rating"
).value
);

const reviewText =
reviewBox.value.trim();

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

return;

}

if(reviewText.length < 20){

showToast(
"Please write at least 20 characters."
);

return;

}

const orderSnap =
await getDoc(

doc(
db,
"cart_reservations",
orderId
)

);

const order =
orderSnap.data();

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

await updateDoc(

doc(
db,
"cart_reservations",
orderId
),

{

reviewSubmitted:true

}

);

const productRef =
doc(
db,
"products",
productId
);

const productSnap =
await getDoc(productRef);

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
(totalRating)/(reviewCount)

}

);

showToast(
"Thank you for reviewing this product!"
);

setTimeout(()=>{

location.href="/orders";

},1500);

}

document
.getElementById("review-form")
.addEventListener(
"submit",
async(e)=>{

e.preventDefault();

const rating =
Number(
document.getElementById(
"review-rating"
).value
);

const reviewText =
reviewBox.value.trim();

if(reviewText.length < 20){

showToast(
"Please write at least 20 characters."
);

return;

}

if(rating === 1){

oneStarModal.style.display="flex";

return;

}

submitReview();

});

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
.value.trim();

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

submitOneStarBtn.disabled=true;

submitOneStarBtn.innerText="Submitting...";

await submitReview(selectedReason);

submitOneStarBtn.disabled=false;

submitOneStarBtn.innerText="Submit Review";

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

};

closeOneStarModal.onclick = ()=>{

oneStarModal.style.display="none";

};

oneStarModal.onclick = (e)=>{

if(e.target===oneStarModal){

oneStarModal.style.display="none";

}

};
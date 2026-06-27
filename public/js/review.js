import { db, auth } from "./firebase.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    updateDoc,
    increment
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params =
new URLSearchParams(
    location.search
);

const orderId =
params.get("orderId");

const productId =
params.get("productId");

document
.getElementById("review-form")
.addEventListener(
"submit",
async(e)=>{

e.preventDefault();

const user =
auth.currentUser;

if(!user){
    return;
}

const rating =
Number(
document.getElementById(
"review-rating"
).value
);

const reviewText =
document.getElementById(
"review-text"
).value;

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

try{

await addDoc(
collection(db,"reviews"),
{
productId,
orderId,
userId:user.uid,

customerName:order.customerName,

rating,

reviewText,

createdAt:Date.now(),

likes:0,

likedBy:[],

edited:false
}
);

}catch(error){

console.error(error);

alert(error.message);

return;

}

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

const averageRating =
totalRating /
reviewCount;

await updateDoc(
productRef,
{
totalRating,
reviewCount,
averageRating
}
);

alert(
"Review submitted"
);

location.href =
"/orders";

});
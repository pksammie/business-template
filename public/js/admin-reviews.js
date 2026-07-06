import { db } from "./firebase.js";

import {

collection,

onSnapshot,

deleteDoc,

doc,

updateDoc

}

from

"https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const container=

document.getElementById("reviews-container");

const searchInput=

document.getElementById("orders-search");

const ratingFilter=

document.getElementById("rating-filter");

let reviews=[];

let selectedReview = null;

const replyModal =
document.getElementById("reply-modal");

const replyText =
document.getElementById("admin-reply-text");

function stars(r){

return "★".repeat(r)+

"☆".repeat(5-r);

}

function render(){

container.innerHTML="";

const term=

searchInput.value.toLowerCase();

const rating=

ratingFilter.value;

const REVIEWS_PER_PAGE = 8;

let currentPage = 1;

function render(){

container.innerHTML="";

const term = searchInput.value.toLowerCase();

const rating = ratingFilter.value;

const filtered = reviews.filter(r=>{

const matchSearch =
(r.customerName||"").toLowerCase().includes(term) ||
(r.reviewText||"").toLowerCase().includes(term);

const matchRating =
rating==="all" ||
Number(r.rating)===Number(rating);

return matchSearch && matchRating;

});

const start = (currentPage-1)*REVIEWS_PER_PAGE;

const pageItems = filtered.slice(start,start+REVIEWS_PER_PAGE);

pageItems.forEach(r=>{

// your existing review card HTML here

});

renderPagination(filtered.length);

}

}

function renderPagination(total){

const container =
document.getElementById("reviews-pagination");

const pages =
Math.ceil(total/REVIEWS_PER_PAGE);

if(pages<=1){

container.innerHTML="";

return;

}

let html="";

html+=`
<button
${currentPage===1?"disabled":""}
onclick="changeReviewPage(${currentPage-1})">
‹
</button>
`;

for(let i=1;i<=pages;i++){

html+=`
<button
class="${i===currentPage?"active":""}"
onclick="changeReviewPage(${i})">
${i}
</button>
`;

}

html+=`
<button
${currentPage===pages?"disabled":""}
onclick="changeReviewPage(${currentPage+1})">
›
</button>
`;

container.innerHTML=html;

}

window.changeReviewPage=function(page){

currentPage=page;

render();

}

searchInput.oninput=()=>{

currentPage=1;

render();

};

ratingFilter.onchange=()=>{

currentPage=1;

render();

};

onSnapshot(

collection(db,"reviews"),

snap=>{

reviews=[];

snap.forEach(d=>{

reviews.push({

id:d.id,

...d.data()

});

});

render();

}

);

searchInput.oninput=render;

ratingFilter.onchange=render;

window.deleteReview=

async(id)=>{

if(!confirm(

"Delete review?"

)) return;

await deleteDoc(

doc(db,"reviews",id)

);

showToast(

"Review deleted."

);

};

window.replyReview=function(id){

selectedReview=id;

replyText.value="";

replyModal.style.display="flex";

};

window.featureReview=

function(id){

location.href=

`/admin-review-feature.html?id=${id}`;

};

document
.getElementById("close-reply-modal")

.onclick=()=>{

replyModal.style.display="none";

};

replyModal.onclick=e=>{

if(e.target===replyModal){

replyModal.style.display="none";

}

};

document

.getElementById("send-admin-reply")

.onclick=async()=>{

if(!selectedReview)return;

const text=

replyText.value.trim();

if(!text){

showToast(

"Write a reply."

);

return;

}

await updateDoc(

doc(db,"reviews",selectedReview),

{

adminReply:text,

adminReplyDate:Date.now()

}

);

replyModal.style.display="none";

showToast(

"Reply sent."

);

};
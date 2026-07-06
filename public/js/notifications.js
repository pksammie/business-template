import { auth, db } from "./firebase.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
doc,
updateDoc
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const container = document.getElementById("notifications-container");

const emptyState = document.getElementById("empty-notifications");

const unreadCount = document.getElementById("unread-count");

onAuthStateChanged(auth,user=>{

if(!user){

location.href="/login";

return;

}

loadNotifications(user.uid);

});

function loadNotifications(uid){    

const q=query(

collection(db,"user_notifications"),

where("userId","==",uid),

orderBy("createdAt","desc")

);

onSnapshot(q,snapshot=>{

container.innerHTML="";

let unread=0;

document.getElementById("loading-text").style.display="none";

if(snapshot.empty){

document.getElementById("empty-text").style.display="block";

document.getElementById("empty-text").style.display="none";

container.style.display="none";

emptyState.style.display="flex";

unreadCount.innerText="0 unread";

return;

}

container.style.display="flex";

emptyState.style.display="none";

snapshot.forEach(docSnap=>{

const notification={

id:docSnap.id,

...docSnap.data()

};

if(!notification.read){

unread++;

}

container.appendChild(

createCard(notification)

);

});

if(openId){

const card=document.getElementById(`notif-${openId}`);

if(card){

card.querySelector("button").click();

card.scrollIntoView({

behavior:"smooth",

block:"center"

});

}

}

unreadCount.innerText=

`${unread} unread`;

});

}

const params = new URLSearchParams(location.search);

const openId = params.get("id");

if(openId){

setTimeout(()=>{

const card=document.getElementById(`notif-${openId}`);

if(card){

card.click();

card.scrollIntoView({

behavior:"smooth",

block:"center"

});

}

},500);

}

function createCard(notification){

const card=document.createElement("div");

card.className =
`notification-card ${notification.read ? "" : "unread"}`;

card.id = `notif-${notification.id}`;

card.innerHTML=`

<div class="notification-top">

<img

src="${notification.productImage}"

class="notification-image">

<div class="notification-info">

<div class="notification-status">

${notification.status}

</div>

<div class="notification-title">

${notification.productTitle}

</div>

<div class="notification-date">

${formatDate(notification.createdAt)}

</div>

</div>

</div>

<div class="notification-action">

<button>

View Details

</button>

</div>

<div class="notification-details">

<img src="${notification.productImage}">

<h3>

${notification.productTitle}

</h3>

<p>

<strong>Status:</strong>

${notification.status}

</p>

<p>

${notification.message}

</p>

<p>

<strong>Order ID:</strong>

${notification.orderId}

</p>

<p>

<strong>Date:</strong>

${formatFullDate(notification.createdAt)}

</p>

<button

class="open-order-btn"

data-order="${notification.orderId}">

View Order

</button>

</div>

`;

const details=

card.querySelector(".notification-details");

card.querySelector("button").onclick=async()=>{

details.classList.toggle("show");

if(!notification.read){

await updateDoc(

doc(db,"user_notifications",notification.id),

{

read:true

}

);

}

};

details

.querySelector(".open-order-btn")

.onclick=()=>{

location.href=`/orders?open=${notification.orderId}`;

};

return card;

}

function formatDate(timestamp){

let date;

if(timestamp?.toDate){

date=timestamp.toDate();

}else{

date=new Date(timestamp);

}

return date.toLocaleDateString(

undefined,

{

day:"numeric",

month:"short",

year:"numeric",

hour:"numeric",

minute:"2-digit"

}

);

}

function formatFullDate(timestamp){

let date;

if(timestamp?.toDate){

date=timestamp.toDate();

}else{

date=new Date(timestamp);

}

return date.toLocaleString();

}
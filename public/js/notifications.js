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

const loadingState = document.getElementById("notifications-loading");

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

loadingState.style.display="none";

if(snapshot.empty){

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

if(openId && !autoOpened){

    autoOpened = true;

    requestAnimationFrame(()=>{

        const card=document.getElementById(`notif-${openId}`);

        if(card){

            card.click();

            card.scrollIntoView({

                behavior:"smooth",

                block:"center"

            });

        }

    });

}

unreadCount.innerText=

`${unread} unread`;

});

}

const params = new URLSearchParams(location.search);

const openId = params.get("id");

let autoOpened = false;

function createCard(notification){

const card=document.createElement("div");

card.id=`notif-${notification.id}`;

card.className=`notification-card ${notification.read ? "" : "unread"}`;

card.innerHTML=`

<div class="notification-top">

<div class="notification-image-wrapper">

<img

src="${notification.productImage}"

class="notification-image">

${notification.read ? "" : `<span class="unread-dot"></span>`}

</div>

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

${
notification.orderId
?
`
<p>

<strong>Order ID:</strong>

${notification.orderId}

</p>
`
:
""
}

<p>

<strong>Date:</strong>

${formatFullDate(notification.createdAt)}

</p>

${
notification.orderId
?
`
<button

class="open-order-btn"

data-order="${notification.orderId}">

View Order

</button>
`
:
notification.productId
?
`
<button

class="open-product-btn"

data-product="${notification.productId}">

View Product

</button>
`
:
""
}

</div>

`;

const details=

card.querySelector(".notification-details");

async function toggleNotification() {

    const isOpen = details.classList.contains("show");

    if (isOpen) {

        details.classList.remove("show");

    } else {

        details.classList.add("show");

    }

    const btn = card.querySelector("button");

    btn.innerText = details.classList.contains("show")
        ? "Close Details"
        : "View Details";

    if (!notification.read) {

        card.classList.remove("unread");

        card.querySelector(".unread-dot")?.remove();

        notification.read = true;

        await updateDoc(
    doc(db, "user_notifications", notification.id),
    {
        read: true
    }
);

// reopen after Firestore rebuilds

setTimeout(() => {

    const rebuilt = document.getElementById(`notif-${notification.id}`);

    if(!rebuilt) return;

    const rebuiltDetails =
        rebuilt.querySelector(".notification-details");

    rebuiltDetails.classList.add("show");

    rebuilt.classList.remove("unread");

    rebuilt.querySelector(".notification-action button").innerText =
        "Close Details";

},150);

    }

}

card.addEventListener("click", toggleNotification);

card.querySelector("button").onclick=(e)=>{

    e.stopPropagation();

    toggleNotification();

};

const openOrderBtn = details.querySelector(".open-order-btn");

if (openOrderBtn) {
    openOrderBtn.onclick=()=>{
        location.href=`/orders?open=${notification.orderId}`;
    };
}

const openProductBtn = details.querySelector(".open-product-btn");

if (openProductBtn) {
    openProductBtn.onclick=()=>{
        location.href=`/decision-page.html?id=${notification.productId}`;
    };
}

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
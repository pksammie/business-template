import { auth, db } from "./firebase.js";

import {
collection,
query,
where,
orderBy,
limit,
onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let firstLoad = true;

onAuthStateChanged(auth,user=>{

if(!user) return;

const q=query(

collection(db,"user_notifications"),

where("userId","==",user.uid),

orderBy("createdAt","desc")

);

onSnapshot(q,snapshot=>{

updateBadge(snapshot);

if(firstLoad){

firstLoad=false;

return;

}

snapshot.docChanges().forEach(change=>{

if(change.type==="added"){

showNotificationToast({

id:change.doc.id,

...change.doc.data()

});

}

});

});

});

function updateBadge(snapshot){

const badge=document.getElementById("notification-badge");

if(!badge) return;

let unread=0;

snapshot.forEach(doc=>{

if(!doc.data().read){

unread++;

}

});

badge.innerText=unread;

badge.style.display=

unread>0

?

"flex"

:

"none";

}

function showNotificationToast(notification){

const toast=document.createElement("div");

toast.className="user-notification-toast";

toast.innerHTML=`

<div class="toast-left">

<img src="${notification.productImage}">

</div>

<div class="toast-right">

<h4>${notification.status}</h4>

<p>${notification.message}</p>

<button>

View Details

</button>

</div>

`;

document.body.appendChild(toast);

requestAnimationFrame(()=>{

toast.classList.add("show");

});

toast.onclick=()=>{

location.href=`/notifications?id=${notification.id}`;

};

setTimeout(()=>{

toast.classList.remove("show");

setTimeout(()=>{

toast.remove();

},400);

},6000);

}
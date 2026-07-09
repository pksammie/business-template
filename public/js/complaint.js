import { auth, db } from "./firebase.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
getDocs,
addDoc,
serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const form = document.getElementById("complaint-form");

const orderSelect = document.getElementById("complaint-order");

const subjectInput = document.getElementById("complaint-subject");

const messageInput = document.getElementById("complaint-message");

const listEl = document.getElementById("complaints-list");

const emptyState = document.getElementById("complaints-empty");

const loadingState = document.getElementById("complaints-loading");

let currentUser = null;

let userOrders = [];

onAuthStateChanged(auth, (user) => {

if (!user) {

sessionStorage.setItem("redirectAfterLogin", "/complaint.html");

location.href = "/login";

return;

}

currentUser = user;

loadUserOrders(user.uid);

loadComplaints(user.uid);

});

async function loadUserOrders(uid){

const q = query(

collection(db, "cart_reservations"),

where("userId", "==", uid)

);

const snap = await getDocs(q);

userOrders = [];

snap.forEach(docSnap => {

userOrders.push({ id: docSnap.id, ...docSnap.data() });

});

userOrders.forEach(order => {

const opt = document.createElement("option");

opt.value = order.id;

opt.innerText = `${order.productTitle || "Order"} — ${order.status || ""}`;

orderSelect.appendChild(opt);

});

}

form.addEventListener("submit", async (e) => {

e.preventDefault();

if(!currentUser) return;

const orderId = orderSelect.value || null;

const order = orderId ? userOrders.find(o => o.id === orderId) : null;

const subject = subjectInput.value.trim();

const message = messageInput.value.trim();

if(!subject || !message){

showToast("Please fill in both the subject and message.");

return;

}

try {

await addDoc(collection(db, "complaints"), {

userId: currentUser.uid,

orderId: orderId,

productId: order?.productId || null,

productTitle: order?.productTitle || null,

productImage: order?.productImage || null,

subject,

message,

status: "Open",

createdAt: serverTimestamp()

});

showToast("Complaint submitted. We'll be in touch soon.");

form.reset();

} catch (err) {

console.error(err);

showToast("Couldn't submit your complaint. Please try again.");

}

});

function loadComplaints(uid){

const q = query(

collection(db, "complaints"),

where("userId", "==", uid),

orderBy("createdAt", "desc")

);

onSnapshot(q, (snapshot) => {

loadingState.style.display = "none";

listEl.innerHTML = "";

if(snapshot.empty){

emptyState.style.display = "flex";

return;

}

emptyState.style.display = "none";

snapshot.forEach(docSnap => {

const complaint = { id: docSnap.id, ...docSnap.data() };

listEl.appendChild(renderComplaintCard(complaint));

});

});

}

function renderComplaintCard(complaint){

const card = document.createElement("div");

card.className = "complaint-card";

const isResolved = complaint.status === "Resolved";

card.innerHTML = `

<div class="complaint-card-top">

<h3>${complaint.subject}</h3>

<span class="complaint-status-badge ${isResolved ? "resolved" : "open"}">

${isResolved ? "Resolved" : "Open"}

</span>

</div>

${complaint.productTitle ? `<p class="complaint-order-ref">Regarding: ${complaint.productTitle}</p>` : ""}

<p class="complaint-message">${complaint.message}</p>

${

complaint.adminReply

?

`<div class="complaint-reply-box">

<strong><i class="fa-solid fa-reply"></i> Store Reply</strong>

<p>${complaint.adminReply}</p>

</div>`

:

`<p class="complaint-pending-note">We'll reply here once we've looked into it.</p>`

}

`;

return card;

}
import { auth, db } from "./firebase.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
doc,
updateDoc,
deleteDoc,
writeBatch
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

const deleteAllBtn = document.getElementById("delete-all-btn");

const selectionToolbar = document.getElementById("selection-toolbar");

const selectionCount = document.getElementById("selection-count");

const selectionCancelBtn = document.getElementById("selection-cancel-btn");

const selectionSelectAllBtn = document.getElementById("selection-select-all-btn");

const selectionDeleteBtn = document.getElementById("selection-delete-btn");

const contextMenu = document.getElementById("notif-context-menu");

const contextSelectBtn = document.getElementById("context-select-btn");

const contextDeleteBtn = document.getElementById("context-delete-btn");

let currentUid = null;

/* ---------------- SELECTION MODE STATE ---------------- */

let selectionMode = false;

let selectedIds = new Set();

let latestNotifications = []; // the notifications from the most recent snapshot

let longPressTimer = null;

let suppressNextClick = false;

let contextTargetId = null;

function enterSelectionMode(initialId){

    selectionMode = true;

    if(initialId){

        selectedIds.add(initialId);

        document.getElementById(`notif-${initialId}`)?.classList.add("notif-selected");

    }

    container.classList.add("selection-active");

    updateSelectionUI();

}

function exitSelectionMode(){

    selectionMode = false;

    selectedIds.clear();

    container.classList.remove("selection-active");

    selectionToolbar.classList.remove("show");

    document.querySelectorAll(".notification-card.notif-selected")
        .forEach(c => c.classList.remove("notif-selected"));

}

function toggleSelected(id, cardEl){

    if(selectedIds.has(id)){

        selectedIds.delete(id);

        cardEl?.classList.remove("notif-selected");

    }else{

        selectedIds.add(id);

        cardEl?.classList.add("notif-selected");

    }

    if(selectedIds.size === 0){

        exitSelectionMode();

    }else{

        updateSelectionUI();

    }

}

function updateSelectionUI(){

    if(!selectionMode) return;

    selectionToolbar.classList.add("show");

    selectionCount.innerText = `${selectedIds.size} selected`;

    const allSelected =
        latestNotifications.length > 0 &&
        latestNotifications.every(n => selectedIds.has(n.id));

    selectionSelectAllBtn.innerText = allSelected ? "Deselect All" : "Select All";

}

selectionCancelBtn.addEventListener("click", () => {

    exitSelectionMode();

});

selectionSelectAllBtn.addEventListener("click", () => {

    const allSelected =
        latestNotifications.length > 0 &&
        latestNotifications.every(n => selectedIds.has(n.id));

    if(allSelected){

        selectedIds.clear();

        exitSelectionMode();

    }else{

        latestNotifications.forEach(n => selectedIds.add(n.id));

        document.querySelectorAll(".notification-card")
            .forEach(c => c.classList.add("notif-selected"));

        updateSelectionUI();

    }

});

selectionDeleteBtn.addEventListener("click", () => {

    if(selectedIds.size === 0) return;

    const ids = [...selectedIds];

    window.showConfirmModal(
        `Delete ${ids.length} notification${ids.length > 1 ? "s" : ""}?`,
        async () => {

            try {

                const batch = writeBatch(db);

                ids.forEach(id => {
                    batch.delete(doc(db, "user_notifications", id));
                });

                await batch.commit();

                showToast("Notifications deleted.");

            } catch (err) {

                console.error(err);

                showToast("Couldn't delete notifications.");

            }

            exitSelectionMode();

        }
    );

});

deleteAllBtn.addEventListener("click", () => {

    if(latestNotifications.length === 0){

        showToast("No notifications to delete.");

        return;

    }

    window.showConfirmModal(
        "Delete all notifications? This cannot be undone.",
        async () => {

            try {

                const batch = writeBatch(db);

                latestNotifications.forEach(n => {
                    batch.delete(doc(db, "user_notifications", n.id));
                });

                await batch.commit();

                showToast("All notifications deleted.");

            } catch (err) {

                console.error(err);

                showToast("Couldn't delete notifications.");

            }

            exitSelectionMode();

        }
    );

});

/* ---------------- CONTEXT MENU (RIGHT CLICK) ---------------- */

function openContextMenu(x, y, id){

    contextTargetId = id;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    contextMenu.classList.add("show");

    // keep menu on-screen
    requestAnimationFrame(() => {
        const rect = contextMenu.getBoundingClientRect();
        if(rect.right > window.innerWidth){
            contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if(rect.bottom > window.innerHeight){
            contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    });

}

function closeContextMenu(){

    contextMenu.classList.remove("show");

    contextTargetId = null;

}

document.addEventListener("click", (e) => {

    if(!contextMenu.contains(e.target)){

        closeContextMenu();

    }

});

document.addEventListener("scroll", closeContextMenu, true);

contextSelectBtn.addEventListener("click", () => {

    if(!contextTargetId) return;

    const id = contextTargetId;

    closeContextMenu();

    if(!selectionMode){

        enterSelectionMode(id);

    }else{

        selectedIds.add(id);

        document.getElementById(`notif-${id}`)?.classList.add("notif-selected");

        updateSelectionUI();

    }

});

contextDeleteBtn.addEventListener("click", () => {

    if(!contextTargetId) return;

    const id = contextTargetId;

    closeContextMenu();

    window.showConfirmModal(
        "Delete this notification?",
        async () => {

            try {

                await deleteDoc(doc(db, "user_notifications", id));

            } catch (err) {

                console.error(err);

                showToast("Couldn't delete notification.");

            }

        }
    );

});

onAuthStateChanged(auth,user=>{

if(!user){

location.href="/login";

return;

}

currentUid = user.uid;

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

latestNotifications = [];

if(selectionMode) exitSelectionMode();

return;

}

container.style.display="flex";

emptyState.style.display="none";

latestNotifications = [];

snapshot.forEach(docSnap=>{

const notification={

id:docSnap.id,

...docSnap.data()

};

latestNotifications.push(notification);

if(!notification.read){

unread++;

}

container.appendChild(

createCard(notification)

);

});

// drop any selected ids that no longer exist, and keep selection styling in sync
const validIds = new Set(latestNotifications.map(n => n.id));

[...selectedIds].forEach(id => {
    if(!validIds.has(id)) selectedIds.delete(id);
});

if(selectionMode){

    if(selectedIds.size === 0){

        exitSelectionMode();

    }else{

        container.classList.add("selection-active");

        selectedIds.forEach(id => {
            document.getElementById(`notif-${id}`)?.classList.add("notif-selected");
        });

        updateSelectionUI();

    }

}

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

<div class="notif-selector">
<i class="fa-solid fa-check"></i>
</div>

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

<button class="delete-notif-btn" data-id="${notification.id}">
<i class="fa-solid fa-trash-can"></i> Delete
</button>

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

/* ---------------- SELECTION: LONG PRESS (MOBILE) ---------------- */

card.addEventListener("touchstart", () => {

    clearTimeout(longPressTimer);

    longPressTimer = setTimeout(() => {

        suppressNextClick = true;

        if(!selectionMode){

            enterSelectionMode(notification.id);

        }else{

            toggleSelected(notification.id, card);

        }

        try { navigator.vibrate?.(15); } catch (e) {}

    }, 500);

}, { passive:true });

["touchend","touchmove","touchcancel"].forEach(evt => {

    card.addEventListener(evt, () => {

        clearTimeout(longPressTimer);

    }, { passive:true });

});

/* ---------------- SELECTION: RIGHT CLICK (DESKTOP) ---------------- */

card.addEventListener("contextmenu", (e) => {

    e.preventDefault();

    openContextMenu(e.clientX, e.clientY, notification.id);

});

/* ---------------- CLICK: TOGGLE SELECTION OR DETAILS ---------------- */

card.addEventListener("click", (e) => {

    if(suppressNextClick){

        suppressNextClick = false;

        return;

    }

    if(selectionMode){

        e.stopPropagation();

        toggleSelected(notification.id, card);

        return;

    }

    toggleNotification();

});

card.querySelector(".notif-selector").addEventListener("click", (e) => {

    e.stopPropagation();

    if(!selectionMode){

        enterSelectionMode(notification.id);

    }else{

        toggleSelected(notification.id, card);

    }

});

card.querySelector(".notification-action button").onclick=(e)=>{

    e.stopPropagation();

    if(selectionMode){

        toggleSelected(notification.id, card);

        return;

    }

    toggleNotification();

};

const openOrderBtn = details.querySelector(".open-order-btn");

if (openOrderBtn) {
    openOrderBtn.onclick=(e)=>{
        e.stopPropagation();
        location.href=`/orders?open=${notification.orderId}`;
    };
}

const openProductBtn = details.querySelector(".open-product-btn");

if (openProductBtn) {
    openProductBtn.onclick=(e)=>{
        e.stopPropagation();
        location.href=`/decision-page.html?id=${notification.productId}`;
    };
}

const deleteBtn = details.querySelector(".delete-notif-btn");

deleteBtn.onclick = (e) => {

    e.stopPropagation();

    window.showConfirmModal(
        "Delete this notification?",
        async () => {

            try {

                await deleteDoc(doc(db, "user_notifications", notification.id));

            } catch (err) {

                console.error(err);

                showToast("Couldn't delete notification.");

            }

        }
    );

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
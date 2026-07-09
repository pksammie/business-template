import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let popup = null;

let latestKnownNotificationId =
sessionStorage.getItem("latestKnownNotificationId") || null;

function injectNotificationUI(){

    if(document.getElementById("global-admin-notification")) return;

    popup = document.createElement("div");

    popup.id = "global-admin-notification";

    popup.innerHTML = `

        <div class="gan-icon">

            <i class="fa-solid fa-bell"></i>

        </div>

        <div class="gan-content">

            <h4>New Order</h4>

            <p id="gan-text">

                Someone placed a new order.

            </p>

        </div>

    `;

    document.body.appendChild(popup);

}



function injectStyles(){

    if(document.getElementById("gan-style")) return;

    const style = document.createElement("style");

    style.id = "gan-style";

    style.textContent = `

#global-admin-notification{

position:fixed;

top:25px;

right:25px;

width:330px;

display:flex;

align-items:center;

gap:14px;

padding:18px;

background:#111;

color:white;

border-radius:18px;

box-shadow:0 15px 45px rgba(0,0,0,.25);

transform:translateX(420px);

opacity:0;

transition:.45s;

z-index:999999999;

}

#global-admin-notification.show{

transform:translateX(0);

opacity:1;

}

.gan-icon{

font-size:22px;

color:#d4af37;

}

.gan-content h4{

margin:0;

font-size:15px;

}

.gan-content p{

margin-top:4px;

font-size:13px;

opacity:.8;

}

`;

    document.head.appendChild(style);

}



function unlockAudio() {

    if (window.__timelessAudioUnlocked) return;

    const tempAudio = new Audio("/sounds/notification.wav");

    tempAudio.muted = true;

    tempAudio.volume = 0;

    tempAudio.play()
        .then(() => {
            tempAudio.pause();
            tempAudio.currentTime = 0;
            window.__timelessAudioUnlocked = true;
        })
        .catch(() => {});
}



function playNotification() {

    if (!window.__timelessAudioUnlocked) return;

    const sound = new Audio("/sounds/notification.wav");

    sound.preload = "auto";

    sound.volume = 1;

    sound.currentTime = 0;

    sound.play().catch(() => {});
}



function showNotification(message){

    const text = document.getElementById("gan-text");

    if(text) text.textContent = message;

    popup.classList.add("show");

    playNotification();

    setTimeout(()=>{

        popup.classList.remove("show");

    },5000);

}

onAuthStateChanged(auth, async user => {

    if (!user) {
    return;
}

    let isAdmin = false;

    try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        isAdmin = adminDoc.exists();
    } catch (err) {
        return;
    }

    if (!isAdmin) return;

    injectStyles();

    injectNotificationUI();

    unlockAudio();

    startAdminNotificationListener();

});

function startAdminNotificationListener(){

    const q = query(
        collection(db,"admin_notifications"),
        orderBy("createdAt","desc"),
        limit(1)
    );

    onSnapshot(q,(snapshot)=>{

        if(snapshot.empty) return;

        const notificationDoc = snapshot.docs[0];

        const data = notificationDoc.data();

        const notificationId = notificationDoc.id;

        // First page load
        if(!latestKnownNotificationId){

            latestKnownNotificationId = notificationId;

            sessionStorage.setItem(
                "latestKnownNotificationId",
                notificationId
            );

            return;

        }

        // Ignore same notification
        if(notificationId === latestKnownNotificationId){

            return;

        }

        latestKnownNotificationId = notificationId;

        sessionStorage.setItem(
            "latestKnownNotificationId",
            notificationId
        );

        switch(data.type){

            case "review":

                showNotification(
                    `${data.customerName} reviewed ${data.productTitle}`
                );

                break;

            case "order":

                showNotification(
                    `${data.customerName} placed an order`
                );

                break;

        }

    });

}
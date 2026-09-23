import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    updateDoc
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

            <h4 id="gan-title">New Order</h4>

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

@media (max-width: 768px){

#global-admin-notification{

top:-200px;

right:16px;

left:16px;

width:auto;

transition:top .4s ease;

}

#global-admin-notification.show{

top:16px;

right:16px;

}

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



function showNotification(message, title = "New Order"){

    const text = document.getElementById("gan-text");

    const heading = document.getElementById("gan-title");

    if(text) text.textContent = message;

    if(heading) heading.textContent = title;

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

    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });

    startAdminNotificationListener();

    startAdminBadgeCounts();

    markCurrentPageNotificationsRead();

});

/* ── Red badge counts on the admin dashboard's Customer Reviews /
   Complaints buttons, capped at 99+. Counts unread admin_notifications
   of that type so it behaves like a real "new items" indicator. ── */
function formatBadgeCount(n){
    return n > 99 ? "99+" : String(n);
}

function startAdminBadgeCounts(){

    onSnapshot(collection(db, "admin_notifications"), snapshot => {

        let reviewCount = 0;
        let complaintCount = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.read) return;

            if (data.type === "review") reviewCount++;
            else if (data.type === "complaint") complaintCount++;
        });

        const reviewsBadge = document.getElementById("reviews-badge");
        if (reviewsBadge) {
            reviewsBadge.textContent = formatBadgeCount(reviewCount);
            reviewsBadge.style.display = reviewCount > 0 ? "flex" : "none";
        }

        const complaintsBadge = document.getElementById("complaints-badge");
        if (complaintsBadge) {
            complaintsBadge.textContent = formatBadgeCount(complaintCount);
            complaintsBadge.style.display = complaintCount > 0 ? "flex" : "none";
        }
    });
}

/* Visiting the Customer Reviews or Complaints admin page counts as having
   seen those items, so their unread admin_notifications get cleared and
   the dashboard badge goes back down. */
function markCurrentPageNotificationsRead(){

    const path = location.pathname;
    let targetType = null;

    if (path.includes("admin-reviews")) targetType = "review";
    else if (path.includes("admin-complaints")) targetType = "complaint";

    if (!targetType) return;

    const q = query(
        collection(db, "admin_notifications"),
        where("type", "==", targetType),
        where("read", "==", false)
    );

    getDocs(q).then(snapshot => {
        snapshot.forEach(docSnap => {
            updateDoc(doc(db, "admin_notifications", docSnap.id), { read: true }).catch(() => {});
        });
    }).catch(() => {});
}

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
                    `${data.customerName} reviewed ${data.productTitle}`,
                    "New Review"
                );

                break;

            case "order":

                showNotification(
                    `${data.customerName} placed an order`,
                    "New Order"
                );

                break;

            case "complaint":

                showNotification(
                    `${data.customerName} filed a complaint: ${data.subject}`,
                    "New Complaint"
                );

                break;

        }

    });

}
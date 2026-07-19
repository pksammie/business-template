import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const loader =
document.getElementById("admin-loader");

const denied =
document.getElementById("admin-denied");

const deniedTitle =
document.getElementById("denied-title");

const deniedMessage =
document.getElementById("denied-message");

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        deniedTitle.textContent = "Restricted Area";

        deniedMessage.textContent = "Please login first.";

        denied.style.display="flex";

        loader.style.display="none";

        document.body.classList.remove("scroll-locked");

        return;
    }

    const adminDoc =
    await getDoc(
        doc(db,"admins",user.uid)
    );

    if(adminDoc.exists()){

        location.href="/admin-panel";

    }else{

        loader.style.display="none";

        document.body.classList.remove("scroll-locked");

        denied.style.display="flex";

    }

});
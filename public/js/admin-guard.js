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

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        denied.style.display="flex";

        denied.innerHTML=`
            <h2>Restricted Area</h2>
            <p>
                Please login first.
            </p>
        `;

        loader.style.display="none";

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

        denied.style.display="flex";

    }

});
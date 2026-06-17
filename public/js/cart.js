    import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    addDoc
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

    const cartItemsContainer =
document.getElementById("cart-items-container");

const subtotalLabel =
document.getElementById("summary-subtotal");

let editMode = false;

let selectedIndex = null;

let firestoreCart = [];

async function backupCurrentCart(){

    const user = auth.currentUser;

    if(!user || firestoreCart.length === 0){

        return;

    }

    await addDoc(

        collection(
            db,
            "users",
            user.uid,
            "cart_backups"
        ),

        {
            createdAt: Date.now(),

            items: firestoreCart.map(item => ({
    productId: item.productId,
    title: item.title,
    image: item.image,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    color: item.color
}))
        }

    );

}

    async function renderTabularCart() {

    const user = auth.currentUser;

    if (!user) return;

    const cartRef =
    collection(
        db,
        "users",
        user.uid,
        "cart"
    );

    const snap =
    await getDocs(cartRef);

    firestoreCart = [];

    snap.forEach(docSnap => {

        firestoreCart.push({

            firestoreId: docSnap.id,

            ...docSnap.data()

        });

    });

    if (!cartItemsContainer) return;

    if (firestoreCart.length === 0) {

        cartItemsContainer.innerHTML = `
<div class="empty-cart">

Your shopping bag is empty.

</div>
`;

        subtotalLabel.innerText = "₦0";

        return;
    }

    cartItemsContainer.innerHTML = "";

    let calculatedGrossTotal = 0;

    firestoreCart.forEach((item,index)=>{

        const itemLineTotal =
        item.price * item.quantity;

        calculatedGrossTotal +=
        itemLineTotal;

        const card =
document.createElement("div");

card.className = "cart-product-card";

if(selectedIndex === index){

    card.classList.add("selected");

}

card.innerHTML = `

<img
src="${item.image}"
class="cart-card-image">

<div class="cart-card-content">

    <div class="cart-card-title">
        ${item.title}
    </div>

    <div class="cart-card-price">
        ₦${item.price.toLocaleString()}
    </div>

    <div class="cart-card-meta">
        Size: ${item.size}
    </div>

    <div class="cart-card-meta">
        Color: ${item.color}
    </div>

    <div class="cart-card-meta">

Quantity:

<div class="qty-control">

<button
onclick="
event.stopPropagation();
decreaseCartQty(${index})
">

-

</button>

<span class="qty-number">

${item.quantity}

</span>

<button
onclick="
event.stopPropagation();
increaseCartQty(${index})
">

+

</button>

</div>

</div>

    <div class="cart-card-meta">
        Total:
        ₦${itemLineTotal.toLocaleString()}
    </div>

    ${editMode ? `
<div class="cart-update-overlay">

    <div class="update-selector">

        ${
            selectedIndex === index
            ?
            `<i class="fa-solid fa-circle-check"></i>`
            :
            `<i class="fa-regular fa-circle"></i>`
        }

    </div>

</div>
` : ""}

    <div class="cart-card-actions">

        <button
        class="clear-cart-btn"
        onclick="
        removeLineItem(${index})
        ">
            Remove
        </button>

    </div>

</div>
`;

if(editMode){

    const selector =
    card.querySelector(".update-selector");

    selector.addEventListener("click",(e)=>{

        e.stopPropagation();

        selectedIndex = index;

        renderTabularCart();

    });

}

cartItemsContainer.appendChild(card);

    });

    subtotalLabel.innerText =
    `₦${calculatedGrossTotal.toLocaleString()}`;
}

    window.modifyLineQuantity =
async function(index,newQty){

    const qty =
    Number(newQty);

    if(isNaN(qty)) return;

    if(qty < 1) return;

    await updateDoc(

        doc(
            db,
            "users",
            auth.currentUser.uid,
            "cart",
            firestoreCart[index].firestoreId
        ),

        {
            quantity: qty
        }

    );

    renderTabularCart();

};

window.increaseCartQty =
async function(index){

    const item =
    firestoreCart[index];

    await modifyLineQuantity(
        index,
        item.quantity + 1
    );

};

window.decreaseCartQty =
async function(index){

    const item =
    firestoreCart[index];

    if(item.quantity <= 1){

        return;

    }

    await modifyLineQuantity(
        index,
        item.quantity - 1
    );

};

    window.removeLineItem =
function(index){

    showConfirmModal(
        "Remove this item from your bag?",
        async ()=>{

            await deleteDoc(
    doc(
        db,
        "users",
        auth.currentUser.uid,
        "cart",
        firestoreCart[index].firestoreId
    )
);

            showToast("Item removed.");

            renderTabularCart();

        }
    );

};

    // Route handlers for your three control actions buttons
    window.actionContinueShopping = function() { window.location.href = "/"; };
    // Look at your action button methods inside public/js/cart.js
    
        window.actionUpdateCartRedirect =
function() {

    if(firestoreCart.length === 0){
    return;
}

    if(!editMode){

    editMode = true;

    selectedIndex = null;

    document.getElementById(
    "update-mode-message"
    ).style.display = "block";

    renderTabularCart();

    return;
}

    if(selectedIndex === null){

        showToast(
        "Please select a product."
        );

        return;
    }

    window.location.href =
`/decision-page.html?id=${firestoreCart[selectedIndex].productId}&cartDocId=${firestoreCart[selectedIndex].firestoreId}`;

};


window.clearCart =
function(){

    showConfirmModal(
        "Clear your entire shopping bag?",
        async ()=>{

            await backupCurrentCart();

            for(const item of firestoreCart){

                await deleteDoc(

                    doc(
                        db,
                        "users",
                        auth.currentUser.uid,
                        "cart",
                        item.firestoreId
                    )

                );

            }

            renderTabularCart();

            showToast("Cart cleared.");

        }
    );

};

    window.actionProceedCheckout = function() {

    if (firestoreCart.length === 0) {

        showToast(
            "Your shopping bag is empty."
        );

        return;
    }

    if (!auth.currentUser) {

        sessionStorage.setItem(
            "redirectAfterLogin",
            "/checkout"
        );

        window.location.href = "/login";

        return;
    }

    window.location.href = "/checkout";
};

    onAuthStateChanged(auth,(user)=>{

    if(user){

        renderTabularCart();

    }

});

const restoreBtn =
document.getElementById(
    "restore-cart-btn"
);

if(restoreBtn){

restoreBtn.addEventListener(
"click",
async ()=>{

    const range =
    document.getElementById(
        "restore-range"
    ).value;

    const backupsSnap =
    await getDocs(
        collection(
            db,
            "users",
            auth.currentUser.uid,
            "cart_backups"
        )
    );

    let backups = [];

    backupsSnap.forEach(docSnap=>{

        backups.push(docSnap.data());

    });

    const now = Date.now();

    backups = backups.filter(backup=>{

        if(range === "all"){

            return true;

        }

        const hours =
        Number(range);

        return (
            now - backup.createdAt
        )

        <=

        hours * 60 * 60 * 1000;

    });

    if(backups.length === 0){

        showToast(
            "No cart backups found."
        );

        return;
    }

    backups.sort(
        (a,b)=>
        b.createdAt - a.createdAt
    );

    const latestBackup =
    backups[0];

    for(const item of latestBackup.items){

        await addDoc(

            collection(
                db,
                "users",
                auth.currentUser.uid,
                "cart"
            ),

            {

                productId:item.productId,

                title:item.title,

                image:item.image,

                price:item.price,

                quantity:item.quantity,

                size:item.size,

                color:item.color

            }

        );

    }

    showToast(
        "Cart restored."
    );

    renderTabularCart();

});
}
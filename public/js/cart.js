    import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
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
            <tr>
                <td colspan="5"
                    style="
                        padding:40px;
                        text-align:center;
                    ">
                    Your shopping bag is empty.
                </td>
            </tr>
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

        const row =
        document.createElement("tr");

        row.className = `
            cart-table-row
            ${editMode ? "cart-edit-mode" : ""}
            ${
                selectedIndex === index
                ? "selected"
                : ""
            }
        `;

        row.innerHTML = `
<td class="product-col">

<img
src="${item.image}"
class="table-cart-img">

<div class="table-product-details">

<span class="table-item-title">
${item.title}
</span>

<span class="table-item-variant-label">
Size: ${item.size}
</span>

<span class="table-item-variant-label">
Color: ${item.color}
</span>

<button
class="table-remove-item-btn"
onclick="removeLineItem(${index})">

Remove

</button>

</div>

</td>

<td class="price-col">
₦${item.price.toLocaleString()}
</td>

<td class="quantity-col">

<input
type="number"
min="1"
value="${item.quantity}"
class="table-qty-input"
onchange="
modifyLineQuantity(
${index},
this.value
)">

</td>

<td class="total-col">
₦${itemLineTotal.toLocaleString()}
</td>

${
editMode
?
`
<td class="selector-col">

<input
type="radio"
name="edit-selection"
class="cart-update-selector"

${
selectedIndex===index
?
"checked"
:
""
}>

</td>
`
:
""
}
`;

        if(editMode){

    row.addEventListener("click",(e)=>{

        if(
            e.target.tagName === "INPUT" ||
            e.target.tagName === "BUTTON"
        ){
            return;
        }

        selectedIndex = index;

        renderTabularCart();

    });

}

        cartItemsContainer.appendChild(row);

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

    window.removeLineItem =
async function(index){

    await deleteDoc(

        doc(
            db,
            "users",
            auth.currentUser.uid,
            "cart",
            firestoreCart[index].firestoreId
        )

    );

    renderTabularCart();

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

document.getElementById(
"update-mode-message"
).style.display = "block";

        renderTabularCart();

        return;
    }

    if(selectedIndex === null){

        alert(
        "Please select a product."
        );

        return;
    }

    window.location.href =
`/decision-page.html?id=${firestoreCart[selectedIndex].productId}&cartDocId=${firestoreCart[selectedIndex].firestoreId}`;

};


window.clearCart =
async function(){

    if(
        !confirm(
            "Clear all items from cart?"
        )
    ){
        return;
    }

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

};

    window.actionProceedCheckout = function() { window.location.href = "/checkout"; };

    onAuthStateChanged(auth,(user)=>{

    if(user){

        renderTabularCart();

    }

});

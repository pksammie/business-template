import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    deleteDoc
}
from
"https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const orderSummaryWrapper = document.getElementById('checkout-summary-target');
const checkoutFormInstance = document.getElementById('shipping-address-capture-form');

// Admin Phone Variable Setup (Format: Country code first, no spaces or special symbols)
const ADMIN_WHATSAPP_NUMBER = "2348109007611"; 

async function renderCheckoutOverview() {
    const user = auth.currentUser;

if (!user) {
    orderSummaryWrapper.innerHTML =
    "<p>Please login first.</p>";
    return;
}

const cartSnap = await getDocs(
    collection(
        db,
        "users",
        user.uid,
        "cart"
    )
);

const cart = [];

cartSnap.forEach(docSnap => {

    cart.push({
        cartDocId: docSnap.id,
        ...docSnap.data()
    });

});
    if (!orderSummaryWrapper) return;

    if (cart.length === 0) {
        orderSummaryWrapper.innerHTML = `<p>No inventory instances queued for parsing.</p>`;
        return;
    }

    orderSummaryWrapper.innerHTML = "";
    let overallCostSum = 0;

    cart.forEach(item => {
        const subSum = item.price * item.quantity;
        overallCostSum += subSum;

        const blockSummaryRow = document.createElement('div');
        blockSummaryRow.className = 'checkout-summary-item-row';
        blockSummaryRow.innerHTML = `
            <div style="display:flex; gap:15px; margin-bottom:15px; align-items:center;">
                <div style="position:relative;">
                    <img src="${item.image}" style="width:65px; height:75px; object-fit:cover; border-radius:4px;">
                    <span style="position:absolute; top:-8px; right:-8px; background:#c5a880; color:#000; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:50%;">${item.quantity}</span>
                </div>
                <div>
                    <h4 style="margin:0; font-size:14px; font-weight:500;">${item.title}</h4>
                    <small style="color:#c5a880;">Size: ${item.size}</small>
                    <br>
                    <small style="color:#c5a880;">colour: ${item.color}</small>
                </div>
            </div>
            <div style="font-weight:600;">₦${subSum.toLocaleString()}</div>
        `;
        orderSummaryWrapper.appendChild(blockSummaryRow);
    });

    // Subtotal output layer creation block
    const summaryTotalFooterBlock = document.createElement('div');
    summaryTotalFooterBlock.className = 'summary-total-footer';
    summaryTotalFooterBlock.style = "border-top:1px solid #1f2833; padding-top:20px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;";
    summaryTotalFooterBlock.innerHTML = `
        <span style="font-size:18px;">Subtotal Amount Due</span>
        <span style="font-size:22px; font-weight:700; color:#c5a880;">₦${overallCostSum.toLocaleString()}</span>
    `;
    orderSummaryWrapper.appendChild(summaryTotalFooterBlock);
}

// Prefill form values if persistence checkbox data was saved from a past session
function prefillSavedUserAddressMetadata() {
    const cachedAddress = JSON.parse(localStorage.getItem('vanguard_saved_customer_profile'));
    if (cachedAddress && checkoutFormInstance) {
        checkoutFormInstance.elements['country'].value = cachedAddress.country || '';
        checkoutFormInstance.elements['first_name'].value = cachedAddress.first_name || '';
        checkoutFormInstance.elements['last_name'].value = cachedAddress.last_name || '';
        checkoutFormInstance.elements['address'].value = cachedAddress.address || '';
        checkoutFormInstance.elements['city'].value = cachedAddress.city || '';
        checkoutFormInstance.elements['state'].value = cachedAddress.state || '';
        checkoutFormInstance.elements['phone'].value = cachedAddress.phone || '';
        checkoutFormInstance.elements['save_info'].checked = true;
    }
}

// Compile all user info and launch the formatted WhatsApp message
window.executeOrderCompilationPipeline = async function(event) {
    event.preventDefault();
    
    const user = auth.currentUser;

if (!user) {

    showToast("Please login.");

    return;
}

const cartSnap = await getDocs(
    collection(
        db,
        "users",
        user.uid,
        "cart"
    )
);

const cart = [];

cartSnap.forEach(docSnap => {

    cart.push({
        cartDocId: docSnap.id,
        ...docSnap.data()
    });

});
    if (cart.length === 0) {
        showToast("Your cart is empty. Cannot process checkout compilation pipeline.");
        return;
    }

    const f = checkoutFormInstance.elements;
    const addressProfile = {
        country: f['country'].value,
        first_name: f['first_name'].value,
        last_name: f['last_name'].value,
        address: f['address'].value,
        city: f['city'].value,
        state: f['state'].value,
        phone: f['phone'].value
    };

    /* VERIFY STOCK BEFORE CHECKOUT */

for (const item of cart) {

    const productSnap = await getDoc(
        doc(db, "products", item.productId)
    );

    if (!productSnap.exists()) {

        showToast(
            `${item.title} no longer exists.`
        );

        return;
    }

    const productData = productSnap.data();

    const remaining =
        (productData.quantity || 0)
        -
        (productData.sold || 0);

    if (item.quantity > remaining) {

        showToast(
            `Sorry, only ${remaining} of ${item.title} remain in stock.`
        );

        return;
    }
}

    // Save profile to LocalStorage if check option is ticked
    if (f['save_info'].checked) {

    localStorage.setItem(
      'vanguard_saved_customer_profile',
      JSON.stringify(addressProfile)
    );

}

for (const item of cart) {

    await addDoc(
    collection(
        db,
        "cart_reservations"
    ),
    {

        productId: item.productId,

        productTitle: item.title,

        customerName:
        `${addressProfile.first_name}
        ${addressProfile.last_name}`,

        phone:
        addressProfile.phone,

        quantity:
        item.quantity,

        price:
        item.price,

        total:
        item.price * item.quantity,

        paid: false,

        stockDeducted: false,

        createdAt:
        Date.now()
    }
);

} 

    // --- WHATSAPP ORDER COMPILER STRING BUILDER ---
    let messageText = `*NEW INCOMING ORDER - TIME-LESS* \n\n`;
    messageText += `*CUSTOMER DETAILS:*\n\n`;
    messageText += `*Name:* ${addressProfile.first_name} ${addressProfile.last_name}\n`;
    messageText += `*Phone:* ${addressProfile.phone}\n`;
    messageText += `*Address:* ${addressProfile.address}, ${addressProfile.city}, ${addressProfile.state}, ${addressProfile.country}\n\n`;
    
    messageText += `*ORDER ITEMS RECAP:* \n\n`;
    
    let subtotalValueAmount = 0;
    cart.forEach((item, index) => {
        const itemCost = item.price * item.quantity;
        subtotalValueAmount += itemCost;
        messageText +=`${index + 1}. *${item.title}*\n`;
        messageText +=`[Size: ${item.size}  |  Qty: ${item.quantity}  |  Colour: ${item.color}  |  Price: ₦${itemCost.toLocaleString()}]\n\n`;
        messageText += `  _Image Link:_ ${item.image}\n\n`;
    });

    messageText += `───────────────────\n`;
    messageText += `*ORDER ITEM TOTAL:* ₦${subtotalValueAmount.toLocaleString()}\n`;
    messageText += `_Note: Shipping fee will be calculated based on the address provided above._`;

    // URI encode the compiled text block safely
    const customEncodedUriString = encodeURIComponent(messageText);
    const destinationWhatsAppUrlEndpoint =`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${customEncodedUriString}`;

    // Clear out cart bag arrays to complete transaction safely
    for (const item of cart) {

    await deleteDoc(
        doc(
            db,
            "users",
            user.uid,
            "cart",
            item.cartDocId
        )
    );

}

showToast(
    "Order compiled successfully. You will now be redirected to WhatsApp."
);

window.open(
    destinationWhatsAppUrlEndpoint,
    "_blank"
);

location.href = "/";
};

import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

    prefillSavedUserAddressMetadata();

    if (checkoutFormInstance) {

        checkoutFormInstance.addEventListener(
            "submit",
            executeOrderCompilationPipeline
        );
    }

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            sessionStorage.setItem(
                "redirectAfterLogin",
                "/checkout"
            );

            location.href = "/login";

            return;
        }

        await renderCheckoutOverview();

    });

});
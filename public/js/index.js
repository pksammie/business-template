// At the absolute top of public/js/index.js (Line 1 or 2)
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {

    if (!user) {
        if (cartCountBadge) cartCountBadge.innerText = "0";
        return;
    }

    const cart = JSON.parse(localStorage.getItem('vanguard_cart')) || [];
    if (cartCountBadge) cartCountBadge.innerText = cart.length;

});

const productsGrid = document.getElementById('products-grid');
const cartCountBadge = document.getElementById('cart-count');

const toggle =
document.querySelector(
".menu-toggle"
);

const menu =
document.querySelector(
".nav-left-menu"
);

if (
toggle &&
menu
) {

toggle.addEventListener(
"click",
() => {

menu.classList.toggle(
"active"
);

});

}
async function loadStorefrontGrid() {
    if (!productsGrid) return;
    productsGrid.innerHTML = `<p style="color: var(--primary-color); text-align:center;">Loading luxury catalog...</p>`;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productsGrid.innerHTML = ""; 

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const productId = docSnap.id;

            // ABSOLUTE SAFEGUARDFALLBACKS: If a field is missing, fill it in to prevent crashes
            const title = product.title || "Bespoke Apparel Item";
            const price = product.price ? Number(product.price) : 0;
            const image = product.image || "https://unsplash.com";
            const isSuspended = product.isSuspended || false; // Defaults to false if completely missing

            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.position = "relative";

            let suspensionMaskOverlay = "";
            let actionButtonElement = `
                <button class="add-to-cart-btn" onclick="window.location.href='/decision-page.html?id=${productId}'">
                    <i class="fa-solid fa-eye"></i> View Product
                </button>
            `;

            if (isSuspended) {
                suspensionMaskOverlay = `
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10; display:flex; justify-content:center; align-items:center; text-align:center; padding:15px; border-radius:8px;">
                        <div style="width:140px; height:140px; border:2px dashed #ff4d4d; border-radius:50%; display:flex; justify-content:center; align-items:center; color:#ff4d4d; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; line-height:1.4; background:#000;">
                            Post Has Been<br>Suspended
                        </div>
                    </div>
                `;
                actionButtonElement = `
                    <button class="add-to-cart-btn" style="background:#333; color:#777; cursor:not-allowed;" disabled>
                        Unavailable
                    </button>
                `;
            }

            card.innerHTML = `
                ${suspensionMaskOverlay}
                <img src="${image}" alt="${title}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${title}</h3>
                    <div class="product-price">₦${price.toLocaleString()}</div>
                    ${actionButtonElement}
                </div>
            `;
            productsGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Database initialization block handled:", error);
        productsGrid.innerHTML = `<p style="color: #ff4d4d; text-align:center;">Database loading issue. Check console metrics logs.</p>`;
    }
}

async function initStorefront() {
    await loadStorefrontGrid();

    const cart = JSON.parse(localStorage.getItem('vanguard_cart')) || [];
    if (cartCountBadge) cartCountBadge.innerText = cart.length;
}

// run immediately (module scripts already wait for DOM)
initStorefront();
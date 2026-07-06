let allProducts = [];

import { db, auth } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    where,
    limit,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const productsGrid =
document.getElementById("products-grid");

const cartCountBadge =
document.getElementById("cart-count");

const searchInput =
document.getElementById("search-input");

/* ---------------- HOMEPAGE FEATURED REVIEW CAROUSEL ---------------- */
/* Single source of truth: shows the latest FEATURED reviews only.
   (See loadHomepageReviews() / renderHomepageReviews() further below,
   which target the actual #homepage-review-carousel element in index.html) */

/* ---------------- MOBILE MENU ---------------- */

const toggle =
document.querySelector(".menu-toggle");

const menu =
document.querySelector(".nav-left-menu");

if (toggle && menu) {

    toggle.addEventListener("click", () => {

        menu.classList.toggle("active");

    });

}

function generateStars(rating){

    let stars = "";

    const rounded =
    Math.round(rating);

    for(let i=1;i<=5;i++){

        stars +=
        i <= rounded
        ? "★"
        : "☆";

    }

    return stars;

}

/* ---------------- RENDER PRODUCTS ---------------- */

function renderProducts(products) {

    if (!productsGrid) return;

    productsGrid.innerHTML = "";

    if (products.length === 0) {

        productsGrid.innerHTML = `
            <p style="
                color:var(--primary-color);
                text-align:center;
                width:100%;
            ">
                No products found.
            </p>
        `;

        return;
    }

    products.forEach((product) => {

        const productId = product.id;

        const title =
            product.title ||
            "Bespoke Apparel Item";

        const price =
            product.price
                ? Number(product.price)
                : 0;

        const productImages =
    Array.isArray(product.images) &&
    product.images.length > 0
        ? product.images
        : [product.image];

const image =
    productImages[0] ||
    "https://via.placeholder.com/600x600?text=No+Image";

        const stock = product.stock || {};

const remainingStock =
Object.values(stock).reduce(
(total, qty) => total + (qty || 0),
0
);

const isOutOfStock =
remainingStock <= 0;

const isSuspended =
    product.isSuspended;

        const card =
document.createElement("div");

card.className = "product-card";

card.style.position = "relative";

if (!isSuspended) {

    card.style.cursor = "pointer";

    card.onclick = () => {

        window.location.href =
        `/decision-page.html?id=${productId}`;

    };

}

        let suspensionMaskOverlay = "";

        let actionButtonElement = `
    <button
        class="add-to-cart-btn"
    >
        <i class="fa-solid fa-eye"></i>
        View Product
    </button>
`;

        if (isSuspended || isOutOfStock) {

    const overlayText =
        isOutOfStock
            ? "Out Of<br>Stock"
            : "Post Has Been<br>Suspended";

    suspensionMaskOverlay = `
        <div style="
            position:absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            background:rgba(0,0,0,0.85);
            z-index:10;
            display:flex;
            justify-content:center;
            align-items:center;
            text-align:center;
            padding:15px;
            border-radius:8px;
        ">
            <div style="
                width:140px;
                height:140px;
                border:2px dashed #ff4d4d;
                border-radius:50%;
                display:flex;
                justify-content:center;
                align-items:center;
                color:#ff4d4d;
                font-size:12px;
                font-weight:bold;
                text-transform:uppercase;
                letter-spacing:1px;
                line-height:1.4;
                background:#000;
            ">
                ${overlayText}
            </div>
        </div>
    `;

    actionButtonElement = `
        <button
            class="add-to-cart-btn"
            style="
                background:#333;
                color:#777;
                cursor:not-allowed;
            "
            disabled
        >
            ${isOutOfStock ? "Out of Stock" : "Unavailable"}
        </button>
    `;
}

        let stockColor = "lime";
let stockText = `${remainingStock} left in stock`;

if(remainingStock <= 0){

    stockColor = "#ff4d4d";
    stockText = "Out of stock";

}
else if(remainingStock <= 3){

    stockColor = "#ffae00";
    stockText = `Only ${remainingStock} left`;

}

        card.innerHTML = `
            ${suspensionMaskOverlay}

            <div class="product-image-container">

    <img
        src="${image}"
        alt="${title}"
        class="product-image"
    >

    ${
        productImages.length > 1
        ? `
        <div class="image-count-badge">
            1 / ${productImages.length}
        </div>
        `
        : ""
    }

</div>

            <div class="product-info">

                <h3 class="product-title">
                    ${title}
                </h3>

                <div class="product-rating">

    <span class="rating-stars">

        ${generateStars(
    product.averageRating || 0
)}
        
    </span>

    <span class="rating-count">

        (${product.reviewCount || 0})

    </span>

</div>
<br>
                <p class="stock-left" style="
    color:${stockColor};
    margin-bottom:10px;
    font-weight:600;
">
    ${stockText}
</p>

                <div class="product-price">
                    ₦${price.toLocaleString()}
                </div>

                ${actionButtonElement}

            </div>
        `;

        productsGrid.appendChild(card);

    });

}

/* ---------------- LOAD PRODUCTS ---------------- */

async function loadStorefrontGrid() {

    if (!productsGrid) return;

    productsGrid.innerHTML = `
        <p style="
            color:var(--primary-color);
            text-align:center;
        ">
            Loading luxury catalog...
        </p>
    `;

    try {

    const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {

        allProducts = [];

        snap.forEach((docSnap) => {

            allProducts.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        renderProducts(allProducts);

    });

}

    catch (error) {

        console.error(error);

        productsGrid.innerHTML = `
            <p style="
                color:#ff4d4d;
                text-align:center;
            ">
                Database loading issue.
            </p>
        `;

    }

}

/* ---------------- SEARCH ---------------- */

if (searchInput) {

    searchInput.addEventListener("input", (e) => {

        const term =
            e.target.value.toLowerCase();

        const filteredProducts =
            allProducts.filter(product => {

                return (
                    product.title || ""
                )
                .toLowerCase()
                .includes(term);

            });

        renderProducts(filteredProducts);

    });

}

let homepageReviews = [];
let reviewPointer = 0;
let reviewRotationTimer = null;

function loadHomepageReviews(){

    const carousel =
    document.getElementById("homepage-review-carousel");

    if(!carousel) return;

    /* Latest FEATURED reviews only (per spec), newest first */
    const q = query(
        collection(db,"reviews"),
        where("featured","==",true),
        orderBy("createdAt","desc"),
        limit(20)
    );

    onSnapshot(q,(snapshot)=>{

        homepageReviews = [];

        snapshot.forEach(docSnap=>{
            homepageReviews.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        reviewPointer = 0;

        if(homepageReviews.length===0){
            carousel.innerHTML = `<p class="no-review-message">No featured reviews yet.</p>`;
            return;
        }

        renderHomepageReviews();

    });

}

function renderHomepageReviews() {

    const carousel =
    document.getElementById("homepage-review-carousel");

    if (!carousel || homepageReviews.length === 0) return;

    carousel.innerHTML = "";

    const sortedReviews = [...homepageReviews].sort((a,b)=>

        (b.likes || b.helpfulCount || 0) -

        (a.likes || a.helpfulCount || 0)

    );

    const visible = Math.min(3, sortedReviews.length);

    for(let i=0;i<visible;i++){

        const review =
        sortedReviews[
            (reviewPointer+i)%sortedReviews.length
        ];

        const card =
        document.createElement("div");

        card.className =
        "homepage-review-card";

        card.innerHTML = `

<div class="homepage-review-top">

    <div class="homepage-stars">

        ${generateStars(review.rating||0)}

    </div>

    <div class="homepage-helpful">

        <i class="fa-solid fa-heart"></i>

        ${review.likes || review.helpfulCount || 0}

    </div>

</div>

<div class="homepage-review-product">

<img
src="${review.productImage || "/images/placeholder.jpg"}"
alt="Product">

</div>

<p class="homepage-review-text">

"${review.reviewText || ""}"

</p>

<div class="homepage-review-footer">

<h4>

${review.customerName || "Verified Customer"}

</h4>

<span>

Purchased

<strong>

${review.productTitle || "Luxury Product"}

</strong>

</span>

</div>

`;

        carousel.appendChild(card);

    }

}

function startHomepageReviewRotation(){

    if(reviewRotationTimer) return; /* never stack duplicate intervals */

    reviewRotationTimer = setInterval(()=>{

        if(homepageReviews.length<=3) return;

        reviewPointer++;

        if(reviewPointer>=homepageReviews.length) reviewPointer = 0;

        renderHomepageReviews();

    },6000);

}

/* ---------------- INIT ---------------- */

async function initStorefront(){

    await loadStorefrontGrid();

    loadHomepageReviews();

    startHomepageReviewRotation();

}

initStorefront();

window.addEventListener("load", () => {

    const loader =
    document.getElementById("admin-loading-screen");

    if (!loader) return;

    const alreadyShown =
    sessionStorage.getItem("vanguardLoader");

    if (alreadyShown) {

        loader.remove();
        return;

    }

    sessionStorage.setItem(
        "vanguardLoader",
        "true"
    );

    setTimeout(() => {

        loader.style.transition =
        "opacity .8s ease";

        loader.style.opacity = "0";

        setTimeout(() => {

            loader.remove();

        }, 800);

    }, 2200);

});
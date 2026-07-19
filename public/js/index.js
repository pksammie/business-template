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

import { createDropdown } from "./timeless-dropdown.js";

const productsGrid =
document.getElementById("products-grid");

const cartCountBadge =
document.getElementById("cart-count");

const searchInput =
document.getElementById("search-input");

const categoryFilterBar =
document.getElementById("category-filter-bar");

const sortSelectMount =
document.getElementById("sort-select-mount");

let activeCategory = "All";
let activeSort = "newest";

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

const hasSizes =
Array.isArray(product.sizes) &&
!product.sizes.includes("None");

const remainingStock = hasSizes
? Object.values(stock).reduce(
(total, qty) => total + (qty || 0),
0
)
: null;

const isOutOfStock =
remainingStock !== null && remainingStock <= 0;

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
let stockText = remainingStock === null
    ? "In stock"
    : `${remainingStock} left in stock`;

if(remainingStock !== null && remainingStock <= 0){

    stockColor = "#ff4d4d";
    stockText = "Out of stock";

}
else if(remainingStock !== null && remainingStock <= 3){

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

        applyFiltersAndRender();

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

/* ---------------- SEARCH + CATEGORY + SORT ---------------- */

function applyFiltersAndRender() {

    const term =
        (searchInput?.value || "").toLowerCase();

    let filtered =
        allProducts.filter(product => {

            const matchesSearch =
                (product.title || "")
                    .toLowerCase()
                    .includes(term);

            const matchesCategory =
                activeCategory === "All" ||
                product.category === activeCategory;

            return matchesSearch && matchesCategory;

        });

    if (activeSort === "price-asc") {

        filtered = [...filtered].sort(
            (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)
        );

    } else if (activeSort === "price-desc") {

        filtered = [...filtered].sort(
            (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
        );

    }
    // "newest" needs no re-sort -- allProducts already comes back
    // ordered by createdAt desc straight from the Firestore query.

    renderProducts(filtered);

}

if (searchInput) {

    searchInput.addEventListener("input", applyFiltersAndRender);

}

if (categoryFilterBar) {

    categoryFilterBar.addEventListener("click", (e) => {

        const pill = e.target.closest(".category-pill");

        if (!pill) return;

        categoryFilterBar
            .querySelectorAll(".category-pill")
            .forEach(p => p.classList.remove("active"));

        pill.classList.add("active");

        activeCategory = pill.dataset.category;

        applyFiltersAndRender();

    });

}

if (sortSelectMount) {

    createDropdown({
        container: sortSelectMount,
        options: [
            { value: "newest", label: "Newest First" },
            { value: "price-asc", label: "Price: Low to High" },
            { value: "price-desc", label: "Price: High to Low" },
        ],
        value: activeSort,
        onChange: (value) => {
            activeSort = value;
            applyFiltersAndRender();
        },
    });

}

let homepageReviews = [];
let reviewIndex = 1;
let reviewTimer = null;
let isDragging = false;
let startX = 0;
let currentTranslate = 0;
let prevTranslate = 0;


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

        reviewIndex = 1;

        if(homepageReviews.length===0){
            carousel.innerHTML = `<p class="no-review-message">No featured reviews yet.</p>`;
            return;
        }

        renderHomepageReviews();

    });

}

function renderHomepageReviews() {

    const carousel = document.getElementById("homepage-review-carousel");

    if (!carousel) return;

    if (homepageReviews.length === 0) {

        carousel.innerHTML =
        `<p class="no-review-message">No featured reviews yet.</p>`;

        return;

    }

    const reviews = [...homepageReviews];

    const firstClone = reviews[0];
    const lastClone = reviews[reviews.length - 1];

    const slides = [lastClone, ...reviews, firstClone];

    carousel.innerHTML = `
        <div class="homepage-review-track"></div>
    `;

    const track = carousel.querySelector(".homepage-review-track");

    slides.forEach(review => {

        const card = document.createElement("div");

        card.className = "homepage-review-card";

        card.innerHTML = `

<div class="homepage-review-top">

<div class="homepage-stars">

${generateStars(review.rating||0)}

</div>

<div class="homepage-helpful">

<i class="fa-solid fa-heart"></i>

${review.likes || 0}

</div>

</div>

<div class="homepage-review-product">

<img src="${review.productImage}">

</div>

<p class="homepage-review-text">

"${review.reviewText}"

</p>

<div class="homepage-review-footer">

<h4>

${review.customerName}

</h4>

<span>

✔ Verified Purchase

</span>

${
review.adminReply
?
`<div class="homepage-admin-reply">

<strong>Admin</strong>

<p>${review.adminReply}</p>

</div>`
:
""
}

</div>
`;

        track.appendChild(card);

    });

    let cardWidth =
track.querySelector(".homepage-review-card").offsetWidth + 25;

    track.style.transition = "none";

    track.style.transform =
`translateX(-${cardWidth}px)`;

    reviewIndex = 1;

    prevTranslate = -cardWidth;

    currentTranslate = prevTranslate;

    requestAnimationFrame(()=>{

        track.style.transition =
"transform .6s ease";

    });

    clearInterval(reviewTimer);

    reviewTimer = setInterval(()=>{

        if(isDragging) return;

        reviewIndex++;

        moveCarousel();

    },5000);

    track.onmouseenter = ()=>clearInterval(reviewTimer);

    track.onmouseleave = ()=>{

        clearInterval(reviewTimer);

        reviewTimer = setInterval(()=>{

            if(isDragging) return;

            reviewIndex++;

            moveCarousel();

        },5000);

    };

    track.addEventListener("transitionend",()=>{

        if(reviewIndex===0){

            track.style.transition="none";

            reviewIndex=reviews.length;

            track.style.transform=
`translateX(-${cardWidth*reviewIndex}px)`;

        }

        if(reviewIndex===reviews.length+1){

            track.style.transition="none";

            reviewIndex=1;

            track.style.transform=
`translateX(-${cardWidth}px)`;

        }

    });

    window.onresize = () => {

        const liveCard =
            track.querySelector(".homepage-review-card");

        if (!liveCard) return;

        cardWidth = liveCard.offsetWidth + 25;

        track.style.transition = "none";

        currentTranslate = -(cardWidth * reviewIndex);
        prevTranslate = currentTranslate;

        track.style.transform =
            `translateX(${currentTranslate}px)`;
    };

    function moveCarousel(){

        track.style.transition="transform .6s ease";

        currentTranslate=
-(cardWidth*reviewIndex);

        prevTranslate=currentTranslate;

        track.style.transform=
`translateX(${currentTranslate}px)`;

    }

    /* desktop drag */

    track.onmousedown=(e)=>{

        isDragging=true;

        startX=e.clientX;

        track.style.transition="none";

    };

    window.onmousemove=(e)=>{

        if(!isDragging) return;

        const delta=e.clientX-startX;

        track.style.transform=
`translateX(${prevTranslate+delta}px)`;

    };

    window.onmouseup=(e)=>{

        if(!isDragging) return;

        isDragging=false;

        const moved=e.clientX-startX;

        if(moved<-80){

            reviewIndex++;

        }

        else if(moved>80){

            reviewIndex--;

        }

        moveCarousel();

    };

    /* mobile swipe */

    track.addEventListener("touchstart",(e)=>{

        isDragging=true;

        startX=e.touches[0].clientX;

        track.style.transition="none";

    });

    track.addEventListener("touchmove",(e)=>{

        if(!isDragging) return;

        const delta=e.touches[0].clientX-startX;

        track.style.transform=
`translateX(${prevTranslate+delta}px)`;

    });

    track.addEventListener("touchend",(e)=>{

        isDragging=false;

        const end=e.changedTouches[0].clientX;

        const moved=end-startX;

        if(moved<-80){

            reviewIndex++;

        }

        else if(moved>80){

            reviewIndex--;

        }

        moveCarousel();

    });

}

/* ---------------- SCROLL REVEAL ---------------- */

const revealTargets = document.querySelectorAll(".reveal");

if (revealTargets.length) {

    const revealObserver = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("active");

                revealObserver.unobserve(entry.target);

            }

        });

    }, { threshold: 0.15 });

    revealTargets.forEach(target => revealObserver.observe(target));

}

/* ---------------- INIT ---------------- */

async function initStorefront(){

    await loadStorefrontGrid();

    loadHomepageReviews();

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
        document.body.classList.remove("scroll-locked");
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

        document.body.classList.remove("scroll-locked");

        setTimeout(() => {

            loader.remove();

        }, 800);

    }, 2200);

});
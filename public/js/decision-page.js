import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const cartDocId = params.get("cartDocId");

let product = null;
let addingToCart = false;
let reviews = [];
let visibleReviews = 3;
let editingReviewId = null;

const sizeWrapper = document.getElementById("size-options-wrapper");
const colorWrapper = document.getElementById("color-options-wrapper");
const descriptionBox = document.getElementById("decision-description");

/* ── STAR RATING ───────────────────────────────────────── */

function generateStars(rating) {
  let stars = "";

  const full = Math.floor(rating);

  const half = rating - full >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= full) {
      stars += `<span class="star filled">★</span>`;
    } else if (i === full + 1 && half) {
      stars += `<span class="star half">★</span>`;
    } else {
      stars += `<span class="star empty">☆</span>`;
    }
  }

  return stars;
}

/* ── REVIEWS — LOAD ─────────────────────────────────────────── */
function loadReviews() {
  const container = document.getElementById("reviews-container");
  if (!container) return;

  const q = query(
    collection(db, "reviews"),
    where("productId", "==", id),
    orderBy("createdAt", "desc"),
  );

  onSnapshot(q, (snapshot) => {
    reviews = [];
    snapshot.forEach((d) => reviews.push({ id: d.id, ...d.data() }));

    reviews.sort((a, b) => {
      const scoreA = (a.likes || 0) * 1000000000 + (a.createdAt || 0);
      const scoreB = (b.likes || 0) * 1000000000 + (b.createdAt || 0);

      return scoreB - scoreA;
    });

    renderReviews();
  });
}

/* ── REVIEWS — RENDER ─────────────────────────────────────── */
function renderReviews() {
  const container = document.getElementById("reviews-container");
  if (!container) return;

  container.innerHTML = "";

  if (reviews.length === 0) {
    container.innerHTML = `<div class="no-review-card">No reviews yet. Be the first to review this product.</div>`;
    return;
  }

  const currentUser = auth.currentUser;

reviews.slice(0, visibleReviews).forEach((review, idx) => {

    const card = document.createElement("div");

    card.className = "review-card";

    const isOwner = currentUser && currentUser.uid === review.userId;
    card.style.animationDelay = `${idx * 0.07}s`;

    const verifiedPurchase = review.verifiedPurchase === true;

const liked =
    currentUser &&
    (review.likedBy || []).includes(currentUser.uid);

const likeCount = review.likes || 0;

    card.innerHTML = `
      <div class="review-top-row">
        <div>
          <div class="review-stars">${generateStars(review.rating)}</div>
          <div class="review-name">${review.customerName || "Customer"}</div>
        </div>
        ${
          isOwner
            ? `
          <div class="review-menu-btn" onclick="toggleReviewMenu('${review.id}')">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </div>
          <div id="menu-${review.id}" class="review-menu" style="display:none;">
            <div onclick="openEditModal('${review.id}')">Edit</div>
            <div onclick="deleteReview('${review.id}')">Delete</div>
          </div>
        `
            : ""
        }
      </div>
      ${
        verifiedPurchase
          ? `
<div class="verified-badge">
✔ Verified Purchase
</div>
`
          : `
<div class="verified-badge fake">
Guest Review
</div>
`
      }
      <p class="review-body">${review.reviewText}</p>
            <div class="review-footer">
        <button
          class="review-like-btn ${liked ? "liked" : ""}"
          id="like-btn-${review.id}"
          onclick="toggleLike('${review.id}', this)"
        >
          <span class="heart-icon">❤</span>
          <span class="like-text">
            ${
              likeCount > 0
                ? `${likeCount} ${likeCount === 1 ? "person" : "people"} found this helpful`
                : "Helpful"
            }
          </span>
        </button>
      </div>

      ${
        review.adminReply
          ? `
      <div class="admin-review-reply">

          <div class="reply-header">
              Reply from Timeless
          </div>

          <div class="reply-body">
              ${review.adminReply}
          </div>

      </div>
      `
          : ""
      }

      ${review.edited ? `<div class="review-edited-label">Edited</div>` : ""}
`;
    
    container.appendChild(card);
  });

  if (visibleReviews < reviews.length) {
    const btn = document.createElement("button");
    btn.className = "see-more-reviews-btn";
    btn.textContent = "See More Reviews";
    btn.onclick = () => window.showMoreReviews();
    container.appendChild(btn);
  }
}

/* ── EDIT REVIEW MODAL ────────────────────────────────────── */
function injectEditModal() {
  if (document.getElementById("edit-review-modal")) return;
  const modal = document.createElement("div");
  modal.id = "edit-review-modal";
  modal.className = "edit-review-modal-overlay";
  modal.innerHTML = `
    <div class="edit-review-modal-box">
      <button class="close-edit-modal" onclick="closeEditModal()">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <h3>Edit Your Review</h3>
      <label style="font-size:13px;color:var(--text-muted);margin-bottom:6px;display:block;">Rating</label>
      <select id="edit-review-rating" class="edit-review-select">
        <option value="5">★★★★★ — Excellent</option>
        <option value="4">★★★★☆ — Good</option>
        <option value="3">★★★☆☆ — Average</option>
        <option value="2">★★☆☆☆ — Poor</option>
        <option value="1">★☆☆☆☆ — Terrible</option>
      </select>
      <label style="font-size:13px;color:var(--text-muted);margin-bottom:6px;display:block;">Your Review</label>
      <textarea id="edit-review-text" class="edit-review-textarea" placeholder="Update your review (min 20 characters)..." maxlength="1000"></textarea>
      <div class="edit-review-counter"><span id="edit-char-count">0</span>/1000</div>
      <button class="edit-review-submit-btn" onclick="submitEditReview()">Save Changes</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("edit-review-text").addEventListener("input", (e) => {
    document.getElementById("edit-char-count").textContent =
      e.target.value.length;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeEditModal();
  });
}

window.closeEditModal = function () {
  const m = document.getElementById("edit-review-modal");
  if (m) m.style.display = "none";
};

window.openEditModal = async function (reviewId) {
  injectEditModal();
  editingReviewId = reviewId;
  const snap = await getDoc(doc(db, "reviews", reviewId));
  const review = snap.data();
  document.getElementById("edit-review-rating").value = review.rating;
  document.getElementById("edit-review-text").value = review.reviewText;
  document.getElementById("edit-char-count").textContent =
    review.reviewText.length;
  document.getElementById("edit-review-modal").style.display = "flex";
  document
    .querySelectorAll(".review-menu")
    .forEach((m) => (m.style.display = "none"));
};

window.submitEditReview = async function () {
  const newText = document.getElementById("edit-review-text").value.trim();
  const newRating = Number(document.getElementById("edit-review-rating").value);
  if (newText.length < 20) {
    showToast("Review must be at least 20 characters.");
    return;
  }

  const btn = document.querySelector(".edit-review-submit-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const reviewSnap = await getDoc(doc(db, "reviews", editingReviewId));
    const oldReview = reviewSnap.data();

    await updateDoc(doc(db, "reviews", editingReviewId), {
      reviewText: newText,
      rating: newRating,
      edited: true,
    });

    /* recalculate product average */
    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);
    const pd = productSnap.data();
    const newTotal = (pd.totalRating || 0) - oldReview.rating + newRating;
    const newAverage = newTotal / (pd.reviewCount || 1);
    await updateDoc(productRef, {
      totalRating: newTotal,
      averageRating: newAverage,
    });

    showToast("Review updated.");
    closeEditModal();
    // await refreshProductRating();
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
};

/* ── LIKE ─────────────────────────────────────────────────── */
window.toggleLike = async function (reviewId, btn) {
  const user = auth.currentUser;
  if (!user) {
    showToast("Please login to like reviews.");
    return;
  }

  const reviewRef = doc(db, "reviews", reviewId);
  const review = reviews.find((r) => r.id === reviewId);
  if (!review) return;

  const alreadyLiked = (review.likedBy || []).includes(user.uid);

  if (!alreadyLiked) {
    btn.classList.add("liked");
    const heart = btn.querySelector(".heart-icon");
    heart.classList.add("heart-pop");
    heart.addEventListener(
      "animationend",
      () => heart.classList.remove("heart-pop"),
      { once: true },
    );
  } else {
    btn.classList.remove("liked");
  }

  const newLikes = alreadyLiked
    ? (review.likes || 1) - 1
    : (review.likes || 0) + 1;
  review.likes = newLikes;
  review.likedBy = alreadyLiked
    ? (review.likedBy || []).filter((u) => u !== user.uid)
    : [...(review.likedBy || []), user.uid];

  const likeTextEl = btn.querySelector(".like-text");
  if (likeTextEl) {
    likeTextEl.textContent =
      newLikes > 0
        ? `${newLikes} ${newLikes === 1 ? "person" : "people"} found this helpful`
        : "Helpful";
  }

  await updateDoc(reviewRef, {
    likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    likes: newLikes,
  });

  if (!alreadyLiked && review.userId && review.userId !== user.uid) {

    try {
      await addDoc(collection(db, "user_notifications"), {

        userId: review.userId,

        type: "review_liked",

        productId: review.productId || null,

        productTitle: review.productTitle || "your product",

        productImage: review.productImage || "",

        status: "Your Review Was Liked",

        message: `Someone found your review of "${review.productTitle || "a product"}" helpful.`,

        read: false,

        createdAt: serverTimestamp(),

      });
    } catch (err) {
      console.error(err);
    }

  }
};

/* ── TOGGLE REVIEW MENU ───────────────────────────────────── */
window.toggleReviewMenu = function (reviewId) {
  document.querySelectorAll(".review-menu").forEach((m) => {
    if (m.id !== "menu-" + reviewId) m.style.display = "none";
  });
  const menu = document.getElementById("menu-" + reviewId);
  if (menu)
    menu.style.display = menu.style.display === "block" ? "none" : "block";
};

document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".review-menu-btn") &&
    !e.target.closest(".review-menu")
  ) {
    document
      .querySelectorAll(".review-menu")
      .forEach((m) => (m.style.display = "none"));
  }
});

/* ── DELETE REVIEW ────────────────────────────────────────── */
window.deleteReview = function (reviewId) {
  showConfirmModal("Delete this review?", async () => {
    const reviewSnap = await getDoc(doc(db, "reviews", reviewId));
    if (!reviewSnap.exists()) return;

    const review = reviewSnap.data();
    await deleteDoc(doc(db, "reviews", reviewId));

    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);
    const pd = productSnap.data();
    const newCount = Math.max(0, (pd.reviewCount || 1) - 1);
    const newTotal = Math.max(0, (pd.totalRating || 0) - review.rating);
    const newAverage = newCount > 0 ? newTotal / newCount : 0;

    await updateDoc(productRef, {
      reviewCount: newCount,
      totalRating: newTotal,
      averageRating: newAverage,
    });
    // await refreshProductRating();
    showToast("Review deleted.");
  });
};

/* ── SHOW MORE ────────────────────────────────────────────── */
window.showMoreReviews = function () {
  visibleReviews += 3;
  renderReviews();
};

/* ===========================================================
   LUXURY PRODUCT GALLERY
=========================================================== */

const gallerySlider = document.getElementById("gallery-slider");
const galleryDots = document.getElementById("gallery-dots");
const galleryPrev = document.getElementById("gallery-prev");
const galleryNext = document.getElementById("gallery-next");

let galleryImages = [];
let currentImage = 0;

let autoSlide = null;
let startX = 0;
let currentTranslate = 0;
let isDragging = false;

function renderGallery() {
  gallerySlider.innerHTML = "";
  galleryDots.innerHTML = "";

  galleryImages.forEach((url, index) => {
    const img = document.createElement("img");

    img.src = url;

    img.className = "gallery-image";

    img.draggable = false;

    gallerySlider.appendChild(img);

    const dot = document.createElement("div");

    dot.className = "gallery-dot";

    if (index === currentImage) {
      dot.classList.add("active");
    }

    dot.onclick = () => {
      currentImage = index;

      updateGallery();

      restartAutoplay();
    };

    galleryDots.appendChild(dot);
  });

  updateGallery();
}

gallerySlider.addEventListener("mouseenter",stopAutoplay);

gallerySlider.addEventListener("mouseleave",startAutoplay);

window.addEventListener("keydown",(e)=>{

    if(e.key==="ArrowLeft"){

        prevImage();

        restartAutoplay();

    }

    if(e.key==="ArrowRight"){

        nextImage();

        restartAutoplay();

    }

});

function updateGallery() {
  gallerySlider.style.transform = `translateX(-${currentImage * 100}%)`;

  document.querySelectorAll(".gallery-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === currentImage);
  });
}

function nextImage() {
  currentImage++;

  if (currentImage >= galleryImages.length) {
    currentImage = 0;
  }

  updateGallery();
}

function prevImage() {
  currentImage--;

  if (currentImage < 0) {
    currentImage = galleryImages.length - 1;
  }

  updateGallery();
}

galleryNext.addEventListener("click", () => {
  nextImage();

  restartAutoplay();
});

galleryPrev.addEventListener("click", () => {
  prevImage();

  restartAutoplay();
});

function startAutoplay() {
  stopAutoplay();

  autoSlide = setInterval(() => {
    nextImage();
  }, 5000);
}

function stopAutoplay() {
  if (autoSlide) {
    clearInterval(autoSlide);
  }
}

function restartAutoplay() {
  stopAutoplay();

  startAutoplay();
}

/* ===========================================================
   TOUCH + DRAG SUPPORT
=========================================================== */

const gallery = document.querySelector(".product-gallery");

gallery.addEventListener("touchstart", handleTouchStart, { passive: true });
gallery.addEventListener("touchmove", handleTouchMove, { passive: true });
gallery.addEventListener("touchend", handleTouchEnd);

function handleTouchStart(e){

    startX = e.touches[0].clientX;

    isDragging = true;

    currentTranslate = -currentImage * gallerySlider.offsetWidth;

    gallerySlider.style.transition = "none";

    stopAutoplay();

}

function handleTouchMove(e){

    if(!isDragging) return;

    const currentX = e.touches[0].clientX;

    const diff = currentX - startX;

    gallerySlider.style.transform =
        `translateX(${currentTranslate + diff}px)`;

}

function handleTouchEnd(e){

    if(!isDragging) return;

    const endX = e.changedTouches[0].clientX;

    const diff = endX - startX;

    gallerySlider.style.transition = "transform .45s ease";

    if(Math.abs(diff) > 60){

        if(diff < 0){

            nextImage();

        }else{

            prevImage();

        }

    }else{

        updateGallery();

    }

    isDragging = false;

    restartAutoplay();

}



/* ---------- desktop ---------- */

gallerySlider.addEventListener("mousedown",(e)=>{

    startX = e.clientX;

    isDragging = true;

    gallerySlider.style.transition = "none";

    stopAutoplay();

});

window.addEventListener("mousemove",(e)=>{

    if(!isDragging) return;

    const diff = e.clientX - startX;

    gallerySlider.style.transform =
    `translateX(${currentTranslate + diff}px)`;

});

window.addEventListener("mouseup",(e)=>{

    if(!isDragging) return;

    gallerySlider.style.transition = "transform .45s ease";

    const diff = startX - e.clientX;

    if(Math.abs(diff) > 60){

        diff > 0 ? nextImage() : prevImage();

    }else{

        updateGallery();

    }

    isDragging = false;

    restartAutoplay();

});

/* ── LOAD PRODUCT ─────────────────────────────────────────── */
async function load() {
  if (!id) return;

  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return;

  product = snap.data();

  const starsEl = document.getElementById("product-stars");
  const countEl = document.getElementById("product-review-count");
  if (starsEl) starsEl.innerHTML = generateStars(product.averageRating || 0);
  if (countEl) countEl.innerText = `${product.reviewCount || 0} Reviews`;

  saveRecentlyViewed(id);

  if (product.isSuspended) {
    showToast("This product is currently unavailable.");
    setTimeout(() => {
      location.href = "/";
    }, 1500);
    return;
  }

  /* ── STOCK: use per-size stock map if available ── */
  const stock = product.stock || {};
  const hasSizes =
    Array.isArray(product.sizes) && !product.sizes.includes("None");

  /* total remaining across all sizes */
  const totalRemaining = Object.values(product.stock || {}).reduce(
    (sum, qty) => sum + qty,
    0,
  );

  const stockTextEl = document.getElementById("stock-left");
  stockTextEl.textContent =
    totalRemaining > 0 ? `${totalRemaining} available` : "Out of stock";
  stockTextEl.style.color =
    totalRemaining <= 0 ? "#ff4d4d" : totalRemaining < 4 ? "orange" : "lime";

  const soldBadge = document.getElementById("sold-out-badge");
  const addBtn = document.querySelector(".add-to-cart-btn");

  if (totalRemaining <= 0) {
    if (soldBadge) soldBadge.style.display = "inline-block";
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = "Sold Out";
    }
  } else {
    if (soldBadge) soldBadge.style.display = "none";
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = "Add To Bag";
    }
  }

  document.getElementById("decision-title").textContent = product.title;
  document.getElementById("decision-price").textContent =
    "₦" + Number(product.price).toLocaleString();
  descriptionBox.textContent = product.description;

  galleryImages = product.images?.length ? product.images : [product.image];

  currentImage = 0;

  renderGallery();

  updateGallery();

  startAutoplay();

  /* ── SIZES with per-size stock labels ── */
  sizeWrapper.innerHTML = "";
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  if (sizes.includes("None")) {
    sizeWrapper.style.display = "none";
  } else {
    sizeWrapper.style.display = "flex";
    sizes.forEach((size) => {
      const sizeStock = stock[size] ?? null;
      const isOOS = sizeStock !== null && sizeStock <= 0;
      sizeWrapper.innerHTML += `
<label class="size-radio-chip ${isOOS ? "size-out-of-stock" : ""}">

    <input
        type="radio"
        name="size"
        value="${size}"
        ${isOOS ? "disabled" : ""}
    >

    <span class="size-name">
        ${size}
    </span>

    <small class="size-stock-label">
        ${
            isOOS
            ? "Out of Stock"
            : `${sizeStock} left`
        }
    </small>

</label>
`;
    });
  }

  /* highlight selected size */
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document
        .querySelectorAll(".size-radio-chip")
        .forEach((c) => c.classList.remove("selected"));
      radio.parentElement.classList.add("selected");
    });
  });

  /* ── COLORS ── */
  if (colorWrapper) {
    colorWrapper.innerHTML = "";
    const colors = Array.isArray(product.colors) ? product.colors : [];
    if (colors.includes("None")) {
      colorWrapper.style.display = "none";
    } else {
      colorWrapper.style.display = "flex";
      colors.forEach((color) => {
        colorWrapper.innerHTML += `
          <label class="size-radio-chip">
            <input type="radio" name="color" value="${color}">
            <span>${color}</span>
          </label>`;
      });
    }
  }

  loadRelatedProducts(id);
  loadRecentlyViewed();
  loadReviews();
}

/* ── QTY ───────────────────────────────────────────────────── */
window.increaseQty = function () {
  const el = document.getElementById("item-quantity");
  el.value = Number(el.value) + 1;
};

window.decreaseQty = function () {
  const el = document.getElementById("item-quantity");
  if (Number(el.value) > 1) el.value = Number(el.value) - 1;
};

/* ── ADD TO CART ────────────────────────────────────────────── */
window.submitToCartBag = async function () {
  if (addingToCart) return;
  addingToCart = true;

  const addBtn = document.querySelector(".add-to-cart-btn");

  try {
    if (!product) {
      showToast("Please wait, product is still loading.");
      return;
    }

    const latestSnap = await getDoc(doc(db, "products", id));
    if (!latestSnap.exists()) {
      showToast("This product is no longer available.");
      setTimeout(() => {
        location.href = "/";
      }, 1500);
      return;
    }

    const latestProduct = latestSnap.data();
    if (latestProduct.isSuspended) {
      showToast("This product is unavailable.");
      return;
    }
    if (latestProduct.isEditing) {
      const age = Date.now() - (latestProduct.editingStartedAt || 0);
      if (age < 600000) {
        showToast(
          "This product is currently being updated. Please try again shortly.",
        );
        return;
      }
      await updateDoc(doc(db, "products", id), { isEditing: false });
    }

    product = latestProduct;

    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];

    const selectedSize = document.querySelector('input[name="size"]:checked');
    const selectedColor = document.querySelector('input[name="color"]:checked');

    if (!sizes.includes("None") && !selectedSize) {
      showToast("Please select a size.");
      return;
    }
    if (!colors.includes("None") && !selectedColor) {
      showToast("Please select a color.");
      return;
    }

    const qty = Number(document.getElementById("item-quantity").value);
    const stock = product.stock || {};
    const hasSizeStock =
      selectedSize && stock[selectedSize.value] !== undefined;

    /* check per-size stock if available, else fall back to legacy quantity-sold */
    const remaining = selectedSize
      ? stock[selectedSize.value] || 0
      : Object.values(stock).reduce((sum, qty) => sum + qty, 0);

    if (remaining <= 0) {
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = "Sold Out";
      }
      showToast("This size is out of stock.");
      return;
    }

    if (qty > remaining) {
      showToast(`Only ${remaining} left in stock for this size`);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showToast("Please login first.");
      location.href = "/login";
      return;
    }

    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = "Adding...";
    }

    const updatedItem = {
      productId: id,
      title: latestProduct.title,
      price: latestProduct.price,
      image: latestProduct.image,
      size: selectedSize ? selectedSize.value : "None",
      color: selectedColor ? selectedColor.value : "None",
      quantity: qty,
    };

    const cartRef = collection(db, "users", user.uid, "cart");
    const cartSnap = await getDocs(cartRef);
    let existingDoc = null;

    cartSnap.forEach((d) => {
      const item = d.data();
      if (
        item.productId === updatedItem.productId &&
        item.size === updatedItem.size &&
        item.color === updatedItem.color
      )
        existingDoc = d;
    });

    if (cartDocId) {
      await updateDoc(
        doc(db, "users", user.uid, "cart", cartDocId),
        updatedItem,
      );
    } else if (existingDoc) {
      await updateDoc(existingDoc.ref, {
        quantity: existingDoc.data().quantity + updatedItem.quantity,
      });
    } else {
      await addDoc(cartRef, updatedItem);
    }

    showToast("✓ Added to bag");
    setTimeout(() => {
      location.href = "/cart";
    }, 900);
  } finally {
    addingToCart = false;
    if (addBtn && addBtn.textContent === "Adding...") {
      addBtn.disabled = false;
      addBtn.textContent = "Add To Bag";
    }
  }
};

/* ── RECENTLY VIEWED ────────────────────────────────────────── */
function saveRecentlyViewed(productId) {
  let viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
  viewed = viewed.filter((i) => i !== productId);
  viewed.unshift(productId);
  viewed = viewed.slice(0, 8);
  localStorage.setItem("recentlyViewed", JSON.stringify(viewed));
}

async function loadRecentlyViewed() {
  const grid = document.getElementById("recently-viewed-grid");
  if (!grid) return;
  const viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
  grid.innerHTML = "";
  for (const productId of viewed) {
    if (productId === id) continue;
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) continue;
    const item = { id: snap.id, ...snap.data() };
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${item.image}" class="product-image">
      <div class="product-info">
        <h3 class="product-title">${item.title}</h3>
        <div class="product-rating">
          <span class="rating-stars">${generateStars(item.averageRating || 0)}</span>
          <span class="rating-count">(${item.reviewCount || 0})</span>
        </div>
        <div class="product-price">₦${Number(item.price).toLocaleString()}</div>
      </div>`;
    card.onclick = () => {
      location.href = "/decision-page.html?id=" + item.id;
    };
    grid.appendChild(card);
  }
}

/* ── RELATED PRODUCTS ────────────────────────────────────────── */
async function loadRelatedProducts(currentProductId) {
  const relatedGrid = document.getElementById("related-products-grid");
  if (!relatedGrid) return;
  const snap = await getDocs(collection(db, "products"));
  const products = [];
  snap.forEach((d) => products.push({ id: d.id, ...d.data() }));
  relatedGrid.innerHTML = "";
  let count = 0;
  products.forEach((item) => {
    if (count >= 8 || item.id === currentProductId || item.isSuspended) return;
    count++;
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${item.image}" class="product-image">
      <div class="product-info">
        <h3 class="product-title">${item.title}</h3>
        <div class="product-rating">
          <span class="rating-stars">${generateStars(item.averageRating || 0)}</span>
          <span class="rating-count">(${item.reviewCount || 0})</span>
        </div>
        <div class="product-price">₦${Number(item.price).toLocaleString()}</div>
      </div>`;
    card.onclick = () => {
      location.href = "/decision-page.html?id=" + item.id;
    };
    relatedGrid.appendChild(card);
  });
}

/* ── INIT ───────────────────────────────────────────────────── */
load();
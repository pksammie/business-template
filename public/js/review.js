import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

/* ── URL PARAMS ───────────────────────────────────────────── */
const params    = new URLSearchParams(location.search);
const orderId   = params.get("orderId");
const productId = params.get("productId");

/* ── ELEMENTS ─────────────────────────────────────────────── */
const reviewForm        = document.getElementById("review-form");
const reviewBox         = document.getElementById("review-text");
const ratingSelect      = document.getElementById("review-rating");
const counter           = document.getElementById("review-count");
const oneStarModal      = document.getElementById("one-star-modal");
const submitOneStarBtn  = document.getElementById("submit-one-star");
const closeOneStarModal = document.getElementById("close-one-star-modal");
const submitBtn         = reviewForm.querySelector('button[type="submit"]');
const successOverlay    = document.getElementById("review-success-overlay");

/* ── AUTH — wait for Firebase, don't use auth.currentUser directly ── */
let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", location.href);
    location.href = "/login";
    return;
  }
  currentUser = user;
  loadProductPreview();  /* load preview only after auth resolves */
});

/* ── PRODUCT PREVIEW ─────────────────────────────────────── */
async function loadProductPreview() {
  try {
    const snap = await getDoc(doc(db, "cart_reservations", orderId));
    if (!snap.exists()) return;

    const order = snap.data();

    const img = document.getElementById("preview-image");
    const title = document.getElementById("preview-title");
    const variant = document.getElementById("preview-variant");
    const price = document.getElementById("preview-price");

    if (img)     img.src          = order.productImage  || "";
    if (title)   title.innerText  = order.productTitle  || "";
    if (variant) variant.innerText= `${order.productColor || ""} • Size ${order.productSize || ""}`;
    if (price)   price.innerText  = `₦${Number(order.total || 0).toLocaleString()}`;

  } catch (err) {
    console.error("Preview load error:", err);
  }
}

/* ── CHARACTER COUNTER ───────────────────────────────────── */
reviewBox.addEventListener("input", () => {
  counter.innerText = reviewBox.value.length;
});

/* ── BUTTON HELPERS ──────────────────────────────────────── */
function lockMainButton()   { submitBtn.disabled = true;  submitBtn.innerText = "Sending..."; }
function unlockMainButton() { submitBtn.disabled = false; submitBtn.innerText = "Submit Review"; }
function lockModalButton()   { submitOneStarBtn.disabled = true;  submitOneStarBtn.innerText = "Sending..."; }
function unlockModalButton() { submitOneStarBtn.disabled = false; submitOneStarBtn.innerText = "Submit Review"; }

/* ── CORE SUBMIT ─────────────────────────────────────────── */
async function submitReview(oneStarReason = "") {

  if (!currentUser) { showToast("Please login first."); return false; }

  const rating     = Number(ratingSelect.value);
  const reviewText = reviewBox.value.trim();

  if (reviewText.length < 20) {
    showToast("Please write at least 20 characters.");
    return false;
  }

  /* ── FETCH ORDER ── */
  const orderRef  = doc(db, "cart_reservations", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) { showToast("Order not found."); return false; }

  const order = orderSnap.data();

  if (order.status !== "Delivered") {
    showToast("You can only review a delivered order.");
    return false;
  }

  /* ── DUPLICATE CHECK — use orderId as document ID so Firestore
       itself blocks duplicates. No frontend race condition possible. ── */
  const reviewRef = doc(db, "reviews", orderId);
  const existing  = await getDoc(reviewRef);

  if (existing.exists()) {
    showToast("You already reviewed this order.");
    return false;
  }

  try {
    /* setDoc with orderId as the document ID — guaranteed no duplicate */
    await setDoc(reviewRef,{
    productId,
    orderId,

    productTitle: order.productTitle,

    productImage: order.productImage,

    customerName: order.customerName,

    userId: currentUser.uid,

    rating,

    reviewText,

    oneStarReason,

    createdAt: Date.now(),

    likes:0,

    likedBy:[],

    edited:false,

    verifiedPurchase: true,

    featured:false,

approved: rating === 1 ? false : true,

adminReply:"",

adminReplyDate:null,

reportCount:0,

    reportedBy:[],

    images:[]
});

/* ─────────────────────────────
   CREATE ADMIN NOTIFICATION
───────────────────────────── */

await addDoc(
    collection(db, "admin_notifications"),
    {

        type: "review",

        reviewId: orderId,

        productId,

        productTitle: order.productTitle,

        productImage: order.productImage,

        customerName: order.customerName,

        rating,

        createdAt: Date.now(),

        read: false

    }
);

    /* mark order reviewed */
    await updateDoc(orderRef, { reviewSubmitted: true });

    /* update product rating stats */
    const productRef  = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const pd             = productSnap.data();
      const newReviewCount = (pd.reviewCount || 0) + 1;
      const newTotalRating = (pd.totalRating  || 0) + rating;

      await updateDoc(productRef, {
        reviewCount:   newReviewCount,
        totalRating:   newTotalRating,
        averageRating: newTotalRating / newReviewCount,
      });
    }

    /* show success overlay */
    if (successOverlay) {
      successOverlay.style.display = "flex";
      /* trigger CSS opacity transition on next frame */
      requestAnimationFrame(() => {
        successOverlay.classList.add("show");
      });
    }

    setTimeout(() => { location.replace("/orders"); }, 1800);

    return true;

  } catch (err) {
    console.error(err);
    showToast(err.message || "Couldn't submit review. Please try again.");
    return false;
  }
}

/* ── FORM SUBMIT (2–5 stars) ─────────────────────────────── */
reviewForm.addEventListener("submit", async e => {
  e.preventDefault();

  const reviewText = reviewBox.value.trim();
  const rating     = Number(ratingSelect.value);

  if (reviewText.length < 20) { showToast("Please write at least 20 characters."); return; }

  if (rating === 1) { oneStarModal.style.display = "flex"; return; }

  lockMainButton();
  const ok = await submitReview();
  if (!ok) unlockMainButton();
});

/* ── ONE-STAR MODAL SUBMIT ───────────────────────────────── */
submitOneStarBtn.onclick = async () => {
  const selectedRadio = document.querySelector('input[name="oneStarReason"]:checked');
  const customReason  = document.getElementById("custom-one-star-reason").value.trim();
  const reason        = customReason || (selectedRadio ? selectedRadio.value : "");

  if (!reason) { showToast("Please tell us why you gave one star."); return; }

  lockModalButton();
  lockMainButton();

  const ok = await submitReview(reason);

  unlockModalButton();
  if (!ok) { unlockMainButton(); return; }

  document.querySelectorAll('input[name="oneStarReason"]').forEach(r => r.checked = false);
  document.getElementById("custom-one-star-reason").value = "";
  oneStarModal.style.display = "none";
};

/* ── CLOSE ONE-STAR MODAL ────────────────────────────────── */
closeOneStarModal.onclick = () => { oneStarModal.style.display = "none"; };
oneStarModal.onclick = e => { if (e.target === oneStarModal) oneStarModal.style.display = "none"; };

/* ── RADIO TOGGLE ────────────────────────────────────────── */
let lastChecked = null;
document.querySelectorAll('input[name="oneStarReason"]').forEach(radio => {
  radio.addEventListener("click", function () {
    if (lastChecked === this) { this.checked = false; lastChecked = null; }
    else lastChecked = this;
  });
});

/* ── CANCEL ──────────────────────────────────────────────── */
document.getElementById("cancel-review-btn").addEventListener("click", () => {
  if (submitBtn.disabled) { showToast("Please wait until your review finishes submitting."); return; }
  location.href = "/orders";
});

/* ── LEAVE PAGE GUARD ────────────────────────────────────── */


/* ── GLOBAL ERROR CATCH ──────────────────────────────────── */
window.addEventListener("unhandledrejection", event => {
  console.error(event.reason);
  showToast("Something went wrong. Please try again.");
  unlockMainButton();
  unlockModalButton();
});
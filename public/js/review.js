import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

/* ─────────────────────────────────────────────────────────
   URL PARAMS
───────────────────────────────────────────────────────── */
const params    = new URLSearchParams(location.search);
const orderId   = params.get("orderId");
const productId = params.get("productId");

/* ─────────────────────────────────────────────────────────
   ELEMENTS
───────────────────────────────────────────────────────── */
const reviewForm       = document.getElementById("review-form");
const reviewBox        = document.getElementById("review-text");
const ratingSelect     = document.getElementById("review-rating");
const counter          = document.getElementById("review-count");
const oneStarModal     = document.getElementById("one-star-modal");
const submitOneStarBtn = document.getElementById("submit-one-star");
const closeOneStarModal= document.getElementById("close-one-star-modal");
const submitBtn        = reviewForm.querySelector('button[type="submit"]');

/* ─────────────────────────────────────────────────────────
   AUTH GATE — wait for Firebase Auth to resolve.
   THE MAIN BUG: auth.currentUser is null on page load
   because Firebase Auth is async. We must wait for it.
───────────────────────────────────────────────────────── */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in — redirect to login, preserve return path
    sessionStorage.setItem(
      "redirectAfterLogin",
      location.href
    );
    location.href = "/login";
    return;
  }
  currentUser = user;
});

/* ─────────────────────────────────────────────────────────
   CHARACTER COUNTER
───────────────────────────────────────────────────────── */
reviewBox.addEventListener("input", () => {
  counter.innerText = reviewBox.value.length;
});

/* ─────────────────────────────────────────────────────────
   BUTTON STATE HELPERS
───────────────────────────────────────────────────────── */
function lockMainButton() {
  submitBtn.disabled   = true;
  submitBtn.innerText  = "Sending Review...";
}

function unlockMainButton() {
  submitBtn.disabled   = false;
  submitBtn.innerText  = "Submit Review";
}

function lockModalButton() {
  submitOneStarBtn.disabled  = true;
  submitOneStarBtn.innerText = "Sending Review...";
}

function unlockModalButton() {
  submitOneStarBtn.disabled  = false;
  submitOneStarBtn.innerText = "Submit Review";
}

/* ─────────────────────────────────────────────────────────
   CORE SUBMIT FUNCTION
───────────────────────────────────────────────────────── */
async function submitReview(oneStarReason = "") {

  // FIX 1: use currentUser set by onAuthStateChanged,
  // NOT auth.currentUser (which is null on first load)
  if (!currentUser) {
    showToast("Please login first.");
    return false;
  }

  const rating     = Number(ratingSelect.value);
  const reviewText = reviewBox.value.trim();

  // Validation
  if (reviewText.length < 20) {
    showToast("Please write at least 20 characters.");
    return false;
  }

  // FIX 2: check the order exists AND is "Delivered"
  // Prevents reviews on cancelled/pending orders
  const orderRef  = doc(db, "cart_reservations", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    showToast("Order could not be found.");
    return false;
  }

  const order = orderSnap.data();

  if (order.status !== "Delivered") {
    showToast("You can only review a delivered order.");
    return false;
  }

  // Check for existing review
  const existingQuery = query(
    collection(db, "reviews"),
    where("orderId",  "==", orderId),
    where("userId",   "==", currentUser.uid)
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    showToast("You already reviewed this product.");
    return false;
  }

  try {
    // Save review
    await addDoc(collection(db, "reviews"), {
      productId,
      orderId,
      userId:       currentUser.uid,
      customerName: order.customerName,
      rating,
      reviewText,
      oneStarReason,
      createdAt: Date.now(),
      likes:     0,
      likedBy:   [],
      edited:    false,
    });

    // Mark order as reviewed
    await updateDoc(orderRef, { reviewSubmitted: true });

    // Update product rating stats
    const productRef  = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const pd = productSnap.data();

      const newReviewCount = (pd.reviewCount || 0) + 1;
      const newTotalRating = (pd.totalRating  || 0) + rating;

      await updateDoc(productRef, {
        reviewCount:   newReviewCount,
        totalRating:   newTotalRating,
        averageRating: newTotalRating / newReviewCount,
      });
    }

    showToast("Thank you for your review!");

    setTimeout(() => { location.href = "/orders"; }, 1500);

    return true;

  } catch (err) {
    console.error(err);
    showToast(err.message || "Couldn't submit review. Please try again.");
    return false;
  }
}

/* ─────────────────────────────────────────────────────────
   FORM SUBMIT (normal — 2 to 5 stars)
───────────────────────────────────────────────────────── */
reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rating     = Number(ratingSelect.value);
  const reviewText = reviewBox.value.trim();

  if (reviewText.length < 20) {
    showToast("Please write at least 20 characters.");
    return;
  }

  // 1-star → open reason modal instead
  if (rating === 1) {
    oneStarModal.style.display = "flex";
    return;
  }

  lockMainButton();

  const success = await submitReview();

  if (!success) unlockMainButton();
  // if success → redirecting to /orders so no need to unlock
});

/* ─────────────────────────────────────────────────────────
   ONE-STAR MODAL SUBMIT
───────────────────────────────────────────────────────── */
submitOneStarBtn.onclick = async () => {

  const selectedRadio  = document.querySelector('input[name="oneStarReason"]:checked');
  const customReason   = document.getElementById("custom-one-star-reason").value.trim();
  const selectedReason = customReason || (selectedRadio ? selectedRadio.value : "");

  if (!selectedReason) {
    showToast("Please tell us why you gave one star.");
    return;
  }

  lockModalButton();
  lockMainButton();

  const success = await submitReview(selectedReason);

  unlockModalButton();

  if (!success) {
    unlockMainButton();
    return;
  }

  // Reset and close modal on success (redirect handles the rest)
  document.querySelectorAll('input[name="oneStarReason"]').forEach(r => r.checked = false);
  document.getElementById("custom-one-star-reason").value = "";
  oneStarModal.style.display = "none";
};

/* ─────────────────────────────────────────────────────────
   CLOSE ONE-STAR MODAL
───────────────────────────────────────────────────────── */
closeOneStarModal.onclick = () => {
  oneStarModal.style.display = "none";
};

oneStarModal.onclick = (e) => {
  if (e.target === oneStarModal) oneStarModal.style.display = "none";
};

/* ─────────────────────────────────────────────────────────
   RADIO TOGGLE (click same radio to deselect)
───────────────────────────────────────────────────────── */
let lastChecked = null;

document.querySelectorAll('input[name="oneStarReason"]').forEach(radio => {
  radio.addEventListener("click", function () {
    if (lastChecked === this) {
      this.checked = false;
      lastChecked  = null;
    } else {
      lastChecked = this;
    }
  });
});

/* ─────────────────────────────────────────────────────────
   CANCEL BUTTON
───────────────────────────────────────────────────────── */
document.getElementById("cancel-review-btn").addEventListener("click", () => {
  if (submitBtn.disabled) {
    showToast("Please wait until your review finishes submitting.");
    return;
  }
  location.href = "/orders";
});

/* ─────────────────────────────────────────────────────────
   LEAVE PAGE GUARD (prevents accidental close mid-submit)
───────────────────────────────────────────────────────── */
window.addEventListener("beforeunload", (e) => {
  if (submitBtn.disabled || submitOneStarBtn.disabled) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ─────────────────────────────────────────────────────────
   GLOBAL ERROR CATCH
───────────────────────────────────────────────────────── */
window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  showToast("Something went wrong. Please try again.");
  unlockMainButton();
  unlockModalButton();
});
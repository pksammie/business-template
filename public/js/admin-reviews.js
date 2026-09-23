import { db, auth } from "./firebase.js";

import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import { createDropdown } from "./timeless-dropdown.js";

/* ── Admin guard ───────────────────────────────────────────────
   This page had no auth check at all -- anyone who knew/guessed the
   URL could load the full review-management UI (search, delete,
   approve, feature buttons). Firestore rules still protect the actual
   writes, but a non-admin shouldn't be able to see this screen either. */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/login";
    return;
  }

  const adminDoc = await getDoc(doc(db, "admins", user.uid));

  if (!adminDoc.exists()) {
    location.href = "/";
  }
});

const container = document.getElementById("reviews-container");
const searchInput = document.getElementById("orders-search");
const searchBtn = document.getElementById("reviews-search-btn");
const paginationEl = document.getElementById("reviews-pagination");

const replyModal = document.getElementById("reply-modal");
const replyText = document.getElementById("admin-reply-text");

const viewModal = document.getElementById("view-review-modal");
const viewBody = document.getElementById("view-review-body");

const REVIEWS_PER_PAGE = 8;

/* Reviews at this rating or below need admin approval before they count
   toward the product's rating / go live -- kept in one place so the
   filter, the button count, and review.js's submit flow all agree. */
const NEEDS_APPROVAL_MAX_RATING = 2;

let reviews = [];
let selectedReview = null;
let currentPage = 1;
let selectedRating = "all";

function stars(r) {
  const n = Number(r) || 0;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function formatDate(value) {
  if (!value) return "";
  const d = typeof value === "number" ? new Date(value) : new Date(value);
  return isNaN(d) ? "" : d.toLocaleDateString();
}

function reviewCardHtml(r) {
  const needsApproval = Number(r.rating) <= NEEDS_APPROVAL_MAX_RATING && r.approved === false;

  return `
    <div class="review-admin-card">

      <div class="review-admin-product">
        <img src="${r.productImage || "/images/placeholder.png"}" alt="${r.productTitle || "Product"}">
        <div>
          <div class="review-admin-user">${r.customerName || "Anonymous"}</div>
          <div class="review-admin-stars">${stars(r.rating)}</div>
        </div>
      </div>

      <p class="review-admin-text">${(r.reviewText || "").replace(/</g, "&lt;")}</p>

      ${r.oneStarReason ? `<p class="review-admin-text" style="color:#ff8a8a;">Reason: ${r.oneStarReason}</p>` : ""}

      ${r.adminReply ? `
        <div class="review-admin-text" style="border-left:2px solid #c5a880; padding-left:12px;">
          <strong style="color:#c5a880;">Your reply:</strong> ${r.adminReply}
        </div>
      ` : ""}

      <div style="display:flex; justify-content:space-between; align-items:center; color:#888; font-size:12px;">
        <span>${formatDate(r.createdAt)}</span>
        <span style="display:flex; gap:6px;">
          ${needsApproval ? '<span class="review-status-badge pending-badge"><i class="fa-solid fa-hourglass-half"></i> Pending Approval</span>' : ""}
          ${r.featured ? '<span class="verified-badge">Featured</span>' : ""}
        </span>
      </div>

      <div class="review-admin-actions">
        ${needsApproval ? `
        <button class="approve-review-btn" onclick="approveReview('${r.id}')">
          <i class="fa-solid fa-check"></i> Approve
        </button>` : ""}
        <button class="reply-btn" onclick="replyReview('${r.id}')">
          <i class="fa-solid fa-reply"></i> Reply
        </button>
        <button class="feature-btn ${r.featured ? "is-featured" : ""}" onclick="featureReview('${r.id}')">
          <i class="fa-solid fa-star"></i> ${r.featured ? "Unfeature" : "Feature"}
        </button>
        <button class="view-review-btn" onclick="viewReview('${r.id}')">
          <i class="fa-solid fa-eye"></i> View
        </button>
        <button class="delete-review-btn" onclick="deleteReview('${r.id}')">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>

    </div>
  `;
}

function getFiltered() {
  const term = (searchInput.value || "").toLowerCase();
  const rating = selectedRating;

  return reviews.filter(r => {
    const matchSearch =
      (r.customerName || "").toLowerCase().includes(term) ||
      (r.reviewText || "").toLowerCase().includes(term) ||
      (r.productTitle || "").toLowerCase().includes(term);

    const matchRating =
      rating === "all" || Number(r.rating) === Number(rating);

    return matchSearch && matchRating;
  });
}

function render() {
  const filtered = getFiltered();

  const totalPages = Math.max(1, Math.ceil(filtered.length / REVIEWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * REVIEWS_PER_PAGE;
  const pageItems = filtered.slice(start, start + REVIEWS_PER_PAGE);

  if (!filtered.length) {
    container.innerHTML = `<p style="color:#8a8a8a; grid-column:1/-1;">No reviews match that search yet.</p>`;
  } else {
    container.innerHTML = pageItems.map(reviewCardHtml).join("");
  }

  renderPagination(filtered.length, totalPages);
}

function renderPagination(total, totalPages) {
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  let html = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="changeReviewPage(${currentPage - 1})">‹</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="${i === currentPage ? "active" : ""}" onclick="changeReviewPage(${i})">${i}</button>
    `;
  }

  html += `
    <button ${currentPage === totalPages ? "disabled" : ""} onclick="changeReviewPage(${currentPage + 1})">›</button>
  `;

  paginationEl.innerHTML = html;
  paginationEl.classList.add("admin-pagination");
}

window.changeReviewPage = function (page) {
  currentPage = page;
  render();
};

function runSearch() {
  currentPage = 1;
  render();
}

searchInput.addEventListener("input", runSearch);
searchBtn?.addEventListener("click", runSearch);

/* Styled rating filter dropdown -- mirrors the category dropdown used
   elsewhere in the admin panel instead of a bare unstyled <select>. */
createDropdown({
  container: document.getElementById("rating-filter-mount"),
  options: [
    { value: "all", label: "All Ratings" },
    { value: "5", label: "★★★★★" },
    { value: "4", label: "★★★★☆" },
    { value: "3", label: "★★★☆☆" },
    { value: "2", label: "★★☆☆☆" },
    { value: "1", label: "★☆☆☆☆" },
  ],
  value: "all",
  onChange: (value) => {
    selectedRating = value;
    currentPage = 1;
    render();
  },
});

onSnapshot(collection(db, "reviews"), snap => {
  reviews = [];
  snap.forEach(d => {
    reviews.push({ id: d.id, ...d.data() });
  });
  reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  render();
});

window.deleteReview = async (id) => {
  showVanguardConfirm("Delete this review permanently?", async () => {
    await deleteDoc(doc(db, "reviews", id));
    showToast("Review deleted.");
  });
};

// There was never an admin-review-feature.html page -- "featured" is just
// a boolean the homepage carousel already queries for (see index.js),
// so this just toggles it directly.
window.featureReview = async (id) => {
  const review = reviews.find(r => r.id === id);
  if (!review) return;

  const willFeature = !review.featured;

  await updateDoc(doc(db, "reviews", id), {
    featured: willFeature,
  });

  // Only notify when a review actually gets featured, not on unfeature --
  // otherwise someone toggling it back and forth spams the customer.
  if (willFeature && review.userId) {
    try {
      await addDoc(collection(db, "user_notifications"), {
        userId: review.userId,
        type: "review_featured",
        productId: review.productId || null,
        productTitle: review.productTitle || "your product",
        productImage: review.productImage || "",
        status: "Your Review Was Featured",
        message: `Your review on "${review.productTitle || "your product"}" is now featured for other shoppers to see. Thank you!`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to notify customer of feature", err);
    }
  }

  showToast(willFeature ? "Added to featured carousel." : "Removed from featured.");
};

window.approveReview = async (id) => {
  const review = reviews.find(r => r.id === id);
  if (!review) return;

  showVanguardConfirm("Approve this review?", async () => {
    await updateDoc(doc(db, "reviews", id), { approved: true });

    // This review was never folded into the product's aggregate stats at
    // creation time (it started out pending) -- add it now.
    if (review.productId) {
      try {
        const productRef = doc(db, "products", review.productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const pd = productSnap.data();
          const newCount = (pd.reviewCount || 0) + 1;
          const newTotal = (pd.totalRating || 0) + Number(review.rating || 0);

          await updateDoc(productRef, {
            reviewCount: newCount,
            totalRating: newTotal,
            averageRating: newTotal / newCount,
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (review.userId) {
      try {
        await addDoc(collection(db, "user_notifications"), {
          userId: review.userId,
          type: "review_approved",
          productId: review.productId || null,
          productTitle: review.productTitle || "your product",
          productImage: review.productImage || "",
          status: "Your Review Has Been Approved",
          message: `Thank you for sharing your feedback on "${review.productTitle || "your product"}". We've reviewed your submission and it's now live.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error(err);
      }
    }

    showToast("Review approved.");
  });
};

window.viewReview = function (id) {
  const review = reviews.find(r => r.id === id);
  if (!review) return;

  viewBody.innerHTML = `
    <div class="review-admin-product" style="margin-bottom:14px;">
      <img src="${review.productImage || "/images/placeholder.png"}" alt="${review.productTitle || "Product"}">
      <div>
        <div class="review-admin-user">${review.customerName || "Anonymous"}</div>
        <div class="review-admin-stars">${stars(review.rating)}</div>
      </div>
    </div>
    <p class="review-admin-text">${(review.reviewText || "").replace(/</g, "&lt;")}</p>
    ${review.oneStarReason ? `<p class="review-admin-text" style="color:#ff8a8a;">Reason: ${review.oneStarReason}</p>` : ""}
    ${review.images?.length ? `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        ${review.images.map(src => `<img src="${src}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">`).join("")}
      </div>
    ` : ""}
    <p style="color:#888; font-size:12px; margin-top:14px;">Submitted ${formatDate(review.createdAt)}</p>
  `;

  viewModal.classList.add("show");
};

document.getElementById("close-view-modal").onclick = () => {
  viewModal.classList.remove("show");
};

viewModal.onclick = (e) => {
  if (e.target === viewModal) {
    viewModal.classList.remove("show");
  }
};

window.replyReview = function (id) {
  selectedReview = id;
  replyText.value = "";
  replyModal.classList.add("show");
};

document.getElementById("close-reply-modal").onclick = () => {
  replyModal.classList.remove("show");
};

replyModal.onclick = (e) => {
  if (e.target === replyModal) {
    replyModal.classList.remove("show");
  }
};

document.getElementById("send-admin-reply").onclick = async () => {
  if (!selectedReview) return;

  const text = replyText.value.trim();

  if (!text) {
    showToast("Write a reply.");
    return;
  }

  await updateDoc(doc(db, "reviews", selectedReview), {
    adminReply: text,
    adminReplyDate: Date.now(),
  });

  const review = reviews.find(r => r.id === selectedReview);

  if (review?.userId) {
    try {
      await addDoc(collection(db, "user_notifications"), {
        userId: review.userId,
        productId: review.productId || null,
        productTitle: review.productTitle || "your review",
        productImage: review.productImage || "",
        status: "Review Reply",
        message: `Timeless replied to your review: "${text.slice(0, 80)}${text.length > 80 ? "..." : ""}"`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to notify customer of reply", err);
    }
  }

  replyModal.classList.remove("show");
  showToast("Reply sent.");
};

/* ---------------- Confirm modal (shared pattern, same as admin.html) ---------------- */

let confirmCallback = null;

function showVanguardConfirm(message, callback) {
  confirmCallback = callback;
  document.getElementById("vanguard-modal-message").textContent = message;
  document.getElementById("vanguard-confirm-modal").classList.add("show");
}

document.getElementById("vanguard-modal-cancel").addEventListener("click", () => {
  document.getElementById("vanguard-confirm-modal").classList.remove("show");
  confirmCallback = null;
});

document.getElementById("vanguard-modal-confirm").addEventListener("click", () => {
  document.getElementById("vanguard-confirm-modal").classList.remove("show");
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
});

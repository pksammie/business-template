import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const container = document.getElementById("reviews-container");
const searchInput = document.getElementById("orders-search");
const ratingFilter = document.getElementById("rating-filter");
const paginationEl = document.getElementById("reviews-pagination");

const replyModal = document.getElementById("reply-modal");
const replyText = document.getElementById("admin-reply-text");

const REVIEWS_PER_PAGE = 8;

let reviews = [];
let selectedReview = null;
let currentPage = 1;

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
        ${r.featured ? '<span class="verified-badge">Featured</span>' : ""}
      </div>

      <div class="review-admin-actions">
        <button class="reply-btn" onclick="replyReview('${r.id}')">
          <i class="fa-solid fa-reply"></i> Reply
        </button>
        <button class="feature-btn" onclick="featureReview('${r.id}')">
          <i class="fa-solid fa-star"></i> ${r.featured ? "Unfeature" : "Feature"}
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
  const rating = ratingFilter.value;

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
}

window.changeReviewPage = function (page) {
  currentPage = page;
  render();
};

searchInput.addEventListener("input", () => {
  currentPage = 1;
  render();
});

ratingFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
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

  await updateDoc(doc(db, "reviews", id), {
    featured: !review.featured,
  });

  showToast(review.featured ? "Removed from featured." : "Added to featured carousel.");
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
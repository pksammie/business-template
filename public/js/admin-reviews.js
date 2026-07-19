import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { createDropdown } from "./timeless-dropdown.js";

const container = document.getElementById("reviews-container");
const searchInput = document.getElementById("orders-search");
const paginationEl = document.getElementById("reviews-pagination");

const replyModal = document.getElementById("reply-modal");
const replyText = document.getElementById("admin-reply-text");

const viewModal = document.getElementById("view-review-modal");
const viewText = document.getElementById("view-review-text");

const REVIEWS_PER_PAGE = 8;
const CLAMP_THRESHOLD = 160; // characters -- past this, show "View Review"

let reviews = [];
let selectedReview = null;
let currentPage = 1;
let selectedRatingFilter = "all";

createDropdown({
  container: document.getElementById("rating-filter-mount"),
  placeholder: "All Ratings",
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
    selectedRatingFilter = value;
    currentPage = 1;
    render();
  },
});

function stars(r) {
  const n = Number(r) || 0;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function initials(name) {
  const clean = (name || "Anonymous").trim();
  const parts = clean.split(/\s+/);
  return ((parts[0]?.[0] || "A") + (parts[1]?.[0] || "")).toUpperCase();
}

function formatDate(value) {
  if (!value) return "";
  const d = typeof value === "number" ? new Date(value) : new Date(value);
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function escapeHtml(text) {
  return (text || "").replace(/</g, "&lt;");
}

function reviewCardHtml(r) {
  const fullText = escapeHtml(r.reviewText);
  const isLong = fullText.length > CLAMP_THRESHOLD;

  return `
    <div class="review-admin-card">

      <div class="review-admin-top">

        <div class="review-admin-avatar">${initials(r.customerName)}</div>

        <div class="review-admin-identity">
          <div class="review-admin-user">${r.customerName || "Anonymous"}</div>
          <div class="review-admin-stars">${stars(r.rating)}</div>
        </div>

        ${r.featured ? '<span class="verified-badge">Featured</span>' : ""}

      </div>

      ${r.productTitle ? `
        <div class="review-admin-product">
          <img src="${r.productImage || "/images/placeholder.png"}" alt="${r.productTitle}">
          <span class="review-admin-product-title">${escapeHtml(r.productTitle)}</span>
        </div>
      ` : ""}

      <p class="review-admin-text ${isLong ? "clamped" : ""}">${fullText}</p>

      ${isLong ? `<button class="view-review-btn" data-review-id="${r.id}">View Review</button>` : ""}

      ${r.oneStarReason ? `<p class="review-admin-reason">Reason: ${escapeHtml(r.oneStarReason)}</p>` : ""}

      ${r.adminReply ? `
        <div class="review-admin-reply">
          <strong>Your reply:</strong> ${escapeHtml(r.adminReply)}
        </div>
      ` : ""}

      <div class="review-admin-meta">
        <span>${formatDate(r.createdAt)}</span>
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
  const rating = selectedRatingFilter;

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
    container.innerHTML = `<p class="reviews-empty-state">No reviews match that search yet.</p>`;
  } else {
    container.innerHTML = pageItems.map(reviewCardHtml).join("");
  }

  container.querySelectorAll(".view-review-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const review = reviews.find(r => r.id === btn.dataset.reviewId);
      if (!review) return;
      viewText.textContent = review.reviewText || "";
      viewModal.classList.add("show");
    });
  });

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

document.getElementById("close-view-modal").onclick = () => {
  viewModal.classList.remove("show");
};

viewModal.onclick = (e) => {
  if (e.target === viewModal) {
    viewModal.classList.remove("show");
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
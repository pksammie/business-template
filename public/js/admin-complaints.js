import { db } from "./firebase.js";

import { createDropdown } from "./timeless-dropdown.js";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const listEl = document.getElementById("complaints-list");
const searchInput = document.getElementById("complaints-search");

let selectedStatusFilter = "all";

const statusFilterMount = document.getElementById("complaints-status-filter-mount");
if (statusFilterMount) {
  createDropdown({
    container: statusFilterMount,
    options: [
      { value: "all", label: "All Statuses" },
      { value: "Open", label: "Open" },
      { value: "Resolved", label: "Resolved" },
    ],
    value: "all",
    onChange: (value) => {
      selectedStatusFilter = value;
      renderComplaints();
    },
  });
}

let allComplaints = [];

function getFilteredComplaints() {
  const term = (searchInput?.value || "").toLowerCase().trim();
  const status = selectedStatusFilter;

  return allComplaints.filter((complaint) => {
    const matchesTerm =
      !term ||
      [complaint.subject, complaint.message, complaint.orderId, complaint.productTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);

    const matchesStatus = status === "all" || complaint.status === status;
    return matchesTerm && matchesStatus;
  });
}

function renderComplaints() {
  const filtered = getFilteredComplaints();
  listEl.innerHTML = "";

  if (!filtered.length) {
    listEl.innerHTML = '<p style="opacity:.6;">No complaints match this view yet.</p>';
    return;
  }

  filtered.forEach((complaint) => {
    const isResolved = complaint.status === "Resolved";
    const card = document.createElement("div");
    card.className = "order-admin-card review-admin-card-item";
    card.innerHTML = `
      <div class="review-card-header">
        <h3>${complaint.subject || "Complaint"}</h3>
        <div class="review-badges-row">
          <span class="review-status-badge ${isResolved ? "featured-badge" : "pending-badge"}">
            ${isResolved ? '<i class="fa-solid fa-check"></i> Resolved' : '<i class="fa-solid fa-hourglass-half"></i> Open'}
          </span>
        </div>
      </div>
      ${complaint.orderId ? `<p><strong>Order ID:</strong> ${complaint.orderId}</p>` : ""}
      ${complaint.productTitle ? `<p><strong>Product:</strong> ${complaint.productTitle}</p>` : ""}
      <p class="review-card-text">${complaint.message || ""}</p>
      ${complaint.adminReply ? `
        <div class="admin-review-reply-box">
          <strong><i class="fa-solid fa-reply"></i> Your Reply</strong>
          <p>${complaint.adminReply}</p>
        </div>
      ` : `
        <textarea id="complaint-reply-${complaint.id}" class="admin-reply-textarea" placeholder="Write a reply and resolve..."></textarea>
        <button class="post-reply-btn" onclick="resolveComplaint('${complaint.id}')">Send Reply &amp; Resolve</button>
      `}
    `;
    listEl.appendChild(card);
  });
}

window.resolveComplaint = async function (id) {
  const textarea = document.getElementById(`complaint-reply-${id}`);
  const reply = textarea?.value.trim();

  if (!reply) {
    showToast("Write a reply first.");
    return;
  }

  const complaint = allComplaints.find((item) => item.id === id);
  await updateDoc(doc(db, "complaints", id), {
    adminReply: reply,
    adminReplyDate: Date.now(),
    status: "Resolved",
  });

  if (complaint && complaint.userId) {
    try {
      await addDoc(collection(db, "user_notifications"), {
        userId: complaint.userId,
        type: "complaint_resolved",
        orderId: complaint.orderId || null,
        productId: complaint.productId || null,
        productTitle: complaint.productTitle || "your complaint",
        productImage: complaint.productImage || "",
        status: "Your Complaint Was Answered",
        message: `Regarding "${complaint.subject || "your complaint"}": ${reply}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  }

  showToast("Reply sent and complaint resolved.");
};

searchInput?.addEventListener("input", renderComplaints);

onSnapshot(
  query(collection(db, "complaints"), orderBy("createdAt", "desc")),
  (snapshot) => {
    allComplaints = [];
    snapshot.forEach((docSnap) => {
      allComplaints.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderComplaints();
  },
);
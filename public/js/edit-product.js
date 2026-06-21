import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params    = new URLSearchParams(location.search);
const productId = params.get("id");
const form      = document.getElementById("edit-product-form");
const uploadBox = document.getElementById("upload-image-box");

let uploadedImageUrl = "";
let currentSold      = 0; // ← track sold count so we never lose it

async function loadProduct() {
  const snap = await getDoc(doc(db, "products", productId));

  if (!snap.exists()) {
    showToast("Product not found.");
    location.href = "/admin";
    return;
  }

  const product = snap.data();

  // Store sold count — we need it when saving
  currentSold = product.sold || 0;

  document.getElementById("prod-title").value = product.title;
  document.getElementById("prod-price").value = product.price;

  // ── THE FIX ──────────────────────────────────────────────────
  // Show the REMAINING stock (quantity - sold), NOT the raw quantity.
  // When saving we add sold back so the total quantity stays correct.
  const remaining = (product.quantity || 0) - currentSold;
  document.getElementById("prod-quantity").value = remaining;
  // ─────────────────────────────────────────────────────────────

  document.getElementById("prod-desc").value = product.description;

  uploadedImageUrl = product.image;

  uploadBox.innerHTML = `
    <img src="${product.image}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;">
  `;

  document.querySelectorAll('input[name="prod_sizes"]').forEach(box => {
    box.checked = (product.sizes || []).includes(box.value);
  });

  document.querySelectorAll('input[name="prod_colors"]').forEach(box => {
    box.checked = (product.colors || []).includes(box.value);
  });
}

loadProduct();

/* ── IMAGE UPLOAD ─────────────────────────────────────────── */
uploadBox.onclick = () => {
  cloudinary.openUploadWidget(
    { cloudName: "dzkyhxdy9", uploadPreset: "transformations", multiple: false },
    (error, result) => {
      if (!error && result && result.event === "success") {
        uploadedImageUrl = result.info.secure_url;
        uploadBox.innerHTML = `
          <img src="${uploadedImageUrl}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;">
        `;
      }
    }
  );
};

/* ── RELEASE LOCK ON LEAVE ────────────────────────────────── */
window.addEventListener("beforeunload", async () => {
  if (!productId) return;
  try {
    await updateDoc(doc(db, "products", productId), { isEditing: false });
  } catch (err) { console.log(err); }
});

document.getElementById("back-admin-btn").addEventListener("click", async e => {
  e.preventDefault();
  await updateDoc(doc(db, "products", productId), { isEditing: false });
  location.href = "/admin";
});

/* ── SAVE ─────────────────────────────────────────────────── */
form.addEventListener("submit", async e => {
  e.preventDefault();

  const colors = [...document.querySelectorAll("input[name='prod_colors']:checked")].map(el => el.value);
  const sizes  = [...document.querySelectorAll("input[name='prod_sizes']:checked")].map(el => el.value);

  // The admin typed the REMAINING stock they want available.
  // We store quantity = remaining + sold so the formula
  // (quantity - sold) always gives the right available number.
  const remainingInput = Number(document.getElementById("prod-quantity").value);
  const newTotalQuantity = remainingInput + currentSold;

  await updateDoc(doc(db, "products", productId), {
    title:       document.getElementById("prod-title").value,
    price:       Number(document.getElementById("prod-price").value),
    quantity:    newTotalQuantity,   // ← correct: remaining + sold
    description: document.getElementById("prod-desc").value,
    image:       uploadedImageUrl,
    sizes,
    colors,
    isEditing:   false,
  });

  showToast("Product updated successfully.");
  location.href = "/admin";
});
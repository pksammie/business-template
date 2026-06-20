import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const cartItemsContainer = document.getElementById("cart-items-container");
const subtotalLabel       = document.getElementById("summary-subtotal");
const selectAllBtn        = document.getElementById("select-all-btn");
const selectAllCount      = document.getElementById("select-all-count");

let editMode              = false;
let selectedIndex         = null;
let firestoreCart         = [];
let renderingCart         = false;
let cartListenerStarted   = false;
let selectedCheckoutItems = [];

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function updateSelectAllBtn() {
  if (!selectAllBtn) return;
  const available = firestoreCart.filter(i => !i.isUnavailable);
  const allSelected = available.length > 0 &&
    available.every(i => selectedCheckoutItems.includes(i.firestoreId));

  selectAllBtn.textContent = allSelected ? "Deselect All" : "Select All";
  if (selectAllCount) {
    selectAllCount.textContent =
      selectedCheckoutItems.length > 0
        ? `(${selectedCheckoutItems.length} selected)`
        : "";
  }
}

/* ─────────────────────────────────────────────────────────
   BACKUP
───────────────────────────────────────────────────────── */
async function backupCurrentCart() {
  const user = auth.currentUser;
  if (!user || firestoreCart.length === 0) return;

  await addDoc(collection(db, "users", user.uid, "cart_backups"), {
    createdAt: Date.now(),
    items: firestoreCart.map(item => ({
      productId: item.productId,
      title:     item.title,
      image:     item.image,
      price:     item.price,
      quantity:  item.quantity,
      size:      item.size,
      color:     item.color,
    })),
  });
}

/* ─────────────────────────────────────────────────────────
   RENDER
───────────────────────────────────────────────────────── */
async function renderTabularCart() {
  if (renderingCart) return;
  renderingCart = true;

  try {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "cart"));
    firestoreCart = [];

    /* ── Step 1: load items + availability ── */
    for (const docSnap of snap.docs) {
      const cartItem = { firestoreId: docSnap.id, ...docSnap.data() };
      try {
        const pSnap = await getDoc(doc(db, "products", cartItem.productId));
        if (!pSnap.exists() || pSnap.data().isSuspended) {
          cartItem.isUnavailable = true;
        }
      } catch (err) { console.error(err); }
      firestoreCart.push(cartItem);
    }

    /* ── Step 2: sync price / title / image (partial updateDoc only) ── */
    let cartUpdated = false;
    for (const item of firestoreCart) {
      if (!item.productId) continue;
      const pSnap = await getDoc(doc(db, "products", item.productId));

      if (!pSnap.exists()) {
        await deleteDoc(doc(db, "users", user.uid, "cart", item.firestoreId));
        cartUpdated = true; continue;
      }
      const pd = pSnap.data();
      if (pd.isSuspended) {
        await deleteDoc(doc(db, "users", user.uid, "cart", item.firestoreId));
        cartUpdated = true; continue;
      }

      const upd = {};
      if (item.title !== pd.title)  { upd.title = pd.title;  item.title = pd.title; }
      if (item.price !== pd.price)  { upd.price = pd.price;  item.price = pd.price; }
      if (item.image !== pd.image)  { upd.image = pd.image;  item.image = pd.image; }

      if (Object.keys(upd).length) {
        await updateDoc(doc(db, "users", user.uid, "cart", item.firestoreId), upd);
        cartUpdated = true;
      }
    }

    if (!cartItemsContainer) return;

    if (cartUpdated) {
      showToast("Cart refreshed with latest product info.");
      setTimeout(() => renderTabularCart(), 150);
      return;
    }

    /* ── Step 3: render ── */
    if (firestoreCart.length === 0) {
      cartItemsContainer.innerHTML = `<div class="empty-cart">Your shopping bag is empty.</div>`;
      subtotalLabel.innerText = "₦0";
      updateSelectAllBtn();
      return;
    }

    cartItemsContainer.innerHTML = "";
    let total = 0;

    firestoreCart.forEach((item, index) => {
      if (item.isUnavailable) return;

      const lineTotal    = item.price * item.quantity;
      total             += lineTotal;
      const isChecked    = selectedCheckoutItems.includes(item.firestoreId);
      const isEditPicked = editMode && selectedIndex === index;

      const card = document.createElement("div");
      card.className = "cart-product-card";
      if (isChecked)    card.classList.add("checkout-selected");
      if (editMode)     card.classList.add("edit-mode");
      if (isEditPicked) card.classList.add("edit-picked");

      card.innerHTML = `
        <!-- circle checkbox -->
        <div class="cart-selector" data-id="${item.firestoreId}">
          <i class="fa-solid fa-check"></i>
        </div>

        <!-- product image -->
        <img src="${item.image}" class="cart-card-image" alt="${item.title}">

        <!-- details -->
        <div class="cart-card-content">
          <div class="cart-card-title">${item.title}</div>
          <div class="cart-card-price">₦${item.price.toLocaleString()}</div>
          <div class="cart-card-meta">Size: ${item.size} &nbsp;|&nbsp; Color: ${item.color}</div>

          <div class="qty-control">
            <button onclick="event.stopPropagation(); decreaseCartQty(${index})" class="luxury-qty-btn">−</button>
            <span class="qty-number">${item.quantity}</span>
            <button onclick="event.stopPropagation(); increaseCartQty(${index})" class="luxury-qty-btn">+</button>
          </div>

          <div class="cart-line-total">Total: ₦${lineTotal.toLocaleString()}</div>

          <div class="cart-card-actions">
            <button class="cart-remove-btn" onclick="event.stopPropagation(); removeLineItem(${index})">
              <i class="fa-solid fa-trash"></i> Remove
            </button>
          </div>
        </div>

        <!-- edit-mode film overlay (covers entire card, only tappable thing in edit mode) -->
        ${editMode ? `
          <div class="edit-film-overlay" data-index="${index}">
            <div class="edit-film-icon">
              ${isEditPicked
                ? `<i class="fa-solid fa-circle-check"></i>`
                : `<i class="fa-regular fa-circle"></i>`}
            </div>
            <p class="edit-film-hint">${isEditPicked ? "Tap again to deselect" : "Tap to select for update"}</p>
          </div>
        ` : ""}
      `;

      /* ── checkbox click (only active when NOT in edit mode) ── */
      const selector = card.querySelector(".cart-selector");
      selector?.addEventListener("click", e => {
        e.stopPropagation();
        if (editMode) { showToast("Exit update mode first."); return; }
        const id = item.firestoreId;
        if (selectedCheckoutItems.includes(id)) {
          selectedCheckoutItems = selectedCheckoutItems.filter(x => x !== id);
          card.classList.remove("checkout-selected");
        } else {
          selectedCheckoutItems.push(id);
          card.classList.add("checkout-selected");
        }
        updateSelectAllBtn();
      });

      /* ── edit film overlay tap logic ── */
      if (editMode) {
        const film = card.querySelector(".edit-film-overlay");
        film?.addEventListener("click", e => {
  e.stopPropagation();

  document
    .querySelectorAll(".cart-product-card")
    .forEach(card => card.classList.remove("edit-picked"));

  if (selectedIndex === index) {
    exitEditMode();
    return;
  }

  selectedIndex = index;

  card.classList.add("edit-picked");

  const allIcons =
    document.querySelectorAll(".edit-film-icon");

  allIcons.forEach(icon => {
    icon.innerHTML =
      `<i class="fa-regular fa-circle"></i>`;
  });

  const currentIcon =
    film.querySelector(".edit-film-icon");

  currentIcon.innerHTML =
    `<i class="fa-solid fa-circle-check"></i>`;
});
      }

      cartItemsContainer.appendChild(card);
    });

    subtotalLabel.innerText = `₦${total.toLocaleString()}`;
    updateSelectAllBtn();

  } finally {
    renderingCart = false;
  }
}

/* ─────────────────────────────────────────────────────────
   EXIT EDIT MODE HELPER
───────────────────────────────────────────────────────── */
function exitEditMode() {

  editMode = false;
  selectedIndex = null;

  const banner =
    document.getElementById(
      "update-mode-message"
    );

  if (banner)
    banner.style.display = "none";

  document
    .querySelectorAll(".edit-film-overlay")
    .forEach(el => el.remove());

  document
    .querySelectorAll(".cart-product-card")
    .forEach(card => {

      card.classList.remove(
        "edit-mode"
      );

      card.classList.remove(
        "edit-picked"
      );
    });

  showToast(
    "Update mode closed."
  );
}

/* ─────────────────────────────────────────────────────────
   QTY CONTROLS  — FIX: guard against undefined index
───────────────────────────────────────────────────────── */
window.modifyLineQuantity = async function (index, newQty) {
  const item = firestoreCart[index];
  if (!item) return; /* guard — prevents the console error */

  const qty = Number(newQty);
  if (isNaN(qty) || qty < 1) return;

  /* optimistic UI update */
  item.quantity = qty;
  const qtyEls = cartItemsContainer?.querySelectorAll(".qty-number");
  if (qtyEls && qtyEls[index]) qtyEls[index].textContent = qty;

  try {
    await updateDoc(
      doc(db, "users", auth.currentUser.uid, "cart", item.firestoreId),
      { quantity: qty }
    );
  } catch (err) { console.error(err); }
};

window.increaseCartQty = async function (index) {
  const item = firestoreCart[index];
  if (!item) return;
  await modifyLineQuantity(index, item.quantity + 1);
};

window.decreaseCartQty = async function (index) {
  const item = firestoreCart[index];
  if (!item) return;
  if (item.quantity <= 1) return;
  await modifyLineQuantity(index, item.quantity - 1);
};

/* ─────────────────────────────────────────────────────────
   REMOVE
───────────────────────────────────────────────────────── */
window.removeLineItem = function (index) {
  showConfirmModal("Remove this item from your bag?", async () => {
    const item = firestoreCart[index];
    if (!item) return;
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "cart", item.firestoreId));
    selectedCheckoutItems = selectedCheckoutItems.filter(x => x !== item.firestoreId);
    showToast("Item removed.");
    renderTabularCart();
  });
};

/* ─────────────────────────────────────────────────────────
   SELECT ALL
───────────────────────────────────────────────────────── */
window.toggleSelectAll = function () {

  const available =
    firestoreCart.filter(i => !i.isUnavailable);

  const allSelected =
    available.every(i =>
      selectedCheckoutItems.includes(
        i.firestoreId
      )
    );

  if (allSelected) {

    selectedCheckoutItems = [];

  } else {

    selectedCheckoutItems =
      available.map(i => i.firestoreId);

  }

  document
    .querySelectorAll(".cart-product-card")
    .forEach(card => {

      const id =
        card
          .querySelector(".cart-selector")
          ?.dataset.id;

      if (!id) return;

      if (
        selectedCheckoutItems.includes(id)
      ) {
        card.classList.add(
          "checkout-selected"
        );
      } else {
        card.classList.remove(
          "checkout-selected"
        );
      }
    });

  updateSelectAllBtn();
};

/* ─────────────────────────────────────────────────────────
   NAV ACTIONS
───────────────────────────────────────────────────────── */
window.actionContinueShopping = function () { window.location.href = "/"; };

window.actionUpdateCartRedirect = async function () {
  if (firestoreCart.length === 0) return;

  if (!editMode) {
    editMode = true;

selectedIndex = null;

selectedCheckoutItems = [];

document.getElementById(
  "update-mode-message"
).style.display = "block";

document
  .querySelectorAll(".cart-product-card")
  .forEach((card,index)=>{

    card.classList.add("edit-mode");

    const overlay =
    document.createElement("div");

    overlay.className =
      "edit-film-overlay";

    overlay.innerHTML = `
      <div class="edit-film-icon">
        <i class="fa-regular fa-circle"></i>
      </div>
      <p class="edit-film-hint">
        Tap to select for update
      </p>
    `;

    overlay.addEventListener(
      "click",
      ()=>{
        document
          .querySelectorAll(
            ".cart-product-card"
          )
          .forEach(
            c=>c.classList.remove(
              "edit-picked"
            )
          );

        card.classList.add(
          "edit-picked"
        );

        selectedIndex =
          index;
      }
    );

    card.appendChild(
      overlay
    );
  });

showToast(
  "Tap a product film to select it."
);
    return;
  }

  if (selectedIndex === null) {
    showToast("Tap a product to select it first.");
    return;
  }

  const selected = firestoreCart[selectedIndex];
  if (!selected) return;

  const pSnap = await getDoc(doc(db, "products", selected.productId));
  if (!pSnap.exists())            { showToast("Product no longer exists.");        return; }
  if (pSnap.data().isSuspended)   { showToast("This product is unavailable.");     return; }
  if (selected.isUnavailable)     { showToast("This product is no longer available."); return; }

  window.location.href = `/decision-page.html?id=${selected.productId}&cartDocId=${selected.firestoreId}`;
};

window.clearCart = function () {
  showConfirmModal("Clear your entire shopping bag?", async () => {
    await backupCurrentCart();
    for (const item of firestoreCart) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "cart", item.firestoreId));
    }
    selectedCheckoutItems = [];
    renderTabularCart();
    showToast("Cart cleared.");
  });
};

window.actionProceedCheckout = function () {
  if (editMode) { showToast("Exit update mode before checking out."); return; }
  if (selectedCheckoutItems.length === 0) { showToast("Select at least one item to checkout."); return; }
  sessionStorage.setItem("selectedCheckoutItems", JSON.stringify(selectedCheckoutItems));
  window.location.href = "/checkout";
};

/* ─────────────────────────────────────────────────────────
   AUTH + REALTIME LISTENER
   Watches the user's CART — not products — to avoid the
   setDoc re-fire loop that was duplicating items.
───────────────────────────────────────────────────────── */
onAuthStateChanged(auth, user => {
  if (!user) return;
  if (cartListenerStarted) return;
  cartListenerStarted = true;

  onSnapshot(collection(db, "users", user.uid, "cart"), () => {
    if (editMode) return; /* don't interrupt edit mode */
    renderTabularCart();
  });
});

/* ─────────────────────────────────────────────────────────
   RESTORE CART
───────────────────────────────────────────────────────── */
const restoreBtn = document.getElementById("restore-cart-btn");
if (restoreBtn) {
  restoreBtn.addEventListener("click", async () => {
    const range = document.getElementById("restore-range").value;
    const backupsSnap = await getDocs(
      collection(db, "users", auth.currentUser.uid, "cart_backups")
    );

    let backups = [];
    backupsSnap.forEach(d => backups.push(d.data()));

    const now = Date.now();
    backups = backups.filter(b => {
      if (range === "all") return true;
      return now - b.createdAt <= Number(range) * 60 * 60 * 1000;
    });

    if (backups.length === 0) { showToast("No cart backups found."); return; }
    backups.sort((a, b) => b.createdAt - a.createdAt);

    for (const item of backups[0].items) {
      await addDoc(collection(db, "users", auth.currentUser.uid, "cart"), {
        productId: item.productId,
        title:     item.title,
        image:     item.image,
        price:     item.price,
        quantity:  item.quantity,
        size:      item.size,
        color:     item.color,
      });
    }
    showToast("Cart restored.");
    renderTabularCart();
  });
}
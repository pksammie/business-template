import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const cartItemsContainer = document.getElementById("cart-items-container");
const subtotalLabel = document.getElementById("summary-subtotal");

let editMode = false;
let selectedIndex = null;
let firestoreCart = [];
let renderingCart = false;
let cartListenerStarted = false;
let selectedCheckoutItems = [];

/* ── BACKUP ─────────────────────────────────────────────── */
async function backupCurrentCart() {
  const user = auth.currentUser;
  if (!user || firestoreCart.length === 0) return;

  await addDoc(collection(db, "users", user.uid, "cart_backups"), {
    createdAt: Date.now(),
    items: firestoreCart.map((item) => ({
      productId: item.productId,
      title: item.title,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })),
  });
}

/* ── RENDER ─────────────────────────────────────────────── */
async function renderTabularCart() {
  if (renderingCart) return;
  renderingCart = true;

  try {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = collection(db, "users", user.uid, "cart");
    const snap = await getDocs(cartRef);

    firestoreCart = [];

    // Step 1: load all cart items + check availability
    for (const docSnap of snap.docs) {
      const cartItem = { firestoreId: docSnap.id, ...docSnap.data() };

      try {
        const productSnap = await getDoc(doc(db, "products", cartItem.productId));
        if (!productSnap.exists()) {
          cartItem.isUnavailable = true;
        } else {
          if (productSnap.data().isSuspended) cartItem.isUnavailable = true;
        }
      } catch (err) {
        console.error(err);
      }

      firestoreCart.push(cartItem);
    }

    // Step 2: sync title/price/image + remove deleted/suspended
    // Uses updateDoc (partial) NOT setDoc (full rewrite) — avoids re-triggering onSnapshot loop
    let cartUpdated = false;

    for (const item of firestoreCart) {
      if (!item.productId) continue;

      const productSnap = await getDoc(doc(db, "products", item.productId));

      if (!productSnap.exists()) {
        await deleteDoc(doc(db, "users", user.uid, "cart", item.firestoreId));
        cartUpdated = true;
        continue;
      }

      const productData = productSnap.data();

      if (productData.isSuspended) {
        await deleteDoc(doc(db, "users", user.uid, "cart", item.firestoreId));
        cartUpdated = true;
        continue;
      }

      const fieldsToUpdate = {};
      if (item.title !== productData.title) { fieldsToUpdate.title = productData.title; item.title = productData.title; }
      if (item.price !== productData.price) { fieldsToUpdate.price = productData.price; item.price = productData.price; }
      if (item.image !== productData.image) { fieldsToUpdate.image = productData.image; item.image = productData.image; }

      if (Object.keys(fieldsToUpdate).length > 0) {
        await updateDoc(doc(db, "users", user.uid, "cart", item.firestoreId), fieldsToUpdate);
        cartUpdated = true;
      }
    }

    if (!cartItemsContainer) return;

    if (cartUpdated) {
      showToast("Cart refreshed with latest product info.");
      setTimeout(() => renderTabularCart(), 150);
      return;
    }

    // Step 3: render
    if (firestoreCart.length === 0) {
      cartItemsContainer.innerHTML = `<div class="empty-cart">Your shopping bag is empty.</div>`;
      subtotalLabel.innerText = "₦0";
      return;
    }

    cartItemsContainer.innerHTML = "";
    let total = 0;

    firestoreCart.forEach((item, index) => {
      if (item.isUnavailable) return;

      const lineTotal = item.price * item.quantity;
      total += lineTotal;

      const isSelected = selectedCheckoutItems.includes(item.firestoreId);
      const isEditSelected = selectedIndex === index;

      const card = document.createElement("div");
      card.className = "cart-product-card";
      if (isSelected) card.classList.add("selected");
      if (editMode) card.classList.add("edit-mode");
      if (isEditSelected) card.classList.add("selected");

      card.innerHTML = `
        <!-- Checkbox -->
        <div class="cart-selector">
          <i class="fa-solid fa-check"></i>
        </div>

        <!-- Image -->
        <img src="${item.image}" class="cart-card-image" alt="${item.title}">

        <!-- Details -->
        <div class="cart-card-content">
          <div class="cart-card-title">${item.title}</div>
          <div class="cart-card-price">₦${item.price.toLocaleString()}</div>
          <div class="cart-card-meta">Size: ${item.size}</div>
          <div class="cart-card-meta">Color: ${item.color}</div>

          <div class="cart-card-meta">
            <div class="qty-control">
              <button onclick="event.stopPropagation(); decreaseCartQty(${index})" class="luxury-qty-btn">−</button>
              <span class="qty-number">${item.quantity}</span>
              <button onclick="event.stopPropagation(); increaseCartQty(${index})" class="luxury-qty-btn">+</button>
            </div>
          </div>

          <div class="cart-card-meta" style="color:var(--primary-color); font-weight:600;">
            Total: ₦${lineTotal.toLocaleString()}
          </div>

          ${editMode ? `
            <div class="cart-update-overlay">
              <div class="edit-selector">
                ${isEditSelected
                  ? `<i class="fa-solid fa-circle-check"></i>`
                  : `<i class="fa-solid fa-pen-to-square"></i>`}
              </div>
            </div>
          ` : ""}

          <div class="cart-card-actions">
            <button class="clear-cart-btn" onclick="removeLineItem(${index})">
              <i class="fa-solid fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `;

      // Edit mode — click card to select
      if (editMode) {
  card.addEventListener("click", () => {

if(
selectedIndex === index
){

selectedIndex = null;

editMode = false;

document
.getElementById(
"update-mode-message"
).style.display = "none";

document
.querySelectorAll(
".cart-product-card"
)
.forEach(el =>
el.classList.remove(
"selected"
)
);

showToast(
"Update mode closed."
);

return;
}

document
.querySelectorAll(
".cart-product-card"
)
.forEach(el =>
el.classList.remove(
"selected"
)
);

card.classList.add(
"selected"
);

selectedIndex = index;

});
}

      // Checkbox toggle
      const selectBtn = card.querySelector(".cart-selector");
      selectBtn?.addEventListener(
"click",
(event)=>{

event.stopPropagation();

if(editMode){

showToast(
"Finish update mode first."
);

return;
}

const id =
item.firestoreId;

if(
selectedCheckoutItems.includes(id)
){

selectedCheckoutItems =
selectedCheckoutItems.filter(
x => x !== id
);

card.classList.remove(
"checkout-selected"
);

}
else{

selectedCheckoutItems.push(id);

card.classList.add(
"checkout-selected"
);

}

}
);

      cartItemsContainer.appendChild(card);
    });

    subtotalLabel.innerText = `₦${total.toLocaleString()}`;

  } finally {
    renderingCart = false;
  }
}

/* ── QTY CONTROLS ───────────────────────────────────────── */
window.modifyLineQuantity = async function (index, newQty) {
  const qty = Number(newQty);
  if (isNaN(qty) || qty < 1) return;

  await updateDoc(
    doc(db, "users", auth.currentUser.uid, "cart", firestoreCart[index].firestoreId),
    { quantity: qty }
  );

  renderTabularCart();
};

window.increaseCartQty = async function (index) {
  await modifyLineQuantity(index, firestoreCart[index].quantity + 1);
};

window.decreaseCartQty = async function (index) {
  if (firestoreCart[index].quantity <= 1) return;
  await modifyLineQuantity(index, firestoreCart[index].quantity - 1);
};

/* ── REMOVE ITEM ────────────────────────────────────────── */
window.removeLineItem = function (index) {
  showConfirmModal("Remove this item from your bag?", async () => {
    await deleteDoc(
      doc(db, "users", auth.currentUser.uid, "cart", firestoreCart[index].firestoreId)
    );
    showToast("Item removed.");
    renderTabularCart();
  });
};

/* ── NAV ACTIONS ────────────────────────────────────────── */
window.actionContinueShopping = function () {
  window.location.href = "/";
};

window.actionUpdateCartRedirect = async function () {
  if (firestoreCart.length === 0) return;

  if (!editMode) {

editMode = true;

selectedIndex = null;

/*
TURN OFF CHECKOUT SELECTIONS
*/

selectedCheckoutItems = [];

document
.getElementById(
"update-mode-message"
).style.display = "block";

showToast(
"Select a product to update."
);

renderTabularCart();

return;
}

  if (selectedIndex === null) {
    showToast("Please select a product to update.");
    return;
  }

  const productSnap = await getDoc(
    doc(db, "products", firestoreCart[selectedIndex].productId)
  );

  if (!productSnap.exists()) { showToast("Product no longer exists."); return; }
  if (productSnap.data().isSuspended) { showToast("This product is unavailable."); return; }
  if (firestoreCart[selectedIndex].isUnavailable) { showToast("This product is no longer available."); return; }

  window.location.href = `/decision-page.html?id=${firestoreCart[selectedIndex].productId}&cartDocId=${firestoreCart[selectedIndex].firestoreId}`;
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

if(editMode){

showToast(
"Finish updating your product first."
);

return;

}

if (
selectedCheckoutItems.length === 0
){

showToast(
"Select at least one item."
);

return;

}

sessionStorage.setItem(
"selectedCheckoutItems",
JSON.stringify(
selectedCheckoutItems
)
);

window.location.href =
"/checkout";

};

/* ── AUTH + REALTIME LISTENER ───────────────────────────── */
// Listens to user's CART (not products collection).
// Watching products caused the duplicate bug — every sync write
// would re-fire the listener and re-run renderTabularCart in a loop.
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  if (cartListenerStarted) return;
  cartListenerStarted = true;

  onSnapshot(collection(db, "users", user.uid, "cart"), () => {
    renderTabularCart();
  });
});

/* ── RESTORE CART ───────────────────────────────────────── */
const restoreBtn = document.getElementById("restore-cart-btn");

if (restoreBtn) {
  restoreBtn.addEventListener("click", async () => {
    const range = document.getElementById("restore-range").value;

    const backupsSnap = await getDocs(
      collection(db, "users", auth.currentUser.uid, "cart_backups")
    );

    let backups = [];
    backupsSnap.forEach((d) => backups.push(d.data()));

    const now = Date.now();
    backups = backups.filter((b) => {
      if (range === "all") return true;
      return now - b.createdAt <= Number(range) * 60 * 60 * 1000;
    });

    if (backups.length === 0) { showToast("No cart backups found."); return; }

    backups.sort((a, b) => b.createdAt - a.createdAt);

    for (const item of backups[0].items) {
      await addDoc(collection(db, "users", auth.currentUser.uid, "cart"), {
        productId: item.productId,
        title: item.title,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      });
    }

    showToast("Cart restored.");
    renderTabularCart();
  });
}
import { db, auth } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params =
new URLSearchParams(location.search);

const id =
params.get("id");

const cartDocId =
params.get("cartDocId");

let product;

const sizeWrapper = document.getElementById("size-options-wrapper");
const colorWrapper = document.getElementById("color-options-wrapper"); // optional
const descriptionBox = document.getElementById("decision-description");

async function load() {
  if (!id) return;

  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return;

  product = snap.data();

  const remaining =

(product.quantity || 0)

-

(product.sold || 0);

const stockText =
document.getElementById("stock-left");

stockText.textContent =
`${remaining} available`;

if (remaining <= 0) {

    stockText.style.color = "#ff4d4d";

} else if (remaining < 4) {

    stockText.style.color = "orange";

} else {

    stockText.style.color = "lime";

}

const soldBadge =
document.getElementById(
"sold-out-badge"
);

const addBtn =
document.querySelector(
".add-to-cart-btn"
);

if(remaining <= 0){

    soldBadge.style.display =
    "inline-block";

    addBtn.disabled = true;

    addBtn.textContent =
    "Sold Out";

}else{

    soldBadge.style.display =
    "none";
}

  document.getElementById("decision-title").textContent = product.title;
  document.getElementById("decision-price").textContent = "₦" + product.price;
  document.getElementById("decision-product-img").src = product.image || "https://via.placeholder.com/600x600?text=No+Image";
  descriptionBox.textContent = product.description;

  /* ---------------- SIZES ---------------- */
  sizeWrapper.innerHTML = "";

  const sizes =
Array.isArray(product.sizes)
? product.sizes
: [];

  if (sizes.includes("None")) {
    sizeWrapper.style.display = "none";
  } else {
    sizeWrapper.style.display = "flex";

    sizes.forEach(size => {
      sizeWrapper.innerHTML += `
        <label class="size-radio-chip">
          <input type="radio" name="size" value="${size}">
          <span>${size}</span>
        </label>
      `;
    });
  }

  /* ---------------- COLORS (SAFE OPTIONAL) ---------------- */
  if (colorWrapper) {
    colorWrapper.innerHTML = "";

    const colors =
Array.isArray(product.colors)
? product.colors
: [];

    if (colors.includes("None")) {
      colorWrapper.style.display = "none";
    } else {
      colorWrapper.style.display = "flex";

      colors.forEach(color => {
        colorWrapper.innerHTML += `
          <label class="size-radio-chip">
            <input type="radio" name="color" value="${color}">
            <span>${color}</span>
          </label>
        `;
      });
    }
  }
}

/* ---------------- CART ---------------- */

window.submitToCartBag = async function () {

  if (!product) {
    showToast("Please wait, product is still loading.");
    return;
  }

  const productSnap = await getDoc(
    doc(db,"products",productId)
);

if(!productSnap.exists()){

    showToast(
        "This product is no longer available."
    );

    setTimeout(()=>{

        location.href="/";

    },1500);

    return;
}

const latestProduct =
latestSnap.data();

if(latestProduct.isEditing){

    showToast(
        "This product is currently being updated by the administrator. Please try again shortly."
    );

    return;
}

if(latestProduct.isSuspended){

    showToast(
        "This product is unavailable."
    );

    return;
}

  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];

  const colors = Array.isArray(product.colors)
    ? product.colors
    : [];

  const selectedSize =
    document.querySelector(
      'input[name="size"]:checked'
    );

  const selectedColor =
    document.querySelector(
      'input[name="color"]:checked'
    );

  /* REQUIRE SIZE */
  if (
    !sizes.includes("None") &&
    !selectedSize
  ) {
    showToast("Please select a size.");
    return;
  }

  /* REQUIRE COLOR */
  if (
    !colors.includes("None") &&
    !selectedColor
  ) {
    showToast("Please select a color.");
    return;
  }

  const qty = Number(
    document.getElementById("item-quantity").value
  );

  const remaining =
    (product.quantity || 0) -
    (product.sold || 0);

  if (remaining <= 0) {

    addBtn.disabled = true;
addBtn.textContent = "Sold Out";

    return;
}

  if (qty > remaining) {
    showToast(
      "Only " +
      remaining +
      " left in stock"
    );
    return;
  }

  const user = auth.currentUser;

if (!user) {

    showToast("Please login first.");

    location.href = "/login";

    return;
}

const updatedItem = {

    productId: id,

    title: product.title,

    price: product.price,

    image: product.image,

    size: selectedSize
        ? selectedSize.value
        : "None",

    color: selectedColor
        ? selectedColor.value
        : "None",

    quantity: qty
};

const cartRef =
collection(
    db,
    "users",
    user.uid,
    "cart"
);

const cartSnap =
await getDocs(cartRef);

let existingDoc = null;

cartSnap.forEach(docSnap => {

    const item = docSnap.data();

    if (

        item.productId === updatedItem.productId &&

        item.size === updatedItem.size &&

        item.color === updatedItem.color

    ) {

        existingDoc = docSnap;

    }

});

if (cartDocId) {

    await updateDoc(
        doc(
            db,
            "users",
            user.uid,
            "cart",
            cartDocId
        ),
        updatedItem
    );

} else {

    if (existingDoc) {

        await updateDoc(
            existingDoc.ref,
            {
                quantity:
                    existingDoc.data().quantity +
                    updatedItem.quantity
            }
        );

    } else {

        await addDoc(
            cartRef,
            updatedItem
        );
    }
}

  const toast = document.createElement("div");

toast.className = "toast";

toast.textContent = "✓ Added to cart";

document.body.appendChild(toast);

setTimeout(()=>{
    toast.remove();
},2500);

setTimeout(()=>{
    location.href="/cart";
},1000);
};

load();
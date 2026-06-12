import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params =
new URLSearchParams(location.search);

const id =
params.get("id");

const editIndex =
params.get("editIndex");

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

document.getElementById(
"stock-left"
).innerHTML =

`${remaining} available`;

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

window.submitToCartBag = function () {

  if (!product) {
    alert("Please wait, product is still loading.");
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
    alert("Please select a size.");
    return;
  }

  /* REQUIRE COLOR */
  if (
    !colors.includes("None") &&
    !selectedColor
  ) {
    alert("Please select a color.");
    return;
  }

  const qty = Number(
    document.getElementById("item-quantity").value
  );

  const remaining =
    (product.quantity || 0) -
    (product.sold || 0);

  if (remaining <= 0) {

    document.getElementById(
        "add-to-cart-btn"
    ).disabled = true;

    document.getElementById(
        "add-to-cart-btn"
    ).textContent = "Sold Out";

    return;
}

  if (qty > remaining) {
    alert(
      "Only " +
      remaining +
      " left in stock"
    );
    return;
  }

  let cart =
    JSON.parse(
      localStorage.getItem("vanguard_cart")
    ) || [];

  const updatedItem = {
    id: id,
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

if (editIndex !== null) {
    cart[editIndex] = updatedItem;
} else {
    const existingIndex =
cart.findIndex(item=>

    item.id===updatedItem.id &&

    item.size===
    updatedItem.size &&

    item.color===
    updatedItem.color

);

if(existingIndex>-1){

    cart[existingIndex].quantity +=
    updatedItem.quantity;

}else{

    cart.push(updatedItem);

}
}

  localStorage.setItem(
    "vanguard_cart",
    JSON.stringify(cart)
);

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
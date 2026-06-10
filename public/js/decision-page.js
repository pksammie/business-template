import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const id = new URLSearchParams(location.search).get("id");

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
          <input type="checkbox" name="size" value="${size}">
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
            <input type="checkbox" name="color" value="${color}">
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

  const selectedSizes =
[
...document.querySelectorAll(
'input[name="size"]:checked'
)
].map(el=>el.value);

  const selectedColors =
[
...document.querySelectorAll(
'input[name="color"]:checked'
)
].map(el=>el.value);

/* REQUIRE SIZE */
if (
  !sizes.includes("None") &&
  selectedSizes.length === 0
) {
  alert("Please select at least one size.");
  return;
}

/* REQUIRE COLOR */
if (
  !colors.includes("None") &&
  selectedColors.length === 0
) {
  alert("Please select at least one color.");
  return;
}

  const qty = Number(
    document.getElementById("item-quantity").value
  );

  const remaining =
    (product.quantity || 0) -
    (product.sold || 0);

  if (remaining <= 0) {

    alert("This product is sold out.");
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

  cart.push({
    id: id,
    title: product.title,
    price: product.price,
    image: product.image,
    size:
selectedSizes.length
? selectedSizes
: ["None"],

color:
selectedColors.length
? selectedColors
: ["None"],
    quantity: qty
  });

  localStorage.setItem(
    "vanguard_cart",
    JSON.stringify(cart)
  );

  alert("Added to cart");

  location.href = "/cart";
};

load();
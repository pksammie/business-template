import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params = new URLSearchParams(location.search);

const id = params.get("id");

const cartDocId = params.get("cartDocId");

let product;

let addingToCart = false;

const sizeWrapper = document.getElementById("size-options-wrapper");
const colorWrapper = document.getElementById("color-options-wrapper"); // optional
const descriptionBox = document.getElementById("decision-description");

async function loadReviews(){

    const reviewsContainer =
    document.getElementById(
        "reviews-container"
    );

    if(!reviewsContainer)
    return;

    const q =
    query(

        collection(
            db,
            "reviews"
        ),

        where(
            "productId",
            "==",
            id
        ),

        orderBy(
            "createdAt",
            "desc"
        )

    );

    const snap =
    await getDocs(q);

    reviewsContainer.innerHTML = "";

    if (snap.empty) {

    reviewsContainer.innerHTML = `

        <div class="no-review-card">

            No reviews yet.

            Be the first to review this product.

        </div>

    `;

    return;

}

snap.forEach((docSnap)=>{

    const review = docSnap.data();

    reviewsContainer.innerHTML += `

        <div class="review-card">

            <div class="review-stars">

                ${generateStars(review.rating)}

            </div>

            <div class="review-avatar">

    ${review.customerName.charAt(0).toUpperCase()}

</div>

            <div class="review-name">

    ${review.customerName}

</div>

<div class="review-date">

    ${new Date(review.createdAt).toLocaleDateString(
        "en-NG",
        {
            day:"numeric",
            month:"short",
            year:"numeric"
        }
    )}

</div>

            <div class="verified-badge">

                ✔ Verified Purchase

            </div>

            <p>

    “${review.reviewText}”

</p>

        </div>

    `;

});

}

async function load() {
  if (!id) return;

  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return;

  product = snap.data();

  document.getElementById(
    "product-stars"
).innerHTML =
generateStars(
    product.averageRating || 0
);

document.getElementById(
    "product-review-count"
).innerText =
`${product.reviewCount || 0} Reviews`;

  saveRecentlyViewed(id);

  /* PRODUCT SUSPENSION CHECK */

  if (product.isSuspended) {
    showToast("This product is currently unavailable.");

    setTimeout(() => {
      location.href = "/";
    }, 1500);

    return;
  }

  const remaining = (product.quantity || 0) - (product.sold || 0);

  const stockText = document.getElementById("stock-left");

  stockText.textContent = `${remaining} available`;

  if (remaining <= 0) {
    stockText.style.color = "#ff4d4d";
  } else if (remaining < 4) {
    stockText.style.color = "orange";
  } else {
    stockText.style.color = "lime";
  }

  const soldBadge = document.getElementById("sold-out-badge");

  const addBtn = document.querySelector(".add-to-cart-btn");

  if (remaining <= 0) {
    soldBadge.style.display = "inline-block";

    addBtn.disabled = true;

    addBtn.textContent = "Sold Out";
  } else {
    soldBadge.style.display = "none";

    addBtn.disabled = false;

    addBtn.textContent = "Add To Cart";
  }

  document.getElementById("decision-title").textContent = product.title;
  document.getElementById("decision-price").textContent = "₦" + product.price;
  document.getElementById("decision-product-img").src =
    product.image || "https://via.placeholder.com/600x600?text=No+Image";
  descriptionBox.textContent = product.description;

  /* ---------------- SIZES ---------------- */
  sizeWrapper.innerHTML = "";

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  if (sizes.includes("None")) {
    sizeWrapper.style.display = "none";
  } else {
    sizeWrapper.style.display = "flex";

    sizes.forEach((size) => {
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

    const colors = Array.isArray(product.colors) ? product.colors : [];

    if (colors.includes("None")) {
      colorWrapper.style.display = "none";
    } else {
      colorWrapper.style.display = "flex";

      colors.forEach((color) => {
        colorWrapper.innerHTML += `
          <label class="size-radio-chip">
            <input type="radio" name="color" value="${color}">
            <span>${color}</span>
          </label>
        `;
      });
    }
  }

loadRelatedProducts(id);

loadRecentlyViewed();

loadReviews();
}

function generateStars(rating){

    let stars = "";

    const rounded =
    Math.round(rating);

    for(let i=1;i<=5;i++){

        stars +=
        i <= rounded
        ? "★"
        : "☆";

    }

    return stars;

}

async function loadRelatedProducts(currentProductId){

    const relatedGrid =
    document.getElementById(
        "related-products-grid"
    );

    if(!relatedGrid) return;

    const snap = await getDocs(
  collection(db, "products")
);

const products = [];

snap.forEach((docSnap) => {
  products.push({
    id: docSnap.id,
    ...docSnap.data()
  });
});

relatedGrid.innerHTML = "";

let count = 0;

products.forEach((item) => {

        if(count >= 8) return;

        if(item.id === currentProductId)
        return;

        if(item.isSuspended)
        return;

        count++;

        const card =
        document.createElement("div");

        card.className =
        "product-card";

        card.innerHTML = `
            <img
                src="${item.image}"
                class="product-image"
            >

            <div class="product-info">

                <h3 class="product-title">
                    ${item.title}
                </h3>

                <div class="product-rating">

    <span class="rating-stars">

        ${generateStars(
            item.averageRating || 0
        )}

    </span>

    <span class="rating-count">

        (${item.reviewCount || 0})

    </span>

</div>

                <div class="product-price">
                    ₦${Number(item.price)
                        .toLocaleString()}
                </div>

            </div>
        `;

        card.onclick = ()=>{

            location.href =
            "/decision-page.html?id=" +
            item.id;

        };

        relatedGrid.appendChild(card);

    });

}

window.increaseQty = function () {
  const qty = document.getElementById("item-quantity");

  qty.value = Number(qty.value) + 1;
};

window.decreaseQty = function () {
  const qty = document.getElementById("item-quantity");

  if (Number(qty.value) > 1) {
    qty.value = Number(qty.value) - 1;
  }
};

/* ---------------- CART ---------------- */
window.submitToCartBag = async function () {
  if (addingToCart) {
    return;
  }

  addingToCart = true;

  try {
    if (!product) {
      showToast("Please wait, product is still loading.");
      return;
    }

    const latestSnap = await getDoc(doc(db, "products", id));

    if (!latestSnap.exists()) {
      showToast("This product is no longer available.");

      setTimeout(() => {
        location.href = "/";
      }, 1500);

      return;
    }

    const latestProduct = latestSnap.data();

    const latestRemaining =
      (latestProduct.quantity || 0) - (latestProduct.sold || 0);

    if (latestRemaining <= 0) {
      showToast("This product is sold out.");

      return;
    }

    product = latestProduct;

    if (latestProduct.isEditing) {
      const started = latestProduct.editingStartedAt || 0;

      const age = Date.now() - started;

      /*
    10 minutes
    */

      if (age < 600000) {
        showToast(
          "This product is currently being updated by the administrator. Please try again shortly.",
        );

        return;
      } else {
        /*
        stale lock
        auto release
        */

        await updateDoc(
          doc(db, "products", id),

          {
            isEditing: false,
          },
        );
      }
    }

    if (latestProduct.isSuspended) {
      showToast("This product is unavailable.");

      return;
    }

    const sizes = Array.isArray(product.sizes) ? product.sizes : [];

    const colors = Array.isArray(product.colors) ? product.colors : [];

    const selectedSize = document.querySelector('input[name="size"]:checked');

    const selectedColor = document.querySelector('input[name="color"]:checked');

    /* REQUIRE SIZE */
    if (!sizes.includes("None") && !selectedSize) {
      showToast("Please select a size.");
      return;
    }

    /* REQUIRE COLOR */
    if (!colors.includes("None") && !selectedColor) {
      showToast("Please select a color.");
      return;
    }

    const qty = Number(document.getElementById("item-quantity").value);

    const remaining = (product.quantity || 0) - (product.sold || 0);

    const addBtn = document.querySelector(".add-to-cart-btn");

    if (remaining <= 0) {
      addBtn.disabled = true;
      addBtn.textContent = "Sold Out";

      return;
    }

    if (qty > remaining) {
      showToast("Only " + remaining + " left in stock");
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

      title: latestProduct.title,

      price: latestProduct.price,

      image: latestProduct.image,

      size: selectedSize ? selectedSize.value : "None",

      color: selectedColor ? selectedColor.value : "None",

      quantity: qty,
    };

    const cartRef = collection(db, "users", user.uid, "cart");

    const cartSnap = await getDocs(cartRef);

    let existingDoc = null;

    cartSnap.forEach((docSnap) => {
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
        doc(db, "users", user.uid, "cart", cartDocId),
        updatedItem,
      );
    } else {
      if (existingDoc) {
        await updateDoc(existingDoc.ref, {
          quantity: existingDoc.data().quantity + updatedItem.quantity,
        });
      } else {
        await addDoc(cartRef, updatedItem);
      }
    }

    const toast = document.createElement("div");

    toast.className = "toast";

    toast.textContent = "✓ Added to cart";

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);

    setTimeout(() => {
      location.href = "/cart";
    }, 1000);
  } finally {
    addingToCart = false;
  }
};

function saveRecentlyViewed(productId){

    let viewed =
    JSON.parse(
        localStorage.getItem(
            "recentlyViewed"
        )
    ) || [];

    viewed =
    viewed.filter(
        item => item !== productId
    );

    viewed.unshift(productId);

    viewed =
    viewed.slice(0,8);

    localStorage.setItem(
        "recentlyViewed",
        JSON.stringify(viewed)
    );

}

async function loadRecentlyViewed(){

    const grid =
    document.getElementById(
        "recently-viewed-grid"
    );

    if(!grid) return;

    const viewed =
    JSON.parse(
        localStorage.getItem(
            "recentlyViewed"
        )
    ) || [];

    grid.innerHTML = "";

    for(const productId of viewed){

        if(productId === id)
        continue;

        const snap =
        await getDoc(
            doc(
                db,
                "products",
                productId
            )
        );

        if(!snap.exists())
        continue;

        const item = {
            id:snap.id,
            ...snap.data()
        };

        const card =
        document.createElement("div");

        card.className =
        "product-card";

        card.innerHTML = `

            <img
                src="${item.image}"
                class="product-image"
            >

            <div class="product-info">

                <h3 class="product-title">
                    ${item.title}
                </h3>

                <div class="product-rating">

    <span class="rating-stars">

        ${generateStars(
            item.averageRating || 0
        )}

    </span>

    <span class="rating-count">

        (${item.reviewCount || 0})

    </span>

</div>

                <div class="product-price">
                    ₦${Number(item.price)
                        .toLocaleString()}
                </div>

            </div>

        `;

        card.onclick = ()=>{

            location.href =
            "/decision-page.html?id=" +
            item.id;

        };

        grid.appendChild(card);

    }

}

load();

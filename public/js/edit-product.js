import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { createDropdown } from "./timeless-dropdown.js";

const params    = new URLSearchParams(location.search);
const productId = params.get("id");
const form      = document.getElementById("edit-product-form");
const uploadBox = document.getElementById("upload-image-box");

let uploadedImages = [];
let previousStock = {};
let previousPrice = null;
let selectedCategory = "";

const categoryDropdown = createDropdown({
  container: document.getElementById("prod-category-mount"),
  placeholder: "Select Category",
  options: [
    { value: "Tops", label: "Tops" },
    { value: "Bottoms", label: "Bottoms" },
    { value: "Dresses", label: "Dresses" },
    { value: "Outerwear", label: "Outerwear" },
    { value: "Shoes", label: "Shoes" },
    { value: "Bags", label: "Bags" },
    { value: "Accessories", label: "Accessories" },
  ],
  onChange: (value) => {
    selectedCategory = value;
  },
});

async function loadProduct() {
  try {
    const snap = await getDoc(doc(db, "products", productId));

    if (!snap.exists()) {
      showToast("Product not found.");
      location.href = "/admin";
      return;
    }

    const product = snap.data();

    previousStock = { ...(product.stock || {}) };
    previousPrice = Number(product.price);

    document.getElementById("prod-title").value = product.title;
    document.getElementById("prod-price").value = product.price;
    selectedCategory = product.category || "";
    categoryDropdown.setValue(product.category || null);
    document.querySelectorAll(".size-stock-input").forEach(input => {

      const size = input.dataset.size;

      input.value = product.stock?.[size] || 0;

  });

    // ─────────────────────────────────────────────────────────────

    document.getElementById("prod-desc").value = product.description;

    uploadedImages = [...(product.images || [])];

  // Backward compatibility
  if (
  uploadedImages.length === 0 &&
  product.image
  ){
      uploadedImages.push(product.image);
  }

  renderImageGallery();

  document.querySelectorAll('input[name="prod_sizes"]').forEach(box => {

      box.checked =
          (product.sizes || []).includes(box.value);

  });

    document.querySelectorAll('input[name="prod_colors"]').forEach(box => {
      box.checked = (product.colors || []).includes(box.value);
    });

    syncSizeStockVisibility();

  } catch (err) {
    console.error(err);
    showToast("Couldn't load this product. Please try again.");
  } finally {
    const loadingScreen = document.getElementById("admin-loading-screen");
    if (loadingScreen) loadingScreen.style.display = "none";
  }
}

loadProduct();

/* ---------------- NONE LOGIC CONTROL ---------------- */

const sizeBoxes = document.querySelectorAll('input[name="prod_sizes"]');

function syncSizeStockVisibility(){

  sizeBoxes.forEach((cb) => {

    const row = cb.closest(".size-stock-row");

    if (row) row.classList.toggle("size-active", cb.checked);

  });

}

sizeBoxes.forEach((box) => {
  box.addEventListener("change", () => {
    const noneBox = document.querySelector(
      'input[name="prod_sizes"][value="None"]',
    );

    if (box.value === "None" && box.checked) {
      sizeBoxes.forEach((cb) => {
        if (cb !== noneBox) {
          cb.checked = false;
        }
      });
    } else if (noneBox) {
      noneBox.checked = false;
    }

    syncSizeStockVisibility();
  });
});

const colorBoxes = document.querySelectorAll('input[name="prod_colors"]');

colorBoxes.forEach((box) => {
  box.addEventListener("change", () => {
    const noneBox = document.querySelector(
      'input[name="prod_colors"][value="None"]',
    );

    if (box.value === "None" && box.checked) {
      colorBoxes.forEach((cb) => {
        if (cb !== noneBox) {
          cb.checked = false;
        }
      });
    } else if (noneBox) {
      noneBox.checked = false;
    }
  });
});

function renderImageGallery(){

uploadBox.innerHTML = "";

uploadedImages.forEach((url,index)=>{

const imageCard=document.createElement("div");

imageCard.className="uploaded-image-card";

imageCard.innerHTML=`

<img
src="${url}"
class="uploaded-image-preview"
>

<button
type="button"
class="remove-image-btn"
id="remove-image-btn"
data-index="${index}">

<i class="fa-solid fa-xmark"></i>

</button>

`;

uploadBox.appendChild(imageCard);

});

const addButton=document.createElement("div");

addButton.className="upload-image-placeholder";

addButton.innerHTML=`

<i class="fa-solid fa-plus"></i>

<p>Add Image</p>

`;

uploadBox.appendChild(addButton);

addButton.onclick=openUploader;

document.querySelectorAll(".remove-image-btn")

.forEach(button=>{

button.onclick=()=>{

const index=Number(button.dataset.index);

uploadedImages.splice(index,1);

renderImageGallery();

};

});

}

let cloudinaryWidgetLoading = false;

function showUploadLoader(){

    cloudinaryWidgetLoading = true;

    let overlay = uploadBox.querySelector(".upload-loading-overlay");

    if(!overlay){

        overlay = document.createElement("div");

        overlay.className = "upload-loading-overlay";

        overlay.innerHTML = `
            <div class="upload-spinner"></div>
            <p>Opening uploader...</p>
        `;

        uploadBox.appendChild(overlay);

    }

    overlay.style.display = "flex";

}

function hideUploadLoader(){

    cloudinaryWidgetLoading = false;

    const overlay = uploadBox.querySelector(".upload-loading-overlay");

    if(overlay) overlay.style.display = "none";

}

function openUploader(){

if(uploadedImages.length>=8){

showToast("Maximum of 8 images allowed.");

return;

}

if(cloudinaryWidgetLoading) return;

showUploadLoader();

cloudinary.openUploadWidget(

{

cloudName:"dzkyhxdy9",

uploadPreset:"products",

multiple:false

},

(error,result)=>{

if(result && (result.event === "show" || result.event === "display-changed")){

    hideUploadLoader();

}

if(error){

    hideUploadLoader();

    return;

}

if(result.event==="success"){

uploadedImages.push(

result.info.secure_url

);

renderImageGallery();

}

if(result.event==="close"){

    hideUploadLoader();

}

}

);

setTimeout(hideUploadLoader, 6000);

}

/* ── RELEASE LOCK ON LEAVE ────────────────────────────────── */
window.addEventListener("beforeunload", async () => {
  if (!productId) return;
  try {
    await updateDoc(doc(db, "products", productId), { isEditing: false });
  } catch (err) { console.error(err); }
});

document.getElementById("back-admin-btn").addEventListener("click", async e => {
  e.preventDefault();
  await updateDoc(doc(db, "products", productId), { isEditing: false });
  location.href = "/admin";
});

/* ── SAVE ─────────────────────────────────────────────────── */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!selectedCategory) {
    showToast("Please select a category.");
    return;
  }

  const colors = [...document.querySelectorAll("input[name='prod_colors']:checked")].map(el => el.value);
  const sizes  = [...document.querySelectorAll("input[name='prod_sizes']:checked")].map(el => el.value);
  const stock = {};

document.querySelectorAll(".size-stock-row.size-active .size-stock-input").forEach(input => {

    stock[input.dataset.size] =
        Number(input.value) || 0;

});

  const newPrice = Number(document.getElementById("prod-price").value);
  const priceChanged = newPrice !== previousPrice;

  await updateDoc(doc(db, "products", productId), {

    title: document.getElementById("prod-title").value,

    price: newPrice,

    category: selectedCategory,

    stock,

    description: document.getElementById("prod-desc").value,

    images: uploadedImages,

image: uploadedImages[0] || "",

    sizes,

    colors,

    isEditing: false

});

  // Sizes that went from 0 (or untracked) to actually having stock --
  // notify anyone who asked to be told when this size came back.
  const restockedSizes = Object.keys(stock).filter(
    size => (previousStock[size] || 0) <= 0 && stock[size] > 0,
  );

  if (restockedSizes.length) {
    notifyWaitingCustomers(restockedSizes).catch(err => {
      console.error(err);
      showToast("Product saved, but notifying waitlisted customers failed. Check the console.");
    });
  }

  // Anything that actually changes whether someone still wants to buy it --
  // notify everyone with this item in their cart right now, whether
  // they're online to see it live or not (persisted notification either way).
  const stockChanged = Object.keys(stock).some(
    size => (previousStock[size] || 0) !== (stock[size] || 0),
  );

  if (priceChanged || stockChanged) {
    notifyCartCustomersOfChange({ priceChanged, newPrice }).catch(err => console.error(err));
  }

  showToast("Product updated successfully.");
  location.href = "/admin";
});

async function notifyCartCustomersOfChange({ priceChanged, newPrice }) {
  const productTitle = document.getElementById("prod-title").value;

  const cartMatches = await getDocs(
    query(collectionGroup(db, "cart"), where("productId", "==", productId)),
  );

  const affectedUserIds = new Set();

  cartMatches.forEach(docSnap => {
    // path is users/{uid}/cart/{itemId} -- parent.parent gets us back to the user doc
    const uid = docSnap.ref.parent.parent?.id;
    if (uid) affectedUserIds.add(uid);
  });

  const messageParts = [];
  if (priceChanged) messageParts.push(`the price is now ₦${Number(newPrice).toLocaleString()}`);
  messageParts.push("availability may have changed");

  for (const uid of affectedUserIds) {
    await addDoc(collection(db, "user_notifications"), {
      userId: uid,
      productId,
      productTitle,
      productImage: uploadedImages[0] || "",
      status: "Item In Your Cart Changed",
      message: `${productTitle} in your cart was just updated -- ${messageParts.join(" and ")}. Still want to purchase it?`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

async function notifyWaitingCustomers(restockedSizes) {
  const productTitle = document.getElementById("prod-title").value;

  const allRequests = await getDocs(
    query(
      collection(db, "stock_notifications"),
      where("productId", "==", productId),
    ),
  );

  const toNotify = allRequests.docs.filter(docSnap => {
    const data = docSnap.data();
    return data.notified === false && restockedSizes.includes(data.size);
  });

  for (const docSnap of toNotify) {
    const request = docSnap.data();

    try {
      await addDoc(collection(db, "user_notifications"), {
        userId: request.userId,
        productId,
        productTitle,
        productImage: uploadedImages[0] || "",
        status: "Back In Stock",
        message: `${productTitle} (size ${request.size}) is back in stock!`,
        read: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "stock_notifications", docSnap.id), {
        notified: true,
      });
    } catch (err) {
      // Don't let one failed notification block the rest of the batch.
      console.error("Failed to notify a waiting customer", err);
    }
  }
}
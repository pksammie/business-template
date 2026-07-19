import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { createDropdown } from "./timeless-dropdown.js";

const params    = new URLSearchParams(location.search);
const productId = params.get("id");
const form      = document.getElementById("edit-product-form");
const uploadBox = document.getElementById("upload-image-box");

let uploadedImages = [];
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
    document.body.classList.remove("scroll-locked");
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

  await updateDoc(doc(db, "products", productId), {

    title: document.getElementById("prod-title").value,

    price: Number(document.getElementById("prod-price").value),

    category: selectedCategory,

    stock,

    description: document.getElementById("prod-desc").value,

    images: uploadedImages,

image: uploadedImages[0] || "",

    sizes,

    colors,

    isEditing: false

});

  showToast("Product updated successfully.");
  location.href = "/admin";
});
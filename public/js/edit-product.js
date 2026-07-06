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

let uploadedImages = [];

async function loadProduct() {
  const snap = await getDoc(doc(db, "products", productId));

  if (!snap.exists()) {
    showToast("Product not found.");
    location.href = "/admin";
    return;
  }

  const product = snap.data();

  document.getElementById("prod-title").value = product.title;
  document.getElementById("prod-price").value = product.price;
  document.getElementById("stock-s").value = product.stock?.S || 0;
document.getElementById("stock-m").value = product.stock?.M || 0;
document.getElementById("stock-l").value = product.stock?.L || 0;
document.getElementById("stock-xl").value = product.stock?.XL || 0;

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
    box.checked = (product.sizes || []).includes(box.value);
  });

  document.querySelectorAll('input[name="prod_colors"]').forEach(box => {
    box.checked = (product.colors || []).includes(box.value);
  });
}

loadProduct();

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

function openUploader(){

if(uploadedImages.length>=8){

showToast("Maximum of 8 images allowed.");

return;

}

cloudinary.openUploadWidget(

{

cloudName:"dzkyhxdy9",

uploadPreset:"products",

multiple:false

},

(error,result)=>{

if(

!error &&

result &&

result.event==="success"

){

uploadedImages.push(

result.info.secure_url

);

renderImageGallery();

}

}

);

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

  const colors = [...document.querySelectorAll("input[name='prod_colors']:checked")].map(el => el.value);
  const sizes  = [...document.querySelectorAll("input[name='prod_sizes']:checked")].map(el => el.value);
  const stock = {
    S: Number(document.getElementById("stock-s").value) || 0,
    M: Number(document.getElementById("stock-m").value) || 0,
    L: Number(document.getElementById("stock-l").value) || 0,
    XL: Number(document.getElementById("stock-xl").value) || 0
};

  await updateDoc(doc(db, "products", productId), {

    title: document.getElementById("prod-title").value,

    price: Number(document.getElementById("prod-price").value),

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
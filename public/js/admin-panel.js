import { auth, db } from "./firebase.js";

import { fireLuxuryConfetti } from "./confetti.js";

import { createDropdown } from "./timeless-dropdown.js";

import {
collection,
getDocs,
addDoc,
doc,
deleteDoc,
getDoc,
updateDoc,
increment,
onSnapshot,
query,
orderBy,
serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let confirmCallback = null;
let firstOrderLoad=true;
let allOrders = [];
let filteredOrders = [];
let currentOrdersPage = 1;
let allProducts = [];
let filteredProducts = [];
let currentProductsPage = 1;

const PRODUCTS_PER_PAGE = 10;

let productSearchTerm = "";

let allReviews=[];

let filteredReviews=[];

let reviewSearchTerm="";

let currentReviewPage=1;

const REVIEWS_PER_PAGE=8;

const ORDERS_PER_PAGE = 10;

function playNotification() {
  if (!window.__timelessAudioUnlocked) return;
  const sound = new Audio("/sounds/notification.wav");
  sound.volume = 1;
  sound.play().catch(() => {});
}

async function createUserNotification(order, status, message) {

    await addDoc(collection(db, "user_notifications"), {

        userId: order.userId,

        orderId: order.id,

        productId: order.productId,

        productTitle: order.productTitle,

        productImage: order.productImage,

        status,

        message,

        read: false,

        createdAt: serverTimestamp()

    });

}

function showLiveOrderNotification(customer){

const popup=document.getElementById("live-order-notification");

const text=document.getElementById("live-order-text");

text.innerHTML=`${customer} just placed an order.`;

popup.classList.add("show");

playNotification();

setTimeout(()=>{

popup.classList.remove("show");

},5000);

}

function celebrateDelivery(){

    fireLuxuryConfetti();

    const revenueCard=document.getElementById("revenue-count");

    revenueCard.parentElement.classList.add("revenue-celebrate");

    setTimeout(()=>{

        revenueCard.parentElement.classList.remove("revenue-celebrate");

    },900);

}

function showVanguardConfirm(message, callback) {
  confirmCallback = callback;

  document.getElementById("vanguard-modal-message").textContent = message;

  document.getElementById("vanguard-confirm-modal").classList.add("show");
}

document
  .getElementById("vanguard-modal-cancel")
  .addEventListener("click", () => {
    document.getElementById("vanguard-confirm-modal").classList.remove("show");

    confirmCallback = null;
  });

document
  .getElementById("vanguard-modal-confirm")
  .addEventListener("click", () => {
    document.getElementById("vanguard-confirm-modal").classList.remove("show");

    if (confirmCallback) {
      confirmCallback();
    }

    confirmCallback = null;
  });

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user) => {

  const adminBody =
    document.getElementById("admin-body");

  if (!user) {
    location.href = "/login";
    return;
  }

  try {

    const adminDoc =
      await getDoc(
        doc(db, "admins", user.uid)
      );

    if (!adminDoc.exists()) {

      location.href = "/";
      return;

    }

    document.getElementById(
    "admin-loading-screen"
).style.display = "none";

    document.body.classList.remove("scroll-locked");

  }

  catch(err){

    location.href = "/";

  }

});

/* ---------------- ELEMENTS ---------------- */

const adminForm = document.getElementById("admin-product-form");
const tableBody = document.getElementById("admin-inventory-table-body");

let uploadedImageUrls = [];
let ordersSearchTerm = "";
let selectedProductCategory = "";

const categoryDropdownMount = document.getElementById("prod-category-mount");

const categoryDropdown = categoryDropdownMount
  ? createDropdown({
      container: categoryDropdownMount,
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
        selectedProductCategory = value;
      },
    })
  : null;

const uploadBox = document.getElementById("upload-image-box");

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

if (uploadBox) {
  uploadBox.onclick = () => {

    if(cloudinaryWidgetLoading) return;

    showUploadLoader();

    cloudinary.openUploadWidget(
{
    cloudName: "dzkyhxdy9",
    uploadPreset: "products",
    multiple: true,
    maxFiles: 8,
    resourceType: "image",
    clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
    sources: ["local", "camera", "url"],
    theme: "minimal"
},
(error, result) => {

    if(result && (result.event === "show" || result.event === "display-changed")){

        hideUploadLoader();

    }

    if(error){

        hideUploadLoader();

        return;

    }

    if(result.event === "success"){

        uploadedImageUrls.push(result.info.secure_url);

        renderUploadedImages();

    }

    if(result.event === "close"){

        hideUploadLoader();

    }

});

    /* failsafe in case the widget doesn't fire a show/display event */
    setTimeout(hideUploadLoader, 6000);

  };
}

function renderUploadedImages(){

    uploadBox.innerHTML = "";

    if(uploadedImageUrls.length === 0){

        uploadBox.innerHTML = `
            <div class="upload-placeholder">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <p>Upload Product Image</p>
            </div>
        `;

        return;

    }

    uploadedImageUrls.forEach((url,index)=>{

        uploadBox.innerHTML += `

        <div class="uploaded-image-item">

            <img
                src="${url}"
                class="uploaded-image-preview"
            >

            <button
                type="button"
                class="remove-upload-image"
                index="remove-upload-image"
                onclick="removeUploadedImage(${index},event)"
            >

                <i class="fa-solid fa-xmark"></i>

            </button>

        </div>

        `;

    });

}

window.removeUploadedImage = function(index,event){

    if(event){

        event.stopPropagation();

    }

    uploadedImageUrls.splice(index,1);

    renderUploadedImages();

}

/* ---------------- NONE LOGIC CONTROL ---------------- */

// sizes
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
    } else {
      noneBox.checked = false;
    }

    syncSizeStockVisibility();
  });
});

syncSizeStockVisibility();

// colors
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
    } else {
      noneBox.checked = false;
    }
  });
});

function loadDashboardStats() {
  onSnapshot(
    collection(db, "products"),

    (productsSnap) => {
      document.getElementById("products-count").innerText = productsSnap.size;
    },
  );

  onSnapshot(
    collection(db, "cart_reservations"),

    (ordersSnap) => {
      let revenue = 0;

      let pending = 0;

      ordersSnap.forEach((docSnap) => {
        const order = docSnap.data();

        if (order.status === "Delivered") {
          revenue += order.total || 0;
        }

        if (order.status === "Pending") {
          pending++;
        }
      });

      document.getElementById("orders-count").innerText = ordersSnap.size;

      document.getElementById("pending-count").innerText = pending;

      const revenueEl = document.getElementById("revenue-count");

      const fullFormatted = `₦${revenue.toLocaleString()}`;

      if (revenue >= 10_000_000) {

        revenueEl.innerText = `₦${formatCompactRevenue(revenue)}`;

        revenueEl.title = fullFormatted;

        revenueEl.classList.add("revenue-abbreviated");

      } else {

        revenueEl.innerText = fullFormatted;

        revenueEl.removeAttribute("title");

        revenueEl.classList.remove("revenue-abbreviated");

      }
    },
  );
}

function formatCompactRevenue(amount){

    const formatted = new Intl.NumberFormat("en-US", {

        notation: "compact",

        compactDisplay: "short",

        maximumFractionDigits: 1

    }).format(amount);

    return formatted
        .replace("K","k")
        .replace("M","m")
        .replace("B","b");
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

/* ---------------- LOAD INVENTORY ---------------- */

function loadInventory() {
  onSnapshot(
    collection(db, "products"),

    (snap) => {
      tableBody.innerHTML = "";

      allProducts = [];

      snap.forEach((docSnap) => {
        allProducts.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      allProducts.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

      filteredProducts = allProducts.filter(product=>{

    if(!productSearchTerm) return true;

    return (

        (product.title||"")
        .toLowerCase()
        .includes(productSearchTerm)

    );

});

renderProductsPage(currentProductsPage);

    },
  );
}

function renderProductsPage(page){

    tableBody.innerHTML="";

    currentProductsPage=page;

    const start=(page-1)*PRODUCTS_PER_PAGE;

    const end=start+PRODUCTS_PER_PAGE;

    const pageProducts=filteredProducts.slice(start,end);

    pageProducts.forEach((p)=>{

        const card=document.createElement("div");

        card.className="product-admin-card";

        card.innerHTML = `
<img src="${p.image}" class="admin-card-image">

<div class="admin-card-content">

<h4>${p.title}</h4>

<div class="product-rating">

<span class="rating-stars">
${generateStars(p.averageRating || 0)}
</span>

<span class="rating-count">
(${p.reviewCount || 0})
</span>

</div>

<p>₦${Number(p.price).toLocaleString()}</p>

<small>
S:${p.stock?.S||0}
&nbsp;&nbsp;
M:${p.stock?.M||0}
&nbsp;&nbsp;
L:${p.stock?.L||0}
&nbsp;&nbsp;
XL:${p.stock?.XL||0}
</small>

<div class="admin-card-actions">

<button onclick="editProduct('${p.id}')" class="edit-btn">
Edit
</button>

<button
onclick="toggleSuspension('${p.id}',${p.isSuspended?false:true})"
class="${p.isSuspended?"unsuspend-btn":"suspend-btn"}">

${p.isSuspended?"Unsuspend":"Suspend"}

</button>

<button
onclick="deleteProduct('${p.id}')"
class="delete-btn">

Delete

</button>

</div>

</div>
`;

        tableBody.appendChild(card);

    });

    renderProductsPagination();

}

function renderProductsPagination(){

    const container=document.getElementById("products-pagination");

    if(!container) return;

    const totalPages=Math.ceil(filteredProducts.length/PRODUCTS_PER_PAGE);

    if(totalPages<=1){

        container.innerHTML="";

        return;

    }

    let html="";

    html+=`
    <button
    ${currentProductsPage===1?"disabled":""}
    onclick="changeProductsPage(${currentProductsPage-1})">
    ‹
    </button>
    `;

    for(let i=1;i<=totalPages;i++){

        html+=`
        <button
        class="${i===currentProductsPage?"active":""}"
        onclick="changeProductsPage(${i})">
        ${i}
        </button>
        `;

    }

    html+=`
    <button
    ${currentProductsPage===totalPages?"disabled":""}
    onclick="changeProductsPage(${currentProductsPage+1})">
    ›
    </button>
    `;

    container.innerHTML=html;

}

window.changeProductsPage=function(page){

    renderProductsPage(page);

}

const productSearch=document.getElementById("products-search");

if(productSearch){

productSearch.addEventListener("input",()=>{

productSearchTerm=

productSearch.value

.toLowerCase()

.trim();

filteredProducts = allProducts.filter(product => {

    if(!productSearchTerm) return true;

    return (product.title || "")
        .toLowerCase()
        .includes(productSearchTerm);

});

renderProductsPage(1);

});

}

function loadOrders() {
  const body = document.getElementById("orders-body");

  if (!body) return;

  onSnapshot(
    collection(db, "cart_reservations"),

    (snap) => {
      body.innerHTML = "";

      const orders = [];

      snap.forEach((docSnap) => {
        orders.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      orders.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

allOrders = orders;

filteredOrders = allOrders.filter(order=>{

    if(!ordersSearchTerm) return true;

    return(

        (order.customerName||"").toLowerCase().includes(ordersSearchTerm)

        ||

        (order.phone||"").toLowerCase().includes(ordersSearchTerm)

        ||

        (order.productTitle||"").toLowerCase().includes(ordersSearchTerm)

    );

});

renderOrdersPage(currentOrdersPage);

      if(!firstOrderLoad){

snap.docChanges().forEach(change => {

    if(change.type === "added"){

        const order = change.doc.data();

        showLiveOrderNotification(order.customerName);

    }

});

}

firstOrderLoad=false;

    },
  );
}

function renderOrdersPage(page) {
    const body = document.getElementById("orders-body");
    body.innerHTML = "";

    currentOrdersPage = page;
    const start = (page - 1) * ORDERS_PER_PAGE;
    const end = start + ORDERS_PER_PAGE;
    const pageOrders = filteredOrders.slice(start, end);

    pageOrders.forEach(order => {
        body.innerHTML += renderOrderCard(order);
    });

    renderOrdersPagination();
}

function renderOrderCard(order) {
    return `
    <div class="order-admin-card">
        <div class="order-status">
            <span style="
                display:inline-block;
                padding:6px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:700;
                background:${getStatusColor(order.status)};
                color: ${getStatusTextColor(order.status)};
            ">
                ${order.status || "Pending"}
            </span>
        </div>
        <div class="order-customer">
            <strong>Customer:</strong><br>
            ${order.customerName}
        </div>
        <div class="order-phone">
            <strong>Phone:</strong><br>
            ${order.phone}
        </div>
        <div class="order-product" style="display:flex; align-items:center; gap:12px; margin-top:15px;">
            <img
src="${order.productImage || "/images/placeholder.jpg"}"
                style="
                    width:70px;
                    height:70px;
                    object-fit:cover;
                    border-radius:10px;
                    flex-shrink:0;
                "
            >
            <div>
                <div style="font-weight:600; margin-bottom:5px;">
                    ${order.productTitle}
                </div>
                <small style="color:var(--text-muted);">
                    ${order.productColor || "N/A"} • ${order.productSize || "N/A"}
                </small>
            </div>
        </div>
        <div style="margin-top:15px;">
            <strong>Quantity:</strong> ${order.quantity}
        </div>
        <div style="margin-top:20px; display:flex; flex-wrap:wrap; gap:10px;">
            ${renderActionButtons(order)}
        </div>
    </div>`;
}

function getStatusColor(status) {
    switch(status) {
        case "Pending": return "#c5a880";
        case "Approved": return "#28a745";
        case "Delivery In Progress": return "#ff9800";
        case "Delivered": return "#17a2b8";
        case "Cancelled": return "#ff4d4d";
        default: return "#ccc";
    }
}

function getStatusTextColor(status) {
    if (status === "Pending") return "#000";
    return "#fff";
}

function renderActionButtons(order) {
    if(order.status === "Pending") {
        return `
            <button onclick="approveOrder('${order.id}')" style="flex:1; min-width:120px; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Approve</button>
            <button onclick="cancelOrder('${order.id}')" style="flex:1; min-width:120px; background:#ff4d4d; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Cancel</button>
        `;
    }
    if(order.status === "Approved") {
        return `
            <button onclick="startDelivery('${order.id}')" style="width:100%; background:#ff9800; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Delivery In Progress</button>
        `;
    }
    if(order.status === "Delivery In Progress") {
        return `
            <button onclick="deliverOrder('${order.id}')" style="width:100%; background:#17a2b8; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Mark as Delivered</button>
        `;
    }
    if(order.status === "Delivered") {
        return `<div style="width:100%; text-align:center; color:#17a2b8; font-weight:700; padding:12px;">✓ Delivered</div>`;
    }
    if(order.status === "Cancelled") {
        return `<div style="width:100%; text-align:center; color:#ff4d4d; font-weight:700; padding:12px;">✕ Cancelled</div>`;
    }
}

function renderOrdersPagination(){

    const container = document.getElementById("orders-pagination");

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

    if(totalPages <= 1){

        container.innerHTML = "";

        return;

    }

    let html = "";

    html += `
    <button
    ${currentOrdersPage===1?"disabled":""}
    onclick="changeOrdersPage(${currentOrdersPage-1})">
    ‹
    </button>
    `;

    for(let i=1;i<=totalPages;i++){

        html += `
        <button
        class="${i===currentOrdersPage?"active":""}"
        onclick="changeOrdersPage(${i})">
        ${i}
        </button>
        `;

    }

    html += `
    <button
    ${currentOrdersPage===totalPages?"disabled":""}
    onclick="changeOrdersPage(${currentOrdersPage+1})">
    ›
    </button>
    `;

    container.innerHTML = html;

}

window.changeOrdersPage = function(page){

    renderOrdersPage(page);

}

window.startDelivery = async function(id) {
  const reservationRef = doc(db,"cart_reservations",id);

const reservationSnap = await getDoc(reservationRef);

const reservation = reservationSnap.data();

await updateDoc(
reservationRef,
{
status:"Delivery In Progress"
}
);

await createUserNotification(

{
...reservation,
id
},

"Delivery In Progress",

"Your order is on its way."

);

  showToast("Order is now on delivery.");
};

window.approveOrder = async function (id) {

    showVanguardConfirm("Approve this order?", async () => {

        const reservationRef = doc(db,"cart_reservations",id);

        const reservationSnap = await getDoc(reservationRef);

        if(!reservationSnap.exists()) return;

        const reservation = reservationSnap.data();

        if(reservation.stockDeducted){

            showToast(
"This order has already been approved."
);

            return;

        }

        const productRef = doc(db,"products",reservation.productId);

        const productSnap = await getDoc(productRef);

        if(!productSnap.exists()){

            showToast("Product no longer exists.");

            return;

        }

        const product = productSnap.data();

        const size = reservation.productSize;
        const isSizeless = size === "None";

        if (!isSizeless) {

            const currentStock = product.stock?.[size] || 0;

            if(currentStock < reservation.quantity){

                showToast("Not enough stock remaining.");

                return;

            }

            await updateDoc(productRef,{

                [`stock.${size}`]: increment(-reservation.quantity),

                sold: increment(reservation.quantity)

            });

        } else {

            await updateDoc(productRef,{

                sold: increment(reservation.quantity)

            });

        }

        await updateDoc(reservationRef,{

            status:"Approved",

            stockDeducted: !isSizeless

        });

        await createUserNotification(

    {
        ...reservation,
        id
    },

    "Approved",

    "Your order has been approved."

);

        showToast("Order approved.");

    });

};

window.deliverOrder = async function (id) {
  const reservationRef = doc(db,"cart_reservations",id);

const reservationSnap = await getDoc(reservationRef);

const reservation = reservationSnap.data();

await updateDoc(
reservationRef,
{
status:"Delivered"
}
);

await createUserNotification(

{
...reservation,
id
},

"Delivered",

"Your order has been delivered."

);

  celebrateDelivery();

showToast("Order Delivered Successfully!");

};

window.cancelOrder = async function(id){

showVanguardConfirm(

"Cancel this order?",

async()=>{

const reservationRef=doc(db,"cart_reservations",id);

const reservationSnap=await getDoc(reservationRef);

if(!reservationSnap.exists()) return;

const reservation=reservationSnap.data();

if(reservation.stockDeducted){

const productRef=doc(db,"products",reservation.productId);

await updateDoc(productRef,{

[`stock.${reservation.productSize}`]:

increment(reservation.quantity),

sold:

increment(-reservation.quantity)

});

}

await updateDoc(reservationRef,{

status:"Cancelled",

stockDeducted:false

});

await createUserNotification(

    {
        ...reservation,
        id
    },

    "Cancelled",

    "Unfortunately your order was cancelled."

);

showToast("Order cancelled.");

}

);

}

window.deleteOrder=function(id){

showVanguardConfirm(

"Delete this order?",

async()=>{

const reservationRef=doc(db,"cart_reservations",id);

const reservationSnap=await getDoc(reservationRef);

if(!reservationSnap.exists()) return;

const reservation=reservationSnap.data();

if(reservation.stockDeducted){

const productRef=doc(db,"products",reservation.productId);

await updateDoc(productRef,{

[`stock.${reservation.productSize}`]:

increment(reservation.quantity),

sold:

increment(-reservation.quantity)

});

}

await deleteDoc(reservationRef);

await createUserNotification(

    {
        ...reservation,
        id
    },

    "Order Removed",

    "Your order was removed by our team. Contact support if you believe this was a mistake."

);

showToast("Order deleted.");

}

);

}

/* ---------------- ADD PRODUCT ---------------- */

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("prod-title").value;
  const price = Number(document.getElementById("prod-price").value);
  const category = selectedProductCategory;
  const description = document.getElementById("prod-desc").value;
  const stock = {};

  if (!category) {
    showToast("Please select a category.");
    return;
  }

  document.querySelectorAll(".size-stock-row.size-active .size-stock-input").forEach((input) => {
    stock[input.dataset.size] = Number(input.value) || 0;
  });

  const colors = [
    ...document.querySelectorAll("input[name='prod_colors']:checked"),
  ].map((el) => el.value);

  const sizes = [
    ...document.querySelectorAll("input[name='prod_sizes']:checked"),
  ].map((el) => el.value);

  const finalColors = colors.includes("None") ? ["None"] : colors;
  const finalSizes = sizes.includes("None") ? ["None"] : sizes;

  if(uploadedImageUrls.length === 0){

    showToast("Please upload at least one product image.");

    return;

}

  await addDoc(collection(db, "products"), {
    title,
    price,
    category,
    image: uploadedImageUrls[0],

images: uploadedImageUrls,
    description,
    sizes: finalSizes,
    colors: finalColors,
    stock,
    sold: 0,
    reviewCount:0,
    averageRating:0,
    totalRating:0,
    isSuspended: false,
    isEditing: false,
    createdAt: Date.now(),
  });

  showToast("Product added!");

  adminForm.reset();
  selectedProductCategory = "";
  categoryDropdown?.setValue(null);

  uploadedImageUrls = [];

  /* Reset upload box */
  uploadBox.innerHTML = `
<div class="upload-placeholder">

<i class="fa-solid fa-cloud-arrow-up"></i>

<p>Upload Product Images</p>

</div>
`;

});

/* ---------------- DELETE ---------------- */

window.toggleSuspension = async function (id, status) {
  await updateDoc(doc(db, "products", id), {
    isSuspended: status,
  });
};

window.deleteProduct = function (id) {
  showVanguardConfirm("Delete this product?", async () => {
    await deleteDoc(doc(db, "products", id));

    showToast("Product deleted.");
  });
};

window.editProduct = async function (id) {
  await updateDoc(doc(db, "products", id), {
    isEditing: true,
    editingStartedAt: Date.now(),
  });

  location.href =
`/edit-product.html?id=${id}`;
};

const ordersSearchInput = document.getElementById("orders-search");

if (ordersSearchInput) {
  ordersSearchInput.addEventListener("input", () => {
    ordersSearchTerm = ordersSearchInput.value.toLowerCase().trim();

    filteredOrders = allOrders.filter(order => {

    if(!ordersSearchTerm) return true;

    return (
        (order.customerName || "").toLowerCase().includes(ordersSearchTerm) ||
        (order.phone || "").toLowerCase().includes(ordersSearchTerm) ||
        (order.productTitle || "").toLowerCase().includes(ordersSearchTerm)
    );

});

renderOrdersPage(1);
  });
}

function loadReviews(){

const grid=document.getElementById("admin-reviews-grid");

if(!grid) return;

const q=query(

collection(db,"reviews"),

orderBy("createdAt","desc")

);

onSnapshot(q,(snapshot)=>{

allReviews=[];

snapshot.forEach(docSnap=>{

allReviews.push({
id:docSnap.id,
...docSnap.data()
});

});

filteredReviews = allReviews.filter(review => {

    if(!reviewSearchTerm) return true;

    return (
        (review.customerName || "").toLowerCase().includes(reviewSearchTerm) ||
        (review.productTitle || "").toLowerCase().includes(reviewSearchTerm) ||
        (review.reviewText || "").toLowerCase().includes(reviewSearchTerm)
    );

});

renderReviewsPage(currentReviewPage);

});

}

function renderReviewsPage(page){

const grid=document.getElementById("admin-reviews-grid");

if(!grid) return;

grid.innerHTML="";

currentReviewPage=page;

const start=(page-1)*REVIEWS_PER_PAGE;

const end=start+REVIEWS_PER_PAGE;

const pageReviews=filteredReviews.slice(start,end);

pageReviews.forEach(review=>{

grid.innerHTML+=renderReviewCard(review);

});

renderReviewsPagination();

}

function renderReviewsPagination(){

const container=document.getElementById("reviews-pagination");

if(!container) return;

const totalPages=Math.ceil(filteredReviews.length/REVIEWS_PER_PAGE);

if(totalPages<=1){

container.innerHTML="";

return;

}

let html="";

html+=`
<button
${currentReviewPage===1?"disabled":""}
onclick="changeReviewPage(${currentReviewPage-1})">
‹
</button>
`;

for(let i=1;i<=totalPages;i++){

html+=`
<button
class="${i===currentReviewPage?"active":""}"
onclick="changeReviewPage(${i})">
${i}
</button>
`;

}

html+=`
<button
${currentReviewPage===totalPages?"disabled":""}
onclick="changeReviewPage(${currentReviewPage+1})">
›
</button>
`;

container.innerHTML=html;

}

window.changeReviewPage=function(page){

renderReviewsPage(page);

}

const reviewSearchInput=document.getElementById("reviews-search");

if(reviewSearchInput){

reviewSearchInput.addEventListener("input",()=>{

reviewSearchTerm=

reviewSearchInput.value

.toLowerCase()

.trim();

filteredReviews = allReviews.filter(review => {

    if(!reviewSearchTerm) return true;

    return (
        (review.customerName || "").toLowerCase().includes(reviewSearchTerm) ||
        (review.productTitle || "").toLowerCase().includes(reviewSearchTerm) ||
        (review.reviewText || "").toLowerCase().includes(reviewSearchTerm)
    );

});

renderReviewsPage(1);

});

}

function renderReviewCard(review){

const isPending = review.approved === false;

return `

<div class="order-admin-card review-admin-card-item">

<div class="review-card-header">

<h3>${review.customerName || "Customer"}</h3>

${
(isPending || review.featured)
?
`
<div class="review-badges-row">

${isPending ? `<span class="review-status-badge pending-badge"><i class="fa-solid fa-hourglass-half"></i> Pending Approval</span>` : ""}

${review.featured ? `<span class="review-status-badge featured-badge"><i class="fa-solid fa-star"></i> Featured</span>` : ""}

</div>
`
:
""
}

</div>

<p><strong>Product:</strong> ${review.productTitle || ""}</p>

<p><strong>Rating:</strong> <span class="review-card-stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span></p>

<p class="review-card-text">${review.reviewText}</p>

${
review.adminReply
?
`
<div class="admin-review-reply-box">

<strong><i class="fa-solid fa-reply"></i> Admin Reply</strong>

<p>${review.adminReply}</p>

</div>
`
:
`
<textarea
id="reply-${review.id}"
class="admin-reply-textarea"
placeholder="Write admin reply..."></textarea>

<button
class="post-reply-btn"
onclick="replyToReview('${review.id}')">
Post Reply
</button>
`
}

<div class="review-admin-actions">

${
isPending
?
`
<button
class="approve-review-btn"
onclick="approveReview('${review.id}')">
<i class="fa-solid fa-check"></i> Approve
</button>
`
:
""
}

<button
class="feature-review-btn ${review.featured ? "remove-featured" : ""}"
onclick="toggleFeaturedReview('${review.id}',${review.featured ? false : true})">

${review.featured ? "Remove Featured" : "Feature Review"}

</button>

</div>

</div>

`;

}

window.approveReview = async function(id){

showVanguardConfirm(

"Approve this review?",

async()=>{

await updateDoc(

doc(db,"reviews",id),

{

approved:true

}

);

const review = allReviews.find(r => r.id === id);

/* this review was never folded into the product's aggregate stats at
   creation time (it started out pending) — add it now */
if (review && review.productId) {

    try {
        const productRef = doc(db, "products", review.productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const pd = productSnap.data();
            const newCount = (pd.reviewCount || 0) + 1;
            const newTotal = (pd.totalRating || 0) + review.rating;

            await updateDoc(productRef, {
                reviewCount: newCount,
                totalRating: newTotal,
                averageRating: newTotal / newCount,
            });
        }
    } catch (err) {
        console.error(err);
    }

}

if (review && review.userId) {

    try {
        await addDoc(collection(db, "user_notifications"), {

            userId: review.userId,

            type: "review_approved",

            productId: review.productId || null,

            productTitle: review.productTitle || "your product",

            productImage: review.productImage || "",

            status: "Your Review Has Been Approved",

            message: `Thank you for sharing your feedback on "${review.productTitle || "your product"}". We've reviewed your submission and it's now live. We take every piece of feedback seriously and appreciate you helping us improve.`,

            read: false,

            createdAt: serverTimestamp(),

        });
    } catch (err) {
        console.error(err);
    }

}

showToast("Review approved.");

}

);

}

window.replyToReview = async function(id){

const textarea =
document.getElementById(`reply-${id}`);

const reply =
textarea.value.trim();

if(!reply){

showToast("Write a reply first.");

return;

}

await updateDoc(

doc(db,"reviews",id),

{

adminReply:reply,

adminReplyDate:Date.now()

}

);

const review = allReviews.find(r => r.id === id);

if (review && review.userId) {
    try {
        await addDoc(collection(db, "user_notifications"), {
            userId: review.userId,
            type: "review_reply",
            productId: review.productId || null,
            productTitle: review.productTitle || "your product",
            productImage: review.productImage || "",
            status: "We Replied To Your Review",
            message: `We replied to your review on "${review.productTitle || "your product"}": "${reply}"`,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.error(err);
    }
}

showToast("Reply posted.");

}

window.toggleFeaturedReview=async function(id,state){

showVanguardConfirm(

state

?

"Feature this review?"

:

"Remove featured review?",

async()=>{

await updateDoc(

doc(db,"reviews",id),

{

featured:state

}

);

const review = allReviews.find(r => r.id === id);

if (review && review.userId) {
    try {
        await addDoc(collection(db, "user_notifications"), {
            userId: review.userId,
            type: "review_featured",
            productId: review.productId || null,
            productTitle: review.productTitle || "your product",
            productImage: review.productImage || "",
            status: state ? "Your Review Was Featured" : "Review Unfeatured",
            message: state
                ? `Your review on "${review.productTitle || "your product"}" is now featured for other shoppers to see. Thank you!`
                : `Your review on "${review.productTitle || "your product"}" is no longer featured.`,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.error(err);
    }
}

showToast(

state

?

"Review featured."

:

"Removed from featured."

);

}

);

}

/* ---------------- COMPLAINTS ---------------- */

let allComplaints = [];

function loadComplaints(){

const grid = document.getElementById("admin-complaints-grid");

if(!grid) return;

const q = query(

collection(db,"complaints"),

orderBy("createdAt","desc")

);

onSnapshot(q,(snapshot)=>{

allComplaints = [];

snapshot.forEach(docSnap=>{

allComplaints.push({
id: docSnap.id,
...docSnap.data()
});

});

renderComplaintsGrid();

});

}

function renderComplaintsGrid(){

const grid = document.getElementById("admin-complaints-grid");

if(!grid) return;

grid.innerHTML="";

// open complaints first, then resolved
const sorted = [...allComplaints].sort((a,b)=>{

    if(a.status === b.status) return 0;

    return a.status === "Resolved" ? 1 : -1;

});

sorted.forEach(complaint=>{

grid.innerHTML += renderComplaintCard(complaint);

});

const badge = document.getElementById("complaints-open-badge");

const openCount = allComplaints.filter(c => c.status !== "Resolved").length;

if(badge){

    if(openCount > 0){

        badge.style.display="inline-block";

        badge.innerText = `${openCount} open`;

    }else{

        badge.style.display="none";

    }

}

if(allComplaints.length === 0){

    grid.innerHTML = `<p style="opacity:.6;">No complaints filed yet.</p>`;

}

}

function renderComplaintCard(complaint){

const isResolved = complaint.status === "Resolved";

return `

<div class="order-admin-card review-admin-card-item">

<div class="review-card-header">

<h3>${complaint.subject || "Complaint"}</h3>

<div class="review-badges-row">

<span class="review-status-badge ${isResolved ? "featured-badge" : "pending-badge"}">

${isResolved ? `<i class="fa-solid fa-check"></i> Resolved` : `<i class="fa-solid fa-hourglass-half"></i> Open`}

</span>

</div>

</div>

${complaint.orderId ? `<p><strong>Order ID:</strong> ${complaint.orderId}</p>` : ""}

${complaint.productTitle ? `<p><strong>Product:</strong> ${complaint.productTitle}</p>` : ""}

<p class="review-card-text">${complaint.message || ""}</p>

${
complaint.adminReply
?
`
<div class="admin-review-reply-box">

<strong><i class="fa-solid fa-reply"></i> Your Reply</strong>

<p>${complaint.adminReply}</p>

</div>
`
:
`
<textarea

id="complaint-reply-${complaint.id}"

class="admin-reply-textarea"

placeholder="Write a reply and resolve..."></textarea>

<button

class="post-reply-btn"

onclick="resolveComplaint('${complaint.id}')">

Send Reply &amp; Resolve

</button>
`
}

</div>

`;

}

window.resolveComplaint = async function(id){

const textarea = document.getElementById(`complaint-reply-${id}`);

const reply = textarea?.value.trim();

if(!reply){

showToast("Write a reply first.");

return;

}

const complaint = allComplaints.find(c => c.id === id);

await updateDoc(

doc(db,"complaints",id),

{

adminReply: reply,

adminReplyDate: Date.now(),

status: "Resolved"

}

);

if(complaint && complaint.userId){

    try {
        await addDoc(collection(db, "user_notifications"), {
            userId: complaint.userId,
            type: "complaint_resolved",
            orderId: complaint.orderId || null,
            productId: complaint.productId || null,
            productTitle: complaint.productTitle || "your complaint",
            productImage: complaint.productImage || "",
            status: "Your Complaint Was Answered",
            message: `Regarding "${complaint.subject || "your complaint"}": ${reply}`,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.error(err);
    }

}

showToast("Reply sent and complaint resolved.");

}

loadInventory();

loadOrders();

loadReviews();

loadComplaints();

loadDashboardStats();
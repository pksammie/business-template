import { auth, db } from "./firebase.js";

import { fireLuxuryConfetti } from "./confetti.js";

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
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let confirmCallback = null;
let firstOrderLoad=true;
const notificationSound = new Audio("/sounds/notification.mp3");

function showLiveOrderNotification(customer){

const popup=document.getElementById("live-order-notification");

const text=document.getElementById("live-order-text");

text.innerHTML=`${customer} just placed an order.`;

popup.classList.add("show");

notificationSound.currentTime=0;

notificationSound.play().catch(()=>{});

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

  }

  catch(err){

    location.href = "/";

  }

});

/* ---------------- ELEMENTS ---------------- */

const adminForm = document.getElementById("admin-product-form");
const tableBody = document.getElementById("admin-inventory-table-body");

let uploadedImageUrl = "";
let ordersSearchTerm = "";

const uploadBox = document.getElementById("upload-image-box");

if (uploadBox) {
  uploadBox.onclick = () => {
    cloudinary.openUploadWidget(
      {
        cloudName: "dzkyhxdy9",

        uploadPreset: "products",

        multiple: false,
      },

      (error, result) => {
        if (!error && result && result.event === "success") {
          uploadedImageUrl = result.info.secure_url;

          uploadBox.innerHTML = `
<img
src="${uploadedImageUrl}"
style="
width:100%;
height:180px;
object-fit:cover;
border-radius:8px;
">
`;
        }
      },
    );
  };
}

/* ---------------- NONE LOGIC CONTROL ---------------- */

// sizes
const sizeBoxes = document.querySelectorAll('input[name="prod_sizes"]');

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
  });
});

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

      document.getElementById("revenue-count").innerText =
        `₦${revenue.toLocaleString()}`;
    },
  );
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

      const products = [];

      snap.forEach((docSnap) => {
        products.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      products.forEach((p) => {
        const card = document.createElement("div");

        card.className = "product-admin-card";

        card.innerHTML = `
    <img src="${p.image}" class="admin-card-image">

    <div class="admin-card-content">

        <h4>${p.title}</h4>

        <div class="product-rating">

    <span class="rating-stars">

        ${generateStars(
    p.averageRating || 0
)}

    </span>

    <span class="rating-count">

        (${p.reviewCount || 0})

    </span>

</div>

        <p>₦${Number(p.price).toLocaleString()}</p>

        <small>

S:
${p.stock?.S || 0}

&nbsp;&nbsp;

M:
${p.stock?.M || 0}

&nbsp;&nbsp;

L:
${p.stock?.L || 0}

&nbsp;&nbsp;

XL:
${p.stock?.XL || 0}

</small>

        <div class="admin-card-actions">

<button
onclick="editProduct('${p.id}')"
class="edit-btn">

Edit

</button>

<button
onclick="toggleSuspension('${p.id}',
${p.isSuspended ? false : true}
)"
class="${p.isSuspended ? "unsuspend-btn" : "suspend-btn"}">

${p.isSuspended ? "Unsuspend" : "Suspend"}

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
    },
  );
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

      orders.sort((a, b) => b.createdAt - a.createdAt);

      const filteredOrders = orders.filter((order) => {
        if (!ordersSearchTerm) {
          return true;
        }

        return (
          (order.customerName || "").toLowerCase().includes(ordersSearchTerm) ||
          (order.phone || "").toLowerCase().includes(ordersSearchTerm) ||
          (order.productTitle || "").toLowerCase().includes(ordersSearchTerm)
        );
      });

      if(!firstOrderLoad){

snapshot.docChanges().forEach(change=>{

if(change.type==="added"){

const order=change.doc.data();

showLiveOrderNotification(order.customerName);

}

});

}

firstOrderLoad=false;

      filteredOrders.forEach((order) => {
        body.innerHTML += `
<div class="order-admin-card">

    <div class="order-status">
        <span style="
            display:inline-block;
            padding:6px 12px;
            border-radius:20px;
            font-size:12px;
            font-weight:700;
            background:
${
  order.status === "Pending"
    ? "#c5a880"
    : order.status === "Approved"
      ? "#28a745"
      : order.status === "Delivery In Progress"
        ? "#ff9800"
        : order.status === "Delivered"
          ? "#17a2b8"
          : "#ff4d4d"
};
            color:
            ${order.status === "Pending" ? "#000" : "#fff"};
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

    <div class="order-product" style="
        display:flex;
        align-items:center;
        gap:12px;
        margin-top:15px;
    ">

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
            <div style="
                font-weight:600;
                margin-bottom:5px;
            ">
                ${order.productTitle}
            </div>

            <small style="color:var(--text-muted);">
                ${order.productColor || "N/A"}
                •
                ${order.productSize || "N/A"}
            </small>
        </div>

    </div>

    <div style="margin-top:15px;">
        <strong>Quantity:</strong>
        ${order.quantity}
    </div>

    <div style="
        margin-top:20px;
        display:flex;
        flex-wrap:wrap;
        gap:10px;
    ">

        ${
          order.status === "Pending"
            ? `
                <button
                    onclick="approveOrder('${order.id}')"
                    style="
                        flex:1;
                        min-width:120px;
                        background:#28a745;
                        color:white;
                        border:none;
                        padding:12px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                >
                    Approve
                </button>

                <button
                    onclick="cancelOrder('${order.id}')"
                    style="
                        flex:1;
                        min-width:120px;
                        background:#ff4d4d;
                        color:white;
                        border:none;
                        padding:12px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                >
                    Cancel
                </button>
            `
            : order.status === "Approved"
  ? `
      <button
          onclick="startDelivery('${order.id}')"
          style="
              width:100%;
              background:#ff9800;
              color:white;
              border:none;
              padding:12px;
              border-radius:8px;
              cursor:pointer;
          "
      >
          Delivery In Progress
      </button>
    `
    : order.status === "Delivery In Progress"
  ? `
      <button
          onclick="deliverOrder('${order.id}')"
          style="
              width:100%;
              background:#17a2b8;
              color:white;
              border:none;
              padding:12px;
              border-radius:8px;
              cursor:pointer;
          "
      >
          Mark as Delivered
      </button>
    `
              : order.status === "Delivered"
                ? `
<div style="
    width:100%;
    text-align:center;
    color:#17a2b8;
    font-weight:700;
    padding:12px;
">
    ✓ Delivered
</div>
`
                : `
<div style="
    width:100%;
    text-align:center;
    color:#ff4d4d;
    font-weight:700;
    padding:12px;
">
    ✕ Cancelled
</div>
`
        }

    </div>

</div>
`;
      });
    },
  );
}

window.startDelivery = async function(id) {
  await updateDoc(
    doc(db, "cart_reservations", id),
    {
      status: "Delivery In Progress"
    }
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

            showToast("Stock has already been deducted.");

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

        const currentStock = product.stock?.[size] || 0;

        if(currentStock < reservation.quantity){

            showToast("Not enough stock remaining.");

            return;

        }

        await updateDoc(productRef,{

            [`stock.${size}`]: increment(-reservation.quantity),

            sold: increment(reservation.quantity)

        });

        await updateDoc(reservationRef,{

            status:"Approved",

            stockDeducted:true

        });

        showToast("Order approved.");

    });

};

window.deliverOrder = async function (id) {
  await updateDoc(
    doc(db, "cart_reservations", id),

    {
      status: "Delivered",
    },
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

showToast("Order deleted.");

}

);

}

/* ---------------- ADD PRODUCT ---------------- */

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("prod-title").value;
  const price = Number(document.getElementById("prod-price").value);
  const description = document.getElementById("prod-desc").value;
  const stock = {
    S: Number(document.getElementById("stock-s").value || 0),
    M: Number(document.getElementById("stock-m").value || 0),
    L: Number(document.getElementById("stock-l").value || 0),
    XL: Number(document.getElementById("stock-xl").value || 0),
};

  const colors = [
    ...document.querySelectorAll("input[name='prod_colors']:checked"),
  ].map((el) => el.value);

  const sizes = [
    ...document.querySelectorAll("input[name='prod_sizes']:checked"),
  ].map((el) => el.value);

  const finalColors = colors.includes("None") ? ["None"] : colors;
  const finalSizes = sizes.includes("None") ? ["None"] : sizes;

  if (!uploadedImageUrl) {
    showToast("Please upload a product image.");
    return;
  }

  await addDoc(collection(db, "products"), {
    title,
    price,
    image: uploadedImageUrl,
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

  uploadedImageUrl = "";

  /* Reset upload box */
  uploadBox.innerHTML = `
    <i class="fa-solid fa-cloud-arrow-up"></i>
    <p>Upload Product Image</p>
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

  location.href = `/edit-product?id=${id}`;
};

const ordersSearchInput = document.getElementById("orders-search");

if (ordersSearchInput) {
  ordersSearchInput.addEventListener("input", () => {
    ordersSearchTerm = ordersSearchInput.value.toLowerCase().trim();

    loadOrders();
  });
}

loadInventory();

loadOrders();

loadDashboardStats();
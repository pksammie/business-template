import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const container = document.getElementById("orders-container");
const params = new URLSearchParams(location.search);

const openOrderId = params.get("open");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", "/orders");

    location.href = "/login";

    return;
  }

  loadOrders(user.uid);
});

async function hasUserReviewed(orderId,userId){

const q=query(

collection(db,"reviews"),

where("orderId","==",orderId),

where("userId","==",userId)

);

const snap=await getDocs(q);

return !snap.empty;

}

function loadOrders(userId) {
  const q = query(
    collection(db, "cart_reservations"),

    where("userId", "==", userId),
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `

            <div class="empty-orders">

                <i
                class="fa-solid fa-box-open"
                style="
                font-size:50px;
                margin-bottom:20px;
                ">
                </i>

                <h3>No Orders Yet</h3>

                <p>
                Orders you place will appear here.
                </p>

            </div>

            `;

      return;
    }

    const docs = [];

    snapshot.forEach((docSnap) => {
      docs.push({
id:docSnap.id,
...docSnap.data()
});
    });

    if(openOrderId){

setTimeout(()=>{

const card=document.getElementById(`order-${openOrderId}`);

if(card){

card.scrollIntoView({

behavior:"smooth",

block:"center"

});

card.classList.add("flash-order");

/*
If your orders have a "View Details"
button, automatically click it.
*/

const detailsBtn = card.querySelector(".view-details-btn");

if(detailsBtn){

detailsBtn.click();

}

}

},400);

}

    docs.sort((a, b) => b.createdAt - a.createdAt);

    docs.forEach(async (order) => {
      const card = document.createElement("div");

      const reviewed = await hasUserReviewed(order.id,userId);

      card.className = "order-card";

card.id = `order-${order.id}`;

      let statusText;
      let statusClass;

      switch (order.status) {
        case "Approved":
          statusText = "Approved";
          statusClass = "status-approved";
          break;

        case "Delivery In Progress":
          statusText = "Delivery In Progress";
          statusClass = "status-delivery";
          break;

        case "Delivered":
          statusText = "Delivered";
          statusClass = "status-delivered";
          break;

        case "Cancelled":
          statusText = "Cancelled";
          statusClass = "status-cancelled";
          break;

        default:
          statusText = "Pending";
          statusClass = "status-pending";
      }

      const date = new Date(order.createdAt);

      const hasShipping = typeof order.shippingFee === "number" && order.shippingFee > 0;
      const grandTotal = order.total + (hasShipping ? order.shippingFee : 0);

      card.innerHTML = `

            <div class="order-header">

                <span class="order-status ${statusClass}">
                    ${statusText}
                </span>

                <small class="order-date">
                    ${date.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                </small>

            </div>

            <div class="order-card-product">

                <img
                    src="${order.productImage || "/images/placeholder.jpg"}"
                    class="order-card-image"
                    alt="${order.productTitle || "Product"}">

                <div class="order-card-info">

                    <h4>${order.productTitle}</h4>

                    <p class="order-card-variant">
                        ${order.productColor || "N/A"} • ${order.productSize || "N/A"} • Qty ${order.quantity}
                    </p>

                </div>

            </div>

            <div class="order-price-breakdown">

                <div class="order-price-row">
                    <span>Item Total</span>
                    <span>₦${order.total.toLocaleString()}</span>
                </div>

                ${hasShipping ? `
                <div class="order-price-row">
                    <span>Shipping Fee</span>
                    <span>₦${order.shippingFee.toLocaleString()}</span>
                </div>
                ` : ""}

                <div class="order-price-row order-price-total">
                    <span>Total Paid</span>
                    <span>₦${grandTotal.toLocaleString()}</span>
                </div>

            </div>

            <div class="order-details">
                ${

order.status==="Delivered"

?

reviewed

?

`

<div class="review-complete-card">

<div class="review-complete-icon">

<i class="fa-solid fa-circle-check"></i>

</div>

<div>

<div class="review-complete-title">

Review Submitted

</div>

<div class="review-complete-sub">

Thank you for sharing your experience.

</div>

</div>

</div>

`

:

`

<a
href="/review.html?orderId=${order.id}&productId=${order.productId}"
class="leave-review-btn"
>

Leave Review

</a>

`

:

""

}

            </div>

            `;

      container.appendChild(card);
    });
  });
}
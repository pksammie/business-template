import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const container = document.getElementById("orders-container");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", "/orders");

    location.href = "/login";

    return;
  }

  loadOrders(user.uid);
});

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

    docs.sort((a, b) => b.createdAt - a.createdAt);

    docs.forEach((order) => {
      const card = document.createElement("div");

      card.className = "order-card";

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

      card.innerHTML = `

            <div class="order-header">

                <div>

                    <div class="order-title">

                        <div class="order-card-product">

    <img
    src="${order.productImage || "/images/placeholder.jpg"}"
    class="order-card-image">

    <div>

        <h4>${order.productTitle}</h4>

        <p>
            ${order.productColor || "N/A"}
            •
            ${order.productSize || "N/A"}
        </p>

        <p>
            Qty: ${order.quantity}
        </p>

        <p>
            ₦${order.total.toLocaleString()}
        </p>

    </div>

</div>

                    </div>

                    <small>

                        ${date.toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}

                    </small>

                </div>

                <span class="
                order-status
                ${statusClass}
                ">

                    ${statusText}

                </span>

            </div>

            <div class="order-details">
                Quantity:
                ${order.quantity}

                <br>

                Total:
                ₦${order.total.toLocaleString()}

                <br>

                ${

order.status==="Delivered"

?

order.reviewSubmitted

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

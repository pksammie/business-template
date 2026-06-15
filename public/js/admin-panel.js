import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

let confirmCallback = null;

function showVanguardConfirm(message, callback){

    confirmCallback = callback;

    document.getElementById(
        "vanguard-modal-message"
    ).textContent = message;

    document.getElementById(
        "vanguard-confirm-modal"
    ).classList.add("show");
}

document.getElementById(
    "vanguard-modal-cancel"
).addEventListener("click",()=>{

    document.getElementById(
        "vanguard-confirm-modal"
    ).classList.remove("show");

    confirmCallback = null;
});

document.getElementById(
    "vanguard-modal-confirm"
).addEventListener("click",()=>{

    document.getElementById(
        "vanguard-confirm-modal"
    ).classList.remove("show");

    if(confirmCallback){

        confirmCallback();

    }

    confirmCallback = null;
});

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user) => {
  if (!user) return (location.href = "/login");

  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (!adminDoc.exists()) location.href = "/";
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

function loadDashboardStats(){

    onSnapshot(

        collection(db,"products"),

        (productsSnap)=>{

            document.getElementById(
                "products-count"
            ).innerText =
            productsSnap.size;

        }

    );

    onSnapshot(

        collection(db,"cart_reservations"),

        (ordersSnap)=>{

            let revenue = 0;

            let pending = 0;

            ordersSnap.forEach(docSnap=>{

                const order =
                docSnap.data();

                if(order.status === "Delivered"){

    revenue +=
    (order.total || 0);

}

if(order.status === "Pending"){

    pending++;

}

            });

            document.getElementById(
                "orders-count"
            ).innerText =
            ordersSnap.size;

            document.getElementById(
                "pending-count"
            ).innerText =
            pending;

            document.getElementById(
                "revenue-count"
            ).innerText =
            `₦${revenue.toLocaleString()}`;

        }

    );

}

/* ---------------- LOAD INVENTORY ---------------- */

function loadInventory() {
  onSnapshot(
    collection(db,"products"),

    (snap)=>{

        tableBody.innerHTML = "";

        snap.forEach((docSnap)=>{

            const p = docSnap.data();

            const row =
            document.createElement("tr");

            row.innerHTML = `

<td>

<div style="
display:flex;
gap:10px;
align-items:center;
">

<img
src="${p.image}"
style="
width:60px;
height:60px;
object-fit:cover;
border-radius:6px;
">

<div>

<div class="product-title-cell">${p.title}</div>

<small>
${(p.colors || []).join(", ")}
</small>

</div>

</div>

</td>

<td>
₦${Number(p.price).toLocaleString()}
</td>

<td>
${(p.quantity || 0) - (p.sold || 0)}
</td>

<td>

<button
class="inventory-action-btn"
onclick="editProduct('${docSnap.id}')"
style="
margin-right:8px;
background:#c5a880;
color:#000;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:6px;
font-weight:700;
transition:.3s;
">

Edit

</button>

<button
class="inventory-action-btn"
onclick="toggleSuspension(
'${docSnap.id}',
${p.isSuspended ? false : true}
)"
style="
margin-right:8px;
background:${p.isSuspended ? '#28a745' : '#ff4d4d'};
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

${p.isSuspended ? "Unsuspend" : "Suspend"}

</button>

<button
class="inventory-action-btn"
onclick="deleteProduct('${docSnap.id}')"
style="
background:#222;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

Delete

</button>

</td>

`;

            tableBody.appendChild(row);

        });

    }
);

}

function loadOrders() {

    const body =
    document.getElementById("orders-body");

    if(!body) return;

    onSnapshot(

        collection(db,"cart_reservations"),

        (snap)=>{

            body.innerHTML = "";

            const orders = [];

snap.forEach((docSnap)=>{

    orders.push({
        id: docSnap.id,
        ...docSnap.data()
    });

});

orders.sort(
    (a,b)=>
    b.createdAt - a.createdAt
);

const filteredOrders =
orders.filter(order=>{

    if(!ordersSearchTerm){

        return true;

    }

    return (

        (order.customerName || "")
        .toLowerCase()
        .includes(ordersSearchTerm)

        ||

        (order.phone || "")
        .toLowerCase()
        .includes(ordersSearchTerm)

        ||

        (order.productTitle || "")
        .toLowerCase()
        .includes(ordersSearchTerm)

    );

});

filteredOrders.forEach((order)=>{

    body.innerHTML += `

<tr>

<td>

<span style="
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

: order.status === "Delivered"
? "#17a2b8"

: "#ff4d4d"
};
color:
${
order.status === "Pending"
? "#000"
: "#fff"
};
">

${order.status || "Pending"}

</span>

</td>

<td>
${order.customerName}
</td>

<td>
${order.phone}
</td>

<td>

<div class="order-product-title">

<div style="
display:flex;
align-items:center;
gap:10px;
">

    <img
    src="${order.productImage || "/images/placeholder.jpg"}"
    style="
    width:50px;
    height:50px;
    object-fit:cover;
    border-radius:6px;
    ">

    <div>

        <div>
            ${order.productTitle}
        </div>

        <small>
            ${order.productColor || "N/A"}
            •
            ${order.productSize || "N/A"}
        </small>

    </div>

</div>

</div>

</td>

<td>

${order.quantity}

</td>

<td>

${
order.status === "Pending"

? `

<button
onclick="approveOrder('${order.id}')"
style="
background:#28a745;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
margin-right:6px;
">

Approve

</button>

<button
onclick="cancelOrder('${order.id}')"
style="
background:#ff4d4d;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

Cancel

</button>

`

: order.status === "Approved"

? `

<button
onclick="deliverOrder('${order.id}')"
style="
background:#17a2b8;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

Delivered

</button>

`

: `-`

}

</td>

</tr>

`;

            });

        }

    );

}

window.approveOrder = async function(id){

    const reservationRef =
    doc(db,"cart_reservations",id);

    const reservationSnap =
    await getDoc(reservationRef);

    if(!reservationSnap.exists()) return;

    const reservation =
    reservationSnap.data();

    const productRef =
    doc(db,"products",reservation.productId);

    const productSnap =
    await getDoc(productRef);

    if(!productSnap.exists()) return;

    const product =
    productSnap.data();

    const remaining =

    (product.quantity || 0)

    -

    (product.sold || 0);

    if(remaining < reservation.quantity){

        showToast("Not enough stock left.");

        return;
    }

    await updateDoc(productRef,{

        sold: increment(
                reservation.quantity
        )

    });

    await updateDoc(reservationRef,{

        status:"Approved",

        stockDeducted:true

    });

    showToast(
        "Order approved."
    );

};

window.deliverOrder = async function(id){

    await updateDoc(

        doc(
            db,
            "cart_reservations",
            id
        ),

        {

            status:"Delivered"

        }

    );

    showToast(
        "Order delivered."
    );

};

window.cancelOrder = async function(id){

    showVanguardConfirm(

        "Cancel this order?",

        async()=>{

            const reservationRef =
            doc(
                db,
                "cart_reservations",
                id
            );

            const reservationSnap =
            await getDoc(
                reservationRef
            );

            if(!reservationSnap.exists()){

                return;

            }

            const reservation =
            reservationSnap.data();

            if(reservation.stockDeducted){

    const productRef =
    doc(
        db,
        "products",
        reservation.productId
    );

    const productSnap =
    await getDoc(productRef);

    if(productSnap.exists()){

        await updateDoc(

            productRef,

            {
                sold: increment(
                    -reservation.quantity
                )
            }

        );

    }

}

            await updateDoc(

                reservationRef,

                {

                    status:"Cancelled",

                    stockDeducted:false

                }

            );

            showToast(
                "Order cancelled."
            );

        }

    );

};

window.deleteOrder = function(id){

    showVanguardConfirm(
        "Delete this order?",
        async ()=>{

            const reservationRef =
            doc(db, "cart_reservations", id);

            const reservationSnap =
            await getDoc(reservationRef);

            if(!reservationSnap.exists()){

                showToast("Order not found.");

                return;

            }

            const reservation =
            reservationSnap.data();

            /*
            If this order was approved,
            restore the stock first.
            */

            if(
    reservation.status === "Approved"
){

                const productRef =
                doc(
                    db,
                    "products",
                    reservation.productId
                );

                const productSnap =
                await getDoc(productRef);

                if(productSnap.exists()){

                    await updateDoc(
                        productRef,
                        {
                            sold: increment(
                                -reservation.quantity
                            )
                        }
                    );

                }

            }

            await deleteDoc(
                reservationRef
            );

            showToast(
                "Order deleted."
            );
        }
    );

};

/* ---------------- ADD PRODUCT ---------------- */

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("prod-title").value;
  const price = Number(document.getElementById("prod-price").value);
  const description = document.getElementById("prod-desc").value;
  const quantity = Number(document.getElementById("prod-quantity").value);

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
    quantity,
    sold: 0,
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

window.toggleSuspension =
async function(
id,
status
){

  await updateDoc(
    doc(
      db,
      "products",
      id
    ),
    {
      isSuspended: status
    }
  );

};

window.deleteProduct = function(id){

    showVanguardConfirm(
        "Delete this product?",
        async ()=>{

            await deleteDoc(
                doc(db,"products",id)
            );

            showToast("Product deleted.");

        }
    );

};

window.editProduct = async function(id){

    await updateDoc(
        doc(db, "products", id),
        {
            isEditing: true
        }
    );

    location.href =
    `/edit-product.html?id=${id}`;
};

const ordersSearchInput =
document.getElementById("orders-search");

if(ordersSearchInput){

    ordersSearchInput.addEventListener(
        "input",
        ()=>{

            ordersSearchTerm =
            ordersSearchInput.value
            .toLowerCase()
            .trim();

            loadOrders();

        }
    );

}

loadInventory();

loadOrders();

loadDashboardStats();
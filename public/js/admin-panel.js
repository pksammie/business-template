import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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

async function loadDashboardStats(){

    const productsSnap =
    await getDocs(collection(db,"products"));

    const ordersSnap =
    await getDocs(collection(db,"cart_reservations"));

    let revenue = 0;
    let pending = 0;

    ordersSnap.forEach(docSnap=>{

        const order = docSnap.data();

        if(order.paid){

            revenue +=
            (order.quantity || 0);

        }else{

            pending++;

        }

    });

    document.getElementById("products-count").innerText =
    productsSnap.size;

    document.getElementById("orders-count").innerText =
    ordersSnap.size;

    document.getElementById("pending-count").innerText =
    pending;

    document.getElementById("revenue-count").innerText =
    `₦${revenue.toLocaleString()}`;

}

/* ---------------- LOAD INVENTORY ---------------- */

async function loadInventory() {
  const snap = await getDocs(collection(db, "products"));

  tableBody.innerHTML = "";

  snap.forEach((docSnap) => {
    const p = docSnap.data();

    const row = document.createElement("tr");

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
onclick="editProduct('${docSnap.id}')"
style="
margin-right:8px;
background:#007bff;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

Edit

</button>

<button
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

async function loadOrders() {
  const snap = await getDocs(collection(db, "cart_reservations"));

  const body = document.getElementById("orders-body");

  if (!body) return;

  body.innerHTML = "";

  snap.forEach((docSnap) => {
    const order = docSnap.data();

    body.innerHTML += `

      <tr>

<td class="paid-cell">

<button
onclick="toggleApproval('${docSnap.id}')"
style="
background:${order.paid ? '#ff4d4d' : '#28a745'};
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

${order.paid ? "Unapprove" : "Approve"}

</button>

<small>
${order.stockDeducted ? "Done" : "Pending"}
</small>

</td>

      <td>
      ${order.customerName}
      </td>

      <td>
      ${order.phone}
      </td>

      <td>
    <div class="order-product-title">
        ${order.productTitle}
    </div>
</td>

      <td>
${order.quantity}
</td>

<td>

<button
onclick="
deleteOrder(
'${docSnap.id}'
)
"
style="
background:#ff4d4d;
color:white;
border:none;
padding:8px 12px;
cursor:pointer;
border-radius:4px;
">

Delete

</button>

</td>

</tr>
`;
  });
}

window.toggleApproval = async function(id) {

    const reservationRef = doc(db, "cart_reservations", id);

    const reservationSnap = await getDoc(reservationRef);

    if (!reservationSnap.exists()) return;

    const reservation = reservationSnap.data();

    const productRef = doc(db, "products", reservation.productId);

    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) return;

    const product = productSnap.data();

    if (!reservation.paid) {

        const remaining =
            (product.quantity || 0) -
            (product.sold || 0);

        if (remaining < reservation.quantity) {

            alert("Not enough stock left.");

            return;
        }

        await updateDoc(productRef, {
            sold: increment(reservation.quantity)
        });

        await updateDoc(reservationRef, {
            paid: true,
            stockDeducted: true
        });

    } else {

        await updateDoc(productRef, {
            sold: increment(-reservation.quantity)
        });

        await updateDoc(reservationRef, {
            paid: false,
            stockDeducted: false
        });

    }

    loadOrders();
    loadInventory();
};

window.deleteOrder =
async function(id){

  const confirmDelete =
  confirm(
    "Delete this order?"
  );

  if(!confirmDelete){
    return;
  }

  await deleteDoc(
    doc(
      db,
      "cart_reservations",
      id
    )
  );

  loadOrders();

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
    alert("Please upload a product image.");
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

  alert("Product added!");

adminForm.reset();

uploadedImageUrl = "";

/* Reset upload box */
uploadBox.innerHTML = `
    <i class="fa-solid fa-cloud-arrow-up"></i>
    <p>Upload Product Image</p>
`;

loadInventory();

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

  loadInventory();

};

window.deleteProduct = async (id) => {
  await deleteDoc(doc(db, "products", id));
  loadInventory();
};

window.editProduct = async function(id){

    await updateDoc(
        doc(db,"products",id),
        {
            isEditing: true
        }
    );

    location.href =
    `/edit-product.html?id=${id}`;
};

loadInventory();

loadOrders();

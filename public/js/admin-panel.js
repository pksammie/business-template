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

${p.quantity || 0}

</td>

<td>

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

      <td>

<input
type="checkbox"

${order.paid ? "checked" : ""}

onchange="
togglePaid(
'${docSnap.id}',
this.checked
)
">

<br>

<small>

${order.stockDeducted
? "Stock Updated"
: "Pending"}

</small>

</td>

      <td>
      ${order.customerName}
      </td>

      <td>
      ${order.phone}
      </td>

      <td>
      ${order.productTitle}
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

window.togglePaid =
async function(
id,
status
){

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

  if(
    !reservationSnap.exists()
  ){
    return;
  }

  const reservation =
  reservationSnap.data();

  await updateDoc(
    reservationRef,
    {
      paid: status
    }
  );

  if(
    status === true &&
    reservation.stockDeducted !== true
  ){

    const productRef =
    doc(
      db,
      "products",
      reservation.productId
    );

    const productSnap =
    await getDoc(
      productRef
    );

    if(
      productSnap.exists()
    ){

      const product =
      productSnap.data();

      const currentSold =
      product.sold || 0;

      const currentQuantity =
      product.quantity || 0;

      const newSold =
      currentSold +
      reservation.quantity;

      const soldOut =
      newSold >= currentQuantity;

      await updateDoc(
        productRef,
        {
          sold:
          increment(
            reservation.quantity
          ),

          isSuspended:
          soldOut
        }
      );

      await updateDoc(
        reservationRef,
        {
          stockDeducted: true
        }
      );
    }
  }

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

  await addDoc(collection(db, "products"), {
    title,
    price,
    image: uploadedImageUrl,
    description,
    sizes: finalSizes,
    colors: finalColors,
    quantity,
    sold: 0,
    createdAt: Date.now(),
  });

  alert("Product added!");

  adminForm.reset();
  uploadedImageUrl = "";

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

loadInventory();

loadOrders();

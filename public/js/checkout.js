import { db, auth } from "./firebase.js";

import { createSearchSelect } from "./search-select.js";

import { getCountries, getStates, getCities } from "./location-service.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const orderSummaryWrapper = document.getElementById("checkout-summary-target");
const checkoutFormInstance = document.getElementById(
  "shipping-address-capture-form",
);
let isProcessingCheckout = false;

function resetCheckoutState() {
  isProcessingCheckout = false;

  const submitBtn = checkoutFormInstance?.querySelector(
    'button[type="submit"]',
  );

  if (submitBtn) {
    submitBtn.disabled = false;

    submitBtn.textContent = "Complete Order";
  }
}

// Admin Phone Variable Setup (Format: Country code first, no spaces or special symbols)
const ADMIN_WHATSAPP_NUMBER = "2348109007611";

async function backupCart(userId, cartItems) {
  if (cartItems.length === 0) return;

  await addDoc(
    collection(db, "users", userId, "cart_backups"),

    {
      createdAt: Date.now(),

      items: cartItems,
    },
  );
}

async function renderCheckoutOverview() {
  const user = auth.currentUser;

  if (!user) {
    orderSummaryWrapper.innerHTML = "<p>Please login first.</p>";
    return;
  }

  const cartSnap = await getDocs(collection(db, "users", user.uid, "cart"));

  const cart = [];

  cartSnap.forEach((docSnap) => {
    cart.push({
      cartDocId: docSnap.id,
      ...docSnap.data(),
    });
  });

    const selectedIds = JSON.parse(
  sessionStorage.getItem(
    "selectedCheckoutItems"
  ) || "[]"
);

if(selectedIds.length){

  const filteredCart = cart.filter(
    item =>
      selectedIds.includes(
        item.cartDocId
      )
  );

  cart.length = 0;

  cart.push(...filteredCart);

}


  if (!orderSummaryWrapper) return;

  if (cart.length === 0) {
    orderSummaryWrapper.innerHTML = `<p>No inventory instances queued for parsing.</p>`;
    return;
  }

  orderSummaryWrapper.innerHTML = "";
  let overallCostSum = 0;

  cart.forEach((item) => {
    const subSum = item.price * item.quantity;
    overallCostSum += subSum;

    const blockSummaryRow = document.createElement("div");
    blockSummaryRow.className = "checkout-summary-item-row";
    blockSummaryRow.innerHTML = `
            <div style="display:flex; gap:15px; margin-bottom:15px; align-items:center;">
                <div style="position:relative;">
                    <img src="${item.image}" style="width:65px; height:75px; object-fit:cover; border-radius:4px;">
                    <span style="position:absolute; top:-8px; right:-8px; background:#c5a880; color:#000; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:50%;">${item.quantity}</span>
                </div>
                <div>
                    <h4 style="margin:0; font-size:14px; font-weight:500;">${item.title}</h4>
                    <small style="color:#c5a880;">Size: ${item.size}</small>
                    <br>
                    <small style="color:#c5a880;">colour: ${item.color}</small>
                </div>
            </div>
            <div style="font-weight:600;">₦${subSum.toLocaleString()}</div>
        `;
    orderSummaryWrapper.appendChild(blockSummaryRow);
  });

  // Subtotal output layer creation block
  const summaryTotalFooterBlock = document.createElement("div");
  summaryTotalFooterBlock.className = "summary-total-footer";
  summaryTotalFooterBlock.style =
    "border-top:1px solid #1f2833; padding-top:20px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;";
  summaryTotalFooterBlock.innerHTML = `
        <span style="font-size:18px;">Subtotal Amount Due</span>
        <span style="font-size:22px; font-weight:700; color:#c5a880;">₦${overallCostSum.toLocaleString()}</span>
    `;
  orderSummaryWrapper.appendChild(summaryTotalFooterBlock);
}

function initializeLocationSelectors() {
  const countryInput = document.getElementById("country");

  const stateInput = document.getElementById("state");

  const cityInput = document.getElementById("city");

  const countryContainer = document.getElementById("country-search");

  const stateContainer = document.getElementById("state-search");

  const cityContainer = document.getElementById("city-search");

  const countries = getCountries().map((country) => ({
    name: country.name,
    country,
  }));

  let stateDropdown;
  let cityDropdown;

  createSearchSelect({
    container: countryContainer,

    placeholder: "Select Country",

    items: countries,

    onSelect: ({ country }) => {
      countryInput.value = country.name;

      stateInput.value = "";
      cityInput.value = "";

      /* Reset State */
      if (stateDropdown) {
        stateDropdown.clear();

        const states = getStates(country.isoCode).map((state) => ({
          name: state.name,
          state,
        }));

        stateDropdown.setItems(states);

        stateDropdown.enable();

        stateDropdown.setPlaceholder("Select State");
      }

      /* Reset City */
      if (cityDropdown) {
        cityDropdown.clear();

        cityDropdown.setItems([]);

        cityDropdown.disable();

        cityDropdown.setPlaceholder("Select City");
      }
    },
  });

  stateDropdown = createSearchSelect({
    container: stateContainer,

    placeholder: "Select Country First",

    items: [],

    disabled: true,

    onSelect: ({ state }) => {
      stateInput.value = state.name;

      cityInput.value = "";

      const selectedCountry = countries.find(
        (c) => c.name === countryInput.value,
      );

      if (!selectedCountry) return;

      const cities = getCities(
        selectedCountry.country.isoCode,
        state.isoCode,
      ).map((city) => ({
        name: city.name,
      }));

      cityDropdown.enable();

      cityDropdown.setItems(cities);

      cityDropdown.setPlaceholder("Select City");
    },
  });

  cityDropdown = createSearchSelect({
    container: cityContainer,

    placeholder: "Select State First",

    items: [],

    disabled: true,

    onSelect: (city) => {
      cityInput.value = city.name;
    },
  });
}

function createSearchDropdown({
  containerId,
  placeholder,
  data,
  labelKey,
  onSelect,
}) {
  const container = document.getElementById(containerId);

  container.innerHTML = `
<div class="search-select">
<input
type="text"
placeholder="${placeholder}"
class="search-input"
autocomplete="off"
/>
<div class="search-results"></div>
</div>
`;

  const input = container.querySelector(".search-input");

  const results = container.querySelector(".search-results");

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase();

    results.innerHTML = "";

    if (!query) return;

    data
      .filter((item) => item[labelKey].toLowerCase().includes(query))
      .slice(0, 20)
      .forEach((item) => {
        const div = document.createElement("div");

        div.className = "search-item";

        div.textContent = item[labelKey];

        div.onclick = () => {
          input.value = item[labelKey];

          results.innerHTML = "";

          onSelect(item);
        };

        results.appendChild(div);
      });
  });
}

// Prefill form values if persistence checkbox data was saved from a past session
function prefillSavedUserAddressMetadata() {
  const cachedAddress = JSON.parse(
    localStorage.getItem("vanguard_saved_customer_profile"),
  );
  if (cachedAddress && checkoutFormInstance) {
    checkoutFormInstance.elements["country"].value =
      cachedAddress.country || "";
    checkoutFormInstance.elements["first_name"].value =
      cachedAddress.first_name || "";
    checkoutFormInstance.elements["last_name"].value =
      cachedAddress.last_name || "";
    checkoutFormInstance.elements["address"].value =
      cachedAddress.address || "";
    checkoutFormInstance.elements["city"].value = cachedAddress.city || "";
    checkoutFormInstance.elements["state"].value = cachedAddress.state || "";
    checkoutFormInstance.elements["phone"].value = cachedAddress.phone || "";
    checkoutFormInstance.elements["save_info"].checked = true;
  }
}

// Compile all user info and launch the formatted WhatsApp message
window.executeOrderCompilationPipeline = async function (event) {
  event.preventDefault();

  try {
    if (isProcessingCheckout) {
      return;
    }

    isProcessingCheckout = true;
    const submitBtn = checkoutFormInstance.querySelector(
      'button[type="submit"]',
    );

    if (submitBtn) {
      submitBtn.disabled = true;

      submitBtn.textContent = "Processing...";
    }

    const user = auth.currentUser;

    console.log(user);

    if (!user) {
      showToast("Please login.");

      resetCheckoutState();

      return;
    }

    const cartSnap = await getDocs(collection(db, "users", user.uid, "cart"));

    const cart = [];

    cartSnap.forEach((docSnap) => {
      cart.push({
        cartDocId: docSnap.id,
        ...docSnap.data(),
      });
    });

    const selectedIds = JSON.parse(
  sessionStorage.getItem(
    "selectedCheckoutItems"
  ) || "[]"
);

if(selectedIds.length){

  const filteredCart = cart.filter(
    item =>
      selectedIds.includes(
        item.cartDocId
      )
  );

  cart.length = 0;

  cart.push(...filteredCart);

}

    if (cart.length === 0) {
      showToast("Your cart is empty.");

      resetCheckoutState();

      return;
    }

    const f = checkoutFormInstance.elements;

    const countryInput = document.getElementById("country");

    const stateInput = document.getElementById("state");

    const cityInput = document.getElementById("city");

    if (
      !countryInput.value.trim() ||
      !stateInput.value.trim() ||
      !cityInput.value.trim()
    ) {
      showToast("Please select your Country, State and City.");

      resetCheckoutState();

      return;
    }

    const addressProfile = {
      country: f["country"].value,
      first_name: f["first_name"].value,
      last_name: f["last_name"].value,
      address: f["address"].value,
      city: f["city"].value,
      state: f["state"].value,
      phone: f["phone"].value,
    };

    /* VERIFY STOCK BEFORE CHECKOUT */

    /* PRODUCT REVALIDATION + STOCK CHECK */

    for (const item of cart) {
      const productRef = doc(db, "products", item.productId);

      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        showToast(`${item.title} no longer exists.`);

        resetCheckoutState();

        return;
      }

      const productData = productSnap.data();

      if (productData.isSuspended) {
        showToast(`${item.title} is unavailable.`);

        resetCheckoutState();

        return;
      }

      let cartNeedsUpdate = false;

      if (item.price !== productData.price) {
        item.price = productData.price;

        cartNeedsUpdate = true;
      }

      if (item.title !== productData.title) {
        item.title = productData.title;

        cartNeedsUpdate = true;
      }

      if (item.image !== productData.image) {
        item.image = productData.image;

        cartNeedsUpdate = true;
      }

      if (cartNeedsUpdate) {
        await setDoc(
          doc(db, "users", user.uid, "cart", item.cartDocId),

          item,
        );

        showToast(`${item.title} has been updated.`);

        resetCheckoutState();

        return;
      }

      const remaining = (productData.quantity || 0) - (productData.sold || 0);

      if (item.quantity > remaining) {
        showToast(`Only ${remaining} of ${item.title} remain in stock.`);

        resetCheckoutState();

        return;
      }
    }

    // Save profile to LocalStorage if check option is ticked
    if (f["save_info"].checked) {
      localStorage.setItem(
        "vanguard_saved_customer_profile",
        JSON.stringify(addressProfile),
      );
    }

    for (const item of cart) {
      await addDoc(collection(db, "cart_reservations"), {
        /* CUSTOMER */

        userId: user.uid,

        customerName: `${addressProfile.first_name} ${addressProfile.last_name}`,

        phone: addressProfile.phone,

        address: {
          country: addressProfile.country,
          state: addressProfile.state,
          city: addressProfile.city,
          address: addressProfile.address,
        },

        /* PRODUCT SNAPSHOT */

        productId: item.productId,

        productTitle: item.title,

        productImage: item.image,

        productPrice: item.price,

        productSize: item.size,

        productColor: item.color,

        quantity: item.quantity,

        total: item.price * item.quantity,

        /* ORDER */

        status: "Pending",

        stockDeducted: false,

        createdAt: Date.now(),
      });
    }
    // --- WHATSAPP ORDER COMPILER STRING BUILDER ---
    let messageText = `*NEW INCOMING ORDER - TIME-LESS* \n\n`;
    messageText += `*CUSTOMER DETAILS:*\n\n`;
    messageText += `*Name:* ${addressProfile.first_name} ${addressProfile.last_name}\n`;
    messageText += `*Phone:* ${addressProfile.phone}\n`;
    messageText += `*Address:* ${addressProfile.address}, ${addressProfile.city}, ${addressProfile.state}, ${addressProfile.country}\n\n`;

    messageText += `*ORDER ITEMS RECAP:* \n\n`;

    let subtotalValueAmount = 0;
    cart.forEach((item, index) => {
      const itemCost = item.price * item.quantity;
      subtotalValueAmount += itemCost;
      messageText += `${index + 1}. *${item.title}*\n`;
      messageText += `[Size: ${item.size}  |  Qty: ${item.quantity}  |  Colour: ${item.color}  |  Price: ₦${itemCost.toLocaleString()}]\n\n`;
      messageText += `  _Image Link:_ ${item.image}\n\n`;
    });

    messageText += `───────────────────\n`;
    messageText += `*ORDER ITEM TOTAL:* ₦${subtotalValueAmount.toLocaleString()}\n`;
    messageText += `_Shipping fee will be calculated based on the address above._\n\n`;

    messageText += `⚠️ Please do not edit or cancel this message so your order can be processed faster.`;

    // URI encode the compiled text block safely
    const customEncodedUriString = encodeURIComponent(messageText);
    const destinationWhatsAppUrlEndpoint = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${customEncodedUriString}`;

    await backupCart(user.uid, cart);

    // Clear out cart bag arrays to complete transaction safely
    for (const item of cart) {
      await deleteDoc(doc(db, "users", user.uid, "cart", item.cartDocId));
    }

    resetCheckoutState();

    showToast("WhatsApp is opening. Please tap SEND to complete your order.");

    const whatsappWindow = window.open(
      destinationWhatsAppUrlEndpoint,
      "_blank",
    );

    if (
      !whatsappWindow ||
      whatsappWindow.closed ||
      typeof whatsappWindow.closed === "undefined"
    ) {
      /*
    Popup blocked
    */

    sessionStorage.removeItem(
  "selectedCheckoutItems"
);
      location.href = destinationWhatsAppUrlEndpoint;
    } else {
      setTimeout(() => {
        location.href = "/";
        sessionStorage.removeItem(
  "selectedCheckoutItems"
);
      }, 1500);
    }
  } catch (error) {
    console.error(error);

    showToast("Something went wrong. Please try again.");

    resetCheckoutState();
  }
};

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  initializeLocationSelectors();

  loadProductPreview();

  prefillSavedUserAddressMetadata();

  if (checkoutFormInstance) {
    checkoutFormInstance.addEventListener(
      "submit",
      executeOrderCompilationPipeline,
    );
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      return;
    }

    await renderCheckoutOverview();
  });
});

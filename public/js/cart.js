    const cartItemsContainer = document.getElementById('cart-items-container');
    const subtotalLabel = document.getElementById('summary-subtotal');

    let editMode = false;
let selectedIndex = null;

    function renderTabularCart() {
        const cart = JSON.parse(localStorage.getItem('vanguard_cart')) || [];
        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted);">Your shopping bag is completely empty.</td></tr>`;
            if (subtotalLabel) subtotalLabel.innerText = "₦0.00";
            return;
        }

        cartItemsContainer.innerHTML = "";
        let calculatedGrossTotal = 0;

        cart.forEach((item, index) => {
            const itemLineTotal = item.price * item.quantity;
            calculatedGrossTotal += itemLineTotal;

            const tableRowHtml = document.createElement('tr');
            tableRowHtml.className = `
cart-table-row
${editMode ? "cart-edit-mode" : ""}
`;
            tableRowHtml.innerHTML = `
                <td class="product-col">

    <img src="${item.image}"
         alt="Product preview image frame"
         class="table-cart-img">

    <div class="table-product-details">
        <span class="table-item-title">${item.title}</span>
        <span class="table-item-variant-label">
            Size: ${item.size}
        </span>
        <span class="table-item-variant-label">
            Color: ${item.color}
        </span>

        <button
            class="table-remove-item-btn"
            onclick="removeLineItem(${index})">
            Remove
        </button>
    </div>

</td>
                <td class="price-col">₦${item.price.toLocaleString()}</td>
                <td class="quantity-col">
    <input
        type="number"
        min="1"
        value="${item.quantity}"
        onchange="
        modifyLineQuantity(
            ${index},
            this.value
        )"
        class="table-qty-input">
</td>
                <td class="total-col">
    ₦${itemLineTotal.toLocaleString()}
</td>

${
editMode
?
`
<td class="selector-col">
    <input
        type="radio"
        class="cart-update-selector"
        name="edit-selection"
        onchange="selectCartItem(${index})"
        ${
            selectedIndex === index
            ? "checked"
            : ""
        }>
</td>
`
:
""
}
            `;
            cartItemsContainer.appendChild(tableRowHtml);
        });

        if (subtotalLabel) subtotalLabel.innerText = `₦${calculatedGrossTotal.toLocaleString()}`;
    }

    window.modifyLineQuantity =
function(
index,
newQty
){

    let cart =
    JSON.parse(
      localStorage.getItem(
      'vanguard_cart'
      )
    ) || [];

    const sanitizedValue =
    Number(newQty);

    if (
      isNaN(
      sanitizedValue
      )
    ) {
      return;
    }

    if (
      sanitizedValue < 1
    ) {
      return;
    }

    cart[index].quantity =
    sanitizedValue;

    localStorage.setItem(
      'vanguard_cart',
      JSON.stringify(cart)
    );

    renderTabularCart();

};

    window.removeLineItem = function(index) {
        let cart = JSON.parse(localStorage.getItem('vanguard_cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('vanguard_cart', JSON.stringify(cart));
        renderTabularCart();
    };

    window.selectCartItem =
function(index){

    selectedIndex = index;

    renderTabularCart();

};

    // Route handlers for your three control actions buttons
    window.actionContinueShopping = function() { window.location.href = "/"; };
    // Look at your action button methods inside public/js/cart.js
    
        window.actionUpdateCartRedirect =
function() {

    const cart =
    JSON.parse(
      localStorage.getItem(
      'vanguard_cart'
      )
    ) || [];

    if(cart.length === 0){
        return;
    }

    if(!editMode){

        editMode = true;

        renderTabularCart();

        return;
    }

    if(selectedIndex === null){

        alert(
        "Please select a product."
        );

        return;
    }

    window.location.href =
`/decision-page.html?id=${cart[selectedIndex].id}&editIndex=${selectedIndex}`;

};

    window.actionProceedCheckout = function() { window.location.href = "/checkout"; };

    document.addEventListener('DOMContentLoaded', renderTabularCart);

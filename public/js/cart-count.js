function updateCartCount(){

    const cart =
    JSON.parse(
        localStorage.getItem(
            "vanguard_cart"
        )
    ) || [];

    const total =
    cart.reduce(
        (sum,item)=>
        sum+item.quantity,
        0
    );

    const badge =
    document.getElementById(
        "cart-count"
    );

    if(badge){

        badge.textContent =
        total;
    }
}

updateCartCount();

window.addEventListener(
    "storage",
    updateCartCount
);

window.updateCartCount =
updateCartCount;
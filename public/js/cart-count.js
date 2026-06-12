function updateCartCount(){

    const cart =
    JSON.parse(
        localStorage.getItem(
            "vanguard_cart"
        )
    ) || [];

    const total = cart.length;

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
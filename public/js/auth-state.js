import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

/**
 * GLOBAL AUTH UI CONTROLLER
 * - login/register buttons
 * - admin visibility
 * - cart behavior
 * - user dropdown
 */

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.body.dataset.theme = savedTheme;
}

const adminLinkContainer = document.getElementById("adminLinkContainer");
const authLinks = document.querySelector(".account-auth-links");
const cartBadge = document.getElementById("cart-count");

function hideAdminUI() {
    if (adminLinkContainer) {
        adminLinkContainer.innerHTML = ""; // remove completely
    }
}

function showUserDropdown(user, isAdmin) {
    if (!authLinks) return;

    authLinks.innerHTML = `
        <div class="user-dropdown">
            <button id="userMenuBtn" class="user-btn">
                <i class="fa-solid fa-user"></i>
            </button>

            <div class="dropdown-menu" id="dropdownMenu">
                ${isAdmin ? `
<div class="dropdown-item" id="adminPanelBtn">
    <i class="fa-solid fa-shield-halved"></i>
    Admin Panel
</div>
` : ""}
                
                <div class="dropdown-item" id="themeToggle">Change Theme</div>

                <div class="theme-submenu" id="themeMenu">
                    <div class="theme-box" data-theme="dark"></div>
                    <div class="theme-box" data-theme="light"></div>
                    <div class="theme-box" data-theme="luxury"></div>
                </div>

                <div><a href="/orders" class="dropdown-item dropdown-orders">
    <i class="fa-solid fa-box"></i>
    <span>My Orders</span>  
</a></div>

                <div class="dropdown-item danger" id="logoutBtn">Logout</div>
            </div>
        </div>
    `;

    const menuBtn = document.getElementById("userMenuBtn");
    const menu = document.getElementById("dropdownMenu");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminPanelBtn =
document.getElementById("adminPanelBtn");
    const themeToggle = document.getElementById("themeToggle");
    const themeMenu = document.getElementById("themeMenu");

    // toggle dropdown
    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("show");
    });

    // prevent instant close when clicking inside
    menu.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    const outsideClickHandler = () => {

    menu.classList.remove("show");

};

document.addEventListener(
    "click",
    outsideClickHandler,
    {
        once: true
    }
);

if(adminPanelBtn){

    adminPanelBtn.addEventListener("click",()=>{

        location.href = "/admin";

    });

}

    // logout
    logoutBtn.addEventListener("click", async () => {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
        await signOut(auth);
        location.href = "/";
    });

    // theme submenu
    themeToggle.addEventListener("click", () => {
        themeMenu.classList.toggle("show");
    });

    document.querySelectorAll(".theme-box").forEach(box => {
        box.addEventListener("click", () => {
            document.body.dataset.theme = box.dataset.theme;
            localStorage.setItem("theme", box.dataset.theme);
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    const isLoggedIn = !!user;

    if (!user) {
        hideAdminUI();
        return;
    }

    const adminRef = doc(db, "admins", user.uid);
    const adminDoc = await getDoc(adminRef);
    const isAdmin = adminDoc.exists();

    // ADMIN ICON FIX
    if(adminLinkContainer){

    adminLinkContainer.innerHTML = "";

}

    showUserDropdown(user, isAdmin);
});
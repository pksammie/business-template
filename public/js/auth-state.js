import {
    auth,
    db,
    setAdminStatus
} from "./firebase.js";
import "./admin-notification.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const savedTheme = localStorage.getItem("theme");
if (savedTheme) document.body.dataset.theme = savedTheme;

const adminLinkContainer = document.getElementById("adminLinkContainer");
const authLinks          = document.querySelector(".account-auth-links");

function hideAdminUI() {
  if (adminLinkContainer) adminLinkContainer.innerHTML = "";
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
            <i class="fa-solid fa-shield-halved"></i> Admin Panel
          </div>
        ` : ""}

        <div class="dropdown-item" id="themeToggle">
          <i class="fa-solid fa-palette"></i> Change Theme
        </div>

        <div class="theme-submenu" id="themeMenu">
          <div class="theme-box" data-theme="dark"   title="Dark"></div>
          <div class="theme-box" data-theme="light"  title="Light"></div>
          <div class="theme-box" data-theme="luxury" title="Luxury"></div>
        </div>

        <div class="dropdown-item" id="ordersBtn">
  <i class="fa-solid fa-box"></i>
  <span>My Orders</span>
</div>

        <div class="dropdown-item danger" id="logoutBtn">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </div>
      </div>
    </div>
  `;

  const menuBtn     = document.getElementById("userMenuBtn");
  const menu        = document.getElementById("dropdownMenu");
  const logoutBtn   = document.getElementById("logoutBtn");
  const adminBtn    = document.getElementById("adminPanelBtn");
  const themeToggle = document.getElementById("themeToggle");
  const themeMenu   = document.getElementById("themeMenu");
  const ordersBtn = document.getElementById("ordersBtn");

  menuBtn.addEventListener("click", e => {
    e.stopPropagation();
    menu.classList.toggle("show");
  });

  menu.addEventListener("click", e => e.stopPropagation());

  // FIX: use persistent listener with condition instead of { once:true }
  // which broke repeated closes
  document.addEventListener("click", () => {
    menu.classList.remove("show");
  });

  if (adminBtn) adminBtn.addEventListener("click", () => { location.href = "/admin"; });

  if (ordersBtn)
ordersBtn.addEventListener("click", () => {
  location.href = "/orders";
});
    const logoutModal =
document.getElementById("logoutModal");

const cancelLogout =
document.getElementById("cancelLogout");

const confirmLogout =
document.getElementById("confirmLogout");

logoutBtn.addEventListener("click", () => {

    logoutModal.classList.add("show");

});

cancelLogout.addEventListener("click", () => {

    logoutModal.classList.remove("show");

});

confirmLogout.addEventListener("click", async () => {

    const { signOut } =
    await import(
        "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js"
    );

    await signOut(auth);

    location.href="/";

});

  themeToggle.addEventListener("click", e => {
    e.stopPropagation();
    themeMenu.classList.toggle("show");
  });

  document.querySelectorAll(".theme-box").forEach(box => {
    box.addEventListener("click", () => {
      document.body.dataset.theme = box.dataset.theme;
      localStorage.setItem("theme", box.dataset.theme);
    });
  });
}

onAuthStateChanged(auth, async user => {
  if (!user) {

    setAdminStatus(false);

    window.dispatchEvent(
    new CustomEvent("admin-status-ready", {
        detail:{
            isAdmin:false
        }
    })
);

    hideAdminUI();

    const skeleton = document.getElementById("authLinksSkeleton");
    const realLinks = document.getElementById("authLinksReal");

    if (skeleton) skeleton.style.display = "none";
    if (realLinks) realLinks.style.display = "";

    return;

}

  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  const isAdmin  = adminDoc.exists();

  setAdminStatus(isAdmin);

  window.dispatchEvent(
    new CustomEvent("admin-status-ready", {
        detail: {
            isAdmin
        }
    })
);

  if (adminLinkContainer) adminLinkContainer.innerHTML = "";

  showUserDropdown(user, isAdmin);
});
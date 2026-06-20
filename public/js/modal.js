window.showConfirmModal = function (message, onConfirm) {
  const existing = document.getElementById("vanguard-confirm-modal");

  if (existing) {
    existing.remove();
  }

  const modal = document.createElement("div");

  modal.id = "vanguard-confirm-modal";
  modal.className = "vanguard-modal show";

  modal.innerHTML = `
        <div class="vanguard-modal-box">

            <h3>Confirm Action</h3>

            <p>${message}</p>

            <div class="vanguard-modal-actions">

                <button id="vanguard-modal-cancel">
                    Cancel
                </button>

                <button id="vanguard-modal-confirm">
                    Confirm
                </button>

            </div>

        </div>
    `;

  document.body.appendChild(modal);

  document.getElementById("vanguard-modal-cancel").onclick = () => {
    modal.remove();
  };

  document.getElementById("vanguard-modal-confirm").onclick = () => {
    modal.remove();

    onConfirm();
  };
};

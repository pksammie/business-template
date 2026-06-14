window.showConfirmModal = function(message, onConfirm) {

    const existing = document.getElementById("vanguard-modal");

    if(existing){
        existing.remove();
    }

    const modal = document.createElement("div");

    modal.id = "vanguard-modal";

    modal.innerHTML = `
        <div class="vanguard-modal-overlay">

            <div class="vanguard-modal-box">

                <p>${message}</p>

                <div class="vanguard-modal-actions">

                    <button class="modal-cancel">
                        Cancel
                    </button>

                    <button class="modal-confirm">
                        Confirm
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".modal-cancel")
    .onclick = () => modal.remove();

    modal.querySelector(".modal-confirm")
    .onclick = () => {

        modal.remove();

        onConfirm();

    };

};
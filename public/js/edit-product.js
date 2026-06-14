import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const params =
new URLSearchParams(location.search);

const productId =
params.get("id");

const form =
document.getElementById("edit-product-form");

const uploadBox =
document.getElementById("upload-image-box");

let uploadedImageUrl = "";

async function loadProduct(){

    const snap =
    await getDoc(
        doc(db,"products",productId)
    );

    if(!snap.exists()){

        showToast("Product not found.");

        location.href="/admin";

        return;
    }

    const product =
    snap.data();

    document.getElementById(
        "prod-title"
    ).value =
    product.title;

    document.getElementById(
        "prod-price"
    ).value =
    product.price;

    document.getElementById(
        "prod-quantity"
    ).value =
    product.quantity;

    document.getElementById(
        "prod-desc"
    ).value =
    product.description;

    uploadedImageUrl =
    product.image;

    uploadBox.innerHTML = `
    <img
    src="${product.image}"
    style="
    width:100%;
    height:180px;
    object-fit:cover;
    border-radius:8px;
    ">
    `;

    document
    .querySelectorAll(
        'input[name="prod_sizes"]'
    )
    .forEach(box=>{

        box.checked =
        product.sizes.includes(
            box.value
        );

    });

    document
    .querySelectorAll(
        'input[name="prod_colors"]'
    )
    .forEach(box=>{

        box.checked =
        product.colors.includes(
            box.value
        );

    });

}

loadProduct();

uploadBox.onclick = ()=>{

    cloudinary.openUploadWidget(

        {
            cloudName:"dzkyhxdy9",

            uploadPreset:"transformations",

            multiple:false
        },

        (error,result)=>{

            if(
                !error &&
                result &&
                result.event==="success"
            ){

                uploadedImageUrl =
                result.info.secure_url;

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

        }

    );

};

document
.getElementById("back-admin-btn")
.addEventListener("click", async (e) => {

    e.preventDefault();

    await updateDoc(
        doc(db, "products", productId),
        {
            isEditing: false
        }
    );

    location.href = "/admin";
});

form.addEventListener(
"submit",
async(e)=>{

e.preventDefault();

const colors = [

...document.querySelectorAll(
"input[name='prod_colors']:checked"
)

].map(el=>el.value);

const sizes = [

...document.querySelectorAll(
"input[name='prod_sizes']:checked"
)

].map(el=>el.value);

await updateDoc(

    doc(
        db,
        "products",
        productId
    ),

    {

        title:
        document.getElementById(
            "prod-title"
        ).value,

        price:Number(
            document.getElementById(
                "prod-price"
            ).value
        ),

        quantity:Number(
            document.getElementById(
                "prod-quantity"
            ).value
        ),

        description:
        document.getElementById(
            "prod-desc"
        ).value,

        image:
        uploadedImageUrl,

        sizes,

        colors,

        isEditing:false

    }

);

showToast(
    "Product updated successfully."
);

await updateDoc(
    doc(db,"products",productId),
    {
        isEditing:false
    }
);

location.href="/admin";

});

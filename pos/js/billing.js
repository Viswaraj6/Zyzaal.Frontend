const BASE_URL = "https://fark618-backend.onrender.com";

window.onload = () => {
    loadProducts();
};

async function loadProducts() {

    try {

        const res = await fetch(BASE_URL + "/products");
        const products = await res.json();

        renderProducts(products);

    } catch (err) {
        console.error("Error loading products:", err);
    }

}

function renderProducts(products) {

    const grid = document.getElementById("productGrid");

    grid.innerHTML = "";

    products.forEach(product => {

        grid.innerHTML += `
            <div class="product-card" onclick="addToCart('${product._id}')">

                <img src="${product.primaryImage}"
                     style="width:100%;height:170px;object-fit:cover;border-radius:10px;">

                <h4>${product.name}</h4>

                <small>${product.styleNo || ""}</small>

                <p>₹${product.price}</p>

            </div>
        `;

    });

}

function addToCart(id){

    alert("Product ID : " + id);

}

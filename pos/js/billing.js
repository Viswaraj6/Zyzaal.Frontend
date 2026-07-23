const BASE_URL = "https://fark618-backend.onrender.com";

let allProducts = [];

window.onload = () => {
    loadProducts();
};

async function loadProducts() {
    try {
        const res = await fetch(BASE_URL + "/products");
        allProducts = await res.json();

        renderProducts(allProducts);

    } catch (err) {
        console.error(err);
    }
}

function renderProducts(products) {

    const grid = document.getElementById("productGrid");

    grid.innerHTML = "";

    products.forEach(product => {

        const totalStock =
            (product.stock?.S || 0) +
            (product.stock?.M || 0) +
            (product.stock?.L || 0) +
            (product.stock?.XL || 0) +
            (product.stock?.XXL || 0);

        grid.innerHTML += `
        <div class="product-card" onclick="openProduct('${product._id}')">

            <img src="${product.primaryImage}" class="product-img">

            <h3>${product.name}</h3>

            <p>${product.category}</p>

            <p>Stock : ${totalStock}</p>

            <h4>₹${product.price}</h4>

        </div>
        `;
    });

}

function openProduct(id){

    const product = allProducts.find(p => p._id === id);

    console.log(product);

}

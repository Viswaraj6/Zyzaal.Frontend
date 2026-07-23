const BASE_URL = "https://fark618-backend.onrender.com";
const PRODUCTS_PER_PAGE = 12;

let currentPage = 1;

let allProducts = [];

window.onload = () => {
    loadProducts();
};

async function loadProducts() {
    try {
        const res = await fetch(BASE_URL + "/products");
       allProducts = await res.json();

console.log(allProducts);
console.log(allProducts[0]);

renderProducts();
renderPagination();

    } catch (err) {
        console.error(err);
    }
}

function renderProducts(){

    const grid = document.getElementById("productGrid");

    grid.innerHTML = "";

    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;

    const end = start + PRODUCTS_PER_PAGE;

    const products = allProducts.slice(start,end);

    products.forEach(product=>{

        grid.innerHTML += `
        <div class="product-card"
             onclick="openProduct('${product._id}')">

            <img src="${product.primaryImage}" class="product-img">

            <div class="product-info">

                <h3>${product.name}</h3>

                <small>${product.category}</small>

                <p>Stock : ${product.stock}</p>

                <div class="product-price">
                    ₹${product.price}
                </div>

            </div>

        </div>
        `;

    });

}
function openProduct(id){

    const product = allProducts.find(p => p._id === id);

    let sizeText = "";

    product.sizeStock.forEach(size => {

        sizeText +=
        `${size.size}  |  Stock : ${size.stock}  |  Barcode : ${size.sku}\n`;

    });

    console.log(sizeText);

}

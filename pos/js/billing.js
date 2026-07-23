const BASE_URL = "https://fark618-backend.onrender.com";
const PRODUCTS_PER_PAGE = 12;

let currentPage = 1;

let allProducts = [];

window.onload = () => {

    loadProducts();

    document
        .getElementById("barcodeInput")
        .addEventListener("keydown", barcodeScan);

};
async function loadProducts() {
    try {
        const res = await fetch(BASE_URL + "/products");
       allProducts = await res.json();

console.log(allProducts);
console.log(allProducts[0]);



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
function renderPagination(){

    const pageDiv = document.getElementById("pagination");

    pageDiv.innerHTML="";

    const totalPages =
        Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);

    for(let i=1;i<=totalPages;i++){

        pageDiv.innerHTML += `
        <button
        class="${i===currentPage?'active':''}"
        onclick="changePage(${i})">

        ${i}

        </button>
        `;

    }

}
function changePage(page){

    currentPage = page;

    renderProducts();

    renderPagination();

}

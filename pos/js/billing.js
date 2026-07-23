const BASE_URL = "https://fark618-backend.onrender.com";
const PRODUCTS_PER_PAGE = 12;

let currentPage = 1;

let allProducts = [];

let cart = [];
window.onload = () => {

    loadProducts();

    const barcodeInput = document.getElementById("barcodeInput");

    barcodeInput.addEventListener("keydown", barcodeScan);

    barcodeInput.addEventListener("input", searchProducts);

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
function barcodeScan(e){

    if(e.key !== "Enter") return;

    const barcode = e.target.value.trim();

    if(barcode==="") return;

    const product = allProducts.find(p =>

        p.sizeStock.some(s => s.sku === barcode)

    );

    if(!product){

        e.target.value="";

        return;

    }

    const size = product.sizeStock.find(s => s.sku===barcode);

    console.log(product);

    console.log(size);

    addToCart(product,size);
    closeSearch();
    e.target.value="";

}
function addToCart(product,size){

    const existing = cart.find(item =>

        item.barcode === size.sku

    );

    if(existing){

        existing.qty++;

    }else{

        cart.push({

            product: product.name,

            category: product.category,

            barcode: size.sku,

            size: size.size,

            price: product.price,

            qty:1

        });

    }

    console.log(cart);

    renderCart();

}
function renderCart(){

    const cartBody = document.querySelector(".cart-body");

    cartBody.innerHTML = "";

    cart.forEach((item,index)=>{

        cartBody.innerHTML += `

        <div class="cart-item">

            <div>${index+1}</div>

            <div>

                <strong>${item.product}</strong><br>

                <small>${item.barcode}</small>

            </div>

            <div>${item.size}</div>

            <div>${item.qty}</div>

            <div>₹${item.price}</div>

            <div>₹${item.qty * item.price}</div>

        </div>

        `;

    });

}
function openSearch(list){

    document
    .getElementById("searchPopup")
    .classList.remove("hidden");

    const box =
    document.getElementById("popupResults");

    box.innerHTML="";

    list.forEach(product=>{

        box.innerHTML += `

        <div class="popup-card"
             onclick="openProduct('${product._id}')">

            <img src="${product.primaryImage}">

            <h4>${product.styleNo}</h4>

            <small>${product.category}</small>

            <p>₹${product.price}</p>

        </div>

        `;

    });

}

function closeSearch(){

    document
    .getElementById("searchPopup")
    .classList.add("hidden");

}
function searchProducts(e){

    const value = e.target.value.trim().toLowerCase();

    // Empty என்றால் popup close
    if(value === ""){

        closeSearch();
        return;

    }

    // 3 characters க்கு குறைவாக இருந்தால் popup வேண்டாம்
    if(value.length < 3){

        closeSearch();
        return;

    }

    const result = allProducts.filter(product =>

        product.styleNo.toLowerCase().includes(value) ||

        product.category.toLowerCase().includes(value) ||

        product.name.toLowerCase().includes(value)

    );

    if(result.length === 0){

        closeSearch();
        return;

    }

    openSearch(result);

}

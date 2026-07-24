const BASE_URL = "https://fark618-backend.onrender.com";
const PRODUCTS_PER_PAGE = 12;

let currentPage = 1;

let allProducts = [];

let cart = [];
let html5QrCode = null;
let scanLock = false;

window.onload = () => {

    loadProducts();

    const barcodeInput =
        document.getElementById("barcodeInput");

    barcodeInput.addEventListener("keydown", barcodeScan);
    barcodeInput.addEventListener("input", searchProducts);

    document
        .getElementById("cameraBtn")
        .addEventListener("click", openCamera);

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

    document.getElementById("sizeTitle").innerHTML =
        product.styleNo + " - " + product.name;

    const box = document.getElementById("sizeList");

    box.innerHTML = "";

    product.sizeStock.forEach(size=>{

        box.innerHTML += `

        <div class="size-item"
             onclick="selectSize('${product._id}','${size.sku}')">

            <div>

                <strong>${size.size}</strong>

            </div>

            <div>

                Stock : ${size.stock}

            </div>

        </div>

        `;

    });

    document
        .getElementById("sizePopup")
        .classList.remove("hidden");

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

showScanToast(product.name + " (" + size.size + ") Added");
}
function renderCart(){

    const cartBody = document.querySelector(".cart-body");

    cartBody.innerHTML = "";

    let grandTotal = 0;
    let totalQty = 0;

    cart.forEach((item,index)=>{

        const amount = item.qty * item.price;

        grandTotal += amount;
        totalQty += item.qty;

        cartBody.innerHTML += `

<div class="cart-item">

    <div>${index+1}</div>

    <div>
        <strong>${item.product}</strong><br>
        <small>${item.barcode}</small>
    </div>

    <div>
        ${item.size}
    </div>

    <div>
        <button onclick="changeQty(${index},-1)">−</button>

        <span style="margin:0 8px;">${item.qty}</span>

        <button onclick="changeQty(${index},1)">+</button>
    </div>

    <div>₹${item.price}</div>

    <div>₹${amount}</div>

    <div>
        <button onclick="removeItem(${index})">🗑️</button>
    </div>

</div>

`;
    });

    document.getElementById("totalQty").innerText = totalQty;
    document.getElementById("grandTotal").innerText = grandTotal;
    document.getElementById("subTotal").innerText = grandTotal;
    document.getElementById("paymentGrandTotal").innerText = grandTotal;
    document.getElementById("itemCount").innerText = cart.length;
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
function closeSize(){

    document
        .getElementById("sizePopup")
        .classList.add("hidden");

}

function selectSize(productId,barcode){

    const product =
        allProducts.find(p=>p._id===productId);

    const size =
        product.sizeStock.find(s=>s.sku===barcode);

    addToCart(product,size);

    closeSize();

    closeSearch();

    document
        .getElementById("barcodeInput")
        .value="";

}
function changeQty(index,value){

    cart[index].qty += value;

    if(cart[index].qty <= 0){

        cart.splice(index,1);

    }

    renderCart();

}

function removeItem(index){

    cart.splice(index,1);

    renderCart();

}
function openCamera(){
console.log("Camera Button Clicked");
    document
        .getElementById("cameraPopup")
        .classList.remove("hidden");

    if(html5QrCode){
        html5QrCode.stop().catch(()=>{});
    }

    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(

        { facingMode: { exact: "environment" } },

        {
            fps:10,

            qrbox:{
                width:280,
                height:180
            }
        },

        onScanSuccess,

        ()=>{}

    ).catch(err=>{

        console.log(err);

        alert("Camera Open Failed");

    });

}
function onScanSuccess(decodedText, decodedResult){

    if(scanLock) return;

    scanLock = true;

    document.getElementById("barcodeInput").value = decodedText;

    barcodeScan({

        key:"Enter",

        target:{
            value:decodedText
        }

    });

    setTimeout(()=>{

        scanLock = false;

    },1500);

}
function closeCamera(){

    if(!html5QrCode) return;

    html5QrCode.stop()

    .then(()=>{

        html5QrCode.clear();

        html5QrCode = null;

        document
            .getElementById("cameraPopup")
            .classList.add("hidden");

    })

    .catch(console.error);

}
function showScanToast(text){

    const toast = document.getElementById("scanToast");

    toast.innerHTML = "✅ " + text;

    toast.classList.remove("hidden");

    document.getElementById("beepSound").play();

    setTimeout(()=>{

        toast.classList.add("hidden");

    },1500);

}
function toggleSidebar(){

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");

}

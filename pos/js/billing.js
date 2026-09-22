const BASE_URL = "https://fark618-backend.onrender.com";
const DEFAULT_BRAND_ID = "FARK618";

let currentBrandId =
    localStorage.getItem("posBrandId") || DEFAULT_BRAND_ID;
const PRODUCTS_PER_PAGE = 12;

let currentPage = 1;

let allProducts = [];

let cart = [];
let discountAmount = 0;
let paymentHistory = [];
let receivedAmount = 0;
let remainingAmount = 0;
let cashPaid = 0;
let currentPaymentMode = "Cash";
let currentPaymentTotal = 0;
let html5QrCode = null;
let scanLock = false;
let selectedCustomer = null;
let isEditMode = false;

window.onload = async() => {
initializeBrandSelector();
   await loadProducts();

    const barcodeInput =
        document.getElementById("barcodeInput");

    barcodeInput.addEventListener("keydown", barcodeScan);
    barcodeInput.addEventListener("input", searchProducts);

    document
        .getElementById("cameraBtn")
        .addEventListener("click", openCamera);
    document
    .getElementById("customerSearch")
    .addEventListener("input", searchCustomer);

    document
    .getElementById("custMobile")
    .addEventListener("input", validateMobile);
    
    const savedCart = JSON.parse(localStorage.getItem("cart"));

    if (savedCart) {
    cart = savedCart;
    }
    loadSelectedCustomer();
    renderCart();
};
window.addEventListener("pageshow", () => {
    loadSelectedCustomer();
    renderCart();
});

function initializeBrandSelector() {

    const brandSelect =
        document.getElementById("brandSelect");

    if (!brandSelect) return;

    brandSelect.value = currentBrandId;
}
async function changeBrand(brandId) {

    if (
        brandId !== "FARK618" &&
        brandId !== "ZYZAAL"
    ) {
        alert("Invalid Brand");
        return;
    }

    if (brandId === currentBrandId) {
        return;
    }

    if (cart.length > 0) {

        const confirmChange = confirm(
            "Cart contains items. Change brand and clear cart?"
        );

        if (!confirmChange) {

            const brandSelect =
                document.getElementById("brandSelect");

            if (brandSelect) {
                brandSelect.value = currentBrandId;
            }

            return;
        }

        cart = [];

        localStorage.removeItem("cart");

        renderCart();
    }

    currentBrandId = brandId;

    localStorage.setItem(
        "posBrandId",
        currentBrandId
    );

    currentPage = 1;

    await loadProducts();

    console.log(
        "Current Brand:",
        currentBrandId
    );
}

async function loadProducts() {
    try {
        const url =
            `${BASE_URL}/products?brandId=${encodeURIComponent(currentBrandId)}`;

        const res = await fetch(url);

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.message || "Products loading failed"
            );
        }

        allProducts = Array.isArray(data)
            ? data
            : Array.isArray(data.products)
                ? data.products
                : [];

        console.log(
            `${currentBrandId} products loaded:`,
            allProducts.length
        );

        renderProducts();

        if (allProducts.length > 0) {
            console.log("First product:", allProducts[0]);
        }

    } catch (err) {
        console.error("Product loading error:", err);

        allProducts = [];

        alert(
            `${currentBrandId} products load failed: ${err.message}`
        );
    }
}
function renderProducts(){

    const grid = document.getElementById("productGrid");
    if (!grid) return;
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
            onclick="selectSize('${product._id}','${size.size}')"

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

function findVariantByBarcode(barcode) {
    const cleanBarcode = String(barcode).trim();

    for (const product of allProducts) {

        const variants = Array.isArray(product.variants)
            ? product.variants
            : [];

        const variant = variants.find(v =>
            String(v.barcode || "").trim() === cleanBarcode
        );

        if (variant) {
            return {
                product,
                variant
            };
        }
    }

    return null;
}

function barcodeScan(e) {

    if (e.key !== "Enter") return;

    const barcode = String(e.target.value).trim();

    if (!barcode) return;

    // Barcode must be exactly 12 digits
    if (!/^\d{12}$/.test(barcode)) {

        alert("Invalid Barcode. Enter 12-digit barcode.");

        e.target.value = "";

        return;
    }

    const found = findVariantByBarcode(barcode);

    if (!found) {

        alert(
            `Product not found for barcode: ${barcode}`
        );

        e.target.value = "";

        return;
    }

    const product = found.product;
    const variant = found.variant;

    const size = {
        size: variant.size,
        stock: variant.openingStock ?? 0,
        sku: variant.sku || "",
        barcode: variant.barcode || barcode,
        colour: variant.colour || "",
        sellingPrice: variant.sellingPrice ?? product.price
    };

    addToCart(product, size, variant);

    closeSearch();

    e.target.value = "";
}
function addToCart(product, size, variant = null) {

    const barcode =
        variant?.barcode ||
        size?.barcode ||
        size?.sku ||
        "";

    const existing = cart.find(item =>
        item.productId === product._id &&
        item.barcode === barcode
    );

    if (existing) {

        existing.qty++;

    } else {

        cart.push({

            productId: product._id,

            brandId: currentBrandId,

            product: product.name,

            category: product.category,

            barcode: barcode,

            sku: variant?.sku || size?.sku || "",

            variantId: variant?._id || null,

            colour: variant?.colour || size?.colour || "",

            size: variant?.size || size?.size || "",

            price:
                variant?.sellingPrice ??
                size?.sellingPrice ??
                product.price ??
                0,

            purchaseRate: variant?.purchaseRate ?? 0,

            hsnCode: product.hsnCode || "",

            qty: 1

        });
    }

    renderCart();

    calculateTotal();
}
function renderCart(){

    const cartBody = document.querySelector(".cart-body");
    const emptyCart = document.getElementById("emptyCart");
const cartHeader = document.getElementById("cartHeader");
const clearBtn = document.querySelector(".clear-all-btn");
    if (cart.length === 0) {
  if (clearBtn) clearBtn.style.display = "none";
    emptyCart.classList.remove("hidden");
    cartHeader.classList.add("hidden");
document.getElementById("selectedCustomerBox")
    .classList.add("hidden");

document.querySelector(".customer-btn").style.display = "none";
    cartBody.innerHTML = "";

    document.getElementById("footerItems").innerText = 0;
document.getElementById("footerQty").innerText = 0;
document.getElementById("footerAmount").innerText = 0;

document.getElementById("subTotal").innerText = 0;
document.getElementById("grandTotal").innerText = 0;
document.getElementById("paymentGrandTotal").innerText = 0;

document.getElementById("checkoutAmount").innerText = 0;
        
   updateGoCartBar();
    return;

}
    cartBody.innerHTML = "";
   if (clearBtn) clearBtn.style.display = "block";
    emptyCart.classList.add("hidden");
cartHeader.classList.remove("hidden");
// Cart has items

document.querySelector(".customer-btn").style.display = "";

if (selectedCustomer) {

    document.querySelector(".customer-btn").style.display = "none";

    document.getElementById("selectedCustomerBox")
        .classList.remove("hidden");

} else {

    document.getElementById("selectedCustomerBox")
        .classList.add("hidden");

}
    let subTotalAmount = 0;
    let totalQty = 0;

    cart.forEach((item,index)=>{

        const amount = item.qty * item.price;

      subTotalAmount += amount;
        totalQty += item.qty;

        cartBody.innerHTML += `

<div class="swipe-item">

   <div class="swipe-delete"
     onclick="removeItem(${index})">

    🗑 Remove

</div>

    <div class="cart-item">

        <div>${index+1}</div>

        <div>

            <strong>${item.product}</strong><br>

            <small>${item.barcode}</small>

        </div>

        <div>${item.size}</div>

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

</div>

`;
    });

    document.getElementById("footerItems").innerText = cart.length;

document.getElementById("footerQty").innerText = totalQty;
const netTotal = Math.max(
    0,
    subTotalAmount - discountAmount
);

const grandTotal = Math.round(netTotal);

const roundOff = grandTotal - netTotal;
 
 document.getElementById("roundOff").innerText =
    roundOff === 0
        ? "0"
        : (roundOff > 0 ? "+" : "-") + Math.abs(roundOff).toFixed(2);
   
document.getElementById("footerAmount").innerText = grandTotal;

document.getElementById("subTotal").innerText = subTotalAmount;

document.getElementById("grandTotal").innerText = grandTotal;

document.getElementById("paymentGrandTotal").innerText = grandTotal;

document.getElementById("checkoutAmount").innerText = grandTotal;
  calculateGST();  
}

async function calculateGST(){

    if(cart.length === 0) return;

    try{

        const res = await fetch(
            BASE_URL + "/calculate-gst",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    items: cart,
                    discount: discountAmount
                })
            }
        );

        const data = await res.json();

        console.log("GST RESULT:", data);
       
document.getElementById("cgstAmount").innerText =
    Number(data.cgst || 0).toFixed(2);

document.getElementById("sgstAmount").innerText =
    Number(data.sgst || 0).toFixed(2);
       
    }catch(err){

        console.error("GST Calculation Error:", err);

    }

}

function openCustomer(){

    // Mobile
    if(window.innerWidth <= 1024){

        window.location.href = "customer.html";
        return;

    }

    // Desktop
    openAddCustomer();

}
function closeCustomerPopup(){

    document
        .getElementById("customerPopup")
        .classList.add("hidden");

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

    console.log("PRODUCT:", product);
    console.log("BARCODE:", barcode);
    console.log("SIZE STOCK:", product.sizeStock);

    const size =
    product.sizeStock.find(s=>s.size===barcode);

    console.log("SELECTED SIZE:", size);

    if(!size){
        alert("Size SKU Not Found");
        return;
    }

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
   localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
updateGoCartBar();
}

function removeItem(index){

    cart.splice(index,1);
localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
 updateGoCartBar();

}
function openCamera(){

    const popup = document.getElementById("cameraPopup");
    popup.classList.remove("hidden");

    if(html5QrCode){
        html5QrCode.stop().catch(()=>{});
    }

    html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras()

    .then(cameras=>{

        if(cameras.length===0){

            alert("Camera Not Found");

            return;

        }

        let cameraId = cameras[0].id;

        // Mobile → Back Camera
        if(cameras.length>1){
            cameraId = cameras[cameras.length-1].id;
        }

        return html5QrCode.start(

    cameraId,

    {
        fps:10
    },

    onScanSuccess,

    ()=>{}

);
    })

    .catch(err=>{

        console.error(err);

        alert(err);

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
        document
    .getElementById("goCartBar")
    .classList.add("hidden");

    })

    .catch(console.error);

}
function showScanToast(product, size){

    console.log("Toast Called");

    const toast = document.getElementById("scanToast");

    if(!toast){
        console.log("scanToast Not Found");
        return;
    }

    document.getElementById("toastImage").src =
        product.primaryImage || "";

    document.getElementById("toastName").textContent =
        product.name || "";

    document.getElementById("toastSize").textContent =
        "Size : " + (size.size || "");

    toast.classList.remove("hidden");

    const beep = document.getElementById("beepSound");
    if(beep) beep.play().catch(()=>{});

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(()=>{
        toast.classList.add("hidden");
    },1500);

}
function updateGoCartBar(){

    const bar = document.getElementById("goCartBar");
    const cameraPopup = document.getElementById("cameraPopup");

    // Camera close இருந்தா Go To Cart காட்டக்கூடாது
    if(cameraPopup.classList.contains("hidden")){
        bar.classList.add("hidden");
        return;
    }

    // Cart empty இருந்தாலும் hide
    if(cart.length === 0){
        bar.classList.add("hidden");
        return;
    }

    // Camera open + Cart has items
    bar.classList.remove("hidden");

    const qty = cart.reduce((t,item)=>t + item.qty,0);
    const total = cart.reduce((t,item)=>t + (item.qty * item.price),0);

    document.getElementById("goCartItems").innerText =
        cart.length + " Items";

    document.getElementById("goCartQty").innerText =
        qty + " Qty";

    document.getElementById("goCartTotal").innerText =
        total;
}
function toggleSidebar(){

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");

}
function scrollToCart(){

    // Camera open இருந்தா close பண்ணு
    closeCamera();

    // Cart Summary-க்கு scroll பண்ணு
    document.getElementById("cartFooter").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}
function toggleFooterSummary(){

    const box =
        document.getElementById("footerSummary");

    const arrow =
        document.querySelector(".footer-arrow");

    box.classList.toggle("hidden");

    if(box.classList.contains("hidden")){

        arrow.innerHTML="▼";

    }else{

        arrow.innerHTML="▲";

    }

}
function enableSwipe() {

    if (window.innerWidth > 1024) return;

    document.querySelectorAll(".swipe-item").forEach(item => {

        const row = item.querySelector(".cart-item");

        let startX = 0;
        let currentX = 0;

        row.addEventListener("touchstart", e => {

            startX = e.touches[0].clientX;

        });

        row.addEventListener("touchmove", e => {

            currentX = e.touches[0].clientX;

            const diff = currentX - startX;

            if(diff < 0){

                row.style.transform =
                    `translateX(${Math.max(diff,-110)}px)`;

            }

        });

       row.addEventListener("touchend", () => {

    const moved = currentX - startX;

    if(moved < -120){

        row.style.transition = ".25s";

        row.style.transform = "translateX(-100%)";

        setTimeout(() => {

            const index = [...document.querySelectorAll(".swipe-item")]
                .indexOf(item);

            removeItem(index);

        }, 220);

    }
    else if(moved < -70){

        row.style.transition = ".25s";

        row.style.transform = "translateX(-110px)";

    }
    else{

        row.style.transition = ".25s";

        row.style.transform = "translateX(0px)";

    }

});
    });

}
async function searchCustomer(){

    const input = document.getElementById("customerSearch");
    const dropdown = document.getElementById("customerDropdown");
    const results = document.getElementById("customerResults");
    const createBox = document.getElementById("customerCreate");

    const value = input.value.trim();
if(isEditMode){

    return;

}
    // Empty
  if(value === ""){

    resetCustomerUI();

    return;

}
    const res = await fetch(
        BASE_URL +
        "/pos/customers/search?q=" +
        encodeURIComponent(value)
    );

    const data = await res.json();

    results.innerHTML = "";

    if(data.customers.length === 0){

        createBox.classList.remove("hidden");

        document
            .getElementById("customerForm")
            .classList.add("hidden");

        document.getElementById("custMobile").value = value;
       
        isEditMode = false;

document.getElementById("saveCustomerBtn").textContent =
    "Save Customer";

document.getElementById("custName").value = "";
document.getElementById("custEmail").value = "";
document.getElementById("custGST").value = "";
document.getElementById("custAddress").value = "";

    }else{

        createBox.classList.add("hidden");

        data.customers.forEach(customer=>{

            results.innerHTML += `
                <div class="customer-item"
                     onclick='selectCustomer(${JSON.stringify(customer)})'>

                    <strong>${customer.name}</strong><br>

                    <small>${customer.mobile}</small>

                </div>
            `;

        });

    }

    dropdown.classList.remove("hidden");

}
function selectCustomer(customer){

    selectedCustomer = customer;

    localStorage.setItem(
        "selectedCustomer",
        JSON.stringify(customer)
    );

    document.getElementById("customerSearch").value =
        `${customer.name} (${customer.mobile})`;

    document
        .getElementById("customerActions")
        .classList.remove("hidden");

    document
        .getElementById("customerDropdown")
        .classList.add("hidden");

    renderCart();
}
function openCheckout(){

    if(cart.length === 0){
        alert("Please add product first");
        return;
    }

    document.querySelector(".header").style.display = "none";
    document.getElementById("cartPanel").style.display = "none";

    document.getElementById("paymentPanel").style.display = "block";

}
function backToCart(){
     document.querySelector(".header").style.display = "flex";
    document.getElementById("paymentPanel").style.display = "none";

    document.getElementById("cartPanel").style.display = "flex";

}
function toggleCustomerForm(){
document.getElementById("noCustomerMsg").style.display = "none";

document.getElementById("createCustomerBtn").style.display = "none";
    document
        .getElementById("customerForm")
        .classList.remove("hidden");

}
function closeCustomerForm(){

    isEditMode = false;

    document.getElementById("saveCustomerBtn").textContent =
        "Save Customer";

    document.getElementById("customerForm")
        .classList.add("hidden");

    document.getElementById("customerCreate")
        .classList.add("hidden");

    document.getElementById("noCustomerMsg").style.display = "";

    document.getElementById("createCustomerBtn").style.display = "";

}

function validateMobile(){

    const mobile =
        document.getElementById("custMobile");

    const status =
        document.getElementById("mobileStatus");

    const value = mobile.value.trim();

    // Digits only
    mobile.value = value.replace(/\D/g,"");

    if(mobile.value.length === 0){

        mobile.classList.remove("mobile-valid");
        mobile.classList.remove("mobile-invalid");

        status.textContent = "";

        return;

    }

    if(/^\d{10}$/.test(mobile.value)){

        mobile.classList.add("mobile-valid");
        mobile.classList.remove("mobile-invalid");

        status.textContent = "✓";

        status.className = "mobile-status valid";

    }else{

        mobile.classList.add("mobile-invalid");
        mobile.classList.remove("mobile-valid");

        status.textContent = "✕";

        status.className = "mobile-status invalid";

    }

}
async function saveCustomer(){

    const name = document.getElementById("custName").value.trim();
    const mobile = document.getElementById("custMobile").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    const gst = document.getElementById("custGST").value.trim();
    const address = document.getElementById("custAddress").value.trim();

    if(name === ""){

        alert("Enter Customer Name");
        return;

    }

    if (name === "") {
    alert("Enter Customer Name");
    return;
}

if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10-digit Mobile Number");
    return;
}

if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid Email");
    return;
}
    // GST Optional
if (gst !== "" && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase())) {

    alert("Enter a valid GST Number");

    return;

}
    try{

      let url = BASE_URL + "/pos/customers";
let method = "POST";

if (isEditMode) {
    url = BASE_URL + "/pos/customers/" + selectedCustomer._id;
    method = "PUT";
}

const res = await fetch(url, {
    method: method,
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        name,
        mobile,
        email,
        gstNo: gst,
        address
    })
});
        const data = await res.json();

        if(!res.ok){

            alert(data.message || "Unable to save customer");
            return;

        }

        // Auto Select Customer
        selectedCustomer = data.customer;
alert(
    isEditMode
        ? "Customer Updated Successfully"
        : "Customer Saved Successfully"
);
        document.getElementById("customerSearch").value =
            `${data.customer.name} (${data.customer.mobile})`;

        // Close Dropdown
        document.getElementById("customerDropdown")
            .classList.add("hidden");
        document
    .getElementById("customerActions")
    .classList.remove("hidden");

        // Clear Form
        document.getElementById("custName").value = "";
        document.getElementById("custMobile").value = "";
        document.getElementById("custEmail").value = "";
        document.getElementById("custGST").value = "";
        document.getElementById("custAddress").value = "";

    }catch(err){

        console.error(err);
        alert("Server Error");

    }

}
function resetCustomerUI(){

    const dropdown = document.getElementById("customerDropdown");

    dropdown.classList.add("hidden");
    dropdown.classList.remove("show-form");

    document.getElementById("customerResults").innerHTML = "";

    document.getElementById("customerCreate")
        .classList.add("hidden");

    document.getElementById("customerForm")
        .classList.add("hidden");

    document.getElementById("noCustomerMsg").style.display = "";

    document.getElementById("createCustomerBtn").style.display = "";

    document.getElementById("saveCustomerBtn").textContent =
        "Save Customer";

    isEditMode = false;
}

function clearCustomer(){

    selectedCustomer = null;

    document.getElementById("customerSearch").value = "";

    resetCustomerUI();

    document
        .getElementById("customerActions")
        .classList.add("hidden");

}
function editCustomer(){

    if(!selectedCustomer) return;

    isEditMode = true;

    const dropdown = document.getElementById("customerDropdown");

    dropdown.classList.remove("hidden");
    dropdown.classList.add("show-form");
document.getElementById("customerCreate").classList.remove("hidden");
document.getElementById("customerResults").innerHTML = "";
document.getElementById("noCustomerMsg").style.display = "none";

document.getElementById("createCustomerBtn").style.display = "none";
    document.getElementById("customerForm").classList.remove("hidden");

    document.getElementById("custName").value =
        selectedCustomer.name || "";

    document.getElementById("custMobile").value =
        selectedCustomer.mobile || "";

    document.getElementById("custEmail").value =
        selectedCustomer.email || "";

    document.getElementById("custGST").value =
        selectedCustomer.gstNo || "";

    document.getElementById("custAddress").value =
        selectedCustomer.address || "";

    document.getElementById("saveCustomerBtn").textContent =
        "Update Customer";

}
function loadSelectedCustomer(){

    const customer = JSON.parse(
        localStorage.getItem("selectedCustomer")
    );

    // Customer இல்லை
    if(!customer){

        selectedCustomer = null;

        document.getElementById("customerSearch").value = "";

        document
            .getElementById("customerActions")
            .classList.add("hidden");

        const box =
            document.getElementById("selectedCustomerBox");

        box.classList.remove("show");
        box.classList.add("hidden");

        return;
    }

    selectedCustomer = customer;

    // Desktop
    document.getElementById("customerSearch").value =
        `${customer.name} (${customer.mobile})`;

    document
        .getElementById("customerActions")
        .classList.remove("hidden");

    // Mobile Customer Card
    document.getElementById("selectedCustomerName").innerText =
        customer.name;

    document.getElementById("selectedCustomerMobile").innerText =
        customer.mobile;

    const box =
        document.getElementById("selectedCustomerBox");

    if(window.innerWidth <= 800){

        box.classList.remove("hidden");
        box.classList.add("show");

        document.querySelector(".customer-btn").style.display = "none";

    }else{

        box.classList.add("hidden");

    }


}
function editSelectedCustomer(){

    if(!selectedCustomer) return;

    localStorage.setItem(
        "editCustomer",
        JSON.stringify(selectedCustomer)
    );

    window.location.href = "customer.html";
}

function clearSelectedCustomer(){

    localStorage.removeItem("selectedCustomer");

    selectedCustomer = null;

    const box = document.getElementById("selectedCustomerBox");

box.classList.remove("show");
box.classList.add("hidden");

    document.getElementById("customerSearch").value = "";

    document
        .getElementById("customerActions")
        .classList.add("hidden");
if (cart.length > 0) {
    document.querySelector(".customer-btn").style.display = "";
} else {
    document.querySelector(".customer-btn").style.display = "none";
}
}
function openPayment(mode){
if(cart.length === 0){
    alert("Please add product first");
    return;
}
    currentPaymentMode = mode;

    document.getElementById("paymentTitle").innerText =
        mode + " Payment";

    document.querySelector(".payment-body h3").innerText =
        mode + " Received";

    let amount;

    const existingPayment =
        paymentHistory.find(p => p.mode === mode);

    if(existingPayment){

        amount = existingPayment.amount;

        currentPaymentTotal =
            existingPayment.amount + remainingAmount;

    }else if(remainingAmount > 0){

        amount = remainingAmount;

        currentPaymentTotal = remainingAmount;

    }else{

        amount = parseFloat(
            document.getElementById("paymentGrandTotal").innerText
        );

        currentPaymentTotal = amount;

    }

    document.getElementById("cashReceived").value = amount;

    generateQuickAmounts(amount);

    calculateCash();

    // Mobile மட்டும் Payment Panel Hide
    if(window.innerWidth <= 800){

        document.getElementById("paymentPanel").style.display = "none";

    }

    // Desktop + Mobile இரண்டுக்கும்
    document.getElementById("cashScreen").style.display = "flex";

}
function closeCashScreen(){

    document.getElementById("cashScreen").style.display = "none";

    if(window.innerWidth <= 800){

        document.getElementById("paymentPanel").style.display = "block";

    }

}
function generateQuickAmounts(total){

    const box = document.getElementById("quickAmountButtons");

    box.innerHTML = "";

    const amounts = [
        total,
        Math.ceil(total / 100) * 100,
        Math.ceil(total / 500) * 500,
        Math.ceil(total / 1000) * 1000,
        Math.ceil(total / 5000) * 5000
    ];

    [...new Set(amounts)].forEach(amount=>{

        box.innerHTML += `
            <button onclick="selectQuickAmount(${amount},this)">
                ₹${amount}
            </button>
        `;

    });

}
function selectQuickAmount(amount,btn){

    document.getElementById("cashReceived").value = amount;

    document
        .querySelectorAll("#quickAmountButtons button")
        .forEach(b=>b.classList.remove("active"));

    btn.classList.add("active");

    calculateCash();

}
function calculateCash(){

const total = currentPaymentTotal;

    const received = parseFloat(document.getElementById("cashReceived").value) || 0;
   receivedAmount = received;

const balance = total - received;
    const result = document.getElementById("cashResult");
    const message = document.getElementById("cashMessage");

    result.innerHTML = "Save Bill";

   if(received < total){

    message.innerHTML = `
        <span class="cash-remaining">
         Remaining ₹${(total-received).toFixed(0)}
        </span>`;

    result.innerHTML = "Next Payment ➜";

}
else if(received > total){

    message.innerHTML = `
        <span class="cash-return">
            Return ₹${(received-total).toFixed(0)}
        </span>`;

    result.innerHTML = "Save Bill";

}
else{

    message.innerHTML = "";

    result.innerHTML = "Save Bill";

}
}
function cashButtonAction(){

    const amount = receivedAmount;

   const alreadyPaid = paymentHistory.find(
    p => p.mode === currentPaymentMode
);

if (alreadyPaid && remainingAmount > 0) {

    alreadyPaid.amount = amount;

} else {

    paymentHistory = paymentHistory.filter(
        p => p.mode !== currentPaymentMode
    );

    paymentHistory.push({
        mode: currentPaymentMode,
        amount: amount
    });

}
    // Remaining calculate
    const paid = paymentHistory.reduce(
        (t,p)=>t+p.amount,
        0
    );

    const grandTotal =
        parseFloat(document.getElementById("paymentGrandTotal").innerText);

    remainingAmount = grandTotal - paid;

    if(remainingAmount > 0){

        openRemainingPayment();

    }else{

        saveBill();

    }

}
function openRemainingPayment(){

    document.getElementById("cashScreen").style.display = "none";

    document.getElementById("paymentPanel").style.display = "block";

    // Grand Total change pannatheenga

    renderPaymentHistory();

}
function renderPaymentHistory(){

    const cashBtn = document.getElementById("cashBtn");

   
    const cardBtn = document.getElementById("cardBtn");
    const upiBtn = document.getElementById("upiBtn");
    const creditBtn = document.getElementById("creditBtn");
    const cash = paymentHistory.find(p => p.mode === "Cash");
    const card = paymentHistory.find(p => p.mode === "Card");
    const upi = paymentHistory.find(p => p.mode === "UPI");
    const credit = paymentHistory.find(p => p.mode === "Credit Note");

    cashBtn.innerHTML = cash
? `<span class="pay-icon">💵 Cash</span><span class="pay-value">₹${cash.amount}</span>`
: `<span class="pay-icon">💵 Cash</span>`;

cardBtn.innerHTML = card
? `<span class="pay-icon">💳 Card</span><span class="pay-value">₹${card.amount}</span>`
: `<span class="pay-icon">💳 Card</span>`;

upiBtn.innerHTML = upi
? `<span class="pay-icon">📱 UPI</span><span class="pay-value">₹${upi.amount}</span>`
: `<span class="pay-icon">📱 UPI</span>`;

creditBtn.innerHTML = credit
? `<span class="pay-icon">🧾 Credit Note</span><span class="pay-value">₹${credit.amount}</span>`
: `<span class="pay-icon">🧾 Credit Note</span>`;
    if(cash){

        cashBtn.innerHTML = `
            <span class="pay-icon">💵 Cash</span>
            <span class="pay-value">₹${cash.amount}</span>
        `;

    }else{

        cashBtn.innerHTML = `
            <span class="pay-icon">💵 Cash</span>
        `;

    }

   if(remainingAmount > 0){

    document.getElementById("remainingLabel").innerHTML = `
        <div class="remaining-box">
            <span>Remaining</span>
            <strong>₹${remainingAmount}</strong>
        </div>
    `;

}else{

    document.getElementById("remainingLabel").innerHTML = "";

}
const saveBtn = document.getElementById("savePrintBtn");

if (saveBtn) {
    if (remainingAmount > 0) {
        saveBtn.style.display = "none";
    } else {
        saveBtn.style.display = "block";
    }
}
   }
function editCashPayment(){

    document.getElementById("paymentPanel").style.display = "none";

    document.getElementById("cashScreen").style.display = "flex";

    document.getElementById("cashReceived").value = cashPaid;

    calculateCash();

}
async function saveBill() {

    const bill = {
  brandId: currentBrandId,
        customer: selectedCustomer || null,

        items: cart,

        payments: paymentHistory,

        total: Number(document.getElementById("subTotal").innerText) || 0,

     discount: discountAmount,

roundOff:
    Number(
        document
            .getElementById("roundOff")
            .innerText
            .replace("+","")
            .replace("-","")
    ) || 0,

tax:
    Number(
        document.getElementById("cgstAmount").innerText
    ) +
    Number(
        document.getElementById("sgstAmount").innerText
    ),

cgst:
    Number(
        document.getElementById("cgstAmount").innerText
    ) || 0,

sgst:
    Number(
        document.getElementById("sgstAmount").innerText
    ) || 0,

grandTotal:
    Number(
        document.getElementById("grandTotal").innerText
    ) || 0
    };

    try {
        
        const res = await fetch(BASE_URL + "/pos/save-bill", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(bill)

        });

        const data = await res.json();

        if (!data.success) {

            alert("Bill Save Failed");
            return;

        }

       document.getElementById("savedBillNo").innerText =
    data.billNo;

document.getElementById("billSavedScreen")
    .classList.remove("hidden");

       // Reset
cart = [];
paymentHistory = [];
remainingAmount = 0;
receivedAmount = 0;
cashPaid = 0;
currentPaymentMode = "Cash";
currentPaymentTotal = 0;
discountAmount = 0;

document.getElementById("footerSummary")
    .classList.add("hidden");

document.querySelector(".footer-arrow")
    .innerHTML = "▼";
// Customer Reset
selectedCustomer = null;
// Clear Customer Card
document.getElementById("selectedCustomerName").innerText = "";
document.getElementById("selectedCustomerMobile").innerText = "";

const box = document.getElementById("selectedCustomerBox");
box.classList.remove("show");
box.classList.add("hidden");
// Storage
localStorage.removeItem("cart");
localStorage.removeItem("selectedCustomer");

// Clear Customer UI
document.getElementById("customerSearch").value = "";

document.getElementById("customerActions")
    .classList.add("hidden");

document.getElementById("selectedCustomerBox")
    .classList.add("hidden");

// Clear Payment UI
document.getElementById("remainingLabel").innerHTML = "";
document.getElementById("cashMessage").innerHTML = "";
document.getElementById("cashReceived").value = "";
document.getElementById("quickAmountButtons").innerHTML = "";

// Reset Payment Buttons
renderPaymentHistory();
resetCustomerUI();

// Refresh Cart
renderCart();
updateGoCartBar();

// Screen
document.getElementById("cashScreen").style.display = "none";

if(window.innerWidth <= 800){

    document.getElementById("paymentPanel").style.display = "none";
    document.getElementById("cartPanel").style.display = "flex";

}else{

    document.getElementById("paymentPanel").style.display = "block";
    document.getElementById("cartPanel").style.display = "flex";

}
// Header
document.querySelector(".header").style.display = "flex";

// Focus
document.getElementById("barcodeInput").focus();
    } catch (err) {

        console.error(err);

        alert("Server Error");

    }

}
function clearCart(){

    if(cart.length === 0) return;

    if(!confirm("Clear all items?")) return;

    cart = [];

    localStorage.removeItem("cart");

    renderCart();

    updateGoCartBar();
}
function openDiscount(){

    const subTotal = cart.reduce(
        (sum, item) => sum + (item.qty * item.price),
        0
    );

    document.getElementById("discountSubTotal").innerText =
        subTotal.toFixed(2);

    document.getElementById("discountModal")
        .classList.remove("hidden");

  document.getElementById("discountPercent").value =
    discountAmount > 0 && subTotal > 0
        ? ((discountAmount / subTotal) * 100).toFixed(2)
        : "";

document.getElementById("discountAmount").value =
    discountAmount > 0
        ? discountAmount.toFixed(2)
        : "";
}

function closeDiscount(){

    document
        .getElementById("discountModal")
        .classList.add("hidden");

}


function calculateDiscountFromPercent(){

    const percent =
        Number(document.getElementById("discountPercent").value) || 0;

    const subTotal =
        cart.reduce((sum,item) => sum + (item.qty * item.price), 0);

    const amount = (subTotal * percent) / 100;

    document.getElementById("discountAmount").value =
        amount.toFixed(2);

}


function calculateDiscountFromAmount(){

    const amount =
        Number(document.getElementById("discountAmount").value) || 0;

    const subTotal =
        cart.reduce((sum,item) => sum + (item.qty * item.price), 0);

    if(subTotal > 0){

        const percent = (amount / subTotal) * 100;

        document.getElementById("discountPercent").value =
            percent.toFixed(2);

    }

}


function applyDiscount(){

    const amount =
        Number(document.getElementById("discountAmount").value) || 0;

    const subTotal =
        cart.reduce((sum,item) => sum + (item.qty * item.price), 0);

    discountAmount = Math.min(amount, subTotal);

    document.getElementById("discountDisplay").innerText =
    discountAmount > 0
        ? "- ₹" + discountAmount.toFixed(2)
        : "₹0";
document.getElementById("discountAdd").innerText =
    discountAmount > 0 ? "Edit" : "+ Add";
    closeDiscount();

    renderCart();

}
function newBill(){

    document.getElementById("billSavedScreen")
        .classList.add("hidden");

    document.getElementById("barcodeInput").value = "";

    document.getElementById("barcodeInput").focus();

}
function viewSavedBill(){

    alert("View Bill - Coming Next");

}

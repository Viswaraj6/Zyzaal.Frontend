const BASE_URL =
    "https://fark618-backend.onrender.com";

let allBills = [];

let currentPage = 1;

const ITEMS_PER_PAGE = 20;

let currentBills = [];
let currentViewBill = null;
let allCustomers = [];
let selectedEditCustomer = null;

let allProducts = [];


/* ================= PRODUCT SEARCH ================= */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const invoiceProductSearch =
            document.getElementById(
                "invoiceProductSearch"
            );

        const invoiceProductResults =
            document.getElementById(
                "invoiceProductResults"
            );


        if(
            !invoiceProductSearch ||
            !invoiceProductResults
        ){
            return;
        }


        invoiceProductSearch.addEventListener(
            "input",
            function(){

                const search =
                    this.value
                        .trim()
                        .toLowerCase();

                invoiceProductResults.innerHTML = "";


                if(!search){

                    invoiceProductResults.style.display =
                        "none";

                    return;
                }


                const results =
                    allProducts.filter(product => {

                        const name =
                            String(
                                product.name || ""
                            ).toLowerCase();

                        const sku =
                            String(
                                product.sku || ""
                            ).toLowerCase();

                        const styleNo =
                            String(
                                product.styleNo || ""
                            ).toLowerCase();


                        return (
                            name.includes(search) ||
                            sku.includes(search) ||
                            styleNo.includes(search)
                        );

                    });


                results.forEach(product => {

                    const div =
                        document.createElement("div");

                    div.innerText =
                        `${product.name} | ${product.styleNo || ""}`;


                    div.onclick = function(){

                        selectInvoiceProduct(
                            product
                        );

                    };


                    invoiceProductResults
                        .appendChild(div);

                });


                invoiceProductResults.style.display =
                    results.length
                        ? "block"
                        : "none";

            }
        );

    }
);
async function loadProductsForInvoiceEdit(){

    try{

        const brandId =
            currentViewBill?.brandId ||
            localStorage.getItem("posBrandId") ||
            "ZYZAAL";

        const res = await fetch(
            BASE_URL +
            "/products?brandId=" +
            encodeURIComponent(brandId)
        );

        const data = await res.json();

        if(!res.ok){
            throw new Error(
                data.message ||
                "Products loading failed"
            );
        }

        allProducts =
            Array.isArray(data)
                ? data
                : data.products || [];

        console.log(
            "PRODUCTS:",
            allProducts
        );

    }
    catch(err){

        console.error(
            "Product Load Error:",
            err
        );

        allProducts = [];

    }

}

async function loadCustomersForEdit(){

    try{

        const res = await fetch(
            BASE_URL + "/pos/customers"
        );

        const data = await res.json();

        if(data.success){

            allCustomers =
                data.customers || [];

            console.log(
                "CUSTOMERS:",
                allCustomers
            );

        }

    }
    catch(err){

        console.error(
            "Customer Load Error:",
            err
        );

    }

}

document.addEventListener("DOMContentLoaded", function(){
document
    .getElementById("editCustomer")
    .addEventListener("input", function(){

        const query =
            this.value
                .toLowerCase()
                .trim();

        const results =
            document.getElementById(
                "customerSearchResults"
            );

        results.innerHTML = "";

        if(!query){
            results.classList.remove("show");
            return;
        }

        const matches =
            allCustomers.filter(customer => {

                const name =
                    customer.name || "";

                const mobile =
                    customer.mobile || "";

                return (
                    name.toLowerCase().includes(query) ||
                    mobile.includes(query)
                );

            });

       if(matches.length === 0){

    results.innerHTML = `

        <div class="customer-no-result">

            <div>
                No customer found
            </div>

            <button
                type="button"
                onclick="addNewCustomerFromInvoice()">

                ＋ Add New Customer

            </button>

        </div>

    `;



       }else{

    matches.slice(0, 8).forEach(customer => {

        const item =
            document.createElement("div");

        item.className =
            "customer-search-item";

        item.innerHTML = `

            <div class="customer-search-info">

                <strong>
                    ${customer.name || "-"}
                </strong>

                <small>
                    ${customer.mobile || "-"}
                </small>

            </div>

        `;

        item.onclick = function(){

            selectEditCustomer(
                customer._id
            );

        };

        results.appendChild(item);

    });

}
        results.classList.add("show");

    });
});
async function reopenInvoiceAfterCustomer(){

    const billNo =
        localStorage.getItem(
            "invoiceEditBillNo"
        );

    if(!billNo){
        return;
    }

    localStorage.removeItem(
        "invoiceEditBillNo"
    );

    // First load invoices completely
    await loadBills();

    // Open the same invoice
    viewBill(billNo);

    // Check whether a new customer was created
    const customer =
        JSON.parse(
            localStorage.getItem(
                "invoiceEditCustomer"
            )
        );

    if(customer){

        selectedEditCustomer = customer;

        currentViewBill.customer =
            customer;

        document.getElementById(
            "viewCustomer"
        ).innerText =
            customer.name ||
            "Walk-in Customer";

        document.getElementById(
            "viewMobile"
        ).innerText =
            customer.mobile || "-";

        document.getElementById(
            "editCustomer"
        ).value =
            customer.name || "";

        localStorage.removeItem(
            "invoiceEditCustomer"
        );

    }

}
function loadInvoiceEditCustomer(){

    const customer =
        JSON.parse(
            localStorage.getItem(
                "invoiceEditCustomer"
            )
        );

    if(!customer){
        return;
    }

    selectedEditCustomer = customer;

    localStorage.removeItem(
        "invoiceEditCustomer"
    );

    /* Update current invoice customer */

    if(currentViewBill){

        currentViewBill.customer =
            customer;

        document.getElementById(
            "viewCustomer"
        ).innerText =
            customer.name ||
            "Walk-in Customer";

        document.getElementById(
            "viewMobile"
        ).innerText =
            customer.mobile || "-";

        document.getElementById(
            "editCustomer"
        ).value =
            customer.name || "";

    }

}

/* ================= LOAD BILLS ================= */

async function loadBills(){

     document.getElementById("searchInvoice").value = "";

    document.getElementById("invoiceDate").value = "";

    document.getElementById("paymentFilter").value = "";

    currentPage = 1;

    try{

       const currentBrandId =
    localStorage.getItem("posBrandId") || "FARK618";

const res = await fetch(
    BASE_URL +
    "/pos/bills?brandId=" +
    encodeURIComponent(currentBrandId)
);

        const data = await res.json();

        console.log("INVOICE DATA:", data);

        if(!data.success){

            document.getElementById("invoiceList").innerHTML = `
                <tr>
                    <td colspan="9">
                        Failed to load invoices
                    </td>
                </tr>
            `;

            return;
        }

        allBills = data.bills || [];

        renderBills(allBills);

    }
    catch(err){

        console.error(err);

        document.getElementById("invoiceList").innerHTML = `
            <tr>
                <td colspan="9">
                    Server connection failed
                </td>
            </tr>
        `;

    }

}


/* ================= RENDER BILLS ================= */

function renderBills(bills){

    const container =
        document.getElementById("invoiceList");

    container.innerHTML = "";
currentBills = bills;

const totalPages =
    Math.ceil(bills.length / ITEMS_PER_PAGE);

if(currentPage > totalPages && totalPages > 0){
    currentPage = totalPages;
}

const startIndex =
    (currentPage - 1) * ITEMS_PER_PAGE;

const endIndex =
    startIndex + ITEMS_PER_PAGE;

const pageBills =
    bills.slice(startIndex, endIndex);

    /* ================= SUMMARY ================= */

    let totalSales = 0;

    bills.forEach(bill => {

        totalSales += Number(
            bill.grandTotal || 0
        );

    });


    document.getElementById("totalInvoices").innerText =
        bills.length;


    document.getElementById("totalSales").innerText =
        "₹" + totalSales.toLocaleString("en-IN");


    document.getElementById("totalReturns").innerText =
        "₹0";


    document.getElementById("netSales").innerText =
        "₹" + totalSales.toLocaleString("en-IN");


    const showingFrom =
    bills.length === 0
        ? 0
        : startIndex + 1;

const showingTo =
    Math.min(
        endIndex,
        bills.length
    );

document.getElementById("invoiceCount").innerText =
    "Showing " +
    showingFrom +
    " to " +
    showingTo +
    " of " +
    bills.length +
    " invoices";

    /* ================= EMPTY ================= */

    if(bills.length === 0){

        container.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;">
                    No invoices found
                </td>
            </tr>
        `;

        return;

    }


    /* ================= TABLE ROWS ================= */

    pageBills.forEach((bill,index)=>{

        const customer =
            bill.customer?.name ||
            "Walk-in Customer";


        const mobile =
            bill.customer?.mobile ||
            "";


        const itemCount =
            (bill.items || []).reduce(
                (sum,item) =>
                    sum + Number(item.qty || 0),
                0
            );


       const payment = getPaymentSplit(bill);

      const paymentFilter =
    document.getElementById("paymentFilter").value;

const amount =
    getPaymentAmount(
        bill,
        paymentFilter
    );


        const date =
            bill.createdAt
                ? new Date(bill.createdAt)
                : null;


        let dateText = "-";
        let timeText = "";


        if(date){

            dateText =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day:"2-digit",
                        month:"short",
                        year:"numeric"
                    }
                );


            timeText =
                date.toLocaleTimeString(
                    "en-IN",
                    {
                        hour:"2-digit",
                        minute:"2-digit"
                    }
                );

        }


        const row =
            document.createElement("tr");

        row.classList.add("invoice-row");

row.onclick = function(event){

    /* 3-dot / menu area click */
    if(
        event.target.closest(".action-menu-wrapper")
    ){
        return;
    }


    /* Check whether ANY menu is currently open */
    const openMenu =
        document.querySelector(
            ".action-menu.show"
        );


    /* If any menu is open */
    if(openMenu){

        openMenu.classList.remove("show");

        return;

    }


    /* No menu open → View invoice */
    viewBill(bill.billNo);

};
        row.innerHTML = `

            <td>
               ${startIndex + index + 1}
            </td>


            <td>
                <strong>
                    ${bill.billNo || "-"}
                </strong>
            </td>


            <td>

                <div>
                    ${dateText}
                </div>

                <div style="
                    color:#777;
                    font-size:12px;
                    margin-top:4px;
                ">
                    ${timeText}
                </div>

            </td>


            <td>

                <span class="customer-name">
                    ${customer}
                </span>

                ${
                    mobile
                    ? `
                        <span class="customer-mobile">
                            ${mobile}
                        </span>
                    `
                    : ""
                }

            </td>


            <td>
                ${itemCount}
            </td>


           <td>
    <div class="payment-split">
        ${payment}
    </div>
</td>


            <td>

                <strong>
                    ₹${amount.toLocaleString("en-IN")}
                </strong>

            </td>


            <td>

                <span class="status">
                    Paid
                </span>

            </td>


            <td>

               <div class="action-menu-wrapper">

    <button
        class="action-btn"
        onclick="toggleActionMenu(event, '${bill.billNo}')">

        ⋮

    </button>


 <div
    class="action-menu"
    id="menu-${bill.billNo}">

    <button
        onclick="viewBill('${bill.billNo}')">

        👁
        <span>View</span>

    </button>


    <button
        class="delete-action"
        onclick="deleteBill('${bill.billNo}')">

        🗑
        <span>Delete</span>

    </button>

</div>

</div>

            </td>

        `;


        container.appendChild(row);

    });
    
renderPagination();


}


/* ================= SEARCH ================= */

document
    .getElementById("searchInvoice")
    .addEventListener(
        "input",
        function(){

            const q =
                this.value
                    .toLowerCase()
                    .trim();


            if(!q){

                renderBills(allBills);

                return;

            }


            const filtered =
                allBills.filter(bill=>{

                    const invoice =
                        bill.billNo || "";


                    const customer =
                        bill.customer?.name || "";


                    const mobile =
                        bill.customer?.mobile || "";


                    const items =
                        (bill.items || [])
                            .map(item => {

                                return `
                                    ${item.product || ""}
                                    ${item.barcode || ""}
                                    ${item.size || ""}
                                    ${item.styleNo || ""}
                                    ${item.sku || ""}
                                `;

                            })
                            .join(" ");


                    const text =
                        (
                            invoice +
                            " " +
                            customer +
                            " " +
                            mobile +
                            " " +
                            items
                        ).toLowerCase();


                    return text.includes(q);

                });


            renderBills(filtered);

        }
    );


function goToPage(page){

    const totalPages =
        Math.ceil(
            currentBills.length /
            ITEMS_PER_PAGE
        );

    if(page < 1 || page > totalPages){
        return;
    }

    currentPage = page;

    renderBills(currentBills);

}

function renderPagination(){

    const pagination =
        document.getElementById("pagination");

    pagination.innerHTML = "";

    const totalPages =
        Math.ceil(
            currentBills.length /
            ITEMS_PER_PAGE
        );

    if(totalPages <= 1){
        return;
    }


    /* PREVIOUS */

    const prev =
        document.createElement("button");

    prev.innerText = "‹";

    prev.disabled =
        currentPage === 1;

    prev.onclick = function(){

        goToPage(currentPage - 1);

    };

    pagination.appendChild(prev);


    /* PAGE NUMBERS */

    for(let i = 1; i <= totalPages; i++){

        const button =
            document.createElement("button");

        button.innerText = i;

        if(i === currentPage){

            button.classList.add("active");

        }

        button.onclick = function(){

            goToPage(i);

        };

        pagination.appendChild(button);

    }


    /* NEXT */

    const next =
        document.createElement("button");

    next.innerText = "›";

    next.disabled =
        currentPage === totalPages;

    next.onclick = function(){

        goToPage(currentPage + 1);

    };

    pagination.appendChild(next);

}

/* ================= FILTER ================= */

function applyFilters(){

    const search =
        document.getElementById("searchInvoice")
            .value
            .toLowerCase()
            .trim();


    const payment =
        document.getElementById("paymentFilter")
            .value;


    const selectedDate =
        document.getElementById("invoiceDate")
            .value;


    const filtered =
        allBills.filter(bill=>{


            /* SEARCH */

            let searchMatch = true;


            if(search){

                const invoice =
                    bill.billNo || "";


                const customer =
                    bill.customer?.name || "";


                const mobile =
                    bill.customer?.mobile || "";


                const items =
                    (bill.items || [])
                        .map(item => `
                            ${item.product || ""}
                            ${item.barcode || ""}
                            ${item.size || ""}
                            ${item.styleNo || ""}
                            ${item.sku || ""}
                        `)
                        .join(" ");


                const text =
                    (
                        invoice +
                        " " +
                        customer +
                        " " +
                        mobile +
                        " " +
                        items
                    ).toLowerCase();


                searchMatch =
                    text.includes(search);

            }


            /* PAYMENT */

            let paymentMatch = true;


           if(payment){

    paymentMatch =
        (bill.payments || []).some(p =>
            String(
                p.mode ||
                p.method ||
                ""
            ).toLowerCase() ===
            payment.toLowerCase() &&
            Number(p.amount || 0) > 0
        );
}


            /* DATE */

            let dateMatch = true;


            if(selectedDate && bill.createdAt){

                const billDate =
                    new Date(bill.createdAt)
                        .toISOString()
                        .split("T")[0];


                dateMatch =
                    billDate === selectedDate;

            }


            return (
                searchMatch &&
                paymentMatch &&
                dateMatch
            );

        });


    renderBills(filtered);

}


/* ================= VIEW BILL ================= */

function viewBill(billNo){

    const bill =
        allBills.find(
            b => b.billNo === billNo
        );


    if(!bill){

        alert("Bill not found");

        return;

    }
currentViewBill = bill;

const cashPaid = getPaymentAmount(bill, "cash");
const upiPaid = getPaymentAmount(bill, "upi");
const cardPaid = getPaymentAmount(bill, "card");

const totalPaid =
    cashPaid +
    upiPaid +
    cardPaid;

const grandTotal =
    Number(bill.grandTotal || 0);

const balance =
    Math.max(grandTotal - totalPaid, 0);

const cashEl = document.getElementById("viewCashPaid");
const upiEl = document.getElementById("viewUpiPaid");
const cardEl = document.getElementById("viewCardPaid");

    const cashCard = document.querySelector(".cash-card");
const upiCard = document.querySelector(".upi-card");
const cardCard = document.querySelector(".card-card");

if (cashCard) {
    cashCard.style.display = cashPaid > 0 ? "flex" : "none";
}

if (upiCard) {
    upiCard.style.display = upiPaid > 0 ? "flex" : "none";
}

if (cardCard) {
    cardCard.style.display = cardPaid > 0 ? "flex" : "none";
}
    
const totalPaidEl = document.getElementById("viewTotalPaid");
const balanceEl = document.getElementById("viewBalance");

if (cashEl)
    cashEl.innerText =
        "₹" + cashPaid.toLocaleString("en-IN", {
            minimumFractionDigits: 2
        });

if (upiEl)
    upiEl.innerText =
        "₹" + upiPaid.toLocaleString("en-IN", {
            minimumFractionDigits: 2
        });

if (cardEl)
    cardEl.innerText =
        "₹" + cardPaid.toLocaleString("en-IN", {
            minimumFractionDigits: 2
        });

if (totalPaidEl)
    totalPaidEl.innerText =
        "₹" + totalPaid.toLocaleString("en-IN", {
            minimumFractionDigits: 2
        });

if (balanceEl)
    balanceEl.innerText =
        "₹" + balance.toLocaleString("en-IN", {
            minimumFractionDigits: 2
        });
    
    /* ================= BILL INFO ================= */

    document.getElementById("viewBillNo").innerText =
        bill.billNo || "-";


    const date =
        bill.createdAt
            ? new Date(bill.createdAt)
            : null;


    document.getElementById("viewDate").innerText =
        date
            ? date.toLocaleDateString("en-IN") +
              " " +
              date.toLocaleTimeString("en-IN", {
                  hour:"2-digit",
                  minute:"2-digit"
              })
            : "-";


    document.getElementById("viewCustomer").innerText =
        bill.customer?.name ||
        "Walk-in Customer";


    document.getElementById("viewMobile").innerText =
        bill.customer?.mobile ||
        "-";


   const paymentText = getPaymentMethodText(bill);


   document.getElementById("viewPayment").innerText =
    paymentText;


    /* ================= ITEMS ================= */

    const itemsContainer =
        document.getElementById("viewItems");

    itemsContainer.innerHTML = "";


    let subTotal = 0;

    let totalQty = 0;


    (bill.items || []).forEach(
        (item,index)=>{

            const qty =
                Number(item.qty || 0);

            const rate =
                Number(item.price || 0);

            const amount =
                qty * rate;


            subTotal += amount;

            totalQty += qty;


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

              <td class="invoice-product-cell">

    <!-- NORMAL VIEW -->
    <div
        class="invoice-product-view"
        style="display:flex;"
    >

        <div class="invoice-product-name">

            <span>
                ${item.product || "-"}
            </span>

        </div>

       

    </div>


    <!-- EDIT VIEW -->
    <div
        class="invoice-product-edit"
        style="display:none;"
    >

        <div class="customer-search-input">

            <input
                type="text"
                class="invoice-product-search-input"
                value="${item.product || ""}"
                placeholder="Search product / SKU / Style No"
                autocomplete="off"
                oninput="
    searchInvoiceProduct(this, ${index});
    toggleInvoiceProductClear(this);
"
            >

           <button
    type="button"
    class="invoice-product-remove"
    onclick="clearInvoiceProductSearch(${index})"
    title="Remove product"
    style="${item.product ? 'display:inline-flex;' : 'display:none;'}"
>
    ✕
</button>

        </div>

        <div
            class="invoice-product-results"
            id="invoiceProductResults-${index}"
        ></div>

       

    </div>

</td>
 <!-- BARCODE -->
    <td>
        ${item.barcode || "-"}
    </td>

                <td>
                    ${item.size || "-"}
                </td>

                <td>
                    ${qty}
                </td>

                <td>
                    ₹${rate.toFixed(2)}
                </td>

                <td>
                    ₹${amount.toFixed(2)}
                </td>

            `;


            itemsContainer.appendChild(row);

        }
    );


    /* ================= DISCOUNT ================= */

    const discount =
        Number(bill.discount || 0);


    const taxable =
        Math.max(
            0,
            subTotal - discount
        );


    /* ================= GST ================= */

    const cgst =
        Number(
            bill.cgst ||
            bill.tax / 2 ||
            0
        );


    const sgst =
        Number(
            bill.sgst ||
            bill.tax / 2 ||
            0
        );


    /* ================= TOTALS ================= */


    const roundOff =
        Number(
            bill.roundOff || 0
        );


    document.getElementById("viewSubTotal").innerText =
        "₹" + subTotal.toFixed(2);


    document.getElementById("viewDiscount").innerText =
        "- ₹" + discount.toFixed(2);


    document.getElementById("viewTaxable").innerText =
        "₹" + taxable.toFixed(2);


    document.getElementById("viewCGST").innerText =
        "₹" + cgst.toFixed(2);


    document.getElementById("viewSGST").innerText =
        "₹" + sgst.toFixed(2);


    document.getElementById("viewRoundOff").innerText =
        roundOff >= 0
            ? "₹" + roundOff.toFixed(2)
            : "- ₹" + Math.abs(roundOff).toFixed(2);


    document.getElementById("viewGrandTotal").innerText =
        "₹" + grandTotal.toFixed(2);

document
    .querySelectorAll(".invoice-product-remove")
    .forEach(button => {
        button.style.display = "none";
    });
    /* ================= OPEN MODAL ================= */

    document
        .getElementById("invoiceViewModal")
        .classList.remove("hidden");
    document.body.classList.add("modal-open");

}
function enableInvoiceEditMode(){

    if(!currentViewBill){
        return;
    }

    /* Show customer search */
    document
        .querySelector(".invoice-view-mode")
        .style.display = "none";

    document
        .getElementById("customerSearchBox")
        .style.display = "block";

    /* Load current customer name */
   const customerInput =
    document.getElementById("editCustomer");

customerInput.value =
    currentViewBill.customer?.name || "";

customerInput.readOnly = true;

document
    .querySelector(".customer-search-clear")
    .style.display = "block";
    
    /* Clear previous search results */
    document
        .getElementById("customerSearchResults")
        .innerHTML = "";

    document
        .getElementById("customerSearchResults")
        .classList.remove("show");

    /* Focus search */
    document
        .getElementById("editCustomer")
        .focus();
document.querySelector(".invoice-edit-icon").style.display = "none";

/* ================= PRODUCT EDIT MODE ================= */

document
    .querySelectorAll(".invoice-product-edit")
    .forEach(box => {
        box.style.display = "flex";
    });

document
    .querySelectorAll(".invoice-product-view")
    .forEach(box => {
        box.style.display = "none";
    });

document
    .querySelectorAll(".invoice-product-remove")
    .forEach(button => {
        button.style.setProperty(
            "display",
            "inline-flex",
            "important"
        );
    });

document.getElementById(
    "invoiceSaveBtn"
).style.display = "block";

    document
    .querySelectorAll(".invoice-product-remove")
    .forEach(button => {

        button.style.setProperty(
            "display",
            "inline-flex",
            "important"
        );

    });
document.getElementById(
    "invoiceSaveBtn"
).style.display = "block";
    
}

function selectEditCustomer(customerId){

    const customer =
        allCustomers.find(
            c => c._id === customerId
        );

    if(!customer){
        return;
    }

    selectedEditCustomer = customer;

    /* Update input */
    document
        .getElementById("editCustomer")
        .value =
        customer.name || "";

    /* Close search results */
    document
        .getElementById("customerSearchResults")
        .classList.remove("show");

    /* For now update displayed customer */
    document
        .getElementById("viewCustomer")
        .innerText =
        customer.name || "Walk-in Customer";

    document
    .getElementById("viewMobile")
    .innerText =
    customer.mobile || "-";

}
function addNewCustomerFromInvoice(){

    if(!currentViewBill){
        return;
    }

    localStorage.setItem(
        "returnToInvoiceEdit",
        "true"
    );

    localStorage.setItem(
        "invoiceEditBillNo",
        currentViewBill.billNo
    );

   const mobile =
    document
        .getElementById("editCustomer")
        .value
        .trim();

window.location.href =
    "customer.html?addNew=true&mobile=" +
    encodeURIComponent(mobile);

}
function closeInvoiceView(){

    document
        .getElementById("invoiceViewModal")
        .classList.add("hidden");
 document.body.classList.remove("modal-open");
}

function toggleActionMenu(event, billNo){

    event.stopPropagation();

    const clickedMenu =
        document.getElementById(
            "menu-" + billNo
        );


    document
        .querySelectorAll(".action-menu")
        .forEach(menu => {

            if(menu !== clickedMenu){

                menu.classList.remove("show");

            }

        });


    clickedMenu.classList.toggle("show");

}
document.addEventListener("click", function(event){

    if(
        !event.target.closest(".action-menu-wrapper")
    ){

        document
            .querySelectorAll(".action-menu")
            .forEach(menu => {

                menu.classList.remove("show");

            });

    }

});


let deleteInvoiceId = null;
let deleteInvoiceBillNo = null;


function deleteBill(billNo){

    const bill =
        allBills.find(
            b => b.billNo === billNo
        );

    if(!bill){

        alert("Invoice not found");

        return;

    }

    deleteInvoiceId = bill._id;
    deleteInvoiceBillNo = bill.billNo;

    document.getElementById("deleteBillNo").innerText =
        bill.billNo || "—";

    const date =
        bill.createdAt
            ? new Date(bill.createdAt)
            : null;

    document.getElementById("deleteBillDate").innerText =
        date
            ? date.toLocaleDateString("en-IN") +
              " " +
              date.toLocaleTimeString("en-IN", {
                  hour:"2-digit",
                  minute:"2-digit"
              })
            : "—";

    document
        .getElementById("deleteInvoiceModal")
        .classList.remove("hidden");

}


function closeDeleteModal(){

    document
        .getElementById("deleteInvoiceModal")
        .classList.add("hidden");

    deleteInvoiceId = null;
    deleteInvoiceBillNo = null;

}


async function confirmDeleteInvoice(){

    if(!deleteInvoiceId){
        return;
    }

    const billNo =
        deleteInvoiceBillNo;

    try{

        const res =
            await fetch(
                BASE_URL +
                "/pos/bills/" +
                deleteInvoiceId,
                {
                    method:"DELETE"
                }
            );

        const data =
            await res.json();

        if(!res.ok || !data.success){

            alert(
                data.message ||
                "Failed to delete invoice"
            );

            return;
        }

        closeDeleteModal();

        await loadBills();

        showDeleteSuccessToast(billNo);

    }
    catch(err){

        console.error(
            "Delete Invoice Error:",
            err
        );

        alert(
            "Unable to delete invoice."
        );

    }

}

let deleteSuccessTimer = null;


function showDeleteSuccessToast(billNo){

    const toast =
        document.getElementById(
            "deleteSuccessToast"
        );

    const message =
        document.getElementById(
            "deleteSuccessMessage"
        );

    message.innerText =
        "Invoice " +
        billNo +
        " deleted successfully.";

    toast.classList.remove("hidden");

    /* Restart progress animation */

    const progress =
        toast.querySelector(
            ".success-toast-progress"
        );

    progress.style.animation = "none";

    void progress.offsetWidth;

    progress.style.animation =
        "successToastProgress 3s linear forwards";


    clearTimeout(deleteSuccessTimer);

    deleteSuccessTimer =
        setTimeout(() => {

            closeDeleteSuccessToast();

        }, 3000);

}


function closeDeleteSuccessToast(){

    const toast =
        document.getElementById(
            "deleteSuccessToast"
        );

    toast.classList.add("hidden");

    clearTimeout(deleteSuccessTimer);

}
async function saveInvoiceEdit(){

    if(!currentViewBill){
        return;
    }

    if(!selectedEditCustomer){
        alert("Please select a customer");
        return;
    }

    const saveBtn =
        document.getElementById("invoiceSaveBtn");

    /* ================= LOADING ================= */

    saveBtn.disabled = true;

    saveBtn.innerHTML = `
        <span class="save-loader"></span>
    `;

    saveBtn.classList.add("saving");


    try{

        const res =
            await fetch(
                BASE_URL +
                "/pos/bills/" +
                currentViewBill._id,
                {
                    method:"PUT",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                  body:JSON.stringify({

    customer:
        selectedEditCustomer,

    items:
        currentViewBill.items,

    payments:
        currentViewBill.payments,

    total:
        currentViewBill.total,

    discount:
        currentViewBill.discount,

    roundOff:
        currentViewBill.roundOff,

    tax:
        currentViewBill.tax,

    cgst:
        currentViewBill.cgst,

    sgst:
        currentViewBill.sgst,

    grandTotal:
        currentViewBill.grandTotal

})
                }
            );


        const data =
            await res.json();


        if(!res.ok || !data.success){

            throw new Error(
                data.message ||
                "Failed to update invoice"
            );

        }


        /* ================= UPDATE CURRENT BILL ================= */

        currentViewBill =
            data.bill;


        document.getElementById(
            "viewCustomer"
        ).innerText =
            data.bill.customer?.name ||
            "Walk-in Customer";


        document.getElementById(
            "viewMobile"
        ).innerText =
            data.bill.customer?.mobile ||
            "-";


        document.getElementById(
            "editCustomer"
        ).value =
            data.bill.customer?.name ||
            "";


        /* ================= SUCCESS ================= */

        saveBtn.innerHTML = `
            <span class="save-success-icon">✓</span>
            Updated
        `;

        saveBtn.classList.remove("saving");

        saveBtn.classList.add("updated");


        /* ================= REFRESH INVOICE HISTORY ================= */

        await loadBills();


        /* ================= CLOSE EDIT MODE ================= */

        setTimeout(() => {

            saveBtn.style.display = "none";

            saveBtn.disabled = false;

            saveBtn.classList.remove("updated");

            saveBtn.innerHTML = `
                💾 Save Changes
            `;


            document.querySelector(
                ".invoice-edit-icon"
            ).style.display = "flex";


            document.getElementById(
                "customerSearchBox"
            ).style.display = "none";


            document.querySelector(
                ".invoice-view-mode"
            ).style.display = "block";


            /* ================= SCROLL TO TOP ================= */

            const invoiceModal =
    document.getElementById("invoiceViewModal");

if(invoiceModal){

    invoiceModal.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

            /* ================= SUCCESS TOAST ================= */

            showInvoiceUpdateToast();


        }, 900);


    }
    catch(err){

        console.error(
            "Invoice Update Error:",
            err
        );


        /* Restore button */

        saveBtn.disabled = false;

        saveBtn.classList.remove("saving");

        saveBtn.innerHTML = `
            💾 Save Changes
        `;


        alert(
            err.message ||
            "Unable to update invoice."
        );

    }

}
function showInvoiceUpdateToast(){

    const toast =
        document.getElementById(
            "invoiceUpdateToast"
        );

    if(!toast){
        return;
    }

    toast.classList.remove("hidden");

    clearTimeout(
        window.invoiceUpdateToastTimer
    );

    window.invoiceUpdateToastTimer =
        setTimeout(() => {

            toast.classList.add("hidden");

        }, 3000);
}
function searchInvoiceProduct(input, index){

    const search =
        input.value
            .trim()
            .toLowerCase();

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(!results){
        return;
    }

    results.innerHTML = "";

    if(!search){

        results.style.display = "none";

        return;
    }


    const matches =
        allProducts
            .filter(product => {

                const name =
                    String(
                        product.name || ""
                    ).toLowerCase();

                const styleNo =
                    String(
                        product.styleNo ||
                        product.styleNumber ||
                        ""
                    ).toLowerCase();

                const sku =
                    String(
                        product.sku || ""
                    ).toLowerCase();

                const barcode =
                    String(
                        product.barcode || ""
                    ).toLowerCase();

                return (
                    name.includes(search) ||
                    styleNo.includes(search) ||
                    sku.includes(search) ||
                    barcode.includes(search)
                );

            })
            .slice(0, 8);


    if(matches.length === 0){

        results.innerHTML = `
            <div class="invoice-product-no-result">
                No product found
            </div>
        `;

        results.style.display = "block";

        return;
    }


    matches.forEach(product => {

        const div =
            document.createElement("div");

        div.className =
            "invoice-product-search-item";

        div.innerHTML = `

            <div>
                <strong>
                    ${product.name || "-"}
                </strong>

                <small>
                    Style:
                    ${product.styleNo || "-"}
                </small>
            </div>

        `;

        div.onclick = function(){

            selectInvoiceProduct(
                product,
                index
            );

        };

        results.appendChild(div);

    });


    results.style.display = "block";

}

function renderInvoiceItemsForEdit(){

    if(!currentViewBill){
        return;
    }

    const itemsContainer =
        document.getElementById("viewItems");

    if(!itemsContainer){
        return;
    }

    itemsContainer.innerHTML = "";

    let subTotal = 0;
    let totalQty = 0;

    (currentViewBill.items || []).forEach(
        (item, index) => {

            const qty =
                Number(item.qty || 0);

            const rate =
                Number(item.price || 0);

            const amount =
                qty * rate;

            subTotal += amount;
            totalQty += qty;

            const row =
                document.createElement("tr");

           row.innerHTML = `

    <td>
        ${index + 1}
    </td>

    <td class="invoice-product-cell">

        <div class="invoice-product-name">

            <span>
                ${item.product || "-"}
            </span>

            <button
                type="button"
                class="invoice-product-remove"
                onclick="clearInvoiceProductSearch(${index})"
                style="display:inline-flex !important;"
            >
                ✕
            </button>

        </div>

    </td>

    <td>
        ${item.barcode || "-"}
    </td>

    <td>
        ${item.size || "-"}
    </td>

    <td>
        ${qty}
    </td>

    <td>
        ₹${rate.toFixed(2)}
    </td>

    <td>
        ₹${amount.toFixed(2)}
    </td>

`;
            itemsContainer.appendChild(row);

        }
    );

    /*
     * Update subtotal
     */

    const discount =
        Number(currentViewBill.discount || 0);

    const taxable =
        Math.max(
            0,
            subTotal - discount
        );

    const cgst =
        Number(
            currentViewBill.cgst ||
            currentViewBill.tax / 2 ||
            0
        );

    const sgst =
        Number(
            currentViewBill.sgst ||
            currentViewBill.tax / 2 ||
            0
        );

    const roundOff =
        Number(
            currentViewBill.roundOff || 0
        );

    const grandTotal =
        taxable +
        cgst +
        sgst +
        roundOff;

    currentViewBill.total =
        subTotal;

    currentViewBill.grandTotal =
        grandTotal;

    currentViewBill.cgst =
        cgst;

    currentViewBill.sgst =
        sgst;

    if(
        document.getElementById("viewSubTotal")
    ){
        document.getElementById(
            "viewSubTotal"
        ).innerText =
            "₹" + subTotal.toFixed(2);
    }

    if(
        document.getElementById("viewTaxable")
    ){
        document.getElementById(
            "viewTaxable"
        ).innerText =
            "₹" + taxable.toFixed(2);
    }

    if(
        document.getElementById("viewCGST")
    ){
        document.getElementById(
            "viewCGST"
        ).innerText =
            "₹" + cgst.toFixed(2);
    }

    if(
        document.getElementById("viewSGST")
    ){
        document.getElementById(
            "viewSGST"
        ).innerText =
            "₹" + sgst.toFixed(2);
    }

    if(
        document.getElementById("viewGrandTotal")
    ){
        document.getElementById(
            "viewGrandTotal"
        ).innerText =
            "₹" + grandTotal.toFixed(2);
    }

}

function clearInvoiceCustomerSearch(){

    const input =
        document.getElementById("editCustomer");

    const results =
        document.getElementById(
            "customerSearchResults"
        );

    /* Clear customer */

    input.value = "";

    /* Enable typing/search */

    input.readOnly = false;

    /* Hide close icon */

    const clearButton =
        document.querySelector(
            ".customer-search-clear"
        );

    if(clearButton){
        clearButton.style.display = "none";
    }

    /* Close old results */

    results.innerHTML = "";

    results.classList.remove("show");

    /* Focus search */

    input.focus();

}

/* ================= PAYMENT HELPERS ================= */

function getPaymentAmount(bill, mode) {

    if (!bill) return 0;

    const payments = bill.payments || [];

    // All Payments
    if (!mode) {
        return Number(bill.grandTotal || 0);
    }

    // Selected payment method
    return payments
        .filter(payment =>
            String(
                payment.mode ||
                payment.method ||
                ""
            ).toLowerCase() ===
            String(mode).toLowerCase()
        )
        .reduce(
            (total, payment) =>
                total + Number(payment.amount || 0),
            0
        );
}

function getPaymentSplit(bill) {

    const payments = bill.payments || [];

    if (!payments.length) {
        return `
            <span class="payment-chip cash">
                💵 Cash ₹0
            </span>
        `;
    }

    return payments
        .filter(payment => Number(payment.amount || 0) > 0)
        .map(payment => {

            const mode =
                payment.mode ||
                payment.method ||
                "Cash";

            const amount =
                Number(payment.amount || 0);

            let icon = "💵";
            let className = "cash";

            if (mode.toLowerCase() === "upi") {
                icon = "📱";
                className = "upi";
            }

            if (mode.toLowerCase() === "card") {
                icon = "💳";
                className = "card";
            }

            if (mode.toLowerCase() === "credit note") {
                icon = "🧾";
                className = "credit";
            }

            return `
                <span class="payment-chip ${className}">
                    ${icon} ${mode}
                    <strong>
                        ₹${amount.toLocaleString("en-IN")}
                    </strong>
                </span>
            `;

        })
        .join("");
}


function getPaymentMethodText(bill) {

    const payments = (bill.payments || [])
        .filter(payment =>
            Number(payment.amount || 0) > 0
        );

    if (!payments.length) {
        return "Cash";
    }

    return payments
        .map(payment =>
            payment.mode ||
            payment.method ||
            "Cash"
        )
        .join(" + ");
}

function clearInvoiceProductSearch(){

    const input =
        document.getElementById(
            "invoiceProductSearch"
        );

    const results =
        document.getElementById(
            "invoiceProductResults"
        );

    if(input){
        input.value = "";
        input.focus();
    }

    if(results){
        results.innerHTML = "";
        results.style.display = "none";
    }

}
function selectInvoiceProduct(product, index){

    if(!product || !currentViewBill){
        return;
    }

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(!results){
        return;
    }

    /*
     * ZYZAAL SAREE
     * Same style products = colour options
     */
    if(
        currentViewBill.brandId === "ZYZAAL" &&
        isInvoiceSareeProduct(product)
    ){

        const sameStyleProducts =
            allProducts.filter(p =>
                String(p.styleNo || "") ===
                String(product.styleNo || "") &&
                isInvoiceSareeProduct(p)
            );

        const colourOptions = [];

        const seen = new Set();

        sameStyleProducts.forEach(p => {

            const variants =
                Array.isArray(p.variants)
                    ? p.variants
                    : [];

            if(variants.length > 0){

                variants.forEach(variant => {

                    const colour =
                        variant.colour ||
                        variant.color ||
                        variant.colorName ||
                        "Default";

                    const key =
                        String(colour)
                            .trim()
                            .toLowerCase();

                    if(!seen.has(key)){

                        seen.add(key);

                        colourOptions.push({

                            product: p,

                            variant: variant,

                            colour: colour,

                            price:
                                variant.sellingPrice ??
                                p.price ??
                                0,

                            stock:
                                variant.openingStock ??
                                variant.stock ??
                                0

                        });

                    }

                });

            }
            else{

                const colour =
                    p.colour ||
                    p.color ||
                    p.colorName ||
                    "Default";

                const key =
                    String(colour)
                        .trim()
                        .toLowerCase();

                if(!seen.has(key)){

                    seen.add(key);

                    colourOptions.push({

                        product: p,

                        variant: null,

                        colour: colour,

                        price:
                            p.price || 0,

                        stock:
                            p.stock || 0

                    });

                }

            }

        });


        showInvoiceColourOptions(
            colourOptions,
            index
        );

        return;
    }


    /*
     * ZYZAAL SHIRT / PANT / OTHER
     * Product variants = Colour → Size
     */

    if(
        currentViewBill.brandId === "ZYZAAL" &&
        Array.isArray(product.variants) &&
        product.variants.length > 0
    ){

        showInvoiceProductColourOptions(
            product,
            index
        );

        return;
    }


    /*
     * FARK618 / products without variants
     */

    applyInvoiceProductVariant(
        product,
        null,
        index
    );

}

function isInvoiceSareeProduct(product){

    const category =
        String(
            product.category || ""
        ).toLowerCase();

    const name =
        String(
            product.name || ""
        ).toLowerCase();

    return (
        category.includes("saree") ||
        category.includes("sari") ||
        name.includes("saree") ||
        name.includes("sari")
    );
}

function showInvoiceColourOptions(
    options,
    index
){

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(!results){
        return;
    }

    results.innerHTML = `
        <div class="invoice-variant-title">
            Select Colour
        </div>
    `;

    options.forEach((option, colourIndex) => {

        const div =
            document.createElement("div");

        div.className =
            "invoice-product-search-item";

        div.innerHTML = `

            <div>
                <strong>
                    ${option.colour}
                </strong>

                <small>
                    Stock: ${option.stock}
                    &nbsp; | &nbsp;
                    ₹${option.price}
                </small>
            </div>

        `;

        div.onclick = function(){

            /*
             * Saree = Colour + Free Size
             */

            applyInvoiceProductVariant(
                option.product,
                option.variant,
                index
            );

        };

        results.appendChild(div);

    });

    results.style.display = "block";
}

function showInvoiceProductColourOptions(
    product,
    index
){

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(!results){
        return;
    }

    const colourMap =
        new Map();


    product.variants.forEach(
        variant => {

            const colour =
                variant.colour ||
                variant.color ||
                variant.colorName ||
                "Default";

            const key =
                String(colour)
                    .trim()
                    .toLowerCase();

            if(!colourMap.has(key)){

                colourMap.set(
                    key,
                    colour
                );

            }

        }
    );


    results.innerHTML = `
        <div class="invoice-variant-title">
            Select Colour
        </div>
    `;


    Array.from(
        colourMap.entries()
    ).forEach(
        ([key, colour]) => {

            const div =
                document.createElement("div");

            div.className =
                "invoice-product-search-item";

            div.innerHTML = `
                <strong>
                    ${colour}
                </strong>
            `;


            div.onclick = function(){

                showInvoiceSizeOptions(
                    product,
                    colour,
                    index
                );

            };


            results.appendChild(div);

        }
    );


    results.style.display = "block";
}

function showInvoiceSizeOptions(
    product,
    colour,
    index
){

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(!results){
        return;
    }


    const selectedColour =
        String(colour)
            .trim()
            .toLowerCase();


    const variants =
        product.variants.filter(
            variant => {

                const variantColour =
                    variant.colour ||
                    variant.color ||
                    variant.colorName ||
                    "Default";

                return (
                    String(variantColour)
                        .trim()
                        .toLowerCase()
                    ===
                    selectedColour
                );

            }
        );


    results.innerHTML = `

        <div class="invoice-variant-title">
            ${colour} - Select Size
        </div>

    `;


    variants.forEach(
        (variant, sizeIndex) => {

            const size =
                variant.size ||
                "Free Size";

            const stock =
                variant.openingStock ??
                variant.stock ??
                0;

            const price =
                variant.sellingPrice ??
                product.price ??
                0;


            const div =
                document.createElement("div");

            div.className =
                "invoice-product-search-item";


            div.innerHTML = `

                <div>

                    <strong>
                        ${size}
                    </strong>

                    <small>
                        Stock: ${stock}
                        &nbsp; | &nbsp;
                        ₹${price}
                    </small>

                </div>

            `;


            div.onclick = function(){

                applyInvoiceProductVariant(
                    product,
                    variant,
                    index
                );

            };


            results.appendChild(div);

        }
    );


    results.style.display = "block";
}

function applyInvoiceProductVariant(
    product,
    variant,
    index
){

    if(!currentViewBill){
        return;
    }


    const oldItem =
        currentViewBill.items[index];


    if(!oldItem){
        return;
    }


    const qty =
        Number(
            oldItem.qty || 1
        );


    const colour =
        variant?.colour ||
        variant?.color ||
        variant?.colorName ||
        oldItem.colour ||
        "";


    const size =
        variant?.size ||
        "Free Size";


    const sku =
        variant?.sku ||
        product.sku ||
        "";


    const barcode =
        variant?.barcode ||
        variant?.sku ||
        product.barcode ||
        "";


    const price =
        Number(
            variant?.sellingPrice ??
            product.price ??
            0
        );


    currentViewBill.items[index] = {

        ...oldItem,

        productId:
            product._id,

        brandId:
            product.brandId ||
            oldItem.brandId,

        product:
            product.name || "",

        category:
            product.category ||
            oldItem.category ||
            "",

        styleNo:
            product.styleNo ||
            oldItem.styleNo ||
            "",

        barcode:
            barcode,

        sku:
            sku,

        variantId:
            variant?._id ||
            null,

        colour:
            colour,

        size:
            size,

        price:
            price,

        qty:
            qty,

        amount:
            qty * price,

        purchaseRate:
            variant?.purchaseRate ??
            oldItem.purchaseRate ??
            0,

        hsnCode:
            product.hsnCode ||
            oldItem.hsnCode ||
            ""

    };


    /*
     * Close dropdown
     */

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(results){

        results.innerHTML = "";

        results.style.display =
            "none";

    }


    /*
     * Re-render
     */

    renderInvoiceEditRows();

}

function renderInvoiceEditRows(){

    if(!currentViewBill){
        return;
    }

    const itemsContainer =
        document.getElementById(
            "viewItems"
        );

    if(!itemsContainer){
        return;
    }


    itemsContainer.innerHTML = "";


    let subTotal = 0;


    currentViewBill.items.forEach(
        (item, index) => {

            const qty =
                Number(item.qty || 0);

            const rate =
                Number(item.price || 0);

            const amount =
                qty * rate;


            subTotal += amount;


            const row =
                document.createElement("tr");


           row.innerHTML = `

    <td>
        ${index + 1}
    </td>

    <!-- PRODUCT -->
    <td class="invoice-product-cell">

        <div
            class="invoice-product-edit"
            style="display:flex;"
        >

            <div class="customer-search-input">

                <input
                    type="text"
                    class="invoice-product-search-input"
                    value="${item.product || ""}"
                    placeholder="Search product / SKU / Style No"
                    autocomplete="off"

                    oninput="
                        searchInvoiceProduct(
                            this,
                            ${index}
                        )
                    "
                >

                <button
                    type="button"
                    class="invoice-product-remove"

                    onclick="
                        removeInvoiceProduct(
                            ${index}
                        )
                    "

                    title="Remove product"
                >
                    ✕
                </button>

            </div>


            <div
                class="invoice-product-results"
                id="invoiceProductResults-${index}"
            ></div>

        </div>

    </td>


    <!-- BARCODE -->
    <td>
        ${item.barcode || "-"}
    </td>


    <!-- SIZE -->
    <td>
        ${item.size || "-"}
    </td>


    <!-- QTY -->
    <td>
        ${qty}
    </td>


    <!-- RATE -->
    <td>
        ₹${rate.toFixed(2)}
    </td>


    <!-- AMOUNT -->
    <td>
        ₹${amount.toFixed(2)}
    </td>

`;

            itemsContainer.appendChild(row);

        }
    );


    /*
     * Recalculate totals
     */

    currentViewBill.total =
        subTotal;


    /* ================= TOTALS ================= */

const discount =
    Number(
        currentViewBill.discount || 0
    );


/*
 * SAME ROUND-OFF LOGIC AS BILLING.JS
 */

const netTotal =
    Math.max(
        0,
        subTotal - discount
    );


const grandTotal =
    Math.round(netTotal);


const roundOff =
    grandTotal - netTotal;


/*
 * GST
 */

const cgst =
    Number(
        currentViewBill.cgst ||
        currentViewBill.tax / 2 ||
        0
    );


const sgst =
    Number(
        currentViewBill.sgst ||
        currentViewBill.tax / 2 ||
        0
    );


/*
 * Save calculated values
 */

currentViewBill.total =
    subTotal;

currentViewBill.discount =
    discount;

currentViewBill.roundOff =
    roundOff;

currentViewBill.grandTotal =
    grandTotal;

currentViewBill.cgst =
    cgst;

currentViewBill.sgst =
    sgst;


/*
 * UPDATE UI
 */

document.getElementById(
    "viewSubTotal"
).innerText =
    "₹" +
    subTotal.toFixed(2);


document.getElementById(
    "viewDiscount"
).innerText =
    "- ₹" +
    discount.toFixed(2);


document.getElementById(
    "viewTaxable"
).innerText =
    "₹" +
    netTotal.toFixed(2);


document.getElementById(
    "viewCGST"
).innerText =
    "₹" +
    cgst.toFixed(2);


document.getElementById(
    "viewSGST"
).innerText =
    "₹" +
    sgst.toFixed(2);


document.getElementById(
    "viewRoundOff"
).innerText =
    roundOff === 0
        ? "₹0.00"
        : (
            roundOff > 0
                ? "₹+" +
                  roundOff.toFixed(2)
                : "- ₹" +
                  Math.abs(
                      roundOff
                  ).toFixed(2)
        );


document.getElementById(
    "viewGrandTotal"
).innerText =
    "₹" +
    grandTotal.toFixed(2);

    document.getElementById(
        "viewSubTotal"
    ).innerText =
        "₹" +
        subTotal.toFixed(2);


    document.getElementById(
        "viewTaxable"
    ).innerText =
        "₹" +
        taxable.toFixed(2);


    document.getElementById(
        "viewGrandTotal"
    ).innerText =
        "₹" +
        currentViewBill.grandTotal
            .toFixed(2);

}

function clearInvoiceProductSearch(index){

    const inputs =
        document.querySelectorAll(
            ".invoice-product-search-input"
        );

    const currentInput =
        inputs[index];

    const results =
        document.getElementById(
            "invoiceProductResults-" + index
        );

    if(currentInput){
        currentInput.value = "";
        currentInput.focus();
    }

    if(results){
        results.innerHTML = "";
        results.style.display = "none";
    }
}
/* ================= START ================= */
loadBills();
loadCustomersForEdit();
loadProductsForInvoiceEdit();
reopenInvoiceAfterCustomer();

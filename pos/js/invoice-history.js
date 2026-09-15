const BASE_URL =
    "https://fark618-backend.onrender.com";

let allBills = [];

let currentPage = 1;

const ITEMS_PER_PAGE = 20;

let currentBills = [];
let currentViewBill = null;
let allCustomers = [];
let selectedEditCustomer = null;

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
                    <div>
                        <strong>
                            ${customer.name || "-"}
                        </strong>

                        <small>
                            ${customer.mobile || "-"}
                        </small>
                    </div>

                    <button
                        type="button"
                        onclick="selectEditCustomer('${customer._id}')">
                        Select
                    </button>
                `;

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

        const res = await fetch(
            BASE_URL + "/pos/bills"
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


        const payment =
            bill.payments?.[0]?.mode ||
            bill.payments?.[0]?.method ||
            "Cash";


        const amount =
            Number(
                bill.grandTotal || 0
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

                <span class="payment-badge">

                    ${payment}

                </span>

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

                const billPayment =
                    bill.payments?.[0]?.mode ||
                    bill.payments?.[0]?.method ||
                    "Cash";


                paymentMatch =
                    billPayment.toLowerCase() ===
                    payment.toLowerCase();

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


    const payment =
        bill.payments?.[0]?.mode ||
        bill.payments?.[0]?.method ||
        "Cash";


    document.getElementById("viewPayment").innerText =
        payment;


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

                <td>
                    ${item.product || "-"}
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

    const grandTotal =
        Number(
            bill.grandTotal || 0
        );


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


    /* ================= OPEN MODAL ================= */

    document
        .getElementById("invoiceViewModal")
        .classList.remove("hidden");

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
    document
        .getElementById("editCustomer")
        .value =
        currentViewBill.customer?.name || "";

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

/* ================= START ================= */

loadBills();
loadCustomersForEdit();
loadInvoiceEditCustomer();
reopenInvoiceAfterCustomer();

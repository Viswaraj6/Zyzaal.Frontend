const BASE_URL = "https://fark618-backend.onrender.com";

let customers = [];
let editCustomer = null;
const customerList = document.getElementById("customerList");
const searchInput = document.getElementById("customerSearch");

loadCustomers();
loadEditCustomer();
loadInvoiceNewCustomer();
async function loadCustomers(){

    try{

        const res = await fetch(BASE_URL + "/pos/customers");

        const data = await res.json();

        customers = data.customers || [];
renderCustomers(customers);
        
    }catch(err){

        console.error(err);

        alert("Unable to load customers");

    }

}
function loadEditCustomer(){

    const customer = JSON.parse(localStorage.getItem("editCustomer"));

    if(!customer) return;

    editCustomer = customer;

    document.getElementById("customerDropdown").classList.remove("hidden");
    document.getElementById("customerCreate").classList.remove("hidden");
    document.getElementById("customerForm").classList.remove("hidden");

    document.getElementById("noCustomerMsg").style.display = "none";
    document.getElementById("createCustomerBtn").style.display = "none";
// Hide search & customer list
    document.getElementById("pageTitle").innerText = "Edit Customer";
   document.getElementById("customerSearch").style.display = "none";
    document.getElementById("customerList").style.display = "none";
    document.getElementById("custName").value = customer.name || "";
    document.getElementById("custMobile").value = customer.mobile || "";
    document.getElementById("custEmail").value = customer.email || "";
    document.getElementById("custAddress").value = customer.address || "";

    document.getElementById("saveCustomerBtn").innerText = "Update Customer";
}
function renderCustomers(data){

    customerList.innerHTML = "";

    data.forEach(customer=>{

        customerList.innerHTML += `

        <div class="customer-card"
            onclick="selectCustomer('${customer._id}')">

            <div class="customer-name">
                ${customer.name}
            </div>

            <div class="customer-mobile">
                ${customer.mobile}
            </div>

        </div>

        `;

    });

}

searchInput.addEventListener("input", () => {

    const value = searchInput.value.trim().toLowerCase();

    // Search empty
    if (value === "") {

    customerList.style.display = "block";

    renderCustomers(customers);

    document.getElementById("customerDropdown")
        .classList.add("hidden");

    document.getElementById("customerCreate")
        .classList.add("hidden");

    return;
}
    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(value) ||
        c.mobile.includes(value)
    );
console.log(filtered.length);
    renderCustomers(filtered);

   if (filtered.length === 0) {

    customerList.style.display = "none";

    document.getElementById("customerDropdown")
        .classList.remove("hidden");

    document.getElementById("customerCreate")
        .classList.remove("hidden");

    document.getElementById("custMobile").value = value;

} else {

    customerList.style.display = "block";

    document.getElementById("customerDropdown")
        .classList.add("hidden");

    document.getElementById("customerCreate")
        .classList.add("hidden");

}
});
function selectCustomer(id){

    const customer =
        customers.find(c=>c._id===id);

    localStorage.setItem(
        "selectedCustomer",
        JSON.stringify(customer)
    );

   history.back();
}
async function saveCustomer(){

    const customer = {

        name: document.getElementById("custName").value.trim(),

        mobile: document.getElementById("custMobile").value.trim(),

        email: document.getElementById("custEmail").value.trim(),

        address: document.getElementById("custAddress").value.trim()

    };

    if(!customer.name || !customer.mobile){

        alert("Name and Mobile Required");

        return;

    }

   const url = editCustomer
    ? BASE_URL + "/pos/customers/" + editCustomer._id
    : BASE_URL + "/pos/customers";

const method = editCustomer ? "PUT" : "POST";

const res = await fetch(url,{
    method,
    headers:{
        "Content-Type":"application/json"
    },
    body:JSON.stringify(customer)
});
    const data = await res.json();

  if (data.success) {

    /* ================= INVOICE EDIT RETURN ================= */

    if(
        localStorage.getItem("returnToInvoiceEdit") === "true"
    ){

        localStorage.setItem(
            "invoiceEditCustomer",
            JSON.stringify(data.customer)
        );

        localStorage.removeItem(
            "returnToInvoiceEdit"
        );

        window.location.href =
            "invoice-history.html";

        return;
    }


    /* ================= NORMAL CUSTOMER FLOW ================= */

    localStorage.setItem(
        "selectedCustomer",
        JSON.stringify(data.customer)
    );

    localStorage.removeItem("editCustomer");

    alert(
        editCustomer
            ? "Customer Updated Successfully"
            : "Customer Added Successfully"
    );

    window.location.href = "billing.html";

} else {

    alert(data.message || "Failed");

}
}
function toggleCustomerForm(){

    if(editCustomer) return;

    document.getElementById("customerCreate")
        .classList.remove("hidden");

    document.getElementById("noCustomerMsg").style.display = "none";

    document.getElementById("createCustomerBtn").style.display = "none";

    document.getElementById("customerForm")
        .classList.remove("hidden");
}
function goBack(){

    localStorage.removeItem("editCustomer");

   history.back();

}

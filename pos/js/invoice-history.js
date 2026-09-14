const BASE_URL =
    "https://fark618-backend.onrender.com";

let allBills = [];


/* ================= LOAD BILLS ================= */

async function loadBills(){

    try{

        const res = await fetch(
            BASE_URL + "/pos/bills"
        );

        const data = await res.json();

        console.log("INVOICE DATA:", data);

        if(!data.success){

            document.getElementById("invoiceList").innerText =
                "Failed to load invoices";

            return;
        }

        allBills = data.bills || [];

        renderBills(allBills);

    }
    catch(err){

        console.error(err);

        document.getElementById("invoiceList").innerText =
            "Server connection failed";

    }

}


/* ================= RENDER ================= */

function renderBills(bills){

    const container =
        document.getElementById("invoiceList");

    container.innerHTML = "";


    if(bills.length === 0){

        container.innerHTML =
            "<p>No invoices found</p>";

        return;

    }


    bills.forEach((bill,index)=>{

        const div =
            document.createElement("div");

        div.innerHTML = `

            <p>
                <strong>
                    ${bill.billNo || "-"}
                </strong>

                -
                ₹${Number(
                    bill.grandTotal || 0
                ).toLocaleString("en-IN")}

            </p>

        `;

        container.appendChild(div);

    });

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
                            .map(item =>
                                `${item.product || ""}
                                 ${item.barcode || ""}
                                 ${item.size || ""}
                                 ${item.styleNo || ""}`
                            )
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


/* ================= START ================= */

loadBills();

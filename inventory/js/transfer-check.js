(() => {
  "use strict";

  const API = "https://fark618-backend.onrender.com/admin/inventory";
  const $ = id => document.getElementById(id);

  let orders = [];
  let selectedOrder = null;
  let lines = [];
  let cameraStream = null;
  let cameraTimer = null;
  let detector = null;
  let lastCameraCode = "";
  let lastCameraTime = 0;

  function getToken() {
    // Must match the key used by your existing admin login page.
    return localStorage.getItem("adminToken");
  }

  function headers(hasBody = false) {
    const token = getToken();
    if (!token) throw new Error("Admin token missing. Please login again.");

    const result = { Authorization: `Bearer ${token}` };
    if (hasBody) result["Content-Type"] = "application/json";
    return result;
  }

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        ...headers(options.body !== undefined),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || `Request failed: ${response.status}`);
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function quantity(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function showMessage(id, text, type = "") {
    const el = $(id);
    el.textContent = text;
    el.className = "message" + (type ? " " + type : "");
    el.hidden = false;
  }

  function lineStatus(line) {
    if (line.receivedQty === 0 && line.expectedQty > 0) return "Pending";
    if (line.receivedQty < line.expectedQty) return "Shortage";
    if (line.receivedQty > line.expectedQty) return "Excess";
    return "Matched";
  }

  function overallStatus() {
    if (lines.every(line => lineStatus(line) === "Matched")) return "Matched";
    if (lines.some(line => lineStatus(line) === "Pending")) return "Pending";
    return "Variance";
  }

  async function loadOrders() {
    try {
      showMessage("orderMessage", "Loading transfer orders...");
      const page = Math.max(1, quantity($("pageInput").value));
      const data = await api(`/transfer-orders?page=${page}&per_page=50`);
      orders = data.orders || [];
      renderOrders();
      showMessage("orderMessage", `Loaded ${orders.length} transfer orders.`, "success");
    } catch (error) {
      showMessage("orderMessage", error.message, "error");
    }
  }

  function renderOrders() {
    const search = $("searchInput").value.trim().toLowerCase();
    const filtered = orders.filter(order =>
      [order.transferOrderNo, order.fromStore, order.toStore, order.status]
        .some(value => String(value || "").toLowerCase().includes(search))
    );

    $("ordersList").innerHTML = filtered.map(order => `
      <button class="order ${selectedOrder?.transferOrderId === order.transferOrderId ? "active" : ""}"
        data-id="${escapeHtml(order.transferOrderId)}">
        <strong>${escapeHtml(order.transferOrderNo || order.transferOrderId)}</strong>
        <span>${escapeHtml(order.fromStore || "-")} → ${escapeHtml(order.toStore || "-")}</span>
        <span>${escapeHtml(order.date || "")} · ${escapeHtml(order.status || "")}</span>
      </button>
    `).join("") || "<p>No matching transfer orders found.</p>";

    $("ordersList").querySelectorAll("[data-id]").forEach(button => {
      button.addEventListener("click", () => selectOrder(button.dataset.id));
    });
  }

  function extractLines(order) {
    const items = order.line_items || order.transfer_order_line_items || order.items || [];
    return items.map(item => {
      const sku = String(item.sku || item.item_sku || item.item_id || "").trim();
      const barcode = String(item.barcode || item.ean || item.upc || sku).trim();
     const expectedQty = Number(
    item.quantity_transferred ??
    item.quantity_transfer ??
    item.quantity ??
    item.transfer_quantity ??
    item.quantity_to_transfer ??
    item.quantity_ordered ??
    0
);
      return {
        barcode, sku: sku || barcode,
        name: String(item.name || item.item_name || item.description || ""),
        expectedQty, receivedQty: 0
      };
    });
  }

  async function selectOrder(id) {
    const summary = orders.find(order => order.transferOrderId === id);
    if (!summary) return;

    try {
      showMessage("orderMessage", "Loading selected order...");
      const data = await api(`/transfer-orders/${encodeURIComponent(id)}`);
      const order = data.transferOrder;
      if (!order) throw new Error("Transfer order details were not returned by API.");

      selectedOrder = { ...summary, raw: order };
      lines = extractLines(order);
      $("checkCard").hidden = false;
      $("orderTitle").textContent = summary.transferOrderNo || "Transfer Order";
      $("orderDetails").textContent =
        `${summary.fromStore || "-"} → ${summary.toStore || "-"} | ${summary.date || ""} | ${summary.status || ""}`;

      renderLines();
      renderOrders();
      showMessage("orderMessage",
        "Order loaded. Verify item names and expected quantities before saving.", "success");
    } catch (error) {
      showMessage("orderMessage", error.message, "error");
    }
  }

  function renderLines() {
    $("linesBody").innerHTML = lines.map((line, index) => {
      const status = lineStatus(line);
      return `<tr>
        <td><input data-index="${index}" data-key="barcode" value="${escapeHtml(line.barcode)}"></td>
        <td><input data-index="${index}" data-key="name" value="${escapeHtml(line.name)}"></td>
        <td><input type="number" min="0" step="1" data-index="${index}" data-key="expectedQty" value="${quantity(line.expectedQty)}"></td>
        <td><input type="number" min="0" step="1" data-index="${index}" data-key="receivedQty" value="${quantity(line.receivedQty)}"></td>
        <td><span class="status ${status}">${status}</span></td>
        <td><button class="danger" data-remove="${index}">Remove</button></td>
      </tr>`;
    }).join("");

    $("linesBody").querySelectorAll("[data-index]").forEach(input => {
      input.addEventListener("change", () => {
        const index = Number(input.dataset.index);
        const key = input.dataset.key;
        lines[index][key] = ["expectedQty", "receivedQty"].includes(key)
          ? quantity(input.value) : input.value.trim();
        renderLines();
      });
    });

    $("linesBody").querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => {
        lines.splice(Number(button.dataset.remove), 1);
        renderLines();
      });
    });

   
    const matched = lines.filter(line => lineStatus(line) === "Matched").length;
    const pending = lines.filter(line => lineStatus(line) === "Pending").length;
    const variance = lines.filter(line =>
      ["Shortage", "Excess"].includes(lineStatus(line))
    ).length;

    const totalExpectedQty = lines.reduce(
      (sum, line) => sum + quantity(line.expectedQty), 0
    );

    const totalReceivedQty = lines.reduce(
      (sum, line) => sum + quantity(line.receivedQty), 0
    );

    const pendingQty = lines.reduce(
      (sum, line) => sum + Math.max(
        0,
        quantity(line.expectedQty) - quantity(line.receivedQty)
      ), 0
    );

  
$("stats").innerHTML = `
  <div class="stat">
    <strong>${lines.length}</strong> Total Lines
  </div>

  <div class="stat">
    <strong>${totalExpectedQty}</strong> Total Expected Qty
  </div>

  <div class="stat">
    <strong>${totalReceivedQty}</strong> Total Received Qty
  </div>

  <div class="stat">
    <strong>${pendingQty}</strong> Total Pending Qty
  </div>

  <div class="stat">
    <strong>${matched}</strong> Matched
  </div>

  <div class="stat">
    <strong>${variance}</strong> Shortage / Excess
  </div>

  <div class="stat">
    <strong>${overallStatus()}</strong> Overall Status
  </div>
`;

  }

  function addScan(code) {
    code = String(code || "").trim();
    if (!code) return;

    const found = lines.find(line =>
      String(line.barcode).toLowerCase() === code.toLowerCase() ||
      String(line.sku).toLowerCase() === code.toLowerCase()
    );

    if (found) {
      found.receivedQty = quantity(found.receivedQty) + 1;
      renderLines();
      showMessage("saveMessage", `Scanned ${code}. Received quantity increased by 1.`, "success");
    } else {
      lines.push({
        barcode: code, sku: code, name: "Extra item - verify",
        expectedQty: 0, receivedQty: 1
      });
      renderLines();
      showMessage("saveMessage", `${code} was not on this order. Added as an extra line; verify before saving.`);
    }

    $("barcodeInput").value = "";
    $("barcodeInput").focus();
  }

  async function saveCheck() {
    if (!selectedOrder) return showMessage("saveMessage", "Select a transfer order first.", "error");
    if (!lines.length) return showMessage("saveMessage", "No items to save.", "error");

    try {
      $("saveBtn").disabled = true;
      const payload = {
        transferOrderId: selectedOrder.transferOrderId,
        transferOrderNo: selectedOrder.transferOrderNo,
        fromStore: selectedOrder.fromStore,
        toStore: selectedOrder.toStore,
        lines: lines.map(line => ({
          barcode: line.barcode || line.sku,
          sku: line.sku || line.barcode,
          name: line.name,
          expectedQty: quantity(line.expectedQty),
          receivedQty: quantity(line.receivedQty)
        }))
      };

      const data = await api("/transfer-checks", {
        method: "POST", body: JSON.stringify(payload)
      });

      showMessage("saveMessage", `Saved. Status: ${data.check?.status || overallStatus()}`, "success");
      await loadSavedChecks();
    } catch (error) {
      showMessage("saveMessage", error.message, "error");
    } finally {
      $("saveBtn").disabled = false;
    }
  }

  async function loadSavedChecks() {
    try {
      const data = await api("/transfer-checks");
      const checks = data.checks || [];
      $("savedBody").innerHTML = checks.map(check => `<tr>
        <td>${escapeHtml(check.transferOrderNo || check.transferOrderId || "-")}</td>
        <td>${escapeHtml(check.fromStore || "-")}</td>
        <td>${escapeHtml(check.toStore || "-")}</td>
        <td>${escapeHtml(check.status || "-")}</td>
        <td>${Array.isArray(check.lines) ? check.lines.length : 0}</td>
      </tr>`).join("") || "<tr><td colspan='5'>No saved checks found.</td></tr>";
      showMessage("savedMessage", `Loaded ${checks.length} saved checks.`, "success");
    } catch (error) {
      showMessage("savedMessage", error.message, "error");
    }
  }

  async function startCamera() {
    if (!("BarcodeDetector" in window)) {
      $("cameraBox").hidden = false;
      showMessage("cameraMessage",
        "BarcodeDetector is not supported in this browser. Use a USB scanner or type the SKU.", "error");
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, audio: false
      });
      $("cameraVideo").srcObject = cameraStream;
      $("cameraBox").hidden = false;
      await $("cameraVideo").play();
      detector = new BarcodeDetector();

      cameraTimer = setInterval(async () => {
        try {
          const results = await detector.detect($("cameraVideo"));
          if (!results.length) return;
          const code = results[0].rawValue;
          const now = Date.now();
          if (code && (code !== lastCameraCode || now - lastCameraTime > 1800)) {
            lastCameraCode = code;
            lastCameraTime = now;
            addScan(code);
            $("cameraMessage").textContent = `Last scan: ${code}`;
          }
        } catch (_) {}
      }, 700);
    } catch (error) {
      $("cameraBox").hidden = false;
      showMessage("cameraMessage", `Camera error: ${error.message}`, "error");
    }
  }

  function stopCamera() {
    if (cameraTimer) clearInterval(cameraTimer);
    cameraTimer = null;
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $("cameraVideo").srcObject = null;
    $("cameraBox").hidden = true;
  }

  $("refreshBtn").addEventListener("click", loadOrders);
  $("loadBtn").addEventListener("click", loadOrders);
  $("searchInput").addEventListener("input", renderOrders);
  $("scanBtn").addEventListener("click", () => addScan($("barcodeInput").value));
  $("barcodeInput").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); addScan($("barcodeInput").value); }
  });
  $("saveBtn").addEventListener("click", saveCheck);
  $("savedBtn").addEventListener("click", loadSavedChecks);
  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset all received quantities to zero?")) {
      lines.forEach(line => { line.receivedQty = 0; });
      renderLines();
    }
  });
  $("cameraBtn").addEventListener("click", startCamera);
  $("stopCameraBtn").addEventListener("click", stopCamera);
  window.addEventListener("beforeunload", stopCamera);

  loadOrders();
})();

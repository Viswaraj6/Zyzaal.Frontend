(() => {
  const API = 'https://fark618-backend.onrender.com/admin/inventory';
  const $ = id => document.getElementById(id);
  let orders = [], selectedOrder = null, lines = [], cameraStream = null, scanTimer = null, highlightedLineIndex = -1;
  let audioContext = null;
  const token = () => localStorage.getItem('adminToken');
  function authHeaders(json=true) {
    const t = token();
    if (!t) throw new Error('Admin token not found. Please log in again in the FARK 618 admin panel.');
    const h = {'Authorization': `Bearer ${t}`};
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  async function api(path, options={}) {
    const response = await fetch(API + path, {...options, headers:{...authHeaders(options.body !== undefined), ...(options.headers||{})}});
    const type = response.headers.get('content-type') || '';
    if (!response.ok) {
      let msg = `Request failed (${response.status})`;
      try { const data = type.includes('json') ? await response.json() : null; if (data?.message) msg = data.message; } catch {}
      throw new Error(msg);
    }
    return type.includes('json') ? response.json() : response;
  }

  function ensureStatusStyles(){
    if (document.getElementById('transferStatusColors')) return;
    const style = document.createElement('style');
    style.id = 'transferStatusColors';
    style.textContent = `
      .status { display:inline-flex; align-items:center; justify-content:center; padding:4px 9px; border-radius:999px; font-size:12px; font-weight:700; line-height:1.3; border:1px solid transparent; }
      .status-matched { color:#166534 !important; background:#dcfce7 !important; border-color:#86efac !important; }
      .status-pending { color:#92400e !important; background:#fef3c7 !important; border-color:#fcd34d !important; }
      .status-excess { color:#9f1239 !important; background:#ffe4e6 !important; border-color:#fda4af !important; }
      .status-shortage { color:#9a3412 !important; background:#ffedd5 !important; border-color:#fdba74 !important; }
      .status-variance { color:#9a3412 !important; background:#ffedd5 !important; border-color:#fdba74 !important; }
    `;
    document.head.appendChild(style);
  }

  function showNotice(id, message, kind='') { const el=$(id); el.textContent=message; el.className='notice'+(kind?' '+kind:''); el.hidden=false; }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function number(v){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.floor(n):0;}
  function lineStatus(l){if(l.receivedQty===0&&l.expectedQty>0)return 'Pending';if(l.receivedQty<l.expectedQty)return 'Shortage';if(l.receivedQty>l.expectedQty)return 'Excess';return 'Matched';}
  function statusClass(status){
    return String(status || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }
  function overallStatus(){if(lines.every(l=>lineStatus(l)==='Matched'))return 'Matched';if(lines.some(l=>lineStatus(l)==='Pending'))return 'Pending';return 'Variance';}
  function renderOrders(){
    const q=$('searchOrders').value.trim().toLowerCase();
    const filtered=orders.filter(o=>[o.transferOrderNo,o.fromStore,o.toStore,o.status].some(v=>String(v||'').toLowerCase().includes(q)));
    $('orders').innerHTML=filtered.map(o=>`<button class="order ${selectedOrder?.transferOrderId===o.transferOrderId?'active':''}" data-id="${escapeHtml(o.transferOrderId)}"><strong>${escapeHtml(o.transferOrderNo||o.transferOrderId)}</strong><span>${escapeHtml(o.fromStore||'—')} → ${escapeHtml(o.toStore||'—')}</span><span>${escapeHtml(o.date||'')} · ${escapeHtml(o.status||'')} · Qty ${number(o.totalQuantity)}</span></button>`).join('')||'<div style="color:#64748b">No matching orders.</div>';
    $('orders').querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>chooseOrder(b.dataset.id)));
  }
  async function loadOrders(){
    try{
      showNotice('orderNotice','Loading Zoho transfer orders…');
      const page=Math.max(1,number($('pageNo').value)||1);
      const data=await api(`/transfer-orders?page=${page}&per_page=50`,{method:'GET'});
      orders=data.orders||[]; renderOrders();
      showNotice('orderNotice',`Loaded ${orders.length} transfer orders (page ${data.page||page}). Choose an order to verify physical receipt.`, 'success');
    }catch(e){showNotice('orderNotice',e.message,'error');}
  }
  function extractLines(o){
    const raw=o.line_items||o.transfer_order_line_items||o.items||[];
    return raw.map(x=>{
      const sku=String(x.sku||x.item_sku||x.item_id||'').trim();
      const productCode=String(x.item_code||x.product_code||x.code||x.productCode||'').trim();
      const barcode=String(x.barcode||x.ean||x.upc||sku).trim();
      const qty=number(
        x.quantity_transfer ??
        x.quantity_transferred ??
        x.quantity ??
        x.transfer_quantity ??
        x.quantity_to_transfer ??
        x.quantity_ordered ??
        0
      );
      return {
        barcode, sku:sku||barcode, productCode,
        name:String(x.name||x.item_name||x.description||''),
        expectedQty:qty, receivedQty:0, isExtra:false
      };
    });
  }
  async function chooseOrder(id){
    const summary=orders.find(o=>o.transferOrderId===id); if(!summary)return;
    try{
      showNotice('orderNotice',`Loading ${summary.transferOrderNo} details…`);
      const data=await api(`/transfer-orders/${encodeURIComponent(id)}`,{method:'GET'});
      const o=data.transferOrder;
      selectedOrder={...summary, raw:o};
      lines=extractLines(o);
      $('checkCard').hidden=false;
      $('ordersCard').hidden=true;
      $('selectedTitle').textContent=summary.transferOrderNo||'Transfer order';
      $('selectedMeta').textContent=`${summary.fromStore||'—'} → ${summary.toStore||'—'} · ${summary.date||''} · Zoho status: ${summary.status||'—'}`;
      renderLines(); renderOrders();
      showNotice('orderNotice',`Selected ${summary.transferOrderNo}. Confirm expected quantities before saving.`, 'success');
      $('barcodeInput').focus();
    }catch(e){showNotice('orderNotice',e.message,'error');}
  }
  function renderLines(){
    $('linesBody').innerHTML=lines.map((l,i)=>{
      const extra=l.isExtra===true;
      const status=lineStatus(l);
      return `<tr data-line-row="${i}" class="${extra?'extra-line ':''}${i===highlightedLineIndex?'scan-highlight':''}">
        <td><input aria-label="Barcode / SKU ${i+1}" data-i="${i}" data-k="barcode" value="${escapeHtml(l.barcode)}" ${extra?'':'readonly'}></td>
        <td><input aria-label="Product ${i+1}" data-i="${i}" data-k="name" value="${escapeHtml(l.name)}" ${extra?'':'readonly'}></td>
        <td><input type="number" min="0" step="1" aria-label="Expected quantity ${i+1}" data-i="${i}" data-k="expectedQty" value="${number(l.expectedQty)}" ${extra?'':'readonly'}></td>
        <td><input type="number" min="0" step="1" aria-label="Received quantity ${i+1}" data-i="${i}" data-k="receivedQty" value="${number(l.receivedQty)}"></td>
        <td><span class="status status-${statusClass(status)}">${status}</span></td>
        <td>${extra?`<button class="danger" data-remove="${i}" style="padding:7px 9px">Remove</button>`:'<span style="color:#94a3b8">Locked</span>'}</td>
      </tr>`;
    }).join('');

    $('linesBody').querySelectorAll('input[data-i]').forEach(inp=>inp.addEventListener('change',()=>{
      const i=Number(inp.dataset.i), k=inp.dataset.k;
      if(!lines[i]) return;
      if(k!=='receivedQty' && lines[i].isExtra!==true) return;
      lines[i][k]=(k==='expectedQty'||k==='receivedQty')?number(inp.value):inp.value.trim();
      if(k==='barcode' && !lines[i].sku) lines[i].sku=inp.value.trim();
      renderLines();
    }));
    $('linesBody').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{
      const i=Number(b.dataset.remove);
      if(lines[i]?.isExtra===true){lines.splice(i,1);renderLines();}
    }));

    const matched=lines.filter(l=>lineStatus(l)==='Matched').length;
    const variance=lines.filter(l=>['Shortage','Excess'].includes(lineStatus(l))).length;
    const pending=lines.filter(l=>lineStatus(l)==='Pending').length;
    const totalExpected=lines.reduce((sum,l)=>sum+number(l.expectedQty),0);
    const totalReceived=lines.reduce((sum,l)=>sum+number(l.receivedQty),0);
    const totalPending=lines.reduce((sum,l)=>sum+Math.max(0,number(l.expectedQty)-number(l.receivedQty)),0);

    $('stats').innerHTML=`
      <div class="stat"><b>${lines.length}</b> Total Lines</div>
      <div class="stat"><b>${totalExpected}</b> Total Expected Qty</div>
      <div class="stat"><b>${totalReceived}</b> Total Received Qty</div>
      <div class="stat"><b>${totalPending}</b> Total Pending Qty</div>
      <div class="stat"><b>${matched}</b> Matched</div>
      <div class="stat"><b>${variance}</b> Shortage / Excess</div>
      <div class="stat"><b>${overallStatus()}</b> Overall Status</div>`;
  }
  function normalizeCode(value){return String(value??'').trim().toLowerCase();}
  function playScanSound(success=true){
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = audioContext || new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const playTone = (frequency, endFrequency, startAt, duration, volume) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, startAt);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), startAt + duration * 0.72);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
        gain.gain.setValueAtTime(volume, startAt + duration * 0.48);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      };
      if (success) {
        // Clear, short tick-like confirmation: two bright high notes.
        playTone(1450, 1850, now, 0.075, 0.28);
        playTone(1850, 2250, now + 0.055, 0.085, 0.26);
      } else {
        // Distinct lower warning tone for unmatched barcode.
        playTone(330, 180, now, 0.24, 0.34);
      }
    } catch (e) {
      console.warn('Scan sound could not play:', e);
    }
  }

  function highlightAndScroll(line){
    highlightedLineIndex = lines.indexOf(line);
    renderLines();
    const row = document.querySelector(`[data-line-row="${highlightedLineIndex}"]`);
    if (row) { row.scrollIntoView({behavior:'smooth', block:'center'}); }
  }

  function addBarcode(codeFromCamera=''){
    const code=(codeFromCamera || $('barcodeInput').value).trim();
    if(!code)return null;
    const scanned=normalizeCode(code);
    const found=lines.find(l=>[
      l.barcode,l.sku,l.productCode,l.name
    ].some(value=>normalizeCode(value)===scanned));

    let result;
    if(found){
      found.receivedQty=number(found.receivedQty)+1;
      result={matched:true,code,line:found};
      highlightedLineIndex = lines.indexOf(found);
      renderLines();
      showNotice('saveNotice',`✓ Scanned ${code}: ${found.name||found.sku||found.barcode} — Received ${number(found.receivedQty)} / Expected ${number(found.expectedQty)}.`,'success');
    } else {
      const extra={
        barcode:code,sku:code,productCode:code,name:'Extra item - verify',
        expectedQty:0,receivedQty:1,isExtra:true
      };
      lines.push(extra);
      result={matched:false,code,line:extra};
      renderLines();
      showNotice('saveNotice',`⚠ ${code} did not match an order line. Added as an extra item; verify it before saving.`);
    }
    $('barcodeInput').value='';
    $('barcodeInput').focus();
    return result;
  }

  function csvCell(value) {
    const s = String(value ?? '');
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportVerificationExcel(checkData = null) {
    if (!selectedOrder || !lines.length) {
      showNotice('saveNotice', 'Choose and verify a transfer order before exporting.', 'error');
      return;
    }

    const verifiedAt = checkData?.verifiedAt || checkData?.createdAt || new Date().toISOString();
    const checkNo = checkData?._id || checkData?.checkId || '';
    const rows = [
      ['FARK 618 - Transfer Verification Report'],
      ['Transfer Order No', selectedOrder.transferOrderNo || selectedOrder.transferOrderId || ''],
      ['From Store', selectedOrder.fromStore || ''],
      ['To Store', selectedOrder.toStore || ''],
      ['Verification Date', new Date(verifiedAt).toLocaleString()],
      ['Overall Status', checkData?.status || overallStatus()],
      [],
      ['S.No', 'Barcode', 'SKU', 'Product Code', 'Product Name', 'Expected Qty', 'Received Qty', 'Balance Qty', 'Variance', 'Line Status']
    ];

    lines.forEach((line, index) => {
      const expected = number(line.expectedQty);
      const received = number(line.receivedQty);
      const balance = expected - received;
      const variance = received - expected;
      rows.push([
        index + 1,
        line.barcode || '',
        line.sku || '',
        line.productCode || '',
        line.name || '',
        expected,
        received,
        balance,
        variance,
        lineStatus(line)
      ]);
    });

    rows.push([]);
    rows.push([
      'TOTAL', '', '', '', '',
      lines.reduce((sum, line) => sum + number(line.expectedQty), 0),
      lines.reduce((sum, line) => sum + number(line.receivedQty), 0),
      lines.reduce((sum, line) => sum + number(line.expectedQty) - number(line.receivedQty), 0),
      lines.reduce((sum, line) => sum + number(line.receivedQty) - number(line.expectedQty), 0),
      checkData?.status || overallStatus()
    ]);

    // UTF-8 BOM helps Excel display product names correctly.
    const csv = '\\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeOrderNo = String(selectedOrder.transferOrderNo || selectedOrder.transferOrderId || 'transfer')
      .replace(/[^a-z0-9_-]+/gi, '_');
    const dateTag = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FARK618_Transfer_Verification_${safeOrderNo}_${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addVerificationExportButton() {
    if ($('exportVerificationBtn') || !$('saveBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'exportVerificationBtn';
    btn.type = 'button';
    btn.textContent = 'Export Verification to Excel';
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', () => exportVerificationExcel());
    $('saveBtn').insertAdjacentElement('afterend', btn);
  }

  async function saveCheck(){
    if(!selectedOrder){showNotice('saveNotice','Choose a transfer order first.','error');return;}
    if(!lines.length){showNotice('saveNotice','Add at least one line before saving.','error');return;}
    try{
      $('saveBtn').disabled=true;
      const payload={transferOrderId:selectedOrder.transferOrderId,transferOrderNo:selectedOrder.transferOrderNo,fromStore:selectedOrder.fromStore,toStore:selectedOrder.toStore,lines:lines.map(l=>({barcode:l.barcode||l.sku,sku:l.sku||l.barcode,productCode:l.productCode||'',name:l.name,expectedQty:number(l.expectedQty),receivedQty:number(l.receivedQty)}))};
      const data=await api('/transfer-checks',{method:'POST',body:JSON.stringify(payload)});
      showNotice('saveNotice',`Saved successfully. Overall status: ${data.check?.status||overallStatus()}.`,'success');
      loadChecks();
    }catch(e){showNotice('saveNotice',e.message,'error');}finally{$('saveBtn').disabled=false;}
  }

  function exportSavedCheck(check) {
    const savedLines = Array.isArray(check?.lines) ? check.lines : [];
    if (!savedLines.length) {
      showNotice('checksNotice', 'This saved verification has no line details to export.', 'error');
      return;
    }

    const expectedTotal = savedLines.reduce((sum, line) => sum + number(line.expectedQty), 0);
    const receivedTotal = savedLines.reduce((sum, line) => sum + number(line.receivedQty), 0);
    const balanceTotal = savedLines.reduce((sum, line) => sum + (number(line.expectedQty) - number(line.receivedQty)), 0);
    const varianceTotal = savedLines.reduce((sum, line) => sum + (number(line.receivedQty) - number(line.expectedQty)), 0);
    const created = check.verifiedAt || check.createdAt || check.updatedAt || '';
    const rows = [
      ['FARK 618 - Saved Transfer Verification Report'],
      ['Transfer Order No', check.transferOrderNo || check.transferOrderId || ''],
      ['From Store', check.fromStore || ''],
      ['To Store', check.toStore || ''],
      ['Verification Date', created ? new Date(created).toLocaleString() : ''],
      ['Overall Status', check.status || ''],
      [],
      ['S.No', 'Barcode', 'SKU', 'Product Code', 'Product Name', 'Expected Qty', 'Received Qty', 'Balance Qty', 'Variance', 'Line Status']
    ];

    savedLines.forEach((line, index) => {
      const expected = number(line.expectedQty);
      const received = number(line.receivedQty);
      const balance = expected - received;
      const variance = received - expected;
      let status = 'Matched';
      if (received === 0 && expected > 0) status = 'Pending';
      else if (received < expected) status = 'Shortage';
      else if (received > expected) status = 'Excess';
      rows.push([
        index + 1,
        line.barcode || '',
        line.sku || '',
        line.productCode || '',
        line.name || '',
        expected,
        received,
        balance,
        variance,
        status
      ]);
    });
    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', expectedTotal, receivedTotal, balanceTotal, varianceTotal, check.status || '']);

    const csv = '\\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeOrderNo = String(check.transferOrderNo || check.transferOrderId || 'transfer')
      .replace(/[^a-z0-9_-]+/gi, '_');
    const dateTag = created ? new Date(created).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FARK618_Saved_Verification_${safeOrderNo}_${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function loadChecks(){
    try{
      const status=$('filterStatus').value;
      const data=await api('/transfer-checks'+(status?'?status='+encodeURIComponent(status):''),{method:'GET'});
      const checks=data.checks||[];
      $('checksBody').innerHTML=checks.map((c,i)=>`<tr><td>${escapeHtml(c.transferOrderNo||c.transferOrderId||'—')}</td><td>${escapeHtml(c.fromStore||'—')}</td><td>${escapeHtml(c.toStore||'—')}</td><td><span class="status status-${statusClass(c.status)}">${escapeHtml(c.status||'—')}</span></td><td>${escapeHtml(c.verifiedAt?new Date(c.verifiedAt).toLocaleString():(c.createdAt?new Date(c.createdAt).toLocaleString():'—'))}</td><td>${Array.isArray(c.lines)?c.lines.length:0}</td><td><button type="button" data-export-check="${i}" class="export-saved-check">Export Excel</button></td></tr>`).join('')||'<tr><td colspan="7">No saved checks found.</td></tr>';
      $('checksBody').querySelectorAll('[data-export-check]').forEach(btn=>btn.addEventListener('click',()=>{
        const check=checks[Number(btn.dataset.exportCheck)];
        if(check) exportSavedCheck(check);
      }));
      showNotice('checksNotice',`Loaded ${checks.length} saved checks.`,'success');
    }catch(e){showNotice('checksNotice',e.message,'error');}
  }
  async function startCamera(){
    if(!('BarcodeDetector' in window)){showNotice('saveNotice','This browser does not support BarcodeDetector. Use a USB scanner or type the barcode.','error');return;}
    try{
      // Camera button is a user gesture: unlock audio here for scan feedback.
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = audioContext || new AudioCtx();
        if (audioContext.state === 'suspended') await audioContext.resume();
      }
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      $('video').srcObject=cameraStream;
      $('cameraBox').style.display='block'; $('scanBottom').classList.remove('open');
      $('cameraBox').classList.add('camera-fullscreen-ready');
      $('video').style.width='100%';
      $('video').style.maxHeight='calc(100vh - 120px)';
      $('video').style.objectFit='contain';
      await $('video').play();
      $('cameraStatus').textContent='Camera running — scan continuously'; $('scanResultTitle').textContent='Ready to scan'; $('scanResultSub').textContent='Scan a product barcode';
      // Fullscreen may be unavailable on some browsers/devices; camera still works inline.
      const box=$('cameraBox');
      if (box.requestFullscreen) {
        try { await box.requestFullscreen(); } catch (fullscreenError) {
          console.warn('Fullscreen was not allowed; continuing inline.', fullscreenError);
        }
      }
      const detector=new BarcodeDetector();
      scanTimer=setInterval(async()=>{
        try{const codes=await detector.detect($('video'));if(codes.length&&codes[0].rawValue){const code=codes[0].rawValue;addBarcodeFromCamera(code);}}catch{}
      },700);
    }catch(e){showNotice('saveNotice',`Could not open camera: ${e.message}. Check browser camera permission.`, 'error');}
  }
  let lastCameraCode='',lastCameraAt=0, cameraTransition=false, cameraReturnTimer=null;
  function updateScanPanel(result, code){
    const line=result.line;
    const totalExpected=lines.reduce((sum,l)=>sum+number(l.expectedQty),0);
    const totalReceived=lines.reduce((sum,l)=>sum+number(l.receivedQty),0);
    const totalBalance=lines.reduce((sum,l)=>sum+Math.max(0,number(l.expectedQty)-number(l.receivedQty)),0);
    $('scanBottom').classList.toggle('warning',!result.matched);
    $('scanTick').textContent=result.matched?'✓':'!';
    $('scanResultTitle').textContent=result.matched?'Scan successful':'Product not matched';
    $('scanResultSub').textContent=`${line.name||line.sku||line.barcode||code} · ${code}`;
    $('scanExpected').textContent=totalExpected;
    $('scanReceived').textContent=totalReceived;
    $('scanBalance').textContent=totalBalance;
    $('scanCode').textContent=code;
    $('scanProduct').textContent=line.name||'—';
    $('scanItemExpected').textContent=number(line.expectedQty);
    $('scanItemReceived').textContent=number(line.receivedQty);
    $('scanItemBalance').textContent=Math.max(0,number(line.expectedQty)-number(line.receivedQty));
    $('scanTotalExpected').textContent=totalExpected;
    $('cameraStatus').textContent=result.matched?'✓ Scanned — ready for next item':'⚠ Unmatched item added — verify details';
  }
  function returnToScanner(){
    // In inline mode, bring the camera back into view after each scan.
    // Native fullscreen already keeps the scanner visible, so don't disturb it.
    if(document.fullscreenElement === $('cameraBox')) return;
    const box=$('cameraBox');
    if(!box || box.style.display==='none') return;
    requestAnimationFrame(()=>{
      const top=box.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    });
  }
  function addBarcodeFromCamera(code){
    const now=Date.now();
    if(now-lastCameraAt<1200 && code===lastCameraCode)return;
    if(cameraTransition)return;
    lastCameraCode=code;lastCameraAt=now;
    const result=addBarcode(code);
    if(!result)return;
    playScanSound(result.matched);
    updateScanPanel(result,code);
    // Automatically return to the scanner after every successful or unmatched scan.
    returnToScanner();
  }
  async function stopCamera(){
    if(scanTimer)clearInterval(scanTimer);
    scanTimer=null;
    if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
    cameraStream=null;
    $('video').srcObject=null;
    $('cameraBox').style.display='none'; $('scanBottom').classList.remove('open');
    if(document.fullscreenElement && document.fullscreenElement === $('cameraBox')){
      try { await document.exitFullscreen(); } catch (_) {}
    }
  }
  $('scanPanelToggle').addEventListener('click',()=>{
    const panel=$('scanBottom');
    panel.classList.toggle('open');
    $('scanChevron').textContent=panel.classList.contains('open')?'▼':'▲';
  });
  $('reloadBtn').addEventListener('click',loadOrders);$('loadOrdersBtn').addEventListener('click',loadOrders);$('searchOrders').addEventListener('input',renderOrders);
  $('backToOrdersBtn').addEventListener('click',()=>{
    if(cameraStream) stopCamera();
    selectedOrder=null; lines=[]; highlightedLineIndex=-1;
    $('checkCard').hidden=true; $('ordersCard').hidden=false;
    $('barcodeInput').value='';
    window.scrollTo({top:0,behavior:'smooth'});
    renderOrders();
  });
  function addBarcodeManually(){
    const result = addBarcode();
    if(!result) return;
    playScanSound(result.matched);
    highlightAndScroll(result.line);
  }
  $('barcodeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addBarcodeManually();}});
  $('addBarcodeBtn').addEventListener('click',()=>addBarcodeManually());
  $('addLineBtn').addEventListener('click',()=>{lines.push({barcode:'',sku:'',productCode:'',name:'',expectedQty:0,receivedQty:0,isExtra:true});renderLines();});
  addVerificationExportButton();
  $('saveBtn').addEventListener('click',saveCheck);$('loadChecksBtn').addEventListener('click',loadChecks);$('resetCountsBtn').addEventListener('click',()=>{if(confirm('Reset all received quantities to zero?')){lines.forEach(l=>l.receivedQty=0);renderLines();}});
  $('cameraBtn').addEventListener('click',()=>{if($('cameraBox').style.display==='block')stopCamera();else startCamera();});
  $('stopCameraBtn').addEventListener('click',stopCamera);
  $('exportLink').href=API+'/reports/stocktake.csv';
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement && cameraStream && $('cameraBox').style.display==='block'){
      $('cameraStatus').textContent='Camera running (fullscreen exited; scanning continues)';
    }
  });
  window.addEventListener('beforeunload',stopCamera);
  ensureStatusStyles();
  if (token()) loadOrders();
  window.addEventListener('fark618:login', () => { loadOrders(); loadChecks(); });
})();

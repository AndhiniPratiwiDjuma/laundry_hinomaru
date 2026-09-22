const FALLBACK_SERVICES = [
    {
        id: 1,
        name: 'Cuci Kering + Setrika',
        price: 7000,
        unit: 'kg'
    },
    {
        id: 2,
        name: 'Cuci Kering + Lipat',
        price: 4000,
        unit: 'kg'
    },
    {
        id: 3,
        name: 'Cuci Kering',
        price: 3000,
        unit: 'kg'
    },
    {
        id: 4,
        name: 'Setrika',
        price: 5000,
        unit: 'kg'
    },
    {
        id: 5,
        name: 'Cuci Express 3 Jam',
        price: 15000,
        unit: 'kg'
    },
    {
        id: 6,
        name: 'Cuci Express 6 Jam',
        price: 10000,
        unit: 'kg'
    },
    {
        id: 7,
        name: 'Cuci Satuan',
        price: 10000,
        unit: 'pcs'
    },
    {
        id: 8,
        name: 'Selimut Besar',
        price: 15000,
        unit: 'pcs'
    },
    {
        id: 9,
        name: 'Selimut Kecil',
        price: 10000,
        unit: 'pcs'
    },
    {
        id: 10,
        name: 'Sepray',
        price: 15000,
        unit: 'pcs'
    },
    {
        id: 11,
        name: 'Handuk',
        price: 5000,
        unit: 'pcs'
    }
];
let services = [], allOrders = [];
const localMode = true;
const AUTH_KEY = 'hinomaru_cashiers_v2';
const SESSION_KEY = 'hinomaru_cashier_session_v1';
const LOGIN_PAGE = 'login.html';
function authAccount() { try {
    const v = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    return Array.isArray(v) ? (v[0] || null) : v;
}
catch (e) {
    return null;
} }
function authSession() { try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}
catch (e) {
    return null;
} }
function cashierName() { return authSession()?.name || 'Kasir'; }
async function passwordDigest(v) { const data = new TextEncoder().encode(v); const buf = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join(''); }
function isLoginPage() { return /\/(?:login\.html)?$/i.test(location.pathname) && /login\.html$/i.test(location.pathname); }
async function requireAuth() { if (isLoginPage())
    return; const s = authSession(); if (!s?.name) {
    location.replace(LOGIN_PAGE);
    return false;
} return true; }
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const esc = t => $('<div>').text(t ?? '').html();
const localKey = 'hinomaru_orders_v4';
function localOrders() { try {
    return JSON.parse(localStorage.getItem(localKey) || '[]');
}
catch (e) {
    return [];
} }
function saveLocal(o) { localStorage.setItem(localKey, JSON.stringify(o)); }
function localNota() { const d = new Date(); const date = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); const n = localOrders().length + 1; return `HN-${date}-${String(n).padStart(3, '0')}`; }
function getLocalService(id) { return services.find(s => String(s.id) === String(id)) || FALLBACK_SERVICES.find(s => String(s.id) === String(id)); }
function loadServices(done) { if (localMode) {
    services = FALLBACK_SERVICES;
    afterServices(done);
    return;
} $.getJSON('/api/services').done(d => { services = d?.length ? d : FALLBACK_SERVICES; afterServices(done); }).fail(() => { services = FALLBACK_SERVICES; afterServices(done); }); }
function afterServices(done) { renderServiceOptions(); renderFullPrices(); if ($('#orderItems').length && !$('#orderItems .service-row').length)
    addOrderItem(); if (done)
    done(); }
function renderServiceOptions() { const s = $('#service'); if (!s.length)
    return; s.empty().append('<option value="">Pilih layanan...</option>'); services.forEach(x => s.append(`<option value="${x.id}">${esc(x.name)} — ${rupiah(x.price)}/${x.unit}</option>`)); }
function renderFullPrices() { const box = $('#fullPriceList'); if (!box.length)
    return; box.html(services.map(s => `<article class="price-card col h-100 p-4"><div class="price-content"><h3 class="mb-2">${esc(s.name)}</h3><p class="mb-0">Tarif per ${esc(s.unit)}</p><strong class="d-block mt-3">${rupiah(s.price)}</strong></div></article>`).join('')); }
function addOrderItem() { const row = $(`<div class="service-row"><label>Layanan<select class="item-service"><option value="">Pilih layanan...</option>${services.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>Jumlah<input class="item-qty" type="number" min="0.1" step="0.1" value="1"></label><div class="row-price">Subtotal<br><b>Rp0</b></div><button type="button" class="remove-item" title="Hapus layanan">×</button></div>`); $('#orderItems').append(row); refreshOrderRows(); }
function refreshOrderRows() { $('.service-row').each(function () { const row = $(this), s = getLocalService(row.find('.item-service').val()), qty = row.find('.item-qty'), q = Number(qty.val()) || 0; if (s) {
    qty.attr('step', s.unit === 'kg' ? '0.1' : '1');
    qty.attr('min', s.unit === 'kg' ? '0.1' : '1');
    if (s.unit === 'pcs' && q > 0 && q % 1 !== 0)
        qty.val(Math.max(1, Math.round(q)));
    row.find('.row-price b').text(rupiah(Math.round(s.price * (Number(qty.val()) || 0))));
}
else {
    row.find('.row-price b').text('Rp0');
} }); updateGrandTotal(); }
function updateGrandTotal() { let total = 0; $('.service-row').each(function () { const s = getLocalService($(this).find('.item-service').val()); const q = Number($(this).find('.item-qty').val()) || 0; if (s)
    total += Math.round(s.price * q); }); $('#totalPreview').text(rupiah(total)); }
function buildPayload() { const items = []; $('.service-row').each(function () { const sid = Number($(this).find('.item-service').val()); const q = Number($(this).find('.item-qty').val()); if (sid && q > 0)
    items.push({ serviceId: sid, quantity: q }); }); return items; }
function normalizeLocalOrder(raw) { return raw.map(o => { if (o.items)
    return o; const s = o.service || {}; return { ...o, items: [{ service: s, quantity: o.quantity, subtotal: o.total }] }; }); }
function fetchOrders(cb) { if (localMode) {
    allOrders = normalizeLocalOrder(localOrders());
    cb && cb(allOrders);
    return;
} $.getJSON('/api/orders').done(d => { allOrders = d || []; cb && cb(allOrders); }).fail(() => { allOrders = normalizeLocalOrder(localOrders()); cb && cb(allOrders); }); }
function localCreate(customer, items) { let total = 0; const mapped = items.map(x => { const s = getLocalService(x.serviceId); const subtotal = Math.round(s.price * x.quantity); total += subtotal; return { service: s, quantity: x.quantity, subtotal }; }); const o = { nota: localNota(), customer, items: mapped, total, status: 'DIPROSES', createdAt: new Date().toISOString() }; const list = localOrders(); list.unshift(o); saveLocal(list); return o; }
function createOrder(customer, items, onDone, onFail) { if (localMode) {
    try {
        onDone(localCreate(customer, items));
    }
    catch (e) {
        onFail(e.message);
    }
    return;
} $.ajax({ url: '/api/orders', method: 'POST', contentType: 'application/json', data: JSON.stringify({ customer, items, cashier: cashierName() }) }).done(onDone).fail(x => { try {
    onFail(x.responseJSON?.message || 'Gagal menyimpan pesanan.');
}
catch (e) {
    onFail('Gagal menyimpan pesanan.');
} }); }
function updateStatus(nota, status, onDone, onFail) { if (localMode) {
    const list = localOrders();
    const o = list.find(x => x.nota === nota);
    if (!o) {
        onFail('Nota tidak ditemukan.');
        return;
    }
    o.status = status;
    saveLocal(list);
    onDone(o);
    return;
} $.ajax({ url: '/api/orders/' + encodeURIComponent(nota) + '/status', method: 'PATCH', contentType: 'application/json', data: JSON.stringify({ status }) }).done(onDone).fail(x => onFail(x.responseJSON?.message || 'Gagal mengubah status.')); }
function statusBadge(s) { return `<span class="status ${s}">${s}</span>`; }
function itemsSummary(o) { return (o.items || []).map(i => `${esc(i.service.name)} (${i.quantity} ${i.service.unit})`).join(', '); }
function orderCard(o) { let a = ''; if (o.status === 'DIPROSES')
    a = `<button class="small-btn success status-btn" data-nota="${esc(o.nota)}" data-status="SELESAI">Tandai Selesai</button>`; if (o.status === 'SELESAI')
    a = ``; return `<article class="queue-card"><div class="queue-top"><span class="nota">${esc(o.nota)}</span>${statusBadge(o.status)}</div><h3>${esc(o.customer)}</h3><p>${itemsSummary(o)} · <b>${rupiah(o.total)}</b></p><div class="queue-actions">${a}</div></article>`; }
function receiptHTML(o) { const rows = (o.items || []).map(i => `<div class="receipt-item"><div><b>${esc(i.service.name)}</b><small>${i.quantity} ${i.service.unit} × ${rupiah(i.service.price)}</small></div><strong>${rupiah(i.subtotal)}</strong></div>`).join(''); return `<div class="receipt-head"><img src="assets/logo-hinomaru-bright.png" alt="Logo Laundry Hinomaru"><div><h2>LAUNDRY HINOMARU</h2><p>Jl. Skarda N. No.80, Mks</p><p>0823 9367 8475</p></div></div><div class="receipt-title">NOTA LAUNDRY</div><div class="receipt-meta"><div><span>No. Nota</span><b>${esc(o.nota)}</b></div><div><span>Tanggal</span><b>${new Date(o.createdAt).toLocaleString('id-ID')}</b></div><div><span>Pelanggan</span><b>${esc(o.customer)}</b></div><div><span>Kasir</span><b>${esc(o.cashier || cashierName())}</b></div></div><div class="receipt-line"></div>${rows}<div class="receipt-total"><span>TOTAL</span><strong>${rupiah(o.total)}</strong></div><p class="receipt-thanks">Terima kasih · Laundry Hinomaru</p>`; }
function loadDashboard() { if (!$('#statTotal').length)
    return; if (localMode) {
    const o = normalizeLocalOrder(localOrders());
    $('#statTotal').text(o.length);
    $('#statProcess').text(o.filter(x => x.status === 'DIPROSES').length);
    $('#statDone').text(o.filter(x => x.status === 'SELESAI').length);
    $('#statPicked').text(o.filter(x => x.status === 'DIAMBIL').length);
    $('#statRevenue').text(rupiah(o.filter(x => x.status === 'SELESAI' || x.status === 'DIAMBIL').reduce((a, x) => a + x.total, 0)));
    fetchOrders(orders => $('#recentOrders').html(orders.slice(0, 6).map(x => `<a class="recent-item" href="riwayat.html"><div><b>${esc(x.customer)}</b><small>${itemsSummary(x)}</small></div><strong>${rupiah(x.total)}</strong></a>`).join('') || '<div class="empty-state">Belum ada pesanan.</div>'));
    return;
} $.getJSON('/api/dashboard').done(d => { $('#statTotal').text(d.totalOrders); $('#statProcess').text(d.processed); $('#statDone').text(d.done); $('#statPicked').text(d.picked); $('#statRevenue').text(rupiah(d.revenue)); }); fetchOrders(orders => $('#recentOrders').html(orders.slice(0, 6).map(x => `<a class="recent-item" href="riwayat.html"><div><b>${esc(x.customer)}</b><small>${itemsSummary(x)}</small></div><strong>${rupiah(x.total)}</strong></a>`).join('') || '<div class="empty-state">Belum ada pesanan.</div>')); }
function loadQueue() { if (!$('#processingList').length)
    return; fetchOrders(orders => { const p = orders.filter(x => x.status === 'DIPROSES'), d = orders.filter(x => x.status === 'SELESAI'); $('#processCount').text(p.length); $('#doneCount').text(d.length); $('#processingList').html(p.map(orderCard).join('') || '<div class="empty-state">Tidak ada cucian diproses.</div>'); $('#doneList').html(d.map(orderCard).join('') || '<div class="empty-state">Belum ada yang siap diambil.</div>'); }); }
function renderHistory() { if (!$('#historyBody').length)
    return; const q = ($('#historySearch').val() || '').toLowerCase(); const f = allOrders.filter(o => (o.nota + ' ' + o.customer + ' ' + itemsSummary(o)).toLowerCase().includes(q)); $('#historyCount').text(`${f.length} pesanan`); $('#historyBody').html(f.map(o => `<tr><td><b>${esc(o.nota)}</b></td><td>${esc(o.customer)}</td><td>${itemsSummary(o)}</td><td><b>${rupiah(o.total)}</b></td><td>${statusBadge(o.status)}</td><td><div class="history-actions">${(o.status === 'SELESAI' || o.status === 'DIAMBIL') ? `<a class="table-action" href="nota.html?nota=${encodeURIComponent(o.nota)}">Cetak Nota</a>` : `<a class="table-action" href="nota.html?nota=${encodeURIComponent(o.nota)}">Cetak Nota</a>`}<button class="table-action edit-order" data-nota="${esc(o.nota)}">Edit</button><button class="table-action danger delete-order" data-nota="${esc(o.nota)}">Hapus</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada riwayat pesanan.</td></tr>'); }
function editRowHTML(item) { const sid = item?.service?.id || item?.serviceId || ''; const qty = item?.quantity || 1; return `<div class="service-row edit-row"><label>Layanan<select class="edit-service"><option value="">Pilih layanan...</option>${services.map(x => `<option value="${x.id}" ${String(x.id) === String(sid) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label><label>Jumlah<input class="edit-qty" type="number" min="0.1" step="0.1" value="${qty}"></label><div class="row-price">Subtotal<br><b>Rp0</b></div><button type="button" class="remove-edit-item" title="Hapus layanan">×</button></div>`; }
function refreshEditRows() { $('.edit-row').each(function () { const row = $(this), s = getLocalService(row.find('.edit-service').val()), q = Number(row.find('.edit-qty').val()) || 0; if (s) {
    row.find('.edit-qty').attr('step', s.unit === 'kg' ? '0.1' : '1').attr('min', s.unit === 'kg' ? '0.1' : '1');
    if (s.unit === 'pcs' && q > 0 && q % 1 !== 0)
        row.find('.edit-qty').val(Math.max(1, Math.round(q)));
    row.find('.row-price b').text(rupiah(Math.round(s.price * (Number(row.find('.edit-qty').val()) || 0))));
}
else
    row.find('.row-price b').text('Rp0'); }); let total = 0; $('.edit-row').each(function () { const s = getLocalService($(this).find('.edit-service').val()), q = Number($(this).find('.edit-qty').val()) || 0; if (s)
    total += Math.round(s.price * q); }); $('#editTotal').text(rupiah(total)); }
function buildEditPayload() { const items = []; $('.edit-row').each(function () { const sid = Number($(this).find('.edit-service').val()), q = Number($(this).find('.edit-qty').val()); if (sid && q > 0)
    items.push({ serviceId: sid, quantity: q }); }); return items; }
function addEditItem(item) { $('#editItems').append(editRowHTML(item)); refreshEditRows(); }
function openEditOrder(nota) { const o = allOrders.find(x => x.nota === nota) || normalizeLocalOrder(localOrders()).find(x => x.nota === nota); if (!o)
    return toast('Pesanan tidak ditemukan.'); $('#editNota').val(o.nota); $('#editCustomer').val(o.customer); $('#editItems').empty(); (o.items || []).forEach(addEditItem); if (!o.items?.length)
    addEditItem(); $('#editModal').addClass('open').attr('aria-hidden', 'false'); refreshEditRows(); }
function updateOrder(nota, customer, items, onDone, onFail) { if (localMode) {
    const list = localOrders();
    const o = list.find(x => x.nota === nota);
    if (!o) {
        onFail('Nota tidak ditemukan.');
        return;
    }
    let total = 0;
    o.customer = customer;
    o.items = items.map(x => { const s = getLocalService(x.serviceId); const subtotal = Math.round(s.price * x.quantity); total += subtotal; return { service: s, quantity: x.quantity, subtotal }; });
    o.total = total;
    saveLocal(list);
    onDone(o);
    return;
} $.ajax({ url: '/api/orders/' + encodeURIComponent(nota), method: 'PUT', contentType: 'application/json', data: JSON.stringify({ customer, items, cashier: cashierName() }) }).done(onDone).fail(x => onFail(x.responseJSON?.message || 'Gagal mengubah pesanan.')); }
function deleteOrder(nota, onDone, onFail) { if (localMode) {
    const list = localOrders();
    const next = list.filter(x => x.nota !== nota);
    if (next.length === list.length) {
        onFail('Nota tidak ditemukan.');
        return;
    }
    saveLocal(next);
    onDone();
    return;
} $.ajax({ url: '/api/orders/' + encodeURIComponent(nota), method: 'DELETE' }).done(onDone).fail(x => onFail(x.responseJSON?.message || 'Gagal menghapus pesanan.')); }
function initLoginPage() {
    const account = authAccount();
    const first = !account;
    $('#loginTitle').text(first ? 'Buat akun kasir' : 'Masuk ke sistem');
    $('#loginSubtitle').text(first ? 'Buat nama kasir dan password untuk penggunaan pertama.' : 'Masukkan nama kasir dan password untuk melanjutkan.');
    $('#loginSubmit').text(first ? 'Buat akun & masuk' : 'Masuk');
    $('#confirmWrap').toggle(first);
    $('#loginHint').text(first ? 'Akun kasir disimpan di perangkat ini. Gunakan password yang mudah kamu ingat tetapi tidak mudah ditebak.' : 'Jika belum memiliki akun di perangkat ini, hapus akun dari menu keluar lalu buat ulang.');
    $('#loginForm').on('submit', async function (e) {
        e.preventDefault();
        const name = $('#loginCashier').val().trim(), pass = $('#loginPassword').val(), confirm = $('#loginConfirm').val();
        const msg = $('#loginMessage').removeClass('show error success');
        if (!name || pass.length < 4) {
            msg.text('Nama kasir wajib diisi dan password minimal 4 karakter.').addClass('show error');
            return;
        }
        const hash = await passwordDigest(pass);
        if (first) {
            if (pass !== confirm) {
                msg.text('Konfirmasi password belum sama.').addClass('show error');
                return;
            }
            localStorage.setItem(AUTH_KEY, JSON.stringify({ name, hash, createdAt: new Date().toISOString() }));
            localStorage.setItem(SESSION_KEY, JSON.stringify({ name, loginAt: new Date().toISOString() }));
            location.replace('index.html');
            return;
        }
        if (name !== account.name || hash !== account.hash) {
            msg.text('Nama kasir atau password tidak sesuai.').addClass('show error');
            return;
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify({ name, loginAt: new Date().toISOString() }));
        location.replace('index.html');
    });
}
function toast(msg) { const t = $('#toast'); if (!t.length)
    return; t.text(msg).addClass('show'); setTimeout(() => t.removeClass('show'), 2500); }
$(async function () {
    if (isLoginPage()) {
        initLoginPage();
        return;
    }
    if (!(await requireAuth()))
        return;
    $('#cashierName').text(cashierName());
    loadServices();
    loadDashboard();
    loadQueue();
    fetchOrders(renderHistory);
    $('#addItem').on('click', addOrderItem);
    $(document).on('input change', '.item-service,.item-qty', refreshOrderRows);
    $(document).on('click', '.remove-item', function () { if ($('.service-row').length > 1) {
        $(this).closest('.service-row').remove();
        refreshOrderRows();
    } });
    $('#orderForm').on('submit', function (e) { e.preventDefault(); const customer = $('#customer').val().trim(); const items = buildPayload(); if (!customer)
        return toast('Isi nama pelanggan.'); if (!items.length)
        return toast('Tambahkan layanan terlebih dahulu.'); createOrder(customer, items, o => { toast('Pesanan diterima. Nota siap dicetak.'); setTimeout(() => { location.href = 'nota.html?nota=' + encodeURIComponent(o.nota) + '&issuedAtDropoff=1'; }, 350); }, msg => toast(msg)); });
    $(document).on('click', '.status-btn', function () { const b = $(this); updateStatus(b.data('nota'), b.data('status'), () => { loadQueue(); loadDashboard(); fetchOrders(renderHistory); toast('Status diperbarui.'); }, toast); });
    $('#historySearch').on('input', renderHistory);
    $(document).on('click', '.edit-order', function () { openEditOrder($(this).data('nota')); });
    $(document).on('click', '.delete-order', function () { const nota = $(this).data('nota'); if (confirm('Hapus pesanan ' + nota + '?'))
        deleteOrder(nota, () => { fetchOrders(renderHistory); loadDashboard(); loadQueue(); toast('Pesanan dihapus.'); }, toast); });
    $(document).on('input change', '.edit-service,.edit-qty', refreshEditRows);
    $('#editAddItem').on('click', () => addEditItem());
    $(document).on('click', '.remove-edit-item', function () { if ($('.edit-row').length > 1) {
        $(this).closest('.edit-row').remove();
        refreshEditRows();
    } });
    $('#closeEdit,#cancelEdit').on('click', () => $('#editModal').removeClass('open').attr('aria-hidden', 'true'));
    $('#editForm').on('submit', function (e) { e.preventDefault(); const nota = $('#editNota').val(), customer = $('#editCustomer').val().trim(), items = buildEditPayload(); if (!customer)
        return toast('Isi nama pelanggan.'); if (!items.length)
        return toast('Tambahkan layanan.'); updateOrder(nota, customer, items, () => { $('#editModal').removeClass('open').attr('aria-hidden', 'true'); fetchOrders(renderHistory); loadDashboard(); loadQueue(); toast('Perubahan disimpan.'); }, toast); });
    if ($('#standaloneReceipt').length) {
        const nota = new URLSearchParams(location.search).get('nota');
        const done = o => { $('#standaloneReceipt').html(receiptHTML(o)); };
        if (localMode) {
            const o = normalizeLocalOrder(localOrders()).find(x => x.nota === nota);
            o ? done(o) : $('#standaloneReceipt').html('<div class="empty-state">Nota tidak ditemukan.</div>');
        }
        else
            $.getJSON('/api/orders/' + encodeURIComponent(nota || '')).done(done).fail(() => { const o = normalizeLocalOrder(localOrders()).find(x => x.nota === nota); o ? done(o) : $('#standaloneReceipt').html('<div class="empty-state">Nota tidak ditemukan.</div>'); });
        $('#standalonePrint').on('click', () => window.print());
    }
    $('#logoutBtn').on('click', () => { localStorage.removeItem(SESSION_KEY); location.replace(LOGIN_PAGE); });
    setInterval(() => { loadDashboard(); loadQueue(); fetchOrders(renderHistory); }, 7000);
});

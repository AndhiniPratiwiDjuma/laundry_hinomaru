const API = 'database.php';
const SESSION_KEY = 'hinomaru_session';

let services = [];
let allOrders = [];

const rupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
}).format(Number(value) || 0);

const esc = (value) => $('<div>').text(value ?? '').html();

function getSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) {
        return null;
    }
}

function cashierName() {
    return getSession()?.name || '';
}

function cashierUsername() {
    return getSession()?.username || '';
}

function isLoginPage() {
    return location.pathname.toLowerCase().endsWith('/login.html');
}

function showMessage(message) {
    const toast = $('#toast');
    if (!toast.length) {
        alert(message);
        return;
    }
    toast.text(message).addClass('show');
    setTimeout(() => toast.removeClass('show'), 2500);
}

function apiGet(action, data = {}) {
    return $.ajax({
        url: API,
        method: 'GET',
        data: { action, ...data },
        dataType: 'json'
    });
}

function apiPost(action, data = {}) {
    return $.ajax({
        url: API + '?action=' + encodeURIComponent(action),
        method: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    });
}

function requireLogin() {
    if (isLoginPage()) return true;
    if (!getSession()?.id) {
        location.replace('login.html');
        return false;
    }
    return true;
}

function setCashierName() {
    $('#cashierName').text(cashierName() || 'Kasir');
}

function statusBadge(status) {
    return `<span class="status ${esc(status)}">${esc(status)}</span>`;
}

function itemsSummary(order) {
    return (order.items || []).map(item =>
        `${esc(item.service.name)} (${item.quantity} ${esc(item.service.unit)})`
    ).join(', ');
}

function getService(id) {
    return services.find(service => String(service.id) === String(id));
}

function loadServices(done) {
    apiGet('services')
        .done(data => {
            services = Array.isArray(data) ? data : [];
            renderServiceOptions();
            renderFullPrices();
            if ($('#orderItems').length && !$('#orderItems .service-row').length) {
                addOrderItem();
            }
            if (done) done();
        })
        .fail(xhr => {
            console.error(xhr.responseText);
            showMessage('Gagal mengambil layanan dari database.');
        });
}

function renderServiceOptions() {
    const select = $('#service');
    if (!select.length) return;

    select.empty().append('<option value="">Pilih layanan...</option>');
    services.forEach(service => {
        select.append(`<option value="${service.id}">${esc(service.name)} — ${rupiah(service.price)}/${esc(service.unit)}</option>`);
    });
}

function renderFullPrices() {
    const box = $('#fullPriceList');
    if (!box.length) return;

    box.html(services.map(service => `
        <article class="price-card col h-100 p-4">
            <div class="price-content">
                <h3 class="mb-2">${esc(service.name)}</h3>
                <p class="mb-0">Tarif per ${esc(service.unit)}</p>
                <strong class="d-block mt-3">${rupiah(service.price)}</strong>
            </div>
        </article>
    `).join(''));
}

function addOrderItem(item = null) {
    const selectedId = item?.service?.id || '';
    const quantity = item?.quantity || 1;

    const row = $(`
        <div class="service-row">
            <label>
                Layanan
                <select class="item-service">
                    <option value="">Pilih layanan...</option>
                    ${services.map(service => `
                        <option value="${service.id}" ${String(service.id) === String(selectedId) ? 'selected' : ''}>
                            ${esc(service.name)}
                        </option>
                    `).join('')}
                </select>
            </label>
            <label>
                Jumlah
                <input class="item-qty" type="number" min="0.1" step="0.1" value="${quantity}">
            </label>
            <div class="row-price">Subtotal<br><b>Rp0</b></div>
            <button type="button" class="remove-item" title="Hapus layanan">×</button>
        </div>
    `);

    $('#orderItems').append(row);
    refreshOrderRows();
}

function refreshOrderRows() {
    let total = 0;

    $('.service-row').each(function () {
        const row = $(this);
        const service = getService(row.find('.item-service').val());
        const input = row.find('.item-qty');
        let quantity = Number(input.val()) || 0;

        if (service) {
            if (service.unit === 'pcs') {
                input.attr({ min: 1, step: 1 });
                if (quantity > 0) {
                    quantity = Math.max(1, Math.round(quantity));
                    input.val(quantity);
                }
            } else {
                input.attr({ min: 0.1, step: 0.1 });
            }

            const subtotal = Math.round(service.price * quantity);
            row.find('.row-price b').text(rupiah(subtotal));
            total += subtotal;
        } else {
            row.find('.row-price b').text('Rp0');
        }
    });

    $('#totalPreview').text(rupiah(total));
}

function buildItems(containerSelector = '#orderItems') {
    const items = [];

    $(`${containerSelector} .service-row`).each(function () {
        const serviceId = Number($(this).find('.item-service,.edit-service').val());
        const quantity = Number($(this).find('.item-qty,.edit-qty').val());
        if (serviceId > 0 && quantity > 0) {
            items.push({ serviceId, quantity });
        }
    });

    return items;
}

function fetchOrders(callback) {
    apiGet('orders')
        .done(data => {
            allOrders = Array.isArray(data) ? data : [];
            if (callback) callback(allOrders);
        })
        .fail(xhr => {
            console.error(xhr.responseText);
            allOrders = [];
            if (callback) callback(allOrders);
            showMessage('Gagal mengambil pesanan dari database.');
        });
}

function saveOrder(customer, items, nota = '') {
    return apiPost('save_order', {
        nota,
        customer,
        items,
        cashier: cashierUsername() || cashierName()
    });
}

function updateStatus(nota, status) {
    return apiPost('status', { nota, status });
}

function deleteOrder(nota) {
    return apiPost('delete_order', { nota });
}

function renderDashboard() {
    if (!$('#statTotal').length) return;

    fetchOrders(orders => {
        $('#statTotal').text(orders.length);
        $('#statProcess').text(orders.filter(o => o.status === 'DIPROSES').length);
        $('#statDone').text(orders.filter(o => o.status === 'SELESAI').length);
        $('#statPicked').text(orders.filter(o => o.status === 'DIAMBIL').length);

        const revenue = orders
            .filter(o => o.status === 'SELESAI' || o.status === 'DIAMBIL')
            .reduce((sum, order) => sum + Number(order.total || 0), 0);
        $('#statRevenue').text(rupiah(revenue));

        $('#recentOrders').html(
            orders.slice(0, 6).map(order => `
                <a class="recent-item" href="riwayat.html">
                    <div>
                        <b>${esc(order.customer)}</b>
                        <small>${itemsSummary(order)}</small>
                    </div>
                    <strong>${rupiah(order.total)}</strong>
                </a>
            `).join('') || '<div class="empty-state">Belum ada pesanan.</div>'
        );
    });
}

function renderQueue() {
    if (!$('#processingList').length) return;

    fetchOrders(orders => {
        const processing = orders.filter(order => order.status === 'DIPROSES');
        const done = orders.filter(order => order.status === 'SELESAI');

        $('#processCount').text(processing.length);
        $('#doneCount').text(done.length);

        $('#processingList').html(
            processing.map(order => `
                <article class="queue-card">
                    <div class="queue-top">
                        <span class="nota">${esc(order.nota)}</span>
                        ${statusBadge(order.status)}
                    </div>
                    <h3>${esc(order.customer)}</h3>
                    <p>${itemsSummary(order)} · <b>${rupiah(order.total)}</b></p>
                    <div class="queue-actions">
                        <button class="small-btn success status-btn" data-nota="${esc(order.nota)}" data-status="SELESAI">
                            Tandai Selesai
                        </button>
                    </div>
                </article>
            `).join('') || '<div class="empty-state">Tidak ada cucian diproses.</div>'
        );

        $('#doneList').html(
            done.map(order => `
                <article class="queue-card">
                    <div class="queue-top">
                        <span class="nota">${esc(order.nota)}</span>
                        ${statusBadge(order.status)}
                    </div>
                    <h3>${esc(order.customer)}</h3>
                    <p>${itemsSummary(order)} · <b>${rupiah(order.total)}</b></p>
                    <div class="queue-actions">
                        <button class="small-btn status-btn" data-nota="${esc(order.nota)}" data-status="DIAMBIL">
                            Tandai Diambil
                        </button>
                    </div>
                </article>
            `).join('') || '<div class="empty-state">Belum ada yang siap diambil.</div>'
        );
    });
}

function renderHistory() {
    if (!$('#historyBody').length) return;

    const query = ($('#historySearch').val() || '').toLowerCase();
    const filtered = allOrders.filter(order => {
        const text = `${order.nota} ${order.customer} ${itemsSummary(order)}`.toLowerCase();
        return text.includes(query);
    });

    $('#historyCount').text(`${filtered.length} pesanan`);
    $('#historyBody').html(
        filtered.map(order => `
            <tr>
                <td><b>${esc(order.nota)}</b></td>
                <td>${esc(order.customer)}</td>
                <td>${itemsSummary(order)}</td>
                <td><b>${rupiah(order.total)}</b></td>
                <td>${statusBadge(order.status)}</td>
                <td>
                    <div class="history-actions">
                        <a class="table-action" href="nota.html?nota=${encodeURIComponent(order.nota)}">Cetak Nota</a>
                        <button class="table-action edit-order" data-nota="${esc(order.nota)}">Edit</button>
                        <button class="table-action danger delete-order" data-nota="${esc(order.nota)}">Hapus</button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty">Belum ada riwayat pesanan.</td></tr>'
    );
}

function editRowHTML(item = null) {
    const serviceId = item?.service?.id || '';
    const quantity = item?.quantity || 1;

    return `
        <div class="service-row edit-row">
            <label>
                Layanan
                <select class="edit-service">
                    <option value="">Pilih layanan...</option>
                    ${services.map(service => `
                        <option value="${service.id}" ${String(service.id) === String(serviceId) ? 'selected' : ''}>
                            ${esc(service.name)}
                        </option>
                    `).join('')}
                </select>
            </label>
            <label>
                Jumlah
                <input class="edit-qty" type="number" min="0.1" step="0.1" value="${quantity}">
            </label>
            <div class="row-price">Subtotal<br><b>Rp0</b></div>
            <button type="button" class="remove-edit-item" title="Hapus layanan">×</button>
        </div>
    `;
}

function refreshEditRows() {
    let total = 0;

    $('.edit-row').each(function () {
        const row = $(this);
        const service = getService(row.find('.edit-service').val());
        const input = row.find('.edit-qty');
        let quantity = Number(input.val()) || 0;

        if (service) {
            if (service.unit === 'pcs') {
                input.attr({ min: 1, step: 1 });
                if (quantity > 0) {
                    quantity = Math.max(1, Math.round(quantity));
                    input.val(quantity);
                }
            } else {
                input.attr({ min: 0.1, step: 0.1 });
            }

            const subtotal = Math.round(service.price * quantity);
            row.find('.row-price b').text(rupiah(subtotal));
            total += subtotal;
        } else {
            row.find('.row-price b').text('Rp0');
        }
    });

    $('#editTotal').text(rupiah(total));
}

function openEditOrder(nota) {
    const order = allOrders.find(item => item.nota === nota);
    if (!order) {
        showMessage('Pesanan tidak ditemukan.');
        return;
    }

    $('#editNota').val(order.nota);
    $('#editCustomer').val(order.customer);
    $('#editItems').empty();

    (order.items || []).forEach(item => $('#editItems').append(editRowHTML(item)));
    if (!order.items?.length) $('#editItems').append(editRowHTML());

    $('#editModal').addClass('open').attr('aria-hidden', 'false');
    refreshEditRows();
}

function receiptHTML(order) {
    const rows = (order.items || []).map(item => `
        <div class="receipt-item">
            <div>
                <b>${esc(item.service.name)}</b>
                <small>${item.quantity} ${esc(item.service.unit)} × ${rupiah(item.service.price)}</small>
            </div>
            <strong>${rupiah(item.subtotal)}</strong>
        </div>
    `).join('');

    const date = new Date(order.createdAt).toLocaleString('id-ID');

    return `
        <div class="receipt-head">
            <img src="assets/logo-hinomaru-bright.png" alt="Logo Laundry Hinomaru">
            <div>
                <h2>LAUNDRY HINOMARU</h2>
                <p>Jl. Skarda N. No.80, Mks</p>
                <p>0823 9367 8475</p>
            </div>
        </div>
        <div class="receipt-title">NOTA LAUNDRY</div>
        <div class="receipt-meta">
            <div><span>No. Nota</span><b>${esc(order.nota)}</b></div>
            <div><span>Tanggal</span><b>${esc(date)}</b></div>
            <div><span>Pelanggan</span><b>${esc(order.customer)}</b></div>
            <div><span>Kasir</span><b>${esc(order.cashier || cashierName())}</b></div>
        </div>
        <div class="receipt-line"></div>
        ${rows}
        <div class="receipt-total">
            <span>TOTAL</span>
            <strong>${rupiah(order.total)}</strong>
        </div>
        <p class="receipt-thanks">Terima kasih · Laundry Hinomaru</p>
    `;
}

function initLogin() {
    $('#toggleCashier').on('click', function () {
        $('#loginView').addClass('hidden');
        $('#cashierView').removeClass('hidden');
    });

    $('#backToLogin').on('click', function () {
        $('#cashierView').addClass('hidden');
        $('#loginView').removeClass('hidden');
        $('#cashierError, #cashierSuccess').hide().text('');
    });

    $('#loginForm').on('submit', function (event) {
        event.preventDefault();

        const username = $('#username').val().trim();
        const password = $('#password').val();
        const errorBox = $('#loginError');

        errorBox.hide().text('');

        if (!username || !password) {
            errorBox.text('Username dan password wajib diisi.').show();
            return;
        }

        apiPost('login', { username, password })
            .done(function (result) {
                if (!result || !result.success) {
                    errorBox.text(result?.message || 'Username atau password salah.').show();
                    return;
                }

                localStorage.setItem(SESSION_KEY, JSON.stringify(result.cashier));
                window.location.href = 'index.html';
            })
            .fail(function (xhr) {
                let message = 'Login gagal. Pastikan Apache dan MySQL XAMPP menyala.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    message = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.message) message = data.message;
                    } catch (e) {}
                }
                errorBox.text(message).show();
                console.error('Login error:', xhr.responseText);
            });
    });

    $('#cashierForm').on('submit', function (event) {
        event.preventDefault();

        const name = $('#cashierNameInput').val().trim();
        const username = $('#cashierUsernameInput').val().trim();
        const password = $('#cashierPasswordInput').val();
        const confirm = $('#cashierPasswordConfirm').val();
        const errorBox = $('#cashierError');
        const successBox = $('#cashierSuccess');

        errorBox.hide().text('');
        successBox.hide().text('');

        if (!name || !username || !password || !confirm) {
            errorBox.text('Semua data kasir wajib diisi.').show();
            return;
        }

        if (password !== confirm) {
            errorBox.text('Konfirmasi password tidak sama.').show();
            return;
        }

        apiPost('add_cashier', { name, username, password })
            .done(function (result) {
                if (!result || !result.success) {
                    errorBox.text(result?.message || 'Kasir gagal ditambahkan.').show();
                    return;
                }

                successBox.text('Kasir berhasil ditambahkan. Silakan login dengan username dan password tersebut.').show();
                $('#cashierForm')[0].reset();
                $('#username').val(username);
                setTimeout(function () {
                    $('#cashierView').addClass('hidden');
                    $('#loginView').removeClass('hidden');
                    $('#password').focus();
                }, 700);
            })
            .fail(function (xhr) {
                const message = xhr.responseJSON?.message || 'Gagal menambahkan kasir. Pastikan database XAMPP aktif.';
                errorBox.text(message).show();
            });
    });
}

$(function () {
    if (isLoginPage()) {
        initLogin();
        return;
    }

    if (!requireLogin()) return;

    setCashierName();
    loadServices();
    renderDashboard();
    renderQueue();
    fetchOrders(renderHistory);

    $('#logoutBtn').on('click', function () {
        localStorage.removeItem(SESSION_KEY);
        location.replace('login.html');
    });

    $('#addItem').on('click', () => addOrderItem());

    $(document).on('input change', '.item-service, .item-qty', refreshOrderRows);

    $(document).on('click', '.remove-item', function () {
        if ($('.service-row').length > 1) {
            $(this).closest('.service-row').remove();
            refreshOrderRows();
        }
    });

    $('#orderForm').on('submit', function (event) {
        event.preventDefault();

        const customer = $('#customer').val().trim();
        const items = buildItems('#orderItems');

        if (!customer) {
            showMessage('Isi nama pelanggan.');
            return;
        }
        if (!items.length) {
            showMessage('Pilih minimal satu layanan.');
            return;
        }

        saveOrder(customer, items)
            .done(result => {
                if (!result.success) {
                    showMessage(result.message || 'Pesanan gagal disimpan.');
                    return;
                }

                showMessage('Pesanan tersimpan ke database.');
                setTimeout(() => {
                    location.href = `nota.html?nota=${encodeURIComponent(result.order.nota)}`;
                }, 350);
            })
            .fail(xhr => {
                showMessage(xhr.responseJSON?.message || 'Gagal menyimpan pesanan ke database.');
            });
    });

    $(document).on('click', '.status-btn', function () {
        const button = $(this);
        const nota = button.data('nota');
        const status = button.data('status');

        updateStatus(nota, status)
            .done(result => {
                if (!result.success) {
                    showMessage(result.message || 'Status gagal diubah.');
                    return;
                }
                renderQueue();
                renderDashboard();
                fetchOrders(renderHistory);
                showMessage('Status pesanan diperbarui.');
            })
            .fail(xhr => showMessage(xhr.responseJSON?.message || 'Gagal mengubah status.'));
    });

    $('#historySearch').on('input', renderHistory);

    $(document).on('click', '.edit-order', function () {
        openEditOrder($(this).data('nota'));
    });

    $(document).on('click', '.delete-order', function () {
        const nota = $(this).data('nota');
        if (!confirm(`Hapus pesanan ${nota}?`)) return;

        deleteOrder(nota)
            .done(result => {
                if (!result.success) {
                    showMessage(result.message || 'Gagal menghapus pesanan.');
                    return;
                }
                fetchOrders(renderHistory);
                renderDashboard();
                renderQueue();
                showMessage('Pesanan berhasil dihapus dari database.');
            })
            .fail(xhr => showMessage(xhr.responseJSON?.message || 'Gagal menghapus pesanan.'));
    });

    $(document).on('input change', '.edit-service, .edit-qty', refreshEditRows);

    $('#editAddItem').on('click', () => {
        $('#editItems').append(editRowHTML());
        refreshEditRows();
    });

    $(document).on('click', '.remove-edit-item', function () {
        if ($('.edit-row').length > 1) {
            $(this).closest('.edit-row').remove();
            refreshEditRows();
        }
    });

    $('#closeEdit, #cancelEdit').on('click', function () {
        $('#editModal').removeClass('open').attr('aria-hidden', 'true');
    });

    $('#editForm').on('submit', function (event) {
        event.preventDefault();

        const nota = $('#editNota').val();
        const customer = $('#editCustomer').val().trim();
        const items = buildItems('#editItems');

        if (!customer || !items.length) {
            showMessage('Nama pelanggan dan layanan wajib diisi.');
            return;
        }

        saveOrder(customer, items, nota)
            .done(result => {
                if (!result.success) {
                    showMessage(result.message || 'Perubahan gagal disimpan.');
                    return;
                }

                $('#editModal').removeClass('open').attr('aria-hidden', 'true');
                fetchOrders(renderHistory);
                renderDashboard();
                renderQueue();
                showMessage('Perubahan pesanan tersimpan.');
            })
            .fail(xhr => showMessage(xhr.responseJSON?.message || 'Gagal menyimpan perubahan.'));
    });

    if ($('#standaloneReceipt').length) {
        const nota = new URLSearchParams(location.search).get('nota');

        if (!nota) {
            $('#standaloneReceipt').html('<div class="empty-state">Nomor nota tidak ditemukan.</div>');
        } else {
            apiGet('order', { nota })
                .done(order => $('#standaloneReceipt').html(receiptHTML(order)))
                .fail(xhr => $('#standaloneReceipt').html(`<div class="empty-state">${esc(xhr.responseJSON?.message || 'Nota tidak ditemukan.')}</div>`));
        }

        $('#standalonePrint').on('click', () => window.print());
    }

    setInterval(() => {
        if (document.hidden) return;
        renderDashboard();
        renderQueue();
        fetchOrders(renderHistory);
    }, 10000);
});
